import { useCallback, useEffect, useState } from 'react'
import type { Assignment, Exercise, SubmissionAnswer } from '../types'

/** Клиент API совместного режима. Все запросы относительные: их проксирует dev-сервер. */
const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }
  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error ?? `Ошибка сети (${response.status})`
    throw new Error(message)
  }
  return payload as T
}

export interface CreateAssignmentPayload {
  studentId: string
  studentName: string
  title: string
  taskLabel: string
  topic: string
  band: number
  exercises: Exercise[]
}

export const api = {
  createAssignment: (payload: CreateAssignmentPayload) =>
    request<{ code: string }>('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  listAssignments: () => request<{ assignments: Assignment[] }>('/assignments'),
  getAssignment: (code: string) => request<{ assignment: Assignment }>(`/assignments/${encodeURIComponent(code)}`),
  submit: (code: string, payload: { studentName: string; answers: SubmissionAnswer[]; startedAt: number }) =>
    request<{ ok: boolean; right: number; total: number }>(`/assignments/${encodeURIComponent(code)}/submissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeAssignment: (code: string) => request<{ ok: boolean }>(`/assignments/${encodeURIComponent(code)}`, { method: 'DELETE' }),
}

/** Ссылка, которую учитель отправляет ученику. */
export function trainerLink(code: string) {
  if (typeof window === 'undefined') return `#/train/${code}`
  return `${window.location.origin}${window.location.pathname}#/train/${code}`
}

export type ApiState = 'loading' | 'ready' | 'offline'

export function useAssignments(enabled = true) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [state, setState] = useState<ApiState>('loading')

  const refresh = useCallback(async () => {
    try {
      const result = await api.listAssignments()
      setAssignments(result.assignments)
      setState('ready')
    } catch {
      setState('offline')
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const timer = setInterval(refresh, 15000)
    return () => clearInterval(timer)
  }, [refresh, enabled])

  return { assignments, state, refresh }
}
