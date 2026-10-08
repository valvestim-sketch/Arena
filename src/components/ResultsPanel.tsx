import { useEffect, useState } from 'react'
import type { Analysis, Issue } from '../types'
import { CATEGORY_NAME } from '../engine/analyze'
import TextReview, { CATEGORY_COLOR } from './TextReview'
import TrainerView from './TrainerView'
import { applyAllFixes } from '../engine/analyze'
import { exerciseLines } from '../lib/report'
import { plural } from '../lib/storage'

interface Props {
  analysis: Analysis
  text: string
  showFixes: boolean
  saved: boolean
  onApplyFix: (issue: Issue) => void
  onApplyAll: () => void
  onDismissRule: (ruleId: string) => void
  onCopy: (value: string) => void
  onDownload: () => void
  onSave: () => void
  hiddenRules: string[]
  onRestoreRules: () => void
  onToggleFixes: () => void
}

type Tab = 'issues' | 'report' | 'trainer'

export default function ResultsPanel(props: Props) {
  const { analysis, text, showFixes, saved } = props
  const [tab, setTab] = useState<Tab>('issues')
  const [active, setActive] = useState(0)
  const [report, setReport] = useState(analysis.studentMessage)
  const [editingReport, setEditingReport] = useState(false)

  useEffect(() => {
    setReport(analysis.studentMessage)
    setActive(0)
  }, [analysis])

  const issues = analysis.issues

  function select(index: number) {
    setActive(index)
    setTab('issues')
    const node = document.getElementById(`issue-${index}`)
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="score-head">
          <div className="band" style={{ ['--p' as string]: analysis.percent }}>
            <div className="band-inner">
              <div className="band-value">{analysis.band || '—'}</div>
              <div className="band-label">{analysis.cefr}</div>
            </div>
          </div>
          <div className="score-text">
            <h3>
              {analysis.issues.length} {plural(analysis.issues.length, 'замечание', 'замечания', 'замечаний')} ·{' '}
              {analysis.stats.words} {plural(analysis.stats.words, 'слово', 'слова', 'слов')}
            </h3>
            <p>
              Ориентировочная оценка: около {analysis.band} балла. Сильнее всего —{' '}
              {[...analysis.criteria].sort((a, b) => b.score - a.score)[0].name.toLowerCase()}, слабее —{' '}
              {[...analysis.criteria].sort((a, b) => a.score - b.score)[0].name.toLowerCase()}.
            </p>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-sm" onClick={props.onDownload}>Скачать отчёт</button>
              <button className="btn btn-sm" disabled={saved} onClick={props.onSave}>
                {saved ? 'Сохранено в карточку' : 'Сохранить в карточку ученика'}
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => window.print()} title="Отчёт целиком или только разбор">
                Печать / PDF
              </button>
            </div>
          </div>
        </div>

        {analysis.criteria.map((c) => (
          <div className="crit" key={c.id}>
            <div className="crit-top">
              <span className="crit-name">{c.name}</span>
              <span className="crit-score">{c.score}/9</span>
            </div>
            <div className="bar">
              <span style={{ width: `${(c.score / 9) * 100}%`, background: c.score >= 7 ? 'var(--ok)' : c.score >= 5.5 ? 'var(--accent)' : 'var(--warn)' }} />
            </div>
            <div className="crit-comment">{c.comment}</div>
            {c.strengths.length || c.weaknesses.length ? (
              <ul className="crit-details">
                {c.strengths.map((s, i) => (
                  <li className="plus" key={`s${i}`}>{s}</li>
                ))}
                {c.weaknesses.map((w, i) => (
                  <li className="minus" key={`w${i}`}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}

        <div className="metrics">
          <div className="metric">
            <span>Средняя длина предложения</span>
            <b>{analysis.stats.avgSentenceLength} слов</b>
          </div>
          <div className="metric">
            <span>Сложные конструкции</span>
            <b>{analysis.stats.advanced.length ? analysis.stats.advanced.slice(0, 2).join('; ') : 'почти нет'}</b>
          </div>
          <div className="metric">
            <span>Связки</span>
            <b>{analysis.stats.linkers.length ? analysis.stats.linkers.slice(0, 4).join(', ') : 'не найдены'}</b>
          </div>
          <div className="metric">
            <span>Повторы</span>
            <b>{analysis.stats.repeatedWords.length ? analysis.stats.repeatedWords.slice(0, 3).map((w) => `${w.word} ×${w.count}`).join(', ') : 'нет'}</b>
          </div>
          <div className="metric">
            <span>Абзацев / предложений</span>
            <b>{analysis.stats.paragraphs} / {analysis.stats.sentences}</b>
          </div>
        </div>

        <div className="counters">
          {(Object.keys(CATEGORY_NAME) as (keyof typeof CATEGORY_NAME)[]).map((cat) => (
            <div className="counter" key={cat}>
              <b style={{ color: CATEGORY_COLOR[cat] }}>{analysis.categoryCounts[cat]}</b>
              <span>{CATEGORY_NAME[cat]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          {showFixes ? 'Исправленный текст' : 'Текст ученика с разметкой'}
          <div className="spacer" />
          <button className="btn btn-sm no-print" onClick={props.onToggleFixes}>
            {showFixes ? 'Показать исходный текст' : 'Показать исправленный'}
          </button>
          <button className="btn btn-sm no-print" onClick={props.onApplyAll} disabled={!issues.some((i) => i.suggestion)}>
            Применить всё
          </button>
        </div>
        {showFixes ? (
          <div className="paper">{applyAllFixes(text, issues)}</div>
        ) : (
          <TextReview text={text} issues={issues} activeIndex={active} onSelect={select} />
        )}
        <div className="legend no-print">
          {(Object.keys(CATEGORY_NAME) as (keyof typeof CATEGORY_NAME)[]).map((cat) => (
            <span key={cat}>
              <i style={{ background: CATEGORY_COLOR[cat] }} />
              {CATEGORY_NAME[cat]}
            </span>
          ))}
          <span className="muted">клик по подчёркнутому слову — подробнее</span>
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <button className={tab === 'issues' ? 'active' : ''} onClick={() => setTab('issues')}>
            Замечания ({issues.length})
          </button>
          <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>
            Разбор для ученика
          </button>
          <button className={tab === 'trainer' ? 'active' : ''} onClick={() => setTab('trainer')}>
            Тренажёр ({analysis.exercises.length})
          </button>
        </div>

        {tab === 'issues' ? (
          <>
            {props.hiddenRules.length ? (
              <div style={{ padding: '10px 16px' }} className="row">
                <span className="small muted">
                  Скрыто правил: {props.hiddenRules.length}
                </span>
                <button className="btn btn-sm" onClick={props.onRestoreRules}>Вернуть все</button>
              </div>
            ) : null}
            <div className="issue-list">
              {issues.length === 0 ? (
                <div className="empty">
                  <h3>Замечаний нет</h3>
                  Текст чистый: движок не нашёл ни орфографических, ни грамматических проблем.
                </div>
              ) : (
                issues.map((issue, index) => (
                  <div
                    className={`issue${index === active ? ' active' : ''}`}
                    key={`${issue.ruleId}-${issue.start}`}
                    onClick={() => select(index)}
                  >
                    <div className="counter-chip">{index + 1}</div>
                    <div className="issue-main">
                      <div className="issue-title">
                        <span className={`sev-${issue.severity}`}>●</span>
                        {issue.title}
                        <span className={`pill cat-${issue.category}`}>{CATEGORY_NAME[issue.category]}</span>
                      </div>
                      <div className="issue-fix">
                        <span className="wrong">{issue.found}</span>
                        {issue.suggestion ? (
                          <>
                            <span className="muted">→</span>
                            <span className="right">{issue.suggestion}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="issue-explain">{issue.explanation}</div>
                      {issue.example ? <div className="issue-explain muted">Пример: {issue.example}</div> : null}
                      <div className="issue-actions" onClick={(e) => e.stopPropagation()}>
                        {issue.suggestion ? (
                          <button className="btn btn-sm" onClick={() => props.onApplyFix(issue)}>Исправить</button>
                        ) : null}
                        <button className="btn btn-sm btn-ghost" onClick={() => props.onCopy(`${issue.title}: «${issue.found}» → «${issue.suggestion}». ${issue.explanation}`)}>
                          Скопировать
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => props.onDismissRule(issue.ruleId)}>
                          Больше не показывать
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}

        {tab === 'report' ? (
          <>
            <div className="card-head" style={{ borderTop: 0 }}>
              Готовый текст для отправки ученику
              <div className="spacer" />
              <button className="btn btn-sm" onClick={() => setEditingReport((v) => !v)}>
                {editingReport ? 'Готово' : 'Редактировать'}
              </button>
              <button className="btn btn-sm" onClick={() => props.onCopy(report)}>Скопировать</button>
            </div>
            {editingReport ? (
              <textarea className="report-edit" value={report} onChange={(e) => setReport(e.target.value)} />
            ) : (
              <div className="report-body">{report}</div>
            )}
            <div className="legend">
              Можно подправить формулировки и отправить ученику в мессенджер — текст уже без технических деталей.
            </div>
          </>
        ) : null}

        {tab === 'trainer' ? <TrainerView exercises={analysis.exercises} onCopy={props.onCopy} /> : null}
      </div>
    </div>
  )
}

export function trainerClipboard(exercises: Analysis['exercises']) {
  return exerciseLines(exercises).join('\n\n')
}
