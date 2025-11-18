import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

function resolveCandidatePaths() {
  const candidates = []
  const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (envPath) {
    candidates.push(envPath)
  }

  try {
    const pkgPath = require.resolve('@playwright/test/package.json')
    const pkgDir = path.dirname(pkgPath)
    candidates.push(path.join(pkgDir, '.cache', 'ms-playwright'))
    candidates.push(path.join(pkgDir, '..', '.cache', 'ms-playwright'))
  } catch (err) {
    // ignore resolution errors; we'll fall back to other checks
  }

  return candidates
}

export function getPlaywrightBrowserEnvironment() {
  if (process.env.PLAYWRIGHT_SKIP_BROWSERS === '1') {
    return {
      available: false,
      location: null,
      reason: 'Playwright browsers disabled via PLAYWRIGHT_SKIP_BROWSERS=1'
    }
  }

  const candidates = resolveCandidatePaths()

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      if (fs.existsSync(candidate)) {
        const contents = fs.readdirSync(candidate)
        if (contents.length > 0) {
          return { available: true, location: candidate }
        }
      }
    } catch (err) {
      // ignore and try next candidate
    }
  }

  return {
    available: false,
    location: null,
    reason: 'Playwright browsers are not installed. Run "npx playwright install" to enable E2E specs.'
  }
}

export function skipWhenBrowsersMissing(test) {
  const info = getPlaywrightBrowserEnvironment()
  test.skip(!info.available, info.reason)
  return info
}
