'use client';

import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { TrackBadge } from '@/components/domain';
import {
  REGIONS,
  useDebouncedValue,
  type IssueListItem,
  type IssueListResponse,
  type RegionCode,
} from '@/features/issues';
import {
  getStageStats,
  listGatekeepingQueue,
  type AdminStage,
  type StageStats,
} from '@/features/gatekeeping';
import { cn } from '@/lib/utils';

/**
 * M02-07: 게이트키핑 큐 (sitemap #15).
 *
 * 설계 근거:
 *  - feature-spec §M02-07 (운영자 큐)
 *  - design.md §7.3 #15·#16
 *
 * V2 변경:
 *  - V1 admin 평면 페이지 → V2 sitemap §3.2.2 관리자 영역 통합
 *  - 단계별 통계 칩 + 필터 + IssueCard 재활용
 */
const STAGES: { code: AdminStage | ''; label: string }[] = [
  { code: '', label: '전체' },
  { code: 'reported', label: '제보' },
  { code: 'reviewing', label: '검토중' },
  { code: 'published', label: '공개등록' },
  { code: 'mentor_assigned', label: '멘토배정' },
  { code: 'in_progress', label: '처리중' },
  { code: 'resolved', label: '해결완료' },
  { code: 'rejected', label: '반려' },
];

const STAGE_BADGE: Record<string, { bg: string; fg: string }> = {
  reported: { bg: '#f3f4f6', fg: '#374151' },
  reviewing: { bg: '#dbeafe', fg: '#1d4ed8' },
  published: { bg: '#ede9fe', fg: '#6d28d9' },
  mentor_assigned: { bg: '#fce7f3', fg: '#9d174d' },
  in_progress: { bg: '#fef3c7', fg: '#92400e' },
  resolved: { bg: '#d1fae5', fg: '#047857' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
};

export default function AdminIssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initStage = (searchParams?.get('stage') as AdminStage) || '';
  const initRegion = (searchParams?.get('region') as RegionCode) || '';
  const initQ = searchParams?.get('q') ?? '';

  const [stage, setStage] = useState<AdminStage | ''>(initStage);
  const [region, setRegion] = useState<RegionCode | ''>(initRegion);
  const [q, setQ] = useState(initQ);
  const [stats, setStats] = useState<StageStats | null>(null);
  const [items, setItems] = useState<IssueListItem[]>([]);
  const [meta, setMeta] = useState<IssueListResponse['meta']>({
    limit: 20,
    has_more: false,
    next_cursor: null,
  });
  const [loading, setLoading] = useState(true);

  // M02-20: 키워드 300ms 디바운스
  const debouncedQ = useDebouncedValue(q, 300);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (stage) params.set('stage', stage);
    if (region) params.set('region', region);
    if (debouncedQ) params.set('q', debouncedQ);
    const qs = params.toString();
    router.replace(qs ? `/admin/issues?${qs}` : '/admin/issues', {
      scroll: false,
    });
  }, [stage, region, debouncedQ, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        listGatekeepingQueue({
          stage: (stage || undefined) as AdminStage | undefined,
          region: (region || undefined) as RegionCode | undefined,
          q: debouncedQ.trim() || undefined,
          limit: 20,
        }),
        getStageStats(),
      ]);
      setItems(list.data);
      setMeta(list.meta);
      setStats(s);
    } catch {
      setItems([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [stage, region, debouncedQ]);

  useEffect(() => {
    void fetchData();
    syncUrl();
  }, [fetchData, syncUrl]);

  return (
    <div className="container-content py-10" data-testid="admin-issues-page">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        관리자 대시보드
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-black text-text">게이트키핑 큐</h1>
        <p className="mt-1 text-sm text-text-secondary">
          단계별 제보를 검토하고 다음 단계로 전환하세요. 모든 작업은 감사 로그에
          자동 기록됩니다.
        </p>
      </header>

      {/* 단계별 통계 칩 */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        data-testid="admin-issues-stats"
      >
        {STAGES.map((s) => {
          const count = s.code === '' ? Object.values(stats ?? {}).reduce((a, b) => a + b, 0) : (stats?.[s.code] ?? 0);
          const isActive = stage === s.code;
          const badge = STAGE_BADGE[s.code] ?? { bg: '#f3f4f6', fg: '#374151' };
          return (
            <button
              key={s.code || 'all'}
              type="button"
              onClick={() => setStage(s.code)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                isActive
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text hover:border-primary',
              )}
              data-testid={`stage-chip-${s.code || 'all'}`}
              data-active={isActive}
            >
              <span>{s.label}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px]"
                style={
                  isActive
                    ? { background: 'rgba(255,255,255,0.2)' }
                    : { background: badge.bg, color: badge.fg }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 필터 — 지역 + 검색 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">지역</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as RegionCode | '')}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="admin-filter-region"
          >
            <option value="">전체 지역</option>
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">키워드 검색</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·본문 검색"
              className="w-full rounded-md border border-border bg-surface pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="admin-filter-q"
            />
          </div>
        </label>
      </div>

      {/* 결과 */}
      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p
          className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-text-muted"
          data-testid="admin-issues-empty"
        >
          조건에 맞는 제보가 없습니다.
        </p>
      ) : (
        <ul
          className="divide-y divide-border rounded-xl border border-border bg-surface"
          data-testid="admin-issues-list"
        >
          {items.map((issue) => {
            const regionMeta = REGIONS.find((r) => r.code === issue.region);
            const stageBadge =
              STAGE_BADGE[issue.stage ?? 'reported'] ?? STAGE_BADGE.reported;
            return (
              <li
                key={issue.id}
                className="p-4 transition hover:bg-bg"
                data-testid="admin-issue-row"
                data-stage={issue.stage}
              >
                <Link
                  href={`/admin/issues/${issue.id}`}
                  className="flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {regionMeta ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background: `${regionMeta.color}22`,
                          color: regionMeta.color,
                        }}
                      >
                        {regionMeta.label}
                      </span>
                    ) : null}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: stageBadge.bg, color: stageBadge.fg }}
                    >
                      {STAGES.find((s) => s.code === issue.stage)?.label ??
                        issue.stage}
                    </span>
                    {issue.track ? (
                      <TrackBadge track={issue.track} size="sm" />
                    ) : null}
                  </div>
                  <div className="font-bold text-text">{issue.title}</div>
                  <div className="text-xs text-text-muted">
                    공감 {issue.vote_count} · 댓글 {issue.comment_count} ·{' '}
                    {new Date(issue.created_at).toLocaleString('ko-KR')}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {meta.has_more ? (
        <p className="mt-4 text-center text-xs text-text-muted">
          더 많은 결과는 필터를 조정하거나 페이지네이션을 사용하세요. (Sprint 후반
          페이지네이션 도입 예정)
        </p>
      ) : null}
    </div>
  );
}
