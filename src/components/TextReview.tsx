import type { Analysis, Category, Issue } from '../types'
import { CATEGORY_NAME } from '../engine/analyze'

export const CATEGORY_COLOR: Record<Category, string> = {
  spelling: 'var(--spelling)',
  grammar: 'var(--grammar)',
  lexis: 'var(--lexis)',
  punctuation: 'var(--punctuation)',
  style: 'var(--style)',
}

interface Props {
  text: string
  issues: Issue[]
  activeIndex: number
  onSelect: (index: number) => void
  showFixPreview?: boolean
}

export default function TextReview({ text, issues, activeIndex, onSelect }: Props) {
  const parts: React.ReactNode[] = []
  let pos = 0
  issues.forEach((issue, index) => {
    if (issue.start < pos) return
    if (issue.start > pos) parts.push(text.slice(pos, issue.start))
    const active = index === activeIndex
    parts.push(
      <mark
        key={`${issue.ruleId}-${issue.start}`}
        id={`issue-${index}`}
        className={`cat-${issue.category}${active ? ' active' : ''}`}
        title={`${issue.title}${issue.suggestion ? ` → ${issue.suggestion}` : ''}`}
        onClick={() => onSelect(index)}
      >
        {text.slice(issue.start, issue.end)}
      </mark>,
    )
    pos = issue.end
  })
  parts.push(text.slice(pos))

  return <div className="paper">{parts}</div>
}

export function CategoryBadge({ category, count }: { category: Category; count: number }) {
  return (
    <span className={`pill cat-${category}`}>
      {CATEGORY_NAME[category]} · {count}
    </span>
  )
}

export function ScoreBadge({ analysis }: { analysis: Analysis }) {
  const { band, cefr, percent } = analysis
  return (
    <div className="band" style={{ ['--p' as string]: percent }}>
      <div className="band-inner">
        <div className="band-value">{band || '—'}</div>
        <div className="band-label">{cefr}</div>
      </div>
    </div>
  )
}
