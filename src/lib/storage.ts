import { useCallback, useState } from 'react'
import type { Category, Exercise, SavedCheck, Student, TaskTypeId } from '../types'

const KEY = {
  students: 'redpen.students.v1',
  checks: 'redpen.checks.v1',
  settings: 'redpen.settings.v1',
  words: 'redpen.words.v1',
}

export interface Settings {
  taskType: TaskTypeId
  topic: string
  activeStudentId: string
  dismissed: string[]
}

const DEFAULT_SETTINGS: Settings = { taskType: 'ielts2', topic: '', activeStudentId: '', dismissed: [] }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* хранилище недоступно — работаем в памяти */
  }
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(() => read<Student[]>(KEY.students, []))
  const update = useCallback((next: Student[]) => {
    write(KEY.students, next)
    setStudents(next)
  }, [])
  return { students, update }
}

export function useChecks() {
  const [checks, setChecks] = useState<SavedCheck[]>(() => read<SavedCheck[]>(KEY.checks, []))
  const update = useCallback((next: SavedCheck[]) => {
    write(KEY.checks, next)
    setChecks(next)
  }, [])
  return { checks, update }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => read<Settings>(KEY.settings, DEFAULT_SETTINGS))
  const save = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      write(KEY.settings, next)
      return next
    })
  }, [])
  return { settings, save }
}

export function usePersonalWords() {
  const [words, setWords] = useState<string[]>(() => read<string[]>(KEY.words, []))
  const update = useCallback((next: string[]) => {
    write(KEY.words, next)
    setWords(next)
  }, [])
  return { words, update }
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function emptyStudent(name: string, level = 'B1', goal = ''): Student {
  return { id: newId(), name, level, goal, note: '', createdAt: Date.now() }
}

export function makeCheck(params: {
  studentId: string
  taskType: TaskTypeId
  topic: string
  text: string
  band: number
  wordCount: number
  issues: number
  ruleFreq: SavedCheck['ruleFreq']
  categories: Record<Category, number>
  studentMessage: string
  exercises: Exercise[]
  criteria: SavedCheck['criteria']
  stats: SavedCheck['stats']
}): SavedCheck {
  return { id: newId(), createdAt: Date.now(), ...params }
}

export function download(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
