/** Сравнение ответа ученика с правильным: прощаем регистр, пунктуацию, апострофы и 1-2 опечатки. */

export function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[«»"“”]/g, '')
    .replace(/[.,!?;:()\-—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

/** Что именно нужно вписать в пропуск: достаём из маски «______» и правильного ответа. */
export function expectedGap(sentence: string, answer: string) {
  const [before, after] = sentence.split('______')
  if (before === undefined || after === undefined) return answer.trim()
  const found = before ? answer.indexOf(before) : 0
  const start = found >= 0 ? found + before.length : 0
  const end = after ? answer.lastIndexOf(after) : answer.length
  const core = answer.slice(start, end > start ? end : answer.length)
  return (core || answer).trim()
}

export type Verdict = 'correct' | 'typo' | 'wrong'

export function judge(given: string, gap: string, fullAnswer: string): Verdict {
  const g = normalize(given)
  const target = normalize(gap)
  const full = normalize(fullAnswer)
  if (!g) return 'wrong'
  if (g === target || g === full) return 'correct'
  const nearTarget = target.length > 4 && levenshtein(g, target) <= 1
  const nearFull = full.length > 8 && levenshtein(g, full) <= 2
  // опечатка в коротком ответе: одна буква на слово длиной от 4 символов
  const nearShort = target.length > 6 && levenshtein(g, target) <= 2
  return nearTarget || nearFull || nearShort ? 'typo' : 'wrong'
}
