'use client';

import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ISSUE_TRACKS } from '@/components/domain';
import {
  IssueCard,
  REGIONS,
  RegionSelect,
  listIssues,
  useDebouncedValue,
  type IssueListItem,
  type IssueListResponse,
  type RegionCode,
} from '@/features/issues';
import type { IssueTrack } from '@/features/issues';
import { cn } from '@/lib/utils';

/**
 * M02-02: USCP V2 지역문제 광장 (sitemap #3).
 *
 * 설계 근거:
 *  - feature-spec §M02-02 (제보 목록 카드형)
 *  - design.md §7.3 #3 (IssueFilterBar + IssueCardList + TrackBadge + Pagination)
 *  - mockup/pages/public/issues.html
 *
 * V2 변경:
 *  - V1 의 location_lat/lng 의존 제거 (V2 region 컬럼 + KakaoMap 별도 분리)
 *  - 필터: 지역·단계·트랙·키워드 + 정렬 (-created_at | -vote_count)
 *  - URL query 동기화 (§2.4 — F5/공유 시 동일 결과)
 *  - features/issues 모듈의 IssueCard + listIssues 사용
 */
type Stage = 'published' | 'mentor_assigned' | 'in_progress' | 'resolved';
type SortKey = '-created_at' | '-vote_count';

const STAGES: { code: Stage | ''; label: string }[] = [
  { code: '', label: '전체' },
  { code: 'published', label: '공개등록' },
  { code: 'mentor_assigned', label: '멘토배정' },
  { code: 'in_progress', label: '처리중' },
  { code: 'resolved', label: '해결완료' },
];

export default function IssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initRegion = (searchParams?.get('region') as RegionCode) || '';
  const initStage = (searchParams?.get('stage') as Stage) || '';
  const initTrack = (searchParams?.get('track') as IssueTrack) || '';
  const initQ = searchParams?.get('q') ?? '';
  const initSort = (searchParams?.get('sort') as SortKey) || '-created_at';

  const [region, setRegion] = useState<RegionCode | ''>(initRegion);
  const [stage, setStage] = useState<Stage | ''>(initStage);
  const [track, setTrack] = useState<IssueTrack | ''>(initTrack);
  const [q, setQ] = useState(initQ);
  const [sort, setSort] = useState<SortKey>(initSort);

  // M02-20: 키워드 검색 300ms 디바운스 — 백엔드 호출 부하 완화
  const debouncedQ = useDebouncedValue(q, 300);

  const [items, setItems] = useState<IssueListItem[]>([]);
  const [meta, setMeta] = useState<IssueListResponse['meta']>({
    limit: 20,
    has_more: false,
    next_cursor: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (region) params.set('region', region);
    if (stage) params.set('stage', stage);
    if (track) params.set('track', track);
    if (debouncedQ) params.set('q', debouncedQ);
    if (sort !== '-created_at') params.set('sort', sort);
    const qs = params.toString();
    router.replace(qs ? `/issues?${qs}` : '/issues', { scroll: false });
  }, [region, stage, track, debouncedQ, sort, router]);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listIssues({
        region: (region || undefined) as RegionCode | undefined,
        stage: (stage || undefined) as never,
        track: (track || undefined) as never,
        // M02-20: 디바운스된 키워드만 백엔드에 전송 (1자 이하는 backend 가 무시)
        q: debouncedQ.trim() || undefined,
        sort,
        limit: 20,
      });
      setItems(res.data);
      setMeta(res.meta);
    } catch {
      setItems([]);
      setMeta({ limit: 20, has_more: false, next_cursor: null });
    } finally {
      setLoading(false);
    }
  }, [region, stage, track, debouncedQ, sort]);

  useEffect(() => {
    void fetchFirstPage();
    syncUrl();
  }, [fetchFirstPage, syncUrl]);

  async function loadMore() {
    if (loadingMore || !meta.has_more || !meta.next_cursor) return;
    setLoadingMore(true);
    try {
      const res = await listIssues({
        region: (region || undefined) as RegionCode | undefined,
        stage: (stage || undefined) as never,
        track: (track || undefined) as never,
        q: q || undefined,
        sort,
        cursor: meta.next_cursor,
        limit: 20,
      });
      setItems((prev) => [...prev, ...res.data]);
      setMeta(res.meta);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="container-content py-12" data-testid="issues-page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text">지역문제 광장</h1>
          <p className="mt-1 text-sm text-text-secondary">
            시민이 발견한 지역문제를 함께 살펴보고 공감하세요.
          </p>
        </div>
        <Link
          href="/user/issue-new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover hover:text-white"
          data-testid="issues-new-cta"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          제보하기
        </Link>
      </header>

      {/* 필터 */}
      <div
        className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-5"
        data-testid="issues-filter-bar"
      >
        <RegionSelect
          value={(region || null) as RegionCode | null}
          onChange={(r) => setRegion(r)}
          label="지역 (전체 보려면 아래 '전체 지역' 클릭)"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRegion('')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              region === ''
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border bg-surface text-text-secondary hover:border-primary',
            )}
            data-testid="region-all"
          >
            전체 지역
          </button>
          {REGIONS.length > 0 ? <span className="text-xs text-text-muted">·</span> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">단계</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage | '')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="filter-stage"
            >
              {STAGES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">트랙</span>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as IssueTrack | '')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="filter-track"
            >
              <option value="">전체</option>
              {ISSUE_TRACKS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text">정렬</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="filter-sort"
            >
              <option value="-created_at">최신순</option>
              <option value="-vote_count">공감순</option>
            </select>
          </label>
        </div>

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
              placeholder="제목·본문 검색 (2자 이상)"
              className="w-full rounded-md border border-border bg-surface pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="filter-q"
            />
          </div>
        </label>
      </div>

      {/* 결과 */}
      {loading ? (
        <p className="text-sm text-text-muted" data-testid="issues-loading">
          제보를 불러오는 중...
        </p>
      ) : items.length === 0 ? (
        <p
          className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-text-muted"
          data-testid="issues-empty"
        >
          조건에 맞는 제보가 없습니다.
        </p>
      ) : (
        <>
          <ul
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-testid="issues-list"
          >
            {items.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </ul>

          {meta.has_more ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-md border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light disabled:opacity-60"
                data-testid="issues-load-more"
              >
                {loadingMore ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
