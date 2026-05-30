/**
 * USCP V2 Features / projects — 타입 정의.
 *
 * 설계 근거: design.md §3.2 project_stage ENUM (3단계)
 */
import type { RegionCode } from '@/features/issues';

export type ProjectStage = 'recruiting' | 'in_progress' | 'completed';

export const PROJECT_STAGES: ReadonlyArray<{
  code: ProjectStage;
  label: string;
  bg: string;
  fg: string;
}> = [
  { code: 'recruiting', label: '모집중', bg: '#dbeafe', fg: '#1d4ed8' },
  { code: 'in_progress', label: '진행중', bg: '#fef3c7', fg: '#92400e' },
  { code: 'completed', label: '완료', bg: '#d1fae5', fg: '#047857' },
];

export interface ProjectListItem {
  id: string;
  title: string;
  summary?: string | null;
  region?: RegionCode | null;
  stage?: ProjectStage | null;
  start_at?: string | null;
  end_at?: string | null;
  created_at: string;
}

export interface ProjectListResponse {
  data: ProjectListItem[];
  meta: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

/** M03-14 연결된 의제 요약. */
export interface LinkedIssue {
  id: string;
  title: string;
  stage?: string | null;
}

export interface ProjectDetail extends ProjectListItem {
  description?: string | null;
  owner_id?: string | null;
  /** M03-14 연결된 의제 목록 (N:M). */
  linked_issues: LinkedIssue[];
}

/** M03-14 연결/해제 응답 (N:M). */
export interface LinkIssueResponse {
  project_id: string;
  linked_issue?: { id: string; title: string } | null;
  linked_issues: LinkedIssue[];
  message: string;
}

export interface CreateProjectRequest {
  title: string;
  summary?: string | null;
  region: RegionCode;
  /** M03-14: 등록 시 의제 1건 선택 연결 (N:M join table 에 1행 추가). */
  source_issue_id?: string | null;
  /** ISO date YYYY-MM-DD */
  start_at?: string | null;
  end_at?: string | null;
}

export interface CreateProjectResponse {
  project_id: string;
  stage: ProjectStage;
  region: RegionCode;
  title: string;
  summary: string | null;
  created_at: string;
  message: string;
}

export interface CreateProjectError {
  code:
    | 'invalid_region'
    | 'invalid_title_length'
    | 'invalid_summary_length'
    | 'invalid_date_range'
    | 'operator_required';
  message: string;
  [key: string]: unknown;
}

// ── M03-03 활동 타임라인 ─────────────────────────────────────

export interface TimelineEntry {
  id: string;
  entry_date: string;
  title: string;
  description?: string | null;
  created_at: string;
  created_by: { id: string | null; name: string };
}

export interface TimelineListResponse {
  data: TimelineEntry[];
  meta: { total: number };
}

// ── M03-11/12 성공사례·정책반영 ──────────────────────────────

/** 운영자 콘솔 성공사례 목록 항목 (미게시 포함). */
export interface AdminSuccessCaseItem {
  id: string;
  project_id: string | null;
  title: string;
  policy_linked: boolean;
  policy_name: string | null;
  effective_date: string | null;
  is_published: boolean;
  view_count: number;
  created_at: string;
}

export interface CreateSuccessCaseRequest {
  project_id: string;
  title: string;
  /** ① 어떤 문제였는가 (TipTap HTML) */
  problem_summary: string;
  /** ② 어떻게 해결했는가 (TipTap HTML) */
  process_summary: string;
  /** ③ 어떤 결과를 얻었는가 (TipTap HTML) */
  result_summary: string;
  // ④ 정책반영 (M03-12)
  policy_linked?: boolean;
  policy_name?: string | null;
  /** ISO date YYYY-MM-DD */
  effective_date?: string | null;
  policy_detail?: string | null;
  cover_image_url?: string | null;
}

export interface UpdateSuccessCaseRequest {
  title?: string;
  problem_summary?: string;
  process_summary?: string;
  result_summary?: string;
  policy_linked?: boolean;
  policy_name?: string | null;
  effective_date?: string | null;
  policy_detail?: string | null;
  is_published?: boolean;
  cover_image_url?: string | null;
}

// ── M03-15~18 멤버 전용 게시판 ───────────────────────────────

export interface PostListItem {
  id: string;
  title: string;
  is_pinned: boolean;
  has_attachment: boolean;
  comment_count: number;
  author: { id: string | null; name: string };
  created_at: string;
}

export interface PostListResponse {
  data: PostListItem[];
  meta: { total: number; limit: number; offset: number };
}

export interface PostDetail {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  attachment: { key: string; filename: string | null } | null;
  author: { id: string | null; name: string };
  created_at: string;
  updated_at: string;
  is_author: boolean;
  can_edit: boolean;
}

export interface PostComment {
  id: string;
  body: string;
  author: { id: string | null; name: string };
  created_at: string;
  can_edit: boolean;
}

export interface CreatePostRequest {
  title: string;
  body: string;
  attachment_key?: string | null;
  attachment_filename?: string | null;
  is_pinned?: boolean;
}

export interface CreateSuccessCaseResponse {
  id: string;
  project_id: string;
  title: string;
  is_published: boolean;
  policy_linked: boolean;
  policy_name: string | null;
  effective_date: string | null;
  created_at: string;
  message: string;
}
