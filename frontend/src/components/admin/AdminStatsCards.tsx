'use client';

import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Sprout,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M09-04 (Admin) 운영 현황 요약 카드.
 *
 * 설계 근거:
 *  - feature-spec §M09-04 (관리자 대시보드)
 *  - design.md §7.3 #14 AdminStatsCards
 *
 * 공개 통계(M09-01)와 다른 점:
 *  - 게이트키핑 대기 (reported) 건수 추가
 *  - 처리중 의제 강조 (운영자 즉시 액션 대상)
 *  - 데이터 소스: /common/stats 재활용 (실패 시 0 fallback)
 */

interface AdminStats {
  // /common/stats 그대로 + 추정값
  issues_resolved: number;
  projects_in_progress: number;
  members_total: number;
  regions_count: number;
}

interface CardSpec {
  key: keyof AdminStats | 'pending_review';
  label: string;
  unit: string;
  Icon: typeof CheckCircle2;
  iconClass: string;
  bgClass: string;
  href?: string;
}

const CARDS: ReadonlyArray<CardSpec> = [
  {
    key: 'pending_review',
    label: '게이트키핑 대기',
    unit: '건',
    Icon: Inbox,
    iconClass: 'text-warning',
    bgClass: 'bg-warning/10',
    href: '/admin/issues?stage=reported',
  },
  {
    key: 'issues_resolved',
    label: '해결완료 의제',
    unit: '건',
    Icon: CheckCircle2,
    iconClass: 'text-success',
    bgClass: 'bg-success/10',
    href: '/admin/issues?stage=resolved',
  },
  {
    key: 'projects_in_progress',
    label: '진행 중 리빙랩',
    unit: '개',
    Icon: Sprout,
    iconClass: 'text-secondary',
    bgClass: 'bg-secondary/10',
    href: '/admin/projects',
  },
  {
    key: 'members_total',
    label: '등록 회원',
    unit: '명',
    Icon: Users,
    iconClass: 'text-[#7c3aed]',
    bgClass: 'bg-[#ede9fe]',
    href: '/admin/users',
  },
];

export function AdminStatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingReview, setPendingReview] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<AdminStats>('/common/stats');
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) {
          setStats({
            issues_resolved: 0,
            projects_in_progress: 0,
            members_total: 0,
            regions_count: 5,
          });
        }
      }
      // 게이트키핑 대기 건수는 별도 — admin/issues/stats Sprint 2 에서 정식 구현
      // 현 시점에는 0 fallback (추후 /admin/issues/stats?stage=reported 연결)
      try {
        type StatsPayload = { reported?: number };
        const queue = await api.get<StatsPayload>(
          '/admin/issues/stats?group=stage',
        );
        if (!cancelled) setPendingReview(queue.reported ?? 0);
      } catch {
        if (!cancelled) setPendingReview(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = (key: CardSpec['key']): number => {
    if (key === 'pending_review') return pendingReview;
    return stats?.[key as keyof AdminStats] ?? 0;
  };

  return (
    <ul
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="admin-stats-cards"
    >
      {CARDS.map((spec) => {
        const v = value(spec.key);
        const isAlert = spec.key === 'pending_review' && v > 0;
        const Wrapper: 'a' | 'li' = 'li';
        const inner = (
          <div
            className={cn(
              'rounded-xl border bg-surface p-5 shadow-sm transition hover:shadow-md',
              isAlert ? 'border-warning/40 bg-warning/5' : 'border-border',
            )}
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
              {isAlert ? (
                <AlertCircle
                  className="h-4 w-4 text-warning"
                  aria-label="처리 대기"
                />
              ) : null}
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
                {v.toLocaleString('ko-KR')}
                <span className="ml-1 text-lg font-medium text-text-muted">
                  {spec.unit}
                </span>
              </div>
            )}
          </div>
        );

        return (
          <Wrapper
            key={spec.key}
            data-testid={`admin-stat-card-${spec.key}`}
            data-value={v}
          >
            {spec.href ? (
              <a href={spec.href} className="block">
                {inner}
              </a>
            ) : (
              inner
            )}
          </Wrapper>
        );
      })}
    </ul>
  );
}
