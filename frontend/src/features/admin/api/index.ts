/**
 * USCP V2 Features / admin — M08 권한·감사 API 클라이언트.
 *
 * 설계 근거: design.md §4.2 M08 (/admin/users, /admin/operators, /admin/audit)
 */
import { api } from '@/lib/api';

import type {
  AuditFilters,
  AuditListResponse,
  CreateOperatorRequest,
  UserDetail,
  UserListResponse,
  UserRole,
  UserStatus,
} from '../types';

// ── M08-03 사용자 목록·검색 ──────────────────────────────────

export interface ListUsersFilters {
  q?: string | null;
  role?: UserRole | null;
  status?: UserStatus | null;
  limit?: number;
  offset?: number;
}

export async function listUsers(
  filters: ListUsersFilters = {},
): Promise<UserListResponse> {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.role) p.set('role', filters.role);
  if (filters.status) p.set('status_filter', filters.status);
  if (filters.limit) p.set('limit', String(filters.limit));
  if (filters.offset) p.set('offset', String(filters.offset));
  const qs = p.toString();
  return api.get<UserListResponse>(`/admin/users${qs ? `?${qs}` : ''}`);
}

/** M08-03/06 사용자 상세 — 조회 시 view_pii 자동 감사 기록. */
export async function getUserDetail(userId: string): Promise<UserDetail> {
  return api.get<UserDetail>(`/admin/users/${userId}`);
}

// ── M08-01/02 운영자 추가·삭제 ───────────────────────────────

export async function createOperator(
  body: CreateOperatorRequest,
): Promise<{ id: string; email: string; name: string; message: string }> {
  return api.post('/admin/operators', body);
}

export async function deactivateOperator(
  operatorId: string,
  mode: 'deactivate' | 'delete' = 'deactivate',
): Promise<{ id: string; status: string; mode: string; message: string }> {
  return api.delete(`/admin/operators/${operatorId}?mode=${mode}`);
}

// ── M08-08 감사 로그 조회 ────────────────────────────────────

function auditQs(filters: AuditFilters): string {
  const p = new URLSearchParams();
  if (filters.action) p.set('action', filters.action);
  if (filters.actor_id) p.set('actor_id', filters.actor_id);
  if (filters.start) p.set('start', filters.start);
  if (filters.end) p.set('end', filters.end);
  if (filters.limit) p.set('limit', String(filters.limit));
  if (filters.offset) p.set('offset', String(filters.offset));
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export async function listAuditLogins(
  filters: AuditFilters = {},
): Promise<AuditListResponse> {
  return api.get<AuditListResponse>(`/admin/audit/logins${auditQs(filters)}`);
}

export async function listAuditGatekeeping(
  filters: AuditFilters = {},
): Promise<AuditListResponse> {
  return api.get<AuditListResponse>(`/admin/audit/gatekeeping${auditQs(filters)}`);
}

export async function listAuditAll(
  filters: AuditFilters = {},
): Promise<AuditListResponse> {
  return api.get<AuditListResponse>(`/admin/audit/all${auditQs(filters)}`);
}
