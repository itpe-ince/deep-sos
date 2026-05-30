/**
 * USCP V2 Features / gatekeeping — Admin Issues API (M02-06~11).
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §4.2 M02 admin endpoints
 */
import { api } from '@/lib/api';

import type {
  IssueDetail,
  IssueListFilters,
  IssueListResponse,
  IssueStage,
  IssueTrack,
} from '@/features/issues';

export type AdminStage = IssueStage;
export type AdminTrack = IssueTrack;

export interface AdminIssuesListFilters extends IssueListFilters {
  // 큐는 reported 등 비공개 단계도 포함
  stage?: AdminStage | null;
}

export interface TransitionRequest {
  to_stage: AdminStage;
  comment?: string | null;
  /** reviewing 진입 시 필수 */
  track?: AdminTrack | null;
}

export interface TransitionResponse {
  issue_id: string;
  prev_stage: AdminStage;
  stage: AdminStage;
  track: AdminTrack | null;
  transitioned_at: string;
}

export interface StageStats {
  reported: number;
  reviewing: number;
  published: number;
  mentor_assigned: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  [key: string]: number;
}

export async function listGatekeepingQueue(
  filters: AdminIssuesListFilters = {},
): Promise<IssueListResponse> {
  const params = new URLSearchParams();
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.region) params.set('region', filters.region);
  if (filters.q) params.set('q', filters.q);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return api.get<IssueListResponse>(`/admin/issues${qs ? `?${qs}` : ''}`);
}

export async function getStageStats(): Promise<StageStats> {
  return api.get<StageStats>('/admin/issues/stats');
}

export async function getAdminIssue(issueId: string): Promise<IssueDetail> {
  return api.get<IssueDetail>(`/admin/issues/${issueId}`);
}

export async function transitionIssue(
  issueId: string,
  body: TransitionRequest,
): Promise<TransitionResponse> {
  return api.post<TransitionResponse>(
    `/admin/issues/${issueId}/transition`,
    body,
  );
}

export async function rejectIssue(
  issueId: string,
  reason: string,
): Promise<TransitionResponse> {
  return api.post<TransitionResponse>(`/admin/issues/${issueId}/reject`, {
    reason,
  });
}

export async function patchIssueTrack(
  issueId: string,
  track: AdminTrack,
): Promise<{ issue_id: string; track: AdminTrack }> {
  return api.patch<{ issue_id: string; track: AdminTrack }>(
    `/admin/issues/${issueId}/track`,
    { track },
  );
}

/** M02-21 댓글로 해결 종결 (6단계 우회 별도 경로). */
export async function resolveByComment(
  issueId: string,
  commentId: string,
): Promise<TransitionResponse> {
  return api.post<TransitionResponse>(
    `/admin/issues/${issueId}/resolve-by-comment`,
    { comment_id: commentId },
  );
}
