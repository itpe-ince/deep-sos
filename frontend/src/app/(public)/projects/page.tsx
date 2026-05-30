'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { REGIONS, RegionSelect, type RegionCode } from '@/features/issues';
import {
  PROJECT_STAGES,
  ProjectCard,
  listProjects,
  type ProjectListItem,
  type ProjectListResponse,
  type ProjectStage,
} from '@/features/projects';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

/**
 * M03-01: USCP V2 리빙랩 목록 (sitemap #5).
 *
 * 설계 근거:
 *  - feature-spec §M03-01 (리빙랩 목록 — 단계 필터)
 *  - design.md §7.3 #5 (ProjectFilterBar + ProjectCardList)
 *  - M02-02 광장 패턴 복제 (RegionSelect + URL 동기화 + cursor pagination)
 */
export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isOperator =
    !!user && String(user.role ?? '').toLowerCase() === 'operator';

  const initRegion = (searchParams?.get('region') as RegionCode) || '';
  const initStage = (searchParams?.get('stage') as ProjectStage) || '';

  const [region, setRegion] = useState<RegionCode | ''>(initRegion);
  const [stage, setStage] = useState<ProjectStage | ''>(initStage);
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [meta, setMeta] = useState<ProjectListResponse['meta']>({
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
    const qs = params.toString();
    router.replace(qs ? `/projects?${qs}` : '/projects', { scroll: false });
  }, [region, stage, router]);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProjects({
        region: region || undefined,
        stage: (stage || undefined) as ProjectStage | undefined,
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
  }, [region, stage]);

  useEffect(() => {
    void fetchFirstPage();
    syncUrl();
  }, [fetchFirstPage, syncUrl]);

  async function loadMore() {
    if (loadingMore || !meta.has_more || !meta.next_cursor) return;
    setLoadingMore(true);
    try {
      const res = await listProjects({
        region: region || undefined,
        stage: (stage || undefined) as ProjectStage | undefined,
        limit: 20,
        cursor: meta.next_cursor,
      });
      setItems((prev) => [...prev, ...res.data]);
      setMeta(res.meta);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="container-content py-12" data-testid="projects-page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text">리빙랩 프로젝트</h1>
          <p className="mt-1 text-sm text-text-secondary">
            대학과 지역이 함께 만드는 리빙랩 실험실 — 5개 지역에서 진행 중인
            프로젝트를 둘러보세요.
          </p>
        </div>
        {isOperator ? (
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            data-testid="projects-new-cta"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            프로젝트 등록
          </Link>
        ) : null}
      </header>

      {/* 필터 */}
      <div
        className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-5"
        data-testid="projects-filter-bar"
      >
        <RegionSelect
          value={(region || null) as RegionCode | null}
          onChange={(r) => setRegion(r)}
          label="지역"
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
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">단계</span>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as ProjectStage | '')}
            className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="filter-stage"
          >
            <option value="">전체</option>
            {PROJECT_STAGES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 결과 */}
      {loading ? (
        <p className="text-sm text-text-muted" data-testid="projects-loading">
          불러오는 중...
        </p>
      ) : items.length === 0 ? (
        <p
          className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-text-muted"
          data-testid="projects-empty"
        >
          조건에 맞는 프로젝트가 없습니다.
        </p>
      ) : (
        <>
          <ul
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-testid="projects-list"
          >
            {items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ul>

          {meta.has_more ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-md border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light disabled:opacity-60"
                data-testid="projects-load-more"
              >
                {loadingMore ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          ) : null}
        </>
      )}

      <p className="mt-6 text-xs text-text-muted">
        5개 지역: {REGIONS.map((r) => r.label).join(' · ')}
      </p>
    </div>
  );
}
