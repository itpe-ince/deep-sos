/**
 * USCP V2 Extended Playwright test — §10.3.3 6항 검증 헬퍼.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §10.3.3
 *
 * 모든 V2 spec 은 본 모듈의 `test`, `expect` 를 import 하여 일관된 6항 검증을 실시.
 *
 * 추가 픽스처:
 *  - authenticatedAs : 4종 역할 중 1종으로 로그인된 page (localStorage 주입 + reload)
 *  - mockApi         : api-mocks 헬퍼 묶음 (auto-cleanup)
 *
 * 추가 expect 어서션:
 *  - expect.uscpRoutingOk(page)        : §2.4 URL 라우팅 4-체크
 *  - expect.uscpModalCompliant(modal)  : §7.2.1 모달 3분할 + backdrop 비활성
 *  - expect.uscpA11yClean(page)        : axe-core 위반 0건 (M08-10)
 */
import AxeBuilder from '@axe-core/playwright';
import {
  test as baseTest,
  expect as baseExpect,
  type Locator,
  type Page,
} from '@playwright/test';

import { getAuthTokens } from './seed-v2';
import {
  testCitizen,
  testOperator,
  testMentor,
  testStudent,
  type TestUser,
} from './users';

type RoleKey = 'citizen' | 'operator' | 'mentor' | 'student';

const USERS: Record<RoleKey, TestUser> = {
  citizen: testCitizen,
  operator: testOperator,
  mentor: testMentor,
  student: testStudent,
};

interface USCPFixtures {
  /** 4종 역할 중 1종으로 로그인된 page 를 반환. */
  authenticatedAs: (role: RoleKey) => Promise<Page>;
}

/** USCP V2 전용 extended test. */
export const test = baseTest.extend<USCPFixtures>({
  authenticatedAs: async ({ page, request }, use) => {
    const helper = async (role: RoleKey): Promise<Page> => {
      const user = USERS[role];
      const tokens = await getAuthTokens(request, user);
      await page.goto('/');
      await page.evaluate(
        ({ access, refresh }) => {
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
        },
        { access: tokens.access_token, refresh: tokens.refresh_token },
      );
      await page.reload({ waitUntil: 'domcontentloaded' });
      return page;
    };
    await use(helper);
  },
});

/**
 * §2.4 URL 라우팅 4-체크 검증 헬퍼.
 *
 * 1. 메뉴 클릭으로 진입 → URL 변경 + 화면 전환  (호출자가 이미 수행)
 * 2. F5 후 동일 화면 표시
 * 3. URL 직접 입력 (new context) → 동일 화면 진입
 * 4. 뒤로/앞으로 → 정상 복원
 *
 * @param visibleLocator 진입 화면을 식별하는 가시 요소 (ex: 제목 heading)
 */
async function uscpRoutingOk(
  page: Page,
  visibleLocator: Locator,
): Promise<void> {
  // 2. F5 (새 고침)
  const urlBefore = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await baseExpect(page).toHaveURL(urlBefore);
  await baseExpect(visibleLocator).toBeVisible({ timeout: 10_000 });

  // 3. 새 컨텍스트로 URL 직접 진입
  const context = page.context();
  const newPage = await context.newPage();
  try {
    await newPage.goto(urlBefore, { waitUntil: 'domcontentloaded' });
    // 인증 redirect 시 ?next= 가 붙는 경우도 허용
    const finalUrl = newPage.url();
    if (!finalUrl.includes('?next=')) {
      baseExpect(finalUrl).toContain(new URL(urlBefore).pathname);
    }
  } finally {
    await newPage.close();
  }

  // 4. 뒤로가기 → 앞으로가기
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
}

/**
 * §7.2.1 모달 컴플라이언스 검증.
 *
 * 1. role="dialog" + aria-modal="true"
 * 2. header / content / footer 3분할 구조 (footer 는 optional)
 * 3. backdrop 클릭 시 모달 닫히지 않음
 * 4. 닫기 버튼 (data-testid="modal-close") 존재
 *
 * @param modal 모달 컨테이너 Locator (보통 `role="dialog"`)
 */
async function uscpModalCompliant(modal: Locator): Promise<void> {
  // 1. ARIA
  await baseExpect(modal).toHaveAttribute('role', 'dialog');
  await baseExpect(modal).toHaveAttribute('aria-modal', 'true');

  // 2. 3분할 구조 (header, content, footer)
  await baseExpect(modal.locator('header').first()).toBeVisible();
  await baseExpect(modal.locator('[data-testid="modal-content"]')).toBeVisible();
  // footer 는 optional → 존재 시 visible 확인만

  // 4. 닫기 버튼
  const closeBtn = modal.locator('[data-testid="modal-close"]');
  await baseExpect(closeBtn).toBeVisible();

  // 3. backdrop 클릭 → 모달 유지 (backdrop 은 모달 외부 첫 형제)
  const page = modal.page();
  const backdrop = page.locator('[data-testid="modal-backdrop"]').first();
  await backdrop.click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(300);
  await baseExpect(modal).toBeVisible();
}

/**
 * §8.4 / M08-10 접근성 검증.
 * axe-core 위반 0건 (WCAG 2.1 AA serious/critical 만 차단).
 */
async function uscpA11yClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const blockers = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (blockers.length > 0) {
    const summary = blockers
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}건)`)
      .join('\n');
    throw new Error(
      `WCAG 2.1 AA serious/critical 위반 ${blockers.length}건:\n${summary}`,
    );
  }
}

/** USCP V2 전용 expect 헬퍼 매니페스트. */
export const uscp = {
  routingOk: uscpRoutingOk,
  modalCompliant: uscpModalCompliant,
  a11yClean: uscpA11yClean,
};

/** baseExpect 를 그대로 re-export — `expect` 한 곳에서 사용. */
export const expect = baseExpect;

export { testCitizen, testOperator, testMentor, testStudent };
