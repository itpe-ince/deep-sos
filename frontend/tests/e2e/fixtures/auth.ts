import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export const STUDENT: TestUser = {
  email: 'test@univ.ac.kr',
  password: 'test12345',
  name: '박학생',
};

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3810/api/v1';

/** API 직접 호출로 토큰 획득 → localStorage 주입 → 페이지 새로고침. */
export async function loginAs(page: Page, user: TestUser = STUDENT) {
  // 1. API 직접 호출로 토큰 획득
  const loginRes = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(loginRes.ok()).toBeTruthy();
  const tokens = await loginRes.json();

  // 2. 프론트엔드 도메인에서 localStorage 주입
  await page.goto('/');
  await page.evaluate(
    ({ access, refresh }) => {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    },
    { access: tokens.access_token, refresh: tokens.refresh_token },
  );

  // 3. 새로고침 → useAuth 인식
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}
