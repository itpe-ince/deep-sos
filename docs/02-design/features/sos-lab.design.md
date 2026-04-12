# SOS랩 (USCP) Design Document

> **Summary**: 7개 업무 흐름(BF-1~7) 기반 온라인 사회공헌 플랫폼 상세 설계
>
> **Project**: deep-sos (SOS랩)
> **Author**: sangincha
> **Date**: 2026-04-08 (v2.0 재구성)
> **Status**: Draft
> **Planning Doc**: [sos-lab.plan.md](../../01-plan/features/sos-lab.plan.md)
> **UI Standards**: [ui-standards.md](../ui-standards.md)

---

## 1. Overview

### 1.1 Design Goals

USCP 플랫폼은 실행계획서가 요구하는 **7개 업무 흐름**을 디지털화한다.
기능 나열이 아니라, 각 업무 흐름이 시스템 위에서 어떻게 동작하는지를 설계한다.

### 1.2 Design Principles

- **업무 흐름 중심**: 기능이 아니라 "누가 무엇을 왜 하는가"에서 출발
- **단계 연결**: BF-1의 결과가 BF-3의 입력이 되고, BF-3의 성과가 BF-4로 이어지는 흐름
- **멀티 테넌트**: 4개 캠퍼스 격리 + 통합 뷰
- **API-First**: 웹/PWA가 동일 API를 사용

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Clients                                   │
│  ┌───────────────────┐  ┌──────────────────────────┐         │
│  │ Web (Next.js SSR) │  │ Admin Dashboard (Next.js)│         │
│  │ + PWA             │  │                          │         │
│  └────────┬──────────┘  └────────────┬─────────────┘         │
│           └──────────────────────────┘                       │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │  Nginx/CDN  │                             │
│                   └──────┬──────┘                             │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                   Backend Layer                               │
│                   ┌──────▼──────┐                             │
│                   │   FastAPI   │                             │
│                   │  (Python)   │                             │
│                   └──────┬──────┘                             │
│                          │                                    │
│   ┌──────────┐  ┌───────┴───────┐  ┌──────────────────┐     │
│   │PostgreSQL│  │    Redis      │  │  External APIs   │     │
│   │+ PostGIS │  │ (Cache/Queue) │  │ (VMS,1365,SSO)   │     │
│   └──────────┘  └───────────────┘  └──────────────────┘     │
│   ┌──────────┐  ┌───────────────┐                            │
│   │S3 Storage│  │  WebSocket    │                            │
│   └──────────┘  └───────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 공통 엔티티

#### Users (사용자)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'citizen',
    -- student, professor, staff, admin, citizen, gov_officer, enterprise
    auth_provider VARCHAR(20) NOT NULL,
    -- sso, email, kakao, naver, google
    campus_id UUID REFERENCES campuses(id),
    department VARCHAR(100),
    student_number VARCHAR(20),
    organization VARCHAR(200),         -- 소속 기관 (외부 사용자)
    expertise TEXT[],                  -- 전문 분야 태그
    profile_image_url TEXT,
    level VARCHAR(20) DEFAULT 'newcomer',
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sso_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Campuses (캠퍼스)

```sql
CREATE TABLE campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,     -- DJ, GJ, YS, SJ
    livinglab_type VARCHAR(100),          -- 청년정착, 문화재생, 고령돌봄, 모빌리티
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Notifications (알림)

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    reference_type VARCHAR(30),
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

### 3.2 BF-1: 지역 문제 수집

```sql
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    -- urban_regen, aging, transport, welfare, environment, education, etc.
    status VARCHAR(20) DEFAULT 'submitted',
    -- submitted, reviewing, assigned, in_progress, resolved, closed
    priority VARCHAR(10) DEFAULT 'normal',
    campus_id UUID REFERENCES campuses(id),
    author_id UUID REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    image_urls TEXT[],
    vote_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_anonymous BOOLEAN DEFAULT false,
    linked_project_id UUID REFERENCES livinglab_projects(id), -- BF-3 연결
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_issues_campus ON issues(campus_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_location ON issues USING GIST(ST_MakePoint(location_lng, location_lat));

CREATE TABLE issue_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(issue_id, user_id)
);

CREATE TABLE issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    is_official BOOLEAN DEFAULT false,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 BF-2: 참여주체 연결

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    org_type VARCHAR(30) NOT NULL,
    -- university, government, enterprise, research_institute, ngo, civic
    region VARCHAR(100),
    expertise TEXT[],
    contact_name VARCHAR(100),
    contact_email VARCHAR(255),
    mou_status VARCHAR(20),              -- none, negotiating, active, expired
    mou_signed_at DATE,
    mou_expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 BF-3: 리빙랩 프로젝트 관리

```sql
CREATE TABLE livinglab_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    phase VARCHAR(20) DEFAULT 'discover',
    -- discover, execute, develop, verify, utilize
    maker_stage VARCHAR(20),
    -- idea, proof, policy
    campus_id UUID REFERENCES campuses(id),
    leader_id UUID REFERENCES users(id),
    target_sdgs INTEGER[],
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, active, completed, archived
    outcome_summary TEXT,
    image_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_livinglab_campus ON livinglab_projects(campus_id);
CREATE INDEX idx_livinglab_phase ON livinglab_projects(phase);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role VARCHAR(30) DEFAULT 'member',
    -- leader, mentor, member, observer
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE TABLE project_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50),                     -- 협력 역할 설명
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, organization_id)
);

CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    phase VARCHAR(20) NOT NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES project_milestones(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type VARCHAR(30),               -- report, prototype_photo, presentation, data
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 현장 피드백
CREATE TABLE field_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES project_milestones(id),
    author_id UUID REFERENCES users(id),
    feedback_type VARCHAR(20) NOT NULL,   -- survey, checklist, photo, memo
    title VARCHAR(200),
    content TEXT,
    survey_data JSONB,
    checklist_data JSONB,
    image_urls TEXT[],
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    template_type VARCHAR(20) NOT NULL,   -- survey, checklist
    template_data JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Co-creation 아이디어 보드
CREATE TABLE idea_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    board_type VARCHAR(20) DEFAULT 'brainstorm',
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE idea_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES idea_boards(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    color VARCHAR(7) DEFAULT '#FFFFFF',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    category VARCHAR(50),
    vote_count INTEGER DEFAULT 0,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 데이터 수집 (정성+정량)
CREATE TABLE project_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    data_type VARCHAR(20) NOT NULL,       -- qualitative, quantitative
    source_type VARCHAR(30) NOT NULL,     -- survey, interview, field_feedback, sensor, log, metric
    title VARCHAR(200) NOT NULL,
    data_payload JSONB NOT NULL,
    collected_by UUID REFERENCES users(id),
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트 KPI
CREATE TABLE project_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    kpi_name VARCHAR(100) NOT NULL,
    kpi_unit VARCHAR(30),
    target_value DECIMAL(12, 2),
    current_value DECIMAL(12, 2),
    measurement_method TEXT,
    measured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 BF-4: 사업화 연계

```sql
CREATE TABLE commercialization_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    stage VARCHAR(20) DEFAULT 'discovery',
    -- discovery, nurturing, independent, scaled
    business_model TEXT,
    support_programs TEXT[],              -- 연계된 지원 프로그램명
    enterprise_id UUID REFERENCES organizations(id), -- 연계 기업
    prototype_status VARCHAR(20),        -- none, developing, completed, testing
    commercialization_status VARCHAR(20), -- none, piloting, launched
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.6 BF-5: 사회공헌 활동

```sql
CREATE TABLE volunteer_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    activity_type VARCHAR(30),
    campus_id UUID REFERENCES campuses(id),
    organizer_id UUID REFERENCES users(id),
    project_id UUID REFERENCES livinglab_projects(id), -- 리빙랩 연계
    location TEXT,
    max_participants INTEGER,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    volunteer_hours DECIMAL(4, 1),
    vms_synced BOOLEAN DEFAULT false,
    portal_1365_synced BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE volunteer_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES volunteer_activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'applied',
    actual_hours DECIMAL(4, 1),
    certificate_url TEXT,
    vms_record_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);
```

### 3.7 BF-6: ESG/SDGs

```sql
CREATE TABLE esg_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    sdg_goals INTEGER[] NOT NULL,
    program_type VARCHAR(30),            -- climate, carbon_neutral, regional_sdgs
    campus_id UUID REFERENCES campuses(id),
    organizer_id UUID REFERENCES users(id),
    participant_count INTEGER DEFAULT 0,
    impact_metrics JSONB,
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_category VARCHAR(30) NOT NULL,   -- livinglab, esg, oda, platform
    kpi_name VARCHAR(100) NOT NULL,
    kpi_unit VARCHAR(30),
    year INTEGER NOT NULL,
    target_value DECIMAL(12, 2),
    current_value DECIMAL(12, 2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.8 BF-7: 성과 아카이브

```sql
CREATE TABLE success_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES livinglab_projects(id),
    title VARCHAR(200) NOT NULL,
    problem_summary TEXT NOT NULL,        -- 문제
    process_summary TEXT NOT NULL,        -- 과정
    result_summary TEXT NOT NULL,         -- 결과
    impact_summary TEXT,                  -- 임팩트
    sdg_goals INTEGER[],
    campus_id UUID REFERENCES campuses(id),
    policy_linked BOOLEAN DEFAULT false,  -- 정책 연계 여부
    policy_detail TEXT,                   -- 정책 연계 내용
    global_transfer_candidate BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,   -- 공개 여부
    image_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.9 Entity Relationships

```
[Campus] 1 ──── N [User]
    │                │
    │                ├── N [Issue] (author)           ← BF-1
    │                ├── N [Project Member]           ← BF-3
    │                └── N [Volunteer Participation]  ← BF-5
    │
    ├── 1 ──── N [Issue]                              ← BF-1
    ├── 1 ──── N [Living Lab Project]                 ← BF-3
    ├── 1 ──── N [Volunteer Activity]                 ← BF-5
    └── 1 ──── N [ESG Activity]                       ← BF-6

[Issue] ──→ linked_project_id ──→ [Living Lab Project]  (BF-1→BF-3)

[Living Lab Project]
    ├── N [Project Member]            (BF-2, BF-3)
    ├── N [Project Organization]      (BF-2)
    ├── N [Project Milestone]         (BF-3)
    │       └── N [Project Deliverable]
    ├── N [Field Feedback]            (BF-3 검증)
    ├── N [Idea Board] ── N [Idea Card] (BF-3 협업)
    ├── N [Project Data]              (BF-3 데이터)
    ├── N [Project KPI]               (BF-3 성과)
    ├── N [Volunteer Activity]        (BF-5 연계)
    ├──→ [Commercialization Candidate] (BF-3→BF-4)
    └──→ [Success Case]               (BF-3→BF-7)

[Organization] ── N [Project Organization]            ← BF-2
    └──→ [Commercialization Candidate] (enterprise)   ← BF-4
```

---

## 4. API Specification

### 4.0 Convention

- Base URL: `/api/v1`
- 인증: JWT Bearer Token
- 페이지네이션: `?page=1&size=20`
- 정렬: `?sort=created_at&order=desc`
- 필터: `?campus=DJ&status=active`

### 4.1 Auth API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/auth/sso/login` | SSO 로그인 리다이렉트 | No |
| GET | `/auth/sso/callback` | SSO 콜백 | No |
| POST | `/auth/register` | 이메일 회원가입 (외부) | No |
| POST | `/auth/login` | 이메일 로그인 | No |
| GET | `/auth/oauth/:provider` | 소셜 로그인 | No |
| GET | `/auth/oauth/:provider/callback` | 소셜 콜백 | No |
| POST | `/auth/refresh` | 토큰 갱신 | Refresh |
| GET | `/auth/me` | 내 정보 | Required |

### 4.2 BF-1: Issues API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/issues` | 이슈 목록 (필터/정렬/페이징) | Optional* |
| GET | `/issues/:id` | 이슈 상세 | Optional* |
| POST | `/issues` | 이슈 등록 | Required |
| PUT | `/issues/:id` | 이슈 수정 | Owner/Admin |
| PATCH | `/issues/:id/status` | 상태 변경 | Assignee/Admin |
| POST | `/issues/:id/vote` | 공감 | Required |
| DELETE | `/issues/:id/vote` | 공감 취소 | Required |
| GET | `/issues/:id/comments` | 댓글 목록 | Optional* |
| POST | `/issues/:id/comments` | 댓글 작성 | Required |
| GET | `/issues/map` | 지도 뷰 데이터 | Optional* |
| GET | `/issues/stats` | 카테고리별 통계 | Optional* |

> *Optional: 공개 페이지는 비로그인 열람 가능

### 4.3 BF-2: Organizations API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/organizations` | 참여기관 목록 | Required |
| GET | `/organizations/:id` | 기관 상세 | Required |
| POST | `/organizations` | 기관 등록 | Admin |
| PUT | `/organizations/:id` | 기관 수정 | Admin |
| GET | `/organizations/:id/projects` | 기관 참여 프로젝트 | Required |
| PATCH | `/organizations/:id/mou` | MOU 상태 변경 | Admin |

### 4.4 BF-3: Projects API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/projects` | 프로젝트 목록 | Optional* |
| GET | `/projects/:id` | 프로젝트 상세 | Optional* |
| POST | `/projects` | 프로젝트 생성 | Professor/Admin |
| PUT | `/projects/:id` | 프로젝트 수정 | Leader/Admin |
| PATCH | `/projects/:id/phase` | 단계 전환 | Leader/Admin |
| POST | `/projects/:id/members` | 멤버 추가 | Leader/Admin |
| DELETE | `/projects/:id/members/:uid` | 멤버 제거 | Leader/Admin |
| POST | `/projects/:id/organizations` | 참여기관 추가 | Leader/Admin |
| GET | `/projects/:id/milestones` | 마일스톤 목록 | Required |
| POST | `/projects/:id/milestones` | 마일스톤 생성 | Leader |
| PATCH | `/projects/:id/milestones/:mid` | 마일스톤 상태 변경 | Member+ |
| GET | `/projects/:id/deliverables` | 산출물 목록 | Required |
| POST | `/projects/:id/deliverables` | 산출물 업로드 | Member+ |
| GET | `/projects/:id/feedbacks` | 피드백 목록 | Required |
| POST | `/projects/:id/feedbacks` | 피드백 등록 | Member+ |
| GET | `/projects/:id/feedbacks/summary` | 피드백 요약 분석 | Required |
| GET | `/projects/:id/boards` | 아이디어 보드 목록 | Required |
| POST | `/projects/:id/boards` | 보드 생성 | Member+ |
| GET | `/boards/:bid` | 보드 상세 (카드 포함) | Required |
| POST | `/boards/:bid/cards` | 카드 추가 | Member+ |
| PUT | `/boards/:bid/cards/:cid` | 카드 수정 | Author/Leader |
| POST | `/boards/:bid/cards/:cid/vote` | 카드 투표 | Member+ |
| GET | `/projects/:id/data` | 수집 데이터 목록 | Required |
| POST | `/projects/:id/data` | 데이터 등록 | Member+ |
| GET | `/projects/:id/kpis` | KPI 목록 | Required |
| POST | `/projects/:id/kpis` | KPI 등록 | Leader/Professor |
| PUT | `/projects/:id/kpis/:kid` | KPI 업데이트 | Leader/Member |
| GET | `/projects/:id/kpis/dashboard` | KPI 대시보드 | Required |
| GET | `/feedback-templates` | 피드백 템플릿 목록 | Required |
| POST | `/feedback-templates` | 템플릿 생성 | Professor/Admin |

### 4.5 BF-4: Commercialization API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/commercialization` | 사업화 후보 목록 | Admin |
| POST | `/commercialization` | 후보 등록 (프로젝트→사업화 전환) | Admin |
| GET | `/commercialization/:id` | 후보 상세 | Admin |
| PATCH | `/commercialization/:id/stage` | 단계 변경 | Admin |
| PUT | `/commercialization/:id` | 정보 수정 | Admin |

### 4.6 BF-5: Volunteers API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/volunteers` | 봉사활동 목록 | Optional* |
| GET | `/volunteers/:id` | 봉사활동 상세 | Optional* |
| POST | `/volunteers` | 봉사활동 등록 | Staff/Admin |
| POST | `/volunteers/:id/apply` | 참여 신청 | Required |
| PATCH | `/volunteers/:id/participants/:uid` | 참여 상태 변경 | Organizer |
| POST | `/volunteers/:id/sync-vms` | VMS 동기화 | Admin |
| GET | `/users/:id/portfolio` | 사회공헌 포트폴리오 | Self/Admin |

### 4.7 BF-6: ESG API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/esg` | ESG 활동 목록 | Required |
| POST | `/esg` | ESG 활동 등록 | Staff/Admin |
| GET | `/esg/sdgs-dashboard` | SDGs 달성 대시보드 | Required |
| GET | `/esg/platform-kpis` | 플랫폼 KPI 현황 | Admin |
| PUT | `/esg/platform-kpis/:id` | KPI 업데이트 | Admin |

### 4.8 BF-7: Success Cases API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/success-cases` | 성공 사례 목록 | Optional* |
| GET | `/success-cases/:id` | 사례 상세 | Optional* |
| POST | `/success-cases` | 사례 등록 (프로젝트→사례 전환) | Admin |
| PUT | `/success-cases/:id` | 사례 수정 | Admin |
| PATCH | `/success-cases/:id/publish` | 공개/비공개 전환 | Admin |

### 4.9 Admin & Notifications API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/admin/stats` | 전체 통계 | Admin |
| GET | `/admin/stats/campus/:code` | 캠퍼스별 통계 | Admin |
| GET | `/admin/users` | 사용자 관리 | Admin |
| GET | `/notifications` | 알림 목록 | Required |
| PATCH | `/notifications/:id/read` | 읽음 처리 | Required |
| PATCH | `/notifications/read-all` | 전체 읽음 | Required |
| WS | `/ws/notifications` | 실시간 알림 | Required |

---

## 5. 업무 흐름별 화면 구성

### 5.1 화면 목록

| 업무흐름 | 화면 | 경로 | 공개 |
|---------|------|------|:---:|
| **공통** | 홈 (플랫폼 소개, 성과 요약) | `/` | ✅ |
| **공통** | 로그인 | `/login` | ✅ |
| **공통** | 마이페이지 | `/mypage` | ❌ |
| **BF-1** | 이슈 목록 (리스트 뷰) | `/issues` | ✅ |
| **BF-1** | 이슈 목록 (지도 뷰) | `/issues/map` | ✅ |
| **BF-1** | 이슈 상세 | `/issues/:id` | ✅ |
| **BF-1** | 이슈 등록 | `/issues/new` | ❌ |
| **BF-2** | 참여기관 목록 | `/organizations` | ❌ |
| **BF-2** | 참여기관 상세 | `/organizations/:id` | ❌ |
| **BF-3** | 프로젝트 목록 | `/projects` | ✅ |
| **BF-3** | 프로젝트 상세 (5단계 진행, 멤버, 마일스톤) | `/projects/:id` | ✅ |
| **BF-3** | 프로젝트 피드백 | `/projects/:id/feedback` | ❌ |
| **BF-3** | 아이디어 보드 | `/projects/:id/board` | ❌ |
| **BF-3** | 프로젝트 데이터·KPI | `/projects/:id/data` | ❌ |
| **BF-4** | 사업화 파이프라인 | `/commercialization` | ❌ |
| **BF-5** | 봉사활동 목록 | `/volunteers` | ✅ |
| **BF-5** | 봉사활동 상세 | `/volunteers/:id` | ✅ |
| **BF-5** | 사회공헌 포트폴리오 | `/mypage/portfolio` | ❌ |
| **BF-6** | ESG 현황 | `/esg` | ❌ |
| **BF-6** | SDGs 대시보드 | `/esg/sdgs` | ✅ |
| **BF-7** | 성공 사례 목록 | `/success-cases` | ✅ |
| **BF-7** | 성공 사례 상세 | `/success-cases/:id` | ✅ |
| **관리** | 관리자 대시보드 | `/admin` | ❌ |
| **관리** | 사용자 관리 | `/admin/users` | ❌ |
| **관리** | 플랫폼 KPI | `/admin/kpis` | ❌ |

### 5.2 핵심 User Flow

#### 이슈 → 프로젝트 → 사업화 → 성과 확산 (전체 흐름)

```
BF-1                BF-3                  BF-4              BF-7
이슈 등록 ──→ 프로젝트 생성 ──→ 사업화 전환 ──→ 성공 사례
  │             │                  │               │
 투표          5단계 관리          단계 추적        정책 연계
 댓글          멤버/기관           지원 연결        글로벌 전환
              피드백/협업                          공개·확산
              KPI 추적
```

---

## 6. Implementation Guide

### 6.1 File Structure

```
deep-sos/
├── frontend/                      # Next.js (SSR + PWA)
│   ├── src/
│   │   ├── app/                   # App Router pages
│   │   │   ├── (public)/          # 공개 페이지 그룹
│   │   │   │   ├── page.tsx       # 홈
│   │   │   │   ├── issues/        # BF-1
│   │   │   │   ├── projects/      # BF-3 (공개)
│   │   │   │   ├── volunteers/    # BF-5 (공개)
│   │   │   │   ├── success-cases/ # BF-7
│   │   │   │   └── esg/           # BF-6 (SDGs 공개)
│   │   │   ├── (auth)/            # 인증 필요 페이지 그룹
│   │   │   │   ├── mypage/
│   │   │   │   ├── organizations/ # BF-2
│   │   │   │   └── commercialization/ # BF-4
│   │   │   ├── admin/             # 관리자
│   │   │   └── login/
│   │   ├── components/            # 공통 UI
│   │   ├── features/              # 업무흐름별 모듈
│   │   │   ├── bf1-issues/
│   │   │   ├── bf2-organizations/
│   │   │   ├── bf3-projects/
│   │   │   ├── bf4-commercialization/
│   │   │   ├── bf5-volunteers/
│   │   │   ├── bf6-esg/
│   │   │   └── bf7-success-cases/
│   │   ├── services/              # API 클라이언트
│   │   ├── stores/                # 상태 관리
│   │   └── types/                 # TypeScript 타입
│   └── next.config.ts
│
├── backend/                       # FastAPI
│   ├── app/
│   │   ├── api/                   # 업무흐름별 라우터
│   │   │   ├── auth.py
│   │   │   ├── bf1_issues.py
│   │   │   ├── bf2_organizations.py
│   │   │   ├── bf3_projects.py
│   │   │   ├── bf4_commercialization.py
│   │   │   ├── bf5_volunteers.py
│   │   │   ├── bf6_esg.py
│   │   │   ├── bf7_success_cases.py
│   │   │   ├── admin.py
│   │   │   └── notifications.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── integrations/          # VMS, 1365, SSO
│   │   └── core/
│   ├── alembic/
│   └── tests/
│
├── docs/
│   ├── 01-plan/
│   ├── 02-design/
│   └── brainstorm-sos-lab.md
│
└── docker-compose.yml
```

### 6.2 Implementation Order (Sprint Plan)

#### Sprint 1: Foundation (2주)
1. [ ] 프로젝트 초기 설정 (Next.js, FastAPI, Docker)
2. [ ] DB 스키마 생성 (Alembic 마이그레이션)
3. [ ] SSO + 이메일/소셜 인증
4. [ ] 기본 레이아웃 (GNB, LNB, 반응형)
5. [ ] 캠퍼스 선택/전환

#### Sprint 2: BF-1 지역 문제 수집 (2주)
6. [ ] 이슈 CRUD + 목록/상세 페이지
7. [ ] 이슈 공감 투표 + 댓글
8. [ ] 이슈 상태 관리 (접수→배정→처리→완료)
9. [ ] 지도 뷰 (PostGIS + 지도 컴포넌트)
10. [ ] 이슈 통계 시각화

#### Sprint 3: BF-3 리빙랩 프로젝트 Core (2주)
11. [ ] 프로젝트 CRUD + 5단계 프로세스 UI
12. [ ] 프로젝트 멤버/기관 관리 (BF-2 연계)
13. [ ] 마일스톤 관리
14. [ ] 산출물 업로드/관리
15. [ ] 이슈 → 프로젝트 연결 (BF-1→BF-3)

#### Sprint 4: BF-3 리빙랩 운영 도구 (2주)
16. [ ] 현장 피드백 수집 (설문/체크리스트/사진/메모)
17. [ ] 피드백 템플릿 관리
18. [ ] 아이디어 보드 (카드 추가/이동/투표)
19. [ ] 프로젝트 KPI (목표 설정, 달성률 차트)
20. [ ] 프로젝트 데이터 수집 (정성+정량)

#### Sprint 5: BF-5 사회공헌 + BF-2 참여주체 (2주)
21. [ ] 봉사활동 CRUD + 참여 신청
22. [ ] 봉사 시간 인증 + 포트폴리오
23. [ ] 참여기관 관리 (MOU, 협력 이력)
24. [ ] 알림 시스템 (WebSocket)

#### Sprint 6: BF-6 ESG + BF-4 사업화 + BF-7 성과 (2주)
25. [ ] ESG 활동 + SDGs 대시보드
26. [ ] 사업화 파이프라인 (BF-3→BF-4 전환)
27. [ ] 성공 사례 아카이브 + 공개 페이지
28. [ ] 관리자 대시보드 + 플랫폼 KPI

#### Sprint 7: Polish + PWA (2주)
29. [ ] PWA 설정 (Service Worker, manifest, 푸시 알림)
30. [ ] VMS/1365 연동
31. [ ] 게이미피케이션 (포인트, 뱃지)
32. [ ] 성능 최적화 + 보안 점검 + E2E 테스트

---

## 7. Error Handling & Security

*(ui-standards.md 및 이전 설계 내용 유지)*

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다",
    "details": { "title": "제목은 필수 입력 항목입니다" }
  }
}
```

### Security Checklist

- [x] Input validation (Pydantic)
- [x] JWT + SSO + OAuth2 인증
- [x] Role-based Authorization
- [x] 개인정보 암호화 (개인정보보호법)
- [x] HTTPS, Rate Limiting, CORS
- [x] 익명 게시 시 작성자 정보 서버에만 보관

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-07 | Initial draft | sangincha |
| 2.0 | 2026-04-08 | 7개 업무 흐름(BF-1~7) 기반 전면 재구성 | sangincha |
