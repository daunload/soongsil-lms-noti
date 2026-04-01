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
    // Navigate to Canvas — redirects to LMS SSO selection page
    await page.goto('https://canvas.ssu.ac.kr', { waitUntil: 'networkidle' });

    // Click "통합 로그인"
    await page.click('a[href*="smartid.ssu.ac.kr"]');
    await page.waitForLoadState('networkidle');

    // Fill in student ID and password
    await page.fill('input[placeholder="직번/학번을 입력하세요"]', userId);
    await page.fill('input[placeholder="비밀번호를 입력하세요"]', userPw);

    // Submit — click 로그인 button, wait until redirected away from smartid
    await page.click('a[href*="LoginInfoSend"]');
    await page.waitForURL(
      (url) => !url.hostname.includes('smartid.ssu.ac.kr'),
      { timeout: 30000 }
    );
    await page.waitForLoadState('networkidle');

    // Confirm we left smartid (i.e. login succeeded)
    const postLoginUrl = page.url();
    if (postLoginUrl.includes('smartid.ssu.ac.kr')) {
      throw new Error(
        `Login may have failed — still on smartid.ssu.ac.kr: ${postLoginUrl}`
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
