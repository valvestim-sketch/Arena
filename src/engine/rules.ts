import type { Category, Severity } from '../types'

export interface RegexRule {
  id: string
  category: Category
  severity: Severity
  title: string
  explanation: string
  example?: string
  pattern: RegExp
  replace: string | ((m: RegExpMatchArray) => string)
  guard?: (m: RegExpMatchArray, text: string) => boolean
  /** применять только к формальным работам (эссе, письмо в организацию) */
  onlyFormal?: boolean
  /** применять только к неформальным работам (письмо другу) */
  onlyInformal?: boolean
  /** максимум срабатываний на текст (0 = без ограничений) */
  limit?: number
  /** вес вклада в оценку; по умолчанию: error=1, warning=0.5, note=0.15 */
  weight?: number
}

/* ------------------------------------------------------------------ */
/*  Списки глаголов — из них собираются правила словоизменения         */
/* ------------------------------------------------------------------ */

const BASE_VERBS = `go do make like want need think say take give get live work study play watch read write come know see feel look try help start use call ask tell find keep put mean seem leave move turn show hear begin become believe bring happen sit stand lose pay meet include continue learn change lead understand speak spend grow open walk win teach offer remember love hate enjoy finish stop wait expect decide hope wish agree choose build buy sell send catch wear eat drink sleep run drive ride swim sing dance cook clean wash draw paint count check answer arrive belong compare complete describe discuss explain follow forget imagine improve increase introduce invite join laugh listen miss notice order prepare prefer produce promise protect provide realise realize receive recommend reduce refuse relax repeat replace report return save share shout smile solve sound succeed suggest support suppose surprise talk thank travel visit worry wonder`.split(
  /\s+/,
)

const S3_OVERRIDES: Record<string, string> = { have: 'has', go: 'goes', do: 'does', be: 'is', say: 'says', fly: 'flies', try: 'tries', study: 'studies', play: 'plays', stay: 'stays' }

function thirdPerson(v: string): string {
  if (S3_OVERRIDES[v]) return S3_OVERRIDES[v]
  if (/(s|sh|ch|x|z|o)$/.test(v)) return v + 'es'
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies'
  return v + 's'
}

const S3_TO_BASE: Record<string, string> = {}
for (const v of BASE_VERBS) S3_TO_BASE[thirdPerson(v)] = v

const ING_OVERRIDES: Record<string, string> = {
  begin: 'beginning',
  forget: 'forgetting',
  prefer: 'preferring',
  occur: 'occurring',
  admit: 'admitting',
  permit: 'permitting',
  refer: 'referring',
  control: 'controlling',
  travel: 'travelling',
  lie: 'lying',
  die: 'dying',
  panic: 'panicking',
}

const PLURAL_SUBJECTS = /\b(i|we|you|they|people|children|men|women|students|parents|friends|teachers|colleagues|companies|countries|things|options|workers|tourists|experts|scientists|researchers|cities|families|millions|many|several|both)\s*$/i

/** Нужно ли окончание -s у глагола при таком подлежащем. */
function needsS(subject: string): boolean {
  const last = subject.trim().split(/\s+/).pop()?.toLowerCase() ?? ''
  if (['he', 'she', 'it'].includes(last)) return true
  if (['i', 'we', 'you', 'they'].includes(last)) return false
  if (PLURAL_SUBJECTS.test(last)) return false
  if (/(s|sh|ch|x|z|ies)$/.test(last) && !/(ss|us|is)$/.test(last)) return false
  return true
}

/** Форма глагола в настоящем времени под конкретное подлежащее. */
export function presentForm(subject: string, verb: string): string {
  return needsS(subject) ? thirdPerson(verb) : verb
}

export function gerund(v: string): string {
  if (ING_OVERRIDES[v]) return ING_OVERRIDES[v]
  if (v.endsWith('ie')) return v.slice(0, -2) + 'ying'
  if (v.endsWith('e') && !/(ee|oe|ye)$/.test(v)) return v.slice(0, -1) + 'ing'
  if (v.length <= 4 && /[^aeiou][aeiou][^aeiouwxy]$/.test(v)) return v + v.slice(-1) + 'ing'
  return v + 'ing'
}

export const BASE_VERB_RE = BASE_VERBS.join('|')
const S3_MAP_RE = BASE_VERBS.filter((v) => v !== 'be').map(thirdPerson).join('|')
const GERUND_RE = BASE_VERBS.map(gerund).join('|')

/* ------------------------------------------------------------------ */
/*  Многословные предлоги и полезные наборы                            */
/* ------------------------------------------------------------------ */

const WEEKDAYS = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday'
const uncountable = 'information|advice|knowledge|furniture|equipment|money|homework|news|research|progress|weather|traffic|bread|milk|water|music|work|travel|luggage|baggage|paper|time|food|health|education|help|fun|housework|software|vocabulary|grammar'

/** Сводный список правил проверки письменной работы. */
export const RULES: RegexRule[] = [
  /* ================================================================ */
  /*  1. Русскоязычная интерференция — калька с русского               */
  /* ================================================================ */
  {
    id: 'l1-am-agree',
    category: 'grammar',
    severity: 'error',
    title: 'agree — глагол, «am» лишний',
    explanation: 'В английском «agree» уже полноценный глагол, как «live» или «work». Русское «я согласен» подсказывает «am», но это калька.',
    example: 'I agree with you. ✅  /  I am agree. ❌',
    pattern: /\b(I|we|they|you)\s+(?:am|are)\s+(agree|disagree)\b/gi,
    replace: (m) => `${m[1]} ${m[2]}`,
  },
  {
    id: 'l1-feel-myself',
    category: 'grammar',
    severity: 'error',
    title: 'feel — без «myself»',
    explanation: '«Чувствую себя» — калька: после feel возвратное местоимение не нужно. Английский глагол feel уже «относится к себе».',
    example: 'I feel great. ✅  /  I feel myself great. ❌',
    pattern: /\b(feel|feels|felt)\s+(myself|himself|herself|ourselves|themselves|yourself)\b/gi,
    replace: (m) => `${m[1]}`,
  },
  {
    id: 'l1-have-years',
    category: 'grammar',
    severity: 'error',
    title: 'Возраст: be, а не have',
    explanation: 'По-русски «мне 20 лет» — по-английски «I am 20». Глагол «have» здесь работает только в шутливом «I have 20 years of experience».',
    example: 'My sister is 14 years old. ✅  /  My sister has 14 years. ❌',
    pattern: /\b(am|is|are|has|have)\s+(\d{1,2}|twenty|thirty|forty|fifteen|sixteen|seventeen|eighteen|nineteen|thirteen|fourteen|twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one)\s+(years?|yo)\b(?!\s+old)/gi,
    replace: (m) => `${/has|have/i.test(m[1]) ? 'is' : m[1]} ${m[2]} years old`,
  },
  {
    id: 'l1-on-the-picture',
    category: 'grammar',
    severity: 'error',
    title: 'in the picture, не on',
    explanation: 'На картинке — «in the picture/photo»: человек «внутри» изображения. «On» используется, когда что-то лежит на поверхности.',
    example: 'There are three people in the photo. ✅',
    pattern: /\bon\s+(the\s+)?(picture|photo|image|painting|map)\b/gi,
    replace: (m) => `in ${m[1] ?? ''}${m[2]}`,
  },
  {
    id: 'l1-how-you-think',
    category: 'lexis',
    severity: 'error',
    title: 'What do you think, а не How',
    explanation: 'Прямой перевод «Как вы думаете?» даёт ошибку. В английском спрашивают о содержании: «What do you think?».',
    example: 'What do you think about it? ✅',
    pattern: /\bhow\s+(do|does|did)\s+(you|we|they|he|she)\s+(think|consider)\b/gi,
    replace: (m) => `what ${m[1]} ${m[2]} think`,
  },
  {
    id: 'l1-must-to',
    category: 'grammar',
    severity: 'error',
    title: 'После модального глагола — без «to»',
    explanation: 'Модальные глаголы (can, must, should, may, will) присоединяют смысловой глагол напрямую. Частица «to» нужна только после «have to» и «ought to».',
    example: 'Children must wear a uniform. ✅  /  Children must to wear. ❌',
    pattern: /\b(can|could|must|should|will|would|may|might|shall)\s+to\s+(?=\w)/gi,
    replace: (m) => `${m[1]} `,
  },
  {
    id: 'l1-want-that',
    category: 'grammar',
    severity: 'error',
    title: 'want + дополнение + to + глагол',
    explanation: 'Русская конструкция «хочу, чтобы» по-английски строится через «want somebody to do». После «want» придаточное с «that» не используется.',
    example: 'I want him to call me. ✅  /  I want that he calls me. ❌',
    pattern: /\b(want|wants|wanted|would like)\s+that\s+(I|you|he|she|it|we|they)\s+(\w+)/gi,
    replace: (m) => `${m[1]} ${m[2]} to ${m[3]}`,
  },
  {
    id: 'l1-think-yes',
    category: 'lexis',
    severity: 'warning',
    title: 'I think so',
    explanation: 'Короткий ответ «думаю, да» по-английски — «I think so», а не «I think yes».',
    example: 'Will he come? — I think so. ✅',
    pattern: /\bI\s+think\s+(yes|no)\b/gi,
    replace: (m) => (m[1].toLowerCase() === 'yes' ? 'I think so' : "I don't think so"),
  },
  {
    id: 'l1-myself-opinion',
    category: 'style',
    severity: 'note',
    title: 'Лишнее «myself»',
    explanation: 'Обороты «I myself think» звучат по-русски и тяжеловесно. Обычно достаточно просто «I think».',
    example: 'In my opinion, ... ✅',
    pattern: /\bI\s+myself\s+(think|believe|suppose|consider|am)\b/gi,
    replace: (m) => `I ${m[1]}`,
  },
  {
    id: 'l1-depend-from',
    category: 'grammar',
    severity: 'error',
    title: 'depend on',
    explanation: 'Глагол «depend» требует предлог «on», а не «from/of». Заодно запомните существительное «dependent on».',
    example: 'It depends on the weather. ✅',
    pattern: /\b(depend|depends|depended|depending|dependant|dependent)\s+(from|of)\b/gi,
    replace: (m) => `${m[1]} on`,
  },
  {
    id: 'l1-afraid-from',
    category: 'grammar',
    severity: 'error',
    title: 'afraid of / interested in / good at',
    explanation: 'У английских прилагательных «свой» предлог, и он часто не совпадает с русским. Это одна из самых частых ошибок на уровне B1.',
    example: 'I am interested in history. ✅  /  I am interested by history. ❌',
    pattern: /\b(afraid|scared|frightened)\s+(from|of|for)\b/gi,
    replace: (m) => `${m[1]} of`,
    guard: (m) => m[2].toLowerCase() !== 'of',
  },
  {
    id: 'l1-interested-pron',
    category: 'grammar',
    severity: 'error',
    title: 'interested in',
    explanation: 'После «interested» используется предлог «in».',
    example: 'She is interested in art. ✅',
    pattern: /\b(interested|keen)\s+(about|in|on|for|by)\b/gi,
    replace: (m) => `${m[1]} in`,
    guard: (m) => m[2].toLowerCase() !== 'in',
  },
  {
    id: 'l1-good-in',
    category: 'grammar',
    severity: 'error',
    title: 'good at',
    explanation: '«Хорошо разбираться в чём-то» — «good at» + существительное или -ing.',
    example: 'He is good at maths. ✅  /  He is good in maths. ❌',
    pattern: /\b(good|bad|better|best|brilliant|excellent)\s+(in|on|for)\s+(\w+ing\b|maths|math|mathematics|english|sport|sports|music|drawing|cooking|computers|science|physics|chemistry|history|geography)/gi,
    replace: (m) => `${m[1]} at ${m[3]}`,
  },
  {
    id: 'l1-married-with',
    category: 'grammar',
    severity: 'error',
    title: 'married to',
    explanation: 'Жениться/быть замужем за кем-то — «married to», а не «with».',
    example: 'She is married to a doctor. ✅',
    pattern: /\b(married|marry|marries|married)\s+with\b/gi,
    replace: (m) => `${m[1]} to`,
  },
  {
    id: 'l1-proud-for',
    category: 'grammar',
    severity: 'error',
    title: 'proud of',
    explanation: 'После «proud» — предлог «of».',
    example: 'I am proud of my students. ✅',
    pattern: /\b(proud|ashamed|jealous|guilty)\s+(for|about|by|from)\b/gi,
    replace: (m) => `${m[1]} of`,
  },
  {
    id: 'l1-famous-on',
    category: 'grammar',
    severity: 'error',
    title: 'famous for',
    explanation: 'Знаменитый чем-то — «famous for».',
    example: 'This city is famous for its museums. ✅',
    pattern: /\b(famous|known|popular)\s+(on|by|because)\b/gi,
    replace: (m) => `${m[1]} for`,
  },
  {
    id: 'l1-listen-to',
    category: 'grammar',
    severity: 'error',
    title: 'listen TO',
    explanation: '«Слушать» по-английски — «listen to»: без предлога глагол не работает.',
    example: 'I listen to podcasts in the car. ✅  /  I listen music. ❌',
    pattern: /\blisten(ing|s|ed)?\s+(music|podcasts?|songs?|the\s+\w+|radio|me|him|her|us|them|it)\b(?!\s*to)/gi,
    replace: (m) => `listen${m[1] ?? ''} to ${m[2]}`,
  },
  {
    id: 'l1-wait-for',
    category: 'grammar',
    severity: 'error',
    title: 'wait FOR',
    explanation: 'Ждать кого-то — «wait for somebody».',
    example: "I'll wait for you near the entrance. ✅",
    pattern: /\bwait(ed|ing|s)?\s+(me|him|her|us|them|you|the\s+\w+)\b(?!\s*for)/gi,
    replace: (m) => `wait${m[1] ?? ''} for ${m[2]}`,
  },
  {
    id: 'l1-explain-me',
    category: 'grammar',
    severity: 'error',
    title: 'explain TO me',
    explanation: '«Объяснить мне» — «explain to me»: сначала предлог «to», потом адресат.',
    example: 'Can you explain this rule to me? ✅',
    pattern: /\bexplain(s|ed|ing)?\s+(me|him|her|us|them|you)\b(?!\s*to)/gi,
    replace: (m) => `explain${m[1] ?? ''} to ${m[2]}`,
  },
  {
    id: 'l1-say-me',
    category: 'lexis',
    severity: 'error',
    title: 'tell / say',
    explanation: '«Say» не берёт адресата напрямую: «tell somebody», «say to somebody», «say smth to somebody».',
    example: 'He told me the truth. ✅  /  He said me the truth. ❌',
    pattern: /\bsay(s|ing)?\s+(me|him|her|us|them|you)\b/gi,
    replace: (m) => `tell${m[1] ?? ''} ${m[2]}`,
  },
  {
    id: 'l1-tell-to',
    category: 'lexis',
    severity: 'error',
    title: 'tell без предлога «to»',
    explanation: 'После «tell» предлог «to» перед адресатом не ставится.',
    example: 'Tell me about your weekend. ✅',
    pattern: /\btell(s|ing)?\s+to\s+(me|him|her|us|them|you)\b/gi,
    replace: (m) => `tell${m[1] ?? ''} ${m[2]}`,
  },
  {
    id: 'l1-discuss-about',
    category: 'grammar',
    severity: 'error',
    title: 'discuss smth (без about)',
    explanation: '«Discuss» — переходный глагол: он уже включает идею «о чём-то».',
    example: 'We discussed the plan. ✅  /  We discussed about the plan. ❌',
    pattern: /\bdiscuss(ed|ing|es)?\s+about\b/gi,
    replace: (m) => `discuss${m[1] ?? ''}`,
  },
  {
    id: 'l1-make-homework',
    category: 'lexis',
    severity: 'error',
    title: 'do homework',
    explanation: 'Домашняя работа «делается» через «do», а не «make». С «make» — только когда вы создаёте что-то новое.',
    example: 'I do my homework after dinner. ✅',
    pattern: /\b(make|makes|made|making)\s+(my|his|her|our|their|your|the|a)?\s*homework\b/gi,
    replace: (m) => `${m[1] === 'made' ? 'did' : 'do'} ${m[2] ? m[2] + ' ' : ''}homework`,
  },
  {
    id: 'l1-do-mistake',
    category: 'lexis',
    severity: 'error',
    title: 'make a mistake',
    explanation: 'Ошибки «делают» через «make»: make a mistake.',
    example: 'People often make mistakes. ✅  /  People often do mistakes. ❌',
    pattern: /\b(do|does|did|doing)\s+(a|the|some|many|few|several)?\s*(mistake|mistakes|error|errors)\b/gi,
    replace: (m) => {
      const verb = m[1].toLowerCase() === 'did' ? 'made' : 'make'
      const noun = m[3]
      const plural = /s$/i.test(noun)
      const article = m[2] ? `${m[2]} ` : plural ? '' : 'a '
      return `${verb} ${article}${noun}`
    },
  },
  {
    id: 'l1-make-photo',
    category: 'lexis',
    severity: 'error',
    title: 'take a photo',
    explanation: 'Фотографию «берут»: take a photo/picture.',
    example: 'He took a photo of the bridge. ✅',
    pattern: /\b(make|makes|made|making)\s+(a|the|some|many)?\s*(photo|photos|picture|pictures|selfie|selfies)\b/gi,
    replace: (m) => `take ${m[2] ? m[2] + ' ' : 'a '}${m[3]}`,
  },
  {
    id: 'l1-do-progress',
    category: 'lexis',
    severity: 'error',
    title: 'make progress',
    explanation: 'Прогресс «делают» через «make»: make progress.',
    example: 'You have made great progress this term. ✅',
    pattern: /\b(do|does|did|doing)\s+(a|the|some|great|good|much)?\s*progress\b/gi,
    replace: (m) => `make ${m[2] ? m[2] + ' ' : ''}progress`,
  },
  {
    id: 'l1-go-home',
    category: 'grammar',
    severity: 'error',
    title: 'go home — без предлога и артикля',
    explanation: '«Home» в значении «домой» используется без предлога и артикля.',
    example: 'I went home at 7. ✅  /  I went to the home. ❌',
    pattern: /\b(go|goes|went|going|come|comes|came|coming|get|got|getting)\s+to\s+the\s+home\b|\b(go|goes|went|going|come|comes|came|coming|get|got|getting)\s+to\s+home\b/gi,
    replace: (m) => `${m[1] ?? m[2]} home`,
  },
  {
    id: 'l1-in-the-internet',
    category: 'grammar',
    severity: 'warning',
    title: 'ON the Internet',
    explanation: 'В интернете — «on the Internet» (как «на платформе»).',
    example: 'I found this information on the Internet. ✅',
    pattern: /\bin\s+(the\s+)?(internet|internet|web|website|net)\b/gi,
    replace: (m) => `on ${m[1] ?? ''}${m[2]}`,
  },
  {
    id: 'l1-day-of-week',
    category: 'grammar',
    severity: 'error',
    title: 'Дни недели — с предлогом ON',
    explanation: 'Дни недели и даты всегда с «on»: on Monday, on 5 May.',
    example: 'See you on Friday. ✅  /  See you in Friday. ❌',
    pattern: new RegExp(`\\b(in|at)\\s+(${WEEKDAYS})\\b`, 'gi'),
    replace: (m) => `on ${m[2]}`,
  },
  {
    id: 'l1-next-week-on',
    category: 'grammar',
    severity: 'error',
    title: 'next week — без предлога',
    explanation: 'Выражения с next/last/this употребляются без предлога: next week, last summer.',
    example: 'We are going to London next month. ✅',
    pattern: /\b(on|in|at|for)\s+(next|last)\s+(week|month|year|summer|winter|spring|autumn|fall|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
    replace: (m) => `${m[2]} ${m[3]}`,
  },
  {
    id: 'l1-in-the-end',
    category: 'grammar',
    severity: 'error',
    title: 'in the end vs at the end',
    explanation: '«В конце концов» — «in the end». «At the end of» — для конкретного места/времени: at the end of the street.',
    example: 'In the end, we chose the cheaper option. ✅',
    pattern: /\bon\s+the\s+end\s+of\b/gi,
    replace: 'at the end of',
  },
  {
    id: 'l1-most-of',
    category: 'grammar',
    severity: 'error',
    title: 'most people / most of the people',
    explanation: 'Если перед «most» нет «of the / of my / of these», артикль «the» не нужен.',
    example: 'Most students like online lessons. ✅  /  The most of students … ❌',
    pattern: /\bthe\s+most\s+of\s+(people|students|children|teenagers|them|us|countries|companies|families|schools|teachers|parents|young\s+people)\b/gi,
    replace: (m) => `most ${m[1]}`,
  },
  {
    id: 'l1-most-of-nodet',
    category: 'grammar',
    severity: 'error',
    title: 'most + существительное (без of)',
    explanation: 'После «most of» обязательно требуется определитель: of the, of my, of these.',
    example: 'Most people work hard. ✅',
    pattern: /\bmost\s+of\s+(?!(?:the|my|his|her|our|their|your|its|these|those|us|them|it|all|this|that|them)\b)([a-z]+)\b/gi,
    replace: (m) => `most ${m[1]}`,
  },
  {
    id: 'l1-so-such',
    category: 'grammar',
    severity: 'error',
    title: 'so + прилагательное, such a + прилагательное + существительное',
    explanation: 'Перед «прилагательное + существительное» используется «such a/an», а «so» — только перед прилагательным или наречием.',
    example: 'It was such an interesting trip. ✅  /  It was so interesting trip. ❌',
    pattern: /\bso\s+(good|bad|nice|interesting|beautiful|big|small|important|useful|difficult|amazing|terrible|wonderful|great|long|short|expensive|cheap)\s+(girl|boy|man|woman|day|weather|book|film|movie|city|country|teacher|student|friend|house|car|thing|idea|food|place|time|music|song|game|person|trip|story|problem|mistake|job|lesson|question|answer|present|gift|summer|winter)\b/gi,
    replace: (m) => `such a ${m[1]} ${m[2]}`,
  },
  {
    id: 'l1-because-of-that',
    category: 'grammar',
    severity: 'note',
    title: 'because / because of',
    explanation: '«Because» вводит целое предложение (подлежащее + сказуемое), «because of» — существительное: because of the rain.',
    example: 'We stayed at home because it was raining. ✅',
    pattern: /\bbecause\s+of\s+(it\s+is|it\s+was|there\s+is|there\s+are|they\s+are|he\s+is|she\s+is|I\s+am)\b/gi,
    replace: (m) => (m[1].toLowerCase().includes('there') ? `because ${m[1]}` : `because ${m[1]}`),
  },
  {
    id: 'l1-thank-god',
    category: 'lexis',
    severity: 'warning',
    title: 'Thank God',
    explanation: 'Устойчивое выражение пишется без -s: Thank God.',
    example: 'Thank God, we found the keys.',
    pattern: /\bthanks\s+god\b/gi,
    replace: 'Thank God',
  },
  {
    id: 'l1-eg-etc',
    category: 'style',
    severity: 'note',
    title: 'etc. в конце перечисления',
    explanation: 'Формальный текст не любит «etc.» — лучше закончить перечисление содержательно или употребить «and so on» нечасто.',
    example: '… such as books, films and music. ✅',
    pattern: /\betc\.?\b/gi,
    replace: 'and so on',
    limit: 1,
    onlyFormal: true,
  },

  /* ================================================================ */
  /*  2. Согласование подлежащего и сказуемого                         */
  /* ================================================================ */
  {
    id: 'sva-third-person-s',
    category: 'grammar',
    severity: 'error',
    title: '3-е лицо ед. числа: окончание -s',
    explanation: 'В Present Simple после he / she / it у глагола появляется окончание -s. Это базовая ошибка, которая сильно снижает оценку за грамматику.',
    example: 'She works in a bank. ✅  /  She work in a bank. ❌',
    pattern: new RegExp(`\\b(he|she|it)\\s+(${BASE_VERB_RE})\\b`, 'gi'),
    replace: (m) => `${m[1]} ${thirdPerson(m[2].toLowerCase())}`,
    limit: 6,
  },
  {
    id: 'sva-third-person-s-noun',
    category: 'grammar',
    severity: 'error',
    title: 'Подлежащее-существительное ед. числа: -s',
    explanation: 'Перед глаголом-подлежащим в единственном числе глагол тоже получает -s: the government wants, my friend likes.',
    example: 'My friend likes jazz. ✅',
    pattern: new RegExp(
      `\\b(my|his|her|the)\\s+(friend|brother|sister|mother|father|teacher|son|daughter|husband|wife|boss|colleague|neighbour|neighbor|cousin|man|woman|boy|girl|student|child|dog|cat|company|government|family|team|country|city)\\s+(${BASE_VERB_RE})\\b`,
      'gi',
    ),
    replace: (m) => `${m[1]} ${m[2]} ${thirdPerson(m[3].toLowerCase())}`,
    limit: 4,
  },
  {
    id: 'sva-plural-subject',
    category: 'grammar',
    severity: 'error',
    title: 'I / we / they / you — без окончания -s',
    explanation: 'С местоимениями I, we, they, you глагол в Present Simple идёт в базовой форме, без -s.',
    example: 'They go to the gym twice a week. ✅  /  They goes … ❌',
    pattern: new RegExp(`\\b(I|we|they|you)\\s+(${S3_MAP_RE})\\b`, 'g'),
    replace: (m) => `${m[1]} ${S3_TO_BASE[m[2].toLowerCase()] ?? m[2]}`,
    limit: 6,
  },
  {
    id: 'sva-plural-noun-base',
    category: 'grammar',
    severity: 'error',
    title: 'Множественное подлежащее — глагол без -s',
    explanation: 'Если подлежащее во множественном числе (people, students, children, parents), глагол в Present Simple идёт без окончания -s.',
    example: 'People spend a lot of time online. ✅  /  People spends … ❌',
    pattern: new RegExp(`\\b(people|students|children|teenagers|parents|friends|teachers|adults|workers|tourists|experts|scientists|researchers|companies|countries|families|men|women)\\s+(${S3_MAP_RE})\\b`, 'g'),
    replace: (m) => `${m[1]} ${S3_TO_BASE[m[2].toLowerCase()] ?? m[2]}`,
    limit: 5,
  },
  {
    id: 'sva-dont-doesnt',
    category: 'grammar',
    severity: 'error',
    title: 'don’t / doesn’t',
    explanation: 'С he / she / it используется «doesn’t», с I / we / they / you — «don’t».',
    example: 'He doesn’t like coffee. ✅',
    pattern: /\b(he|she|it)\s+don't\b|\b(I|we|they|you)\s+doesn't\b|\b(I|we|they|you)\s+isn't\b|\b(he|she|it)\s+aren't\b/gi,
    replace: (m) => {
      const p = (m[1] ?? m[2] ?? m[3] ?? m[4]).toLowerCase()
      const third = ['he', 'she', 'it'].includes(p)
      const v = p === 'i' || p === 'we' || p === 'they' || p === 'you' ? (m[3] ? "isn't" : "don't") : third ? "doesn't" : "aren't"
      return `${m[1] ?? m[2] ?? m[3] ?? m[4]} ${v}`
    },
  },
  {
    id: 'sva-uncountable-are',
    category: 'grammar',
    severity: 'error',
    title: 'Неисчисляемые существительные — с глаголом в ед. числе',
    explanation: 'Information, advice, money, news, furniture не имеют множественного числа, поэтому согласуются с формой единственного числа.',
    example: 'This information is useful. ✅  /  These informations are useful. ❌',
    pattern: new RegExp(`\\b(information|advice|news|money|furniture|equipment|homework|research|luggage|weather|progress|travel)\\s+(are|were|have|seem|look|depend|come)\\b`, 'gi'),
    replace: (m) => {
      const map: Record<string, string> = { are: 'is', were: 'was', have: 'has', seem: 'seems', look: 'looks', depend: 'depends', come: 'comes' }
      return `${m[1]} ${map[m[2].toLowerCase()] ?? m[2]}`
    },
  },
  {
    id: 'sva-people-are',
    category: 'grammar',
    severity: 'error',
    title: 'people — множественное число',
    explanation: '«People» — это уже множественное число (от «person»), поэтому глагол после него тоже во множественном.',
    example: 'People are worried about it. ✅  /  People is worried. ❌',
    pattern: /\bpeople\s+(is|was|has|does|doesn't|isn't|wasn't)\b/gi,
    replace: (m) => {
      const map: Record<string, string> = { is: 'are', was: 'were', has: 'have', does: 'do', "doesn't": "don't", "isn't": "aren't", "wasn't": "weren't" }
      return `people ${map[m[1].toLowerCase()] ?? m[1]}`
    },
  },
  {
    id: 'sva-everyone-is',
    category: 'grammar',
    severity: 'error',
    title: 'everyone / everybody — ед. число',
    explanation: 'Слова everyone, everybody, somebody, nobody, each формально единственного числа: everyone is, everyone has.',
    example: 'Everyone has the right to rest. ✅',
    pattern: /\b(everyone|everybody|someone|somebody|anyone|anybody|nobody|each)\s+(are|were|have|do|don't)\b/gi,
    replace: (m) => {
      const map: Record<string, string> = { are: 'is', were: 'was', have: 'has', do: 'does', "don't": "doesn't" }
      return `${m[1]} ${map[m[2].toLowerCase()] ?? m[2]}`
    },
  },
  {
    id: 'sva-there-is-many',
    category: 'grammar',
    severity: 'error',
    title: 'there is / there are',
    explanation: '«There are» — с множественным числом, «there is» — с единственным.',
    example: 'There are many reasons for this. ✅',
    pattern: /\bthere\s+is\s+(many|a lot of|lots of|some|several|few|two|three|four|five|numerous|a number of)\b/gi,
    replace: (m) => `there are ${m[1]}`,
  },
  {
    id: 'sva-there-are-single',
    category: 'grammar',
    severity: 'error',
    title: 'there is + ед. число',
    explanation: 'Перед существительным в единственном числе используется «there is / there was».',
    example: 'There is a problem with this idea. ✅',
    pattern: /\bthere\s+(are|were)\s+(a|an|one|a lot of single)\b/gi,
    replace: (m) => `there ${m[1] === 'are' ? 'is' : 'was'} ${m[2]}`,
  },

  /* ================================================================ */
  /*  3. Видовременные формы и структура глагола                       */
  /* ================================================================ */
  {
    id: 'gv-be-plus-base',
    category: 'grammar',
    severity: 'error',
    title: 'be + -ing вместо простой формы',
    explanation: 'После «am/is/are» глагол ставится в форму -ing. Либо уберите be, если имелась в виду простая форма.',
    example: 'I am going to the gym now. ✅  /  I am go to the gym. ❌',
    pattern: new RegExp(`\\b(am|is|are)\\s+(${BASE_VERB_RE})\\b`, 'gi'),
    replace: (m) => `${m[1]} ${gerund(m[2].toLowerCase())}`,
    guard: (m) => !/^(is|are|am)$/i.test(m[2]),
    limit: 5,
  },
  {
    id: 'gv-missing-be-ing',
    category: 'grammar',
    severity: 'error',
    title: 'Пропущено am / is / are',
    explanation: 'В Continuous нужен вспомогательный глагол: I am doing, they are doing.',
    example: 'They are doing their homework right now. ✅  /  They doing their homework. ❌',
    pattern: new RegExp(`\\b(I|you|we|they|he|she|it)\\s+(${GERUND_RE})\\b`, 'gi'),
    replace: (m) => {
      const p = m[1].toLowerCase()
      const be = p === 'i' ? 'am' : p === 'he' || p === 'she' || p === 'it' ? 'is' : 'are'
      return `${m[1]} ${be} ${m[2]}`
    },
    limit: 4,
  },
  {
    id: 'gv-have-plus-base',
    category: 'grammar',
    severity: 'error',
    title: 'have/has + V3 в Perfect',
    explanation: 'В Perfect после have/has нужна третья форма глагола: I have done, she has gone.',
    example: 'I have already finished the book. ✅',
    pattern: /\b(have|has|had)\s+(go|do|make|take|give|get|see|write|read|eat|drink|be|come|know|speak|break|choose|forget|begin)\b/gi,
    replace: (m) => {
      const v3: Record<string, string> = {
        go: 'gone', do: 'done', make: 'made', take: 'taken', give: 'given', get: 'got', see: 'seen', write: 'written', read: 'read', eat: 'eaten', drink: 'drunk', be: 'been', come: 'come', know: 'known', speak: 'spoken', break: 'broken', choose: 'chosen', forget: 'forgotten', begin: 'begun',
      }
      return `${m[1]} ${v3[m[2].toLowerCase()] ?? m[2]}`
    },
  },
  {
    id: 'gv-did-base',
    category: 'grammar',
    severity: 'error',
    title: 'После did — базовая форма глагола',
    explanation: 'В вопросах и отрицаниях с «did» смысловой глагол стоит в первой форме, время уже выражено в «did».',
    example: 'Did you go to the party? ✅  /  Did you went … ❌',
    pattern: new RegExp(`\\b(did|didn't|did not)\\s+(I|you|he|she|it|we|they)?\\s*(went|saw|took|made|gave|got|came|did|had|was|were|said|told|thought|knew|wrote|read|found|left|met|paid|understood|spoke|began|became)\\b`, 'gi'),
    replace: (m) => {
      const v1: Record<string, string> = {
        went: 'go', saw: 'see', took: 'take', made: 'make', gave: 'give', got: 'get', came: 'come', did: 'do', had: 'have', was: 'be', were: 'be', said: 'say', told: 'tell', thought: 'think', knew: 'know', wrote: 'write', read: 'read', found: 'find', left: 'leave', met: 'meet', paid: 'pay', understood: 'understand', spoke: 'speak', began: 'begin', became: 'become',
      }
      return `${m[1]} ${m[2] ? m[2] + ' ' : ''}${v1[m[3].toLowerCase()] ?? m[3]}`
    },
  },
  {
    id: 'gv-double-comparative',
    category: 'grammar',
    severity: 'error',
    title: 'Двойное сравнение',
    explanation: 'Либо more + прилагательное, либо -er, но не оба сразу.',
    example: 'This way is more effective. ✅  /  This way is more better. ❌',
    pattern: /\b(more|most|less|the\s+most)\s+(better|worse|bigger|smaller|easier|harder|faster|slower|cheaper|older|younger|higher|lower|longer|shorter|stronger|nicer|happier)\b/gi,
    replace: (m) => m[2],
  },
  {
    id: 'gv-double-superlative',
    category: 'grammar',
    severity: 'error',
    title: 'Двойная превосходная степень',
    explanation: 'Превосходная степень образуется одним способом: the biggest, а не «the most biggest».',
    example: 'It is the biggest city in the region. ✅',
    pattern: /\bthe\s+most\s+(biggest|smallest|best|worst|easiest|hardest|fastest|slowest|cheapest|oldest|youngest|highest|lowest|longest|shortest)\b/gi,
    replace: (m) => `the ${m[1]}`,
  },
  {
    id: 'gv-since-for',
    category: 'grammar',
    severity: 'warning',
    title: 'for / since',
    explanation: '«For» — длительность (for two years), «since» — точка отсчёта (since 2020, since Monday).',
    example: 'I have lived here for three years. ✅  /  … since three years. ❌',
    pattern: /\bsince\s+(\d+\s+(years?|months?|weeks?|days?|hours?))\b|\bfor\s+(\d{4})\b/gi,
    replace: (m) => (m[1] ? `for ${m[1]}` : `since ${m[3]}`),
  },
  {
    id: 'gv-if-will',
    category: 'grammar',
    severity: 'error',
    title: 'После if — настоящее время',
    explanation: 'В условных предложениях первого типа после «if» не используется «will»: if it rains, I will stay home.',
    example: 'If the weather is good, we will go out. ✅  /  If the weather will be good … ❌',
    pattern: /\b(if|when)\s+((?:[A-Za-z']+\s+){0,3}?)(?:will)\s+(\w+)\b/gi,
    replace: (m) => `${m[1]} ${m[2].trim()} ${presentForm(m[2], m[3].toLowerCase())}`,
    guard: (m) => !/\bi\s+will\b/i.test(m[0]) && !/\bwill\s+be\s+able\b/i.test(m[0]),
    limit: 2,
  },
  {
    id: 'gv-would-like-that',
    category: 'grammar',
    severity: 'error',
    title: 'I would like TO do',
    explanation: 'После «would like» идёт инфинитив с «to», а не придаточное с «that».',
    example: 'I would like to improve my speaking. ✅',
    pattern: /\b(would like|want|hope|plan|decide|need)\s+that\s+(I|we|they)\s+(\w+)\b/gi,
    replace: (m) => `${m[1]} to ${m[3]}`,
  },
  {
    id: 'gv-subject-question',
    category: 'grammar',
    severity: 'error',
    title: 'Порядок слов в вопросе',
    explanation: 'В общем вопросе вспомогательный глагол идёт перед подлежащим: Do you like …? Are you …?',
    example: 'Do you like jazz? ✅  /  You like jazz? (в письменной речи — ошибка)',
    pattern: /\b(you|we|they|he|she)\s+(like|want|need|think|know|have|live|work|study|play|speak|go)\s+(\w+)\?\s*$/gim,
    replace: (m) => `do ${m[1].toLowerCase()} ${m[2]} ${m[3]}?`.replace(/^do (he|she|it)\b/, 'does $1'),
    limit: 3,
  },
  {
    id: 'gv-very-verb',
    category: 'grammar',
    severity: 'error',
    title: 'very + глагол не сочетаются',
    explanation: 'Наречие «very» не может определять глагол. Нужно «really» или «very much».',
    example: 'I really like this song. ✅  /  I very like this song. ❌',
    pattern: /\bvery\s+(like|love|hate|enjoy|want|need|prefer|miss|hope)\b/gi,
    replace: (m) => `really ${m[1]}`,
  },

  /* ================================================================ */
  /*  4. Множественное число, неисчисляемые, артикли                   */
  /* ================================================================ */
  {
    id: 'nouns-uncountable-plural',
    category: 'grammar',
    severity: 'error',
    title: 'Неисчисляемое существительное во множественном числе',
    explanation: 'Русские «информации», «советы», «деньги» не имеют параллели в английском: такие слова употребляются только в единственном числе.',
    example: 'She gave me some useful advice. ✅  /  She gave me advices. ❌',
    pattern: new RegExp(`\\b(informations|advices|knowledges|furnitures|equipments|moneys|homeworks|musics|researches|softwares|luggages|progresses|breads|waters|luggages)\\b`, 'gi'),
    replace: (m) => m[1].toLowerCase().replace(/es$/, '').replace(/s$/, ''),
  },
  {
    id: 'nouns-peoples',
    category: 'grammar',
    severity: 'error',
    title: 'people — уже множественное число',
    explanation: '«People» = люди (мн. ч. от person). Форма «peoples» существует, но означает «народы/этносы» и почти не встречается в школьных работах.',
    example: 'Many people think so. ✅',
    pattern: /\bpeoples\b/gi,
    replace: 'people',
  },
  {
    id: 'nouns-a-uncountable',
    category: 'grammar',
    severity: 'error',
    title: 'Неисчисляемое с артиклем a/an',
    explanation: 'Перед неисчисляемыми существительными артикль a/an не ставится: some advice, a piece of advice.',
    example: 'He gave me some advice. ✅  /  He gave me an advice. ❌',
    pattern: new RegExp(`\\b(a|an)\\s+(${uncountable})\\b`, 'gi'),
    replace: (m) => `some ${m[2]}`,
  },
  {
    id: 'nouns-much-many',
    category: 'grammar',
    severity: 'error',
    title: 'much / many',
    explanation: '«Many» — с исчисляемыми существительными, «much» — с неисчисляемыми.',
    example: 'How many countries have you visited? / How much time do we have?',
    pattern: /\bmuch\s+(people|students|children|teenagers|things|books|years|friends|places|problems|words|mistakes|times|countries|cars|houses|ideas|reasons|questions|lessons|ways)\b/gi,
    replace: (m) => `many ${m[1]}`,
  },
  {
    id: 'nouns-many-uncountable',
    category: 'grammar',
    severity: 'error',
    title: 'much + неисчисляемое',
    explanation: 'С неисчисляемыми существительными используется «much» или «a lot of».',
    example: 'We do not have much time. ✅  /  We do not have many time. ❌',
    pattern: /\bmany\s+(money|water|information|homework|work|food|music|advice|furniture|equipment|news|research|weather|progress|luggage|bread|milk|time)\b(?!\s+to)/gi,
    replace: (m) => `much ${m[1]}`,
  },
  {
    id: 'nouns-few-little',
    category: 'grammar',
    severity: 'error',
    title: 'few / little',
    explanation: '«Few» — с исчисляемыми, «little» — с неисчисляемыми.',
    example: 'There is little time left. ✅  /  There is few time left. ❌',
    pattern: /\bfew\s+(money|water|time|information|homework|work|food|music|advice|furniture|news|progress|patience|experience)\b/gi,
    replace: (m) => `little ${m[1]}`,
  },
  {
    id: 'nouns-little-plural',
    category: 'grammar',
    severity: 'error',
    title: 'a few + исчисляемое',
    explanation: 'С исчисляемыми существительными во множественном числе используется «a few».',
    example: 'A few students were late. ✅  /  A little students were late. ❌',
    pattern: /\b(a\s+)?little\s+(students|people|children|books|friends|ideas|things|places|problems|mistakes|reasons|questions|years|days|weeks|hours|words|countries|cars|lessons)\b/gi,
    replace: (m) => `${m[1] ? 'a ' : ''}few ${m[2]}`,
  },
  {
    id: 'art-a-an',
    category: 'grammar',
    severity: 'error',
    title: 'a / an',
    explanation: '«An» ставится перед словом, которое начинается с гласного звука: an apple, an hour. Перед согласным звуком — «a»: a university (звук [j]).',
    example: 'an honest answer / a useful app',
    pattern: /\ba\s+(?!(?:uni|use|usu|one\b|eu|unit|usef|uniqu|user|utility|euro))([aeiou]\w*)\b/g,
    replace: (m) => `an ${m[1]}`,
  },
  {
    id: 'art-an-consonant',
    category: 'grammar',
    severity: 'error',
    title: 'an перед гласным звуком',
    explanation: 'Форма «an» используется только перед гласным звуком: an hour, an MBA. Перед [j] ставится «a»: a university.',
    example: 'a university, a European country',
    pattern: /\ban\s+(uni\w*|use\w*|usu\w*|one\b|eu\w*|unit\w*|uniqu\w*|usef\w*)\b/gi,
    replace: (m) => `a ${m[1]}`,
  },
  {
    id: 'art-possessive-article',
    category: 'grammar',
    severity: 'error',
    title: 'Артикль и притяжательное местоимение не совмещаются',
    explanation: 'Перед существительным может стоять либо артикль, либо притяжательное местоимение, но не оба.',
    example: 'my opinion, the opinion of experts ✅',
    pattern: /\b(the)\s+(my|his|her|our|their|your)\s+(\w+)\b/gi,
    replace: (m) => `${m[2]} ${m[3]}`,
  },

  /* ================================================================ */
  /*  5. Слова, которые путают                                          */
  /* ================================================================ */
  {
    id: 'conf-there-their',
    category: 'grammar',
    severity: 'warning',
    title: 'there / their / they’re',
    explanation: '«There» — там / есть; «their» — их; «they’re» — they are.',
    example: 'Their house is big. / There are two cars. / They’re at school.',
    pattern: /\bthere\s+(?!(?:is|are|was|were|be|been|will|would|can|could|may|might|must|should|seems?|appears?|used|has|have|had|might|comes?|goes?|exists?|remains?|needs?|should|must|a|an|one|no|some|many|much|more|less|few|little|enough|not|nothing|something|anything|everything|nobody|somebody|anybody|everybody|also|still|once|was|out)\b)(\w+)\b/gi,
    replace: (m) => `their ${m[1]}`,
    limit: 3,
  },
  {
    id: 'conf-then-than',
    category: 'grammar',
    severity: 'error',
    title: 'than — сравнение, then — потом',
    explanation: 'В сравнениях используется «than»: bigger than, more interesting than.',
    example: 'This book is more interesting than that one. ✅  /  … more interesting then … ❌',
    pattern: /\b((?:more|less|better|worse|bigger|smaller|older|younger|higher|lower|longer|shorter|easier|harder|faster|slower|cheaper|greater|richer|healthier|cleverer|nicer)\s+(?:\w+\s+)?)then\b/gi,
    replace: (m) => `${m[1]}than`,
  },
  {
    id: 'conf-loose-lose',
    category: 'spelling',
    severity: 'error',
    title: 'lose / loose',
    explanation: '«Lose» (luːz) — терять; «loose» (luːs) — свободный, болтающийся.',
    example: 'Nobody wants to lose their job. ✅',
    pattern: /\bloose\s+(weight|money|time|the\s+game|a\s+job|jobs|interest|patience|friends|control|connection|hope|faith)\b/gi,
    replace: (m) => `lose ${m[1]}`,
  },
  {
    id: 'conf-effect-affect',
    category: 'grammar',
    severity: 'warning',
    title: 'affect / effect',
    explanation: '«Affect» — глагол (влиять), «effect» — существительное (влияние, эффект).',
    example: 'Stress affects our health. / It has a negative effect on health.',
    pattern: /\baffect\s+(on|of|is|was|are|were|has|have)\b|\beffect\s+(is|was|are|were)?\s*(on|the|a)\b(?=[^a-z])/gi,
    replace: (m) => (m[1] ? `effect ${m[1]}` : `affect${m[2] ? ' ' + m[2] : ''}`),
    limit: 2,
  },
  {
    id: 'conf-its-verb',
    category: 'grammar',
    severity: 'error',
    title: 'its / it’s',
    explanation: '«It’s» = it is / it has. «Its» — притяжательная форма (его, её). Если дальше идёт глагол — почти всегда нужно «it’s».',
    example: 'It’s raining. / The company changed its policy.',
    pattern: /\bits\s+(is|was|been|not|a|an|the|going|getting|very|really|quite|too|possible|important|clear|obvious|time|hard|easy|difficult|necessary|better|best|my|your|his|her|our|their|because|so|already|just|only|still|always|never|raining|snowing)\b/gi,
    replace: (m) => `it's ${m[1]}`,
  },
  {
    id: 'conf-youre-your',
    category: 'grammar',
    severity: 'error',
    title: 'your / you’re',
    explanation: '«Your» — ваш (перед существительным), «you’re» = you are (перед глаголом или прилагательным).',
    example: 'Your essay is good. / You’re right.',
    pattern: /\byour\s+(right|wrong|going|coming|doing|not|very|so|always|never|the\s+\w+|a\s+\w+|am|is|are|were|was|have|has|had|can|could|will|would|should|must|welcome)\b/gi,
    replace: (m) => `you're ${m[1]}`,
    limit: 2,
  },
  {
    id: 'conf-theirs',
    category: 'grammar',
    severity: 'warning',
    title: 'they’re / their',
    explanation: '«They’re» = they are; «their» — их.',
    example: 'They’re my friends. / Their car is new.',
    pattern: /\btheyre\b/gi,
    replace: "they're",
  },
  {
    id: 'conf-dont',
    category: 'punctuation',
    severity: 'error',
    title: 'Апостроф в сокращениях',
    explanation: 'В отрицательных формах нужен апостроф: don’t, doesn’t, didn’t, can’t, won’t.',
    example: 'I don’t know. ✅  /  I dont know. ❌',
    pattern: /\b(dont|doesnt|didnt|cant|wont|couldnt|wouldnt|shouldnt|mustnt|wasnt|werent|isnt|arent|arent|havent|hasnt|hadnt|aint)\b/gi,
    replace: (m) => {
      const map: Record<string, string> = {
        dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't", wont: "won't", couldnt: "couldn't", wouldnt: "wouldn't", shouldnt: "shouldn't", mustnt: "mustn't", wasnt: "wasn't", werent: "weren't", isnt: "isn't", arent: "aren't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't", aint: "isn't",
      }
      return map[m[1].toLowerCase()] ?? m[1]
    },
  },
  {
    id: 'conf-im-ive',
    category: 'punctuation',
    severity: 'error',
    title: 'Сокращения I’m, I’ve, I’ll',
    explanation: 'Сокращения с «I» пишутся с апострофом: I’m, I’ve, I’ll, I’d.',
    example: 'I’m sure you’ll like it. ✅',
    pattern: /\b(im|ive|ill|id)\s+(going|from|a|an|the|not|sure|sorry|happy|glad|sure|your|here|there|been|got|had|like|want|think|know|already|just|never|always)\b/g,
    replace: (m) => {
      const map: Record<string, string> = { im: "I'm", ive: "I've", ill: "I'll", id: "I'd" }
      return `${map[m[1].toLowerCase()]} ${m[2]}`
    },
    limit: 3,
  },
  {
    id: 'conf-i-lower',
    category: 'punctuation',
    severity: 'error',
    title: 'Местоимение «I» всегда с заглавной',
    explanation: 'В английском местоимение первого лица единственного числа всегда пишется с большой буквы — в любом месте предложения.',
    example: 'Yesterday I went to the cinema with my friends. ✅',
    pattern: /\bi\b(?=[\s',.;!?]|$)/g,
    replace: 'I',
    limit: 8,
  },

  /* ================================================================ */
  /*  6. Пунктуация и типографика                                       */
  /* ================================================================ */
  {
    id: 'punct-space-after',
    category: 'punctuation',
    severity: 'warning',
    title: 'Пробел после знака препинания',
    explanation: 'После запятой, точки и точки с запятой ставится пробел.',
    example: 'However, it is not always true.',
    pattern: /([,;:])(?=[A-Za-z])/g,
    replace: (m) => `${m[1]} `,
    limit: 10,
  },
  {
    id: 'punct-space-before',
    category: 'punctuation',
    severity: 'warning',
    title: 'Пробел перед знаком препинания',
    explanation: 'В английском перед запятой, точкой и знаками ! ? пробел не ставится (в отличие от французской типографики).',
    example: 'This is true, and it is important.',
    pattern: / +([,.!?;:])/g,
    replace: (m) => m[1],
    limit: 10,
  },
  {
    id: 'punct-no-space-after-dot',
    category: 'punctuation',
    severity: 'warning',
    title: 'Нет пробела после точки',
    explanation: 'Между предложениями ставится пробел — иначе текст сливается и теряет балл за организацию.',
    example: 'I agree with this idea. However, there is another side.',
    pattern: /([.!?])([A-Z][a-z])/g,
    replace: (m) => `${m[1]} ${m[2]}`,
    limit: 10,
  },
  {
    id: 'punct-capital-after-dot',
    category: 'punctuation',
    severity: 'error',
    title: 'Заглавная буква после конца предложения',
    explanation: 'Каждое новое предложение начинается с заглавной буквы.',
    example: 'This is good. But I have doubts.',
    pattern: /([.!?]\s+)([a-z])/g,
    replace: (m) => `${m[1]}${m[2].toUpperCase()}`,
    limit: 10,
  },
  {
    id: 'punct-capital-first',
    category: 'punctuation',
    severity: 'error',
    title: 'Предложение начинается с заглавной буквы',
    explanation: 'Первое слово в предложении всегда с заглавной буквы.',
    example: 'Modern technologies change our life.',
    pattern: /(^|\n\n)([a-z])/g,
    replace: (m) => `${m[1]}${m[2].toUpperCase()}`,
    limit: 6,
  },
  {
    id: 'punct-lowercase-newline',
    category: 'punctuation',
    severity: 'error',
    title: 'Абзац начинается с заглавной буквы',
    explanation: 'Каждый абзац начинается с заглавной буквы.',
    example: 'On the other hand, ...',
    pattern: /(\n)([a-z])/g,
    replace: (m) => `${m[1]}${m[2].toUpperCase()}`,
    limit: 6,
  },
  {
    id: 'punct-double-excl',
    category: 'punctuation',
    severity: 'note',
    title: 'Один восклицательный знак',
    explanation: 'В академической и деловой письменной речи восклицательный знак почти не используется, а двойной выглядит неграмотно.',
    example: 'This is great news.',
    pattern: /!{2,}/g,
    replace: '!',
    limit: 3,
  },
  {
    id: 'punct-ellipsis',
    category: 'punctuation',
    severity: 'note',
    title: 'Многоточие',
    explanation: 'В формальном письме многоточие неуместно — используйте полноценные предложения.',
    pattern: /\.{3,}/g,
    replace: '…',
    limit: 3,
  },
  {
    id: 'punct-comma-before-but',
    category: 'punctuation',
    severity: 'note',
    title: 'Запятая перед but / so / and (соединяет два предложения)',
    explanation: 'Если союз соединяет два самостоятельных предложения, перед ним ставится запятая.',
    example: 'I studied hard, but I still made mistakes.',
    pattern: /\b([A-Za-z]{2,})\s+(but|so)\s+(I|he|she|we|they|it|you|this|that|there)\b/g,
    replace: (m) => `${m[1]}, ${m[2]} ${m[3]}`,
    guard: (_m, text) => text.length > 40,
    limit: 3,
    weight: 0.1,
  },

  /* ================================================================ */
  /*  7. Стиль и лексическое разнообразие                               */
  /* ================================================================ */
  {
    id: 'style-in-my-opinion-i-think',
    category: 'style',
    severity: 'warning',
    title: 'Двойное выражение мнения',
    explanation: '«In my opinion, I think» — тавтология: достаточно одного оборота.',
    example: 'In my opinion, remote work has more advantages. ✅',
    pattern: /\b(in my opinion,?\s*I (?:think|believe|suppose|consider)|I think that in my opinion)\b/gi,
    replace: 'In my opinion,',
  },
  {
    id: 'style-as-for-me',
    category: 'style',
    severity: 'note',
    title: 'As for me — калька',
    explanation: 'Оборот «as for me» по-русски, но по-английски звучит странно. Используйте: personally, I / in my case / I, for one.',
    example: 'Personally, I prefer online lessons. ✅',
    pattern: /\bas for me\b/gi,
    replace: 'Personally, I',
    limit: 2,
  },
  {
    id: 'style-nowadays-overuse',
    category: 'style',
    severity: 'note',
    title: 'Nowadays — шаблонное начало',
    explanation: 'Почти каждое эссе начинается с «Nowadays». Экзаменатор считает это клише. Попробуйте: In recent years, Today, These days.',
    example: 'In recent years, online education has become popular.',
    pattern: /\bnowadays\b/gi,
    replace: 'These days',
    limit: 2,
    weight: 0.15,
  },
  {
    id: 'style-kids',
    category: 'style',
    severity: 'warning',
    title: 'kids → children',
    explanation: '«Kids» — разговорное. В формальном письме используйте «children».',
    example: 'Children spend too much time online. ✅',
    pattern: /\bkids\b/gi,
    replace: 'children',
    onlyFormal: true,
  },
  {
    id: 'style-a-lot-of',
    category: 'style',
    severity: 'note',
    title: 'a lot of → many / much / a great deal of',
    explanation: '«A lot of» уместно в разговорной речи. В эссе и деловом письме чаще используют many, much, a great deal of, numerous.',
    example: 'Numerous studies confirm this. ✅',
    pattern: /\ba lot of\b/gi,
    replace: 'a great deal of',
    onlyFormal: true,
    limit: 3,
  },
  {
    id: 'style-lots-of',
    category: 'style',
    severity: 'warning',
    title: 'lots of — разговорное',
    explanation: 'В формальном тексте «lots of» заменяется на many / much / a large number of.',
    example: 'A large number of people support the idea. ✅',
    pattern: /\blots of\b/gi,
    replace: 'a large number of',
    onlyFormal: true,
    limit: 2,
  },
  {
    id: 'style-contractions',
    category: 'style',
    severity: 'warning',
    title: 'Сокращения неуместны в формальном письме',
    explanation: 'В эссе, отчёте и официальном письме сокращения раскрываются: do not, it is, cannot.',
    example: 'It is important to note that … ✅  /  It’s important … ❌ (в эссе)',
    pattern: /\b(don't|doesn't|didn't|isn't|aren't|wasn't|weren't|can't|won't|couldn't|shouldn't|wouldn't|it's|that's|there's|I'm|we're|they're|you're|I've|we've|let's|gonna|wanna|gotta|kinda)\b/g,
    replace: (m) => {
      const map: Record<string, string> = {
        "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "can't": 'cannot', "won't": 'will not', "couldn't": 'could not', "shouldn't": 'should not', "wouldn't": 'would not', "it's": 'it is', "that's": 'that is', "there's": 'there is', "I'm": 'I am', "we're": 'we are', "they're": 'they are', "you're": 'you are', "I've": 'I have', "we've": 'we have', "let's": 'let us', gonna: 'going to', wanna: 'want to', gotta: 'have to', kinda: 'kind of',
      }
      return map[m[1]] ?? m[1].replace("'", '')
    },
    onlyFormal: true,
    limit: 6,
    weight: 0.4,
  },
  {
    id: 'style-things',
    category: 'style',
    severity: 'note',
    title: 'things — расплывчатое слово',
    explanation: '«Things» ничего не сообщает читателю. Конкретизируйте: factors, aspects, issues, benefits.',
    example: 'These factors influence our choices. ✅',
    pattern: /\bthings\b/gi,
    replace: 'factors',
    onlyFormal: true,
    limit: 3,
    weight: 0.2,
  },
  {
    id: 'style-very-overuse',
    category: 'style',
    severity: 'note',
    title: 'very — усилитель без смысла',
    explanation: 'Одно «very» на абзац допустимо, но злоупотребление снижает оценку за лексику: подберите точное прилагательное.',
    example: 'very important → crucial; very big → enormous',
    pattern: /\bvery\b/gi,
    replace: 'extremely',
    limit: 3,
    weight: 0.15,
    onlyFormal: true,
  },
  {
    id: 'style-good-overuse',
    category: 'style',
    severity: 'note',
    title: 'good — слишком общее слово',
    explanation: 'Замена «good» на точное прилагательное заметно улучшает оценку за лексику.',
    example: 'good → beneficial, effective, valuable, remarkable',
    pattern: /\bgood\b/gi,
    replace: 'positive',
    limit: 3,
    weight: 0.15,
    onlyFormal: true,
  },
  {
    id: 'style-informality-so',
    category: 'style',
    severity: 'note',
    title: 'so как усилитель — разговорная черта',
    explanation: '«So beautiful» вместо «very beautiful» — устная речь. В формальном тексте используйте very / extremely / remarkably.',
    pattern: /\bso\s+(beautiful|nice|good|great|amazing|hard|easy|interesting|cool|funny|bad|tiring)\b/gi,
    replace: (m) => `extremely ${m[1]}`,
    onlyFormal: true,
    limit: 2,
  },
  {
    id: 'lex-say-tell-report',
    category: 'style',
    severity: 'note',
    title: 'Однообразие глагола говорения',
    explanation: 'В эссе полезно показать лексический диапазон: argue, claim, state, point out, suggest.',
    example: 'Some researchers argue that … ✅',
    pattern: /\bI think\b/gi,
    replace: 'I believe',
    limit: 2,
    weight: 0.15,
  },

  /* ================================================================ */
  /*  8. Содержание: шаблонные фразы и пустые рассуждения              */
  /* ================================================================ */
  {
    id: 'content-empty-phrase',
    category: 'style',
    severity: 'note',
    title: 'Пустая вводная фраза',
    explanation: 'Такие фразы не несут смысла. Экзаменатор оценивает ваши идеи, а не количество вводных слов.',
    example: 'Start with your actual idea instead.',
    pattern: /\b(As we all know|It is a well-known fact|Every person in the world|In today's fast-paced world|Now I would like to tell about)\b/gi,
    replace: '',
    limit: 3,
    weight: 0.2,
  },
  {
    id: 'style-repetition-should',
    category: 'style',
    severity: 'note',
    title: 'Повтор модальности',
    explanation: 'Одно и то же «should» подряд читается как однообразная конструкция — варьируйте: ought to, need to, had better.',
    pattern: /\bshould\s+(\w+)[^.!?]{0,40}?should\s+\w+/gi,
    replace: (m) => `should ${m[1]}`,
    limit: 2,
    weight: 0.1,
  },
]

export function rulesForFormality(formality: 'formal' | 'informal' | 'neutral'): RegexRule[] {
  return RULES.filter((r) => {
    if (r.onlyFormal && formality !== 'formal') return false
    if (r.onlyInformal && formality !== 'informal') return false
    return true
  })
}

export const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]))

export const SEVERITY_WEIGHT: Record<Severity, number> = { error: 1, warning: 0.5, note: 0.15 }

export function ruleWeight(r: RegexRule): number {
  return r.weight ?? SEVERITY_WEIGHT[r.severity]
}
