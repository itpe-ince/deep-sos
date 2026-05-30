# USCP V2 E2E 테스트 디렉터리

> 설계 근거: [docs/02-design/features/uscp-v2.design.md §10.3](../../../docs/02-design/features/uscp-v2.design.md) (Playwright E2E 기능 단위 closeout 게이트)

## 디렉터리 구조

```
tests/e2e/
├── README.md                  ← 본 문서
├── fixtures/                  ← V2 공유 fixture
│   ├── users.ts               testCitizen, testOperator, testMentor, testStudent
│   ├── seed.ts                DB 시드/정리 헬퍼
│   ├── api-mocks.ts           API 응답 mocking 헬퍼
│   ├── uscp-test.ts           extended Playwright test (§10.3.3 6항 자동 검증)
│   └── auth.ts                (V1 잔재 — 점진 폐기 예정)
├── m01-auth/                  M01 회원·인증 (13 기능)
│   └── m01-04-login.spec.ts   (샘플)
├── m02-issues/                M02 제보·게이트키핑 (21 기능)
│   └── m02-19-track-label.spec.ts (샘플)
├── m03-projects/              M03 리빙랩 운영 (18 기능)
├── m04-mentors/               M04 멘토·학생팀 매칭 (9 기능)
├── m05-network/               M05 협력 네트워크 (9 기능)
├── m06-performance/           M06 성과자료 (8 기능)
├── m07-cms/                   M07 콘텐츠 관리 (16 기능)
├── m08-audit/                 M08 권한·감사 (10 기능)
├── m09-common/                M09 공통 컴포넌트 (12 기능)
├── visual-baseline/           toHaveScreenshot() baseline (mockup 26개)
└── (legacy V1 specs)          accessibility.spec.ts, auth.spec.ts, bf1-issue.spec.ts, public.spec.ts
```

## 명명 규칙

```
m{NN}-{II}-{kebab-case}.spec.ts
   ↑    ↑   ↑
   │    │   기능 요약 (예: login, track-label, reconsent)
   │    기능 ID 번호 (M02-19 → 19)
   모듈 번호 (M01 → 01)
```

예시:
- `m01-04-login.spec.ts` — M01-04 이메일 로그인
- `m02-19-track-label.spec.ts` — M02-19 의제 트랙 라벨
- `m07-14-reconsent.spec.ts` — M07-14 약관 재동의 모달

## 기능별 Definition of Done (§10.3.1)

1. ✅ Backend API 구현 + OpenAPI 명세
2. ✅ Frontend UI 구현 + design.md §7.3 컴포넌트 매핑
3. ✅ Mockup (`mockup/pages/*.html`) 시각 비교 ≥ 90% 일치
4. ✅ **Playwright E2E 시나리오 작성·통과** (본 디렉터리)
5. ✅ §2.4.3 URL 라우팅 4 체크 + §7.2.1 모달 규칙 검증

위 5단계 모두 통과 전에는 **다음 기능 구현 진입 금지** (§10.3 게이트).

## 각 spec 의 최소 검증 항목 (§10.3.3)

각 기능 1건의 `*.spec.ts` 는 다음 6항을 모두 검증한다:

| # | 검증 항목 | 비고 |
|---|---|---|
| 1 | **Happy Path** | 정상 입력 → 정상 결과 |
| 2 | **Error Path** | 잘못된 입력 → 적절한 에러 표시 (브라우저 alert 미사용 §7.2.1) |
| 3 | **권한 분기** | 무권한 사용자 → 403 또는 redirect |
| 4 | **URL 라우팅** (§2.4) | 진입 후 새 고침 → 동일 화면 / URL 공유 → 동일 화면 |
| 5 | **Modal 규칙** (§7.2.1) | backdrop 클릭 무반응 / 닫기 버튼 동작 / header·footer·content 3분할 |
| 6 | **Accessibility** | `aria-label`, focus trap (모달), keyboard navigation |

`fixtures/uscp-test.ts` 의 `expect.uscpRoutingOk()`, `expect.uscpModalCompliant()` 헬퍼 활용.

## 실행

```bash
# 전체 실행
pnpm test:e2e

# 단일 모듈
pnpm test:e2e -- m02-issues/

# 단일 기능
pnpm test:e2e -- m02-19-track-label.spec.ts

# UI 모드 (디버깅)
pnpm test:e2e -- --ui

# 시각 회귀 baseline 업데이트
pnpm test:e2e -- --update-snapshots
```

## CI 통합

`.github/workflows/e2e.yml` 에서 PR 단위로 실행. 신규/수정 기능에 대응 spec 이 없거나 실패하면 머지 차단.
