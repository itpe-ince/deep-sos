/**
 * USCP V2 E2E 테스트용 DB 시드 헬퍼.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §10.3
 *
 * 사용 패턴:
 *   import { test } from './fixtures/uscp-test';
 *
 *   test.beforeAll(async ({ request }) => {
 *     await ensureTestUsers(request);
 *     await seedIssue(request, { region: 'daejeon', stage: 'reviewing' });
 *   });
 *
 *   test.afterAll(async ({ request }) => {
 *     await cleanupTestData(request);
 *   });
 *
 * Backend 측 `/api/v1/__test__/*` 엔드포인트는 NODE_ENV=test 에서만 활성화되며,
 * Sprint 1 (M01 회원·인증) 구현 시 함께 추가 예정.
 *
 * 기존 V1 `seed.ts` 는 V1 잔재 스펙(bf1-issue 등) 호환용으로 유지.
 */
import type { APIRequestContext } from '@playwright/test';

import {
  ALL_TEST_USERS,
  type TestUser,
  testCitizen,
  testOperator,
} from './users';

const API_URL =
  process.env.E2E_API_URL ?? 'http://127.0.0.1:3810/api/v1';

/** 테스트 사용자 4종을 멱등하게 보장. 이미 존재하면 skip. */
export async function ensureTestUsers(
  request: APIRequestContext,
): Promise<void> {
  for (const user of ALL_TEST_USERS) {
    await ensureUser(request, user);
  }
}

async function ensureUser(
  request: APIRequestContext,
  user: TestUser,
): Promise<void> {
  // 1) 가입 시도 — 이미 있으면 409 (Conflict) 무시
  const signupRes = await request.post(`${API_URL}/auth/signup`, {
    data: {
      email: user.email,
      password: user.password,
      name: user.name,
      birth_year: 1990, // 만 14세 이상
      agreements: { privacy: true, service: true },
    },
    failOnStatusCode: false,
  });
  if (signupRes.status() >= 500) {
    throw new Error(
      `Seed failed for ${user.email}: HTTP ${signupRes.status()} ${await signupRes.text()}`,
    );
  }

  // 2) operator/mentor/student 역할은 별도 grant API 가 필요 (M04-01)
  //    Sprint 0 시점에는 미구현 → 본 단계는 향후 enable 예정
  //    임시로 admin __test__ 엔드포인트 호출 시도 (실패해도 무시)
  if (user.role !== 'citizen') {
    await request.post(`${API_URL}/__test__/grant-role`, {
      data: { email: user.email, role: user.role },
      failOnStatusCode: false,
    });
  }
}

/** issues 테이블 시드 (Sprint 1+ 에서 활용). */
export async function seedIssue(
  request: APIRequestContext,
  options: {
    region: 'daejeon' | 'gongju' | 'yesan' | 'cheonan' | 'sejong';
    stage?: string;
    track?: 'policy_reflection' | 'policy_reference' | 'citizen_autonomy';
    title?: string;
    body?: string;
  },
): Promise<string | null> {
  const res = await request.post(`${API_URL}/__test__/seed-issue`, {
    data: {
      region: options.region,
      stage: options.stage ?? 'reported',
      track: options.track,
      title: options.title ?? `[E2E] ${options.region} 테스트 제보`,
      body: options.body ?? 'E2E 자동화 시드 데이터입니다.',
    },
    failOnStatusCode: false,
  });
  if (!res.ok()) return null;
  const data = await res.json();
  return (data?.id as string) ?? null;
}

/** 테스트 종료 시 호출 — 시드한 모든 데이터를 정리. */
export async function cleanupTestData(
  request: APIRequestContext,
): Promise<void> {
  await request.post(`${API_URL}/__test__/cleanup`, {
    data: { scope: 'e2e-test-data' },
    failOnStatusCode: false,
  });
}

/** 사용자별 access/refresh 토큰 발급 (localStorage 주입용). */
export async function getAuthTokens(
  request: APIRequestContext,
  user: TestUser = testCitizen,
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) {
    throw new Error(
      `Login failed for ${user.email}: HTTP ${res.status()} ${await res.text()}`,
    );
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
}

export { testCitizen, testOperator };
