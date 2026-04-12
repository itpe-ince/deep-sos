# USCP v1 Design Document

> **Summary**: mockup 31개 화면을 Next.js 15 + FastAPI로 구현하기 위한 v1 상세 설계
>
> **Project**: deep-sos (SOS랩 / USCP)
> **Version**: v1.0
> **Author**: sangincha
> **Date**: 2026-04-11
> **Status**: Draft
> **Planning Doc**: [uscp-v1.plan.md](../../01-plan/features/uscp-v1.plan.md)
> **참조 문서**:
> - [sos-lab.design.md](sos-lab.design.md) — 상위 설계 (BF-1~7, DB, API)
> - [ui-standards.md](../ui-standards.md) — UI 표준
> - [functional-spec.md](../functional-spec.md) — 92개 기능 명세
> - [mockup/](../../../mockup/) — 31개 화면 프로토타입

---

## 1. Overview

### 1.1 Design Goals

- **mockup 100% 재현**: Sprint 1~4로 검증된 31개 화면의 UX를 실제 Next.js 컴포넌트로 1:1 전환
- **업무 흐름 기반 구현**: BF-1~7 업무 흐름을 그대로 유지하되 v1 범위(MVP)로 축소
- **멀티테넌트**: 4개 캠퍼스 데이터 격리 + 통합 관리자 뷰
- **외부 시스템 자동 연동**: VMS/1365/카카오/네이버/구글
- **운영자 친화 CMS**: WYSIWYG 기반 비개발자도 소개 페이지 편집 가능
- **온프레미스 배포**: 대학 전산실 환경에 Docker 기반 배포

### 1.2 Design Principles

- **Feature-based Modular**: 9개 업무 모듈로 분리 (auth, issues, projects, volunteers, cms, esg, organizations, cases, admin)
- **API-First**: OpenAPI 스펙 기반 FastAPI → Next.js TanStack Query 자동 타입 생성
- **Progressive Enhancement**: SSR(공개 SEO) + CSR(로그인 후) 혼합
- **Mobile-First Responsive**: 모바일 중심 + Tablet/Desktop/Wide 4단계
- **Zero Dead Links**: 모든 네비게이션 링크 실존 파일 보장 (mockup 교훈)

### 1.3 Scope (v1)

mockup 31개 화면 = 구현 대상
- 공개 영역: 11개 (P-01~10, P-+)
- 사용자 영역: 8개 (P-11~18)
- 관리자 영역: 12개 (P-19~30)

---

## 2. Architecture

### 2.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Clients                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │ Web (Next.js 15 SSR)    │  │ Admin Dashboard (Next.js)│       │
│  │ + PWA Service Worker    │  │ (같은 앱 내 /admin 경로)  │       │
│  └──────────┬──────────────┘  └──────────┬──────────────┘       │
│             └─────────────────────────────┘                      │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS
            ┌──────────▼──────────┐
            │  Nginx (Reverse    │
            │  Proxy + SSL)      │
            └──────────┬──────────┘
                       │
┌──────────────────────┼───────────────────────────────────────────┐
│                      │   Application Layer                       │
│  ┌───────────────────┴───────────┐   ┌──────────────────────┐   │
│  │  Next.js 15 (Node.js)        │   │  FastAPI (Python)    │   │
│  │  - App Router                │◄──┤  - REST API v1       │   │
│  │  - SSR/SSG/ISR              │   │  - WebSocket          │   │
│  │  - API Routes (BFF)         │   │  - OpenAPI docs       │   │
│  └───────────────────────────────┘   └──────┬───────────────┘   │
│                                              │                   │
│  ┌───────────────────────────────────────────┼─────────────────┐│
│  │                    Data & Infrastructure  │                 ││
│  │  ┌──────────────┐  ┌──────────┐  ┌────────▼───────┐       ││
│  │  │ PostgreSQL 16 │  │  Redis 7 │  │  External APIs │       ││
│  │  │ + PostGIS    │  │ Cache/   │  │  - VMS         │       ││
│  │  │              │  │ Pub-Sub  │  │  - 1365 Portal │       ││
│  │  └──────────────┘  └──────────┘  │  - Kakao OAuth │       ││
│  │  ┌──────────────┐  ┌──────────┐  │  - Naver OAuth │       ││
│  │  │ MinIO (S3)  │  │ Sentry   │  │  - Google OAuth│       ││
│  │  │ File Storage │  │ Error    │  │  - Kakao Map   │       ││
│  │  └──────────────┘  └──────────┘  └────────────────┘       ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

        대학 전산실 Docker Compose 스택
        ┌─────────────────────────────┐
        │ nginx │ next │ api │ db │ redis │ minio │ sentry │
        └─────────────────────────────┘
```

### 2.2 Data Flow Example: "이슈 등록 → 프로젝트 전환"

```
[시민 P-12] 이슈 등록 (사진 업로드)
    │
    │ 1. Next.js → /api/v1/issues (POST, FormData)
    ▼
[FastAPI] 이미지 S3/MinIO 업로드 → Issue 레코드 생성
    │
    │ 2. WebSocket 브로드캐스트 (관리자 알림)
    ▼
[관리자 P-22] 이슈 목록 (새 이슈 + 알림 도트)
    │
    │ 3. 상태 변경 PATCH /api/v1/issues/{id}/status
    ▼
[FastAPI] 상태 업데이트 + 이력 로그 + 알림 생성
    │
    │ 4. WebSocket → 시민에게 "검토중" 알림
    ▼
[관리자 P-23] "리빙랩 프로젝트로 전환" 버튼 클릭
    │
    │ 5. POST /api/v1/projects (from_issue_id=X)
    ▼
[FastAPI] Project 생성 + Issue.linked_project_id 업데이트
    │
    │ 6. WebSocket → 시민+관리자에게 프로젝트 전환 알림
    ▼
[P-25] 프로젝트 관리 (탐색 단계 자동 설정)
```

### 2.3 Tech Stack Summary

| Layer | Tech | Version |
|-------|------|---------|
| Frontend | Next.js (App Router) | 15 |
| | TypeScript (strict) | 5.5+ |
| | Tailwind CSS | 4 |
| | shadcn/ui | latest |
| | TanStack Query | 5 |
| | Zustand | 4 |
| | TipTap (WYSIWYG) | 2 |
| | Recharts | 2 |
| | Kakao Map SDK | latest |
| Backend | Python | 3.12 |
| | FastAPI | 0.110+ |
| | SQLAlchemy | 2.0 (async) |
| | Alembic | latest |
| | Pydantic | v2 |
| | uvicorn + gunicorn | latest |
| DB | PostgreSQL + PostGIS | 16 |
| Cache | Redis | 7 |
| Storage | MinIO (S3 compatible) | latest |
| Testing | Vitest + Playwright + pytest | latest |
| Deploy | Docker + Docker Compose | latest |
| CI/CD | GitHub Actions | - |
| Monitoring | Sentry + Prometheus + Grafana | - |

---

## 3. Data Model (v1)

> 상위 설계 [sos-lab.design.md §3](sos-lab.design.md#3-data-model)에서 12+6개 테이블 정의됨. v1에서는 다음 테이블을 우선 구현.

### 3.1 v1 필수 테이블 (18개)

#### 공통 (3개)
- `users` — 사용자 (독자 로그인 + 소셜)
- `campuses` — 캠퍼스 (대전/공주/예산/세종)
- `notifications` — 알림

#### BF-1 지역 문제 (3개)
- `issues` — 지역 문제
- `issue_votes` — 공감 투표
- `issue_comments` — 댓글

#### BF-2 참여 주체 (1개)
- `organizations` — 기관 + MOU

#### BF-3 리빙랩 프로젝트 (7개)
- `livinglab_projects`
- `project_members`
- `project_organizations`
- `project_milestones`
- `project_deliverables`
- `field_feedbacks`
- `idea_boards` + `idea_cards`
- `project_kpis`

#### BF-5 봉사활동 (2개)
- `volunteer_activities`
- `volunteer_participations`

#### BF-6 ESG/SDGs (2개)
- `esg_activities`
- `platform_kpis`

#### BF-7 성공 사례 (1개)
- `success_cases`

#### CMS (2개) — 신규
- `cms_pages` — 소개 페이지 (WYSIWYG 콘텐츠)
- `cms_banners` — 메인 배너

### 3.2 v1 신규 테이블 DDL

#### cms_pages

```sql
CREATE TABLE cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,          -- /about, /guide, /campus 등
    title VARCHAR(200) NOT NULL,
    content_json JSONB NOT NULL,                 -- TipTap 문서 JSON
    content_html TEXT,                           -- 캐시된 렌더링 결과
    excerpt TEXT,                                -- SEO 요약
    og_image_url TEXT,                           -- SEO 이미지
    status VARCHAR(20) DEFAULT 'draft',          -- draft, published, archived
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX idx_cms_pages_status ON cms_pages(status);
```

#### cms_banners

```sql
CREATE TABLE cms_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    gradient_start VARCHAR(7),                   -- #2563eb
    gradient_end VARCHAR(7),                     -- #1d4ed8
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',          -- draft, published, scheduled, ended
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_banners_status ON cms_banners(status, sort_order);
```

#### user 테이블 v1 확장 (OAuth 컬럼)

```sql
-- sos-lab.design.md의 users 테이블에 추가
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20);  -- kakao/naver/google/null(email)
ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255);
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255); -- bcrypt (email 로그인 시)
ALTER TABLE users ADD COLUMN refresh_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;

CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

### 3.3 ER Diagram (v1 핵심)

```
[Campus] 1──N [User]
             │
             ├── N [Issue] ──── N [Issue Vote]
             │       │          N [Issue Comment]
             │       └──→ linked_project_id ──→ [Living Lab Project]
             │
             ├── N [Project Member] ──→ [Living Lab Project]
             │                              │
             │                              ├── N [Project Milestone]
             │                              ├── N [Project Deliverable]
             │                              ├── N [Field Feedback]
             │                              ├── N [Idea Board] ──N [Idea Card]
             │                              ├── N [Project KPI]
             │                              └── N [Project Organization] ──→ [Organization]
             │
             ├── N [Volunteer Participation] ──→ [Volunteer Activity]
             │                                        │
             │                                        └──→ project_id (optional)
             │
             └── N [Notification]

[Admin/Staff] ──── [CMS Page] (WYSIWYG)
              ──── [CMS Banner]

[Platform KPI] (연차별 목표 관리)
[ESG Activity] ── SDGs 태깅
[Success Case] ── 프로젝트 연계
```

---

## 4. API Specification (v1)

### 4.0 Convention

- Base URL: `/api/v1`
- 인증: JWT `Authorization: Bearer {access_token}`
- Content-Type: `application/json` (기본), `multipart/form-data` (파일 업로드)
- 페이지네이션: `?page=1&size=20` → `{data: [], meta: {total, page, size, totalPages}}`
- 정렬/필터: `?sort=-created_at&campus=DJ&status=active`
- 에러: RFC 7807 Problem Details
- 타임존: UTC 저장, 클라이언트에서 KST 변환

### 4.1 Auth API

| Method | Path | Description | Body | Auth |
|--------|------|-------------|------|------|
| POST | `/auth/register` | 이메일 회원가입 | `{email, password, name, role, campus_id}` | - |
| POST | `/auth/login` | 이메일 로그인 | `{email, password}` | - |
| POST | `/auth/logout` | 로그아웃 | - | Required |
| POST | `/auth/refresh` | 토큰 갱신 | `{refresh_token}` | - |
| GET | `/auth/me` | 내 정보 | - | Required |
| PUT | `/auth/me` | 프로필 수정 | `{name, department, expertise, ...}` | Required |
| POST | `/auth/password/forgot` | 비밀번호 재설정 요청 | `{email}` | - |
| POST | `/auth/password/reset` | 비밀번호 재설정 | `{token, new_password}` | - |
| GET | `/auth/oauth/kakao` | 카카오 로그인 시작 (redirect) | - | - |
| GET | `/auth/oauth/kakao/callback` | 카카오 콜백 | `?code=...` | - |
| GET | `/auth/oauth/naver` | 네이버 로그인 시작 | - | - |
| GET | `/auth/oauth/naver/callback` | 네이버 콜백 | - | - |
| GET | `/auth/oauth/google` | 구글 로그인 시작 | - | - |
| GET | `/auth/oauth/google/callback` | 구글 콜백 | - | - |
| POST | `/auth/verify-email` | 이메일 인증 | `{token}` | - |

### 4.2 BF-1 Issues API

| Method | Path | Auth |
|--------|------|------|
| GET | `/issues` | Optional* |
| GET | `/issues/map` | Optional* |
| GET | `/issues/stats` | Optional* |
| GET | `/issues/:id` | Optional* |
| POST | `/issues` | Required |
| PUT | `/issues/:id` | Owner/Admin |
| DELETE | `/issues/:id` | Owner/Admin |
| PATCH | `/issues/:id/status` | Assignee/Admin |
| PATCH | `/issues/:id/assign` | Admin |
| POST | `/issues/:id/convert-to-project` | Admin |
| POST | `/issues/:id/vote` | Required |
| DELETE | `/issues/:id/vote` | Required |
| GET | `/issues/:id/comments` | Optional* |
| POST | `/issues/:id/comments` | Required |
| DELETE | `/issues/:id/comments/:cid` | Owner/Admin |

> *Optional: 비로그인 조회 허용

#### 파일 업로드 상세

```http
POST /api/v1/issues
Content-Type: multipart/form-data

title: "횡단보도 신호 대기시간 문제"
description: "..."
category: "safety"
campus_id: "uuid"
location_lat: 36.4658
location_lng: 126.9300
location_address: "공주캠퍼스 정문 앞"
is_anonymous: false
images: [File, File, File]  (max 5)
```

### 4.3 BF-3 Projects API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/projects` | 프로젝트 목록 | Optional* |
| GET | `/projects/:id` | 프로젝트 상세 | Optional* |
| POST | `/projects` | 프로젝트 생성 | Professor/Admin |
| PUT | `/projects/:id` | 수정 | Leader/Admin |
| DELETE | `/projects/:id` | 삭제 | Admin |
| PATCH | `/projects/:id/phase` | 단계 전환 | Leader/Admin |
| GET | `/projects/:id/members` | 멤버 목록 | Required |
| POST | `/projects/:id/members` | 멤버 추가 | Leader/Admin |
| DELETE | `/projects/:id/members/:uid` | 멤버 제거 | Leader/Admin |
| PATCH | `/projects/:id/members/:uid` | 역할 변경 | Leader/Admin |
| GET | `/projects/:id/milestones` | 마일스톤 목록 | Required |
| POST | `/projects/:id/milestones` | 마일스톤 생성 | Member+ |
| PATCH | `/projects/:id/milestones/:mid` | 마일스톤 수정 | Member+ |
| GET | `/projects/:id/deliverables` | 산출물 목록 | Required |
| POST | `/projects/:id/deliverables` | 산출물 업로드 | Member+ |
| GET | `/projects/:id/feedbacks` | 피드백 목록 | Member+ |
| POST | `/projects/:id/feedbacks` | 피드백 등록 | Member+ |
| GET | `/projects/:id/feedbacks/summary` | 피드백 요약 | Member+ |
| GET | `/projects/:id/boards` | 아이디어 보드 목록 | Member+ |
| POST | `/projects/:id/boards` | 보드 생성 | Member+ |
| GET | `/boards/:bid` | 보드 상세 | Member+ |
| POST | `/boards/:bid/cards` | 카드 추가 | Member+ |
| PATCH | `/boards/:bid/cards/:cid` | 카드 수정 | Author/Leader |
| POST | `/boards/:bid/cards/:cid/vote` | 카드 투표 | Member+ |
| GET | `/projects/:id/kpis` | KPI 목록 | Member+ |
| POST | `/projects/:id/kpis` | KPI 생성 | Leader |
| PATCH | `/projects/:id/kpis/:kid` | KPI 업데이트 | Member+ |
| GET | `/feedback-templates` | 피드백 템플릿 | Required |
| POST | `/feedback-templates` | 템플릿 생성 | Professor/Admin |

### 4.4 BF-5 Volunteers API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/volunteers` | 봉사활동 목록 | Optional* |
| GET | `/volunteers/:id` | 상세 | Optional* |
| POST | `/volunteers` | 등록 | Staff/Admin |
| PUT | `/volunteers/:id` | 수정 | Organizer/Admin |
| POST | `/volunteers/:id/apply` | 신청 | Required |
| DELETE | `/volunteers/:id/apply` | 취소 | Required |
| PATCH | `/volunteers/:id/participants/:uid` | 참여 상태 변경 | Organizer |
| POST | `/volunteers/:id/attendance` | 출석 체크 | Organizer |
| POST | `/volunteers/:id/sync-vms` | VMS 수동 동기화 | Admin |
| GET | `/users/:id/portfolio` | 포트폴리오 | Self/Admin |
| GET | `/users/:id/portfolio/pdf` | PDF 다운로드 | Self |

### 4.5 CMS API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/cms/pages` | 페이지 목록 | Admin |
| GET | `/cms/pages/:slug` | 공개 페이지 (by slug) | Optional* |
| GET | `/cms/pages/id/:id` | 편집용 | Admin |
| POST | `/cms/pages` | 페이지 생성 | Admin |
| PUT | `/cms/pages/:id` | 페이지 수정 | Admin |
| DELETE | `/cms/pages/:id` | 삭제 | Admin |
| POST | `/cms/pages/:id/publish` | 발행 | Admin |
| POST | `/cms/pages/:id/unpublish` | 비공개 | Admin |
| GET | `/cms/banners` | 배너 목록 (공개: 활성만) | Optional* |
| POST | `/cms/banners` | 배너 생성 | Admin |
| PUT | `/cms/banners/:id` | 배너 수정 | Admin |
| DELETE | `/cms/banners/:id` | 삭제 | Admin |
| POST | `/cms/upload-image` | WYSIWYG 이미지 업로드 | Admin |

### 4.6 BF-6 ESG API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/esg` | ESG 활동 목록 | Required |
| POST | `/esg` | 등록 | Staff/Admin |
| GET | `/esg/sdgs-dashboard` | SDGs 대시보드 | Optional* |
| GET | `/esg/kpi` | 플랫폼 KPI | Admin |
| PUT | `/esg/kpi/:id` | KPI 업데이트 | Admin |

### 4.7 BF-7 Success Cases API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/success-cases` | 공개 목록 | Optional* |
| GET | `/success-cases/:id` | 상세 | Optional* |
| POST | `/success-cases` | 등록 | Admin |
| PUT | `/success-cases/:id` | 수정 | Admin |
| DELETE | `/success-cases/:id` | 삭제 | Admin |
| POST | `/success-cases/:id/publish` | 공개 | Admin |

### 4.8 BF-2 Organizations API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/organizations` | 목록 | Required |
| GET | `/organizations/:id` | 상세 | Required |
| POST | `/organizations` | 등록 | Admin |
| PUT | `/organizations/:id` | 수정 | Admin |
| PATCH | `/organizations/:id/mou` | MOU 상태 변경 | Admin |

### 4.9 Admin API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/admin/dashboard` | 통합 대시보드 데이터 | Admin |
| GET | `/admin/stats/by-campus` | 캠퍼스별 통계 | Admin |
| GET | `/admin/users` | 사용자 목록 | Admin |
| PATCH | `/admin/users/:id/role` | 역할 변경 | Admin |
| PATCH | `/admin/users/:id/status` | 활성/비활성 | Admin |

### 4.10 Notifications (WebSocket)

| Path | Description |
|------|-------------|
| `ws://host/ws/notifications?token=JWT` | 실시간 알림 구독 |

**Server → Client 메시지**:
```json
{
  "type": "issue_status_changed",
  "data": {
    "issue_id": "uuid",
    "old_status": "reviewing",
    "new_status": "progress",
    "message": "이슈 '도서관 냉방 불량'이 처리중으로 변경되었습니다"
  },
  "timestamp": "2026-04-11T10:30:00Z"
}
```

**알림 타입**: `issue_status_changed`, `issue_assigned`, `issue_new_comment`, `project_phase_changed`, `project_invited`, `project_new_feedback`, `volunteer_confirmed`, `vms_synced`, `mou_expiring`

---

## 5. Mockup → Next.js Route Mapping

| Mockup 파일 | Next.js Route | 렌더링 | 권한 |
|------------|---------------|:----:|:----:|
| `index.html` | `app/(public)/page.tsx` | SSR | Public |
| `public/about.html` | `app/(public)/about/page.tsx` | SSG | Public |
| `public/campus.html` | `app/(public)/campus/page.tsx` | SSG | Public |
| `public/guide.html` | `app/(public)/guide/page.tsx` | SSG | Public |
| `public/issues.html` | `app/(public)/issues/page.tsx` | SSR | Public |
| `public/issue-detail.html` | `app/(public)/issues/[id]/page.tsx` | SSR | Public |
| `public/projects.html` | `app/(public)/projects/page.tsx` | SSR | Public |
| `public/project-detail.html` | `app/(public)/projects/[id]/page.tsx` | SSR | Public |
| `public/success-cases.html` | `app/(public)/success-cases/page.tsx` | SSG+ISR | Public |
| `public/volunteers.html` | `app/(public)/volunteers/page.tsx` | SSR | Public |
| `public/login.html` | `app/(auth)/login/page.tsx` | CSR | Public |
| `user/dashboard.html` | `app/(user)/mypage/page.tsx` | CSR | User |
| `user/issue-new.html` | `app/(user)/issues/new/page.tsx` | CSR | User |
| `user/project-member.html` | `app/(user)/projects/[id]/page.tsx` | CSR | Member+ |
| `user/feedback-new.html` | `app/(user)/projects/[id]/feedback/new/page.tsx` | CSR | Member+ |
| `user/idea-board.html` | `app/(user)/projects/[id]/boards/[bid]/page.tsx` | CSR | Member+ |
| `user/volunteer-apply.html` | `app/(public)/volunteers/[id]/page.tsx` | SSR | User (신청) |
| `user/portfolio.html` | `app/(user)/portfolio/page.tsx` | CSR | Self |
| `user/profile.html` | `app/(user)/profile/page.tsx` | CSR | Self |
| `admin/dashboard.html` | `app/admin/page.tsx` | CSR | Admin |
| `admin/cms-pages.html` | `app/admin/cms/pages/page.tsx` | CSR | Admin |
| `admin/cms-banners.html` | `app/admin/cms/banners/page.tsx` | CSR | Admin |
| `admin/issues.html` | `app/admin/issues/page.tsx` | CSR | Admin |
| `admin/issue-detail.html` | `app/admin/issues/[id]/page.tsx` | CSR | Admin |
| `admin/projects.html` | `app/admin/projects/page.tsx` | CSR | Admin |
| `admin/project-detail.html` | `app/admin/projects/[id]/page.tsx` | CSR | Admin |
| `admin/volunteers.html` | `app/admin/volunteers/page.tsx` | CSR | Admin |
| `admin/organizations.html` | `app/admin/organizations/page.tsx` | CSR | Admin |
| `admin/users.html` | `app/admin/users/page.tsx` | CSR | Admin |
| `admin/success-cases.html` | `app/admin/success-cases/page.tsx` | CSR | Admin |
| `admin/kpi.html` | `app/admin/kpi/page.tsx` | CSR | Admin |

---

## 6. Component Architecture

### 6.1 Shared Components (from mockup CSS)

> mockup의 `.btn/.card/.badge` 등 CSS 클래스를 shadcn/ui 컴포넌트로 1:1 전환

| Mockup Class | shadcn/ui 또는 Custom | 파일 |
|-------------|---------------------|------|
| `.btn.btn--primary/secondary/ghost` | `<Button variant>` | `components/ui/button.tsx` |
| `.card.card--hover` | `<Card>` + hover variant | `components/ui/card.tsx` |
| `.badge.badge--*` | `<Badge variant>` | `components/ui/badge.tsx` |
| `.form-input/.form-textarea` | `<Input>, <Textarea>` | `components/ui/input.tsx` |
| `.stat-card` | Custom | `components/ui/stat-card.tsx` |
| `.timeline/.status-timeline` | Custom | `components/common/status-timeline.tsx` |
| `.filter-bar` | Custom | `components/common/filter-bar.tsx` |
| `.pagination` | Custom | `components/common/pagination.tsx` |
| `.gnb/.lnb/.footer` | Custom | `components/layout/*.tsx` |
| `.phase-track` | Custom | `components/common/phase-indicator.tsx` |
| `.kanban` | Custom | `features/projects/project-kanban.tsx` |
| `.idea-card` | Custom | `features/projects/idea-card.tsx` |

### 6.2 Layout Components

```
components/layout/
├── AppShell.tsx          # 전체 레이아웃 래퍼 (SSR 친화)
├── public/
│   ├── PublicHeader.tsx   # GNB 공개용
│   ├── PublicFooter.tsx
├── user/
│   ├── UserHeader.tsx     # GNB (로그인 상태)
│   └── UserSidebar.tsx    # LNB
└── admin/
    ├── AdminSidebar.tsx   # 다크 사이드바
    └── AdminTopbar.tsx    # 검색바 + 알림
```

### 6.3 Feature Modules

```
features/
├── auth/
│   ├── api.ts              # TanStack Query hooks
│   ├── login-form.tsx
│   ├── register-form.tsx
│   ├── oauth-buttons.tsx   # 카카오/네이버/구글
│   └── use-auth.ts         # 인증 상태 hook
│
├── issues/
│   ├── api.ts
│   ├── issue-card.tsx
│   ├── issue-list-item.tsx
│   ├── issue-form.tsx      # 등록/수정
│   ├── issue-filters.tsx
│   ├── issue-map-view.tsx  # Kakao Map
│   ├── issue-detail.tsx
│   ├── vote-button.tsx
│   ├── status-timeline.tsx
│   └── convert-to-project-dialog.tsx
│
├── projects/
│   ├── api.ts
│   ├── project-card.tsx
│   ├── project-kanban.tsx
│   ├── phase-indicator.tsx
│   ├── member-list.tsx
│   ├── milestone-item.tsx
│   ├── deliverable-upload.tsx
│   ├── feedback-form.tsx   # 설문/체크/사진/메모
│   ├── feedback-summary.tsx
│   ├── idea-board.tsx      # 드래그&드롭
│   ├── idea-card.tsx
│   └── kpi-tracker.tsx
│
├── volunteers/
│   ├── api.ts
│   ├── volunteer-card.tsx
│   ├── volunteer-detail.tsx
│   ├── apply-button.tsx
│   ├── participant-list.tsx
│   ├── vms-sync-status.tsx
│   └── portfolio.tsx
│
├── cms/
│   ├── api.ts
│   ├── page-editor.tsx     # TipTap WYSIWYG
│   ├── page-list.tsx
│   ├── banner-list.tsx
│   ├── banner-editor.tsx
│   └── image-upload.tsx
│
├── esg/
│   ├── api.ts
│   ├── sdgs-grid.tsx       # 17개 타일
│   ├── kpi-goal-card.tsx
│   └── campus-performance.tsx
│
├── organizations/
│   ├── api.ts
│   ├── org-card.tsx
│   └── mou-timeline.tsx
│
├── cases/
│   ├── api.ts
│   ├── case-card.tsx
│   └── story-editor.tsx    # 문제→과정→결과→임팩트
│
└── admin/
    ├── dashboard.tsx
    ├── stats-card.tsx
    └── user-management.tsx
```

### 6.4 Key Component Interfaces

```typescript
// features/issues/types.ts
export type IssueStatus = 'submitted' | 'reviewing' | 'assigned' | 'progress' | 'resolved' | 'rejected';
export type IssueCategory = 'environment' | 'safety' | 'transport' | 'welfare' | 'culture' | 'other';
export type CampusCode = 'DJ' | 'GJ' | 'YS' | 'SJ';

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  categoryName: string;
  status: IssueStatus;
  statusName: string;
  campus: Campus;
  author: { id?: string; name: string; type: string };
  assignee?: { id: string; name: string };
  location: { lat: number; lng: number; address: string };
  imageUrls: string[];
  voteCount: number;
  viewCount: number;
  commentCount: number;
  isAnonymous: boolean;
  linkedProjectId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// features/projects/types.ts
export type ProjectPhase = 'discover' | 'execute' | 'develop' | 'verify' | 'utilize';

export interface Project {
  id: string;
  title: string;
  description: string;
  phase: ProjectPhase;
  phaseIndex: number;
  campus: Campus;
  livinglabType: string;
  leader: { id: string; name: string; dept: string };
  memberCount: number;
  partnerCount: number;
  targetSdgs: number[];
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
}
```

---

## 7. Authentication & Authorization

### 7.1 Auth Flow

```
[사용자] 로그인 폼 제출
    │
    ▼
[Next.js] POST /api/v1/auth/login
    │
    ▼
[FastAPI] 사용자 검증 + bcrypt 해시 비교
    │
    ▼
[FastAPI] JWT 발급 (Access 15분 + Refresh 7일)
    │
    ▼
[Next.js] httpOnly Cookie로 Refresh, memory로 Access
    │
    ▼
[이후 요청] Authorization: Bearer {access_token}
    │
    ├──→ 401 시 /auth/refresh로 자동 갱신
    └──→ Access 토큰 갱신
```

### 7.2 Social Login (OAuth2)

```
[사용자] "카카오로 시작" 클릭
    │
    ▼
[Next.js] window.location = /api/v1/auth/oauth/kakao
    │
    ▼
[FastAPI] state 생성 → Kakao OAuth URL로 리다이렉트
    │
    ▼
[Kakao] 사용자 동의 → callback?code=...&state=...
    │
    ▼
[FastAPI] /auth/oauth/kakao/callback
    │   1. code → access_token 교환
    │   2. Kakao API로 사용자 정보 조회
    │   3. users 테이블에서 oauth_provider+oauth_id로 조회/생성
    │   4. JWT 발급
    ▼
[Next.js] 리다이렉트 /mypage (토큰 저장)
```

### 7.3 Role-based Authorization

```typescript
// middleware.ts (Next.js)
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 공개 경로 허용
  if (isPublicPath(path)) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;
  if (!token) return NextResponse.redirect('/login');

  const user = await verifyToken(token);

  // 관리자 경로 체크
  if (path.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect('/mypage');
  }

  return NextResponse.next();
}

// 역할 체계
type UserRole =
  | 'student'       // 학생
  | 'professor'     // 교수
  | 'staff'         // 직원
  | 'citizen'       // 시민
  | 'gov_officer'   // 지자체 공무원
  | 'enterprise'    // 기업 담당자
  | 'admin';        // 플랫폼 관리자
```

---

## 8. External Integrations

### 8.1 VMS/1365 연동 설계

```python
# backend/app/integrations/vms_client.py
class VMSClient:
    def __init__(self, api_key: str, api_url: str):
        self.api_key = api_key
        self.api_url = api_url

    async def sync_volunteer_activity(
        self,
        participation: VolunteerParticipation
    ) -> VMSSyncResult:
        """
        봉사활동 참여 완료 시 VMS에 자동 전송
        실패 시 Redis 큐에 재시도 등록 (최대 3회)
        """
        payload = {
            "volunteer_id": participation.user.vms_id,
            "activity_name": participation.activity.title,
            "hours": float(participation.actual_hours),
            "started_at": participation.activity.start_datetime.isoformat(),
            "ended_at": participation.activity.end_datetime.isoformat(),
            "location": participation.activity.location,
            "organizer": "SOS랩 (USCP)",
        }

        try:
            response = await self._post("/api/volunteer/record", payload)
            return VMSSyncResult(
                success=True,
                record_id=response["record_id"]
            )
        except VMSAPIError as e:
            await self._enqueue_retry(participation.id, e)
            raise
```

### 8.2 Kakao/Naver/Google OAuth

- 표준 OAuth2 Authorization Code Flow
- 각 Provider별 독립 모듈 (`integrations/kakao_oauth.py` 등)
- 공통 인터페이스 `AbstractOAuthProvider`로 추상화
- state 파라미터로 CSRF 방어

### 8.3 Kakao Map

- 프론트엔드에서 직접 SDK 사용 (`@types/kakao-js-sdk`)
- 이슈 등록 시: Map Picker 컴포넌트 (드래그 핀 + GPS + 주소 자동 변환)
- 이슈 목록 지도 뷰: 클러스터링 + 상태별 색상 핀
- 키는 `NEXT_PUBLIC_KAKAO_MAP_API_KEY` (JavaScript key)

---

## 9. Security

### 9.1 OWASP Top 10 대응

| 위협 | 대응 |
|------|------|
| A01 Broken Access Control | JWT + Role-based middleware + 리소스 소유자 검증 |
| A02 Cryptographic Failures | bcrypt(12 rounds), HTTPS 강제, 민감 데이터 AES-256 |
| A03 Injection | SQLAlchemy ORM (자동 파라미터화), Pydantic 검증 |
| A04 Insecure Design | 최소 권한 원칙, 기본 거부 |
| A05 Security Misconfig | `.env` 관리, secrets 회전, CORS 화이트리스트 |
| A06 Vulnerable Components | Dependabot + `pip-audit` + `npm audit` |
| A07 Authentication Failures | Rate limit(로그인 5회/분), JWT 짧은 수명, MFA 준비 |
| A08 Data Integrity | CSRF 토큰 (쿠키 기반 경로), JWT 서명 검증 |
| A09 Logging/Monitoring | Sentry + 구조화 로그 + 보안 이벤트 감사 |
| A10 SSRF | 외부 URL 화이트리스트 |

### 9.2 개인정보 보호

- **최소 수집**: 이름, 이메일, 역할, 캠퍼스만 필수
- **암호화**: 이메일/전화번호 AES-256 (검색은 해시 인덱스)
- **익명 제보**: `is_anonymous=true`면 `author_id`만 서버 저장, 응답엔 "익명"으로 마스킹
- **탈퇴**: 계정 삭제 시 개인정보 즉시 삭제, 활동 이력은 익명화
- **감사**: 개인정보 영향평가 선행

### 9.3 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/login` | 5 req/min per IP |
| `/auth/register` | 3 req/hour per IP |
| `/auth/password/forgot` | 3 req/hour per email |
| `/issues` POST | 10 req/hour per user |
| 기본 API | 60 req/min per user |

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
         E2E (10%)     Playwright — 핵심 시나리오 20개
        ┌─────────┐
       Integration  (30%)   pytest + httpx — API 엔드포인트
      ┌───────────────┐
     Unit (60%)          Vitest (Frontend) + pytest (Backend)
    ┌─────────────────────┐
```

### 10.2 Key Test Cases

**Unit**: 컴포넌트 렌더링, 서비스 로직, 유틸리티
**Integration**: API 엔드포인트, DB 트랜잭션, 외부 연동 Mock
**E2E**:
- 회원가입 → 로그인 → 이슈 등록 → 댓글 → 로그아웃
- 관리자 이슈 배정 → 프로젝트 전환 → 단계 변경
- 프로젝트 멤버 추가 → 마일스톤 생성 → 피드백 등록
- 봉사활동 신청 → 출석 → VMS 동기화 확인
- CMS 페이지 편집 → 발행 → 공개 사이트 반영
- 반응형: Mobile/Desktop에서 핵심 플로우 동작

### 10.3 Target Coverage

- 단위 테스트: 70%+
- 통합 테스트: 핵심 API 전체
- E2E: 핵심 시나리오 20개

---

## 11. Performance

### 11.1 Target

| Metric | Goal |
|--------|------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| Lighthouse Performance | 80+ |
| API p95 latency | < 500ms |

### 11.2 Optimizations

- **Next.js**: Image optimization, font optimization, static generation
- **Database**: Connection pooling (asyncpg), 적절한 인덱스, N+1 회피 (eager loading)
- **Cache**: Redis 캐시 (`/issues/stats`, `/esg/sdgs-dashboard` 등 무거운 조회)
- **CDN**: 정적 자산 캐싱
- **Code splitting**: 동적 import (`TipTap`, `Kakao Map` 등 무거운 컴포넌트)
- **Bundle size**: 500KB 이하 초기 로드

---

## 12. Deployment

### 12.1 Docker Compose Stack

```yaml
# docker-compose.yml (발췌)
services:
  nginx:
    image: nginx:alpine
    ports: [80:80, 443:443]
    volumes: [./nginx:/etc/nginx/conf.d, ./certs:/etc/ssl]

  web:                    # Next.js
    build: ./frontend
    environment: [...]
    depends_on: [api]

  api:                    # FastAPI
    build: ./backend
    environment: [...]
    depends_on: [db, redis, minio]

  db:
    image: postgis/postgis:16-3.4
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    volumes: [miniodata:/data]

  worker:                 # Celery (백그라운드 작업)
    build: ./backend
    command: celery -A app.worker worker
    depends_on: [redis, db]

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### 12.2 온프레미스 배포

- **환경**: 대학 전산실 물리/가상 서버 (Ubuntu 22.04)
- **네트워크**: 학교 내부 네트워크 + 외부 접근용 리버스 프록시
- **백업**: 일별 PostgreSQL pg_dump + MinIO 스냅샷
- **모니터링**: Prometheus + Grafana + Sentry
- **SSL**: Let's Encrypt 또는 학교 기관 인증서

### 12.3 CI/CD

```
GitHub Push → GitHub Actions
  ├─ lint (eslint, ruff)
  ├─ test (vitest, pytest)
  ├─ build (Next.js, Docker)
  ├─ scan (Trivy, npm audit)
  └─ deploy (ssh to on-premise)
```

---

## 13. Error Handling

### 13.1 Error Response Format (RFC 7807)

```json
{
  "type": "https://sos-lab.univ.ac.kr/errors/validation",
  "title": "입력값 검증 실패",
  "status": 400,
  "detail": "제목은 최소 5자 이상이어야 합니다",
  "instance": "/api/v1/issues",
  "errors": {
    "title": "최소 5자 이상",
    "category": "필수 입력"
  }
}
```

### 13.2 공통 에러 코드

| HTTP | Code | 메시지 (KR) | 대응 |
|:---:|------|-----------|------|
| 400 | `VALIDATION_ERROR` | 입력값이 올바르지 않습니다 | 필드별 에러 표시 |
| 401 | `UNAUTHORIZED` | 로그인이 필요합니다 | 로그인 페이지 |
| 403 | `FORBIDDEN` | 권한이 없습니다 | 안내 페이지 |
| 404 | `NOT_FOUND` | 요청한 정보를 찾을 수 없습니다 | 404 페이지 |
| 409 | `CONFLICT` | 이미 처리된 요청입니다 | 새로고침 |
| 413 | `PAYLOAD_TOO_LARGE` | 파일 크기 초과 | 10MB 이하 |
| 422 | `UNPROCESSABLE` | 처리할 수 없습니다 | 상세 안내 |
| 429 | `RATE_LIMITED` | 요청이 너무 많습니다 | 대기 |
| 500 | `INTERNAL_ERROR` | 서버 오류 | Sentry 로깅 + 재시도 |
| 503 | `SERVICE_UNAVAILABLE` | 점검 중 | 점검 페이지 |

---

## 14. Implementation Guide

### 14.1 File Structure

```
deep-sos/
├── frontend/                    # Next.js 15
│   ├── app/
│   │   ├── (public)/           # 공개 영역
│   │   ├── (auth)/             # 로그인/회원가입
│   │   ├── (user)/             # 사용자 영역
│   │   ├── admin/              # 관리자
│   │   ├── api/                # BFF API Routes
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── layout/             # Header/LNB/Footer
│   │   └── common/             # 공통 (Timeline, Pagination 등)
│   ├── features/               # 9개 feature 모듈
│   ├── lib/                    # API 클라이언트, 유틸
│   ├── hooks/                  # 커스텀 hooks
│   ├── stores/                 # Zustand
│   ├── types/                  # TypeScript 타입
│   ├── public/
│   │   ├── manifest.json       # PWA
│   │   └── sw.js               # Service Worker
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── api/v1/             # 라우터 (BF-1~7 기준)
│   │   ├── models/             # SQLAlchemy 2.0
│   │   ├── schemas/            # Pydantic v2
│   │   ├── services/           # 비즈니스 로직
│   │   ├── integrations/       # 외부 연동
│   │   ├── core/               # 설정, 인증, 미들웨어
│   │   ├── utils/
│   │   └── main.py
│   ├── alembic/                # DB 마이그레이션
│   │   └── versions/
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
│
├── mockup/                     # 프로토타입 (참고용, 유지)
├── docs/
│   ├── 01-plan/
│   ├── 02-design/
│   └── ...
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/
│   └── nginx.conf
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

### 14.2 Implementation Order (Sprint 기반)

> [uscp-v1.plan.md §8](../../01-plan/features/uscp-v1.plan.md#8-v1-sprint-plan-14주--202609--202612)의 Sprint 0~7 계획 참조

**핵심 경로**:
1. Sprint 0: 인프라 + DB + 레이아웃
2. Sprint 1: 공개 영역 + 인증 (SSR 페이지 + OAuth)
3. Sprint 2: 이슈 CRUD + 지도 + 상태 관리
4. Sprint 3: 프로젝트 + 5단계 + 멤버
5. Sprint 4: 피드백 + 아이디어 보드 + KPI
6. Sprint 5: 봉사활동 + VMS 연동
7. Sprint 6: CMS + ESG + 관리자 대시보드
8. Sprint 7: QA + 배포

---

## 15. Sprint 2 — Write APIs + CMS + Auth 확장

> Sprint 1 완료 상태(Match Rate 95%)에서 이월된 Sprint 2 상세 설계.
> 전제: §3(Data Model), §4(API Convention — `{data, meta}` + RFC 7807) 준수.

### 15.1 목표 (2주 · Week 1~2)

| # | 항목 | BF | 화면 | 비고 |
|---|---|---|---|---|
| S2-1 | CMS 페이지/배너 관리 | BF-운영 | P-02/P-04 DB 전환, 관리자 P-20 | TipTap JSON 저장, 렌더링은 클라이언트 컴포넌트 |
| S2-2 | BF-1 쓰기 API | BF-1 | P-12 이슈 등록, P-06 투표/댓글 | multipart 이미지 업로드 |
| S2-3 | 인증 보강 | 공통 | P-10, P-18 프로필 | 비밀번호 재설정, logout, 프로필 수정 |
| S2-4 | 사용자 대시보드 | 공통 | P-11 | 내 이슈/프로젝트/봉사 요약 |

### 15.2 신규 DB 테이블 (Alembic 0003)

```sql
-- CMS
CREATE TABLE cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,  -- 'about' / 'guide'
    title VARCHAR(200) NOT NULL,
    content_json JSONB NOT NULL,       -- TipTap document
    content_html TEXT,                 -- 서버 렌더 캐시
    status VARCHAR(20) DEFAULT 'published' NOT NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE cms_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position VARCHAR(20) NOT NULL,     -- 'hero' / 'sub' / 'footer'
    title VARCHAR(200) NOT NULL,
    subtitle TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    order_index INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- BF-1 Write
CREATE TABLE issue_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (issue_id, user_id)
);

CREATE TABLE issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES issue_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 인증 보강
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_issue_votes_issue ON issue_votes(issue_id);
CREATE INDEX idx_issue_comments_issue ON issue_comments(issue_id, created_at DESC);
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
```

### 15.3 신규 API 엔드포인트

모두 §4.0 Convention 준수 (`{data, meta}` / Problem Details).

#### CMS (관리자 전용, role=admin)
- `GET /cms/pages/:slug` — 공개 조회 (P-02/P-04에서 SSR 사용)
- `GET /cms/pages` — 관리자 목록 (auth required)
- `PUT /cms/pages/:slug` — 관리자 업데이트 (TipTap JSON body)
- `GET /cms/banners?position=hero` — 공개 조회
- `POST /cms/banners` · `PUT /cms/banners/:id` · `DELETE /cms/banners/:id`

#### BF-1 쓰기
- `POST /issues` — multipart (title, description, category, images[])
- `POST /issues/:id/vote` · `DELETE /issues/:id/vote` — 토글
- `GET /issues/:id/comments?page=1&size=20`
- `POST /issues/:id/comments` — { content, parent_id? }
- `DELETE /issues/:id/comments/:comment_id` — soft delete

#### 인증 보강
- `POST /auth/logout` — refresh token 무효화 (stateless면 no-op + 200)
- `POST /auth/password/forgot` — { email } → 이메일 발송 (dev: 콘솔 로그)
- `POST /auth/password/reset` — { token, new_password }
- `PUT /auth/me` — { name, department, profile_image_url }
- `POST /auth/me/avatar` — multipart, MinIO 업로드 후 URL 반환 (구현 시 `/auth` 네임스페이스 통합)

#### 사용자 대시보드
- `GET /users/me/summary` — { my_issues_count, my_projects_count, my_volunteer_hours, recent_activities[] }
- `GET /users/me/issues?page=1&size=20` — 내가 등록한 이슈
- `GET /users/me/projects?page=1&size=20` — 내가 리드하는 프로젝트 (Sprint 2 범위)
- `GET /users/me/volunteers?page=1&size=20` — 내가 참여한 봉사 (Sprint 3 `volunteer_participations` 테이블 도입 후 추가)

### 15.4 신규 프론트엔드 라우트

| 경로 | 컴포넌트 | 유형 | 설명 |
|---|---|---|---|
| `/user/dashboard` | P-11 | CSR (인증 필요) | 요약 대시보드 |
| `/user/profile` | P-18 | CSR | 프로필 수정 + 아바타 업로드 |
| `/issues/new` | P-12 | CSR | 이슈 등록 (multipart) |
| `/password/forgot` | 공통 | CSR | 이메일 입력 |
| `/password/reset?token=…` | 공통 | CSR | 새 비밀번호 입력 |
| `/admin` | P-20 | CSR (admin) | 관리자 진입점 |
| `/admin/cms/pages` | P-20a | CSR (admin) | TipTap 편집기 |
| `/admin/cms/banners` | P-20b | CSR (admin) | 배너 관리 |

P-02 `/about`, P-04 `/guide`는 **기존 파일 유지하되 SSR에서 `GET /cms/pages/{slug}` 조회 후 TipTap JSON → HTML 렌더**로 전환.

### 15.5 TipTap 렌더링 전략

- 관리자 편집: `@tiptap/react` + `StarterKit` + `@tiptap/extension-image` + `@tiptap/extension-link` — CSR 전용 (`'use client'`)
- 공개 렌더: 서버에서 TipTap JSON → HTML 변환(`@tiptap/html` + Node SSR)하여 `content_html` 컬럼 캐시. 조회는 DB 캐시 직접 사용하여 SSR 빠른 응답 유지
- 이미지 업로드: 편집기 내부에서 `POST /admin/upload` (관리자 전용 presigned PUT URL) → MinIO → URL 반환

### 15.6 보안 · 권한

- `/auth/password/reset`: bcrypt로 `token_hash` 저장, 1회용, 30분 유효, IP 로깅
- CMS write: role=admin 체크 + CSRF 불필요 (SPA + JWT Bearer)
- `POST /issues`: multipart 업로드 크기 제한 10MB/파일, 최대 5장, Content-Type 허용 목록 `image/jpeg|png|webp`
- 투표/댓글 rate limit: Redis로 user_id + endpoint 기준 60초 10회

### 15.7 Sprint 2 구현 순서 (2주 · 10 영업일)

**Week 1 — Backend 우선**
1. Day 1: Alembic 0003 마이그레이션 + 모델 4종 + 기본 seed
2. Day 2: CMS API (pages 3종, banners 5종) + 관리자 권한 dependency
3. Day 3: BF-1 쓰기 API (POST issues, vote 토글, comments)
4. Day 4: 인증 보강 (logout, password reset, PUT me, avatar upload)
5. Day 5: 사용자 대시보드 집계 API + 통합 테스트

**Week 2 — Frontend**
6. Day 6: P-12 이슈 등록 폼 + multipart 업로드 훅
7. Day 7: P-06 상세 페이지에 투표/댓글 UI 추가
8. Day 8: P-11 사용자 대시보드 + P-18 프로필 편집
9. Day 9: 관리자 P-20 CMS 편집기 (TipTap) + P-02/P-04 DB 전환
10. Day 10: 비밀번호 재설정 흐름 + E2E 테스트 + `/pdca analyze uscp-v1`

### 15.8 Sprint 2 완료 기준 (DoD)

- 신규 API 14개 모두 `{data, meta}` / Problem Details 포맷 준수
- 프론트엔드 8개 신규 라우트 SSR/CSR 정상 렌더
- Alembic 0003 적용 후 Sprint 1 테스트 회귀 없음
- Gap Analysis Match Rate ≥ 90%
- P-02/P-04가 관리자 편집 후 5초 이내 공개 반영 (캐시 무효화 확인)

### 15.9 Sprint 2 이후 이월 (Sprint 3+)

| 항목 | 이월 사유 |
|---|---|
| BF-3 프로젝트 워크플로 (project_members/milestones) | Sprint 3 |
| BF-5 봉사 신청/확정/VMS 연동 | Sprint 3~4 (VMS API 키 확보 대기) |
| BF-6 포트폴리오 자동 생성 | Sprint 4 |
| 카카오맵 (P-05 지도 뷰) | Sprint 4 |
| OAuth 실연동 | client_id 확보 시점 |
| KPI 대시보드 P-30 | Sprint 5 |

---

## 16. Sprint 3 — Rate Limit + SMTP + BF-3/5/6

> Sprint 2 완료(Match Rate 97%) 후 Sprint 3 상세 설계.
> Plan §11 참조. **Rate Limit P0 우선**, §4 Convention 준수.

### 16.1 Rate Limit (P0) — Redis Sliding Window

#### 16.1.1 구현 모듈
`backend/app/core/rate_limit.py` 신규 작성:

```python
from redis.asyncio import Redis
from fastapi import HTTPException, Request, status

class RateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def check(self, key: str, max_requests: int, window_seconds: int) -> tuple[int, int]:
        """Sliding window counter.

        Returns (current_count, retry_after_seconds).
        Raises HTTPException 429 if exceeded.
        """
        now = int(time.time())
        bucket_key = f"rl:{key}:{now // window_seconds}"
        pipe = self.redis.pipeline()
        pipe.incr(bucket_key)
        pipe.expire(bucket_key, window_seconds)
        count, _ = await pipe.execute()
        if count > max_requests:
            retry = window_seconds - (now % window_seconds)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Retry after {retry}s",
                headers={"Retry-After": str(retry)},
            )
        return count, 0
```

#### 16.1.2 Dependency Factory
`backend/app/api/deps.py`에 추가:

```python
def rate_limit(
    max_requests: int,
    window_seconds: int,
    key_by: Literal["user", "ip", "user_or_ip"] = "user_or_ip",
    endpoint_key: str | None = None,
):
    async def _dep(
        request: Request,
        current_user: User | None = Depends(get_current_user_optional),
    ):
        if key_by == "user" and current_user is None:
            raise HTTPException(401, "authentication required")
        subject = (
            str(current_user.id) if current_user else request.client.host
        )
        key = f"{endpoint_key or request.url.path}:{subject}"
        limiter = get_rate_limiter()
        await limiter.check(key, max_requests, window_seconds)
    return _dep
```

#### 16.1.3 적용 매트릭스

| 엔드포인트 | max | window | key_by |
|---|:---:|:---:|:---:|
| `POST /issues` | 10 | 3600 | user |
| `POST /issues/{id}/vote` · `DELETE` | 30 | 60 | user |
| `POST /issues/{id}/comments` | 30 | 60 | user |
| `POST /auth/register` | 5 | 3600 | ip |
| `POST /auth/login` | 10 | 60 | ip |
| `POST /auth/password/forgot` | 3 | 3600 | email + 10/3600 ip |
| `POST /cms/banners` · `PUT /cms/pages/{slug}` | 60 | 60 | user (admin) |

#### 16.1.4 에러 포맷
`register_problem_handlers()`가 이미 `HTTPException` → RFC 7807 변환하므로 `429 Too Many Requests`도 동일 포맷으로 자동 응답. `Retry-After` 헤더만 추가 통과.

### 16.2 SMTP 실발송 (P1)

#### 16.2.1 모듈
`backend/app/core/mailer.py`:
- `aiosmtplib` 사용 (async)
- `jinja2` 템플릿 — `backend/app/templates/email/*.html`
- 환경 변수: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_USE_TLS`, `MAIL_DEV_MODE`
- dev mode일 때 stdout 출력 (현재 동작 유지)

#### 16.2.2 템플릿
- `password_reset.html` — 재설정 링크 `{FRONTEND_URL}/password/reset?token={token}`
- `welcome.html` — Sprint 4 이월

#### 16.2.3 적용
`POST /auth/password/forgot` 성공 시 기존 `_logger.warning` 자리에 `await send_password_reset_email(user.email, plain_token)` 추가.

### 16.3 BF-3 프로젝트 팀원 워크플로 (P1)

#### 16.3.1 신규 테이블 (Alembic 0004)

```sql
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' NOT NULL,  -- leader/member/mentor
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (project_id, user_id)
);

CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,  -- pending/in_progress/done
    order_index INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE project_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,  -- pending/accepted/rejected
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_applications_project ON project_applications(project_id, status);
```

#### 16.3.2 신규 API

| Method | Path | Auth |
|---|---|---|
| `POST /projects/{id}/apply` | 로그인 필요 | `{message}` body |
| `DELETE /projects/{id}/apply` | 로그인 (본인) | 신청 취소 |
| `GET /projects/{id}/members` | public | role 별 그룹 |
| `GET /projects/{id}/applications` | leader only | pending 목록 |
| `PUT /projects/{id}/applications/{aid}` | leader only | `{status}` → accepted 시 `project_members` 자동 생성 |
| `GET /projects/{id}/milestones` | public | 순서대로 정렬 |
| `POST /projects/{id}/milestones` | leader only | |
| `PUT /projects/{id}/milestones/{mid}` | leader only | |

#### 16.3.3 프론트
- P-25 `/projects/[id]`: 기존 5단계 시각화 아래에 팀원 카드 섹션 + 지원 버튼 (클라이언트 컴포넌트 `ProjectMembership.tsx`)
- `GET /users/me/projects` → `project_members` 조인으로 리더+멤버 통합 반환

### 16.4 BF-5 봉사 신청/확정 (P1)

#### 16.4.1 신규 테이블 (Alembic 0004 동일 마이그레이션)

```sql
CREATE TABLE volunteer_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES volunteer_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'applied' NOT NULL,  -- applied/confirmed/completed/cancelled
    applied_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    confirmed_at TIMESTAMPTZ,
    confirmed_hours NUMERIC(4,1),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (activity_id, user_id)
);

CREATE INDEX idx_volunteer_part_user ON volunteer_participations(user_id);
CREATE INDEX idx_volunteer_part_activity ON volunteer_participations(activity_id);
```

#### 16.4.2 신규 API
- `POST /volunteers/{id}/apply` (로그인) — `current_participants` +1
- `DELETE /volunteers/{id}/apply` (본인) — 취소 시 `-1`
- `PUT /volunteers/{id}/participations/{pid}` (admin) — 확정/시간 기록
- `GET /users/me/volunteers` (복원) — 내 참여 활동

#### 16.4.3 대시보드 통합
`GET /users/me/summary`의 `my_volunteer_hours` 현재 `0.0` 고정 → `volunteer_participations` JOIN으로 `SUM(confirmed_hours) WHERE user_id=me AND status='completed'` 실제 집계.

### 16.5 BF-6 포트폴리오 MVP (P2)

#### 16.5.1 접근
**신규 테이블 없음** — 기존 3개 테이블(issues, project_members, volunteer_participations) 집계 전용 API.

#### 16.5.2 신규 API
- `GET /users/{user_id}/portfolio` (public) — `{user, stats, issues[], projects[], volunteers[]}`
- 본인이 아닐 경우 `is_public` 필드 체크 (users 테이블에 추가)

#### 16.5.3 프론트
- `/portfolio/[user_id]` 공개 페이지 (P-17)
- 타임라인 UI — 이슈/프로젝트/봉사 활동을 created_at 역순으로 통합 노출

### 16.6 Refresh Token 블랙리스트 (P2)

#### 16.6.1 변경 사항
- `create_access_token` / `create_refresh_token` 에 `jti: uuid4().hex` 추가
- `POST /auth/logout` → Redis `SETEX rt_blacklist:{jti} <ttl_seconds> 1`
- `decode_token()` 검증 시 `await redis.exists("rt_blacklist:{jti}")` → 있으면 401

### 16.7 Sprint 3 DoD

1. Rate Limit 429 응답 정상 동작 (부하 스크립트로 검증, RFC 7807 포맷 + Retry-After)
2. SMTP 이메일 1건 수신 (prod mode 기준, dev는 콘솔 폴백)
3. BF-3 E2E: 사용자 지원 → 리더 수락 → `project_members` 자동 생성 → `/users/me/projects`에 반영
4. BF-5 E2E: 봉사 신청 → 운영자 확정(`confirmed_hours`) → `/user/dashboard`의 `my_volunteer_hours` 실제 값 갱신
5. BF-6 포트폴리오 공개 페이지 → 이슈/프로젝트/봉사 통합 타임라인 렌더
6. Refresh token 블랙리스트: 로그아웃 후 동일 토큰 재사용 시 401
7. Sprint 2 회귀 없음 (Match Rate ≥ 95% 유지)

### 16.8 Sprint 4 이월

- VMS/1365 실연동 (봉사 시간 자동 동기화)
- 카카오맵 SDK (P-05 지도 뷰)
- OAuth 실연동 (client_id 확보)
- P-30 KPI 대시보드 (플랫폼 통계)
- TipTap 이미지 업로드 편집기 내부화 (presigned URL → MinIO)
- PDF 포트폴리오 내보내기

---

## 17. Sprint 4 — External Integrations + KPI

> Sprint 3 완료(99%) 후 외부 통합 + 관리자 KPI.
> Plan §12 참조. **내부 의존성 우선**, 외부 키 필요한 항목은 Mock/Stub으로 완전 검증.

### 17.1 P-30 관리자 KPI 대시보드 (P0)

#### 17.1.1 집계 API (4개, admin only)
- `GET /admin/kpi/summary` — total_users, active_users_30d, total_issues, resolved_rate, active_projects, total_volunteer_hours, success_cases
- `GET /admin/kpi/campuses` — 캠퍼스 4개 집계
- `GET /admin/kpi/categories` — 이슈 카테고리 6종 분포
- `GET /admin/kpi/timeseries?days=30` — 일별 신규 이슈/사용자

#### 17.1.2 구현
- `backend/app/api/v1/admin_kpi.py` 신규
- `backend/app/schemas/kpi.py` — 4개 스키마
- 집계: `func.count/sum/date_trunc` + project_members/volunteer_participations JOIN
- 캐시: Sprint 5에서 Redis TTL 5분 도입 예정

#### 17.1.3 프론트 `/admin/kpi`
- Admin 사이드바에 "KPI" 메뉴 추가
- 경량 SVG + tailwind로 직접 차트 구현 (recharts 회피로 번들 최소화)
- Summary 카드 7개 / 캠퍼스 가로 막대 / 카테고리 도넛 / 시계열 라인

### 17.2 카카오맵 (P1)

- `components/map/KakaoMapLoader.tsx` — Next Script로 `dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false` 주입
- `window.kakao.maps.load()` 콜백 후 Map 인스턴스
- `/issues?view=map` 토글 — 상단 버튼으로 list ↔ map 전환
- `location_lat/lng` 있는 이슈만 마커 drop, InfoWindow에 제목/공감 수/링크
- `NEXT_PUBLIC_KAKAO_MAP_KEY` 미설정 시 fallback "지도 준비 중" UI

### 17.3 OAuth 실연동 (P1)

#### 17.3.1 카카오 플로우
```
1. /auth/oauth/kakao → Kakao 인증 URL redirect (기존 유지)
2. Kakao 콜백 → GET /auth/oauth/kakao/callback?code=xxx
3. Backend:
   a. POST kauth.kakao.com/oauth/token (code → access_token)
   b. GET kapi.kakao.com/v2/user/me → {id, kakao_account}
   c. User upsert (oauth_provider='kakao', oauth_id=kakao.id)
   d. JWT 발급
   e. redirect {FRONTEND_URL}/auth/oauth/kakao?token=xxx&refresh=yyy
4. Frontend /auth/oauth/[provider]:
   - searchParams.token → localStorage → /user/dashboard
```

#### 17.3.2 공통 어댑터
- `backend/app/services/oauth_service.py` — `fetch_user(provider, code) -> OAuthUser`
- 3개 구현: _kakao/_naver/_google (httpx)
- client_id 미설정 시 기존 501 동작 유지 (환경변수 가드)

### 17.4 VMS/1365 어댑터 (P2)

```python
# backend/app/integrations/vms_client.py
class VmsClient(Protocol):
    async def record_hours(self, user_id, activity_id, hours) -> str: ...

class MockVmsClient:
    async def record_hours(self, *args, **kwargs) -> str:
        return f"mock-{uuid.uuid4().hex[:8]}"

class PortalVmsClient:
    # 1365 실 API, Sprint 5 이후
    ...

def get_vms_client() -> VmsClient:
    return MockVmsClient() if settings.vms_mode == "mock" else PortalVmsClient()
```

**자동 트리거**: `PUT /volunteers/{id}/participations/{pid}`가 `completed`로 진입하면 `record_hours()` 호출. 실패 시 로그만 (best-effort).

### 17.5 TipTap 이미지 업로드 (P2)

- `POST /admin/upload/image` (admin only, multipart) → MinIO → presigned URL
- `storage.upload_image()` 재사용 (folder="cms")
- TipTapEditor 이미지 버튼 개선: URL 입력 / 파일 업로드 두 탭

### 17.6 Sprint 4 DoD

1. `/admin/kpi` 4개 차트 렌더 (empty state 포함)
2. 카카오맵: 키 주입 시 마커, 미설정 시 fallback
3. OAuth 카카오 로컬 데모 성공
4. VMS Mock: 봉사 완료 → mock-id 로그
5. TipTap 이미지 업로드 → MinIO 저장 → 본문 삽입
6. Sprint 1~3 회귀 없음 (≥95%)
7. 새 Gap Analysis ≥ 90%

### 17.7 Sprint 5+ 이월
- PDF 포트폴리오 내보내기
- WebSocket 실시간 알림
- 성능 최적화, 부하 테스트
- 운영 배포 (nginx, HTTPS, CI/CD)

---

## 18. Sprint 5 — Production Deployment Readiness

> Sprint 4 완료(100%) 후 Sprint 5 상세 설계. Plan §13 참조.

### 18.1 nginx + HTTPS (P0)

#### 18.1.1 파일 구조
```
nginx/
├── conf.d/
│   └── uscp.conf           # server blocks
├── Dockerfile              # nginx:alpine + certbot
└── init-letsencrypt.sh     # 최초 SSL 발급 스크립트
docker-compose.prod.yml     # 운영 compose
.env.prod.example           # 운영 환경변수 템플릿
```

#### 18.1.2 uscp.conf 핵심
```nginx
upstream backend {
    server api:8000;
    keepalive 32;
}
upstream frontend {
    server web:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name staging.uscp.local;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name staging.uscp.local;

    ssl_certificate /etc/letsencrypt/live/staging.uscp.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.uscp.local/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    add_header Strict-Transport-Security "max-age=31536000" always;

    client_max_body_size 10M;
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    location /api/v1/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 18.1.3 docker-compose.prod.yml
기존 `docker-compose.yml` 위에 override:
- `nginx` 서비스 추가 (80/443 노출)
- `certbot` 서비스 (webroot 공유 볼륨)
- `api`/`web` 컨테이너는 외부 포트 노출 하지 않음 (internal network만)
- `db`/`redis`/`minio` 역시 internal만

### 18.2 CI/CD (P0)

#### 18.2.1 .github/workflows/ci.yml 확장
```yaml
jobs:
  backend-test:
    steps:
      - uv-setup + ruff check + pytest + coverage
  frontend-test:
    steps:
      - pnpm install + eslint + tsc --noEmit + next build
  docker-build:
    needs: [backend-test, frontend-test]
    steps:
      - docker buildx + push to ghcr.io/{org}/uscp-{backend,frontend}:${sha}
```

#### 18.2.2 deploy-staging.yml
```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - SSH into STAGING_HOST
      - docker compose -f docker-compose.prod.yml pull
      - docker compose -f docker-compose.prod.yml up -d --no-deps api web
      - curl -f https://staging.uscp.local/api/v1/health
```

### 18.3 관측성 (P1)

#### 18.3.1 Sentry
- `backend/app/main.py`에 sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment, traces_sample_rate=0.1)
- 기존 `SENTRY_DSN` 환경변수 활용
- Next.js: `@sentry/nextjs` wizard 실행

#### 18.3.2 구조화 로깅
- `backend/app/core/logging.py` — structlog JSON 포맷
- ASGI middleware로 `request_id` 생성 + context 주입
- uvicorn 로그도 JSON으로 통합

#### 18.3.3 /health/ready 강화
```python
@router.get("/health/ready")
async def ready(db: AsyncSession = Depends(get_db)) -> dict:
    results = {}
    try:
        await db.execute(text("SELECT 1"))
        results["db"] = "ok"
    except Exception as e:
        results["db"] = f"error: {e}"
    try:
        await get_redis().ping()
        results["redis"] = "ok"
    except Exception as e:
        results["redis"] = f"error: {e}"
    try:
        get_minio_client().list_buckets()
        results["minio"] = "ok"
    except Exception as e:
        results["minio"] = f"error: {e}"
    all_ok = all(v == "ok" for v in results.values())
    return {"status": "ready" if all_ok else "degraded", "checks": results}
```

### 18.4 성능 (P1)

#### 18.4.1 k6 부하 테스트
- `tests/load/issues.js` — 100 VUs × 5분, GET /issues?page=1&size=20
- `tests/load/projects.js`, `tests/load/kpi.js`
- thresholds: `http_req_duration{p(95)}<500`, `http_req_failed<0.01`

#### 18.4.2 DB 인덱스 (Alembic 0005)
```sql
CREATE INDEX idx_issues_campus_status ON issues(campus_id, status);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);
CREATE INDEX idx_projects_status_phase ON livinglab_projects(status, phase);
```

#### 18.4.3 Redis 캐시
- `backend/app/core/cache.py` — `@cached(key, ttl)` 데코레이터
- `/admin/kpi/summary` TTL=300s (가장 무거움)
- `/cms/pages/{slug}` TTL=60s
- 캐시 키: `cache:{endpoint}:{query_hash}`
- CMS 저장 시 `DEL cache:/cms/pages/*` 무효화

### 18.5 PDF 포트폴리오 (P2)

#### 18.5.1 Playwright 서버사이드
- `playwright` Python 패키지 + 브라우저 컨테이너
- `backend/app/services/pdf_service.py`:
```python
async def generate_portfolio_pdf(user_id: uuid.UUID) -> bytes:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        token = create_access_token(subject=user_id)  # 내부용 1회성 토큰
        await page.goto(f"{settings.frontend_url}/portfolio/{user_id}?pdf=1",
                        wait_until="networkidle")
        pdf = await page.pdf(format="A4", print_background=True)
        await browser.close()
        return pdf
```

#### 18.5.2 엔드포인트
- `POST /users/me/portfolio/pdf` (인증 필요)
- FastAPI `BackgroundTasks`로 생성 + MinIO 업로드
- Presigned URL 반환 (7일 유효)
- `/portfolio/[user_id]?pdf=1` 모드: Header/Footer 숨김, print-friendly 스타일

### 18.6 SSE 알림 (P2)

#### 18.6.1 Alembic 0006
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    -- issue_comment / issue_vote / project_application / project_accepted / volunteer_confirmed
    title VARCHAR(200) NOT NULL,
    body TEXT,
    link_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

#### 18.6.2 SSE 엔드포인트
- `GET /notifications/stream` (text/event-stream, 쿼리 `?token=xxx` 또는 cookie)
- Backend: Redis Pub/Sub `notif:{user_id}` 채널 구독, 새 메시지마다 `data: {json}\n\n` 전송
- 이벤트 발행: 이슈 댓글/투표/프로젝트 수락/봉사 확정 시 `notification INSERT` + Redis publish
- Frontend: `components/notifications/NotificationStream.tsx` + `useNotifications` hook
- Header bell 아이콘 + unread badge + dropdown

#### 18.6.3 REST 보조
- `GET /notifications?unread=true&page=1&size=20` — 히스토리
- `PUT /notifications/{id}/read` — 읽음 처리
- `PUT /notifications/read-all`

### 18.7 Sprint 5 DoD (Plan §13.9와 동일, 9개)

### 18.8 Sprint 6~7 이월
- Sprint 6: E2E 자동화 (Playwright) + 보안 감사 + 접근성
- Sprint 7: 운영 리허설 + 실 도메인 전환 + UAT + v1.0 GA

---

## 19. Sprint 6 — Quality Hardening

> Sprint 5 완료(96%) 후 Sprint 6 상세 설계. Plan §14 참조.

### 19.1 Playwright E2E (P0)

#### 19.1.1 디렉토리 구조
```
frontend/
├── playwright.config.ts       # 멀티 브라우저 + baseURL
├── tests/e2e/
│   ├── fixtures/
│   │   ├── auth.ts            # loginAs() 헬퍼 + storageState 캐시
│   │   └── seed.ts            # 테스트 사용자 시드 보장
│   ├── public.spec.ts         # 공개 탐색
│   ├── auth.spec.ts           # 로그인/대시보드
│   └── bf1-issue.spec.ts      # BF-1 전체 루프
└── package.json               # @playwright/test + scripts
```

#### 19.1.2 playwright.config.ts 핵심
```ts
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3800',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: process.env.CI
    ? undefined  // CI는 별도 서비스 띄움
    : {
        command: 'npm run dev',
        port: 3800,
        reuseExistingServer: true,
      },
});
```

#### 19.1.3 시나리오별 핵심 assertion
**public.spec.ts**:
- `page.goto('/')` → h1 텍스트 확인 + KPI 카드 존재
- `/issues` → 이슈 목록 카드 1개 이상
- `/projects/{id}` 동적 라우트 진입

**auth.spec.ts**:
- 로그인 폼 제출 → `/user/dashboard` 리디렉트
- Header에 "박학생님" 표시 확인
- 로그아웃 → `/login` 복귀

**bf1-issue.spec.ts** (BF-1 happy path):
```
1. loginAs(studentUser)
2. /issues/new → 제목/카테고리/설명 입력 → 제출
3. /issues/{id}로 리디렉트 확인
4. 공감 버튼 클릭 → count 1 증가
5. 댓글 "테스트" 입력 → 등록 → 리스트 표시
6. (cleanup) DB에서 생성 이슈 삭제
```

#### 19.1.4 CI 통합
`.github/workflows/ci.yml`에 e2e-test job 추가:
```yaml
e2e-test:
  needs: [backend, frontend]
  services: [postgres, redis, minio]
  steps:
    - backend + frontend 빌드 + start
    - alembic upgrade head
    - 테스트 사용자 시드
    - npx playwright install --with-deps
    - npx playwright test --project=chromium
    - upload artifact (playwright-report)
```

### 19.2 보안 감사 (P0)

#### 19.2.1 의존성 스캔
- **Backend**: `pip-audit --strict --ignore-vuln PYSEC-YYYY-NNN` (예외 명시)
- **Frontend**: `npm audit --omit=dev --audit-level=high`
- CI에 주간 cron job (`schedule: cron: '0 0 * * 1'`)
- Dependabot 활성화 (`.github/dependabot.yml`) — weekly 업데이트 PR

#### 19.2.2 OWASP 체크리스트 (`docs/security/owasp-checklist.md`)
10개 카테고리 × 체크 항목 2~5개. 각 항목에 현재 코드 증거(파일:라인) 첨부.

#### 19.2.3 Gitleaks
`.github/workflows/security.yml`:
```yaml
- uses: gitleaks/gitleaks-action@v2
  with:
    config: .gitleaks.toml
```
`.gitleaks.toml` — USCP 프로젝트 예외 rule (e.g., 예시 JWT secret 허용)

#### 19.2.4 nginx security header 검증
- mozilla observatory 또는 `curl -I`로 수동 확인
- 최소 등급: B+ (A-로 점진 상향 예정)

### 19.3 WCAG 2.1 AA (P1)

#### 19.3.1 axe-core 통합
```ts
// tests/e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA', () => {
  const PAGES = ['/', '/about', '/campus', '/guide', '/issues', ...];
  for (const path of PAGES) {
    test(`${path} has no violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
```

#### 19.3.2 예상 수정 항목
- `next/image`/img: `alt` 필수
- `<label htmlFor>` 연결
- `text-text-muted` → `#64748b`의 contrast ratio 점검 (4.5:1 기준)
- Modal/Dropdown: focus trap + ESC 닫기
- 키보드 skip-to-main 링크

### 19.4 i18n (P2, 기본만)

- `next-intl` + `messages/{locale}.json`
- Sprint 6는 **키 추출만** 수행 (경로 구조 변경은 Sprint 7 이월)
- `src/messages/ko.json` (현재 ko 하드코딩 텍스트 전부 이동)
- `src/messages/en.json` (영문 번역, 공개 페이지만)

### 19.5 모니터링 대시보드 (P2)

- Sentry: 실 DSN 주입 + 1건 테스트 에러 수신 (Sprint 5 DoD #3 완료)
- Uptime Kuma (무료 tier): `/health` 5분 간격 + Slack webhook
- Grafana는 Sprint 7 이후 (운영 메트릭 축적 후)

### 19.6 Sprint 6 DoD (Plan §14.8과 동일)

### 19.7 Sprint 7 이월
- 실 도메인 전환 + UAT
- 성능 최종 튜닝 (부하 테스트 결과 반영)
- i18n 전체 페이지 확장
- v1.0 GA 런칭

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-11 | Initial draft — mockup 기반 v1 상세 설계 | sangincha |
| 0.2 | 2026-04-11 | §15 Sprint 2 상세 설계 추가 (CMS, BF-1 쓰기, 인증 보강, 대시보드) | sangincha |
| 0.3 | 2026-04-11 | §15.3 경로 sync: avatar → /auth 네임스페이스, volunteers는 Sprint 3 이월 명시 | sangincha |
| 0.4 | 2026-04-11 | §16 Sprint 3 상세 설계 추가 (Rate Limit P0, SMTP, BF-3/5/6, refresh blacklist) | sangincha |
| 0.5 | 2026-04-12 | §17 Sprint 4 상세 설계 추가 (P-30 KPI, 카카오맵, OAuth, VMS/1365, TipTap 업로드) | sangincha |
| 0.6 | 2026-04-12 | §18 Sprint 5 상세 설계 추가 (nginx/HTTPS/CI-CD/Sentry/k6/PDF/SSE) | sangincha |
| 0.7 | 2026-04-12 | §19 Sprint 6 상세 설계 추가 (Playwright E2E + 보안 + WCAG + i18n) | sangincha |
