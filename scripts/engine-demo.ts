/* Быстрый прогон движка проверки без браузера: npm run engine:demo */
import { readFileSync } from 'node:fs'
import { analyze } from '../src/engine/analyze'
import { initSpell } from '../src/engine/spell'
import { SAMPLES } from '../src/data/samples'

const dictPath = (process.env.DICT_DIR ?? 'public/dict/').replace(/\/?$/, '/')
const realFetch = globalThis.fetch
// @ts-expect-error — подменяем fetch, чтобы словарь читался с диска
globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url)
  const file = u.slice(u.lastIndexOf('/') + 1)
  if (u.includes('/dict/')) {
    return new Response(readFileSync(dictPath + file, 'utf8'))
  }
  return realFetch(url as never, init)
}

const only = process.argv[2]

await initSpell()

for (const sample of SAMPLES) {
  if (only && sample.id !== only) continue
  const t0 = Date.now()
  const res = analyze(sample.text, sample.taskType)
  const ms = Date.now() - t0
  console.log('='.repeat(78))
  console.log(`${sample.title}  |  слов: ${res.stats.words}  |  band ${res.band} (${res.cefr})  |  ${ms} мс`)
  console.log('критерии:', res.criteria.map((c) => `${c.name}=${c.score}`).join('  '))
  console.log('категории:', JSON.stringify(res.categoryCounts))
  console.log('статистика:', JSON.stringify({
    avgSentenceLength: res.stats.avgSentenceLength,
    diversity: Math.round((res.stats.uniqueContent / Math.max(res.stats.contentTokens, 1)) * 100) / 100,
    avgWordLength: res.stats.avgWordLength,
    linkers: res.stats.linkers,
    advanced: res.stats.advanced,
    repeated: res.stats.repeatedWords,
    basic: res.stats.basicWords,
  }))
  console.log('-'.repeat(78))
  for (const i of res.issues) {
    const frag = sample.text.slice(i.start, i.end).replace(/\n/g, ' ')
    console.log(`[${i.severity.padEnd(7)}] ${i.category.padEnd(11)} ${i.title.padEnd(46)} «${frag}» → «${i.suggestion ?? '—'}»`)
  }
  console.log('-'.repeat(78))
  console.log('УПРАЖНЕНИЯ:', res.exercises.length)
  for (const e of res.exercises) console.log(` • ${e.kind}: ${e.sentence}  =>  ${e.answer}`)
  console.log('-'.repeat(78))
  console.log(res.studentMessage)
}
