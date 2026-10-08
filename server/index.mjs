/**
 * RedPen — сервер совместного режима.
 * Хранит задания-тренажёры, которые учитель отдаёт ученику по ссылке,
 * и ответы учеников. Без внешних зависимостей, данные — в server/data/store.json
 *
 * Запуск: npm run server   (обычно поднимается вместе с dev-сервером через npm run dev)
 */
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '0.0.0.0'
const ROOT = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(ROOT, 'data', 'store.json')
const MAX_BODY = 1_500_000 // 1.5 МБ на запрос
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** @typedef {{id: string, kind: 'fix'|'choose', ruleTitle: string, task: string, sentence: string, options?: string[], answer: string, hint: string}} Exercise */
/** @typedef {{id: string, studentName: string, answers: {id: string, given: string|null, correct: boolean}[], right: number, total: number, startedAt: number, finishedAt: number}} Submission */
/** @typedef {{code: string, studentName: string, studentId: string, title: string, taskLabel: string, topic: string, band: number, createdAt: number, exercises: Exercise[], submissions: Submission[]}} Assignment */

function emptyStore() {
  return { assignments: /** @type {Assignment[]} */ ([]) }
}

function load() {
  try {
    if (!existsSync(DATA_FILE)) return emptyStore()
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    if (!parsed || !Array.isArray(parsed.assignments)) return emptyStore()
    return parsed
  } catch (error) {
    console.error('[redpen] не удалось прочитать базу, начинаем с пустой:', error.message)
    return emptyStore()
  }
}

let store = load()
let writeTimer = null

function persist() {
  // пишем не чаще раза в 200 мс и всегда атомарно
  if (writeTimer) return
  writeTimer = setTimeout(() => {
    writeTimer = null
    try {
      mkdirSync(dirname(DATA_FILE), { recursive: true })
      const tmp = `${DATA_FILE}.tmp`
      writeFileSync(tmp, JSON.stringify(store, null, 2))
      renameSync(tmp, DATA_FILE)
    } catch (error) {
      console.error('[redpen] ошибка записи базы:', error.message)
    }
  }, 200)
}

function makeCode() {
  let code = ''
  do {
    const bytes = randomBytes(6)
    code = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
  } while (store.assignments.some((a) => a.code === code))
  return code
}

function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('invalid json'))
      }
    })
    req.on('error', reject)
  })
}

const publicAssignment = (a) => ({
  code: a.code,
  studentName: a.studentName,
  title: a.title,
  topic: a.topic,
  taskLabel: a.taskLabel,
  createdAt: a.createdAt,
  exercises: a.exercises,
  submissions: a.submissions.length,
  best: a.submissions.length ? Math.max(...a.submissions.map((s) => Math.round((s.right / Math.max(s.total, 1)) * 100))) : null,
})

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (req.method === 'OPTIONS') return send(res, 204, {})

  try {
    if (path === '/api/health') return send(res, 200, { ok: true, assignments: store.assignments.length })

    // --- создание задания учителем
    if (path === '/api/assignments' && req.method === 'POST') {
      const body = await readBody(req)
      const exercises = Array.isArray(body.exercises) ? body.exercises : []
      if (!exercises.length) return send(res, 400, { error: 'нет упражнений' })
      const assignment = {
        code: makeCode(),
        studentId: String(body.studentId ?? ''),
        studentName: String(body.studentName ?? '').slice(0, 80),
        title: String(body.title ?? 'Тренажёр по английскому').slice(0, 160),
        taskLabel: String(body.taskLabel ?? '').slice(0, 80),
        topic: String(body.topic ?? '').slice(0, 160),
        band: Number(body.band ?? 0),
        createdAt: Date.now(),
        exercises: exercises.slice(0, 30).map((e, i) => ({
          id: String(e.id ?? `ex-${i}`),
          kind: e.kind === 'choose' ? 'choose' : 'fix',
          ruleTitle: String(e.ruleTitle ?? '').slice(0, 200),
          task: String(e.task ?? '').slice(0, 200),
          sentence: String(e.sentence ?? '').slice(0, 600),
          options: Array.isArray(e.options) ? e.options.slice(0, 6).map((o) => String(o).slice(0, 200)) : undefined,
          answer: String(e.answer ?? '').slice(0, 600),
          hint: String(e.hint ?? '').slice(0, 900),
        })),
        submissions: [],
      }
      store.assignments.push(assignment)
      persist()
      return send(res, 200, { code: assignment.code, url: `/index.html#/train/${assignment.code}` })
    }

    // --- список заданий для учителя
    if (path === '/api/assignments' && req.method === 'GET') {
      const list = [...store.assignments]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((a) => ({
          ...a,
          lastSubmission: a.submissions[a.submissions.length - 1] ?? null,
          best: a.submissions.length ? Math.max(...a.submissions.map((s) => Math.round((s.right / Math.max(s.total, 1)) * 100))) : null,
        }))
      return send(res, 200, { assignments: list })
    }

    const match = path.match(/^\/api\/assignments\/([A-Z0-9]{4,10})(\/submissions)?$/)
    if (match) {
      const code = match[1]
      const assignment = store.assignments.find((a) => a.code === code)
      if (!assignment) return send(res, 404, { error: 'Задание не найдено. Проверьте ссылку.' })

      // --- ученик открывает задание
      if (!match[2] && req.method === 'GET') return send(res, 200, { assignment: publicAssignment(assignment) })

      // --- ученик сдаёт результат
      if (match[2] && req.method === 'POST') {
        const body = await readBody(req)
        const answers = Array.isArray(body.answers) ? body.answers : []
        if (!answers.length) return send(res, 400, { error: 'нет ответов' })
        const byId = new Map(assignment.exercises.map((e) => [e.id, e]))
        const checked = answers
          .filter((a) => byId.has(String(a.id)))
          .map((a) => {
            const exercise = byId.get(String(a.id))
            const given = a.given === null || a.given === undefined ? null : String(a.given).slice(0, 600)
            const correct = Boolean(a.correct) && Boolean(exercise)
            return { id: String(a.id), given, correct }
          })
        const submission = {
          id: randomBytes(6).toString('hex'),
          studentName: String(body.studentName ?? assignment.studentName ?? '').slice(0, 80),
          answers: checked,
          right: checked.filter((c) => c.correct).length,
          total: assignment.exercises.length,
          startedAt: Number(body.startedAt ?? 0) || Date.now(),
          finishedAt: Date.now(),
        }
        assignment.submissions.push(submission)
        persist()
        return send(res, 200, { ok: true, right: submission.right, total: submission.total })
      }

      // --- учитель удаляет задание
      if (!match[2] && req.method === 'DELETE') {
        store.assignments = store.assignments.filter((a) => a.code !== code)
        persist()
        return send(res, 200, { ok: true })
      }
    }

    return send(res, 404, { error: 'not found' })
  } catch (error) {
    return send(res, error.message === 'payload too large' ? 413 : 400, { error: error.message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[redpen] API совместного режима: http://${HOST}:${PORT}  (заданий в базе: ${store.assignments.length})`)
})
