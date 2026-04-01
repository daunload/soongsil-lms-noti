import { chromium } from 'playwright';
import type { CanvasCookie } from './types.js';

export async function login(): Promise<CanvasCookie[]> {
  const userId = process.env.SSU_ID;
  const userPw = process.env.SSU_PW;

  if (!userId) {
    throw new Error('Missing required environment variable: SSU_ID');
  }
  if (!userPw) {
    throw new Error('Missing required environment variable: SSU_PW');
  }

  const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to Canvas — redirects to LMS SSO login page
    await page.goto('https://canvas.ssu.ac.kr', { waitUntil: 'networkidle' });

    // Verify we landed on the SSO login page
    const currentUrl = page.url();
    if (!currentUrl.includes('xn-sso/login.php')) {
      throw new Error(`Expected SSO login page, but landed on: ${currentUrl}`);
    }

    // Fill in student ID — try common selector variants
    const idSelector = await resolveSelector(page, ['#userid', '#id', 'input[name="userid"]', 'input[name="id"]']);
    if (!idSelector) {
      throw new Error('Could not find username/ID input field on SSO login page');
    }
    await page.fill(idSelector, userId);

    // Fill in password — try common selector variants
    const pwSelector = await resolveSelector(page, ['#pwd', '#password', 'input[name="pwd"]', 'input[name="password"]']);
    if (!pwSelector) {
      throw new Error('Could not find password input field on SSO login page');
    }
    await page.fill(pwSelector, userPw);

    // Submit the login form
    await Promise.all([
      page.waitForURL('**/lms.ssu.ac.kr/**', { waitUntil: 'networkidle', timeout: 30000 }),
      page.keyboard.press('Enter'),
    ]);

    // Confirm we are back on LMS
    const postLoginUrl = page.url();
    if (!postLoginUrl.includes('lms.ssu.ac.kr')) {
      throw new Error(
        `Login may have failed — expected redirect to lms.ssu.ac.kr, but landed on: ${postLoginUrl}`
      );
    }

    // Wait for the page to be fully settled so all session cookies are written
    await page.waitForLoadState('networkidle');

    // Extra 2-second buffer to ensure all cookies are committed
    await page.waitForTimeout(2000);

    // Extract cookies from the browser context
    const rawCookies = await context.cookies();

    const cookies: CanvasCookie[] = rawCookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
    }));

    if (!cookies.some((c) => c.name === 'xn_api_token')) {
      throw new Error(
        'Login appeared to succeed but xn_api_token cookie was not found. ' +
          'Please verify your SSU_ID and SSU_PW are correct.'
      );
    }

    return cookies;
  } finally {
    await browser.close();
  }
}

/**
 * Returns the first selector from the list that matches a visible element on
 * the page, or null if none match.
 */
async function resolveSelector(
  page: import('playwright').Page,
  selectors: string[]
): Promise<string | null> {
  for (const selector of selectors) {
    const el = page.locator(selector).first();
    if (await el.isVisible().catch(() => false)) {
      return selector;
    }
  }
  return null;
}
