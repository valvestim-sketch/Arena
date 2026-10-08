import type { SavedCheck, Student } from '../types'
import { plural } from '../lib/storage'

interface Props {
  view: 'check' | 'students' | 'assignments'
  setView: (v: 'check' | 'students' | 'assignments') => void
  students: Student[]
  checks: SavedCheck[]
  spellStatus: 'loading' | 'ready' | 'error'
  onPickStudent: (id: string) => void
  resultsCount: number
  apiState: 'loading' | 'ready' | 'offline'
}

export default function Sidebar({ view, setView, students, checks, spellStatus, onPickStudent, resultsCount, apiState }: Props) {
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
        <button className={view === 'assignments' ? 'active' : ''} onClick={() => setView('assignments')}>
          Задания ученикам
          {resultsCount ? <span className="badge">{resultsCount}</span> : null}
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
                className="side-link"
                title="Открыть проверку для этого ученика"
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
        <div className="status">
          <span className={`dot${apiState === 'ready' ? ' ok' : ''}`} />
          {apiState === 'ready'
            ? 'Задания ученикам: на связи'
            : apiState === 'loading'
              ? 'Проверяем сервер заданий…'
              : 'Сервер заданий выключен'}
        </div>
        <div className="side-label">Проверок: {checks.length}</div>
      </div>
    </aside>
  )
}
