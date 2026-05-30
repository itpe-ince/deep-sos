'use client';

import { CheckCircle2, MapPin, Sprout, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M09-01: 홈 화면 통계 카드 (4종).
 *
 * 설계 근거:
 *  - feature-spec §M09-01 (홈 화면 통계 카드)
 *  - design.md §7.3 #1 홈 — StatsCards
 *  - mockup/pages/index.html .kpi-grid (해결완료/진행중/등록회원/운영지역)
 *  - design.md §8.1 응답 캐시 1분 (API: GET /common/stats)
 *
 * 응답이 늦거나 실패해도 SSR 화면이 깨지지 않도록 skeleton + fallback 0 처리.
 */

export interface CommonStatsResponse {
  issues_resolved: number;
  projects_in_progress: number;
  members_total: number;
  regions_count: number;
}

interface CardSpec {
  key: keyof CommonStatsResponse;
  label: string;
  unit: string;
  Icon: typeof CheckCircle2;
  iconClass: string;
  bgClass: string;
  caption: string;
}

const CARDS: ReadonlyArray<CardSpec> = [
  {
    key: 'issues_resolved',
    label: '해결완료 의제',
    unit: '건',
    Icon: CheckCircle2,
    iconClass: 'text-success',
    bgClass: 'bg-success/10',
    caption: '6단계 워크플로우 종결',
  },
  {
    key: 'projects_in_progress',
    label: '진행 중 리빙랩',
    unit: '개',
    Icon: Sprout,
    iconClass: 'text-secondary',
    bgClass: 'bg-secondary/10',
    caption: '5개 지역 전체',
  },
  {
    key: 'members_total',
    label: '등록 회원',
    unit: '명',
    Icon: Users,
    iconClass: 'text-[#7c3aed]',
    bgClass: 'bg-[#ede9fe]',
    caption: '시민·멘토·학생팀 누적',
  },
  {
    key: 'regions_count',
    label: '운영 지역',
    unit: '개',
    Icon: MapPin,
    iconClass: 'text-warning',
    bgClass: 'bg-warning/10',
    caption: '대전·공주·예산·천안·세종',
  },
];

interface StatsCardsProps {
  /** SSR 초기값 — undefined 시 client fetch */
  initial?: CommonStatsResponse;
}

export function StatsCards({ initial }: StatsCardsProps) {
  const [stats, setStats] = useState<CommonStatsResponse | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<CommonStatsResponse>('/common/stats');
        if (!cancelled) setStats(data);
      } catch {
        // §8.3 운영 안정성: 통계 실패 시 0 fallback (홈 화면 자체는 표시)
        if (!cancelled) {
          setStats({
            issues_resolved: 0,
            projects_in_progress: 0,
            members_total: 0,
            regions_count: 5,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  return (
    <section
      aria-labelledby="stats-heading"
      className="container-content py-12"
      data-testid="home-stats-cards"
    >
      <h2 id="stats-heading" className="sr-only">
        USCP 운영 현황
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((spec) => {
          const value = stats?.[spec.key] ?? 0;
          return (
            <li
              key={spec.key}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
              data-testid={`stat-card-${spec.key}`}
              data-value={value}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    spec.bgClass,
                  )}
                  aria-hidden="true"
                >
                  <spec.Icon className={cn('h-5 w-5', spec.iconClass)} />
                </div>
              </div>
              <div className="mt-3 text-sm font-medium text-text-secondary">
                {spec.label}
              </div>
              {loading ? (
                <div
                  className="mt-1 h-9 w-20 animate-pulse rounded bg-surface-hover"
                  aria-hidden="true"
                />
              ) : (
                <div className="mt-1 text-3xl font-black text-text">
                  {value.toLocaleString('ko-KR')}
                  <span className="ml-1 text-lg font-medium text-text-muted">
                    {spec.unit}
                  </span>
                </div>
              )}
              <div className="mt-1 text-xs text-text-muted">{spec.caption}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
