import { useEffect, useMemo, useRef, useState } from 'react'
import type { Assignment, SubmissionAnswer } from '../types'
import { api } from '../lib/api'
import { expectedGap, judge, type Verdict } from '../lib/answerCheck'

export default function StudentTrainer({ code }: { code: string }) {
  const [status, setStatus] = useState<'loading' | 'notfound' | 'offline' | 'ready'>('loading')
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [name, setName] = useState('')
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ verdict: Verdict; given: string | null } | null>(null)
  const [answers, setAnswers] = useState<SubmissionAnswer[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ right: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const startedAt = useRef(Date.now())

  useEffect(() => {
    api
      .getAssignment(code)
      .then(({ assignment: loaded }) => {
        setAssignment(loaded)
        setName(loaded.studentName ?? '')
        setStatus('ready')
      })
      .catch((e: Error) => setStatus(e.message.includes('не найдено') ? 'notfound' : 'offline'))
  }, [code])

  const exercise = assignment?.exercises[index] ?? null
  const total = assignment?.exercises.length ?? 0
  const gap = useMemo(() => {
    if (!exercise) return ''
    // в заданиях с выбором правильный ответ — просто нужное слово
    return exercise.kind === 'choose' ? exercise.answer.trim() : expectedGap(exercise.sentence, exercise.answer)
  }, [exercise])

  function check(value: string) {
    if (!exercise || result) return
    const given = value.trim()
    if (!given) return
    const verdict: Verdict = judge(given, gap, exercise.answer)
    const correct = verdict !== 'wrong'
    setResult({ verdict, given })
    setAnswers((prev) => [
      ...prev.filter((a) => a.id !== exercise.id),
      { id: exercise.id, given, correct },
    ])
  }

  function next() {
    setResult(null)
    setInput('')
    setIndex((i) => i + 1)
  }

  async function finish(withAnswers = answers) {
    if (!assignment) return
    setSending(true)
    try {
      const response = await api.submit(assignment.code, {
        studentName: name.trim() || assignment.studentName || 'Ученик',
        answers: withAnswers,
        startedAt: startedAt.current,
      })
      setSent({ right: response.right, total: response.total })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  /* ------------------------------ экраны ------------------------------ */

  if (status === 'loading') {
    return (
      <div className="student-shell">
        <div className="student-card empty">Загружаем тренажёр…</div>
      </div>
    )
  }

  if (status === 'notfound' || status === 'offline') {
    return (
      <div className="student-shell">
        <div className="student-card">
          <div className="empty">
            <h3>{status === 'notfound' ? 'Тренажёр не найден' : 'Нет связи с учителем'}</h3>
            <p className="small">
              {status === 'notfound'
                ? 'Ссылка устарела или задание удалено. Попросите учителя отправить новую ссылку.'
                : 'Не удалось связаться с сервером. Проверьте интернет и обновите страницу.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!assignment) return null

  if (sent) {
    const percent = Math.round((sent.right / Math.max(sent.total, 1)) * 100)
    return (
      <div className="student-shell">
        <div className="student-card student-done">
          <div className="student-emoji">{percent >= 80 ? '🎉' : percent >= 50 ? '👍' : '💪'}</div>
          <h2>Результат отправлен учителю</h2>
          <p className="student-score">
            {sent.right} из {sent.total} верно · {percent}%
          </p>
          <p className="small muted">
            Спасибо, {name || 'друг'}! Учитель увидит результат и разберёт ошибки на уроке.
          </p>
          <button
            className="btn"
            onClick={() => {
              setSent(null)
              setAnswers([])
              setIndex(0)
              setInput('')
              setResult(null)
              startedAt.current = Date.now()
            }}
          >
            Пройти ещё раз
          </button>
        </div>
      </div>
    )
  }

  if (!exercise) {
    const right = answers.filter((a) => a.correct).length
    return (
      <div className="student-shell">
        <div className="student-card">
          <div className="empty">
            <h3>Тренажёр пройден</h3>
            <p className="small">{right} из {total} верно. Отправьте результат учителю.</p>
          </div>
          {error ? <div className="notice" style={{ margin: '0 18px 12px' }}>{error}</div> : null}
          <div className="row" style={{ justifyContent: 'center', paddingBottom: 18 }}>
            <button className="btn btn-primary" disabled={sending} onClick={() => finish()}>
              {sending ? 'Отправляем…' : 'Отправить результат учителю'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progress = Math.round((index / Math.max(total, 1)) * 100)
  const gapAnswer = `______`

  return (
    <div className="student-shell">
      <div className="student-card">
        <div className="student-head">
          <div>
            <div className="student-title">{assignment.title}</div>
            <div className="small muted">
              {assignment.taskLabel}
              {assignment.topic ? ` · ${assignment.topic}` : ''}
            </div>
          </div>
          <div className="small muted">
            {index + 1} / {total}
          </div>
        </div>
        <div className="bar" style={{ margin: '0 18px' }}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="student-body">
          {index === 0 && !result ? (
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="small muted">Как тебя зовут?</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя"
                style={{ maxWidth: 220 }}
              />
            </div>
          ) : null}
          <div className="row">
            <span className="pill">{exercise.task}</span>
            <span className="small muted">{exercise.ruleTitle}</span>
          </div>

          <p className="exer-q">
            {exercise.kind === 'fix' && exercise.sentence.includes(gapAnswer)
              ? exercise.sentence.split(gapAnswer).map((part, i, all) => (
                  <span key={i}>
                    {part}
                    {i < all.length - 1 ? <span className="gap">_____</span> : null}
                  </span>
                ))
              : exercise.sentence}
          </p>

          {!result ? (
            exercise.kind === 'choose' ? (
              <div className="exer-opts">
                {(exercise.options ?? []).map((option) => (
                  <button key={option} className="exer-opt" onClick={() => check(option)}>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="row" style={{ alignItems: 'stretch' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Впишите пропущенное"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && check(input)}
                  style={{ flex: 1, minWidth: 180 }}
                />
                <button className="btn btn-primary" onClick={() => check(input)} disabled={!input.trim()}>
                  Проверить
                </button>
              </div>
            )
          ) : (
            <>
              <div className={`student-verdict ${result.verdict === 'wrong' ? 'bad' : 'good'}`}>
                {result.verdict === 'correct' && '✓ Верно!'}
                {result.verdict === 'typo' && '✓ Почти верно — только опечатка'}
                {result.verdict === 'wrong' && `✗ Правильный ответ: ${gap}`}
              </div>
              <div className="exer-hint">{exercise.hint}</div>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={next}>
                {index + 1 < total ? 'Следующее задание' : 'Завершить тренажёр'}
              </button>
            </>
          )}

          {!result ? (
            <div className="row" style={{ marginTop: 14 }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setResult({ verdict: 'wrong', given: null })
                  setAnswers((prev) => [...prev.filter((a) => a.id !== exercise.id), { id: exercise.id, given: null, correct: false }])
                }}
              >
                Не знаю
              </button>
            </div>
          ) : null}
        </div>

        <div className="student-foot small muted">
          Отвечайте без спешки: после каждого ответа появится объяснение.
          <br />
          Учитель увидит, сколько заданий вы сделали верно.
        </div>
      </div>
    </div>
  )
}

