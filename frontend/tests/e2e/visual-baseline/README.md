# Visual Regression Baseline

> 설계 근거: [docs/02-design/features/uscp-v2.design.md §7.2.3, §10.3.4](../../../../docs/02-design/features/uscp-v2.design.md)

본 디렉터리는 Playwright `toHaveScreenshot()` baseline 의 중앙 저장소입니다.

## 구조

`playwright.config.ts` 의 `snapshotPathTemplate` 설정:

```
snapshotPathTemplate: './tests/e2e/visual-baseline/{testFilePath}/{arg}{ext}'
```

따라서 spec 파일 `tests/e2e/m02-issues/m02-19-track-label.spec.ts` 의
`expect(badges.first()).toHaveScreenshot('m02-19-track-badge-first.png')`
호출은 다음 경로의 PNG 와 비교합니다:

```
tests/e2e/visual-baseline/m02-issues/m02-19-track-label.spec.ts/m02-19-track-badge-first.png
```

## Mockup baseline (목표 26건)

`mockup/pages/` 의 26개 HTML 화면에 대응:

| Group | 화면 수 | Sprint |
|---|---:|---|
| public/ (10) — index, about, issues, issue-detail, projects, project-detail, success-cases, network, performance, login | 10 | Sprint 1~5 점진 |
| user/ (3) — issue-new, my-activities, profile | 3 | Sprint 1~2 |
| admin/ (13) — dashboard, issues, issue-detail, projects, project-detail, success-cases, mentors, organizations, kpi, cms-banners, terms, users, audit | 13 | Sprint 1~5 |
| **합계** | **26** | — |

## Baseline 생성·갱신

```bash
# 첫 baseline 생성 (또는 UI 변경 후 재생성)
pnpm test:e2e -- --update-snapshots tests/e2e/m02-issues/m02-19-track-label.spec.ts

# 모든 baseline 일괄 갱신 (UI 토큰 대량 변경 시 — 신중 사용)
pnpm test:e2e -- --update-snapshots
```

## 회귀 검증 기준

`playwright.config.ts.expect.toHaveScreenshot.maxDiffPixelRatio: 0.02` —
픽셀 차이 2% 까지 허용 (브라우저 렌더링 미세 변동 흡수). 의도된 UI 변경
시에는 baseline 갱신 후 PR 에 baseline 변경분 포함.

## CI 통합

`.github/workflows/e2e.yml` 의 Playwright 실행이 baseline 불일치 시 실패.
실패 시 artifact 의 `playwright-report/` 에서 diff 이미지 확인 가능.
