/**
 * USCP V2 Features / admin — M08 권한·감사 타입.
 *
 * 설계 근거: feature-spec §M08-01~09, design.md §4.2 M08
 */

export type UserRole = 'citizen' | 'operator' | 'mentor' | 'student';
export type UserStatus = 'active' | 'suspended' | 'withdrawn';

export interface UserItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
}

export interface UserDetail extends UserItem {
  birth_year: number | null;
  email_verified: boolean;
}

export interface UserListResponse {
  data: UserItem[];
  meta: { total: number; limit: number; offset: number };
}

export interface CreateOperatorRequest {
  email: string;
  name: string;
  temp_password: string;
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'view_pii'
  | 'stage_change';

export interface AuditLogEntry {
  id: string;
  actor: { id: string | null; name: string };
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  is_self: boolean;
  created_at: string;
}

export interface AuditListResponse {
  data: AuditLogEntry[];
  meta: { total: number; limit: number; offset: number };
}

export interface AuditFilters {
  action?: AuditAction | null;
  actor_id?: string | null;
  start?: string | null;
  end?: string | null;
  limit?: number;
  offset?: number;
}

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  citizen: '시민',
  operator: '운영자',
  mentor: '멘토',
  student: '학생팀',
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: '활성',
  suspended: '정지',
  withdrawn: '탈퇴',
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  login: '로그인',
  logout: '로그아웃',
  create: '생성',
  update: '수정',
  delete: '삭제',
  view_pii: '개인정보 조회',
  stage_change: '단계 전환',
};
