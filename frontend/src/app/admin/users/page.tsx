'use client';

import { Search, UserPlus, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmModal, Modal, useToast } from '@/components/ui';
import {
  createOperator,
  deactivateOperator,
  listUsers,
  USER_ROLE_LABEL,
  USER_STATUS_LABEL,
  type UserItem,
  type UserRole,
  type UserStatus,
} from '@/features/admin';
import { ApiError } from '@/lib/api';

/**
 * M08-01/02/03 — 사용자·권한 관리 (운영자).
 *
 * 설계 근거:
 *  - feature-spec §M08-01 (운영자 추가), §M08-02 (비활성화·삭제), §M08-03 (목록·검색)
 *  - feature-spec §M08-10 (WCAG 2.1 AA — 헤딩 구조·키보드·라벨·대비·스크린리더)
 *  - design.md §7.2.1 (Modal/ConfirmModal — window.confirm 금지)
 *
 * 단일 화면에서 검색·필터·운영자 추가·권한 회수까지 (운영자 여정 최소화).
 */
const ROLE_OPTIONS: UserRole[] = ['citizen', 'operator', 'mentor', 'student'];
const STATUS_OPTIONS: UserStatus[] = ['active', 'suspended', 'withdrawn'];

const ROLE_BADGE: Record<UserRole, string> = {
  operator: 'bg-primary-light text-primary',
  mentor: 'bg-violet-100 text-violet-700',
  student: 'bg-amber-100 text-amber-700',
  citizen: 'bg-bg-muted text-text-secondary',
};
const STATUS_BADGE: Record<UserStatus, string> = {
  active: 'bg-secondary-light text-secondary',
  suspended: 'bg-amber-100 text-amber-700',
  withdrawn: 'bg-bg-muted text-text-muted',
};

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');

  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPw, setNewPw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<UserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUsers({
        q: q || null,
        role: roleFilter || null,
        status: statusFilter || null,
        limit: 50,
      });
      setUsers(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '사용자 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, statusFilter, toast]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function handleAddOperator(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!newEmail.trim() || !newName.trim() || newPw.length < 8) {
      toast.error('이메일·이름·임시 비밀번호(8자 이상)를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createOperator({
        email: newEmail.trim(),
        name: newName.trim(),
        temp_password: newPw,
      });
      toast.success('운영자 계정을 발급하고 안내 메일을 보냈습니다.');
      setAddOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPw('');
      await fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'email_already_exists') {
          toast.error('이미 가입된 이메일입니다.');
        } else {
          toast.error(detail?.message ?? err.message);
        }
      } else {
        toast.error(err instanceof Error ? err.message : '운영자 추가 실패');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivateOperator(deactivateTarget.id, 'deactivate');
      toast.success('운영자 계정을 비활성화했습니다.');
      await fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'cannot_self_delete') {
          toast.error('본인 계정은 직접 처리할 수 없습니다.');
        } else {
          toast.error(detail?.message ?? err.message);
        }
      } else {
        toast.error(err instanceof Error ? err.message : '처리 실패');
      }
    } finally {
      setDeactivateTarget(null);
    }
  }

  return (
    <div className="px-8 py-8" data-testid="admin-users-page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-text">사용자·권한 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            시민·운영자·멘토를 통합 조회하고 운영자 권한을 관리합니다. 총 {total}명
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          data-testid="add-operator-open"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          운영자 추가
        </button>
      </header>

      {/* 검색·필터 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void fetchUsers();
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
        role="search"
        aria-label="사용자 검색"
      >
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-text">이름·이메일 검색</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="홍길동 또는 user@example.com"
              className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              data-testid="user-search"
            />
          </div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-text">역할</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="role-filter"
          >
            <option value="">전체</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-text">상태</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="status-filter"
          >
            <option value="">전체</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {USER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:border-primary"
        >
          검색
        </button>
      </form>

      {/* 사용자 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm" data-testid="users-table">
          <caption className="sr-only">사용자 목록</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">이름</th>
              <th scope="col" className="px-4 py-3 font-semibold">이메일</th>
              <th scope="col" className="px-4 py-3 font-semibold">역할</th>
              <th scope="col" className="px-4 py-3 font-semibold">상태</th>
              <th scope="col" className="px-4 py-3 font-semibold">최근 로그인</th>
              <th scope="col" className="px-4 py-3 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  불러오는 중...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  조건에 맞는 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0"
                  data-testid={`user-row-${u.id}`}
                >
                  <td className="px-4 py-3 font-medium text-text">{u.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role]}`}
                    >
                      {USER_ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[u.status]}`}
                    >
                      {USER_STATUS_LABEL[u.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString('ko-KR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'operator' && u.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setDeactivateTarget(u)}
                        className="inline-flex items-center gap-1 rounded-md border border-danger px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10"
                        data-testid={`deactivate-${u.id}`}
                      >
                        <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                        비활성화
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 운영자 추가 모달 (M08-01) */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="운영자 계정 추가"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg"
            >
              취소
            </button>
            <button
              type="submit"
              form="add-operator-form"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              data-testid="add-operator-submit"
            >
              {submitting ? '발급 중...' : '발급'}
            </button>
          </>
        }
      >
        <form id="add-operator-form" onSubmit={handleAddOperator} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">이메일</span>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="new-operator-email"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">이름</span>
            <input
              type="text"
              required
              maxLength={100}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="new-operator-name"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">
              임시 비밀번호 <span className="text-text-muted">(8자 이상)</span>
            </span>
            <input
              type="text"
              required
              minLength={8}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="new-operator-password"
            />
            <span className="mt-1 block text-xs text-text-muted">
              신규 운영자는 로그인 후 즉시 비밀번호를 변경해야 합니다.
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmModal
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        title="운영자 비활성화"
        description={
          deactivateTarget
            ? `${deactivateTarget.name}(${deactivateTarget.email}) 운영자 계정을 비활성화하시겠습니까? 본인 계정은 다른 운영자만 처리할 수 있습니다.`
            : ''
        }
        confirmLabel="비활성화"
        cancelLabel="취소"
        variant="danger"
      />
    </div>
  );
}
