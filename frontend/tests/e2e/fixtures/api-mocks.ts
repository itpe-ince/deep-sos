/**
 * USCP V2 E2E 테스트용 API 모킹 헬퍼.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §10.3
 *
 * 백엔드 의존성을 분리하고 빠르게 UI 분기를 검증할 때 사용.
 * (예: 5회 로그인 실패 시 30분 잠금 alert 흐름, 약관 재동의 409 반환 등)
 *
 * 실제 백엔드와의 통합 테스트는 `seed-v2.ts` + 실제 fetch 사용.
 */
import type { Page, Route } from '@playwright/test';

const API_PATH = '**/api/v1/**';

export interface MockOptions {
  /** 우선순위 (낮을수록 먼저 매칭) */
  priority?: number;
}

/** 임의 경로에 JSON 응답을 mock. */
export async function mockJson(
  page: Page,
  pathGlob: string,
  status: number,
  body: unknown,
): Promise<void> {
  await page.route(pathGlob, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

/** Problem Details(RFC 7807) 형태의 에러 응답을 mock. */
export async function mockProblem(
  page: Page,
  pathGlob: string,
  status: number,
  problem: {
    type?: string;
    title: string;
    detail: string;
    [key: string]: unknown;
  },
): Promise<void> {
  await page.route(pathGlob, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        type: problem.type ?? `urn:uscp:problem:error`,
        title: problem.title,
        status,
        detail: problem.detail,
        ...problem,
      }),
    });
  });
}

/** 로그인 실패 후 5회 잠금 응답 (M01-13). */
export async function mockLoginLocked(page: Page): Promise<void> {
  await mockProblem(page, `${API_PATH}/auth/login`, 423, {
    type: 'urn:uscp:problem:account_locked',
    title: 'Account Locked',
    detail: '5회 연속 실패로 계정이 30분간 잠금되었습니다.',
    locked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}

/** 약관 재동의 필요 응답 (M07-14, §6.3 reconsent_check_middleware). */
export async function mockReconsentRequired(
  page: Page,
  pathGlob: string = API_PATH,
): Promise<void> {
  await mockProblem(page, pathGlob, 409, {
    type: 'urn:uscp:problem:needs_reconsent',
    title: 'Reconsent Required',
    detail: '약관이 개정되어 재동의가 필요합니다.',
    needs_reconsent: {
      kind: 'privacy',
      version: '2.0',
      version_id: '00000000-0000-0000-0000-000000000001',
    },
  });
}

/** Rate limit 초과 (429) 응답 mock. */
export async function mockRateLimit(
  page: Page,
  pathGlob: string,
  retryAfterSec: number = 60,
): Promise<void> {
  await page.route(pathGlob, async (route: Route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/problem+json',
      headers: { 'Retry-After': String(retryAfterSec) },
      body: JSON.stringify({
        type: 'urn:uscp:problem:rate_limited',
        title: 'Too Many Requests',
        status: 429,
        detail: `${retryAfterSec}초 후 다시 시도해주세요.`,
      }),
    });
  });
}

/** 모든 mock 을 해제 (테스트 격리). */
export async function clearAllMocks(page: Page): Promise<void> {
  await page.unrouteAll();
}
