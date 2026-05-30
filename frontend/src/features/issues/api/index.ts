/**
 * USCP V2 Features / issues — API 클라이언트.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §4.2 M02 + §5.4 (MinIO presigned)
 */
import { api } from '@/lib/api';

import type {
  CommentItem,
  CommentListResponse,
  IssueDetail,
  IssueListFilters,
  IssueListResponse,
  PhotoMeta,
  PhotoMime,
  PresignResponse,
  SubmitIssueRequest,
  SubmitIssueResponse,
  VoteResponse,
} from '../types';

/** M02-01 제보 작성. */
export async function submitIssue(
  body: SubmitIssueRequest,
): Promise<SubmitIssueResponse> {
  return api.post<SubmitIssueResponse>('/issues', body);
}

/** M02-01 사진 업로드 presigned URL 발급. */
export async function presignPhoto(input: {
  filename: string;
  mime_type: PhotoMime;
  size_bytes: number;
}): Promise<PresignResponse> {
  return api.post<PresignResponse>('/issues/photos/presign', input);
}

/**
 * 사진 1장 업로드 흐름 (presign → PUT → meta 반환).
 *
 * 사용 예 (`useIssueSubmit` 훅에서):
 *   const meta = await uploadPhoto(file);
 *   photos.push(meta);
 */
export async function uploadPhoto(file: File): Promise<PhotoMeta> {
  const presign = await presignPhoto({
    filename: file.name,
    mime_type: file.type as PhotoMime,
    size_bytes: file.size,
  });

  // Stub URL fallback (dev 환경) — 실 업로드 건너뛰고 minio_key 만 사용
  if (!presign.upload_url.includes('?stub=1')) {
    const putRes = await fetch(presign.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(`사진 업로드 실패: HTTP ${putRes.status}`);
    }
  }

  return {
    minio_key: presign.minio_key,
    filename: file.name,
    mime_type: file.type as PhotoMime,
    size_bytes: file.size,
    preview_url: URL.createObjectURL(file),
  };
}

// ── M02-02 ~ M02-05 ─────────────────────────────────────────

export async function listIssues(
  filters: IssueListFilters = {},
): Promise<IssueListResponse> {
  const params = new URLSearchParams();
  if (filters.region) params.set('region', filters.region);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.track) params.set('track', filters.track);
  if (filters.q) params.set('q', filters.q);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return api.get<IssueListResponse>(`/issues${qs ? `?${qs}` : ''}`);
}

export async function getIssue(issueId: string): Promise<IssueDetail> {
  return api.get<IssueDetail>(`/issues/${issueId}`);
}

export async function voteIssue(issueId: string): Promise<VoteResponse> {
  return api.post<VoteResponse>(`/issues/${issueId}/vote`, {});
}

export async function unvoteIssue(issueId: string): Promise<VoteResponse> {
  return api.delete<VoteResponse>(`/issues/${issueId}/vote`);
}

export async function listComments(
  issueId: string,
): Promise<CommentListResponse> {
  return api.get<CommentListResponse>(`/issues/${issueId}/comments`);
}

export async function createComment(
  issueId: string,
  content: string,
): Promise<CommentItem> {
  return api.post<CommentItem>(`/issues/${issueId}/comments`, { content });
}

export async function deleteComment(
  commentId: string,
): Promise<{ id: string; is_deleted: boolean }> {
  return api.delete<{ id: string; is_deleted: boolean }>(
    `/issues/comments/${commentId}`,
  );
}
