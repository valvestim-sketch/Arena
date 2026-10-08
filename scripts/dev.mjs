/**
 * Запускает API совместного режима и dev-сервер одной командой: npm run dev
 * (если API уже слушает порт — просто поднимает веб-часть)
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'

const API_PORT = Number(process.env.API_PORT ?? 8787)

function isBusy(port) {
  return new Promise((resolve) => {
    const socket = createServer()
    socket.once('error', () => resolve(true))
    socket.once('listening', () => socket.close(() => resolve(false)))
    socket.listen(port, '0.0.0.0')
  })
}

function run(command, args, name, color) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false })
  const prefix = `\u001b[${color}m[${name}]\u001b[0m `
  const pipe = (stream) => {
    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) if (line.trim()) console.log(prefix + line)
    })
  }
  pipe(child.stdout)
  pipe(child.stderr)
  child.on('exit', (code) => {
    if (name === 'web' && code !== 0) process.exitCode = code ?? 0
  })
  return child
}

const children = []

if (await isBusy(API_PORT)) {
  console.log(`\u001b[33m[dev]\u001b[0m API уже запущен на порту ${API_PORT} — использую его`)
} else {
  children.push(run(process.execPath, ['server/index.mjs'], 'api', '35'))
}

children.push(run(process.execPath, ['node_modules/vite/bin/vite.js'], 'web', '36'))

function shutdown() {
  for (const child of children) child.kill('SIGTERM')
  setTimeout(() => process.exit(0), 300)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
