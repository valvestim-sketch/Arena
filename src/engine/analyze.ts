import type { Analysis, Category, CriterionResult, Exercise, Issue, Severity, TaskTypeId } from '../types'
import { ruleWeight, rulesForFormality, SEVERITY_WEIGHT } from './rules'
import { computeStats, plural, splitParagraphs, splitSentences } from './text'
import { checkSpelling, matchCase } from './spell'
import { taskType } from './taskTypes'

const CATEGORY_LABEL: Record<Category, string> = {
  spelling: 'Орфография',
  grammar: 'Грамматика',
  lexis: 'Лексика',
  punctuation: 'Пунктуация',
  style: 'Стиль',
}

export const CATEGORY_NAME = CATEGORY_LABEL

const CEFR_BY_BAND: [number, string][] = [
  [8.5, 'C2'],
  [7, 'C1'],
  [6, 'B2'],
  [5, 'B1'],
  [4, 'B1'],
  [3, 'A2'],
  [0, 'A1 – A2'],
]

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function round05(v: number) {
  return Math.round(v * 2) / 2
}

/** Прогоняет все правило-ориентированные проверки и возвращает найденные проблемы. */
export function runRules(text: string, formality: 'formal' | 'informal' | 'neutral', personal: string[] = []): Issue[] {
  const issues: Issue[] = checkSpelling(text, personal)
  const rules = rulesForFormality(formality)

  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g')
    let m: RegExpExecArray | null
    let hits = 0
    while ((m = re.exec(text))) {
      if (m[0] === '') {
        re.lastIndex++
        continue
      }
      if (rule.guard && !rule.guard(m, text)) continue
      const found = m[0]
      let suggestion = typeof rule.replace === 'function' ? rule.replace(m) : found.replace(new RegExp(rule.pattern.source, rule.pattern.flags.replace('g', '')), rule.replace)
      suggestion = matchCase(suggestion, found)
      if (!suggestion || suggestion.toLowerCase() === found.toLowerCase()) continue
      issues.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        explanation: rule.explanation,
        example: rule.example,
        start: m.index,
        end: m.index + found.length,
        found,
        suggestion,
        weight: ruleWeight(rule),
      })
      hits++
      if (rule.limit && hits >= rule.limit) break
    }
  }

  return dedupe(issues)
}

/** Убирает пересекающиеся и дублирующиеся находки, оставляя самые значимые. */
function dedupe(issues: Issue[]): Issue[] {
  const sorted = [...issues].sort((a, b) => {
    const wa = SEVERITY_WEIGHT[a.severity]
    const wb = SEVERITY_WEIGHT[b.severity]
    if (wb !== wa) return wb - wa
    const la = a.end - a.start
    const lb = b.end - b.start
    if (lb !== la) return lb - la
    return a.start - b.start
  })
  const kept: Issue[] = []
  for (const issue of sorted) {
    const overlap = kept.some((k) => issue.start < k.end && k.start < issue.end)
    if (overlap) continue
    kept.push(issue)
  }
  return kept.sort((a, b) => a.start - b.start)
}

function weightSum(issues: Issue[], cats: Category[]) {
  return issues.filter((i) => cats.includes(i.category)).reduce((sum, i) => sum + (i.weight ?? SEVERITY_WEIGHT[i.severity]), 0)
}

function per100(count: number, words: number) {
  if (!words) return 0
  return (count / Math.max(words, 60)) * 100
}

function topRules(issues: Issue[], limit = 3) {
  const map = new Map<string, { title: string; count: number; category: Category; severity: Severity; sample: Issue }>()
  for (const i of issues) {
    const cur = map.get(i.ruleId)
    if (cur) cur.count++
    else map.set(i.ruleId, { title: i.title, count: 1, category: i.category, severity: i.severity, sample: i })
  }
  return [...map.entries()]
    .map(([ruleId, v]) => ({ ruleId, ...v }))
    .sort((a, b) => {
      const w = SEVERITY_WEIGHT[b.severity] * b.count - SEVERITY_WEIGHT[a.severity] * a.count
      if (w !== 0) return w
      return a.sample.start - b.sample.start
    })
    .slice(0, limit)
}

/* ------------------------------------------------------------------ */
/*  Оценка по критериям                                                */
/* ------------------------------------------------------------------ */

function scoreTask(text: string, words: number, tt: ReturnType<typeof taskType>, issues: Issue[]): CriterionResult {
  const min = tt.minWords
  const hardMin = tt.hardMin ?? Math.round(min * 0.7)
  let score = 7.5
  const strengths: string[] = []
  const weaknesses: string[] = []

  if (words < hardMin) {
    score = 2.5
    weaknesses.push(`Объём ${words} слов — намного меньше требуемых ${min}. За такое количество слов баллы по критериям задания не начисляются.`)
  } else if (words < min) {
    score = 5
    weaknesses.push(`Объём ${words} слов — ниже требуемых ${min}. Нужно раскрыть пункты подробнее.`)
  } else {
    strengths.push(`Объём соблюдён: ${words} слов (требуется от ${min}).`)
    if (tt.maxWords && words > tt.maxWords) {
      const excess = (words - tt.maxWords) / tt.maxWords
      if (excess > 0.1) {
        score -= 1.5
        weaknesses.push(`Объём ${words} слов превышает допустимые ${tt.maxWords} более чем на 10% — лишняя часть не проверяется.`)
      } else {
        score -= 0.5
        weaknesses.push(`Объём ${words} слов немного больше допустимых ${tt.maxWords}: лучше сократить.`)
      }
    }
  }

  if (tt.id === 'email') {
    const greeting = /^\s*(hi|hello|hey|dear)\b[^\n]{0,40}[,!]/im.test(text)
    const closing = /\b(best wishes|all the best|take care|see you|write back|bye|yours|love,|lots of love|hope to hear)\b/i.test(text)
    const signature = /\n\s*[A-Z][a-z]+\s*$/m.test(text.trim())
    if (greeting) strengths.push('Есть неформальное обращение.')
    else {
      score -= 0.8
      weaknesses.push('Нет обращения (Hi / Dear + имя) — это обязательный элемент письма.')
    }
    if (closing) strengths.push('Есть завершающая фраза.')
    else {
      score -= 0.6
      weaknesses.push('Нет завершающей фразы (Best wishes / Write back soon / Take care).')
    }
    if (!signature) {
      score -= 0.4
      weaknesses.push('Нет подписи в конце письма (имя без точки).')
    }
  }
  if (tt.id === 'formal-letter') {
    const greeting = /^\s*dear\s+(sir|madam|mr|mrs|ms|miss)\b/im.test(text)
    const closing = /\b(yours (faithfully|sincerely)|kind regards|best regards)\b/i.test(text)
    if (!greeting) {
      score -= 0.8
      weaknesses.push('Обращение не соответствует деловому формату (Dear Sir or Madam / Dear Mr Smith).')
    }
    if (!closing) {
      score -= 0.6
      weaknesses.push('Завершение не соответствует деловому формату (Yours faithfully / Kind regards).')
    }
  }

  const emptyPhrases = issues.filter((i) => i.ruleId === 'content-empty-phrase').length
  if (emptyPhrases) {
    score -= 0.5
    weaknesses.push('Есть шаблонные фразы без смысла — они не добавляют баллов.')
  }
  if (tt.id === 'ielts2' || tt.id === 'ege38') {
    const hasOpinion = /\b(I (?:believe|think|suppose|am convinced|firmly believe)|in my (?:opinion|view)|from my point of view|personally)\b/i.test(text)
    const hasConclusion = /\b(in conclusion|to (?:sum up|conclude)|all in all|overall|в итоге)\b/i.test(text)
    const hasExample = /\b(for example|for instance|such as|to illustrate|namely)\b/i.test(text)
    if (hasOpinion) strengths.push('Мнение автора выражено прямо.')
    else {
      score -= 0.4
      weaknesses.push('Позиция автора выражена неявно — нужна прямая формулировка во введении и заключении.')
    }
    if (hasConclusion) strengths.push('Есть заключение с обобщением.')
    else {
      score -= 0.3
      weaknesses.push('Нет заключения (in conclusion / to sum up).')
    }
    if (hasExample) strengths.push('Аргументы подкреплены примерами.')
    else {
      score -= 0.4
      weaknesses.push('Аргументы не подкреплены примерами или пояснениями.')
    }
  }

  return {
    id: 'task',
    name: 'Выполнение задания',
    score: clamp(round05(score), 1, 9),
    comment:
      score >= 7
        ? 'Задание выполнено: объём и структура соответствуют требованиям формата.'
        : 'Задание выполнено частично — сначала стоит исправить объём и структуру, потом язык.',
    strengths,
    weaknesses,
  }
}

function scoreCoherence(stats: ReturnType<typeof computeStats>, issues: Issue[], tt: ReturnType<typeof taskType>): CriterionResult {
  let score = 8
  const strengths: string[] = []
  const weaknesses: string[] = []

  const linkers = stats.linkers.length
  if (linkers === 0) {
    score -= 1.5
    weaknesses.push('Нет связок между предложениями и абзацами — текст читается как набор отдельных фраз.')
  } else if (linkers <= 2) {
    score -= 0.6
    weaknesses.push(`Мало связок (найдено ${linkers}). Добавьте however, therefore, in addition, as a result.`)
  } else {
    strengths.push(`Есть связки (${linkers}): ${stats.linkers.slice(0, 6).join(', ')}.`)
  }

  if (stats.paragraphs < 2) {
    score -= 1.5
    weaknesses.push('Текст написан одним абзацем — работа теряет баллы за организацию.')
  } else if (stats.paragraphs === 2 && (tt.id === 'ielts2' || tt.id === 'ege38')) {
    score -= 0.5
    weaknesses.push('Абзацев всего два. Нужны отдельные абзацы для каждого аргумента.')
  } else {
    strengths.push(`Структура из ${stats.paragraphs} абзацев.`)
  }

  if (stats.avgSentenceLength > 32) {
    score -= 0.7
    weaknesses.push(`Средняя длина предложения ${stats.avgSentenceLength} слов — конструкции перегружены, разделите их.`)
  } else if (stats.avgSentenceLength < 8 && stats.words > 60) {
    score -= 0.4
    weaknesses.push('Предложения очень короткие и рубленые — не хватает сложных конструкций.')
  }

  if (stats.repeatedWords.length >= 2) {
    score -= 0.4
    weaknesses.push(`Повторяются слова: ${stats.repeatedWords.slice(0, 4).map((w) => `${w.word} (${w.count})`).join(', ')}.`)
  }

  const punct = per100(weightSum(issues, ['punctuation']), stats.words)
  if (punct > 1.5) {
    score -= 0.5
    weaknesses.push('Много ошибок в пунктуации и заглавных буквах.')
  }

  const styleNotes = issues.filter((i) => i.category === 'style').length
  if (styleNotes >= 4) score -= 0.3

  return {
    id: 'coherence',
    name: 'Организация и связность',
    score: clamp(round05(score), 2, 9),
    comment:
      score >= 7
        ? 'Текст структурирован, абзацы и связки на месте.'
        : 'Логика есть, но структуру нужно усилить: абзацы, связки, более точные отсылки.',
    strengths,
    weaknesses,
  }
}

function scoreLexis(stats: ReturnType<typeof computeStats>, issues: Issue[]): CriterionResult {
  let score = 8
  const strengths: string[] = []
  const weaknesses: string[] = []

  const lexisIssues = issues.filter((i) => i.category === 'lexis' || i.category === 'spelling')
  const density = per100(weightSum(issues, ['lexis', 'spelling']), stats.words)
  score -= density * 0.75

  const diversity = stats.contentTokens ? stats.uniqueContent / stats.contentTokens : 0
  if (diversity < 0.72 && stats.words > 100) {
    score -= 0.7
    weaknesses.push('Лексика однообразная: одни и те же слова повторяются — нужно использовать синонимы.')
  } else if (diversity > 0.88 && stats.words > 100) {
    score += 0.3
    strengths.push('Хорошее разнообразие лексики — слова почти не повторяются.')
  }
  if (stats.basicWords.length >= 3) {
    score -= 0.5
    weaknesses.push(`Слишком часто базовые слова: ${stats.basicWords.slice(0, 4).map((w) => `«${w.word}» ×${w.count}`).join(', ')}. Нужны точные синонимы.`)
  }
  if (stats.advanced.length >= 4) {
    score += 0.3
    strengths.push(`Использованы сложные конструкции: ${stats.advanced.slice(0, 4).join('; ')}.`)
  } else if (stats.advanced.length <= 1 && stats.words > 120) {
    score -= 0.5
    weaknesses.push('Почти нет сложных грамматических конструкций — они прямо входят в оценку за лексико-грамматическую сторону.')
  }
  if (stats.repeatedWords.length) {
    weaknesses.push(`Повтор лексики: ${stats.repeatedWords.slice(0, 3).map((w) => `${w.word} ×${w.count}`).join(', ')}.`)
  }
  if (stats.avgWordLength < 5.3 && stats.words > 100) {
    score -= 0.6
    weaknesses.push('Лексика в основном из базового набора — не хватает точных и продвинутых слов.')
  } else if (stats.avgWordLength > 5.9 && stats.words > 100) {
    score += 0.3
    strengths.push('Лексика продвинутая: используются точные и менее частотные слова.')
  }
  if (stats.advanced.length <= 3 && stats.words > 100) score -= 0.4
  const spelling = issues.filter((i) => i.category === 'spelling').length
  if (spelling === 0 && stats.words > 80) strengths.push('Орфографических ошибок не найдено.')

  score = Math.min(score, 6 + stats.advanced.length * 0.6)
  return {
    id: 'lexis',
    name: 'Лексика',
    score: clamp(round05(score), 2, 9),
    comment:
      lexisIssues.length === 0
        ? 'Лексика уместна и достаточно разнообразна.'
        : `Найдено ${lexisIssues.length} ${plural(lexisIssues.length, 'лексическая/орфографическая ошибка', 'лексические/орфографические ошибки', 'лексических/орфографических ошибок')}.`,
    strengths,
    weaknesses,
  }
}

function scoreGrammar(stats: ReturnType<typeof computeStats>, issues: Issue[]): CriterionResult {
  let score = 8
  const strengths: string[] = []
  const weaknesses: string[] = []

  const grammarIssues = issues.filter((i) => i.category === 'grammar')
  const density = per100(weightSum(issues, ['grammar']), stats.words)
  score -= density * 0.85

  const heavy = grammarIssues.filter((i) => i.severity === 'error')
  if (heavy.length >= 6) score -= 0.4
  if (stats.advanced.length <= 3 && stats.words > 100) {
    score -= 0.6
    weaknesses.push('Грамматический диапазон узкий: почти нет сложных конструкций (придаточные, пассив, условные).')
  }
  if (stats.avgSentenceLength < 9 && stats.words > 100) {
    score -= 0.5
    weaknesses.push('Все предложения простые и короткие — для высокой оценки нужны сложные структуры.')
  }
  if (!grammarIssues.length && stats.words > 80) strengths.push('Грамматических ошибок не найдено.')
  if (stats.advanced.length >= 4) strengths.push('Разнообразные конструкции: от придаточных до пассивного залога.')
  if (heavy.length) {
    const byRule = topRules(heavy, 3)
    weaknesses.push(`Повторяющиеся ошибки: ${byRule.map((r) => `«${r.title}» (${r.count})`).join(', ')}.`)
  }
  if (stats.avgSentenceLength > 32) weaknesses.push('Слишком длинные предложения — в них теряется контроль над грамматикой.')

  score = Math.min(score, 6.5 + stats.advanced.length * 0.5)
  return {
    id: 'grammar',
    name: 'Грамматика и пунктуация',
    score: clamp(round05(score), 2, 9),
    comment:
      grammarIssues.length === 0
        ? 'Грамматика в порядке: серьёзных ошибок не обнаружено.'
        : `${grammarIssues.length} ${plural(grammarIssues.length, 'грамматическая ошибка', 'грамматические ошибки', 'грамматических ошибок')}, из них ${heavy.length} ${plural(heavy.length, 'грубая', 'грубые', 'грубых')}.`,
    strengths,
    weaknesses,
  }
}

/* ------------------------------------------------------------------ */
/*  Упражнения и сообщение ученику                                     */
/* ------------------------------------------------------------------ */

function snippet(text: string, issue: Issue, radius = 45) {
  const from = Math.max(0, issue.start - radius)
  const to = Math.min(text.length, issue.end + radius)
  const before = text.slice(from, issue.start).replace(/\s+/g, ' ')
  const after = text.slice(issue.end, to).replace(/\s+/g, ' ')
  const found = text.slice(issue.start, issue.end)
  return {
    found: `${from > 0 ? '…' : ''}${before}${found}${after}${to < text.length ? '…' : ''}`,
    fixed: `${from > 0 ? '…' : ''}${before}${issue.suggestion ?? found}${after}${to < text.length ? '…' : ''}`,
  }
}

function sentenceAround(text: string, issue: Issue) {
  const sentences = splitSentences(text)
  const s = sentences.find((x) => issue.start >= x.start && issue.start < x.end)
  if (!s) return snippet(text, issue, 60).found
  const seg = s.text.trim()
  let base = text.indexOf(seg)
  if (base < 0) base = s.start
  if (seg.length > 200) {
    const from = Math.max(0, issue.start - base - 80)
    const to = Math.min(seg.length, issue.end - base + 80)
    return { text: `${from > 0 ? '…' : ''}${seg.slice(from, to)}${to < seg.length ? '…' : ''}`, offset: base + from }
  }
  return { text: seg, offset: base }
}

function buildExercises(issues: Issue[], text: string): Exercise[] {
  const order = [...issues].sort((a, b) => {
    const w = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
    if (w !== 0) return w
    return a.start - b.start
  })
  const seen = new Set<string>()
  const exercises: Exercise[] = []

  for (const issue of order) {
    if (seen.has(issue.ruleId)) continue
    if (!issue.suggestion) continue
    seen.add(issue.ruleId)
    const sentence = sentenceAround(text, issue)
    if (typeof sentence === 'string') continue
    const relStart = issue.start - sentence.offset
    const relEnd = issue.end - sentence.offset
    if (relStart < 0 || relEnd > sentence.text.length) continue

    if (issue.category === 'spelling') {
      const options = [issue.suggestion, issue.found]
      const shuffled = Math.random() > 0.5 ? options : [options[1], options[0]]
      exercises.push({
        id: `ex-${issue.ruleId}-${issue.start}`,
        kind: 'choose',
        ruleTitle: issue.title,
        task: 'Выберите правильное написание',
        sentence: sentence.text.replace(issue.found, '______'),
        options: shuffled,
        answer: issue.suggestion,
        hint: issue.explanation,
      })
    } else {
      const masked = `${sentence.text.slice(0, relStart)}______${sentence.text.slice(relEnd)}`
      const fixed = `${sentence.text.slice(0, relStart)}${issue.suggestion}${sentence.text.slice(relEnd)}`
      exercises.push({
        id: `ex-${issue.ruleId}-${issue.start}`,
        kind: 'fix',
        ruleTitle: issue.title,
        task: 'Исправьте ошибку в предложении',
        sentence: masked,
        answer: fixed,
        hint: issue.explanation,
      })
    }
    if (exercises.length >= 6) break
  }
  return exercises
}

function buildStudentMessage(text: string, stats: ReturnType<typeof computeStats>, issues: Issue[], criteria: CriterionResult[], band: number, cefr: string, tt: ReturnType<typeof taskType>): string {
  const parts: string[] = []
  const min = tt.minWords
  const sizeNote =
    stats.words >= min
      ? `Объём в порядке: ${stats.words} слов при требуемых ${min}.`
      : `Объём меньше нужного: ${stats.words} слов вместо ${min}. Это первое, что стоит исправить.`
  parts.push(`Проверка работы: ${tt.short}. ${sizeNote}`)

  const best = [...criteria].sort((a, b) => b.score - a.score)[0]
  const worst = [...criteria].sort((a, b) => a.score - b.score)[0]
  parts.push(
    `Ориентировочная оценка — около ${band} (уровень ${cefr}). Сильная сторона: ${best.name.toLowerCase()}. Над чем работать в первую очередь: ${worst.name.toLowerCase()}.`,
  )

  const top = topRules(issues.filter((i) => i.severity === 'error'), 3)
  if (top.length) {
    const lines = top.map((r, idx) => {
      const ex = snippet(text, r.sample, 35)
      const count = r.count > 1 ? ` (повторяется ${r.count} ${plural(r.count, 'раз', 'раза', 'раз')})` : ''
      return `${idx + 1}. ${r.title}${count}.\n   В работе: ${ex.found}\n   Правильно: ${ex.fixed}`
    })
    parts.push(`Что исправить в первую очередь:\n${lines.join('\n')}`)
  } else {
    parts.push('Грубых ошибок нет — можно переходить к усложнению лексики и конструкций.')
  }

  const details: string[] = []
  const spell = issues.filter((i) => i.category === 'spelling').length
  if (spell) details.push(`орфография — ${spell} ${plural(spell, 'слово', 'слова', 'слов')}`)
  const punct = issues.filter((i) => i.category === 'punctuation').length
  if (punct) details.push(`пунктуация и заглавные буквы — ${punct}`)
  const rep = stats.repeatedWords.slice(0, 3)
  if (rep.length) details.push(`повторяющиеся слова: ${rep.map((w) => `${w.word} ×${w.count}`).join(', ')}`)
  if (details.length) parts.push(`Отдельно обрати внимание: ${details.join('; ')}.`)

  const toTrain: string[] = []
  for (const r of topRules(issues, 5)) toTrain.push(r.title)
  if (stats.basicWords.length >= 3) toTrain.push('синонимы к базовым словам (good, very, things)')
  if (parts.length && toTrain.length) {
    parts.push(`Что потренировать до следующей работы: ${toTrain.map((t) => t.toLowerCase()).join('; ')}.`)
  }

  if (band >= 7) parts.push('Хорошая работа! Осталось отшлифовать детали.')
  else if (band >= 5.5) parts.push('Хорошая база, но именно эти ошибки мешают выйти на следующий уровень. Разбери их — и оценка вырастет.')
  else parts.push('Не расстраивайся: ошибки однотипные, и их можно вычистить довольно быстро. Начни с трёх пунктов выше.')

  return parts.join('\n\n')
}

/* ------------------------------------------------------------------ */
/*  Главная функция                                                    */
/* ------------------------------------------------------------------ */

export function analyze(text: string, taskTypeId: TaskTypeId, personal: string[] = [], ignore: string[] = []): Analysis {
  const tt = taskType(taskTypeId)
  const stats = computeStats(text)
  const issues = runRules(text, tt.formality, personal).filter((i) => !ignore.includes(i.ruleId))

  const criteria: CriterionResult[] = [
    scoreTask(text, stats.words, tt, issues),
    scoreCoherence(stats, issues, tt),
    scoreLexis(stats, issues),
    scoreGrammar(stats, issues),
  ]

  const weights: Record<string, number> = { task: 0.2, coherence: 0.25, lexis: 0.25, grammar: 0.3 }
  const raw = criteria.reduce((sum, c) => sum + c.score * weights[c.id], 0)
  const band = stats.words < 30 ? 0 : Math.round(raw * 2) / 2
  const cefr = (CEFR_BY_BAND.find(([b]) => band >= b) ?? CEFR_BY_BAND[CEFR_BY_BAND.length - 1])[1]

  const categoryCounts = { spelling: 0, grammar: 0, lexis: 0, punctuation: 0, style: 0 } as Record<Category, number>
  for (const i of issues) categoryCounts[i.category]++

  const ruleMap = new Map<string, { ruleId: string; title: string; category: Category; count: number }>()
  for (const i of issues) {
    const cur = ruleMap.get(i.ruleId)
    if (cur) cur.count++
    else ruleMap.set(i.ruleId, { ruleId: i.ruleId, title: i.title, category: i.category, count: 1 })
  }
  const ruleFreq = [...ruleMap.values()].sort((a, b) => b.count - a.count)

  const exercises = buildExercises(issues, text)
  const paragraphs = splitParagraphs(text)
  const studentMessage = buildStudentMessage(text, stats, issues, criteria, band, cefr, tt)

  return {
    issues,
    stats,
    criteria,
    band,
    cefr,
    percent: Math.round((band / 9) * 100),
    categoryCounts,
    ruleFreq,
    exercises,
    studentMessage,
    byParagraph: paragraphs.map((p, index) => ({ index, start: p.start, end: p.end, words: text.slice(p.start, p.end).split(/\s+/).filter(Boolean).length })),
  }
}

export function applyFix(text: string, issue: Issue): string {
  if (!issue.suggestion) return text
  return text.slice(0, issue.start) + issue.suggestion + text.slice(issue.end)
}

export function applyAllFixes(text: string, issues: Issue[]): string {
  const sorted = [...issues].filter((i) => i.suggestion).sort((a, b) => b.start - a.start)
  let out = text
  for (const issue of sorted) {
    out = out.slice(0, issue.start) + issue.suggestion + out.slice(issue.end)
  }
  return out
}

export { CATEGORY_LABEL }
