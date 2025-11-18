import { test, expect } from '@playwright/test'

const DESKTOP_VIEWPORT = { width: 1440, height: 900 }
const MOBILE_VIEWPORT = { width: 480, height: 900 }

test.describe('Dashboard layout + responsiveness', () => {
  test('keeps the interface pinned to a single viewport on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto('/')

    const { scrollHeight, viewportHeight } = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement
      const height = window.innerHeight
      const scroll = Math.max(body.scrollHeight, html.scrollHeight)
      return { scrollHeight: scroll, viewportHeight: height }
    })

    expect(scrollHeight).toBeLessThanOrEqual(viewportHeight + 4)
  })

  test('shows all three dashboard columns simultaneously on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto('/')
    await page.waitForSelector('.dashboard-column')

    const columns = await page.locator('.dashboard-column').all()
    expect(columns.length).toBe(3)

    for (const column of columns) {
      const box = await column.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThan(100)
      expect(box?.width ?? 0).toBeGreaterThan(150)
    }
  })

  test('each column handles its own scrolling to keep the body locked', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto('/')

    const overflowValues = await page.evaluate(() => {
      const columns = Array.from(document.querySelectorAll('.dashboard-column'))
      return columns.map(column => window.getComputedStyle(column).overflowY)
    })

    expect(overflowValues).toHaveLength(3)
    overflowValues.forEach(value => expect(value === 'auto' || value === 'overlay').toBeTruthy())
  })

  test('mobile view stacks the dashboard and exposes tab navigation', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/')

    const { tabDisplay, layoutMode } = await page.evaluate(() => {
      const nav = window.getComputedStyle(document.querySelector('.tab-navigation'))
      const dashboard = window.getComputedStyle(document.querySelector('.dashboard'))
      return { tabDisplay: nav.display, layoutMode: dashboard.flexDirection }
    })

    expect(tabDisplay).toBe('flex')
    expect(layoutMode).toBe('column')
  })

  test('activity simulations receive the new neon treatment for visibility', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto('/')
    const canvas = page.locator('.activity-simulation-canvas').first()
    await expect(canvas).toBeVisible()

    const styles = await canvas.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundImage: computed.backgroundImage,
        boxShadow: computed.boxShadow,
        borderRadius: computed.borderRadius
      }
    })

    expect(styles.backgroundImage).toContain('linear-gradient')
    expect(styles.boxShadow).not.toBe('none')
    expect(styles.borderRadius).toContain('16px')
  })
})
