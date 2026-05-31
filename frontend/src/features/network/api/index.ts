/**
 * USCP V2 Features / network — API 클라이언트 (M05 협력 네트워크).
 *
 * 설계 근거: design.md §4.2 M05
 */
import { api } from '@/lib/api';

import type {
  CommunityListResponse,
  CommunityPostDetail,
  CreateMouRequest,
  CreateOrgRequest,
  ExpiringMou,
  MouListResponse,
  OrganizationListResponse,
  Program,
} from '../types';

// ── M05-02 협력기관 (공개) ──────────────────────────────────
export async function listOrganizations(
  category?: string,
  includeInactive = false,
): Promise<OrganizationListResponse> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const qs = params.toString();
  const base = includeInactive ? '/admin/organizations' : '/network/organizations';
  // 공개 목록은 /network, 운영자 전체(비활성 포함)는 별도 admin 조회 불필요 — 공개 엔드포인트 재사용
  return api.get<OrganizationListResponse>(`${base}${qs ? `?${qs}` : ''}`);
}

// ── M05-01/09 협력기관 (운영자) ─────────────────────────────
export async function createOrganization(
  body: CreateOrgRequest,
): Promise<{ organization_id: string; message: string }> {
  return api.post('/admin/organizations', body);
}

export async function updateOrganization(
  orgId: string,
  body: Partial<CreateOrgRequest>,
): Promise<{ organization_id: string; updated: boolean; message: string }> {
  return api.patch(`/admin/organizations/${orgId}`, body);
}

export async function deleteOrganization(
  orgId: string,
): Promise<{ organization_id: string; deleted: boolean; message: string }> {
  return api.delete(`/admin/organizations/${orgId}`);
}

export async function toggleOrganizationActive(
  orgId: string,
  isActive: boolean,
): Promise<{ organization_id: string; is_active: boolean; message: string }> {
  return api.patch(`/admin/organizations/${orgId}/active`, { is_active: isActive });
}

// ── M05-03/05 MOU ───────────────────────────────────────────
export async function listMous(status?: string): Promise<MouListResponse> {
  const qs = status ? `?status=${status}` : '';
  return api.get<MouListResponse>(`/network/mous${qs}`);
}

export async function createMou(
  orgId: string,
  body: CreateMouRequest,
): Promise<{ mou_id: string; title: string; message: string }> {
  return api.post(`/admin/organizations/${orgId}/mou`, body);
}

export async function listExpiringMous(
  withinDays = 30,
): Promise<{ data: ExpiringMou[]; meta: { total: number; within_days: number } }> {
  return api.get(`/admin/mous/expiring?within_days=${withinDays}`);
}

export async function notifyExpiringMous(): Promise<{ sent: number; message: string }> {
  return api.post('/admin/mous/notify-expiring');
}

// ── M05-06 프로그램 (운영자) ────────────────────────────────
export async function listPrograms(): Promise<{
  data: Program[];
  meta: { total: number; limit: number; offset: number };
}> {
  return api.get('/admin/programs');
}

export async function createProgram(body: {
  name: string;
  description?: string | null;
  linked_project_id?: string | null;
  linked_mentor_id?: string | null;
  linked_team_id?: string | null;
  linked_organization_id?: string | null;
}): Promise<{ program_id: string; name: string; message: string }> {
  return api.post('/admin/programs', body);
}

export async function deleteProgram(
  programId: string,
): Promise<{ program_id: string; deleted: boolean; message: string }> {
  return api.delete(`/admin/programs/${programId}`);
}

// ── M05-07 커뮤니티 (공개 조회 + 운영자 작성) ───────────────
export async function listCommunityPosts(
  limit = 20,
  offset = 0,
): Promise<CommunityListResponse> {
  return api.get<CommunityListResponse>(
    `/network/community?limit=${limit}&offset=${offset}`,
  );
}

export async function getCommunityPost(
  postId: string,
): Promise<CommunityPostDetail> {
  return api.get<CommunityPostDetail>(`/network/community/${postId}`);
}

export async function createCommunityPost(body: {
  title: string;
  body: string;
  is_pinned?: boolean;
}): Promise<{ post_id: string; message: string }> {
  return api.post('/admin/community', body);
}

export async function updateCommunityPost(
  postId: string,
  body: { title?: string; body?: string; is_pinned?: boolean },
): Promise<{ post_id: string; updated: boolean; message: string }> {
  return api.patch(`/admin/community/${postId}`, body);
}

export async function deleteCommunityPost(
  postId: string,
): Promise<{ post_id: string; deleted: boolean; message: string }> {
  return api.delete(`/admin/community/${postId}`);
}

// ── M05-08 댓글 (시민 작성 + 운영자 조정) ───────────────────
export async function createCommunityComment(
  postId: string,
  body: string,
): Promise<{ comment_id: string; message: string }> {
  return api.post(`/network/community/${postId}/comments`, { body });
}

export async function updateOwnComment(
  commentId: string,
  body: string,
): Promise<{ comment_id: string; updated: boolean; message: string }> {
  return api.patch(`/network/community/comments/${commentId}`, { body });
}

export async function moderateComment(
  commentId: string,
  action: 'hide' | 'unhide' | 'delete',
): Promise<{ comment_id: string; action: string; message: string }> {
  return api.post(`/admin/community/comments/${commentId}/moderate`, { action });
}
