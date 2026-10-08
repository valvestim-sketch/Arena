import type { Analysis, Exercise, Issue } from '../types'
import { applyAllFixes } from '../engine/analyze'

export function exerciseLines(exercises: Exercise[]) {
  return exercises.map((e, i) => {
    const head = `${i + 1}. ${e.task} (${e.ruleTitle})`
    if (e.kind === 'choose') return `${head}\n   ${e.sentence}\n   Варианты: ${(e.options ?? []).join(' / ')}\n   Ответ: ${e.answer}`
    return `${head}\n   ${e.sentence}\n   Ответ: ${e.answer}`
  })
}

export function issueLines(issues: Issue[]) {
  return issues.map((i, n) => {
    const fix = i.suggestion ? ` → ${i.suggestion}` : ''
    return `${n + 1}. [${i.category}] ${i.title}\n   «${i.found}»${fix}\n   ${i.explanation}`
  })
}

export interface ReportMeta {
  studentName: string
  taskLabel: string
  topic: string
  date?: string
}

export function buildReportText(analysis: Analysis, text: string, meta: ReportMeta) {
  const { criteria, stats, band, cefr, issues } = analysis
  const lines: string[] = []
  lines.push(`ПРОВЕРКА ПИСЬМЕННОЙ РАБОТЫ`)
  lines.push(`Ученик: ${meta.studentName || '—'}`)
  lines.push(`Формат: ${meta.taskLabel}`)
  if (meta.topic) lines.push(`Тема: ${meta.topic}`)
  if (meta.date) lines.push(`Дата: ${meta.date}`)
  lines.push('')
  lines.push(`ИТОГ: около ${band} балла (уровень ${cefr}), объём ${stats.words} слов, найдено ${issues.length} замечаний.`)
  lines.push('')
  lines.push('ОЦЕНКА ПО КРИТЕРИЯМ')
  for (const c of criteria) {
    lines.push(`• ${c.name} — ${c.score}/9. ${c.comment}`)
    for (const s of c.strengths) lines.push(`   + ${s}`)
    for (const w of c.weaknesses) lines.push(`   ! ${w}`)
  }
  lines.push('')
  lines.push('ЗАМЕЧАНИЯ ПО ТЕКСТУ')
  lines.push(...(issueLines(issues).length ? issueLines(issues) : ['Грубых замечаний нет.']))
  lines.push('')
  lines.push('ИСПРАВЛЕННЫЙ ВАРИАНТ')
  lines.push(applyAllFixes(text, issues))
  if (analysis.exercises.length) {
    lines.push('')
    lines.push('УПРАЖНЕНИЯ НА ЭТИ ОШИБКИ')
    lines.push(...exerciseLines(analysis.exercises))
  }
  lines.push('')
  lines.push('РАЗБОР ДЛЯ УЧЕНИКА')
  lines.push(analysis.studentMessage)
  return lines.join('\n')
}
