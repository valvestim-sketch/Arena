import { useEffect, useMemo, useState } from 'react'
import type { Issue, SavedCheck, Student, TaskTypeId } from './types'
import { analyze, applyAllFixes, applyFix } from './engine/analyze'
import { addWords, initSpell, spellReady } from './engine/spell'
import { taskType } from './engine/taskTypes'
import { buildReportText } from './lib/report'
import { api, trainerLink, useAssignments } from './lib/api'
import { copyToClipboard, download, makeCheck, useChecks, usePersonalWords, useSettings, useStudents } from './lib/storage'
import Sidebar from './components/Sidebar'
import CheckView from './components/CheckView'
import StudentsView from './components/StudentsView'
import AssignmentsView from './components/AssignmentsView'
import StudentTrainer from './components/StudentTrainer'

type View = 'check' | 'students' | 'assignments'

type Route = { name: 'app' } | { name: 'train'; code: string }

function parseRoute(): Route {
  if (typeof window === 'undefined') return { name: 'app' }
  const match = window.location.hash.match(/^#\/train\/([A-Za-z0-9]{4,12})$/)
  return match ? { name: 'train', code: match[1].toUpperCase() } : { name: 'app' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute())
  const [view, setView] = useState<View>('check')
  const { students, update: setStudents } = useStudents()
  const { checks, update: setChecks } = useChecks()
  const { settings, save: saveSettings } = useSettings()
  const { words: personalWords, update: setPersonalWords } = usePersonalWords()
  const { assignments, state: apiState, refresh: refreshAssignments } = useAssignments(route.name === 'app')

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
    const onHashChange = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  async function createAssignment() {
    if (!analysis) throw new Error('Сначала проверьте работу')
    const created = await api.createAssignment({
      studentId: activeStudentId,
      studentName: student?.name ?? '',
      title: `Тренажёр: ${tt.short}${topic ? ` — ${topic.slice(0, 60)}` : ''}`,
      taskLabel: tt.short,
      topic,
      band: analysis.band,
      exercises: analysis.exercises,
    })
    await refreshAssignments()
    notify('Ссылка для ученика готова')
    return trainerLink(created.code)
  }

  async function removeAssignment(code: string) {
    await api.removeAssignment(code)
    await refreshAssignments()
    notify('Задание удалено')
  }

  // Ученик открыл ссылку тренажёра — показываем ему отдельный экран
  if (route.name === 'train') return <StudentTrainer code={route.code} />

  const resultsCount = assignments.filter((a) => a.submissions.length).length

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        students={students}
        checks={checks}
        spellStatus={spellStatus}
        onPickStudent={(id) => { setActiveStudentId(id); setView('check') }}
        resultsCount={resultsCount}
        apiState={apiState}
      />
      <main className="main">
        <div className="page-head no-print">
          <div>
            <h1 className="page-title">
              {view === 'check' ? 'Проверка письменной работы' : view === 'students' ? 'Ученики и прогресс' : 'Задания ученикам'}
            </h1>
            <div className="page-sub">
              {view === 'check'
                ? 'Вставьте текст — приложение найдёт ошибки, оценит работу по критериям и соберёт упражнения.'
                : view === 'students'
                  ? 'Ошибки, которые повторяются от работы к работе, и готовый план следующего урока.'
                  : 'Ссылки на тренажёры и результаты, которые выполнили ученики.'}
            </div>
          </div>
          <div className="row">
            {student ? <span className="pill">Ученик: {student.name}</span> : <span className="pill">Ученик не выбран</span>}
            <span className="pill">{tt.short}</span>
          </div>
        </div>

        {view === 'check' ? (
          <div id="results">
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
              onCreateAssignment={createAssignment}
            />
          </div>
        ) : view === 'students' ? (
          <StudentsView
            students={students}
            studentsUpdate={setStudents}
            checks={checks}
            checksUpdate={setChecks}
            onOpenCheck={openCheck}
            onStartCheckFor={startFor}
            onCopy={copy}
          />
        ) : (
          <AssignmentsView
            assignments={assignments}
            state={apiState}
            onRefresh={refreshAssignments}
            onCopy={copy}
            onRemove={removeAssignment}
          />
        )}
      </main>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
