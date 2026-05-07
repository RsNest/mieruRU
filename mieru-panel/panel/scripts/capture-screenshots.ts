import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'

const OUTPUT_DIR = path.resolve(process.cwd(), '../../docs/screenshots/pr3')
const BASE_URL = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:18080'
const MODE = process.env.CAPTURE_MODE ?? 'all'
const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const USERNAME = process.env.PANEL_ADMIN_USER ?? 'admin'
const PASSWORD = process.env.PANEL_ADMIN_PASS ?? 'admin'
const DATE = new Date().toISOString().slice(0, 10)

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' })
  const usernameInput = await page.$('#username')
  if (!usernameInput) return
  await page.type('#username', USERNAME)
  await page.type('#password', PASSWORD)
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')])
}

async function setMidnightTheme(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('mieru-panel-theme', 'midnight')
    document.documentElement.setAttribute('data-theme', 'midnight')
  })
  await page.reload({ waitUntil: 'networkidle2' })
}

async function captureLegacy(browser: Browser) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await login(page)
  await setMidnightTheme(page)
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' })
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'legacy-users.png'), fullPage: true })
  await page.close()
}

async function captureV2(browser: Browser) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await login(page)
  await setMidnightTheme(page)

  await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle2' })
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'v2-users-midnight.png'), fullPage: true })

  await page.goto(`${BASE_URL}/server`, { waitUntil: 'networkidle2' })
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'v2-server-midnight.png'), fullPage: true })

  await page.goto(`${BASE_URL}/logs`, { waitUntil: 'networkidle2' })
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'v2-logs-midnight.png'), fullPage: true })

  await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle2' })
  await page.click('.v2-sidebar-head .v2-icon-btn')
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'v2-sidebar-collapsed.png'), fullPage: true })
  await page.close()

  const mobile = await browser.newPage()
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  await login(mobile)
  await setMidnightTheme(mobile)
  await mobile.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle2' })
  await mobile.click('.v2-mobile-only')
  await mobile.waitForSelector('.v2-drawer .v2-sidebar.mobile', { timeout: 10_000 })
  await mobile.screenshot({ path: path.join(OUTPUT_DIR, 'v2-mobile-drawer.png'), fullPage: true })
  await mobile.close()
}

async function writeReadme() {
  const readme = `# PR3 Screenshots

| страница | режим | тема | viewport | файл | дата |
| --- | --- | --- | --- | --- | --- |
| users | legacy (NEXT_PUBLIC_UI_V2=0) | midnight | 1440x900 | legacy-users.png | ${DATE} |
| users | v2 (NEXT_PUBLIC_UI_V2=1) | midnight | 1440x900 | v2-users-midnight.png | ${DATE} |
| server | v2 (NEXT_PUBLIC_UI_V2=1) | midnight | 1440x900 | v2-server-midnight.png | ${DATE} |
| logs | v2 (NEXT_PUBLIC_UI_V2=1) | midnight | 1440x900 | v2-logs-midnight.png | ${DATE} |
| sidebar collapsed | v2 (NEXT_PUBLIC_UI_V2=1) | midnight | 1440x900 | v2-sidebar-collapsed.png | ${DATE} |
| mobile drawer open | v2 (NEXT_PUBLIC_UI_V2=1) | midnight | 390x844 | v2-mobile-drawer.png | ${DATE} |
`
  await writeFile(path.join(OUTPUT_DIR, 'README.md'), readme, 'utf8')
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  if (MODE === 'all') {
    for (const file of [
      'legacy-users.png',
      'v2-users-midnight.png',
      'v2-server-midnight.png',
      'v2-logs-midnight.png',
      'v2-sidebar-collapsed.png',
      'v2-mobile-drawer.png',
    ]) {
      await rm(path.join(OUTPUT_DIR, file), { force: true })
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  })

  try {
    if (MODE === 'legacy') await captureLegacy(browser)
    else if (MODE === 'v2') await captureV2(browser)
    else {
      await captureLegacy(browser)
      await captureV2(browser)
    }
  } finally {
    await browser.close()
  }

  await writeReadme()
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
