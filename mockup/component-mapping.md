# 컴포넌트 매핑 (Mockup → Next.js)

> Sprint 1 프로토타입의 컴포넌트가 Next.js 실제 구현에서 어떻게 전환될지 매핑

---

## Layout Components

| Mockup | Next.js | Props | 설명 |
|--------|---------|-------|------|
| `<header data-component="Header">` | `components/layout/Header.tsx` | `user?: User` | GNB, 로고, 네비, 알림, 프로필 |
| `<nav data-component="Navigation">` | `components/layout/Navigation.tsx` | `currentPath: string` | 메인 네비게이션 |
| `<footer data-component="Footer">` | `components/layout/Footer.tsx` | - | 사이트 하단 |

## UI Components

| Mockup | Next.js | Props |
|--------|---------|-------|
| `.btn--primary/.btn--secondary` | `components/ui/Button.tsx` | `variant, size, disabled, loading` |
| `.badge--*` | `components/ui/Badge.tsx` | `variant, color, children` |
| `.card` | `components/ui/Card.tsx` | `hoverable?, children` |
| `.form-input/.form-textarea` | `components/ui/Input.tsx` | `label, error, required, ...` |
| `.form-select` | `components/ui/Select.tsx` | `options, value, onChange` |
| `.stat-card` | `components/ui/StatCard.tsx` | `label, value, icon, meta, trend` |
| `.filter-bar` | `components/ui/FilterBar.tsx` | `filters, onChange` |
| `.view-tabs` | `components/ui/ViewTabs.tsx` | `options, value, onChange` |
| `.pagination` | `components/ui/Pagination.tsx` | `page, total, onChange` |
| `.timeline / .status-timeline` | `components/ui/StatusTimeline.tsx` | `steps, currentIndex` |

## Feature Components

### BF-1 지역 문제
| Mockup | Next.js | Props |
|--------|---------|-------|
| `<a class="card" data-component="IssueCard">` | `features/issues/IssueCard.tsx` | `issue: Issue` |
| `<a class="issue-item">` | `features/issues/IssueListItem.tsx` | `issue: Issue` |
| `.detail-location` | `features/issues/IssueLocation.tsx` | `lat, lng, address` |
| `.detail-vote-btn` | `features/issues/VoteButton.tsx` | `count, voted, onVote` |
| `.status-timeline` (상세) | `features/issues/IssueStatusTimeline.tsx` | `history: StatusHistory[]` |

### BF-3 리빙랩 프로젝트
| Mockup | Next.js | Props |
|--------|---------|-------|
| `.project-card` | `features/projects/ProjectCard.tsx` | `project: Project` |
| `.phase-track / .phase-viz` | `features/projects/PhaseIndicator.tsx` | `currentPhase: number, phases: Phase[]` |
| `.phase-step` | `features/projects/PhaseStep.tsx` | `index, name, status, description` |
| `.milestone` | `features/projects/MilestoneItem.tsx` | `milestone: Milestone` |
| `.member-item` | `features/projects/MemberItem.tsx` | `member: Member` |
| `.tabs` (프로젝트 상세) | `features/projects/ProjectTabs.tsx` | `activeTab, onChange` |
| Project KPI sidebar | `features/projects/ProjectKPI.tsx` | `kpis: KPI[]` |

### 공통
| Mockup | Next.js | Props |
|--------|---------|-------|
| `.campus-card` | `features/campus/CampusCard.tsx` | `campus: Campus` |
| `.comment` | `features/comments/Comment.tsx` | `comment: Comment, isOfficial?` |
| `.comment-form` | `features/comments/CommentForm.tsx` | `onSubmit, allowAnonymous?` |
| `.sdg-dot` | `components/ui/SDGBadge.tsx` | `goal: number` |

## Page Components

| Mockup | Next.js Route |
|--------|-------------|
| `pages/index.html` | `app/(public)/page.tsx` |
| `pages/public/about.html` | `app/(public)/about/page.tsx` |
| `pages/public/campus.html` | `app/(public)/campus/page.tsx` |
| `pages/public/issues.html` | `app/(public)/issues/page.tsx` |
| `pages/public/issue-detail.html` | `app/(public)/issues/[id]/page.tsx` |
| `pages/public/projects.html` | `app/(public)/projects/page.tsx` |
| `pages/public/project-detail.html` | `app/(public)/projects/[id]/page.tsx` |
| `pages/public/login.html` | `app/(auth)/login/page.tsx` |

## Type Definitions (예상)

```typescript
// types/campus.ts
export type CampusCode = 'DJ' | 'GJ' | 'YS' | 'SJ';
export interface Campus {
  id: string;
  code: CampusCode;
  name: string;
  livinglabType: string;
  color: string;
}

// types/issue.ts
export type IssueStatus =
  | 'submitted' | 'reviewing' | 'assigned'
  | 'progress' | 'resolved' | 'rejected';
export type IssueCategory =
  | 'environment' | 'safety' | 'transport'
  | 'welfare' | 'culture' | 'education';

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  campus: CampusCode;
  author: { name: string; type: string };
  location: { lat: number; lng: number; address: string };
  imageUrls: string[];
  voteCount: number;
  viewCount: number;
  commentCount: number;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

// types/project.ts
export type ProjectPhase = 'discover' | 'execute' | 'develop' | 'verify' | 'utilize';
export type MakerStage = 'idea' | 'proof' | 'policy';

export interface Project {
  id: string;
  title: string;
  description: string;
  phase: ProjectPhase;
  makerStage: MakerStage;
  campus: CampusCode;
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

## CSS → Tailwind 전환 가이드

Mockup은 CSS Variable 기반이지만, Next.js에서는 Tailwind CSS로 전환할 예정입니다.

| Mockup CSS Variable | Tailwind Class |
|--------------------|----------------|
| `var(--color-primary)` | `bg-blue-600` 또는 `text-blue-600` |
| `var(--color-secondary)` | `bg-emerald-600` |
| `var(--space-4)` (16px) | `p-4 / gap-4 / m-4` |
| `var(--radius-lg)` (8px) | `rounded-lg` |
| `var(--text-base)` (15px) | `text-[15px]` 또는 `text-base` |
| `var(--shadow-md)` | `shadow-md` |

### Tailwind 설정 예시 (tailwind.config.ts)

```typescript
export default {
  theme: {
    extend: {
      colors: {
        campus: {
          dj: '#2563EB',
          gj: '#059669',
          ys: '#7C3AED',
          sj: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
};
```

---

## API 엔드포인트 매핑

Mock JSON 데이터는 실제 API 응답 구조를 따릅니다.

| Mock 파일 | 실제 API |
|----------|---------|
| `data/issues.json` | `GET /api/v1/issues` |
| `data/projects.json` | `GET /api/v1/projects` |
| `data/stats.json` | `GET /api/v1/stats` |

전체 API 명세는 [sos-lab.design.md](../docs/02-design/features/sos-lab.design.md#4-api-specification) 참조.
