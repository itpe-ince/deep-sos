# USCP v2 Design Document

> **Summary**: v1 Gap 8개 항목(미구현 3 + 부분구현 5)의 DB/API/Frontend 상세 설계
>
> **Project**: deep-sos (SOS랩 / USCP)
> **Version**: v2.0
> **Author**: sangincha
> **Date**: 2026-04-13
> **Status**: Draft
> **Planning Doc**: [uscp-v2.plan.md](../../01-plan/features/uscp-v2.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- v1 코드베이스(62 API, 16 테이블, 24 라우트) 위에 **증분 확장**
- 기존 모델 패턴(UUIDPrimaryKey + TimestampMixin) 일관 유지
- 기존 인증/인가 체계(JWT + role guard) 재사용
- SSE 알림 인프라 재사용 (신규 트리거 추가만)

### 1.2 v2 구현 대상 (Plan §1.3 근거)

| # | 항목 | 질의서 | Sprint |
|---|------|--------|:------:|
| 1 | 참여 기관 CRUD | Q10 | S8 |
| 2 | MOU 협약 관리 | Q11 | S8 |
| 3 | 이슈→프로젝트 전환 워크플로우 | Q8 | S8 |
| 4 | 프로젝트 산출물 관리 | Q12 | S9 |
| 5 | 현장 피드백 (4종) | Q12 | S9 |
| 6 | 프로젝트 칸반 관리 | Q12 | S9 |
| 7 | 아이디어 보드 (Co-creation) | Q16 | S10 |
| 8 | ESG 프로그램 관리 | Q22 | S10 |
| 9 | KPI 목표 대비 달성률 | Q23 | S11 |

---

## 2. Data Model

> v1 기존 16개 테이블 + v2 신규 7개 = 총 23개 테이블

### 2.1 Alembic 0007 — 기관·MOU (Sprint 8)

#### organizations

```sql
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    org_type    VARCHAR(30)  NOT NULL,  -- government / enterprise / research / ngo / university
    contact_name VARCHAR(100),
    contact_email VARCHAR(255),
    phone       VARCHAR(30),
    address     TEXT,
    website     VARCHAR(500),
    campus_id   UUID REFERENCES campuses(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_organizations_campus ON organizations(campus_id);
CREATE INDEX idx_organizations_type ON organizations(org_type);
```

#### mou_agreements

```sql
CREATE TABLE mou_agreements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'negotiating',
        -- negotiating / signed / expired / terminated
    document_url    VARCHAR(500),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mou_org ON mou_agreements(organization_id);
CREATE INDEX idx_mou_status ON mou_agreements(status);
```

#### project_organizations (M:N)

```sql
CREATE TABLE project_organizations (
    project_id      UUID NOT NULL REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role            VARCHAR(30) DEFAULT 'partner',  -- partner / sponsor / advisor
    PRIMARY KEY (project_id, organization_id)
);
```

### 2.2 Alembic 0008 — 산출물·피드백 (Sprint 9)

#### project_deliverables

```sql
CREATE TABLE project_deliverables (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    file_url    VARCHAR(500),
    deliverable_type VARCHAR(30) NOT NULL,  -- report / dataset / prototype / presentation / other
    phase       VARCHAR(20) NOT NULL,       -- discover / execute / develop / verify / utilize
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliverable_project ON project_deliverables(project_id);
```

#### project_feedbacks

```sql
CREATE TABLE project_feedbacks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    feedback_type   VARCHAR(20) NOT NULL,  -- survey / checklist / photo / memo
    title           VARCHAR(200) NOT NULL,
    content_json    JSONB NOT NULL DEFAULT '{}',
    image_urls      VARCHAR(500)[],
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_project ON project_feedbacks(project_id);
CREATE INDEX idx_feedback_type ON project_feedbacks(feedback_type);
```

#### project_milestones 확장

```sql
ALTER TABLE project_milestones ADD COLUMN progress_pct INTEGER DEFAULT 0;
    -- 0~100, 마일스톤별 진행률
```

### 2.3 Alembic 0009 — 아이디어 보드 + ESG (Sprint 10)

#### idea_boards

```sql
CREATE TABLE idea_boards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES livinglab_projects(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_idea_board_project ON idea_boards(project_id);
```

#### idea_cards

```sql
CREATE TABLE idea_cards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id    UUID NOT NULL REFERENCES idea_boards(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    color       VARCHAR(7) DEFAULT '#FFFFFF',  -- hex color
    column_name VARCHAR(50) NOT NULL DEFAULT 'backlog',
        -- backlog / discuss / selected / done
    position    INTEGER NOT NULL DEFAULT 0,
    vote_up     INTEGER NOT NULL DEFAULT 0,
    vote_down   INTEGER NOT NULL DEFAULT 0,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_idea_card_board ON idea_cards(board_id);
```

#### idea_card_votes

```sql
CREATE TABLE idea_card_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id     UUID NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_type   VARCHAR(10) NOT NULL,  -- agree / disagree
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(card_id, user_id)
);
```

#### esg_programs

```sql
CREATE TABLE esg_programs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    program_type    VARCHAR(30) NOT NULL,  -- education / community / environment / governance
    sdg_goals       INTEGER[],
    start_date      DATE,
    end_date        DATE,
    campus_id       UUID REFERENCES campuses(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'planned',
        -- planned / active / completed / cancelled
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_esg_campus ON esg_programs(campus_id);
CREATE INDEX idx_esg_status ON esg_programs(status);
```

#### esg_activities

```sql
CREATE TABLE esg_activities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id          UUID NOT NULL REFERENCES esg_programs(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    activity_date       DATE NOT NULL,
    participants_count  INTEGER DEFAULT 0,
    result_summary      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_esg_activity_program ON esg_activities(program_id);
```

### 2.4 Alembic 0010 — KPI 목표 (Sprint 11)

#### kpi_targets

```sql
CREATE TABLE kpi_targets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
        -- total_issues / total_projects / volunteer_hours / participants / resolved_rate / esg_programs / mou_count
    year        INTEGER NOT NULL,
    target_value NUMERIC(12,2) NOT NULL,
    unit        VARCHAR(20) DEFAULT '건',  -- 건 / 명 / 시간 / %
    campus_id   UUID REFERENCES campuses(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(metric_name, year, campus_id)
);
```

### 2.5 ER 관계 요약 (v2 추가분)

```
organizations ──1:N── mou_agreements
organizations ──M:N── livinglab_projects (via project_organizations)

livinglab_projects ──1:N── project_deliverables
livinglab_projects ──1:N── project_feedbacks
livinglab_projects ──1:N── idea_boards ──1:N── idea_cards ──1:N── idea_card_votes

esg_programs ──1:N── esg_activities

campuses ──1:N── kpi_targets
```

---

## 3. API Specification

> v1 기존 62개 API + v2 신규 32개 = 총 ~94개

### 3.1 Sprint 8 — 기관·MOU + 이슈 워크플로우 (12 API)

#### 기관 관리 (admin only)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/admin/organizations` | 기관 목록 (페이지네이션, 유형 필터) | admin |
| GET | `/api/v1/admin/organizations/{id}` | 기관 상세 | admin |
| POST | `/api/v1/admin/organizations` | 기관 등록 | admin |
| PUT | `/api/v1/admin/organizations/{id}` | 기관 수정 | admin |
| DELETE | `/api/v1/admin/organizations/{id}` | 기관 삭제 | admin |

**Request (POST/PUT)**:
```json
{
  "name": "대전광역시청",
  "org_type": "government",
  "contact_name": "홍담당",
  "contact_email": "hong@daejeon.go.kr",
  "phone": "042-123-4567",
  "address": "대전광역시 서구 둔산로 100",
  "website": "https://daejeon.go.kr",
  "campus_id": "uuid-or-null"
}
```

**Response (LIST)**:
```json
{
  "data": [{ "id": "uuid", "name": "...", "org_type": "...", "mou_count": 2 }],
  "meta": { "total": 15, "page": 1, "size": 20, "totalPages": 1 }
}
```

#### MOU 관리 (admin only)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/admin/mou` | MOU 목록 (상태/기관 필터) | admin |
| GET | `/api/v1/admin/mou/{id}` | MOU 상세 | admin |
| POST | `/api/v1/admin/mou` | MOU 등록 | admin |
| PUT | `/api/v1/admin/mou/{id}` | MOU 수정 (상태 전이 포함) | admin |

**Request (POST)**:
```json
{
  "organization_id": "uuid",
  "title": "대전시-공주대 리빙랩 협력 MOU",
  "start_date": "2026-03-01",
  "end_date": "2027-02-28",
  "status": "signed",
  "document_url": "/uploads/mou/daejeon-2026.pdf",
  "notes": "연간 봉사 100시간 협력"
}
```

**상태 전이 규칙**:
```
negotiating → signed → expired
negotiating → terminated
signed → terminated
signed → expired (자동: end_date 초과 시)
```

#### 이슈 워크플로우 확장 (admin only)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| PATCH | `/api/v1/admin/issues/{id}/status` | 이슈 상태 변경 | admin |
| PATCH | `/api/v1/admin/issues/{id}/assign` | 담당자 배정 | admin |
| POST | `/api/v1/admin/issues/{id}/convert-to-project` | 이슈→프로젝트 전환 | admin |

**이슈 상태 변경 (PATCH /status)**:
```json
{ "status": "reviewing", "reason": "검토 시작" }
```

**이슈→프로젝트 전환 (POST /convert-to-project)**:
- 이슈의 title, description, category, campus_id를 복사하여 `livinglab_projects` 신규 레코드 생성
- 이슈의 `linked_project_id`에 생성된 프로젝트 ID 저장
- 이슈 status를 `assigned`로 변경
- Response: 생성된 프로젝트 객체

```json
// Response
{
  "project": { "id": "uuid", "title": "...", "phase": "discover" },
  "issue": { "id": "uuid", "status": "assigned", "linked_project_id": "uuid" }
}
```

### 3.2 Sprint 9 — 프로젝트 전체관리 (9 API)

#### 프로젝트 관리 CRUD (admin)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/admin/projects` | 프로젝트 생성 | admin |
| PUT | `/api/v1/admin/projects/{id}` | 프로젝트 수정 | admin |
| PATCH | `/api/v1/admin/projects/{id}/phase` | 단계 변경 (칸반 이동) | admin |

**단계 변경 (PATCH /phase)**:
```json
{ "phase": "execute" }
```

허용 전이:
```
discover → execute → develop → verify → utilize
(역방향 허용: 관리자 판단)
```

#### 산출물 관리

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/projects/{id}/deliverables` | 산출물 목록 (단계별) | user |
| POST | `/api/v1/projects/{id}/deliverables` | 산출물 등록 (파일 업로드) | user (member) |
| DELETE | `/api/v1/projects/{id}/deliverables/{did}` | 산출물 삭제 | admin or author |

**Request (POST, multipart/form-data)**:
```
title: "1단계 탐색 보고서"
description: "현장 조사 결과"
deliverable_type: "report"
phase: "discover"
file: (binary)
```

#### 현장 피드백

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/projects/{id}/feedbacks` | 피드백 목록 (타임라인) | user |
| POST | `/api/v1/projects/{id}/feedbacks` | 피드백 등록 | user (member) |
| DELETE | `/api/v1/projects/{id}/feedbacks/{fid}` | 피드백 삭제 | admin or author |

**Request (POST)**:
```json
{
  "feedback_type": "survey",
  "title": "주민 만족도 설문 결과",
  "content_json": {
    "questions": [
      { "q": "프로젝트 인지도", "avg": 3.8, "count": 42 },
      { "q": "참여 만족도", "avg": 4.2, "count": 42 }
    ]
  },
  "image_urls": ["/uploads/feedback/survey-chart.png"]
}
```

**feedback_type별 content_json 스키마**:
| Type | content_json 구조 |
|------|-----------------|
| survey | `{ questions: [{ q, avg, count }] }` |
| checklist | `{ items: [{ label, checked: bool }] }` |
| photo | `{ caption: string }` (image_urls 활용) |
| memo | `{ body: string }` |

### 3.3 Sprint 10 — 아이디어 보드 + ESG (11 API)

#### 아이디어 보드

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/projects/{id}/boards` | 보드 목록 | user |
| POST | `/api/v1/projects/{id}/boards` | 보드 생성 | user (member) |
| GET | `/api/v1/boards/{bid}/cards` | 카드 목록 (열별 정렬) | user |
| POST | `/api/v1/boards/{bid}/cards` | 카드 추가 | user (member) |
| PATCH | `/api/v1/boards/{bid}/cards/{cid}` | 카드 수정 (열 이동 포함) | user (member) |
| POST | `/api/v1/boards/{bid}/cards/{cid}/vote` | 카드 투표 (토글) | user |

**카드 이동 (PATCH)**:
```json
{ "column_name": "discuss", "position": 2 }
```

**카드 투표 (POST /vote)**:
```json
{ "vote_type": "agree" }
```
- 같은 유저 재투표 시 토글 (삭제 or 변경)

**보드 열 구조 (고정 4열)**:
```
backlog → discuss → selected → done
```

#### ESG 프로그램 관리 (admin)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/admin/esg/programs` | 프로그램 목록 | admin |
| POST | `/api/v1/admin/esg/programs` | 프로그램 등록 | admin |
| PUT | `/api/v1/admin/esg/programs/{id}` | 프로그램 수정 | admin |
| GET | `/api/v1/admin/esg/programs/{id}/activities` | 활동 기록 목록 | admin |
| POST | `/api/v1/admin/esg/programs/{id}/activities` | 활동 기록 등록 | admin |

**공개 SDGs 현황판**:

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/esg/sdgs-dashboard` | SDGs 17개 목표별 활동 매핑 | public |

**Response (SDGs Dashboard)**:
```json
{
  "goals": [
    { "sdg": 1, "label": "빈곤퇴치", "project_count": 3, "esg_count": 1, "case_count": 2 },
    { "sdg": 4, "label": "양질의 교육", "project_count": 5, "esg_count": 3, "case_count": 1 }
  ],
  "total_projects": 12,
  "total_esg_programs": 8,
  "total_success_cases": 7
}
```

### 3.4 Sprint 11 — KPI 목표 관리 (3 API)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/admin/kpi/targets` | 연도별 KPI 목표 목록 | admin |
| POST | `/api/v1/admin/kpi/targets` | KPI 목표 등록/수정 (upsert) | admin |
| GET | `/api/v1/admin/kpi/achievement` | 목표 대비 달성률 비교 | admin |

**KPI 목표 upsert (POST)**:
```json
{
  "targets": [
    { "metric_name": "total_issues", "year": 2026, "target_value": 200, "unit": "건" },
    { "metric_name": "volunteer_hours", "year": 2026, "target_value": 5000, "unit": "시간" },
    { "metric_name": "mou_count", "year": 2026, "target_value": 15, "unit": "건" }
  ]
}
```

**달성률 비교 (GET /achievement)**:
```json
{
  "year": 2026,
  "metrics": [
    { "metric_name": "total_issues", "target": 200, "actual": 127, "rate": 63.5, "unit": "건" },
    { "metric_name": "volunteer_hours", "target": 5000, "actual": 2845, "rate": 56.9, "unit": "시간" },
    { "metric_name": "mou_count", "target": 15, "actual": 8, "rate": 53.3, "unit": "건" }
  ]
}
```

`actual` 값은 다음 테이블에서 자동 집계:
| metric_name | 집계 소스 |
|-------------|----------|
| total_issues | `COUNT(issues)` |
| total_projects | `COUNT(livinglab_projects)` |
| volunteer_hours | `SUM(volunteer_participations.hours)` |
| participants | `COUNT(DISTINCT users WHERE is_active)` |
| resolved_rate | `COUNT(issues WHERE resolved_at) / COUNT(issues) * 100` |
| esg_programs | `COUNT(esg_programs)` |
| mou_count | `COUNT(mou_agreements WHERE status='signed')` |

---

## 4. Frontend Routes

### 4.1 신규 라우트 (6개)

| Route | 페이지 | Sprint | 렌더링 |
|-------|--------|:------:|:------:|
| `/admin/organizations` | P-27 기관·MOU 관리 | S8 | CSR |
| `/admin/issues/[id]` | P-23 이슈 처리 상세 | S8 | CSR |
| `/admin/projects/kanban` | P-24 프로젝트 칸반 | S9 | CSR |
| `/projects/[id]/feedback/new` | P-14 현장 피드백 등록 | S9 | CSR |
| `/projects/[id]/board` | P-15 아이디어 보드 | S10 | CSR |
| `/admin/esg` | P-31 ESG 프로그램 관리 | S10 | CSR |

### 4.2 기존 라우트 확장

| Route | 변경 내용 | Sprint |
|-------|----------|:------:|
| `/projects/[id]` | 산출물/피드백 탭 추가 | S9 |
| `/admin/kpi` | 목표 대비 달성률 차트 추가 | S11 |
| `/admin` | 사이드바에 기관/ESG 메뉴 추가 | S8 |

### 4.3 관리자 사이드바 (v2 확장)

```
v1 메뉴:
├── 대시보드
├── KPI
├── CMS 페이지
└── CMS 배너

v2 추가:
├── 이슈 관리        → /admin/issues          (S8)
├── 기관·MOU         → /admin/organizations   (S8)
├── 프로젝트 칸반    → /admin/projects/kanban  (S9)
└── ESG 프로그램     → /admin/esg             (S10)
```

---

## 5. Component Architecture (v2 신규)

### 5.1 Sprint 8 컴포넌트

```
components/admin/
├── OrganizationForm.tsx       # 기관 등록/수정 폼
├── OrganizationTable.tsx      # 기관 목록 테이블
├── MouForm.tsx                # MOU 등록/수정 폼
├── MouStatusBadge.tsx         # MOU 상태 뱃지 (negotiating/signed/expired/terminated)
├── IssueAdminDetail.tsx       # 이슈 관리 상세 (상태 변경, 담당자 배정)
└── IssueConvertDialog.tsx     # 이슈→프로젝트 전환 확인 다이얼로그
```

### 5.2 Sprint 9 컴포넌트

```
components/project/
├── DeliverableList.tsx         # 산출물 목록 (단계별 그룹핑)
├── DeliverableUpload.tsx       # 산출물 업로드 폼 (MinIO)
├── FeedbackTimeline.tsx        # 피드백 타임라인 뷰
├── FeedbackForm.tsx            # 피드백 등록 (4종 탭 전환)
└── ProjectKanban.tsx           # 5단계 칸반 보드 (드래그)
```

### 5.3 Sprint 10 컴포넌트

```
components/idea/
├── IdeaBoard.tsx              # 보드 전체 뷰 (4열)
├── IdeaCard.tsx               # 카드 (제목, 설명, 투표 수)
├── IdeaCardForm.tsx           # 카드 추가/수정 모달
└── IdeaVoteButton.tsx         # 동의/반대 투표 토글

components/admin/
├── EsgProgramForm.tsx         # ESG 프로그램 등록/수정
├── EsgProgramTable.tsx        # ESG 프로그램 목록
├── EsgActivityForm.tsx        # ESG 활동 기록 등록
└── SdgsDashboard.tsx          # SDGs 17목표 현황판
```

### 5.4 Sprint 11 컴포넌트

```
components/admin/
├── KpiTargetForm.tsx          # KPI 목표 설정 폼
└── KpiAchievementChart.tsx    # 목표 vs 달성 비교 차트 (bar chart)
```

---

## 6. Security & Authorization

### 6.1 신규 엔드포인트 권한

| 엔드포인트 그룹 | 권한 | 가드 |
|----------------|------|------|
| `/admin/organizations/**` | admin only | `require_admin` |
| `/admin/mou/**` | admin only | `require_admin` |
| `/admin/issues/{id}/status,assign,convert` | admin only | `require_admin` |
| `/admin/projects/**` | admin only | `require_admin` |
| `/admin/esg/**` | admin only | `require_admin` |
| `/admin/kpi/targets,achievement` | admin only | `require_admin` |
| `/projects/{id}/deliverables` (POST) | project member | `get_current_user` + membership check |
| `/projects/{id}/feedbacks` (POST) | project member | `get_current_user` + membership check |
| `/projects/{id}/boards/**` | project member (write), any user (read) | `get_current_user` |
| `/esg/sdgs-dashboard` | public | none |

### 6.2 Rate Limit

| 엔드포인트 | 제한 |
|-----------|------|
| POST /admin/organizations | 30/min (admin) |
| POST /boards/{bid}/cards | 30/min (user) |
| POST /boards/{bid}/cards/{cid}/vote | 60/min (user) |

---

## 7. Sprint별 구현 순서

### 7.1 Sprint 8 (10 영업일)

1. Day 1~2: Alembic 0007 + Organization/MOU 모델 + 스키마
2. Day 3~4: Organization CRUD API (5개) + MOU CRUD API (4개)
3. Day 5~6: 이슈 워크플로우 API 3개 (status/assign/convert)
4. Day 7~8: P-27 기관·MOU 관리 페이지 + P-23 이슈 처리 상세
5. Day 9: Admin 사이드바 확장 + 알림 트리거 (MOU 만료 30일 전)
6. Day 10: E2E 테스트 + Gap Analysis

### 7.2 Sprint 9 (10 영업일)

1. Day 1~2: Alembic 0008 + Deliverable/Feedback 모델 + 스키마
2. Day 3~4: 산출물 CRUD API (3개) + MinIO 업로드
3. Day 5~6: 피드백 CRUD API (3개) + content_json 4종 검증
4. Day 7: 프로젝트 CRUD API (3개, admin) + 단계 변경
5. Day 8~9: P-24 칸반 + P-14 피드백 등록 + P-08 확장 (산출물/피드백 탭)
6. Day 10: E2E 테스트 + Gap Analysis

### 7.3 Sprint 10 (10 영업일)

1. Day 1~2: Alembic 0009 + IdeaBoard/Card/Vote + EsgProgram/Activity 모델
2. Day 3~4: 아이디어 보드 API (6개)
3. Day 5~6: ESG 프로그램 API (5개) + SDGs 대시보드 API
4. Day 7~8: P-15 아이디어 보드 UI + P-31 ESG 관리 페이지
5. Day 9: SDGs 현황판 컴포넌트 (17목표 시각화)
6. Day 10: E2E 테스트 + Gap Analysis

### 7.4 Sprint 11 (10 영업일)

1. Day 1~2: Alembic 0010 + KpiTarget 모델 + 집계 쿼리
2. Day 3~4: KPI 목표/달성률 API (3개)
3. Day 5~6: P-30 KPI 대시보드 확장 (목표 vs 달성 차트)
4. Day 7~8: 전체 통합 테스트 (v1+v2 회귀)
5. Day 9: OWASP 체크리스트 갱신 (신규 API 포함)
6. Day 10: `/pdca analyze uscp-v2` → 최종 Gap 분석

### 7.5 Sprint별 DoD

| Sprint | DoD |
|--------|-----|
| S8 | 기관 5 API + MOU 4 API + 이슈 워크플로우 3 API + P-23/P-27 렌더링 + v1 회귀 0 |
| S9 | 산출물 3 API + 피드백 3 API + 프로젝트 3 API + 칸반 드래그 동작 + v1 회귀 0 |
| S10 | 아이디어 6 API + ESG 5 API + SDGs 대시보드 + P-15/P-31 렌더링 + v1 회귀 0 |
| S11 | KPI 3 API + 목표/달성 차트 + OWASP 갱신 + 질의서 17/18 충족 + Match Rate >= 95% |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-13 | Initial draft — Sprint 8~11 DB/API/Frontend 상세 설계 | sangincha |
