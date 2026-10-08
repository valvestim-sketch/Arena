import type { SavedCheck, Student } from '../types'
import { plural } from '../lib/storage'

interface Props {
  view: 'check' | 'students'
  setView: (v: 'check' | 'students') => void
  students: Student[]
  checks: SavedCheck[]
  spellStatus: 'loading' | 'ready' | 'error'
  onPickStudent: (id: string) => void
}

export default function Sidebar({ view, setView, students, checks, spellStatus, onPickStudent }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">✎</div>
        <div>
          <div className="brand-name">RedPen</div>
          <div className="brand-sub">ассистент учителя английского</div>
        </div>
      </div>

      <nav className="nav">
        <button className={view === 'check' ? 'active' : ''} onClick={() => setView('check')}>
          Проверка работ
        </button>
        <button className={view === 'students' ? 'active' : ''} onClick={() => setView('students')}>
          Ученики
          <span className="badge">{students.length}</span>
        </button>
      </nav>

      {students.length ? (
        <div className="side-study">
          <div className="side-label">Быстрый переход</div>
          {students.slice(0, 5).map((s) => {
            const count = checks.filter((c) => c.studentId === s.id).length
            return (
              <button
                key={s.id}
                className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'flex-start', color: '#c3c8d0' }}
                onClick={() => onPickStudent(s.id)}
              >
                {s.name}
                <span className="muted small">{count ? `${count} ${plural(count, 'проверка', 'проверки', 'проверок')}` : 'нет проверок'}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="sidebar-foot">
        <div className="status">
          <span className={`dot${spellStatus === 'ready' ? ' ok' : ''}`} />
          {spellStatus === 'ready' ? 'Словарь английского загружен' : spellStatus === 'loading' ? 'Загружаем словарь…' : 'Словарь недоступен'}
        </div>
        <div className="status">
          <span className="dot ok" />
          Данные хранятся в браузере
        </div>
        <div className="side-label">Проверок: {checks.length}</div>
      </div>
    </aside>
  )
}
