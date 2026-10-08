import type { Issue } from '../types'
import { tokenize } from './text'

/** Самые частые ошибки русскоязычных учеников: правим их первыми и точно. */
export const CURATED: Record<string, string> = {
  // орфография общая
  becouse: 'because',
  beacuse: 'because',
  becuase: 'because',
  becasue: 'because',
  bcs: 'because',
  teh: 'the',
  adn: 'and',
  thier: 'their',
  freind: 'friend',
  frends: 'friends',
  frend: 'friend',
  definitly: 'definitely',
  definately: 'definitely',
  definetly: 'definitely',
  seperate: 'separate',
  seperated: 'separated',
  occured: 'occurred',
  occuring: 'occurring',
  recieve: 'receive',
  recieved: 'received',
  wich: 'which',
  untill: 'until',
  allways: 'always',
  allready: 'already',
  allmost: 'almost',
  everytime: 'every time',
  tomorow: 'tomorrow',
  tommorow: 'tomorrow',
  tommorrow: 'tomorrow',
  wierd: 'weird',
  buisness: 'business',
  succesful: 'successful',
  sucessful: 'successful',
  successfull: 'successful',
  succesfully: 'successfully',
  comunicate: 'communicate',
  comunication: 'communication',
  develope: 'develop',
  diference: 'difference',
  necessery: 'necessary',
  neccessary: 'necessary',
  necesary: 'necessary',
  ocassion: 'occasion',
  occassion: 'occasion',
  oppurtunity: 'opportunity',
  oportunity: 'opportunity',
  proffesional: 'professional',
  proffesion: 'profession',
  enviroment: 'environment',
  envirnoment: 'environment',
  goverment: 'government',
  diffrent: 'different',
  diferent: 'different',
  diffcult: 'difficult',
  dificult: 'difficult',
  intresting: 'interesting',
  intrest: 'interest',
  infomation: 'information',
  imformation: 'information',
  informatoin: 'information',
  questionaire: 'questionnaire',
  knowlege: 'knowledge',
  knoledge: 'knowledge',
  grammer: 'grammar',
  vokabulary: 'vocabulary',
  vocabluary: 'vocabulary',
  langauge: 'language',
  lenguage: 'language',
  meassage: 'message',
  messege: 'message',
  exersize: 'exercise',
  excercise: 'exercise',
  exercize: 'exercise',
  homewrok: 'homework',
  adress: 'address',
  sudenly: 'suddenly',
  finaly: 'finally',
  usefull: 'useful',
  carefull: 'careful',
  beautifull: 'beautiful',
  wonderfull: 'wonderful',
  helpfull: 'helpful',
  thankfull: 'thankful',
  peaple: 'people',
  poeple: 'people',
  peple: 'people',
  pepole: 'people',
  childs: 'children',
  childrens: 'children',
  womans: 'women',
  mans: 'men',
  habbits: 'habits',
  habbit: 'habit',
  comming: 'coming',
  begining: 'beginning',
  runing: 'running',
  stoped: 'stopped',
  planing: 'planning',
  studing: 'studying',
  studys: 'studies',
  writting: 'writing',
  geting: 'getting',
  puting: 'putting',
  siting: 'sitting',
  knowen: 'known',
  nead: 'need',
  nedded: 'needed',
  alot: 'a lot',
  aswell: 'as well',
  inspite: 'in spite',
  atleast: 'at least',
  // неправильные глаголы и формы
  goed: 'went',
  buyed: 'bought',
  teached: 'taught',
  thinked: 'thought',
  speaked: 'spoke',
  taked: 'took',
  maked: 'made',
  eated: 'ate',
  drinked: 'drank',
  gived: 'gave',
  getted: 'got',
  writed: 'wrote',
  readed: 'read',
  sended: 'sent',
  heared: 'heard',
  feeled: 'felt',
  keeped: 'kept',
  sleeped: 'slept',
  catched: 'caught',
  bringed: 'brought',
  finded: 'found',
  forgetted: 'forgot',
  understanded: 'understood',
  knowed: 'knew',
  meated: 'met',
  runned: 'ran',
  sayed: 'said',
  stooded: 'stood',
  swimmed: 'swam',
  telled: 'told',
  weared: 'wore',
  winned: 'won',
  choosed: 'chose',
  losed: 'lost',
  payed: 'paid',
  doed: 'did',
  tryed: 'tried',
  studyed: 'studied',
  cryed: 'cried',
  plaied: 'played',
  enjoied: 'enjoyed',
  worryed: 'worried',
  hurryed: 'hurried',
  // типично русские кальки написания
  advices: 'advice',
  informations: 'information',
  knowledges: 'knowledge',
  moneys: 'money',
  homeworks: 'homework',
  equipments: 'equipment',
  furnitures: 'furniture',
  peoples: 'people',
  luggages: 'luggage',
  trouses: 'trousers',
  wekend: 'weekend',
  weakend: 'weekend',
  dont: "don't",
  doesnt: "doesn't",
  didnt: "didn't",
  cant: "can't",
  wont: "won't",
  couldnt: "couldn't",
  wouldnt: "wouldn't",
  shouldnt: "shouldn't",
  mustnt: "mustn't",
  wasnt: "wasn't",
  werent: "weren't",
  isnt: "isn't",
  arent: "aren't",
  havent: "haven't",
  hasnt: "hasn't",
  hadnt: "hadn't",
  theres: "there's",
  thats: "that's",
  whats: "what's",
  hes: "he's",
  shes: "she's",
  theyre: "they're",
  youre: "you're",
  im: "I'm",
  ive: "I've",
  okay: 'OK',
  ok: 'OK',
  holliday: 'holiday',
  freetime: 'free time',
}

/** Слова, которые ученик пишет по-русски: приложение помечает их отдельно. */
const CYRILLIC = /[\u0400-\u04FF]/

/** Имена собственные и термины, которые не считаем ошибкой. */
export const DEFAULT_PERSONAL = [
  'ielts', 'toefl', 'ege', 'oge', 'vpr', 'usa', 'uk', 'russia', 'moscow', 'samara', 'spain', 'italy', 'germany', 'france',
  'china', 'japan', 'instagram', 'tiktok', 'whatsapp', 'telegram', 'youtube', 'netflix', 'google', 'chatgpt',
  'openai', 'zoom', 'skype', 'spotify', 'english', 'russian', 'tatarstan', 'kazan', 'petersburg', 'saint',
  'sat', 'gre', 'cae', 'fce', 'cpe', 'b2', 'c1', 'cefr', 'whatsapp', 'iphone', 'android', 'email', 'online',
]

/** Британские варианты написания и слова, которых нет в базовом словаре. */
const BUILTIN_EXTRA = [
  'programme', 'programmes', 'colour', 'colours', 'coloured', 'favourite', 'favourites', 'behaviour', 'behaviours',
  'organisation', 'organisations', 'organise', 'organised', 'organises', 'realise', 'realised', 'realises',
  'recognise', 'recognised', 'recognises', 'analyse', 'analysed', 'analyses', 'apologise', 'apologised',
  'criticise', 'criticised', 'emphasise', 'emphasised', 'memorise', 'memorised', 'socialise', 'summarise',
  'summarised', 'specialise', 'specialised', 'centre', 'centres', 'metre', 'metres', 'theatre', 'theatres',
  'travelling', 'travelled', 'traveller', 'travellers', 'cancelled', 'cancelling', 'labelled', 'modelling',
  'fulfil', 'defence', 'offence', 'licence', 'practise', 'kilometre', 'kilometres', 'neighbour', 'neighbours',
  'neighbourhood', 'flavour', 'humour', 'honour', 'labour', 'rumour', 'savour', 'splendour', 'catalogue',
  'dialogue', 'dialogue', 'cheque', 'jewellery', 'grey', 'aeroplane', 'aeroplanes', 'enrolment', 'cosy',
  'practice', 'practiced', 'selfie', 'selfies', 'podcast', 'podcasts', 'smartphone', 'smartphones', 'app', 'apps',
  'website', 'websites', 'online', 'offline', 'email', 'emails', 'blog', 'blogs', 'blogger', 'vegan', 'stressful',
  'unhealthy', 'wellbeing', 'well-being', 'wellness', 'workout', 'workouts', 'fitness', 'chat', 'chats', 'laptop',
  'laptops', 'tablet', 'tablets', 'gadget', 'gadgets', 'influencer', 'influencers', 'streaming', 'binge',
]

let spellFn: { correct: (w: string) => boolean; suggest: (w: string) => string[]; add: (w: string) => void } | null = null
let loading: Promise<void> | null = null

/** База словаря лежит в public/dict: 550 КБ, подгружается один раз и кэшируется браузером. */
const DICT_BASE = (import.meta.env?.BASE_URL ?? '/') + 'dict/'

export async function initSpell(): Promise<void> {
  if (spellFn) return
  if (loading) return loading
  loading = (async () => {
    const [mod, affRes, dicRes] = await Promise.all([
      import('nspell'),
      fetch(`${DICT_BASE}en.aff`),
      fetch(`${DICT_BASE}en.dic`),
    ])
    const [aff, dic] = await Promise.all([affRes.text(), dicRes.text()])
    const nspell = (mod as unknown as { default: (a: string, d: string) => typeof spellFn }).default
    const spell = nspell(aff, dic)!
    for (const w of [...DEFAULT_PERSONAL, ...BUILTIN_EXTRA]) spell.add(w)
    spellFn = spell
  })()
  return loading
}

export function spellReady() {
  return Boolean(spellFn)
}

export function addWords(words: string[]) {
  if (!spellFn) return
  for (const w of words) if (w) spellFn.add(w.toLowerCase())
}

function isCapitalized(w: string) {
  return /^[A-Z]/.test(w) && w.slice(1) === w.slice(1).toLowerCase()
}

function isSentenceStart(text: string, index: number) {
  const before = text.slice(Math.max(0, index - 3), index)
  if (index === 0) return true
  return /(^|[.!?…\n]\s*|["«(]\s*)$/.test(before) && !/[a-zA-Z]$/.test(before)
}

/** Орфографическая проверка: сначала «умный» список, затем словарь Hunspell. */
export function checkSpelling(text: string, extraPersonal: string[] = []): Issue[] {
  const issues: Issue[] = []
  const personal = new Set([...DEFAULT_PERSONAL, ...BUILTIN_EXTRA, ...extraPersonal.map((w) => w.toLowerCase())])
  const tokens = tokenize(text)

  for (const t of tokens) {
    const raw = t.text
    const lower = t.lower

    if (CYRILLIC.test(raw)) {
      issues.push({
        ruleId: 'ru-word',
        category: 'spelling',
        severity: 'error',
        title: 'Русское слово в английском тексте',
        explanation: 'Слово набрано кириллицей. Если не удаётся вспомнить слово — используйте более простую английскую конструкцию.',
        start: t.start,
        end: t.end,
        found: raw,
        suggestion: null,
      })
      continue
    }

    // слова с дефисом проверяем по частям
    if (raw.includes('-')) {
      let offset = 0
      for (const part of raw.split('-')) {
        if (part.length > 2 && !personal.has(part.toLowerCase()) && spellFn && !spellFn.correct(part)) {
          const curated = CURATED[part.toLowerCase()]
          issues.push({
            ruleId: curated ? 'spelling-curated' : 'spelling-dict',
            category: 'spelling',
            severity: 'error',
            title: curated ? `Частая ошибка: «${part}»` : `Орфография: «${part}»`,
            explanation: curated
              ? 'Это слово входит в список самых частых ошибок русскоязычных учеников — стоит выучить его написание наизусть.'
              : 'Слово отсутствует в словаре английского языка. Проверьте написание.',
            start: t.start + offset,
            end: t.start + offset + part.length,
            found: part,
            suggestion: curated ?? spellFn.suggest(part)[0] ?? null,
          })
        }
        offset += part.length + 1
      }
      continue
    }

    if (lower.length <= 2 || personal.has(lower)) continue
    if (/[0-9]/.test(raw)) continue
    if (raw.length > 2 && raw === raw.toUpperCase()) continue // аббревиатуры: IELTS, BBC, TV

    const curated = CURATED[lower]
    if (curated) {
      issues.push({
        ruleId: `spelling-curated-${lower}`,
        category: 'spelling',
        severity: 'error',
        title: `Частая ошибка: «${raw}» → «${curated}»`,
        explanation: 'Это слово входит в список самых частых ошибок русскоязычных учеников — его стоит выучить наизусть.',
        start: t.start,
        end: t.end,
        found: raw,
        suggestion: matchCase(curated, raw),
      })
      continue
    }

    if (!spellFn || spellFn.correct(raw)) continue
    if (spellFn.correct(lower)) continue // имя собственное или слово с заглавной

    const suggestions = spellFn.suggest(raw).slice(0, 4)
    const base = lower.includes("'") ? lower.split("'")[0] : lower
    if (base.includes("'") || (spellFn.correct(base) && lower.includes("'"))) continue

    // слова в середине предложения с заглавной буквы чаще всего имена собственные — не трогаем
    if (isCapitalized(raw) && !isSentenceStart(text, t.start)) continue
    if (!suggestions.length) continue

    issues.push({
      ruleId: 'spelling-dict',
      category: 'spelling',
      severity: 'error',
      title: 'Орфографическая ошибка',
      explanation:
        suggestions.length > 1
          ? `Возможные варианты: ${suggestions.slice(0, 3).join(', ')}. Проверьте написание по словарю.`
          : 'Возможно, слово написано неверно. Проверьте написание по словарю.',
      start: t.start,
      end: t.end,
      found: raw,
      suggestion: matchCase(suggestions[0], raw),
    })
  }

  return issues
}

export function matchCase(value: string, source: string) {
  if (/^[A-Z]/.test(source) && /^[a-z]/.test(value)) return value[0].toUpperCase() + value.slice(1)
  return value
}
