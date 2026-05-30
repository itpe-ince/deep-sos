/**
 * USCP V2 Features / projects — API 클라이언트.
 *
 * 설계 근거: design.md §4.2 M03
 */
import { api } from '@/lib/api';

import type {
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectDetail,
  ProjectListResponse,
  ProjectStage,
} from '../types';

export interface ListProjectsFilters {
  region?: string | null;
  stage?: ProjectStage | null;
  limit?: number;
  cursor?: string;
}

export async function listProjects(
  filters: ListProjectsFilters = {},
): Promise<ProjectListResponse> {
  const params = new URLSearchParams();
  if (filters.region) params.set('region', filters.region);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();
  return api.get<ProjectListResponse>(`/projects${qs ? `?${qs}` : ''}`);
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  return api.get<ProjectDetail>(`/projects/${projectId}`);
}

/** M03-06 운영자 리빙랩 등록. */
export async function createProject(
  body: CreateProjectRequest,
): Promise<CreateProjectResponse> {
  return api.post<CreateProjectResponse>('/admin/projects', body);
}

import type { TimelineEntry, TimelineListResponse } from '../types';

export async function listProjectTimeline(
  projectId: string,
  limit: number = 50,
): Promise<TimelineListResponse> {
  return api.get<TimelineListResponse>(
    `/projects/${projectId}/timeline?limit=${limit}`,
  );
}

// ── M03-07/13 운영자 수정·삭제·전환 ──────────────────────────

export interface UpdateProjectRequest {
  title?: string;
  summary?: string | null;
  region?: string | null;
  start_at?: string | null;
  end_at?: string | null;
}

export interface TransitionProjectRequest {
  to_stage: ProjectStage;
  comment?: string | null;
}

export interface TransitionProjectResponse {
  project_id: string;
  prev_stage: ProjectStage;
  stage: ProjectStage;
  transitioned_at: string;
}

export async function updateProject(
  projectId: string,
  body: UpdateProjectRequest,
): Promise<{ project_id: string; updated: boolean }> {
  return api.patch<{ project_id: string; updated: boolean }>(
    `/admin/projects/${projectId}`,
    body,
  );
}

export async function deleteProject(
  projectId: string,
): Promise<{ project_id: string; deleted: boolean }> {
  return api.delete<{ project_id: string; deleted: boolean }>(
    `/admin/projects/${projectId}`,
  );
}

export async function transitionProject(
  projectId: string,
  body: TransitionProjectRequest,
): Promise<TransitionProjectResponse> {
  return api.post<TransitionProjectResponse>(
    `/admin/projects/${projectId}/transition`,
    body,
  );
}

// ── M03-08 타임라인 작성 ──────────────────────────────────────

export interface CreateTimelineRequest {
  entry_date: string;
  title: string;
  description?: string | null;
}

export async function createTimelineEntry(
  projectId: string,
  body: CreateTimelineRequest,
): Promise<TimelineEntry> {
  return api.post<TimelineEntry>(`/projects/${projectId}/timeline`, body);
}

// ── M03-09 산출물 업로드 ──────────────────────────────────────

export interface DeliverablePresignResponse {
  upload_url: string;
  minio_key: string;
  expires_in_seconds: number;
}

export interface CreateDeliverableRequest {
  title: string;
  minio_key: string;
  content_type?: string | null;
  size_bytes?: number | null;
  stage?: string | null;
  tags?: string[] | null;
}

export interface DeliverableMeta {
  id: string;
  project_id: string;
  title: string;
  minio_key: string;
  stage?: string | null;
  tags?: string[] | null;
  uploaded_by: string;
  created_at: string;
}

export async function presignDeliverable(
  projectId: string,
  input: {
    filename: string;
    content_type: string;
    size_bytes: number;
  },
): Promise<DeliverablePresignResponse> {
  return api.post<DeliverablePresignResponse>(
    `/projects/${projectId}/deliverables/presign`,
    input,
  );
}

export async function createDeliverable(
  projectId: string,
  body: CreateDeliverableRequest,
): Promise<DeliverableMeta> {
  return api.post<DeliverableMeta>(
    `/projects/${projectId}/deliverables`,
    body,
  );
}

export async function updateDeliverable(
  deliverableId: string,
  body: { title?: string; stage?: string | null; tags?: string[] | null },
): Promise<{ id: string; updated: boolean }> {
  return api.patch<{ id: string; updated: boolean }>(
    `/projects/deliverables/${deliverableId}`,
    body,
  );
}

// ── M03-11/12 성공사례·정책반영 ──────────────────────────────

import type {
  AdminSuccessCaseItem,
  CreateSuccessCaseRequest,
  CreateSuccessCaseResponse,
  UpdateSuccessCaseRequest,
} from '../types';

/** M03-11 운영자 성공사례 목록 (미게시 포함). */
export async function listAdminSuccessCases(
  projectId?: string,
): Promise<{ data: AdminSuccessCaseItem[]; meta: { total: number } }> {
  const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return api.get(`/admin/success-cases${qs}`);
}

/** M03-11/12 성공사례 작성 (completed 단계 프로젝트만). */
export async function createSuccessCase(
  body: CreateSuccessCaseRequest,
): Promise<CreateSuccessCaseResponse> {
  return api.post<CreateSuccessCaseResponse>('/admin/success-cases', body);
}

/** M03-11/12 성공사례 수정·게시. */
export async function updateSuccessCase(
  caseId: string,
  body: UpdateSuccessCaseRequest,
): Promise<{ id: string; updated: boolean; is_published?: boolean }> {
  return api.patch(`/admin/success-cases/${caseId}`, body);
}

// ── M03-14 의제↔리빙랩 양방향 연결 ──────────────────────────

/** M03-14 운영자 의제 연결 (양방향 동기화). */
export async function linkIssueToProject(
  projectId: string,
  issueId: string,
): Promise<{ project_id: string; linked_issue: { id: string; title: string } | null; message: string }> {
  return api.post(`/admin/projects/${projectId}/link-issue`, { issue_id: issueId });
}

/** M03-14 운영자 의제 연결 해제. */
export async function unlinkIssueFromProject(
  projectId: string,
): Promise<{ project_id: string; linked_issue: null; message: string }> {
  return api.delete(`/admin/projects/${projectId}/link-issue`);
}

// ── M03-15~18 멤버 전용 게시판 ───────────────────────────────

import type {
  CreatePostRequest,
  PostComment,
  PostDetail,
  PostListResponse,
} from '../types';

export async function listPosts(
  projectId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<PostListResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  return api.get<PostListResponse>(
    `/projects/${projectId}/posts${qs ? `?${qs}` : ''}`,
  );
}

export async function getPost(
  projectId: string,
  postId: string,
): Promise<PostDetail> {
  return api.get<PostDetail>(`/projects/${projectId}/posts/${postId}`);
}

export async function createPost(
  projectId: string,
  body: CreatePostRequest,
): Promise<{ id: string }> {
  return api.post<{ id: string }>(`/projects/${projectId}/posts`, body);
}

export async function updatePost(
  projectId: string,
  postId: string,
  body: { title?: string; body?: string; is_pinned?: boolean },
): Promise<{ id: string; updated: boolean }> {
  return api.patch(`/projects/${projectId}/posts/${postId}`, body);
}

export async function deletePost(
  projectId: string,
  postId: string,
): Promise<{ id: string; deleted: boolean }> {
  return api.delete(`/projects/${projectId}/posts/${postId}`);
}

export async function listPostComments(
  projectId: string,
  postId: string,
): Promise<{ data: PostComment[]; meta: { total: number } }> {
  return api.get(`/projects/${projectId}/posts/${postId}/comments`);
}

export async function createPostComment(
  projectId: string,
  postId: string,
  bodyText: string,
): Promise<{ id: string }> {
  return api.post(`/projects/${projectId}/posts/${postId}/comments`, {
    body: bodyText,
  });
}

export async function updatePostComment(
  commentId: string,
  bodyText: string,
): Promise<{ id: string; updated: boolean }> {
  return api.patch(`/comments/project-posts/${commentId}`, { body: bodyText });
}

export async function deletePostComment(
  commentId: string,
): Promise<{ id: string; deleted: boolean }> {
  return api.delete(`/comments/project-posts/${commentId}`);
}

/** M03-18 게시글 첨부 presigned URL 발급 + 업로드 (stub-aware). */
export async function uploadPostAttachment(
  projectId: string,
  file: File,
): Promise<{ minio_key: string; filename: string }> {
  const presign = await api.post<{
    upload_url: string;
    minio_key: string;
    filename: string;
  }>(`/projects/${projectId}/posts/attachment/presign`, {
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  });

  if (!presign.upload_url.includes('?stub=1')) {
    const res = await fetch(presign.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) throw new Error(`첨부 업로드 실패: HTTP ${res.status}`);
  }
  return { minio_key: presign.minio_key, filename: presign.filename };
}

/** Upload file via presigned URL (stub-aware). */
export async function uploadDeliverableFile(
  projectId: string,
  file: File,
): Promise<{ minio_key: string; size_bytes: number; content_type: string }> {
  const presign = await presignDeliverable(projectId, {
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  });

  if (!presign.upload_url.includes('?stub=1')) {
    const res = await fetch(presign.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`산출물 업로드 실패: HTTP ${res.status}`);
    }
  }

  return {
    minio_key: presign.minio_key,
    size_bytes: file.size,
    content_type: file.type || 'application/octet-stream',
  };
}
