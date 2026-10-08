/* Проверка, что интерфейс рендерится без ошибок: npm run smoke */
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import App from '../src/App'
import CheckView from '../src/components/CheckView'
import ResultsPanel from '../src/components/ResultsPanel'
import StudentsView from '../src/components/StudentsView'
import TrainerView from '../src/components/TrainerView'
import Sidebar from '../src/components/Sidebar'
import { analyze } from '../src/engine/analyze'
import { SAMPLES } from '../src/data/samples'
import { makeCheck } from '../src/lib/storage'
import type { Student } from '../src/types'

const sample = SAMPLES[0]
const analysis = analyze(sample.text, sample.taskType)
const student: Student = { id: 's1', name: 'Иван', level: 'B1', goal: 'ЕГЭ', note: 'готовится с марта', createdAt: Date.now() }
const check = makeCheck({
  studentId: 's1',
  taskType: sample.taskType,
  topic: sample.topic,
  text: sample.text,
  band: analysis.band,
  wordCount: analysis.stats.words,
  issues: analysis.issues.length,
  ruleFreq: analysis.ruleFreq,
  categories: analysis.categoryCounts,
  studentMessage: analysis.studentMessage,
  exercises: analysis.exercises,
  criteria: analysis.criteria,
  stats: analysis.stats,
})

const noop = () => {}
const cases: [string, () => string][] = [
  ['App', () => renderToString(createElement(App))],
  [
    'CheckView (пусто)',
    () =>
      renderToString(
        createElement(CheckView, {
          analysis: null, analysisText: '', checked: false, students: [student], studentsUpdate: noop,
          text: '', setText: noop, taskTypeId: 'ielts2' as const, setTaskType: noop, topic: '', setTopic: noop,
          activeStudentId: 's1', setActiveStudentId: noop, personalWords: ['Vanya'], setPersonalWords: noop,
          dismissed: [], setDismissed: noop, spelled: 1, onCheck: noop, onApplyFix: noop, onApplyAll: noop,
          onCopy: noop, onDownload: noop, onSave: noop, saved: false, showFixes: false, setShowFixes: noop,
          spellStatus: 'ready', onOpenStudents: noop, notify: noop,
        }),
      ),
  ],
  [
    'ResultsPanel',
    () =>
      renderToString(
        createElement(ResultsPanel, {
          analysis, text: sample.text, showFixes: false, saved: false, onApplyFix: noop, onApplyAll: noop,
          onDismissRule: noop, onCopy: noop, onDownload: noop, onSave: noop, hiddenRules: [], onRestoreRules: noop,
          onToggleFixes: noop,
        }),
      ),
  ],
  ['TrainerView', () => renderToString(createElement(TrainerView, { exercises: analysis.exercises, onCopy: noop }))],
  [
    'StudentsView',
    () =>
      renderToString(
        createElement(StudentsView, {
          students: [student], studentsUpdate: noop, checks: [check], checksUpdate: noop,
          onOpenCheck: noop, onStartCheckFor: noop, onCopy: noop,
        }),
      ),
  ],
  [
    'Sidebar',
    () => renderToString(createElement(Sidebar, { view: 'check', setView: noop, students: [student], checks: [check], spellStatus: 'ready', onPickStudent: noop })),
  ],
]

let failed = 0
for (const [name, render] of cases) {
  try {
    const html = render()
    console.log(`✓ ${name} — ${html.length} символов разметки`)
  } catch (error) {
    failed++
    console.error(`✗ ${name}:`, error)
  }
}
console.log(failed ? `\nОшибок: ${failed}` : '\nВсе экраны рендерятся без ошибок')
process.exit(failed ? 1 : 0)
