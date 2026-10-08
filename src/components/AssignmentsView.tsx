import { useState } from 'react'
import type { Assignment } from '../types'
import type { ApiState } from '../lib/api'
import { trainerLink } from '../lib/api'
import { formatDate, plural } from '../lib/storage'

interface Props {
  assignments: Assignment[]
  state: ApiState
  onRefresh: () => void
  onCopy: (value: string) => void
  onRemove: (code: string) => void
}

function percent(right: number, total: number) {
  return Math.round((right / Math.max(total, 1)) * 100)
}

export default function AssignmentsView({ assignments, state, onRefresh, onCopy, onRemove }: Props) {
  const [open, setOpen] = useState<string>('')
  const withResults = assignments.filter((a) => a.submissions.length)

  if (state === 'offline') {
    return (
      <div className="card card-pad stack">
        <div className="notice">
          <div>
            <b>Сервер совместного режима не запущен</b>
            <div className="small" style={{ marginTop: 4 }}>
              Задания и ссылки для учеников работают через локальный API. Запустите приложение командой <code>npm run dev</code> —
              она поднимает и интерфейс, и API. Если вы уже открыли только веб-часть (<code>npm run dev:web</code>), добавьте
              в соседнем терминале <code>npm run server</code> и нажмите «Обновить».
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-sm btn-primary" onClick={onRefresh}>Обновить</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="row">
          <div style={{ flex: 1 }}>
            <b>Тренажёры для учеников</b>
            <div className="small muted" style={{ marginTop: 4 }}>
              Отправьте ученику ссылку — он откроет её на телефоне, выполнит упражнения и сразу увидит объяснения.
              Результат появится здесь автоматически. Всего заданий: {assignments.length}, выполнено: {withResults.length}.
            </div>
          </div>
          <button className="btn btn-sm" onClick={onRefresh}>Обновить</button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="card empty">
          <h3>Пока нет заданий</h3>
          <p className="small" style={{ maxWidth: 520, margin: '8px auto 0' }}>
            Проверьте письменную работу, откройте вкладку «Тренажёр» и нажмите «Отправить ученику». Упражнения соберутся
            из реальных ошибок этой работы.
          </p>
        </div>
      ) : null}

      {assignments.map((a) => {
        const link = trainerLink(a.code)
        const last = a.lastSubmission ?? a.submissions[a.submissions.length - 1] ?? null
        const shown = a.submissions.length ? a.submissions[a.submissions.length - 1] : null
        const isOpen = open === a.code
        return (
          <div className="card" key={a.code}>
            <div className="card-pad">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <b>{a.title}</b>
                    {a.submissions.length ? (
                      <span className="pill cat-grammar">выполнено {a.submissions.length} {plural(a.submissions.length, 'раз', 'раза', 'раз')}</span>
                    ) : (
                      <span className="pill">ждёт ученика</span>
                    )}
                  </div>
                  <div className="small muted" style={{ marginTop: 5 }}>
                    {a.studentName ? `Ученик: ${a.studentName} · ` : ''}
                    {a.taskLabel} · {a.exercises.length} {plural(a.exercises.length, 'упражнение', 'упражнения', 'упражнений')} ·
                    создано {formatDate(a.createdAt)}
                    {a.band ? ` · работа на ${a.band} балла` : ''}
                  </div>
                </div>
                {last ? (
                  <div className="history-band" title="Лучший результат">
                    {percent(Math.max(...a.submissions.map((s) => s.right)), a.exercises.length)}%
                  </div>
                ) : null}
              </div>

              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-sm btn-primary" onClick={() => onCopy(link)}>Скопировать ссылку</button>
                <button className="btn btn-sm" onClick={() => window.open(link, '_blank', 'noopener')}>Открыть</button>
                <button className="btn btn-sm" onClick={() => setOpen(isOpen ? '' : a.code)}>
                  {isOpen ? 'Скрыть детали' : 'Детали'}
                </button>
                <div className="spacer" />
                <span className="small muted mono">{link}</span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    if (confirm('Удалить задание и все ответы по нему?')) onRemove(a.code)
                  }}
                >
                  Удалить
                </button>
              </div>

              {last ? (
                <div className="small" style={{ marginTop: 10 }}>
                  Последний результат: <b>{last.studentName || 'ученик'}</b> — {last.right} из {last.total} верно ({percent(last.right, last.total)}%),
                  отправлен {new Date(last.finishedAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {percent(last.right, last.total) < 60 ? ' · стоит вернуться к этим правилам на уроке' : ''}
                </div>
              ) : null}
            </div>

            {isOpen ? (
              <div className="card-pad" style={{ borderTop: '1px solid var(--line-2)' }}>
                <div className="stack" style={{ gap: 10 }}>
                  {a.exercises.map((exercise, i) => {
                    const answer = shown?.answers.find((x) => x.id === exercise.id)
                    return (
                      <div key={exercise.id} className="exer-card" style={{ background: '#fff' }}>
                        <div className="row">
                          <span className="counter-chip">{i + 1}</span>
                          <span className="small muted">{exercise.ruleTitle}</span>
                          <div className="spacer" />
                          {answer ? (
                            <span className={`pill ${answer.correct ? 'cat-punctuation' : 'cat-spelling'}`}>
                              {answer.correct ? 'верно' : 'ошибка'}
                            </span>
                          ) : (
                            <span className="pill">нет ответа</span>
                          )}
                        </div>
                        <p className="exer-q">{exercise.sentence}</p>
                        {answer?.given && !answer.correct ? (
                          <div className="small">
                            Ответ ученика: <span className="wrong">{answer.given}</span> · правильно:{' '}
                            <span className="right">{exercise.answer}</span>
                          </div>
                        ) : null}
                        {answer?.correct ? <div className="small muted">Правильно: {exercise.answer}</div> : null}
                        {!answer && !shown ? <div className="small muted">Правильный ответ: {exercise.answer}</div> : null}
                      </div>
                    )
                  })}
                </div>
                {a.submissions.length > 1 ? (
                  <div className="small muted" style={{ marginTop: 12 }}>
                    Все попытки:{' '}
                    {a.submissions
                      .map((s) => `${formatDate(s.finishedAt)} — ${percent(s.right, s.total)}%`)
                      .join(' · ')}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
