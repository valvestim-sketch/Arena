import { useMemo, useState } from 'react'
import type { Category, SavedCheck, Student } from '../types'
import { CATEGORY_NAME } from '../engine/analyze'
import { TASK_BY_ID } from '../engine/taskTypes'
import { download, emptyStudent, formatDate, plural } from '../lib/storage'

interface Props {
  students: Student[]
  studentsUpdate: (s: Student[]) => void
  checks: SavedCheck[]
  checksUpdate: (c: SavedCheck[]) => void
  onOpenCheck: (check: SavedCheck) => void
  onStartCheckFor: (studentId: string) => void
  onCopy: (v: string) => void
}

const LEVELS = ['A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+']

export default function StudentsView(props: Props) {
  const { students, checks } = props
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? '')
  const [name, setName] = useState('')
  const [level, setLevel] = useState('B1')
  const [goal, setGoal] = useState('')

  const selected = students.find((s) => s.id === selectedId) ?? students[0]

  const studentChecks = useMemo(
    () => checks.filter((c) => c.studentId === selected?.id).sort((a, b) => b.createdAt - a.createdAt),
    [checks, selected],
  )

  const aggregated = useMemo(() => {
    const map = new Map<string, { title: string; category: Category; count: number }>()
    for (const check of studentChecks) {
      for (const r of check.ruleFreq) {
        const cur = map.get(r.ruleId)
        if (cur) cur.count += r.count
        else map.set(r.ruleId, { title: r.title, category: r.category, count: r.count })
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [studentChecks])

  const avgBand = studentChecks.length
    ? Math.round((studentChecks.reduce((s, c) => s + c.band, 0) / studentChecks.length) * 10) / 10
    : 0

  function addStudent() {
    const trimmed = name.trim()
    if (!trimmed) return
    const created = { ...emptyStudent(trimmed, level, goal.trim()), note: '' }
    props.studentsUpdate([...students, created])
    setSelectedId(created.id)
    setName('')
    setGoal('')
  }

  function patchStudent(id: string, patch: Partial<Student>) {
    props.studentsUpdate(students.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeStudent(id: string) {
    const target = students.find((s) => s.id === id)
    if (!target) return
    if (!confirm(`Удалить ученика «${target.name}» и все его проверки? Действие необратимо.`)) return
    props.studentsUpdate(students.filter((s) => s.id !== id))
    props.checksUpdate(checks.filter((c) => c.studentId !== id))
    setSelectedId('')
  }

  function lessonPlan() {
    if (!selected) return ''
    const lines: string[] = []
    lines.push(`ПЛАН СЛЕДУЮЩЕГО УРОКА · ${selected.name}`)
    if (selected.goal) lines.push(`Цель ученика: ${selected.goal}`)
    lines.push(`Проверок в истории: ${studentChecks.length}, средняя оценка: ${avgBand || '—'}`)
    lines.push('')
    lines.push('1. Повторение (10 минут)')
    const top = aggregated.slice(0, 4)
    top.forEach((r, i) => lines.push(`   ${i + 1}) ${r.title} — ошибка встречалась ${r.count} ${plural(r.count, 'раз', 'раза', 'раз')} (${CATEGORY_NAME[r.category]})`))
    const last = studentChecks[0]
    const exercises = last?.exercises.filter((e) => top.some((t) => e.ruleTitle === t.title)) ?? []
    if (exercises.length) {
      lines.push('')
      lines.push('2. Разминка на эти правила (10 минут)')
      exercises.slice(0, 4).forEach((e, i) => lines.push(`   ${i + 1}) ${e.sentence} → ${e.answer}`))
    }
    lines.push('')
    lines.push('3. Практика (20 минут)')
    lines.push(`   Мини-задание: написать ${(TASK_BY_ID.get(last?.taskType ?? 'free')?.short ?? 'текст').toLowerCase()} объёмом ${last?.wordCount ? Math.round((last.wordCount || 120) * 0.6) : 120} слов на тему «${last?.topic || 'свободная тема'}».`)
    lines.push('')
    lines.push('4. В конце урока')
    lines.push('   Проверить текст в приложении и сравнить список ошибок с прошлым разом.')
    if (aggregated.length > 4) {
      lines.push('')
      lines.push(`Дополнительно в работе: ${aggregated.slice(4, 8).map((r) => r.title).join('; ')}.`)
    }
    return lines.join('\n')
  }

  return (
    <div className="grid-2">
      <div className="stack">
        <div className="card">
          <div className="card-head">Новый ученик</div>
          <div className="card-pad stack">
            <div className="field">
              <label>Имя</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Иван" />
            </div>
            <div className="row">
              <div className="field" style={{ width: 130 }}>
                <label>Уровень</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Цель</label>
                <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="ЕГЭ / IELTS 7.0 / разговорный" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={addStudent} disabled={!name.trim()}>Добавить ученика</button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            Ученики
            <div className="spacer" />
            <span className="muted small">{students.length}</span>
          </div>
          <div className="card-pad stack" style={{ gap: 4 }}>
            {students.length === 0 ? (
              <div className="empty small">Пока никого нет. Добавьте первого ученика — и история проверок начнёт собираться сама.</div>
            ) : (
              students.map((s) => {
                const list = checks.filter((c) => c.studentId === s.id)
                const last = list.sort((a, b) => b.createdAt - a.createdAt)[0]
                return (
                  <div
                    key={s.id}
                    className={`student-row${s.id === selected?.id ? ' active' : ''}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div className="avatar">{s.name.slice(0, 1).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="student-name">{s.name}</div>
                      <div className="student-meta">
                        {s.level || '—'} · {list.length} {plural(list.length, 'проверка', 'проверки', 'проверок')}
                        {last ? ` · последняя ${formatDate(last.createdAt)}` : ''}
                      </div>
                    </div>
                    {last ? <span className="pill">{last.band}</span> : null}
                  </div>
                )
              })
            )}
          </div>
          <div className="legend">
            <button className="btn btn-sm" disabled={!checks.length} onClick={() => download('redpen-backup.json', JSON.stringify({ students, checks }, null, 2), 'application/json')}>
              Скачать все данные (JSON)
            </button>
          </div>
        </div>

        <div className="card card-pad">
          <div className="small muted">
            Все данные хранятся только в этом браузере: ничего не отправляется на сервер, работы учеников остаются у вас.
          </div>
        </div>
      </div>

      <div className="stack">
        {!selected ? (
          <div className="card empty">
            <h3>Карточка ученика</h3>
            Добавьте ученика, чтобы видеть его ошибки от работы к работе.
          </div>
        ) : (
          <>
            <div className="card card-pad stack">
              <div className="row">
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 18 }}>{selected.name.slice(0, 1).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div className="student-name" style={{ fontSize: 17 }}>{selected.name}</div>
                  <div className="student-meta">
                    {studentChecks.length} {plural(studentChecks.length, 'проверка', 'проверки', 'проверок')} · средняя оценка {avgBand || '—'}
                    {studentChecks[0] ? ` · последняя ${formatDate(studentChecks[0].createdAt)}` : ''}
                  </div>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => props.onStartCheckFor(selected.id)}>Проверить работу</button>
                <button className="btn btn-sm btn-danger" onClick={() => removeStudent(selected.id)}>Удалить</button>
              </div>
              <div className="row">
                <div className="field" style={{ width: 130 }}>
                  <label>Уровень</label>
                  <select value={selected.level} onChange={(e) => patchStudent(selected.id, { level: e.target.value })}>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Цель</label>
                  <input type="text" value={selected.goal} onChange={(e) => patchStudent(selected.id, { goal: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Заметки</label>
                <textarea
                  rows={2}
                  placeholder="Что проходили, что задали, о чём договорились"
                  value={selected.note}
                  onChange={(e) => patchStudent(selected.id, { note: e.target.value })}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                Что повторить на следующем уроке
                <div className="spacer" />
                <button className="btn btn-sm" disabled={!aggregated.length} onClick={() => props.onCopy(lessonPlan())}>Скопировать план</button>
              </div>
              <div className="card-pad stack">
                {aggregated.length === 0 ? (
                  <div className="small muted">
                    Пока нет сохранённых проверок. Проверьте первую работу и нажмите «Сохранить в карточку ученика».
                  </div>
                ) : (
                  <>
                    <ol className="plan-list">
                      {aggregated.slice(0, 5).map((r) => (
                        <li key={r.title}>
                          <b>{r.title}</b> <span className="muted small">· {CATEGORY_NAME[r.category]} · {r.count} {plural(r.count, 'раз', 'раза', 'раз')}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="small muted">
                      Эти ошибки повторяются от работы к работе — именно их стоит вынести в начало урока.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                История проверок
                <div className="spacer" />
                <span className="muted small">{studentChecks.length}</span>
              </div>
              <div className="card-pad stack" style={{ gap: 8 }}>
                {studentChecks.length === 0 ? (
                  <div className="small muted">Проверок пока нет.</div>
                ) : (
                  studentChecks.map((c) => (
                    <div className="history-item" key={c.id} onClick={() => props.onOpenCheck(c)}>
                      <div className="history-band">{c.band}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="student-name">
                          {TASK_BY_ID.get(c.taskType)?.short ?? 'Работа'} · {formatDate(c.createdAt)}
                        </div>
                        <div className="student-meta">
                          {c.topic || 'без темы'} · {c.wordCount} {plural(c.wordCount, 'слово', 'слова', 'слов')} · {c.issues}{' '}
                          {plural(c.issues, 'замечание', 'замечания', 'замечаний')}
                        </div>
                      </div>
                      <span className="small muted">открыть →</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
