import type { DocStats, Span, WordFreq } from '../types'

export interface Token extends Span {
  lower: string
}

const ABBREV_END = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|Prof|St|no|fig|p)\.$/i

const STOPWORDS = new Set(
  `a an the and or but if because so that this these those there here it its it's is are was were be been being am do does did done doing have has had having will would shall should can could may might must not no nor as at by for from in into of on onto out over to up with within without about after again against all also any both each few more most other some such than then too very just only own same own my your his her our their its me him them us you he she we they i who whom which what when where why how while during between under above below off down once ever never always often sometimes usually really quite rather much many lot lots thing things thing's don't doesn't didn't isn't aren't wasn't weren't can't won't wouldn't shouldn't couldn't t s re ve ll d m`
    .split(/\s+/)
    .filter(Boolean),
)

export function isStopword(w: string) {
  return STOPWORDS.has(w)
}

/** Разбивает текст на слова: буквы, дефисы и апострофы внутри слова. */
export function tokenize(text: string): Token[] {
  const out: Token[] = []
  const re = /[\p{L}][\p{L}'’\-]*/gu
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    out.push({ text: m[0], lower: m[0].toLowerCase().replace(/’/g, "'"), start: m.index, end: m.index + m[0].length })
  }
  return out
}

/** Разбивает текст на предложения, учитывая сокращения вида "e.g." и инициалы. */
export function splitSentences(text: string): Span[] {
  const spans: Span[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== '…') continue
    if (ch === '.') {
      const before = text.slice(Math.max(0, i - 6), i + 1)
      if (ABBREV_END.test(before)) continue
      // одиночная буква перед точкой — инициал (J. Smith)
      if (/(?:^|[\s(])[A-ZА-Я]$/.test(text.slice(Math.max(0, i - 2), i))) continue
      // десятичные дроби и сокращения типа 3.5 / ул.5
      if (/\d$/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) continue
    }
    // конец предложения: за знаком идёт пробел + заглавная/цифра, либо конец текста
    let j = i + 1
    while (j < text.length && /[.!?…"')\]]/.test(text[j])) j++
    if (j < text.length && !/\s/.test(text[j])) continue
    let k = j
    while (k < text.length && /\s/.test(text[k])) k++
    const rest = text.slice(k)
    const nextChar = rest[0]
    const startsNew = k >= text.length || /[A-ZА-ЯЁ0-9«"(\[—–-]/.test(nextChar ?? '')
    if (!startsNew) continue
    const piece = text.slice(start, j)
    if (tokenize(piece).length > 0) spans.push({ start, end: j, text: piece })
    start = k
    i = k - 1
  }
  const tail = text.slice(start)
  if (tokenize(tail).length > 0) spans.push({ start, end: text.length, text: tail })
  return spans
}

export function splitParagraphs(text: string): Span[] {
  const spans: Span[] = []
  const re = /[^\n]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const raw = m[0]
    if (!tokenize(raw).length) continue
    const trimmedStart = m.index + (raw.length - raw.trimStart().length)
    const trimmed = raw.trim()
    spans.push({ start: trimmedStart, end: trimmedStart + trimmed.length, text: trimmed })
  }
  return spans
}

/** Склонение: 1 ошибка / 2 ошибки / 5 ошибок */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export const LINKERS = [
  'in addition',
  'on the other hand',
  'in conclusion',
  'to sum up',
  'as a result',
  'for example',
  'for instance',
  'in my opinion',
  'in spite of',
  'even though',
  'first of all',
  'what is more',
  'all in all',
  'in other words',
  'as well as',
  'due to',
  'apart from',
  'however',
  'moreover',
  'furthermore',
  'nevertheless',
  'therefore',
  'consequently',
  'although',
  'though',
  'whereas',
  'because',
  'since',
  'besides',
  'finally',
  'firstly',
  'secondly',
  'thirdly',
  'overall',
  'meanwhile',
  'while',
  'also',
  'despite',
  'thus',
  'hence',
]

export const BASIC_WORDS = [
  'very',
  'good',
  'bad',
  'nice',
  'big',
  'small',
  'things',
  'thing',
  'a lot of',
  'lots of',
  'really',
  'important',
  'interesting',
  'people',
  'many',
  'much',
  'want',
  'like',
  'also',
  'nowadays',
]

export const ADVANCED_PATTERNS: { id: string; name: string; re: RegExp }[] = [
  { id: 'cond', name: 'условные предложения (if / unless / would)', re: /\b(if|unless)\b[^.!?]{0,40}\b(would|will|had|could)\b/gi },
  { id: 'rel', name: 'относительные придаточные (who / which / whose / where)', re: /\b(who|which|whose|where|that)\b\s+\w+s\b/gi },
  { id: 'pass', name: 'пассивный залог (be + V3)', re: /\b(is|are|was|were|been|being|be)\s+\w+(ed|en|wn|ne|lt|ld|nt|ut|ad|rn|de)\b/gi },
  { id: 'perf', name: 'совершённые времена (have/has/had + V3)', re: /\b(have|has|had)\s+(been\s+)?\w+(ed|en|wn|ne|lt|ld|nt|ut|ad|rn|de|t)\b/gi },
  { id: 'modal', name: 'модальные глаголы (should / might / must …)', re: /\b(should|might|must|may|could|shall|ought to|would)\b/gi },
  { id: 'gerund', name: 'герундий (enjoy doing)', re: /\b(enjoy|enjoys|enjoyed|like|likes|liked|love|loves|hate|hates|finish|finishes|finished|stop|stops|stopped|avoid|avoids|suggest|suggests|keep|keeps|mind|minds|start|starts|started|continue|continues)\s+\w+ing\b/i },
  { id: 'infinitive', name: 'инфинитив (decide to do)', re: /\b(want|wants|decide|decides|decided|hope|hopes|hoped|plan|plans|planned|try|tries|tried|need|needs|managed|refuse|refuses|promise|promises|agree|agrees|offer|offers|would like)\s+to\s+\w+/i },
  { id: 'compar', name: 'сравнения (more … than / the most …)', re: /\b(more|less|the most|the least)\s+\w+/gi },
  { id: 'part', name: 'причастные обороты', re: /\b\w+ing\b\s*,\s*/g },
  { id: 'inversion', name: 'инверсия и эмфаза (Not only … / Only if …)', re: /\b(not only|only if|never before|rarely)\b/gi },
  { id: 'impersonal', name: 'безличные конструкции (It is said / There is)', re: /\b(it is (said|believed|thought|known)|there (is|are|was|were))\b/gi },
]

function extractMatches(text: string, words: string[]): string[] {
  const found = new Set<string>()
  for (const w of words) {
    const re = new RegExp(`(?:^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu')
    if (re.test(text)) found.add(w)
  }
  return [...found]
}

export function computeStats(text: string): DocStats {
  const tokens = tokenize(text)
  const sentences = splitSentences(text)
  const paragraphs = splitParagraphs(text)
  const lower = tokens.map((t) => t.lower)
  const words = lower.length

  const content = lower.filter((w) => w.length >= 4 && !isStopword(w) && /^[a-z']+$/.test(w))
  const freq = new Map<string, number>()
  for (const w of content) freq.set(w, (freq.get(w) ?? 0) + 1)

  const repeatedWords: WordFreq[] = [...freq.entries()]
    .filter(([, c]) => c >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }))

  const basicWords: WordFreq[] = []
  for (const w of BASIC_WORDS) {
    const re = new RegExp(`(?:^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu')
    const count = (text.match(re) ?? []).length
    const threshold = w.includes(' ') ? 2 : 3
    if (count >= threshold) basicWords.push({ word: w, count })
  }
  basicWords.sort((a, b) => b.count - a.count)

  const sentenceWords = sentences.map((s) => tokenize(s.text).length)
  let longest: DocStats['longestSentence'] = null
  sentenceWords.forEach((n, index) => {
    if (!longest || n > longest.words) longest = { text: sentences[index].text.trim(), words: n, index }
  })

  const advanced = ADVANCED_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.name)

  const contentLengths = content.map((w) => w.length)
  const avgWordLength = contentLengths.length
    ? Math.round((contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length) * 100) / 100
    : 0

  return {
    words,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    chars: text.length,
    uniqueContent: new Set(content).size,
    contentTokens: content.length,
    avgWordLength,
    avgSentenceLength: sentences.length ? Math.round((words / sentences.length) * 10) / 10 : 0,
    longestSentence: longest,
    shortSentences: sentenceWords.filter((n) => n <= 3).length,
    linkers: extractMatches(text, LINKERS),
    advanced,
    basicWords,
    repeatedWords,
    paragraphWordCounts: paragraphs.map((p) => tokenize(p.text).length),
  }
}
