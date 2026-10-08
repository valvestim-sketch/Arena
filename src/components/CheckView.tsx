import { useMemo, useState } from 'react'
import type { Analysis, Issue, Student, TaskTypeId } from '../types'
import { TASK_TYPES, taskType } from '../engine/taskTypes'
import { SAMPLES } from '../data/samples'
import { emptyStudent, plural } from '../lib/storage'
import ResultsPanel from './ResultsPanel'

interface Props {
  analysis: Analysis | null
  analysisText: string
  checked: boolean
  students: Student[]
  studentsUpdate: (s: Student[]) => void
  text: string
  setText: (t: string) => void
  taskTypeId: TaskTypeId
  setTaskType: (t: TaskTypeId) => void
  topic: string
  setTopic: (t: string) => void
  activeStudentId: string
  setActiveStudentId: (id: string) => void
  personalWords: string[]
  setPersonalWords: (w: string[]) => void
  dismissed: string[]
  setDismissed: (d: string[]) => void
  spelled: number
  onCheck: () => void
  onApplyFix: (issue: Issue) => void
  onApplyAll: () => void
  onCopy: (v: string) => void
  onDownload: () => void
  onSave: () => void
  saved: boolean
  showFixes: boolean
  setShowFixes: (v: boolean) => void
  spellStatus: 'loading' | 'ready' | 'error'
  onOpenStudents: () => void
  notify: (message: string) => void
}

export default function CheckView(props: Props) {
  const { text, analysis } = props
  const tt = taskType(props.taskTypeId)
  const [newStudent, setNewStudent] = useState('')
  const [wordInput, setWordInput] = useState('')
  const [done, setDone] = useState<Record<number, boolean>>({})

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text])
  const student = props.students.find((s) => s.id === props.activeStudentId)

  const lengthHint =
    words === 0
      ? `Требуется ${tt.minWords}${tt.maxWords ? `–${tt.maxWords}` : '+'} слов`
      : words < tt.minWords
        ? `Мало слов: ${words} из ${tt.minWords} минимум`
        : tt.maxWords && words > tt.maxWords
          ? `Много слов: ${words}, максимум ${tt.maxWords}`
          : `Объём в норме: ${words} слов`

  function createStudent() {
    const name = newStudent.trim()
    if (!name) return
    const created = emptyStudent(name)
    props.studentsUpdate([...props.students, created])
    props.setActiveStudentId(created.id)
    setNewStudent('')
    props.notify(`Ученик «${name}» добавлен`)
  }

  function loadSample(id: string) {
    const sample = SAMPLES.find((s) => s.id === id)
    if (!sample) return
    props.setText(sample.text)
    props.setTaskType(sample.taskType)
    props.setTopic(sample.topic)
    setDone({})
  }

  function addWord() {
    const value = wordInput.trim().toLowerCase()
    if (!value) return
    if (!props.personalWords.includes(value)) props.setPersonalWords([...props.personalWords, value])
    setWordInput('')
  }

  return (
    <div className="grid-2">
      <div className="stack">
        <div className="card card-pad stack">
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ minWidth: 200, flex: 1 }}>
              <label>Ученик</label>
              <select value={props.activeStudentId} onChange={(e) => props.setActiveStudentId(e.target.value)}>
                <option value="">Без привязки к ученику</option>
                {props.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.level ? `· ${s.level}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 220, flex: 1 }}>
              <label>Формат работы</label>
              <select value={props.taskTypeId} onChange={(e) => { props.setTaskType(e.target.value as TaskTypeId); setDone({}) }}>
                {TASK_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {props.students.length === 0 ? (
            <div className="notice">
              <div>
                <b>Добавьте первого ученика</b>
                <div className="small" style={{ marginTop: 4 }}>
                  Тогда история проверок, повторяющиеся ошибки и план следующего урока будут собираться автоматически.
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Имя ученика"
                    value={newStudent}
                    onChange={(e) => setNewStudent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createStudent()}
                    style={{ maxWidth: 220 }}
                  />
                  <button className="btn btn-sm btn-primary" onClick={createStudent}>Добавить</button>
                  <button className="btn btn-sm btn-ghost" onClick={props.onOpenStudents}>Все ученики</button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="field">
            <label>Тема работы</label>
            <input
              type="text"
              placeholder="Например: advantages and disadvantages of online learning"
              value={props.topic}
              onChange={(e) => props.setTopic(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="row">
              <label style={{ flex: 1 }}>Текст ученика</label>
              <span className="small muted">{lengthHint}</span>
            </div>
            <textarea
              className="paper-input"
              placeholder="Вставьте текст письменной работы. Проверка идёт за секунды: орфография, грамматика, лексика, пунктуация, структура."
              value={text}
              onChange={(e) => props.setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') props.onCheck()
              }}
            />
          </div>

          <div className="row">
            <button className="btn btn-primary" onClick={props.onCheck} disabled={!text.trim()}>
              Проверить работу
            </button>
            <span className="small muted">Ctrl + Enter</span>
            <div className="spacer" />
            <select
              value=""
              onChange={(e) => loadSample(e.target.value)}
              style={{ width: 'auto' }}
              title="Загрузить пример работы"
            >
              <option value="">Пример работы…</option>
              {SAMPLES.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <button className="btn" onClick={() => { props.setText(''); props.setDismissed([]); setDone({}) }}>Очистить</button>
          </div>

          {props.spellStatus !== 'ready' ? (
            <div className="small muted">
              {props.spellStatus === 'loading'
                ? 'Загружаем словарь английского языка (один раз, ~550 КБ)…'
                : props.spellStatus === 'error'
                  ? 'Словарь не загрузился — орфография проверяться не будет, остальные проверки работают.'
                  : ''}
            </div>
          ) : props.spelled ? (
            <div className="small muted">Слов в личном словаре: {props.spelled}</div>
          ) : null}
        </div>

        <div className="card">
          <div className="card-head">Что проверяет формат · {tt.short}</div>
          <div className="card-pad stack">
            <ul className="crit-details">
              {tt.requirements.map((r) => (
                <li className="plus" key={r}>{r}</li>
              ))}
            </ul>
            <div className="small muted">Отметьте вручную то, что видно только человеку:</div>
            <div className="stack" style={{ gap: 7 }}>
              {tt.checklist.map((item, i) => (
                <label key={item} className="row small" style={{ gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(done[i])}
                    onChange={(e) => setDone({ ...done, [i]: e.target.checked })}
                  />
                  <span style={{ textDecoration: done[i] ? 'line-through' : 'none', color: done[i] ? 'var(--ink-3)' : 'inherit' }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
            {student ? (
              <div className="small muted">
                Ученик: {student.name} · уровень {student.level || '—'} {student.goal ? `· цель: ${student.goal}` : ''}
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            Личный словарь
            <div className="spacer" />
            <span className="muted small">{props.personalWords.length} {plural(props.personalWords.length, 'слово', 'слова', 'слов')}</span>
          </div>
          <div className="card-pad stack">
            <div className="small muted">
              Имена, названия городов и компаний, которые движок не должен считать ошибкой.
            </div>
            <div className="row">
              <input
                type="text"
                placeholder="например: Vanya, Sberbank, Chelny"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWord()}
              />
              <button className="btn" onClick={addWord}>Добавить</button>
            </div>
            {props.personalWords.length ? (
              <div className="row">
                {props.personalWords.map((w) => (
                  <button
                    key={w}
                    className="pill"
                    title="Убрать слово"
                    onClick={() => props.setPersonalWords(props.personalWords.filter((x) => x !== w))}
                  >
                    {w} ✕
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        {analysis && props.checked ? (
          <>
            {text !== props.analysisText ? (
              <div className="notice no-print" style={{ marginBottom: 14 }}>
                <div>
                  Текст изменился после проверки — разбор ниже относится к предыдущей версии.
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn btn-sm btn-primary" onClick={props.onCheck}>Проверить заново</button>
                  </div>
                </div>
              </div>
            ) : null}
            <ResultsPanel
            analysis={analysis}
            text={props.analysisText}
            showFixes={props.showFixes}
            saved={props.saved}
            onApplyFix={props.onApplyFix}
            onApplyAll={props.onApplyAll}
            onDismissRule={(ruleId) => props.setDismissed([...props.dismissed, ruleId])}
            onCopy={props.onCopy}
            onDownload={props.onDownload}
            onSave={props.onSave}
            hiddenRules={props.dismissed}
            onRestoreRules={() => props.setDismissed([])}
            onToggleFixes={() => props.setShowFixes(!props.showFixes)}
          />
          </>
        ) : (
          <div className="card empty">
            <h3>Здесь появится разбор работы</h3>
            <p className="small" style={{ maxWidth: 460, margin: '8px auto 0' }}>
              Вставьте текст и нажмите «Проверить работу». Движок отметит ошибки прямо в тексте, оценит работу по четырём
              критериям, соберёт упражнения на эти ошибки и напишет разбор, который можно сразу отправить ученику.
            </p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
              <button className="btn" onClick={() => loadSample('weak-essay')}>Посмотреть на примере</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
