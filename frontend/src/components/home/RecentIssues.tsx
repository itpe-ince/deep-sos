'use client';

import { ArrowRight, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { TrackBadge, type IssueTrack } from '@/components/domain';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M09-03: 최근 제보 카드 위젯 (3건).
 *
 * 설계 근거:
 *  - feature-spec §M09-03 (최근 제보 카드 위젯)
 *  - design.md §7.3 #1 홈 RecentIssues
 *  - mockup/pages/index.html .card-grid--3
 *  - 응답 캐시: 5분 (design.md §8.1)
 *
 * API: 본 위젯은 신규 `/api/v1/issues?limit=3&stage=published,in_progress,resolved&sort=-created_at`
 * 를 호출하지만, 0009 마이그레이션 직후 V1 데이터와 V2 컬럼이 혼재할 수 있으므로
 * 응답 형식 호환성을 위해 `RecentIssueItem` 의 모든 필드를 optional 로 처리.
 */

interface RecentIssueItem {
  id: string;
  title: string;
  body?: string | null;
  description?: string | null;
  region?: string | null;
  region_label?: string | null;
  stage?: string | null;
  status?: string | null;
  track?: IssueTrack | null;
  vote_count?: number | null;
  comment_count?: number | null;
  created_at?: string | null;
}

interface ListResponse<T> {
  data: T[];
  meta?: unknown;
}

const REGION_LABEL: Record<string, string> = {
  daejeon: '대전',
  gongju: '공주',
  yesan: '예산',
  cheonan: '천안',
  sejong: '세종',
};

const REGION_COLOR: Record<string, { bg: string; fg: string }> = {
  daejeon: { bg: '#dbeafe', fg: '#1d4ed8' },
  gongju: { bg: '#d1fae5', fg: '#047857' },
  yesan: { bg: '#ede9fe', fg: '#6d28d9' },
  cheonan: { bg: '#cffafe', fg: '#155e75' },
  sejong: { bg: '#ffedd5', fg: '#9a3412' },
};

const STAGE_LABEL: Record<string, string> = {
  reported: '제보',
  reviewing: '검토중',
  published: '공개등록',
  mentor_assigned: '멘토배정',
  in_progress: '처리중',
  resolved: '해결완료',
  rejected: '반려',
  // V1 fallback
  submitted: '제보',
  assigned: '멘토배정',
  progress: '처리중',
};

const STAGE_COLOR: Record<string, { bg: string; fg: string }> = {
  reported: { bg: '#f3f4f6', fg: '#374151' },
  reviewing: { bg: '#dbeafe', fg: '#1d4ed8' },
  published: { bg: '#ede9fe', fg: '#6d28d9' },
  mentor_assigned: { bg: '#fce7f3', fg: '#9d174d' },
  in_progress: { bg: '#fef3c7', fg: '#92400e' },
  resolved: { bg: '#d1fae5', fg: '#047857' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
};

interface RecentIssuesProps {
  initial?: RecentIssueItem[];
  limit?: number;
}

export function RecentIssues({ initial, limit = 3 }: RecentIssuesProps) {
  const [items, setItems] = useState<RecentIssueItem[] | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    (async () => {
      try {
        // V2 우선 호출 — 공개된 의제 (검토중/공개등록 이후) 최신순
        const data = await api.get<ListResponse<RecentIssueItem>>(
          `/issues?limit=${limit}&sort=-created_at`,
        );
        if (!cancelled) setItems(data.data ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, limit]);

  return (
    <section
      aria-labelledby="recent-issues-heading"
      className="container-content py-16"
      data-testid="home-recent-issues"
    >
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-primary">
            최근 제보
          </div>
          <h2
            id="recent-issues-heading"
            className="text-2xl font-black text-text md:text-3xl"
          >
            시민이 발견한 지역문제
          </h2>
        </div>
        <Link
          href="/issues"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          data-testid="recent-issues-view-all"
        >
          전체 보기
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      {loading ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: limit }).map((_, i) => (
            <li
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border bg-surface-hover"
              aria-hidden="true"
            />
          ))}
        </ul>
      ) : items && items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, limit).map((item) => (
            <IssueCard key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <div
          className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-text-muted"
          data-testid="recent-issues-empty"
        >
          아직 공개된 제보가 없습니다. 첫 번째 시민이 되어 주세요.
        </div>
      )}
    </section>
  );
}

function IssueCard({ item }: { item: RecentIssueItem }) {
  const regionKey = item.region ?? '';
  const stageKey =
    item.stage ?? item.status ?? 'reported';
  const summary = item.body ?? item.description ?? '';

  return (
    <li
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition hover:shadow-md"
      data-testid="recent-issue-card"
      data-stage={stageKey}
      data-region={regionKey}
    >
      <div className="flex items-center gap-2">
        {regionKey && REGION_LABEL[regionKey] ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              background: REGION_COLOR[regionKey]?.bg ?? '#f3f4f6',
              color: REGION_COLOR[regionKey]?.fg ?? '#374151',
            }}
          >
            {REGION_LABEL[regionKey]}
          </span>
        ) : null}
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            background: STAGE_COLOR[stageKey]?.bg ?? '#f3f4f6',
            color: STAGE_COLOR[stageKey]?.fg ?? '#374151',
          }}
        >
          {STAGE_LABEL[stageKey] ?? stageKey}
        </span>
        {item.track ? <TrackBadge track={item.track} size="sm" /> : null}
      </div>

      <Link
        href={`/issues/${item.id}`}
        className="flex-1 text-base font-bold leading-snug text-text hover:text-primary"
      >
        {item.title}
      </Link>

      {summary ? (
        <p className={cn('line-clamp-2 text-sm leading-relaxed text-text-secondary')}>
          {summary}
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-xs text-text-muted">
        {item.created_at ? <span>{formatRelative(item.created_at)}</span> : null}
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          공감 {item.vote_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          댓글 {item.comment_count ?? 0}
        </span>
      </div>
    </li>
  );
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const day = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (day < 1) return '오늘';
    if (day < 7) return `${day}일 전`;
    if (day < 30) return `${Math.floor(day / 7)}주 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}
