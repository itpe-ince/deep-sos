---
template: plan
version: 1.0
feature: terms-admin-editor
date: 2026-06-01
author: 당사 PM
project: USCP (Union Social Contribution Platform)
parent: uscp-v2 (M07 콘텐츠 관리 — 약관 영역 정식 구현)
status: Draft
basis:
  - docs/02-design/features/uscp-v2.design.md §4.2 M07, §8.4 컴플라이언스, §7.3 #23 약관 관리
  - docs/02-design/features/uscp-feature-spec.md §M07-10/11/12/13/14
  - mockup/pages/admin/terms.html + mockup/scripts/app.js (admin-12 약관 관리)
  - 약관 관리 현황 분석 보고서 (2026-06-01, 본 PDCA 직전 산출)
---

# terms-admin-editor — 약관 관리 (이용약관·개인정보처리방침 편집 및 버전 관리) Planning Document

> **Summary**: USCP V2 의 약관 관리(M07-10~14) 정식 구현. 백엔드 서비스·미들웨어·시민 공개 페이지·재동의 모달이 완성되어 있으나 ① DB 마이그레이션 미적용, ② admin TermsEditor UI 부재 두 가지로 인해 운영자가 약관을 발행할 경로 자체가 끊겨 있는 상태를 해소한다.
>
> **Project**: USCP (국립공주대학교 글로컬사업단 지역사회특화센터)
> **Parent PDCA**: `uscp-v2` (Match Rate 96%, 완료) — 본 PDCA 는 그 산하 M07 약관 영역의 미완 구간 회수
> **Author**: 당사 PM
> **Date**: 2026-06-01
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

운영자가 이용약관(service)·개인정보처리방침(privacy) 본문을 admin UI 에서 직접 작성·발행하고, 발행 시 버전이 자동 증가하며, 재동의 필요 여부(`require_reconsent`)를 토글할 수 있는 정식 관리 화면을 구축한다.

기존에 작성한 시민 공개 페이지(`/terms/service`·`/terms/privacy`)는 운영자가 약관을 발행하기 전까지는 fallback 정적 본문을 노출하고 있다. 본 PDCA 완료 시 정상 운영 시 DB 발행본을 자동으로 노출하게 된다.

### 1.2 Background

**상위 PDCA 현황** (`uscp-v2`, Match Rate 96%, completed):
- 백엔드 service / router / middleware 는 완비 ([backend/app/application/terms_service.py](../../../backend/app/application/terms_service.py), [backend/app/presentation/middleware/reconsent_check.py](../../../backend/app/presentation/middleware/reconsent_check.py))
- 마이그레이션 0007 (terms_kind ENUM) · 0008 (users.terms_version_id) · 0010 (terms_versions, user_term_agreements 테이블) 작성 완료
- 시민 회원가입 동의 폼 + Footer 약관 링크 + ReconsentGate/Modal 마운트 완료

**미완 구간** (본 PDCA 의 표적):

| 항목 | 현재 상태 | 영향 |
|------|---------|------|
| DB 마이그레이션 (0007~0010) | `alembic_version=0006` 에 정체 → `terms_versions` 미생성 | `/api/v1/terms/{kind}/current` 404, 회원가입 시 `users.terms_version_id=NULL` |
| admin TermsEditor UI | `app/admin/cms/` 하위 `terms/` 디렉터리 자체 부재 | 운영자가 약관을 발행할 화면 자체가 없음 |
| Admin sidebar 메뉴 | mockup 에 "약관 관리(버전)" 메뉴 있으나 frontend 미반영 | 진입 동선 차단 |
| `auth_service.signup_v2` 동의 이력 INSERT | `user_term_agreements` INSERT 누락 (`users.terms_version_id` 만 기록) | M07-13 부분 충족 |
| 정적 fallback 본문 법무 검토 | 표준 골격(12조·11조) 작성됨, 법무 검토 미통과 | 8/20 정식 오픈 전 운영자가 정식 본문 발행 필요 |

### 1.3 합의 결과 / 적용 범위 요약

| 항목 | 내용 |
|------|------|
| 범위 | M07-10/11/12 약관 발행 + M07-13 동의 이력 보강 + DB 마이그레이션 회수 + admin sidebar 메뉴 |
| 비범위 | 약관 자동 법무 검토, 다국어, A/B 테스트 발행, 약관 PDF 내보내기 |
| 일정 | 1~2 일 (단일 admin 페이지 + 1개 마이그레이션 회수) |
| 오픈 의존성 | 2026-08-20 정식 오픈 직전 운영자가 본 화면으로 정식 약관 발행 필수 |

### 1.4 Related Documents

- 부모 PDCA Plan: [`docs/01-plan/features/uscp-v2.plan.md`](./uscp-v2.plan.md)
- 부모 Design (M07 섹션): [`docs/02-design/features/uscp-v2.design.md`](../../02-design/features/uscp-v2.design.md) §4.2 M07
- 기능 상세 명세: [`docs/02-design/features/uscp-feature-spec.md`](../../02-design/features/uscp-feature-spec.md) §M07-10~14
- 분석 결과: 본 PDCA 직전 세션의 "약관 관리 현황 분석 보고서" (대화 로그)
- 백엔드 구현체: `backend/app/application/terms_service.py`, `backend/app/presentation/cms/admin_router.py`
- 시민 공개 페이지: `frontend/src/app/(public)/terms/[kind]/page.tsx` (방금 작업)
- Mockup: `mockup/pages/admin/terms.html`, `mockup/scripts/app.js` admin-12

---

## 2. Scope

### 2.1 In Scope

- [ ] **(P0) DB 마이그레이션 회수** — `terms_versions` · `user_term_agreements` 테이블, `terms_kind` ENUM, `users.terms_version_id` FK 생성 (멱등 보강 또는 `alembic upgrade head` 안전 적용)
- [ ] **(P0) Admin TermsEditor 화면** (`/admin/cms/terms`)
  - kind 별 탭 (이용약관 / 개인정보처리방침)
  - Tiptap WYSIWYG 본문 편집 (M07 표준 컴포넌트 재사용)
  - 현재 발행본 미리보기 (읽기 전용)
  - 발행 폼: 본문 + 시행일(`effective_at`) + `require_reconsent` 토글
  - 발행 확인 ConfirmModal (require_reconsent=true 시 영향 회원수 안내)
- [ ] **(P0) 버전 이력 목록** — kind 별 발행 이력 (버전·시행일·재동의 필요 여부·발행자·발행일)
- [ ] **(P0) Admin sidebar 메뉴 추가** — "약관 관리" 항목 (mockup 매칭)
- [ ] **(P1) Hardening** — `auth_service.signup_v2` 에서 `record_agreement_v2()` 호출 추가하여 가입 시점 `user_term_agreements` INSERT
- [ ] **(P1) E2E 테스트** — 약관 발행·재동의 토글·시민 측 본문 갱신 시나리오 (Playwright §10.3.3 6항 검증)
- [ ] **(P1) 시민 측 통합 검증** — `/terms/service`, `/terms/privacy` 가 DB 본문으로 자동 전환 + 임시 본문 배지 사라짐 확인

### 2.2 Out of Scope

- 약관 자동 법무 검토 / LLM 기반 검토 보조
- 다국어 약관 (영어판·중국어판 등)
- A/B 발행 / 단계 적용 / 지역별 차등 약관
- 약관 PDF 내보내기 또는 인쇄 친화 레이아웃
- 사용자별 동의 내역 상세 조회 화면 (M08 감사 영역 일부)
- 발행분 본문 사후 편집 (설계상 불가 — 새 버전 발행으로 대체)
- 약관 미리보기 전용 게스트 링크 / 짧은 URL

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | 근거 | Priority | Status |
|----|-------------|------|----------|--------|
| FR-01 | 운영자가 이용약관(service) 본문을 Tiptap WYSIWYG 으로 작성·발행할 수 있다 | M07-10 | High | Pending |
| FR-02 | 운영자가 개인정보처리방침(privacy) 본문을 Tiptap WYSIWYG 으로 작성·발행할 수 있다 | M07-11 | High | Pending |
| FR-03 | 발행 시 버전이 자동 부여된다 (`v1 → v2 → …`), 발행분 본문은 불변이다 | M07-12 | High | Pending |
| FR-04 | 운영자가 kind 별 발행 이력 목록을 볼 수 있다 (버전·시행일·재동의 필요 여부·발행일) | M07-12 | High | Pending |
| FR-05 | 발행 시 `require_reconsent` 토글로 재동의 필요 여부를 지정할 수 있다 | M07-14 | High | Pending |
| FR-06 | 운영자가 발행 직전 본문 미리보기(시민 측 렌더링과 동일한 톤)를 확인할 수 있다 | UX | Medium | Pending |
| FR-07 | Admin sidebar 에 "약관 관리" 메뉴가 노출된다 (mockup admin-12 매칭) | mockup | High | Pending |
| FR-08 | DB 마이그레이션이 적용되어 `GET /api/v1/terms/{kind}/current` 가 200 (또는 발행 전 404 정상) 을 반환한다 | 분석 P0 | High | Pending |
| FR-09 | 회원가입 시 `user_term_agreements` 테이블에 동의 이력이 INSERT 된다 | M07-13 보강 | Medium | Pending |
| FR-10 | 발행 후 시민 측 `/terms/{kind}` 가 fallback → DB 본문으로 자동 전환되고 "임시 본문" 배지가 사라진다 | Acceptance | High | Pending |
| FR-11 | 발행 폼이 키보드만으로 작성 가능하고 모든 입력에 라벨이 연결되어 있다 | WCAG 2.1 AA | High | Pending |
| FR-12 | 발행 직전 ConfirmModal 이 표시되며, `require_reconsent=true` 시 "영향 회원수" 안내가 포함된다 | UX | Medium | Pending |
| FR-13 | 발행 행위는 audit_logs 에 자동 기록된다 (`action='create'`, `target='terms_versions:{id}'`) | M08 감사 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| 성능 | 발행 응답 < 500ms (P95), 버전 목록 조회 < 300ms (P95) | Playwright + 백엔드 timing |
| 보안 | `operator` 권한만 접근, Tiptap 출력은 `sanitizeRichText()` 사전 정화 후 저장 (저장된 XSS 방어) | jwt_auth_middleware + 단위 테스트 |
| 접근성 | WCAG 2.1 AA — Tab 키 네비, 모든 폼 라벨, ConfirmModal ARIA, 색 대비 4.5:1 | axe DevTools / Lighthouse 위반 0 건 |
| 데이터 무결성 | 발행분 본문 변경 불가 (DB 트리거 또는 API 게이트), 버전 충돌 시 자동 재시도 | 단위 테스트 |
| 가용성 | 약관 본문은 60초 캐시 (ReconsentMiddleware), 시민 페이지 발행 즉시 반영 (force-dynamic) | 통합 테스트 |
| 감사성 | 발행·재동의 거부 모두 audit_logs 기록, 1년 보관 (design.md §8.4) | audit_logs 행 수 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] DB 마이그레이션 적용 완료 (`alembic_version` >= 0010 또는 결손 컬럼 멱등 보강)
- [ ] `/admin/cms/terms` 진입 → kind 별 발행 + 버전 이력 + 재동의 토글 동작
- [ ] 시민 측 `/terms/service`, `/terms/privacy` 가 발행본으로 자동 전환 확인
- [ ] ReconsentModal 이 신 버전 발행(require_reconsent=true) 직후 다음 로그인에서 강제 노출됨
- [ ] Playwright E2E 8 spec 추가 (발행·이력·토글·시민 측·재동의·거부·접근성·권한)
- [ ] `auth_service.signup_v2` 가 가입 시점에 `record_agreement_v2()` 호출
- [ ] Admin sidebar 에 "약관 관리" 메뉴 노출 + 활성 표시
- [ ] TypeScript 0 에러, ESLint 0 에러

### 4.2 Quality Criteria

- [ ] Match Rate (gap-detector) >= 90%
- [ ] E2E 6항 검증(§10.3.3): Happy / Error / 권한 / URL / Modal / A11y 통과
- [ ] audit_logs 에 발행 행위 기록 100% (단위 테스트)
- [ ] 발행분 본문 변경 시도 시 422 또는 트랜잭션 거부 (immutable 정책)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| DB 마이그레이션 0007~0015 일괄 적용 시 V1→V2 ENUM 변환 충돌 | High | Medium | 결손 분만 멱등 보강 (메모리 규율 [project_migration-discipline]) + dev DB 백업 후 dry-run |
| Tiptap 출력 HTML 에 의도치 않은 태그/이벤트 핸들러 혼입 | High | Medium | 저장 직전 백엔드에서도 sanitize (allow-list) + DOMPurify 프론트 정화 이중 방어 |
| 발행 시점에 `require_reconsent=true` 토글 실수로 전체 회원 로그아웃 폭증 | High | Low | ConfirmModal 영향 회원수 안내 + audit_logs 기록 + 발행자 본인은 우회 |
| 발행분 본문 사후 수정 요구 (오타·법무 보강) | Medium | High | 설계상 불가 → 새 버전 발행 가이드 + Confirm 문구 명시 ("발행 후 본문 수정 불가") |
| 8/20 정식 오픈 전 법무 검토 미완 → fallback 임시 본문 노출 위험 | High | Medium | 오픈 1주 전 (2026-08-13) 운영자 발행 마감일 명시 + 8/06 1차 법무 초안 작성 |
| 운영자 1인 체제에서 발행자 본인 검증 부재 | Medium | Medium | 발행 직전 ConfirmModal + audit_logs 기반 사후 추적 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | 단순 구조 | 정적 사이트 | ☐ |
| **Dynamic** | feature 기반 + BaaS | SaaS MVP | ☐ |
| **Enterprise** | 4-layer (presentation/application/domain/infrastructure) | USCP V2 와 동일 | ☑ |

부모 PDCA(`uscp-v2`)와 동일하게 Enterprise 레벨 유지. presentation(admin_router) ← application(terms_service) ← infrastructure(DB) 의존 방향 준수.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Editor | Tiptap / Quill / Plate / textarea | **Tiptap** | M07 콘텐츠 관리(공지·이벤트)와 동일 — RichTextEditor 공통 컴포넌트 재사용 |
| HTML 정화 | DOMPurify (FE) / bleach (BE) / 양쪽 | **양쪽** | 저장 직전 BE, 렌더 직전 FE 이중 방어 — 저장된 XSS 표준 패턴 |
| 버전 부여 | client 지정 / 자동 vN / semver | **자동 vN** | terms_service 기존 `_next_version()` 함수 활용 |
| 본문 저장 형식 | HTML / Markdown / JSON delta | **HTML (sanitized)** | 시민 페이지 `dangerouslySetInnerHTML` 렌더와 일치, 기존 `terms_versions.body TEXT` 스키마 유지 |
| 발행 트랜잭션 | 단일 INSERT / 2-step (draft→publish) | **단일 INSERT** | M07-12 "발행분 불변" 원칙 — draft 개념 없음 |
| ORM vs raw SQL | SQLAlchemy ORM 신설 / 기존 raw SQL 유지 | **기존 raw SQL 유지** | 부모 PDCA terms_service 가 이미 raw SQL — 일관성 |
| Admin 라우팅 | `/admin/cms/terms` / `/admin/terms` | **`/admin/cms/terms`** | M07 CMS 일관성 (banners/contents/resources 와 동일 prefix) |
| Sidebar 위치 | CMS 그룹 하위 / 독립 그룹 | **CMS 하위** | mockup admin-12 매칭 |

### 6.3 Clean Architecture Approach

```
backend/ (변경 없음 — 이미 구현)
  presentation/cms/admin_router.py   ← POST /admin/cms/terms · GET /admin/cms/terms/versions
  application/terms_service.py        ← publish_terms_v2 · list_terms_versions_v2
  presentation/middleware/reconsent_check.py ← 60초 캐시
  alembic/versions/0007~0010          ← 적용만 필요

frontend/
  src/app/admin/cms/terms/page.tsx                    ← (신규) kind 별 탭 + 발행 + 이력
  src/features/cms/components/TermsEditor.tsx        ← (신규) Tiptap 래퍼
  src/features/cms/components/TermsVersionList.tsx   ← (신규) 발행 이력
  src/features/cms/api/index.ts                      ← publishTerms / listTermsVersions 함수 추가
  src/components/layout/AdminSidebar.tsx             ← (편집) "약관 관리" 메뉴 추가
  tests/e2e/m07-cms/m07-terms-admin.spec.ts          ← (신규) 6항 검증 spec
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` 부재 (USCP 는 `docs/02-design/features/uscp-v2.design.md` 가 정본)
- [x] `docs/02-design/features/uscp-v2.design.md` §7.2 UI 표준 / §7.2.3 Mockup 우선 원칙
- [x] ESLint, Prettier, TypeScript 설정 완비 (부모 PDCA 산출)
- [x] sanitize.ts (DOMPurify) 정화 헬퍼 존재

### 7.2 Conventions to Define/Verify

| Category | Current | To Define | Priority |
|----------|---------|-----------|:--------:|
| **약관 본문 HTML allow-list** | sanitize.ts RICH_TEXT_CONFIG 존재 (`p/h1~h6/ul/ol/a/blockquote` 등) | 약관 도메인 특화 추가 (`<table>` 약관 별표 등) — 필요 시만 | Medium |
| **약관 버전 부여 규칙** | terms_service `_next_version()` (v1/v2/...) | 별도 정의 불필요 — 기존 규칙 유지 | — |
| **시행일 (`effective_at`) 기본값** | 백엔드 default = 발행 시점 | UI 에서 "발행 즉시 시행" 체크박스 default + 미래 시행일 선택 가능 | High |
| **재동의 안내 카피** | 미정 | "본 발행은 활성 회원 전원에게 재동의 모달이 노출됩니다. 영향 회원수: N 명" | High |

### 7.3 Environment Variables Needed

신규 환경변수 없음 — DB · MinIO · Redis 등은 부모 PDCA 에서 이미 정의.

### 7.4 Pipeline Integration

본 PDCA 는 9-Phase Pipeline 의 Phase 7 (보안) + Phase 4 (API) + Phase 5 (UI) 의 누락분 회수. 부모 PDCA 가 Phase 9 (배포) 직전 상태이므로, 본 작업 완료 후 Phase 9 배포 체크리스트에 "운영자 약관 발행" 항목을 추가한다.

---

## 8. Next Steps

1. [ ] `/pdca design terms-admin-editor` — 화면 와이어프레임, API 컨트랙트, 컴포넌트 트리, 마이그레이션 회수 절차 상세화
2. [ ] Design 리뷰 (운영자 1 인 + 발주처 1 인) — `require_reconsent` 토글 UX 합의
3. [ ] `/pdca do terms-admin-editor` — 구현 (마이그레이션 → admin UI → E2E)
4. [ ] `/pdca analyze terms-admin-editor` — gap-detector Match Rate >= 90% 확인
5. [ ] `/pdca report terms-admin-editor` → 부모 `uscp-v2` 의 M07 영역 회수 완료로 보고
6. [ ] 8/13 까지 운영자가 정식 약관 발행 → 8/20 정식 오픈

---

## 9. Acceptance Scenarios (Plan 단계 합의용)

### Scenario A — 운영자가 이용약관 초판(v1) 을 발행
1. `/admin/cms/terms` 진입 → "이용약관" 탭 선택
2. 본문 작성 (Tiptap) + 시행일 = 발행 즉시 + `require_reconsent` 해제
3. "발행" 클릭 → ConfirmModal "v1 으로 발행됩니다. 발행분 본문은 수정 불가합니다." → 확정
4. 버전 이력에 `v1 / 2026-08-20 / require_reconsent=false / 발행됨` 노출
5. 시민 측 `/terms/service` 새로고침 → fallback 본문이 v1 본문으로 자동 전환 + "임시 본문" 배지 사라짐

### Scenario B — 운영자가 개인정보처리방침 개정판(v2) 을 재동의 필요로 발행
1. `/admin/cms/terms` → "개인정보처리방침" 탭 → 현재 v1 노출
2. 본문 수정 + 시행일 = +7일 + `require_reconsent=true`
3. "발행" → ConfirmModal "영향 회원수: N 명에게 재동의 모달이 노출됩니다." → 확정
4. 활성 회원이 다음 보호 API 호출 시 409 needs_reconsent → ReconsentModal 강제 노출
5. 회원이 동의 → user_term_agreements INSERT + users.terms_version_id = v2 갱신
6. 회원이 거부 → force_logout → `/login?reason=reconsent_declined`

### Scenario C — 일반 사용자(citizen)가 `/admin/cms/terms` 직접 접근
1. URL 직접 입력 → 미들웨어 권한 검사
2. `redirect('/forbidden')` → 403 페이지 (이전 ErrorPage 작업과 통합)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-01 | Initial draft — 부모 PDCA `uscp-v2` 분석 결과 기반 M07 약관 영역 회수 PRD 작성 | 당사 PM |
