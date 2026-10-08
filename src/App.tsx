import { useEffect, useMemo, useState } from 'react'
import type { Issue, SavedCheck, Student, TaskTypeId } from './types'
import { analyze, applyAllFixes, applyFix } from './engine/analyze'
import { addWords, initSpell, spellReady } from './engine/spell'
import { taskType } from './engine/taskTypes'
import { buildReportText } from './lib/report'
import { copyToClipboard, download, makeCheck, useChecks, usePersonalWords, useSettings, useStudents } from './lib/storage'
import Sidebar from './components/Sidebar'
import CheckView from './components/CheckView'
import StudentsView from './components/StudentsView'

type View = 'check' | 'students'

export default function App() {
  const [view, setView] = useState<View>('check')
  const { students, update: setStudents } = useStudents()
  const { checks, update: setChecks } = useChecks()
  const { settings, save: saveSettings } = useSettings()
  const { words: personalWords, update: setPersonalWords } = usePersonalWords()

  const [text, setText] = useState('')
  const [topic, setTopic] = useState(settings.topic)
  const [taskTypeId, setTaskTypeId] = useState<TaskTypeId>(settings.taskType)
  const [activeStudentId, setActiveStudentId] = useState(settings.activeStudentId)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [checked, setChecked] = useState<{ text: string; taskType: TaskTypeId } | null>(null)
  const [showFixes, setShowFixes] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [spellStatus, setSpellStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    initSpell().then(() => setSpellStatus('ready')).catch(() => setSpellStatus('error'))
  }, [])

  useEffect(() => {
    if (spellStatus === 'ready' && personalWords.length) addWords(personalWords)
  }, [spellStatus, personalWords])

  useEffect(() => {
    saveSettings({ taskType: taskTypeId, topic, activeStudentId })
  }, [taskTypeId, topic, activeStudentId, saveSettings])

  const analysis = useMemo(() => {
    if (!checked) return null
    return analyze(checked.text, checked.taskType, spellReady() ? personalWords : [], dismissed)
  }, [checked, personalWords, dismissed])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  function runCheck() {
    if (!text.trim()) return
    setDismissed([])
    setSaved(false)
    setShowFixes(false)
    setChecked({ text, taskType: taskTypeId })
    window.setTimeout(() => {
      const panel = document.getElementById('results')
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  function copy(value: string) {
    copyToClipboard(value).then((ok) => notify(ok ? 'Скопировано' : 'Не удалось скопировать'))
  }

  const student = students.find((s) => s.id === activeStudentId)
  const tt = taskType(taskTypeId)

  function reportText(target = analysis) {
    if (!target) return ''
    return buildReportText(target, checked?.text ?? text, {
      studentName: student?.name ?? '',
      taskLabel: tt.label,
      topic,
      date: new Date().toLocaleDateString('ru-RU'),
    })
  }

  function saveCheck() {
    if (!analysis || !checked) return
    const check = makeCheck({
      studentId: activeStudentId,
      taskType: checked.taskType,
      topic,
      text: checked.text,
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
    setChecks([...checks, check])
    setSaved(true)
    notify(student ? `Сохранено в карточку: ${student.name}` : 'Сохранено (без привязки к ученику)')
  }

  function openCheck(check: SavedCheck) {
    setText(check.text)
    setTopic(check.topic)
    setTaskTypeId(check.taskType)
    setActiveStudentId(check.studentId)
    setDismissed([])
    setChecked({ text: check.text, taskType: check.taskType })
    setSaved(true)
    setShowFixes(false)
    setView('check')
  }

  function startFor(studentId: string) {
    setActiveStudentId(studentId)
    setText('')
    setTopic('')
    setChecked(null)
    setDismissed([])
    setSaved(false)
    setView('check')
  }

  function applyOne(issue: Issue) {
    if (!checked) return
    const next = applyFix(checked.text, issue)
    setText(next)
    setChecked({ text: next, taskType: checked.taskType })
    notify('Исправление внесено в текст')
  }

  function applyEverything() {
    if (!checked || !analysis) return
    const next = applyAllFixes(checked.text, analysis.issues)
    setText(next)
    setChecked({ text: next, taskType: checked.taskType })
    notify('Все исправления внесены — текст можно проверить заново')
  }

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        students={students}
        checks={checks}
        spellStatus={spellStatus}
        onPickStudent={(id) => { setActiveStudentId(id); setView('check') }}
      />
      <main className="main">
        <div className="page-head no-print">
          <div>
            <h1 className="page-title">
              {view === 'check' ? 'Проверка письменной работы' : 'Ученики и прогресс'}
            </h1>
            <div className="page-sub">
              {view === 'check'
                ? 'Вставьте текст — приложение найдёт ошибки, оценит работу по критериям и соберёт упражнения.'
                : 'Ошибки, которые повторяются от работы к работе, и готовый план следующего урока.'}
            </div>
          </div>
          <div className="row">
            {student ? <span className="pill">Ученик: {student.name}</span> : <span className="pill">Ученик не выбран</span>}
            <span className="pill">{tt.short}</span>
          </div>
        </div>

        {view === 'check' ? (
          <div id="results-anchor">
            <CheckView
              analysis={analysis}
              analysisText={checked?.text ?? ''}
              checked={Boolean(checked)}
              students={students}
              studentsUpdate={setStudents as (s: Student[]) => void}
              text={text}
              setText={setText}
              taskTypeId={taskTypeId}
              setTaskType={setTaskTypeId}
              topic={topic}
              setTopic={setTopic}
              activeStudentId={activeStudentId}
              setActiveStudentId={setActiveStudentId}
              personalWords={personalWords}
              setPersonalWords={setPersonalWords}
              dismissed={dismissed}
              setDismissed={setDismissed}
              spelled={personalWords.length}
              onCheck={runCheck}
              onApplyFix={applyOne}
              onApplyAll={applyEverything}
              onCopy={copy}
              onDownload={() => {
                const name = (student?.name ?? 'rabota').replace(/\s+/g, '-').toLowerCase()
                download(`проверка-${name}-${new Date().toISOString().slice(0, 10)}.txt`, reportText())
                notify('Отчёт сохранён в файл')
              }}
              onSave={saveCheck}
              saved={saved}
              showFixes={showFixes}
              setShowFixes={setShowFixes}
              spellStatus={spellStatus}
              onOpenStudents={() => setView('students')}
              notify={notify}
            />
          </div>
        ) : (
          <StudentsView
            students={students}
            studentsUpdate={setStudents}
            checks={checks}
            checksUpdate={setChecks}
            onOpenCheck={openCheck}
            onStartCheckFor={startFor}
            onCopy={copy}
          />
        )}
      </main>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
