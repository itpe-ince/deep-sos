'use client';

import { TrendingUp, FolderDown, Megaphone, Download } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  listKpis,
  listResources,
  listContents,
  downloadResource,
  RESOURCE_CATEGORY_LABELS,
  type KpiIndicator,
  type ResourceItem,
  type ContentItem,
} from '@/features/performance';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * M06 성과자료 공개 페이지 (/performance).
 *
 * 설계 근거:
 *  - feature-spec §M06-02(지표 달성률)·§M06-07(공지·이벤트)·§M06-08(자료실)
 *  - 사이트맵 #9 성과 (누구나)
 *
 * 3탭(성과지표·자료실·공지/이벤트)으로 통합.
 */
type Tab = 'kpi' | 'resources' | 'contents';

export default function PerformancePage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('kpi');
  const [kpis, setKpis] = useState<KpiIndicator[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [k, r, c] = await Promise.all([listKpis(), listResources(), listContents()]);
      setKpis(k.data);
      setResources(r.data);
      setContents(c.data);
    } catch {
      // 공개 페이지 — 실패 시 빈 상태
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function handleDownload(id: string) {
    try {
      const r = await downloadResource(id);
      if (r.download_url) {
        window.open(r.download_url, '_blank', 'noopener');
      } else {
        toast.error('다운로드 URL을 생성하지 못했습니다.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '다운로드 실패');
    }
  }

  const TABS: { key: Tab; label: string; icon: typeof TrendingUp; count: number }[] = [
    { key: 'kpi', label: '성과지표', icon: TrendingUp, count: kpis.length },
    { key: 'resources', label: '자료실', icon: FolderDown, count: resources.length },
    { key: 'contents', label: '공지·이벤트', icon: Megaphone, count: contents.length },
  ];

  return (
    <div className="container-content py-10" data-testid="performance-page">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-text">성과자료</h1>
        <p className="mt-1 text-sm text-text-secondary">
          USCP의 성과지표 현황과 운영 자료·소식을 확인하세요.
        </p>
      </header>

      <div className="mb-6 flex gap-1 border-b border-border" role="tablist">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text',
            )}
            data-testid={`perf-tab-${key}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-text-muted">불러오는 중...</p>
      ) : tab === 'kpi' ? (
        <section data-testid="kpi-panel">
          {kpis.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted" data-testid="kpi-empty">
              등록된 성과지표가 없습니다.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2" data-testid="kpi-list">
              {kpis.map((k) => (
                <li
                  key={k.id}
                  className="rounded-xl border border-border bg-surface p-5"
                  data-testid="kpi-card"
                >
                  <h3 className="mb-2 font-bold text-text">{k.name}</h3>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-black text-primary">
                      {k.actual_value.toLocaleString()}
                      <span className="ml-1 text-sm font-normal text-text-muted">
                        {k.unit ?? ''}
                      </span>
                    </div>
                    {k.target_value != null ? (
                      <div className="text-right text-sm text-text-secondary">
                        목표 {k.target_value.toLocaleString()}
                        {k.achievement_rate != null ? (
                          <span className="ml-1 font-semibold text-primary">
                            ({k.achievement_rate}%)
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {k.achievement_rate != null ? (
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(k.achievement_rate, 100)}%` }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : tab === 'resources' ? (
        <section data-testid="resource-panel">
          {resources.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted" data-testid="resource-empty">
              등록된 자료가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="resource-list">
              {resources.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  data-testid="resource-card"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      {RESOURCE_CATEGORY_LABELS[r.category as keyof typeof RESOURCE_CATEGORY_LABELS] ?? r.category}
                    </span>
                    <span className="font-semibold text-text">{r.title}</span>
                    <span className="text-xs text-text-muted">↓ {r.download_count}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light/40"
                    data-testid="resource-download"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    다운로드
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section data-testid="content-panel">
          {contents.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted" data-testid="content-empty">
              등록된 공지·이벤트가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="content-list">
              {contents.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  data-testid="content-card"
                >
                  <span className="font-semibold text-text">
                    <span
                      className={cn(
                        'mr-2 rounded px-1.5 py-0.5 text-xs',
                        c.category === 'notice'
                          ? 'bg-primary-light text-primary'
                          : 'bg-accent/20 text-accent',
                      )}
                    >
                      {c.category_label}
                    </span>
                    {c.is_pinned ? <span className="mr-1 text-accent">📌</span> : null}
                    {c.title}
                  </span>
                  <span className="text-xs text-text-muted">
                    {c.event_at ?? c.published_at ?? ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
