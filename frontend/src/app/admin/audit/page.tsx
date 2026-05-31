'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui';
import {
  AUDIT_ACTION_LABEL,
  listAuditAll,
  listAuditGatekeeping,
  listAuditLogins,
  type AuditAction,
  type AuditLogEntry,
} from '@/features/admin';

/**
 * M08-08 — 감사 로그 조회 (운영자).
 *
 * 설계 근거:
 *  - feature-spec §M08-08 (기간·작업자·종류 필터, 본인 작업 구분 표시)
 *  - feature-spec §M08-10 (WCAG 2.1 AA — 헤딩·키보드·라벨·대비·스크린리더)
 *
 * 탭(전체/로그인/게이트키핑)으로 카테고리 사전필터 + 기간·종류 추가필터.
 * 로그는 AuditMiddleware(M08-04~07)가 자동 적재.
 */
type Tab = 'all' | 'logins' | 'gatekeeping';

const ACTION_OPTIONS: AuditAction[] = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'view_pii',
  'stage_change',
];

const ACTION_COLOR: Record<AuditAction, string> = {
  login: 'bg-secondary-light text-secondary',
  logout: 'bg-bg-muted text-text-secondary',
  create: 'bg-primary-light text-primary',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-danger/10 text-danger',
  view_pii: 'bg-violet-100 text-violet-700',
  stage_change: 'bg-blue-100 text-blue-700',
};

export default function AdminAuditPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('all');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState<AuditAction | ''>('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        start: start || null,
        end: end || null,
        limit: 100,
      };
      let res;
      if (tab === 'logins') {
        res = await listAuditLogins(filters);
      } else if (tab === 'gatekeeping') {
        res = await listAuditGatekeeping(filters);
      } else {
        res = await listAuditAll({ ...filters, action: action || null });
      }
      setLogs(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '감사 로그 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [tab, action, start, end, toast]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'logins', label: '로그인 이력' },
    { key: 'gatekeeping', label: '게이트키핑' },
  ];

  return (
    <div className="px-8 py-8" data-testid="admin-audit-page">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-text">감사 로그</h1>
        <p className="mt-1 text-sm text-text-secondary">
          로그인·게이트키핑·개인정보 조회·콘텐츠 변경 이력을 추적합니다. 총 {total}건
        </p>
      </header>

      {/* 탭 */}
      <div
        className="mb-4 flex gap-1 border-b border-border"
        role="tablist"
        aria-label="감사 로그 분류"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
            data-testid={`audit-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 필터 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void fetchLogs();
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
        aria-label="감사 로그 필터"
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-text">시작일</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="audit-start"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-text">종료일</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="audit-end"
          />
        </label>
        {tab === 'all' ? (
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text">작업 종류</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as AuditAction | '')}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="audit-action-filter"
            >
              <option value="">전체</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="submit"
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:border-primary"
        >
          조회
        </button>
      </form>

      {/* 로그 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm" data-testid="audit-table">
          <caption className="sr-only">감사 로그 목록</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">일시</th>
              <th scope="col" className="px-4 py-3 font-semibold">작업자</th>
              <th scope="col" className="px-4 py-3 font-semibold">작업</th>
              <th scope="col" className="px-4 py-3 font-semibold">대상</th>
              <th scope="col" className="px-4 py-3 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  불러오는 중...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  조건에 맞는 감사 로그가 없습니다.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border last:border-0"
                  data-testid={`audit-row-${log.id}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                    {new Date(log.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-text">
                    {log.actor.name}
                    {log.is_self ? (
                      <span className="ml-1.5 rounded bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        본인
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_COLOR[log.action]}`}
                    >
                      {AUDIT_ACTION_LABEL[log.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {log.target_type ?? '—'}
                    {log.target_id ? (
                      <span className="ml-1 text-xs text-text-muted">
                        #{log.target_id.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{log.ip ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
