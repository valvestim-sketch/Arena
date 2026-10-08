import type { Category, Exercise } from '../types'
import { useState } from 'react'

interface Props {
  exercises: Exercise[]
  onCopy: (text: string) => void
}

function exerciseToText(e: Exercise, i: number) {
  const head = `${i + 1}. ${e.task}. Ошибка: ${e.ruleTitle}`
  if (e.kind === 'choose') {
    return `${head}\n   Выберите вариант: ${e.options?.join('  /  ')}\n   Ответ: ${e.answer}`
  }
  return `${head}\n   ${e.sentence}\n   Ответ: ${e.answer}`
}

export default function TrainerView({ exercises, onCopy }: Props) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ right: 0, done: 0 })

  if (!exercises.length) {
    return (
      <div className="empty">
        <h3>Упражнений нет</h3>
        В этой работе не нашлось ошибок, из которых можно собрать тренажёр. Так держать!
      </div>
    )
  }

  const current = exercises[Math.min(index, exercises.length - 1)]
  const finished = index >= exercises.length

  const allText = exercises.map(exerciseToText).join('\n\n')

  function next() {
    setIndex((i) => i + 1)
    setPicked(null)
    setRevealed(false)
  }

  function answer(value: string) {
    setPicked(value)
    setRevealed(true)
    setScore((s) => ({
      right: s.right + (value.trim().toLowerCase() === current.answer.trim().toLowerCase() ? 1 : 0),
      done: s.done + 1,
    }))
  }

  if (finished) {
    const percent = score.done ? Math.round((score.right / score.done) * 100) : 0
    return (
      <div className="exer">
        <div className="empty">
          <h3>Тренажёр пройден: {score.right} из {score.done}</h3>
          <p className="small">
            {percent >= 80
              ? 'Отличный результат — тема закрыта.'
              : 'Стоит вернуться к этим правилам на следующем уроке.'}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => { setIndex(0); setScore({ right: 0, done: 0 }); setPicked(null); setRevealed(false) }}>
            Пройти заново
          </button>
          <button className="btn btn-primary" onClick={() => onCopy(allText)}>
            Скопировать все упражнения
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="exer stack">
      <div className="row">
        <div className="progress">
          {exercises.map((e, i) => (
            <i key={e.id} className={i < index ? 'done' : i === index ? 'cur' : ''} />
          ))}
        </div>
        <div className="spacer" />
        <span className="small muted">
          {index + 1} из {exercises.length} · верно {score.right}/{score.done}
        </span>
        <button className="btn btn-sm" onClick={() => onCopy(allText)}>Скопировать все</button>
      </div>

      <div className="exer-card">
        <div className="row">
          <span className="pill">{current.task}</span>
          <span className="small muted">{current.ruleTitle}</span>
        </div>
        <p className="exer-q">{current.sentence}</p>

        {current.kind === 'choose' ? (
          <div className="exer-opts">
            {(current.options ?? []).map((opt) => {
              const isAnswer = opt.trim().toLowerCase() === current.answer.trim().toLowerCase()
              const cls = revealed ? (isAnswer ? 'good' : picked === opt ? 'bad' : '') : ''
              return (
                <button key={opt} className={`exer-opt ${cls}`} onClick={() => !revealed && answer(opt)}>
                  {opt}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="exer-opts">
            {!revealed ? (
              <button className="btn" onClick={() => { setRevealed(true); setPicked(null); setScore((s) => ({ ...s, done: s.done + 1 })) }}>
                Показать правильный вариант
              </button>
            ) : null}
          </div>
        )}

        {revealed ? (
          <>
            <div className="exer-answer">
              <b className="small">Правильный вариант:</b>
              <div>{current.answer}</div>
            </div>
            {current.kind === 'fix' ? (
              <div className="row" style={{ marginTop: 10 }}>
                <span className="small muted">Получилось без подсказки?</span>
                <button className="btn btn-sm" onClick={() => { setScore((s) => ({ ...s, right: s.right + 1 })); next() }}>Да</button>
                <button className="btn btn-sm" onClick={next}>Нет</button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="exer-hint">Подсказка: {current.hint}</p>
        )}

        {revealed ? <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={next}>Следующее упражнение</button> : null}
      </div>
    </div>
  )
}

export function categoryLabel(cat: Category) {
  return { spelling: 'Орфография', grammar: 'Грамматика', lexis: 'Лексика', punctuation: 'Пунктуация', style: 'Стиль' }[cat]
}
