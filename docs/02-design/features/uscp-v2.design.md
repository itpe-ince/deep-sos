---
template: design
version: 1.0
feature: uscp-v2
date: 2026-05-27
author: 당사 PM
project: USCP (Union Social Contribution Platform)
status: Draft
planning_doc: docs/01-plan/features/uscp-v2.plan.md
basis: USCP_견적서_20260516.xlsx (부가세 포함 5,500만 원)
---

# USCP V2 — 플랫폼 시스템 설계 문서

> **Summary**: 5,500만 원 합의 범위(9개 모듈·116개 기능·24개 화면)를 실제로 구축하기 위한 시스템 설계서. 데이터 모델·API·인증·알림·파일·프론트엔드 라우팅·핵심 흐름을 정의한다.
>
> **Project**: USCP V2 (플랫폼 시스템 구축)
> **Author**: 당사 PM
> **Date**: 2026-05-27
> **Status**: Draft
> **Planning Doc**: [uscp-v2.plan.md](../../01-plan/features/uscp-v2.plan.md)

---

## 1. Overview

### 1.1 Design Goals

본 설계는 다음 4가지 목표를 충족한다.

1. **합의 범위 충실성**: 9개 모듈 116개 기능 1:1 매핑, 본 사업 범위 외 기능 추가 차단
2. **운영 단순성**: 운영자 단일 역할, 단일 호스트 Docker Compose, Uptime Kuma 모니터링
3. **확장 가능성**: 4년차 이후 기능 확장 시 모듈 단위 추가가 가능한 Clean Architecture
4. **법적 준수**: 개인정보 통합 동의·1년 보관·14세 확인·감사 로그·HTTPS

### 1.2 Authoritative References

| 참조 | 위치 |
|---|---|
| 메뉴 구조도 (24 화면) | `docs/01-plan/uscp-sitemap.md` |
| 기능 목록 (9모듈 116기능, 2026-08-20 오픈) | `docs/01-plan/uscp-feature-list.md` |
| **기능 상세 명세서 (116개 기능별 목적·입력·처리·응답·권한·예외·연관)** | [`docs/02-design/features/uscp-feature-spec.md`](./uscp-feature-spec.md) |
| 본 PDCA Plan | `docs/01-plan/features/uscp-v2.plan.md` |
| 견적 정본 | `USCP_견적서_20260516.xlsx` |

---

## 2. System Architecture

### 2.1 컴포넌트 다이어그램

```
                            ┌─────────────────┐
                            │   사용자 브라우저  │
                            └────────┬────────┘
                                     │ HTTPS (443)
                            ┌────────▼────────┐
                            │   nginx 1.27    │  ← reverse proxy + TLS
                            └────────┬────────┘
                  ┌──────────────────┼──────────────────┐
                  ↓                  ↓                  ↓
        ┌──────────────────┐ ┌─────────────┐  ┌────────────────┐
        │  Next.js 15 SSR  │ │  FastAPI    │  │   Static files │
        │  (web container) │ │  (api, 4w)  │  │   (uploads via │
        └────────┬─────────┘ └──────┬──────┘  │    presigned)   │
                 │ API calls       │           └────────────────┘
                 └─────────┬───────┘
                           │
        ┌──────────┬───────┴───────┬──────────┐
        ↓          ↓               ↓          ↓
   ┌────────┐ ┌─────────┐  ┌──────────┐ ┌──────────┐
   │ Postgres│ │ Redis 7 │  │ MinIO    │ │ SMTP     │
   │ 16+PostGIS│ Cache/Q │  │ Object S │ │ (외부)   │
   └────────┘ └─────────┘  └──────────┘ └──────────┘

   ┌──────────────────────────────────────────────┐
   │  Uptime Kuma → Slack #uscp-alerts (5min ping)│
   │  Sentry (Optional) → 에러 추적                │
   │  daily cron: pg_dump + mc mirror → /backup   │
   └──────────────────────────────────────────────┘
```

### 2.2 Backend Clean Architecture

```
backend/app/
├── presentation/       ← FastAPI Routers (HTTP layer)
│   ├── auth/router.py
│   ├── users/router.py
│   ├── issues/router.py            (시민 제보·공감·댓글)
│   ├── gatekeeping/router.py       (운영자 6단계 워크플로우)
│   ├── projects/router.py          (리빙랩)
│   ├── mentors/router.py           (멘토·학생팀)
│   ├── organizations/router.py     (협력 기관·MOU)
│   ├── kpi/router.py               (성과자료)
│   ├── cms/router.py               (공지·이벤트·자료실·배너·약관)
│   ├── audit/router.py             (감사 로그)
│   ├── common/router.py            (홈 통계·지도 데이터)
│   └── middleware/                  (JWT auth, audit, cors, rate limit)
│
├── application/         ← Use Cases (비즈니스 로직)
│   ├── auth_service.py
│   ├── issue_service.py
│   ├── gatekeeping_service.py      ← 6단계 워크플로우 핵심
│   ├── notification_service.py     ← 이메일 큐 트리거
│   ├── project_service.py
│   ├── mentor_matching_service.py
│   ├── ...
│
├── domain/              ← Entities + Value Objects (DB 무관)
│   ├── user.py, role.py
│   ├── issue.py, vote.py, comment.py, issue_stage.py (Enum)
│   ├── project.py, deliverable.py, success_story.py, project_post.py, project_post_comment.py
│   ├── mentor.py, student_team.py, matching.py
│   ├── organization.py, mou.py
│   ├── kpi.py, performance_record.py
│   ├── content.py, notice.py, event.py, banner.py, terms.py, terms_version.py
│   ├── audit_log.py
│
├── infrastructure/      ← 외부 시스템 어댑터
│   ├── db/
│   │   ├── session.py             (asyncpg engine)
│   │   ├── repositories/           (각 도메인 Repository 구현)
│   │   └── migrations → alembic/
│   ├── email/
│   │   ├── smtp_client.py
│   │   ├── queue.py               (Redis 기반 큐)
│   │   └── templates/             (Jinja2)
│   ├── storage/
│   │   ├── minio_client.py
│   │   └── presigned.py
│   ├── external/
│   │   └── kakao_map_proxy.py     (Optional, 키 보호)
│   └── audit/
│       └── audit_writer.py         (감사 로그 비동기 기록)
│
└── main.py
```

### 2.3 Frontend Module Structure

```
frontend/src/
├── app/                            (Next.js App Router)
│   ├── layout.tsx                  (Root: Header/Footer/Theme)
│   ├── page.tsx                    (#1 홈)
│   ├── about/page.tsx              (#2 USCP 소개)
│   ├── issues/
│   │   ├── page.tsx                (#3 지역문제 광장)
│   │   └── [id]/page.tsx           (#4 제보 상세)
│   ├── projects/
│   │   ├── page.tsx                (#5 리빙랩 목록)
│   │   └── [id]/page.tsx           (#6 리빙랩 상세)
│   ├── success-cases/page.tsx      (#7 성공사례)
│   ├── network/page.tsx            (#8 협력 네트워크)
│   ├── performance/page.tsx        (#9 성과자료)
│   ├── login/page.tsx              (#10 로그인/회원가입)
│   │
│   ├── (user)/                     ← 로그인 게이트
│   │   ├── user/issue-new/page.tsx (#11 제보 작성)
│   │   ├── user/my-activities/page.tsx (#12 내 활동)
│   │   └── user/profile/page.tsx   (#13 프로필)
│   │
│   └── (admin)/                    ← 운영자 게이트
│       ├── admin/dashboard/page.tsx        (#14)
│       ├── admin/issues/page.tsx           (#15)
│       ├── admin/issues/[id]/page.tsx      (#16)
│       ├── admin/projects/page.tsx         (#17)
│       ├── admin/success-cases/page.tsx    (#18)
│       ├── admin/mentors/page.tsx          (#19)
│       ├── admin/organizations/page.tsx    (#20)
│       ├── admin/kpi/page.tsx              (#21)
│       ├── admin/cms-banners/page.tsx      (#22)
│       ├── admin/terms/page.tsx            (#23)
│       └── admin/users/page.tsx + audit    (#24)
│
├── features/                       (9개 모듈 매핑)
│   ├── auth/        (M01)
│   ├── issues/      (M02)
│   ├── projects/    (M03)
│   ├── mentors/     (M04)
│   ├── organizations/(M05)
│   ├── kpi/         (M06)
│   ├── cms/         (M07)
│   ├── audit/       (M08)
│   └── common/      (M09: KakaoMap, Header, Footer, Editor)
│
├── components/ui/                  (Atomic — Button, Input, Modal, ConfirmModal, Toast, ToastProvider, EmptyState, Skeleton, Pagination, DataTable, Tabs, Badge — §7.2 강제)
├── lib/
│   ├── api.ts                      (axios + JWT refresh interceptor)
│   ├── auth.ts                     (session helpers)
│   ├── validators/                  (Zod schemas)
│   └── utils.ts
└── styles/globals.css
```

### 2.4 라우팅 아키텍처 (🚨 절대 규칙)

> **본 절은 2026-05-30 합의 사항.** SPA 사용성과 URL 직접 호출 호환성을 동시에 만족하여, 새로 고침·북마크·뒤로가기·딥링크 공유가 모두 정상 동작하도록 보장한다.

#### 2.4.1 원칙

- **SPA UX**: 사용자가 메뉴·링크 클릭으로 페이지 전환 시 **전체 페이지 리로드 없이** 클라이언트 라우터가 처리 → Next.js `<Link>` / `useRouter().push()` 사용.
- **브라우저 URL 라우팅 (필수)**: 모든 페이지·상세 페이지는 **고유한 URL** 을 가진다. 새 탭에서 URL 직접 입력 또는 새 고침 (F5) 시 **반드시** 해당 페이지로 즉시 진입 가능해야 한다.
- **딥링크 호환**: `/issues/123`, `/projects/45`, `/admin/issues/678` 등 동적 경로 모두 SSR fallback 으로 즉시 응답.
- **❌ 금지**:
  - 해시 기반 라우팅 (`/#/issues/123`) — Next.js App Router 가 표준 path 기반 라우팅을 강제하므로 우발 위험 낮음, 단 PR review 시 점검.
  - 상태(state) 만으로 화면 전환 (URL 미변경) — 모달 단독 화면 전환은 허용, **상세 페이지 (full-screen) 는 반드시 URL 분리**.
  - 클라이언트 라우팅 후 URL 미동기화 (`history.replaceState` 누락 등).

#### 2.4.2 구현 가이드

| 시나리오 | 구현 방법 |
|---|---|
| 메뉴·카드 클릭 → 페이지 전환 | `<Link href="/issues/[id]">` (prefetch 자동) |
| 프로그래매틱 전환 | `const router = useRouter(); router.push('/issues/123')` |
| 상세 페이지 URL 직접 진입 (F5·새 탭) | Next.js dynamic route `app/issues/[id]/page.tsx` 가 SSR 로 응답, 클라이언트 진입과 동일 화면 보장 |
| 검색 필터 상태 보존 | URL query string 사용 (`?region=daejeon&stage=published&q=횡단보도`) — 새 고침·공유 시 동일 결과 |
| 페이지네이션 | URL query string `?page=3` — 뒤로가기 시 이전 페이지 복원 |
| 모달 단독 표시 | URL 변경 없음 (state). 단 "약관 모달" 등 광역은 URL `?modal=terms` 권장 |
| 인증 필요 페이지 직접 진입 | middleware (server-side) 에서 redirect, redirect URL 에 `?next=/user/profile` 부여 → 로그인 후 복귀 |
| 404 처리 | `app/not-found.tsx` 정의 → 모든 미정의 경로에 적용 |

#### 2.4.3 검증 체크리스트

각 화면 구현 시 다음 4 항목을 모두 통과해야 한다 (Playwright E2E §10.3 으로 자동 검증):

- [ ] 메뉴 클릭으로 진입 → URL 변경 + 화면 전환
- [ ] 진입 후 새 고침 (F5) → 동일 화면 즉시 표시
- [ ] 진입 후 URL 복사 → 새 탭/시크릿 창에서 붙여넣기 → 동일 화면 진입 (또는 인증 redirect 정상 동작)
- [ ] 뒤로가기/앞으로가기 → 이전·다음 페이지 정확히 복원

---

## 3. Data Model (ERD)

### 3.1 핵심 엔티티 (PostgreSQL 16 + PostGIS)

```
┌──────────────────────────────────────────────────────────────┐
│                          USERS                                │
│ id PK · email UNIQUE · password_hash · name · phone           │
│ role ENUM('citizen','operator','mentor','student')            │
│ status ENUM('active','suspended','withdrawn')                 │
│ birth_year (만 14세 확인용) · agreed_at · terms_version_id FK  │
│ created_at · updated_at · last_login_at                       │
└─────────────────┬────────────────────────────────────────────┘
                  │ 1:N
   ┌──────────────┼────────────────┬────────────┬─────────────┐
   ↓              ↓                ↓            ↓             ↓
┌────────┐  ┌──────────┐  ┌──────────────┐ ┌────────┐ ┌──────────┐
│ ISSUES │  │  VOTES   │  │   COMMENTS   │ │ MENTORS│ │STUDENT_  │
│        │  │ user-issue│  │ user-issue  │ │ user_id│ │ TEAMS    │
│        │  │ UNIQUE    │  │             │ │ approved│ │ leader_id│
└───┬────┘  └──────────┘  └──────────────┘ └────────┘ └────────┬─┘
    │ 1:N (stage history)                                       │
    ↓                                                            │ N:M
┌──────────────────────────┐                                    ↓
│   ISSUE_STAGE_HISTORY    │                              ┌──────────┐
│ issue_id FK · prev_stage  │                              │ TEAM_    │
│ next_stage · actor_id FK  │                              │ MEMBERS  │
│ reason · created_at       │                              └──────────┘
└──────────────────────────┘
        │
        │ N:1
        ↓
┌──────────────────────┐    ┌──────────────────────────┐
│      PROJECTS        │    │       MATCHINGS          │
│ id · region (5)      │←───│ project_id FK            │
│ stage (단계 ENUM)    │    │ mentor_id FK · team_id FK│
│ title · summary      │    │ matched_at · notified_at │
│ start_at · end_at    │    │ status (단순 통보형)      │
└──────┬───────────────┘    └──────────────────────────┘
       │ N:M (M03-14, H01)
       ↓
┌──────────────────────────┐
│      PROJECT_ISSUES      │  의제↔리빙랩 N:M join table
│ project_id FK · issue_id │  uniq(project_id, issue_id)
│ linked_by · linked_at    │  (issues ↔ projects 양방향 다대다)
└──────────────────────────┘
       │
┌──────┴───────────────┐
       │ 1:N
       ├──────────────┬──────────────────┬─────────────────────┐
       ↓              ↓                  ↓                     ↓
┌────────────┐ ┌──────────────┐  ┌───────────────────┐  ┌──────────────────┐
│ TIMELINE_  │ │ DELIVERABLES │  │ SUCCESS_STORIES   │  │ PROJECT_POSTS    │
│ ENTRIES    │ │ file_url     │  │ problem · process │  │ project_id FK    │
│ date·title │ │ stage·tags   │  │ result · policy   │  │ author_id FK     │
└────────────┘ └──────────────┘  └───────────────────┘  │ title · body     │
                                                         │ attachment_key?  │
                                                         │ created_at       │
                                                         └────────┬─────────┘
                                                                  │ 1:N
                                                                  ↓
                                                         ┌──────────────────┐
                                                         │ PROJECT_POST_    │
                                                         │ COMMENTS         │
                                                         │ post_id FK       │
                                                         │ author_id FK     │
                                                         │ body·created_at  │
                                                         └──────────────────┘
                                                         (멤버 전용 비공개 —
                                                          MATCHINGS 또는 운영자
                                                          권한 검증 후 접근)

┌────────────────────┐  ┌────────────────┐  ┌──────────────────────┐
│ ORGANIZATIONS      │  │ MOUS           │  │ CONTENTS             │
│ id·name·category   │←─│ org_id FK      │  │ category ENUM        │
│ (지·산·학·관)      │  │ start·expire   │  │  (notice|event)      │
└────────────────────┘  └────────────────┘  │ title·body(WYSIWYG)  │
                                            │ pinned·published_at  │
                                            └──────────────────────┘

┌────────────────────┐  ┌────────────────────┐  ┌──────────────────────┐
│ KPI_INDICATORS     │  │ PERFORMANCE_       │  │ TERMS_VERSIONS       │
│ name·formula·unit  │←─│ RECORDS            │  │ kind(privacy/service)│
│                    │  │ kpi_id·period·val  │  │ body·version·        │
└────────────────────┘  │ auto_count_source  │  │ effective_at·        │
                        └────────────────────┘  │ require_reconsent BOOL│
                                                └──────────────────────┘

┌────────────────────┐  ┌──────────────────────┐  ┌──────────────┐
│ BANNERS            │  │ ATTACHMENTS (자료실) │  │ AUDIT_LOGS   │
│ image_url·link     │  │ minio_key·meta_json  │  │ actor·action │
│ order·active       │  │ category(자료실)      │  │ target·ip·ua │
└────────────────────┘  └──────────────────────┘  └──────────────┘
```

### 3.2 PostgreSQL Enums

```sql
CREATE TYPE user_role AS ENUM ('citizen','operator','mentor','student');
CREATE TYPE user_status AS ENUM ('active','suspended','withdrawn');
CREATE TYPE region AS ENUM ('daejeon','gongju','yesan','cheonan','sejong');
CREATE TYPE issue_stage AS ENUM (
  'reported','reviewing','published','mentor_assigned','in_progress','resolved'
);
CREATE TYPE issue_track AS ENUM (
  'policy_reflection',   -- 정책반영
  'policy_reference',    -- 정책참고
  'citizen_autonomy'     -- 시민자율
);
CREATE TYPE content_category AS ENUM ('notice','event');
CREATE TYPE resource_category AS ENUM ('guide','template','toolkit','etc');
CREATE TYPE project_stage AS ENUM ('recruiting','in_progress','completed');
CREATE TYPE organization_category AS ENUM ('public','industry','academic','government');
CREATE TYPE terms_kind AS ENUM ('privacy','service');
CREATE TYPE audit_action AS ENUM ('login','logout','create','update','delete','view_pii','stage_change');
```

### 3.3 핵심 테이블 컬럼 요약

| 테이블 | 핵심 컬럼 | 인덱스 |
|---|---|---|
| `users` | email, role, status, birth_year, agreed_at | uniq(email), btree(role,status) |
| `issues` | reporter_id, region, stage, **track** (NULL OK, 검토중 진입 시 지정), title, body, location(geography) | btree(region,stage), btree(track), gist(location), **trigram_idx(title) + trigram_idx(body)** (M02-20 키워드 검색용 `pg_trgm` 확장 활용) |
| `issue_stage_history` | issue_id, prev_stage, next_stage, actor_id | btree(issue_id, created_at) |
| `votes` | user_id, issue_id | uniq(user_id, issue_id) |
| `projects` | region, stage | btree(region,stage) |
| `project_issues` (M03-14 의제↔리빙랩 **N:M**, H01 결정) | project_id FK, issue_id FK, linked_by, linked_at | uniq(project_id, issue_id), btree(project_id), btree(issue_id) |
| `deliverables` | project_id, stage, minio_key | btree(project_id, stage) |
| `matchings` | project_id, mentor_id, team_id | btree(project_id) |
| `project_posts` | project_id, author_id, title, body, attachment_key, created_at | btree(project_id, created_at desc) |
| `project_post_comments` | post_id, author_id, body, created_at | btree(post_id, created_at) |
| `audit_logs` | actor_id, action, target_type, created_at | btree(created_at), btree(actor_id) |
| `attachments` | minio_key, **category** (guide/template/toolkit/etc), **download_count INT DEFAULT 0**, title, tags, uploaded_by | btree(category), btree(download_count desc) |

### 3.4 보존·파기 정책

| 데이터 | 보존 기간 | 사유 |
|---|---|---|
| `audit_logs` | 최소 1년 (자동 만료) | 법적 의무 |
| `users` (탈퇴 후) | 즉시 익명화, 90일 후 완전 파기 | 개인정보보호법 |
| `issue_stage_history` | 영구 | 의제 진행 이력 |
| `terms_versions` | 영구 | 약관 동의 추적 |
| `notifications_sent` | 1년 | 디버깅·이중 발송 방지 |
| MinIO 첨부 | 영구 (정책 미정 시 1년 후 재검토) | 산출물 가치 |

---

## 4. API Design (FastAPI)

### 4.1 API 구조 원칙

- **Base**: `/api/v1/`
- **인증**: JWT Bearer (Access 1h / Refresh 7d) — `Authorization: Bearer <token>`
- **응답 포맷**: JSON, 에러는 RFC 7807 Problem Details
- **페이지네이션**: cursor 기반 (`?cursor=xxx&limit=20`)
- **OpenAPI**: `/api/docs` 자동 생성

### 4.2 모듈별 엔드포인트 요약

#### M01. 회원·인증 (`/api/v1/auth`, `/api/v1/users`)

| Method | Path | 권한 |
|---|---|---|
| POST | `/auth/signup` | public (14세 확인·통합 동의 검증) |
| POST | `/auth/login` | public |
| POST | `/auth/logout` | citizen+ |
| POST | `/auth/refresh` | (refresh token) |
| POST | `/auth/password/reset-request` | public |
| POST | `/auth/password/reset` | (reset token) |
| POST | `/auth/password/change` | citizen+ |
| POST | `/auth/email/verify` | (verify token) |
| GET | `/users/me` | citizen+ |
| PATCH | `/users/me` | citizen+ |
| DELETE | `/users/me` | citizen+ (탈퇴) |

#### M02. 지역문제 제보·게이트키핑 (`/api/v1/issues`, `/api/v1/admin/issues`)

| Method | Path | 권한 |
|---|---|---|
| GET | `/issues` | public (필터: region, stage, **track**, **q**(키워드 검색 — title/body ILIKE), sort) |
| GET | `/issues/{id}` | public |
| POST | `/issues` | citizen+ (제보 등록) |
| POST | `/issues/{id}/vote` | citizen+ (공감 1인 1회) |
| DELETE | `/issues/{id}/vote` | citizen+ (공감 취소) |
| GET | `/issues/{id}/comments` | public |
| POST | `/issues/{id}/comments` | citizen+ |
| DELETE | `/comments/{id}` | author or operator |
| GET | `/admin/issues` | operator (큐 + 필터) |
| POST | `/admin/issues/{id}/transition` | operator (단계 전환, reviewing 진입 시 `track` 필수) |
| PATCH | `/admin/issues/{id}/track` | operator (트랙 라벨 단독 변경) |
| POST | `/admin/issues/{id}/reject` | operator (반려 + 사유) |
| GET | `/admin/issues/{id}/history` | operator |
| GET | `/admin/issues/stats` | operator (단계별·지역별·트랙별 처리 통계 카운트, **M02-18 매핑** — 대시보드 차트 데이터 제공, `btree(stage, region)` 인덱스 활용) |
| GET | `/admin/issues` | operator (큐 + 필터 + **q**(키워드 검색), M02-20 매핑) |
| POST | `/admin/issues/{id}/resolve-by-comment` | operator (댓글로 해결 종결 처리 — issues.stage='resolved', reason='comment_resolution' + 알림 발송, **M02-21·CMT-04 매핑**) |
| PATCH | `/comments/{id}` | author or operator (**댓글 수정**, M02-05 보강) |

#### M03. 리빙랩 운영 (`/api/v1/projects`, `/api/v1/admin/projects`)

| Method | Path | 권한 |
|---|---|---|
| GET | `/projects` | public (필터: region, stage) |
| GET | `/projects/{id}` | public |
| GET | `/projects/{id}/timeline` | public |
| GET | `/projects/{id}/deliverables` | public |
| GET | `/success-cases` | public |
| POST | `/admin/projects` | operator |
| PATCH | `/admin/projects/{id}` | operator |
| POST | `/projects/{id}/timeline` | **project-member + operator** (M03-08, 매칭 멤버는 자신 프로젝트만) |
| PATCH | `/projects/{id}/timeline/{entry_id}` | **author or operator** (작성자 본인 수정·삭제 가능) |
| POST | `/projects/{id}/deliverables` | **project-member + operator** (M03-09, presigned URL 발급, uploaded_by 자동 기록) |
| PATCH | `/admin/deliverables/{id}` | **uploaded_by or operator** (M03-10, 업로드자 본인 메타데이터 수정 가능) |
| POST | `/admin/success-cases` | operator |
| GET | `/projects/{id}/posts` | **project-member** (매칭된 멘토·학생팀·운영자만) |
| GET | `/projects/{id}/posts/{post_id}` | project-member |
| POST | `/projects/{id}/posts` | project-member (작성) |
| PATCH | `/projects/{id}/posts/{post_id}` | author or operator |
| DELETE | `/projects/{id}/posts/{post_id}` | author or operator |
| POST | `/projects/{id}/posts/{post_id}/attachment` | project-member (presigned URL 발급, 1개 제한) |
| GET | `/projects/{id}/posts/{post_id}/comments` | project-member |
| POST | `/projects/{id}/posts/{post_id}/comments` | project-member |
| PATCH | `/comments/project-posts/{comment_id}` | author or operator |
| DELETE | `/comments/project-posts/{comment_id}` | author or operator |

> **`project-member` 권한 정의**: `matchings` 테이블에서 해당 `project_id`에 대해 `mentor_id`/`team_id`로 매칭된 사용자 또는 `users.role='operator'`. 미매칭 시민 회원은 403 반환. `Depends(require_project_member(project_id))` 미들웨어로 일괄 처리.

#### M04. 멘토·학생팀 매칭 (`/api/v1/admin/mentors`)

> 경로 정정 (Sprint 4 구현 정합, v9.0): 학생팀은 `/admin/teams`, 매칭은 리소스 중심 `/admin/matchings`(body.project_id), 본인 이력은 `/me/matching-history` 로 구현됨. 아래 표는 구현 SOT 기준.

| Method | Path | 권한 |
|---|---|---|
| GET | `/admin/mentors` | operator |
| POST | `/admin/mentors/grant` | operator (자격 부여, idempotent) |
| POST | `/admin/mentors/{mentor_id}/revoke` | operator (soft, 진행중 매칭 경고) |
| GET | `/admin/teams` | operator |
| POST | `/admin/teams` | operator |
| PATCH | `/admin/teams/{id}` | operator |
| DELETE | `/admin/teams/{id}` | operator (해체, soft) |
| POST | `/admin/matchings` | operator (수동 매칭 + 이메일 통보, body: project_id·mentor_ids·team_id) |
| DELETE | `/admin/matchings/{id}` | operator (매칭 해제) |
| GET | `/admin/matchings/project/{project_id}` | operator (프로젝트 활성 매칭 목록) |
| GET | `/projects/{id}/matching-activities` | 로그인 사용자 (M04-08 목록) |
| POST | `/projects/{id}/matching-activities` | **매칭된 멘토 본인 + operator** (M04-08, 회의·자문·검토 기록) |
| PATCH | `/projects/{id}/matching-activities/{activity_id}` | **author(멘토) or operator** |
| DELETE | `/projects/{id}/matching-activities/{activity_id}` | **author(멘토) or operator** |
| GET | `/me/matching-history` | citizen+ (M04-09 본인 매칭·활동 이력) |
| GET | `/admin/mentors/{user_id}/matching-history` | operator (M04-09 특정 멘토 이력) |

#### M05. 협력 네트워크 (`/api/v1/network`, `/api/v1/admin/organizations`)

> 경로 정정 (Sprint 5 구현 정합, v11.0): 공개 커뮤니티 상세·댓글, 프로그램·게시글 CRUD, 댓글 조정·만료 알림 발송 엔드포인트 반영(총 20라우트). 아래 표는 구현 SOT 기준.

| Method | Path | 권한 |
|---|---|---|
| GET | `/network/organizations` | public (M05-02, 활성만) |
| GET | `/network/mous` | public (M05-05, status 파생) |
| GET | `/network/community` | public (M05-07 목록) |
| GET | `/network/community/{post_id}` | public (M05-07 상세+댓글) |
| POST | `/network/community/{post_id}/comments` | citizen+ (M05-08 댓글 작성) |
| PATCH | `/network/community/comments/{comment_id}` | author only (M05-08 본인 댓글 수정) |
| POST | `/admin/organizations` | operator (M05-01 등록) |
| PATCH | `/admin/organizations/{id}` | operator (M05-01 수정) |
| DELETE | `/admin/organizations/{id}` | operator (**M05-01 삭제 — 연관 MOU·프로그램 시 409**) |
| PATCH | `/admin/organizations/{id}/active` | operator (**M05-09 활성·비활성 토글**) |
| POST | `/admin/organizations/{id}/mou` | operator (M05-03 MOU 등록) |
| GET | `/admin/mous/expiring` | operator (M05-04 만료 임박 목록) |
| POST | `/admin/mous/notify-expiring` | operator/cron (M05-04 알림 발송, 1회 마킹) |
| GET | `/admin/programs` | operator (M05-06 목록) |
| POST | `/admin/programs` | operator (M05-06 등록) |
| DELETE | `/admin/programs/{id}` | operator (M05-06 삭제) |
| POST | `/admin/community` | operator (M05-07 게시글 작성) |
| PATCH | `/admin/community/{post_id}` | operator (M05-07 수정) |
| DELETE | `/admin/community/{post_id}` | operator (M05-07 삭제) |
| POST | `/admin/community/comments/{comment_id}/moderate` | operator (M05-08 댓글 조정 hide/unhide/delete) |

#### M06. 성과자료 (`/api/v1/performance`, `/api/v1/admin/kpi`)

| Method | Path | 권한 |
|---|---|---|
| GET | `/performance` | public (대시보드) |
| GET | `/performance/export.csv` | public |
| GET | `/contents` | public (공지·이벤트 통합 게시판 — `?category=notice|event|all`) |
| GET | `/contents/{id}` | public (공지·이벤트 상세) |
| POST | `/admin/kpi/indicators` | operator |
| POST | `/admin/kpi/records` | operator |
| GET | `/admin/kpi/auto-counts` | operator (해결완료 자동 집계) |

#### M07. 콘텐츠 관리 (`/api/v1/admin/cms`)

| Method | Path | 권한 |
|---|---|---|
| GET, POST, PATCH, DELETE | `/admin/cms/notices` | operator |
| GET, POST, PATCH, DELETE | `/admin/cms/events` | operator |
| GET, POST, DELETE | `/admin/cms/resources` | operator (자료실 파일 — presigned, **카테고리 ENUM(guide/template/toolkit/etc) 필드**, **download_count 컬럼**) |
| GET | `/resources` | public (자료실 목록 — `?category=guide|template|toolkit|etc|all` 필터, M07-15 매핑) |
| GET | `/resources/{id}/download` | public (다운로드 — download_count 증감 atomic UPDATE, M07-16 매핑) |
| GET, POST, PATCH | `/admin/cms/banners` | operator |
| GET, POST | `/admin/cms/terms` | operator (버전 자동 부여, body에 `require_reconsent: bool` 필드) |
| GET | `/terms/{kind}/current` | public |
| GET | `/auth/reconsent/required` | citizen+ (현재 약관 버전과 본인 마지막 동의 버전 비교, `require_reconsent=true` 신 버전 있으면 변경 내용 반환) |
| POST | `/auth/reconsent` | citizen+ (변경된 약관에 재동의, 거부 시 force-logout 응답) |

#### M08. 권한·감사 (`/api/v1/admin/users`, `/api/v1/admin/audit`)

| Method | Path | 권한 |
|---|---|---|
| GET | `/admin/users` | operator |
| POST | `/admin/operators` | operator (운영자 추가) |
| DELETE | `/admin/operators/{id}` | operator |
| GET | `/admin/audit/logins` | operator |
| GET | `/admin/audit/gatekeeping` | operator |
| GET | `/admin/audit/all` | operator |

#### M09. 공통 (`/api/v1/common`)

| Method | Path | 권한 |
|---|---|---|
| GET | `/common/stats` | public (홈 통계 카드) |
| GET | `/common/regions/map` | public (5개 지역 핀 데이터) |
| GET | `/common/health` | public (Uptime Kuma) |

---

## 5. 핵심 흐름 (Flow Diagrams)

### 5.1 인증·세션 흐름

```
[회원가입]
  Client → POST /auth/signup
    body: { email, password, name, birth_year, agreements:[privacy,service] }
  Server:
    1. 14세 이상 검증 (current_year - birth_year >= 14)
    2. 통합 동의 검증 (privacy && service 모두 true)
    3. bcrypt(password) → users 저장 + email_verifications 토큰 생성
    4. SMTP 큐: "이메일 검증 링크"
    5. audit_logs(action=create, target=users)
  → 200 { user_id }

[로그인]
  Client → POST /auth/login { email, password }
  Server:
    1. 비밀번호 검증 (bcrypt.verify)
    2. status=active 확인
    3. JWT 발급: access(1h, sub=user_id, role=role), refresh(7d, jti)
    4. last_login_at 갱신, audit_logs(action=login)
    5. 약관 신 버전(require_reconsent=true) 미동의 검사 → 응답 본문 needs_reconsent:true 포함 (프론트는 ReconsentModal 표시)
  → 200 { access_token, refresh_token, needs_reconsent?: bool }

[Refresh]
  Client → POST /auth/refresh (refresh token in body)
  Server:
    1. JWT 검증 + jti 화이트리스트 확인 (Redis)
    2. 새 access 발급, refresh rotation
  → 200 { access_token, refresh_token }
```

### 5.2 의제 6단계 워크플로우

```
[시민 제보]
  citizen → POST /issues { region, title, body, photos[] }
  → issues(stage='reported') 생성
  → issue_stage_history(prev=null, next=reported)
  → notification_queue("운영자 일괄 알림")

[운영자 게이트키핑 - 단계 전환]
  operator → POST /admin/issues/{id}/transition
    body: { to_stage:'reviewing', comment }
  Server:
    1. 현재 stage 확인, 다음 단계 유효성 검증 (state machine)
    2. reviewing 진입 시: body.track ENUM 필수 검증 → issues.track 저장 (M02-19 매핑)
    3. UPDATE issues SET stage = to_stage
    4. INSERT issue_stage_history(actor_id, prev, next, reason=comment)
    5. notification_queue: 제보자 + (멘토배정 단계면 멘토)에게 이메일
    6. **stage='resolved' 진입 시 KPI auto-count trigger** (M06-04 매핑):
       - 성과지표 "해결완료 건수" 카운터 +1
       - INSERT performance_records(kpi_id=resolved_count, period=month, value+=1, auto_count_source=issue_id)
       - 캐시 무효화 (홈 통계 카드·관리자 대시보드)
    7. audit_logs(action=stage_change)
  → 200

상태 전이 그래프:
  reported → reviewing → published → mentor_assigned → in_progress → resolved
                  ↓ (track 라벨 지정)                          ↓ (KPI auto-count +1)
              rejected (사유 기록)
```

### 5.3 이메일 알림 큐

```
[Enqueue]
  notification_service.send(template, to, context)
  → Redis Stream "email-queue"
    { template_id, to, context_json, attempts:0, scheduled_at }

[Worker (gunicorn background or separate process)]
  Loop:
    1. XREAD BLOCK from email-queue
    2. SMTP 발송 시도
    3. 성공 → notifications_sent INSERT
       실패 → attempts+1, exp backoff (1m, 5m, 30m, 2h, 12h), max 5
    4. max 초과 → dead-letter + Sentry
```

### 5.4 파일 업로드 흐름 (MinIO Presigned, M03-09)

```
[운영자·매칭 멤버 산출물 업로드]
  Client → POST /projects/{id}/deliverables
    body: { filename, content_type, size, stage, tags }
  Server:
    1. 권한 검증 — operator OR require_project_member(project_id)
    2. MinIO presigned PUT URL 생성 (TTL 5분)
    3. deliverables INSERT (uploaded_by=current_user, status='pending')
    4. audit_logs(action=create, target=deliverable)
  → 200 { upload_url, deliverable_id }

  Client → PUT (upload_url) [직접 MinIO로 업로드]

  Client → POST /deliverables/{id}/complete
  Server:
    1. MinIO HEAD 확인 (size·etag)
    2. deliverables UPDATE status='ready'
  → 200
```

### 5.4.1 멤버 활동 기록 흐름 (M03-08, M04-08)

```
[매칭 멤버 활동 타임라인 작성 — M03-08]
  member → POST /projects/{id}/timeline
    body: { date, title, description }
  Server:
    1. require_project_member(project_id) 검증 → 비멤버 403
    2. timeline_entries INSERT (created_by=current_user)
    3. audit_logs(action=create, target=timeline_entry)
  → 200

[수정·삭제 — author or operator]
  member → PATCH/DELETE /projects/{id}/timeline/{entry_id}
  Server:
    1. timeline_entries.created_by == current_user OR is_operator 검증
    2. UPDATE / DELETE → audit_logs

[매칭 멘토 활동 기록 — M04-08]
  mentor → POST /projects/{id}/matching-activities
    body: { date, type:'meeting'|'advice'|'review', summary }
  Server:
    1. matchings.mentor_id == current_user OR is_operator 검증
       (학생팀 멤버는 본 API 불가 → M03-08 타임라인으로 대체 안내)
    2. matching_activities INSERT (created_by=current_user)
    3. audit_logs
  → 200 / 403 (학생팀이 시도)
```

### 5.5 6단계 ↔ 알림 매핑

| 단계 | 발송 대상 | 템플릿 |
|---|---|---|
| reported | 운영자 일괄 | `notify_new_issue` |
| reviewing | 제보자 | `notify_under_review` |
| published | 제보자 + 전체 운영자 | `notify_published` |
| mentor_assigned | 제보자 + 멘토 + 학생팀 | `notify_mentor_matched` |
| in_progress | 제보자 + 매칭 멘토단 | `notify_in_progress` |
| resolved | 제보자 + 매칭 멘토단 | `notify_resolved` |
| rejected | 제보자 | `notify_rejected` (사유 포함) |

---

## 6. 인증·권한 매트릭스

### 6.1 역할 정의

| Role | 부여 방법 |
|---|---|
| `citizen` | 회원가입 시 기본값 |
| `operator` | 다른 운영자가 `/admin/operators` 로 등록 |
| `mentor` | 운영자가 `/admin/mentors/grant`로 자격 부여 (citizen 위에 add-on) |
| `student` | 운영자가 학생팀에 편성 시 부여 (citizen 위에 add-on) |

> 시민이 가입 후 운영자가 멘토/학생 자격을 부여하므로, **하나의 user는 citizen + mentor/student 다중 역할** 가능. operator는 별개 계정.

### 6.2 엔드포인트 권한

| 영역 | public | citizen | mentor/student | operator |
|---|:---:|:---:|:---:|:---:|
| 공개 조회 (홈·소개·광장·리빙랩·네트워크·성과) | ✅ | ✅ | ✅ | ✅ |
| 회원가입·로그인 | ✅ | — | — | — |
| 제보 등록·공감·댓글 | — | ✅ | ✅ | ✅ |
| 본인 프로필·내 활동 | — | ✅ | ✅ | ✅ |
| 게이트키핑·CMS·기관·매칭·감사 | — | — | — | ✅ |
| 댓글 삭제 | — | author만 | author만 | ✅ (조정) |
| **프로젝트 게시판 (멤버 전용 비공개)** | — | — | **매칭된 멤버만 ✅** | ✅ |
| **활동 타임라인 작성·수정 (M03-08)** | — | — | **매칭 멤버 본인 작성·수정 ✅** | ✅ (전체 조정) |
| **산출물 업로드·메타데이터 (M03-09/10)** | — | — | **매칭 멤버 업로드자 본인 ✅** | ✅ (전체 조정) |
| **멘토단 활동 기록 (M04-08)** | — | — | **매칭 멘토 본인만 ✅** | ✅ |

### 6.3 미들웨어 체인

```
HTTPS → nginx → FastAPI
  ↓
  cors_middleware
  ↓
  jwt_auth_middleware     (Bearer 토큰 → request.user)
  ↓
  reconsent_check_middleware  (citizen+ 한정: 약관 신 버전(require_reconsent=true) 미동의 시,
                               /auth/reconsent·logout 외 모든 API에 409 + needs_reconsent 반환)
  ↓
  audit_middleware        (모든 요청 메타데이터 큐잉, write_pii 시 log)
  ↓
  rate_limit_middleware   (IP 기준 60req/min, 로그인은 5req/min)
  ↓
  Router (Depends(require_role('operator')))
```

---

## 7. UI/UX 표준

### 7.1 디자인 토큰 (Tailwind)

```
colors:
  primary: #1E40AF (충남대·공주대 색조 기반)
  secondary: #475569
  success: #10B981, warning: #F59E0B, danger: #EF4444
  bg: #F8FAFC, surface: #FFFFFF, text: #0F172A, muted: #64748B

typography:
  font: Pretendard (Korean), Inter (Latin)
  scale: xs(12) sm(14) base(16) lg(18) xl(20) 2xl(24) 3xl(30)

spacing: 4px 기준 (Tailwind 기본)
radius: sm(4) md(8) lg(12) xl(16)
shadow: sm, md, lg (Tailwind)

breakpoints: sm 640 / md 768 / lg 1024 / xl 1280
```

### 7.2 UI 표준 (memory [[feedback_ui-design]] 반영)

#### 7.2.1 모달·Alert·Toast 원칙 (🚨 절대 규칙)

> **본 절은 2026-05-30 합의 사항. 모든 화면 구현 시 예외 없이 적용.** Sprint 0 에 공통 컴포넌트로 선구축하여 반복 작업을 차단한다.

- **❌ 금지**: 브라우저 기본 `window.alert()`, `window.confirm()`, `window.prompt()` 호출 — **단 1건도 코드에 존재해서는 안 된다**. ESLint 규칙 `no-alert` 활성화 + CI 차단.
- **✅ 대체 수단**:
  - **확인·취소가 필요한 경우** → `<ConfirmModal>` (레이어 모달, header/content/footer 3분할)
  - **단순 안내·결과 알림** → `<Toast>` (3 ~ 5초 자동 dismiss, 우측 상단 stacking)
  - **에러 표시** → `<Toast variant="danger">` 또는 `<ErrorBanner>` (form 영역 내부 inline)
- **모달 닫기 규칙**:
  - **❌ 금지**: 모달 바깥 영역 (backdrop) 클릭으로 닫기. backdrop click event handler 미장착.
  - **✅ 허용**: ① 모달 우상단 `<CloseButton>` 클릭, ② footer 의 "취소"/"닫기" 버튼, ③ ESC 키 (옵션 — 위험 액션 모달은 비활성).
- **모달 3분할 구조** (header / content / footer 분리, content 스크롤):
  ```
  ┌─────────────────────────────────┐
  │ Header (고정, 닫기 버튼 포함)    │
  ├─────────────────────────────────┤
  │                                 │
  │ Content (커지면 내부 스크롤)    │  ← overflow-y: auto, max-height: 70vh
  │                                 │
  ├─────────────────────────────────┤
  │ Footer (고정, 액션 버튼)        │
  └─────────────────────────────────┘
  ```
- **공통 컴포넌트 구현**:
  - `<Modal>` (base) — `header`, `content`, `footer` 3 props, `closeOnBackdrop={false}` 기본값
  - `<ConfirmModal>` — `<Modal>` 위 래핑, `onConfirm`/`onCancel` props
  - `<Toast>` + `<ToastProvider>` — context 기반, `toast.success()`/`toast.error()`/`toast.info()` API
  - 위 3종은 **Sprint 0 Day 4-5 에 우선 구축**, 이후 모든 화면이 import 만 하여 재사용

#### 7.2.2 일반 UI 표준

- **모달 최소화**: 가능한 inline 편집·페이지 분리. 모달은 단순 확인·간단 폼·재동의·삭제 확인 등에 한정.
- **고객 여정 최소화**: 제보 등록·로그인 등 핵심 액션은 3 step 이내.
- **공통 컴포넌트 (Atomic)**: `Button`, `Input`, `Select`, `Checkbox`, `Modal`, `ConfirmModal`, `Toast`, `EmptyState`, `Skeleton`, `Pagination`, `DataTable`, `Tabs`, `Badge`, `Dialog`.
- **공통 컴포넌트 (Domain)**: `Header(GNB)`, `Footer`, `KakaoMap`, `RichTextEditor(Tiptap)`, `StageStepper`, `TrackBadge`, `ReconsentModal`, `ProjectBoardTab`, `ProgramRegistrationForm`, `ResourceUploader`.

### 7.2.3 Mockup 우선 원칙 (🚨 절대 규칙)

> **본 절은 2026-05-30 합의 사항.** 모든 화면 구현 시 Mockup 을 가장 먼저 확인하여, 디자인 의사결정 반복을 차단한다.

- **참조 디렉터리**: `/Users/sangincha/dev/deep-sos/mockup/pages/`
  - `public/` (10): about, issue-detail, issues, login, network, performance, project-detail, projects, success-cases, index
  - `user/` (3): issue-new, my-activities, profile
  - `admin/` (13): audit, cms-banners, dashboard, issue-detail, issues, kpi, mentors, organizations, project-detail, projects, success-cases, terms, users
- **구현 절차**: 
  1. 화면 구현 전 **반드시** 해당 mockup HTML 을 먼저 열어 레이아웃·구성요소·인터랙션 확인
  2. mockup 과 design.md §7.3 의 컴포넌트 목록 교차 확인
  3. Tailwind 디자인 토큰(§7.1) 으로 mockup CSS 를 React/Tailwind 로 변환
  4. mockup 에 모달이 있으면 §7.2.1 규칙 강제 적용 (브라우저 alert/backdrop 닫기 발견 시 즉시 교체)
- **Mockup 과 design.md 가 충돌하는 경우**: design.md 가 우선. Mockup 은 시각적 가이드, design.md 는 기능적 SOT.

### 7.3 24개 화면 매핑 (요약)

| # | 화면 | 주요 컴포넌트 |
|---|---|---|
| 1 | 홈 | StatsCards, ProcessBar, RecentIssues, KakaoMap, NoticeBar |
| 2 | USCP 소개 | 정적 섹션 4종 (Plan §3.1 참조) |
| 3 | 지역문제 광장 | IssueFilterBar(지역·단계·**TrackFilter**), IssueCardList(**TrackBadge**), Pagination |
| 4 | 제보 상세 | IssueDetail, StageStepper, **TrackBadge**, VoteButton, CommentSection |
| 5 | 리빙랩 목록 | ProjectFilterBar, ProjectCardList |
| 6 | 리빙랩 상세 | ProjectHeader, Timeline, DeliverableList, MemberList, **ProjectBoardTab**(멤버 전용 — PostList·PostDetail·CommentSection·AttachmentUpload) |
| 7 | 성공사례 | StoryGrid (4단계 카드) |
| 8 | 협력 네트워크 | OrgTabs(공·산·학·관), MouList, CommunityList |
| 9 | 성과자료 | KpiDashboard, **ContentList**(공지·이벤트 통합, CategoryTabs+CategoryBadge), ResourceList |
| 10 | 로그인/회원가입 | AuthTabs, ConsentChecks, AgeCheck, **ReconsentModal**(약관 신 버전 미동의 회원 강제 노출) |
| 11 | 제보 작성 | RegionSelect, ImageUpload, MapPicker |
| 12 | 내 활동 | MyIssuesList, MyVotesList, MyCommentsList |
| 13 | 프로필 | ProfileForm, PasswordForm, WithdrawSection |
| 14 | 대시보드 | AdminStatsCards, GatekeepingQueue, ChartsSection |
| 15·16 | 게이트키핑 | IssueQueueTable(**TrackColumn**), IssueReviewPanel, TransitionDialog(**TrackSelect** — reviewing 진입 시 필수) |
| 17·18 | 리빙랩 관리 | ProjectAdminTable, ProjectEditor, TimelineEditor, DeliverableUploader, SuccessStoryEditor, **ProjectBoardModeration** (게시글·댓글 조정) |
| 19 | 멘토·학생팀 | MentorTable, GrantDialog, TeamEditor, MatchingDialog |
| 20 | 협력기관 | OrgAdminTable, MouEditor, **ProgramRegistrationForm**(리빙랩·멘토단·학생팀 연계 폼, M05-06 매핑), CommunityEditor |
| 21 | 성과지표 | KpiTable, RecordForm, ExportButton |
| 22 | 콘텐츠 관리 | NoticeEditor(Tiptap), EventEditor, **ResourceUploader**(CategorySelect+DownloadCountColumn, M07-15/16), BannerEditor |
| 23 | 약관 관리 | TermsEditor(Tiptap), VersionList, **ReconsentToggle**(새 버전 발행 시 require_reconsent 활성화 → 활성 회원 다음 로그인 시 ReconsentModal 노출) |
| 24 | 사용자·감사 | UserSearch, OperatorAdd, AuditLogTable |

---

## 8. 비기능 요건 설계

### 8.1 성능

| 항목 | 설계 결정 |
|---|---|
| LCP < 2.5s | Next.js SSR + Tailwind purge + 이미지 next/image 최적화 |
| API p95 < 500ms | asyncpg connection pool 20 + Redis 캐시(홈 통계 1분) |
| DB 인덱스 | 위 §3.3 참조, EXPLAIN으로 모든 list API 검증 |
| 동시 100명 | Gunicorn 4 worker × 50 keepalive = 200 동시 처리 가능 |

### 8.2 보안

| 위협 | 대응 |
|---|---|
| XSS | DOMPurify (Tiptap output), CSP 헤더 |
| CSRF | SameSite=Strict 쿠키 + JWT Authorization 헤더 |
| SQLi | SQLAlchemy parameterized queries만 사용 |
| 인증 우회 | 모든 admin 라우트에 `require_role('operator')` Depends |
| Brute force | 로그인 5req/min, 5회 실패 시 30분 잠금 (M01-13) |
| 약한 비밀번호 | **복잡도 검증** (8자 이상·영문/숫자/특수문자 조합, M01-13) |
| 세션 탈취 | JWT TTL Access 1h / Refresh 7d, refresh rotation + jti 화이트리스트 (Redis) |
| 동시 로그인 | **다중 디바이스 허용** (M01-13) — 별도 제어 안 함 |
| Secrets | .env.prod 파일 + chmod 600, gitleaks 사전 검사 |

### 8.3 운영·모니터링

| 항목 | 설계 |
|---|---|
| Healthcheck | `/api/v1/common/health` + Uptime Kuma 5분 간격 |
| 로그 | JSON 구조화 로그 + journald rotation (10MB × 5 files) |
| 알림 | Slack webhook → #uscp-alerts (다운·에러 폭증) |
| 백업 | daily cron: `pg_dump` + `mc mirror`, 7일 보관, /backup 별도 디스크 |
| 복구 | RPO 24h, RTO 4h (단일 호스트 복원 시나리오) |
| Sentry (Optional) | 환경변수 `SENTRY_DSN`으로 toggle |

### 8.4 컴플라이언스

| 요건 | 구현 |
|---|---|
| 만 14세 이상 | 회원가입 birth_year 검증 + 약관 명시 |
| 통합 동의 | 회원가입 시 privacy + service 둘 다 체크 필수, 동의 거부 시 가입 불가 |
| 개인정보 처리방침 | `/terms/privacy/current` 공개, 회원에게 이메일 통지 (개정 시) |
| 동의 이력 | `users.agreed_at`, `users.terms_version_id` 저장 |
| 1년 보관 | `audit_logs` partitioning + 자동 만료 cron |
| 광고성 정보 X | 마케팅 발송 없음 (이메일 템플릿 정책) |
| **접근성 (WCAG 2.1 AA)** | **헤딩 구조·키보드 네비·이미지 alt·색상 대비 4.5:1·스크린리더 호환** (M08-10). UAT 직전 Lighthouse + axe DevTools 검증, 위반 0건 목표 |

---

## 9. Implementation Order (Build Phase) — **2026-08-20 정식 오픈**

> **8/20 오픈 압축 일정 (Plan §8과 동기화)**: 5/27 ~ 8/20 약 12주에 분석설계 단축(2주) + Sprint 1~5 (8주) + 시범운영 단축(2주). Out-of-scope 6건(§2.2.2 plan.md)을 명시 제외하여 일정 부담 흡수.

| 시점 | Sprint | 기간 | 산출물 |
|---|---|---|---|
| **2026-05 후반** | Sprint 0 | 2주 | DB 스키마 마이그레이션·Auth 골격·디자인 토큰·인프라 셋업 |
| **2026-06 초** | Sprint 1 | 2주 | M01 회원·인증 (보안 정책 포함) / M09 공통 컴포넌트(헤더·푸터·KakaoMap) |
| **2026-06 후반** | Sprint 2 | 2주 | M02 제보·게이트키핑 (6단계 핵심·트랙 라벨·키워드 검색·댓글 종결) |
| **2026-07 초** | Sprint 3 | 1주 | M03 리빙랩 운영 + 프로젝트 게시판 |
| **2026-07 중** | Sprint 4 | 2주 | M07 콘텐츠 관리 (공지·이벤트 통합·약관 재동의·자료실 카테고리) + M04 멘토·학생팀 |
| **2026-07 말** | Sprint 5 | 1주 | M05 협력 네트워크(삭제·토글) + M06 성과자료 + M08 권한·감사·WCAG 검증 |
| **2026-08 초** | Pre-launch | 1주 | 통합 테스트·성능 튜닝·운영 매뉴얼 |
| **2026-08 중** | UAT 단축 | 1주 | UAT (공주대·충남대 학생·교수 사전 체험)·핫픽스 |
| **🎯 2026-08-20** | **정식 오픈** | — | — |
| **2026-09 ~ 12** | 안정화·시범운영 연장 | 4개월 | 사용자 피드백 수집·추가 핫픽스·발주처 인수 |

각 Sprint 종료 시 `/pdca analyze uscp-v2` 로 Gap 분석.

---

## 10. Verification Plan

### 10.1 Sprint 종료 시 검증

- [ ] 해당 Sprint 모듈 기능 목록 ↔ 구현 1:1 매핑 (사이트맵·feature-list 기준)
- [ ] 단위 테스트 ≥ 60% (Critical Path 우선)
- [ ] e2e 시나리오 (Playwright): 핵심 사용자 여정 (제보·게이트키핑·매칭·CMS·로그인)
- [ ] API 명세(OpenAPI) ↔ 구현 정합성
- [ ] gap-detector Agent로 본 Design vs 코드 Match Rate ≥ 80% (Sprint 종료 기준)

### 10.2 최종 검증 (시범운영 종료 전)

- [ ] gap-detector Match Rate ≥ 90%
- [ ] 보안 점검 체크리스트 통과 (OWASP Top 10)
- [ ] 부하 테스트 (50 동시 30분, p95 < 500ms)
- [ ] 백업·복구 리허설 (1회 이상)
- [ ] 운영 매뉴얼 작성 완료
- [ ] design-validator Agent로 Plan ↔ Design ↔ 구현 일관성 95+점

### 10.3 기능 단위 E2E 테스트 원칙 (🚨 절대 규칙)

> **본 절은 2026-05-30 합의 사항.** 회귀 버그 누적·"다음 기능부터 깨짐" 패턴 방지를 위해 **기능 단위 closeout 게이트**를 강제한다.

#### 10.3.1 원칙

- **기능별 Definition of Done (DoD)**: 116개 기능 중 1건의 구현이 "완료"로 간주되려면 다음 5단계를 모두 통과해야 한다:
  1. ✅ Backend API 구현 + OpenAPI 명세
  2. ✅ Frontend UI 구현 + design.md §7.3 컴포넌트 매핑
  3. ✅ Mockup (mockup/pages/*.html) 시각 비교 ≥ 90% 일치
  4. ✅ **Playwright E2E 시나리오 작성 및 통과** (본 절의 핵심)
  5. ✅ §2.4.3 URL 라우팅 4 체크 + §7.2.1 모달 규칙 검증
- **순차 게이팅**: 한 기능의 E2E 가 통과되기 전에는 **다음 기능 구현을 시작하지 않는다**. 기능 누락·잠재 회귀를 차단.
- **단, 병렬 작업 허용 조건**: 동일 모듈 내 독립적인 기능 (예: M02-01 제보 등록 ↔ M02-04 공감 투표) 은 병렬 구현 가능. 단, 각각의 E2E 가 통과되어야 모듈 완료로 간주.

#### 10.3.2 Playwright 디렉터리 구조

```
frontend/tests/e2e/
├── m01-auth/
│   ├── m01-01-signup.spec.ts
│   ├── m01-02-age-verification.spec.ts
│   ├── m01-04-login.spec.ts
│   ├── ...
├── m02-issues/
│   ├── m02-01-issue-create.spec.ts
│   ├── m02-04-vote.spec.ts
│   ├── m02-19-track-label.spec.ts
│   ├── m02-20-keyword-search.spec.ts
│   ├── ...
├── m03-projects/, m04-mentors/, m05-network/, m06-performance/, m07-cms/, m08-audit/, m09-common/
└── fixtures/
    ├── users.ts            (testCitizen, testOperator, testMentor, testStudent)
    ├── seed.ts             (DB 시드 헬퍼)
    └── api-mocks.ts
```

#### 10.3.3 E2E 시나리오 최소 요건

각 기능 1건의 `*.spec.ts` 는 다음을 검증한다:

| 검증 항목 | 비고 |
|---|---|
| **Happy Path** | 정상 입력 → 정상 결과 |
| **Error Path** | 잘못된 입력 (예: 14세 미만 회원가입) → 적절한 에러 표시 (브라우저 alert 미사용 §7.2.1) |
| **권한 분기** | 무권한 사용자 → 403 또는 redirect |
| **URL 라우팅** (§2.4) | 진입 후 새 고침 → 동일 화면 / URL 공유 → 동일 화면 |
| **Modal 규칙** (§7.2.1) | 모달이 등장하면 backdrop 클릭 무반응 / 닫기 버튼 동작 / header·footer·content 3분할 구조 확인 |
| **Accessibility** | `aria-label`, focus trap (모달), keyboard navigation |

#### 10.3.4 CI 통합 (Sprint 0 에 구축)

- `.github/workflows/e2e.yml` (또는 GitLab CI) 에서 PR 단위 Playwright 실행
- **PR 머지 차단 조건**: 신규/수정 기능에 대응하는 E2E spec 이 없거나 실패
- 로컬: `pnpm test:e2e -- m02-19-track-label.spec.ts` 로 단일 기능 검증 가능
- 시각 회귀: Playwright `toHaveScreenshot()` 으로 baseline 관리 (mockup 과 비교)

#### 10.3.5 기능 구현 워크플로우 (Sprint 1 이후 매 기능마다)

```
1. mockup/pages/*.html 열어 화면 확인 (§7.2.3)
2. feature-spec.md 의 M*-** 명세 확인 (목적·입력·권한·유의사항)
3. Backend API 구현 + OpenAPI 명세
4. Frontend 컴포넌트 구현 (§7.2.1 Modal/Toast 규칙 + §7.3 컴포넌트 매핑 + §2.4 URL 라우팅)
5. Playwright spec 작성 (§10.3.3 6개 검증 항목)
6. 로컬 E2E 통과 확인
7. PR 생성 → CI E2E 통과 → 머지
8. 다음 기능 진입 ← 본 단계 통과 전에는 진입 불가
```

> **핵심**: 본 게이트는 "AI Agent 가 빠르게 다음 기능으로 넘어가다 회귀를 누적시키는" 패턴을 차단하기 위한 강제 장치이다. **건너뛰지 않는다.**

---

## 11. Risks (Build 단계)

| Risk | Impact | Mitigation |
|---|---|---|
| 모듈 간 의존성으로 인한 병렬 작업 어려움 | Medium | Sprint 0에서 공통 컴포넌트(M09) + 인증(M01) 먼저 완성 |
| Tiptap WYSIWYG XSS 취약점 | High | DOMPurify 적용 + CSP 헤더 + 약관 미리보기 단계 추가 |
| 카카오맵 키 유출 | Medium | 백엔드 프록시 검토 + Referer 제한 |
| 메일 큐 적체 | Medium | 재시도 정책 + dead-letter + Slack 알림 |
| 단일 운영자 권한 남용 | Medium | 모든 변경에 audit_logs 기록 + 정기 점검 |
| UAT 피드백 폭주 | Medium | 시범운영 3개월 중 1개월은 핫픽스 전용 버퍼 |

---

## 12. Next Steps

1. [x] Design 단계 작성 완료
2. [ ] **Sprint 0 Do 단계**: `/pdca do uscp-v2` — DB 마이그레이션 + Auth 골격 구현 시작
3. [ ] 각 Sprint 종료 시 `/pdca analyze uscp-v2`
4. [ ] 90% 미만 시 `/pdca iterate uscp-v2`
5. [ ] 시범운영 완료 후 `/pdca report uscp-v2`

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.5 | 2026-05-30 | **4대 절대 원칙 통합 + Gap 분석 22% Match Rate 진단 반영**: ① §2.4 신규 — SPA + URL 라우팅 아키텍처 (모든 페이지·상세 페이지 URL 직접 호출/F5/북마크 100% 호환, 검증 체크리스트 4항). ② §7.2.1 신규 — Modal/Alert/Toast 규칙 (window.alert/confirm 절대 금지, backdrop 클릭 닫기 금지, header/content/footer 3분할 + 내부 스크롤, ESLint no-alert + CI 차단). ③ §7.2.3 신규 — Mockup 우선 원칙 (`mockup/pages/` 26개 화면 SOT, 화면 구현 전 필수 참고). ④ §10.3 신규 — Playwright E2E 기능 단위 closeout 게이트 (DoD 5단계, 기능별 spec, CI 머지 차단, 다음 기능 진입 불가). 동시에 첫 Gap 분석 결과 Match Rate 22%, V1 BF-1~7 → V2 M01~M09 이행 작업 71건 식별 → `docs/03-analysis/features/uscp-v2.analysis.md` 참조. 9모듈·116기능·24화면 불변. |
| 1.4 | 2026-05-27 | **100점 달성 + 8/20 오픈 일정 압축**: 한혜진 PDF 누락 7건 신규 + 2건 보강 API/스키마 반영 (M01-13 비밀번호 보안, M02-01 사진 정책, M02-05 댓글 수정, M02-20 키워드 검색 + `pg_trgm` 인덱스, M02-21 댓글 종결 endpoint, M05-09 협력기관 삭제·토글, M07-15/16 자료실 카테고리·다운로드 카운트 + `resource_category` Enum, M08-10 WCAG 2.1 AA §8.4 컴플라이언스에 명시). §9 일정표 8/20 정식 오픈으로 압축. 9모듈·**116기능**. |
| 1.3 | 2026-05-27 | design-validator 96점 달성 보강: §9 Sprint 표에 분기 매핑 헤더 + 분기 칼럼 추가 (M1 해결), `/admin/issues/stats` API 추가 (m3·M02-18), §5.2 resolved 진입 시 KPI auto-count 트리거 명시 (m4·M06-04), #20 ProgramRegistrationForm 컴포넌트 추가 (m2·M05-06). |
| 1.2 | 2026-05-27 | design-validator 재검증 반영: **issue_track Enum + issues.track 컬럼** (정책반영/정책참고/시민자율), `/admin/issues/{id}/track` API, TrackBadge/TrackFilter/TrackSelect 컴포넌트. **content_category Enum + contents 테이블 통합** (notice/event), `/contents` 통합 게시판 API. **terms_versions.require_reconsent BOOL** + `/auth/reconsent` API + `reconsent_check_middleware` + `ReconsentModal`. 9모듈·**109기능**·24화면. |
| 1.1 | 2026-05-27 | M03 프로젝트별 게시판(멤버 전용) 추가 — `project_posts`·`project_post_comments` 테이블, `/projects/{id}/posts` API 10종, `require_project_member` 미들웨어, ProjectBoardTab 컴포넌트. 9모듈·**107기능**·24화면. |
| 1.0 | 2026-05-27 | 시스템 구축 설계 신규 작성 — 9모듈·103기능·24화면·ERD·API·흐름·UI 표준 정의 |
