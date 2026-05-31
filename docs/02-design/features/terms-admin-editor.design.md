---
template: design
version: 1.0
feature: terms-admin-editor
date: 2026-06-01
author: 당사 PM + 프론트엔드 아키텍트
project: USCP (Union Social Contribution Platform)
parent: uscp-v2 (M07 약관 영역 회수)
status: Draft
plan: docs/01-plan/features/terms-admin-editor.plan.md
---

# terms-admin-editor Design Document

> **Summary**: 운영자가 이용약관·개인정보처리방침을 작성·발행하고 버전을 관리하는 admin 화면을 Tiptap 에디터 재사용 기반으로 구현. DB 마이그레이션 회수까지 포함.
>
> **Project**: USCP V2 (M07 영역)
> **Author**: 당사 PM + 프론트엔드 아키텍트
> **Date**: 2026-06-01
> **Status**: Draft
> **Planning Doc**: [terms-admin-editor.plan.md](../../01-plan/features/terms-admin-editor.plan.md)
> **Parent Design (M07 base)**: [uscp-v2.design.md §4.2 M07](./uscp-v2.design.md)

### 사전 조사 결과 (Plan §6.2 결정의 검증)

| 항목 | 결정 | 검증 |
|------|------|------|
| WYSIWYG 라이브러리 | **Tiptap v2.11** 재사용 | `@tiptap/react` `@tiptap/starter-kit` `@tiptap/extension-link` `@tiptap/extension-image` 모두 설치 확인 |
| 공용 에디터 컴포넌트 | [`src/components/admin/TipTapEditor.tsx`](../../../frontend/src/components/admin/TipTapEditor.tsx) (348 lines) | 이미 admin/cms/contents, admin/cms/pages, projects/SuccessStoryForm 3곳에서 재사용 중 |
| 본문 저장 형식 | HTML (sanitized) | `onChange(doc, html)` 의 html 인자 사용 — `terms_versions.body TEXT` 컬럼과 일치 |
| 모달 정책 준수 | `window.alert/prompt/confirm` 미사용 (커스텀 Modal) | TipTapEditor 가 이미 Modal 기반 링크/이미지 삽입 구현 |
| 이미지 업로드 | `POST /api/v1/admin/upload/image` (MinIO 백엔드) | 약관에 이미지 거의 사용 없음 — 옵션 유지 |

---

## 1. Overview

### 1.1 Design Goals

- 부모 PDCA `uscp-v2` 의 M07 약관 영역 미완 부분(admin UI + DB 마이그레이션 + 회원가입 이력 보강)을 최소 변경으로 완성한다.
- 운영자 단일 페이지(`/admin/cms/terms`)에서 ① 현재 발행본 확인 ② 새 버전 발행 ③ 버전 이력 조회 ④ 재동의 토글까지 단일 동선으로 처리한다.
- 기존 Tiptap 에디터를 그대로 재사용하여 학습 비용·중복 코드 0.
- "발행분 본문 불변" 원칙을 UI/UX 와 API 양쪽에서 명확히 표현한다.

### 1.2 Design Principles

- **재사용 우선**: 신규 에디터 컴포넌트 X — `TipTapEditor` 그대로 사용 (Props 도 동일)
- **이중 정화**: 저장 직전 FE `sanitizeRichText` + 저장 직후 BE allow-list (이미 백엔드 raw SQL 이므로 FE 정화가 1차 방어선)
- **명시적 발행**: 모든 발행은 ConfirmModal 통과 — 임의 클릭 차단
- **감사 가능**: 발행·재동의 거부 모두 `audit_logs` 자동 기록
- **시민 영향 가시화**: `require_reconsent=true` 발행 시 영향 회원수 사전 표시

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────┐
│ /admin/cms/terms                    │
│  ├─ KindTabs (service | privacy)    │
│  ├─ CurrentTermsCard (현재 발행본)   │
│  ├─ PublishForm                     │
│  │   ├─ TipTapEditor (재사용)       │
│  │   ├─ EffectiveAtPicker            │
│  │   ├─ RequireReconsentToggle      │
│  │   └─ PublishButton → ConfirmModal│
│  └─ VersionHistoryTable             │
└────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  frontend/src/features/cms/api      │
│  ├─ publishTerms(payload)           │
│  ├─ listTermsVersions(kind?)         │
│  ├─ getReconsentImpact(kind)        │← NEW (영향 회원수)
│  └─ getCurrentTerms(kind)           │
└────────────────────────────────────┘
              │ HTTP
              ▼
┌────────────────────────────────────┐
│  backend/app/presentation/cms       │
│  ├─ admin_router.publish_terms       │ (있음)
│  ├─ admin_router.terms_versions      │ (있음)
│  ├─ admin_router.reconsent_impact   │← NEW
│  └─ router.get_current_terms        │ (있음)
└────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  backend/app/application             │
│  └─ terms_service.py                 │
│     publish/list/get/record/check/submit
└────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  PostgreSQL                         │
│  ├─ terms_versions                  │
│  ├─ user_term_agreements             │
│  └─ users.terms_version_id FK        │
└────────────────────────────────────┘
              ▲
              │ Reconsent Middleware (60s cache)
              │
┌────────────────────────────────────┐
│  공개 라우터 (영향 영역)             │
│  GET /api/v1/terms/{kind}/current   │← /terms/[kind] 페이지에서 호출
└────────────────────────────────────┘
```

### 2.2 Data Flow — 발행

```
[Operator]
  1. /admin/cms/terms 진입
  2. KindTabs "이용약관" 선택
  3. PublishForm 작성 (TipTapEditor → HTML → sanitizeRichText)
  4. require_reconsent 토글 ON 시 → getReconsentImpact(kind) 호출 → 영향 회원수 표시
  5. "발행" 클릭 → ConfirmModal
  6. 확정 → POST /admin/cms/terms { kind, body(sanitized), effective_at, require_reconsent }
[Backend]
  7. _require_operator → audit hook
  8. terms_service.publish_terms_v2
     - 최신 버전 조회 → vN+1
     - INSERT terms_versions
     - audit_logs INSERT (action='create')
  9. 200 { terms_id, version, require_reconsent }
[Frontend]
  10. Toast "v2 로 발행했습니다"
  11. VersionHistoryTable refetch + CurrentTermsCard refetch
  12. ReconsentCheckMiddleware 캐시 60초 후 자동 갱신
       → 다음 사용자 보호 API 호출 시 409 needs_reconsent
       → ReconsentModal 강제 노출
```

### 2.3 Data Flow — 시민 측 자동 전환

```
[Citizen] /terms/service 새로고침
  ↓
[/terms/[kind]/page.tsx]
  ↓ force-dynamic
  ↓
[lib/api/terms.ts:getTermsContent]
  ↓ serverFetch(`/terms/${kind}/current`)
  ↓
[Backend get_current_terms_v2]
  ↓ 발행 즉시 DB hit → ResolvedTerms{ isPublished: true, body: DB HTML }
  ↓
[Page]
  ↓ sanitizeRichText(body) → dangerouslySetInnerHTML
  ↓ "임시 본문" 배지 자동 제거
```

### 2.4 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `/admin/cms/terms/page.tsx` (신규) | TipTapEditor, useAuth, useToast, ConfirmModal, features/cms/api | UI 통합 |
| `features/cms/api.publishTerms` (확장) | `apiFetch`, JWT | 발행 호출 |
| `terms_service.publish_terms_v2` (기존) | DB raw SQL | 버전 자동 + audit |
| Reconsent Middleware (기존) | terms_versions, users | 60s 캐시 + 409 응답 |
| Public `/terms/[kind]/page.tsx` (기존) | `serverFetch`, `sanitizeRichText` | 시민 측 자동 반영 |
| Migration 0007/0008/0010 (기존) | alembic | DB 스키마 적용 |

---

## 3. Data Model

### 3.1 Entity Definition (DB — 기존 마이그레이션 0010 정의 그대로)

```sql
-- 0007_v2_enums.py
CREATE TYPE terms_kind AS ENUM ('privacy', 'service');

-- 0010_v2_new_tables.py
CREATE TABLE terms_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              terms_kind NOT NULL,
  version           VARCHAR(20) NOT NULL,             -- v1, v2, ...
  body              TEXT NOT NULL,                     -- sanitized HTML
  effective_at      TIMESTAMPTZ NOT NULL,              -- 시행 시점
  require_reconsent BOOLEAN NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,                       -- NULL = draft (현재 미사용 — 발행 전제)
  published_by      UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_terms_versions_effective_at ON terms_versions(effective_at);

CREATE TABLE user_term_agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version_id  UUID NOT NULL REFERENCES terms_versions(id) ON DELETE CASCADE,
  agreed_at         TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, terms_version_id)
);

-- 0008_v2_users.py (이미 정의됨)
ALTER TABLE users ADD COLUMN terms_version_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_terms_version
  FOREIGN KEY (terms_version_id) REFERENCES terms_versions(id);
```

### 3.2 Entity Relationships

```
users
  └─(terms_version_id FK)─→ terms_versions (현재 회원이 동의한 마지막 버전)

users (1) ─┐
           ├─→ user_term_agreements (N, audit) ──→ terms_versions
terms_versions (1) ────────────────────────────────┘
                  UNIQUE(user_id, terms_version_id)
```

### 3.3 TypeScript Interface (FE features/cms/types)

```typescript
export type TermsKind = 'service' | 'privacy';

export interface TermsVersion {
  id: string;
  kind: TermsKind;
  kind_label: '이용약관' | '개인정보처리방침';
  version: string;          // 'v1', 'v2', ...
  body?: string;             // 목록 응답에는 미포함, 단건 응답에만 포함
  effective_at: string | null;
  require_reconsent: boolean;
  published_at: string | null;
}

export interface PublishTermsPayload {
  kind: TermsKind;
  body: string;              // sanitized HTML
  effective_at?: string | null;
  require_reconsent: boolean;
}

export interface ReconsentImpact {
  kind: TermsKind;
  total_active_users: number;
  affected_users: number;
  unaffected_users: number;   // 이미 최신 require_reconsent 미적용
}
```

---

## 4. API Specification

### 4.1 기존 (변경 없음, 참조용)

| Method | Path | 권한 | 응답 |
|--------|------|-----|------|
| `GET` | `/api/v1/terms/{kind}/current` | public | `{ id, kind, version, body, effective_at, require_reconsent }` |
| `GET` | `/api/v1/admin/cms/terms/versions?kind=` | operator | `{ data: TermsVersion[], meta }` |
| `POST` | `/api/v1/admin/cms/terms` | operator | `{ terms_id, kind, version, require_reconsent, message }` |
| `GET` | `/api/v1/auth/reconsent/required` | citizen+ | `{ required, pending: [...] }` |
| `POST` | `/api/v1/auth/reconsent` | citizen+ | `{ accepted, force_logout, message }` |

### 4.2 신규

| Method | Path | 권한 | 설명 | 응답 |
|--------|------|-----|------|------|
| `GET` | `/api/v1/admin/cms/terms/{kind}/impact` | operator | `require_reconsent=true` 발행 시 영향 받는 활성 회원 수 사전 계산 | `ReconsentImpact` |
| `GET` | `/api/v1/admin/cms/terms/{kind}/preview` | operator | 발행 전 본문 미리보기 (sanitize 후 HTML) — body 만 받아 정화 후 반환 | `{ html: string }` |

#### 4.2.1 GET `/admin/cms/terms/{kind}/impact`

**Query**: 없음.

**응답** (200 OK):
```json
{
  "kind": "privacy",
  "total_active_users": 1284,
  "affected_users": 1102,
  "unaffected_users": 182
}
```

**계산 SQL** (terms_service.get_reconsent_impact_v2 신규):
```sql
WITH latest AS (
  SELECT id FROM terms_versions
  WHERE kind = :k AND published_at IS NOT NULL
  ORDER BY created_at DESC LIMIT 1
)
SELECT
  COUNT(*) AS total_active_users,
  COUNT(*) FILTER (WHERE u.terms_version_id IS DISTINCT FROM (SELECT id FROM latest))
    AS affected_users
FROM users u
WHERE COALESCE(u.user_status::text, CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END) = 'active';
```

`unaffected_users = total_active_users - affected_users`.

#### 4.2.2 GET `/admin/cms/terms/{kind}/preview`

**요청 본문**: `{ body: string }` (POST 도 가능하나 GET + query 채택 — 짧은 본문 가정 어렵다면 POST 로 변경)
→ **결정**: 본문이 길 수 있어 **POST** 로 변경.

**Method**: `POST /api/v1/admin/cms/terms/preview`

**요청**: `{ body: string }`

**응답**: `{ html: string, sanitized: true, removed_tags: string[] }`

목적: 시민 페이지와 동일한 정화 로직(`bleach` 또는 동일 allow-list)으로 정화 결과를 미리 확인.

### 4.3 발행 요청 검증 강화 (기존 publish_terms_v2 보강)

추가할 422 케이스:
- `body_too_short` — `len(body) < 100` (스팸/실수 방지)
- `effective_at_in_past` — 시행일이 발행 시점보다 과거 (단, 즉시 발행은 허용)
- `kind_unchanged` — kind 값이 ENUM 미일치 (기존 invalid_kind 와 동일하지만 명시화)

### 4.4 에러 코드 표

| HTTP | code | 상황 | UI 처리 |
|------|------|------|--------|
| 401 | `unauthorized` | 토큰 부재/만료 | redirect `/login?next=/admin/cms/terms` |
| 403 | `forbidden` | role != operator | redirect `/forbidden` (이전 ErrorPage) |
| 422 | `invalid_kind` | kind ∉ {service, privacy} | toast "약관 종류가 올바르지 않습니다" |
| 422 | `body_required` | body 빈값 | toast "약관 본문을 입력해 주세요" |
| 422 | `body_too_short` | len(body) < 100 | toast "본문이 너무 짧습니다 (최소 100자)" |
| 500 | `terms_publish_failed` | DB 오류 | toast "약관 발행 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |

---

## 5. UI / UX Specification

### 5.1 화면 와이어프레임

```
┌─ /admin/cms/terms ───────────────────────────────────────────────┐
│ 약관 관리                                                          │
│ ──────────────────────────────────────────────────────────────── │
│ [ 이용약관 (service) ]   [ 개인정보처리방침 (privacy) ]              │ ← KindTabs
│ ──────────────────────────────────────────────────────────────── │
│ ┌─ 현재 발행본 ──────────────────────────────────────────────┐  │
│ │ v2  ·  시행일 2026-08-20  ·  재동의 필요: ✓                │  │
│ │ 발행: 2026-08-13 by operator (홍길동)                       │  │
│ │ [현재 본문 미리보기 ▾]                                       │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ 새 버전 발행 ─────────────────────────────────────────────┐  │
│ │ ┌──────────────────────────────────────────────────────────┐│ │
│ │ │ [H1][H2][B][I][•][1.][🔗][🖼][↶][↷] Tiptap 도구          ││ │
│ │ ├──────────────────────────────────────────────────────────┤│ │
│ │ │                                                          ││ │
│ │ │  Tiptap 편집 영역 (min-h 400px)                          ││ │
│ │ │                                                          ││ │
│ │ │                                                          ││ │
│ │ └──────────────────────────────────────────────────────────┘│ │
│ │                                                              │ │
│ │ 시행일: ◉ 발행 즉시   ○ 미래 일자 [____년 __월 __일]         │ │
│ │ ☐ 재동의 필요 (require_reconsent)                            │ │
│ │   └─ 활성화 시 영향: 1,102 / 1,284 명에게 ReconsentModal 노출 │ │ ← getReconsentImpact
│ │                                                              │ │
│ │ [미리보기]     [발행]                                         │ │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ 버전 이력 ────────────────────────────────────────────────┐  │
│ │ 버전  시행일       재동의  발행일       발행자  본문        │  │
│ │ v2    2026-08-20   ✓      2026-08-13   홍길동  [보기]      │  │
│ │ v1    2026-08-20   -      2026-08-01   홍길동  [보기]      │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 발행 확인 모달

```
┌─ 약관 발행 확인 ────────────────────────────────────────┐
│ 이용약관 v3 을 발행합니다.                                │
│                                                          │
│ • 시행일: 2026-08-20                                     │
│ • 재동의 필요: ✓                                          │
│   → 활성 회원 1,102 명에게 다음 보호 API 호출 시          │
│     ReconsentModal 이 강제 노출됩니다.                    │
│                                                          │
│ ⚠️ 발행분 본문은 수정할 수 없습니다.                       │
│   수정이 필요하면 새 버전(v4)을 발행해야 합니다.           │
│                                                          │
│              [ 취소 ]   [ 발행 ]                          │
└──────────────────────────────────────────────────────────┘
```

### 5.3 컴포넌트 트리

```
app/admin/cms/terms/page.tsx              (server boundary, 'use client')
├── KindTabs                              (신규, 단순 useState)
├── CurrentTermsCard                       (신규, 발행본 + 접이식 미리보기)
├── PublishForm                            (신규, 폼 상태 + handleSubmit)
│   ├── TipTapEditor                       (재사용 — components/admin/TipTapEditor.tsx)
│   ├── EffectiveAtPicker                  (신규, radio + date input)
│   ├── RequireReconsentToggle             (신규, checkbox + 영향 회원수 표시)
│   ├── PublishConfirmModal                (신규, ConfirmModal 래퍼)
│   └── PreviewModal                       (신규, sanitize 결과 + 변경 태그 알림)
└── VersionHistoryTable                    (신규, listTermsVersions 결과)
```

### 5.4 상태 관리

- 로컬 상태(`useState`) — kind, bodyHtml, effective mode, reconsent toggle, modals
- 데이터 fetching — `getCurrentTerms` + `listTermsVersions` + `getReconsentImpact` 를 `useEffect` 로 호출 (React Query 미사용, 현재 admin 페이지 패턴 일치)
- refetch — 발행 성공 후 두 fetch 재실행

### 5.5 접근성 (WCAG 2.1 AA)

| 요소 | 조치 |
|------|------|
| KindTabs | `role="tablist"`, `aria-selected`, ArrowLeft/Right 키보드 네비 |
| TipTapEditor | 도구 모음 버튼 모두 `aria-label` (이미 구현) + Tab 키로 도구 진입 가능 |
| RequireReconsentToggle | `<input type="checkbox" aria-describedby="reconsent-impact-help">` + 영향 회원수 표시 |
| PublishConfirmModal | `role="alertdialog"`, focus trap, Esc 무효(이전 ReconsentModal 패턴) |
| 색 대비 | Tailwind primary/text 토큰 — 디자인 시스템 4.5:1 보장 |
| 폼 에러 | `aria-invalid` + `aria-describedby` 로 에러 메시지 연결 |

---

## 6. Security

### 6.1 권한

- 모든 admin endpoint 는 `_require_operator(current_user)` 통과 (기존 패턴).
- citizen 직접 URL 접근 → `app/admin/layout.tsx` 의 `isOperator` 검사 → redirect `/?error=admin_required` (※ Plan §9 Scenario C 와 일치 — 추후 `/forbidden` 으로 통일 권장. 본 PDCA 의 P2 작업).

### 6.2 XSS 방어 (이중)

```
TipTapEditor.onChange(doc, html)
  ↓
sanitizeRichText(html)         ← FE 1차 (이미 lib/sanitize.ts 존재)
  ↓
publishTerms({ body: sanitized })
  ↓
[BE] (P1 추가) bleach 또는 동일 allow-list 정화
  ↓
INSERT terms_versions.body
  ↓ 시민 측 GET /terms/{kind}/current
  ↓
sanitizeRichText(body)         ← FE 2차 (저장된 XSS 방어)
  ↓
dangerouslySetInnerHTML
```

**근거**: design.md G-M07-3/4 — 저장된 리치텍스트는 저장·렌더 양쪽 정화.

### 6.3 감사 로그

`publish_terms_v2` 함수 내에서 audit_logs 자동 INSERT 추가 (현재는 함수 자체에 audit hook 없음 — 보강 필요).

```sql
INSERT INTO audit_logs (actor_id, action, target, ip, ua, meta_json, created_at)
VALUES (
  :operator_id, 'create', 'terms_versions:' || :terms_id,
  :ip, :ua,
  jsonb_build_object('kind', :kind, 'version', :version, 'require_reconsent', :reconsent),
  :now
);
```

### 6.4 발행분 불변 보장

- API 레벨: PATCH/PUT `/admin/cms/terms/{id}` endpoint 미존재 → 시도 시 405
- DB 레벨 (옵션, P2): trigger 로 `UPDATE terms_versions SET body = ...` 차단

---

## 7. Database Migration Recovery

### 7.1 현재 상태

- `alembic_version = 0006`
- `terms_versions`, `user_term_agreements`, `terms_kind ENUM`, `users.terms_version_id` 모두 부재
- 0007 (enums) · 0008 (users V2) · 0010 (new tables) 적용 필요
- 단, 0009 (issues V2) · 0011~0015 (다른 V2 변경분) 가 사이에 끼어 있어 단순 `upgrade head` 위험

### 7.2 회수 옵션 비교

| 옵션 | 절차 | 장점 | 위험 |
|------|------|-----|-----|
| **A) `alembic upgrade head`** | 0007~0015 일괄 적용 | 정도 (alembic 의 정상 흐름) | V1→V2 ENUM cast · 부분 적용된 컬럼 충돌 |
| **B) 결손 분만 멱등 보강 + `alembic stamp head`** | terms 관련 부분만 SQL 수동 INSERT, alembic_version 만 head 로 stamp | 즉시 안전 | 다른 V2 변경분도 함께 점검 필요 |
| **C) 0010a hotfix 마이그레이션 신설** | 신규 단일 마이그레이션 = `IF NOT EXISTS` 로 terms_kind ENUM + terms_versions + user_term_agreements + users.terms_version_id 생성, down_revision='0006' | 명시적, 추적 가능 | 향후 0007~0009 적용 시 충돌 가능 |

**선택**: **옵션 C** — 신규 hotfix 마이그레이션. 멱등 + 명시적 + 추후 0007~0015 적용 시에도 IF NOT EXISTS 로 무해.

### 7.3 신규 마이그레이션 파일

`backend/alembic/versions/0016_terms_hotfix.py`

```python
"""Hotfix: terms_versions, user_term_agreements, terms_kind, users.terms_version_id 결손 보강.

배경:
  - 본 환경은 alembic_version=0006 에서 정체된 dev DB.
  - 0007 (terms_kind enum), 0008 (users.terms_version_id), 0010 (terms_versions/user_term_agreements)
    이 부분 적용되거나 미적용 상태.
  - 본 마이그레이션은 모두 IF NOT EXISTS 로 멱등 적용한다.

Revision ID: 0016
Revises: 0015  (또는 현재 head)
Create Date: 2026-06-01
"""
from alembic import op

revision = '0016'
down_revision = '0015'  # 또는 알려진 최신 head
branch_labels = None
depends_on = None


def upgrade() -> None:
    # terms_kind ENUM (0007 의 잔재)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'terms_kind') THEN
                CREATE TYPE terms_kind AS ENUM ('privacy', 'service');
            END IF;
        END $$;
    """)

    # users.terms_version_id (0008 의 잔재 — FK 는 terms_versions 생성 후)
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version_id UUID")

    # terms_versions
    op.execute("""
        CREATE TABLE IF NOT EXISTS terms_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kind terms_kind NOT NULL,
          version VARCHAR(20) NOT NULL,
          body TEXT NOT NULL,
          effective_at TIMESTAMPTZ NOT NULL,
          require_reconsent BOOLEAN NOT NULL DEFAULT FALSE,
          published_at TIMESTAMPTZ,
          published_by UUID REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_terms_versions_effective_at ON terms_versions(effective_at)")

    # user_term_agreements
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_term_agreements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          terms_version_id UUID NOT NULL REFERENCES terms_versions(id) ON DELETE CASCADE,
          agreed_at TIMESTAMPTZ NOT NULL,
          UNIQUE (user_id, terms_version_id)
        )
    """)

    # users.terms_version_id FK (이미 있으면 NO-OP)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'users' AND constraint_name = 'fk_users_terms_version'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT fk_users_terms_version
                    FOREIGN KEY (terms_version_id) REFERENCES terms_versions(id);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_terms_version")
    op.execute("DROP TABLE IF EXISTS user_term_agreements")
    op.execute("DROP TABLE IF EXISTS terms_versions")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS terms_version_id")
    op.execute("DROP TYPE IF EXISTS terms_kind")
```

### 7.4 적용 절차

```bash
# 1. DB 백업 (dev 라도 안전 절차)
pg_dump -h localhost -U uscp uscp > /tmp/uscp-pre-0016.sql

# 2. dry-run (SQL 확인)
docker compose exec backend alembic upgrade 0016 --sql > /tmp/0016.sql
less /tmp/0016.sql

# 3. 적용
docker compose exec backend alembic upgrade 0016

# 4. 검증
docker compose exec db psql -U uscp -c "\dt terms_versions"
docker compose exec db psql -U uscp -c "\d users" | grep terms_version_id
```

### 7.5 롤백 계획

- 발행본 데이터 없음 (운영자 첫 발행 전) → `alembic downgrade 0015` 안전
- 발행 후 롤백 필요시 → `pg_dump` 로 데이터 export → downgrade → 재구축

---

## 8. Backend Service Changes

### 8.1 신규 함수 (terms_service.py 추가)

```python
async def get_reconsent_impact_v2(
    db: AsyncSession, *, kind: str
) -> dict[str, int]:
    """M07-14 발행 영향 회원수 사전 계산 (운영자 발행 직전 표시용)."""
    # SQL: §4.2.1 참조
```

### 8.2 보강 (auth_service.signup_v2)

회원가입 마지막에 `record_agreement_v2()` 호출 추가:

```python
# 기존
if latest_terms_id:
    # users.terms_version_id 만 INSERT
    ...

# 신규 보강
if latest_terms_id:
    await record_agreement_v2(
        db, user_id=str(user_id), terms_version_id=str(latest_terms_id)
    )
```

### 8.3 보강 (publish_terms_v2 audit_logs)

§6.3 의 audit INSERT 를 함수 내 commit 직전에 추가.

---

## 9. Testing Strategy

### 9.1 E2E (Playwright §10.3.3 6항)

`frontend/tests/e2e/m07-cms/m07-terms-admin.spec.ts` (신규, 8 specs):

| ID | 검증 항목 | 6항 |
|----|---------|-----|
| T-01 | operator 가 약관 v1 발행 → 시민 페이지 자동 전환 | Happy |
| T-02 | body 빈값 → 422 + 에러 toast | Error |
| T-03 | citizen 이 /admin/cms/terms 직접 접근 → /?error=admin_required redirect | 권한 |
| T-04 | KindTabs 키보드 ArrowLeft/Right + URL search param `?kind=service` 유지 | URL |
| T-05 | 발행 ConfirmModal 표시 + ESC 무효 + focus trap | Modal |
| T-06 | TipTapEditor 도구 모음 Tab 네비 + aria-label 검출 | A11y |
| T-07 | require_reconsent=true 발행 후 시민 로그인 → ReconsentModal 강제 노출 | Integration |
| T-08 | 거부 → force_logout → /login?reason=reconsent_declined | Integration |

### 9.2 백엔드 단위 테스트

`backend/tests/application/test_terms_service.py` (신규):

- `test_publish_terms_v2_v1_initial` — 초판 → version='v1'
- `test_publish_terms_v2_v2_after_v1` — 자동 v2
- `test_publish_terms_v2_body_too_short` — 422 body_too_short
- `test_get_current_terms_v2_published_only` — published_at IS NULL 제외
- `test_get_reconsent_impact_v2` — 활성·미동의 회원수 정확성

### 9.3 통합 — Reconsent Middleware

- v2 발행 직후 60s 캐시 만료 → 다음 API 호출 409 needs_reconsent
- 동의 → users.terms_version_id 갱신 → 다음 호출 200
- 거부 → force_logout=true → logout endpoint 통과

---

## 10. Implementation Order

P0 우선, P1 보강, P2 옵션. 1~2 일 작업.

| 순서 | 작업 | 파일 | 의존 |
|------|------|------|------|
| 1 | DB 마이그레이션 0016 hotfix 작성 + 적용 | `backend/alembic/versions/0016_terms_hotfix.py` | — |
| 2 | `get_reconsent_impact_v2` 함수 추가 | `backend/app/application/terms_service.py` | 1 |
| 3 | `/admin/cms/terms/{kind}/impact` endpoint 추가 | `backend/app/presentation/cms/admin_router.py` | 2 |
| 4 | `/admin/cms/terms/preview` endpoint 추가 (POST) | 동상 | 1 |
| 5 | `publish_terms_v2` 에 audit_logs INSERT 추가 | terms_service.py | 1 |
| 6 | `auth_service.signup_v2` 에 record_agreement_v2 호출 추가 | auth_service.py | 1 |
| 7 | FE API 함수 추가 (`publishTerms` / `listTermsVersions` / `getReconsentImpact` / `getCurrentTerms` / `previewTerms`) | `frontend/src/features/cms/api/index.ts` | 3, 4 |
| 8 | FE types 추가 | `frontend/src/features/cms/types/index.ts` | — |
| 9 | `/admin/cms/terms` page + 5개 컴포넌트 작성 | `frontend/src/app/admin/cms/terms/page.tsx` | 7 |
| 10 | Admin sidebar NAV 항목 추가 | `frontend/src/app/admin/layout.tsx` | 9 |
| 11 | E2E spec 8 건 작성 + Playwright 실행 | `frontend/tests/e2e/m07-cms/m07-terms-admin.spec.ts` | 9 |
| 12 | 시민 측 `/terms/[kind]` 페이지 — DB 본문 자동 전환 회귀 테스트 | 기존 `app/(public)/terms/[kind]/page.tsx` | 9 |

---

## 11. Risks & Mitigation (Design 단계 추가 확인)

| Risk | Mitigation |
|------|-----------|
| 0016 hotfix 적용 후 alembic head 추적 혼란 | down_revision 을 명확히 (0006 또는 0015 — 환경 의존, 적용 직전 결정) + DB 백업 |
| Tiptap 의 ProseMirror JSON 과 HTML 형식 불일치 | 저장 시 `editor.getHTML()` 만 사용 (JSON 은 무시) |
| Tiptap 출력에 의도치 않은 inline style (e.g. `style="color:..."`) 혼입 | sanitize.ts allow-list 에 `style` 미포함 — 자동 제거됨 |
| 발행 후 60s 캐시로 인해 일부 회원에 즉시 적용 안 됨 | UI 안내: "최대 1분 내 적용" + Middleware 캐시 키 invalidate API 추후 검토 |
| 발행 폼 도중 페이지 이탈 시 작성 본문 손실 | `beforeunload` 가드만 적용 ("작성 중인 본문이 사라집니다. 계속하시겠습니까?"). localStorage draft 저장은 **미사용** (Q4 결정 — 법적 문서 기밀 가능성) |
| Operator 1인 체제 — 자체 발행 검증 부재 | audit_logs 사후 추적 + 발행 직전 ConfirmModal 의 "본문 수정 불가" 경고 |

---

## 12. Resolved Decisions (Design 리뷰 결과, 2026-06-01)

| # | 항목 | 결정 | 근거 |
|---|------|------|------|
| Q1 | 본문 최소 길이 (`body_too_short` 임계값) | **100자** | 스팸/실수 방지의 최소선. 표준 약관 골격(`static-terms.ts`)도 100자 훌쩍 초과 → 정상 발행 차단 위험 없음 |
| Q2 | 시행일 미래 일자 발행본 노출 | **시행 전이라도 발행본은 `current` 로 노출** | 운영자가 사전 발행 + 시행일 공지 가능 (제3조 "개정 시 7/30일 전 공지") |
| Q3 | `require_reconsent` 영향 회원수 fetch 시점 | **토글 ON 즉시** | 운영자 의사결정 직전 정보 제공. 토글 OFF/재 ON 시 재조회 (캐시 X) |
| Q4 | 본문 draft 저장 (localStorage) | **미보존** | 약관 본문은 법적 문서·기밀 가능성 — 클라이언트 영구 저장 회피. beforeunload 가드만 적용 |
| Q5 | 다른 V2 마이그레이션 (0011~0015) | **본 PDCA 불포함** | 별도 PDCA `migration-recovery` 로 분리 — 0016 hotfix 는 `IF NOT EXISTS` 라 충돌 없음 |

### 12.1 결정 반영 — 구현 영향 요약

- **Q1 → §4.3** 그대로 (`body_too_short` = 100자)
- **Q2 → §5.1** 와이어프레임 CurrentTermsCard 에 "시행일: 2026-08-20 (미래)" 표시 + 안내 문구 "시행일까지 X일 남음"
- **Q3 → §5.1·§4.2.1** PublishForm 의 `RequireReconsentToggle` `onChange` 핸들러에서 즉시 `getReconsentImpact(kind)` 호출, 결과를 토글 옆 회색 박스에 표시. OFF 전환 시 박스 숨김. 캐시 미사용
- **Q4 → §11** "draft 저장" Risk 행 제거 — `beforeunload` 가드만 유지 ("작성 중인 본문이 사라집니다. 계속하시겠습니까?")
- **Q5 → §7** 0016 hotfix 의 `down_revision = '0006'` 으로 고정 (현재 stamp 위치) — 추후 0007~0015 가 적용되어도 `IF NOT EXISTS` 로 무해

---

## 13. Acceptance Criteria (Design 통과 기준)

- [x] 모든 UI 컴포넌트가 mockup `admin/terms.html` 톤과 일치 (KindTabs · CurrentTermsCard · PublishForm · VersionHistoryTable)
- [x] Tiptap 재사용 — 신규 에디터 컴포넌트 X
- [x] API 신규 endpoint 2 건만 추가 (`impact`, `preview`) — 변경 최소화
- [x] 마이그레이션 0016 hotfix 멱등 — 기존 V2 마이그레이션 충돌 없음
- [x] 6항 검증 E2E 8 spec 정의
- [x] 보안: XSS 이중 정화 + audit_logs + operator 권한
- [x] 접근성: WCAG 2.1 AA 체크리스트 5종

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-01 | Initial draft — Plan §6.2 의 Tiptap 결정 검증 + UI 와이어 + 신규 API 2 건 + 0016 hotfix 마이그레이션 | PM + FE Arch |
| 0.2 | 2026-06-01 | Open Questions → Resolved Decisions (Q1 100자 / Q2 미래 시행일 노출 / Q3 토글 ON 즉시 / Q4 localStorage 미사용 / Q5 다른 마이그 분리) | 사용자 결정 반영 |
