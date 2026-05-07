import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'

type CaptureMode = 'legacy' | 'v2'

type ViewportConfig = {
  width: number
  height: number
  isMobile?: boolean
  hasTouch?: boolean
  deviceScaleFactor?: number
}

type PreAction =
  | { type: 'click'; selector: string }
  | { type: 'wait'; ms: number }
  | { type: 'type'; selector: string; text: string; delayMs?: number }
  | { type: 'waitForSelector'; selector: string; timeoutMs?: number }

type ScreenshotConfigItem = {
  name: string
  url: string
  viewport: ViewportConfig
  mode: CaptureMode
  theme: string
  preActions?: PreAction[]
}

const BASE_URL = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:18080'
const MODE = process.env.CAPTURE_MODE ?? 'all'
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  '..',
  '..',
  process.env.CAPTURE_OUTPUT ?? 'docs/screenshots/pr3',
)
const CONFIG_PATH = path.resolve(
  process.cwd(),
  process.env.CAPTURE_CONFIG ?? 'scripts/screenshots.config.json',
)
const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const USERNAME = process.env.PANEL_ADMIN_USER ?? 'admin'
const PASSWORD = process.env.PANEL_ADMIN_PASS ?? 'admin'

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' })
  const usernameInput = await page.$('#username')
  if (!usernameInput) return
  await page.type('#username', USERNAME)
  await page.type('#password', PASSWORD)
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')])
}

async function setTheme(page: Page, theme: string) {
  await page.evaluate((nextTheme) => {
    localStorage.setItem('mieru-panel-theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }, theme)
  await page.reload({ waitUntil: 'networkidle2' })
}

async function runPreActions(page: Page, actions: PreAction[] = []) {
  for (const action of actions) {
    if (action.type === 'click') {
      await page.click(action.selector)
      continue
    }
    if (action.type === 'waitForSelector') {
      await page.waitForSelector(action.selector, {
        timeout: action.timeoutMs ?? 10_000,
      })
      continue
    }
    if (action.type === 'type') {
      await page.type(action.selector, action.text, { delay: action.delayMs ?? 0 })
      continue
    }
    await new Promise((resolve) => setTimeout(resolve, action.ms))
  }
}

function isSelectedMode(mode: string, target: CaptureMode) {
  return mode === 'all' || mode === target
}

async function captureShot(browser: Browser, shot: ScreenshotConfigItem) {
  const page = await browser.newPage()
  await page.setViewport(shot.viewport)
  await login(page)
  await setTheme(page, shot.theme)
  await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: 'networkidle2' })
  await runPreActions(page, shot.preActions)
  await page.screenshot({ path: path.join(OUTPUT_DIR, shot.name), fullPage: true })
  await page.close()
}

async function loadConfig(): Promise<ScreenshotConfigItem[]> {
  const raw = await readFile(CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as ScreenshotConfigItem[]
}

async function main() {
  const config = await loadConfig()
  await mkdir(OUTPUT_DIR, { recursive: true })
  for (const shot of config) {
    if (!isSelectedMode(MODE, shot.mode)) continue
    await rm(path.join(OUTPUT_DIR, shot.name), { force: true })
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  })

  try {
    for (const shot of config) {
      if (!isSelectedMode(MODE, shot.mode)) continue
      await captureShot(browser, shot)
    }
  } finally {
    await browser.close()
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
