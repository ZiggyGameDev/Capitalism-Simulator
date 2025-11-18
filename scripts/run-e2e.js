#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { getPlaywrightBrowserEnvironment } from '../tests/e2e/utils/browserEnv.js'

const browserEnv = getPlaywrightBrowserEnvironment()

if (!browserEnv.available) {
  console.warn(`⚠️ [Playwright] ${browserEnv.reason}`)
  process.exit(0)
}

const isWindows = process.platform === 'win32'
const executable = isWindows ? 'npx.cmd' : 'npx'
const child = spawn(executable, ['playwright', 'test'], {
  stdio: 'inherit',
  env: process.env
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
