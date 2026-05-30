'use client';

import { Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { TrackBadge } from '@/components/domain';
import { cn } from '@/lib/utils';

import { REGIONS, type IssueListItem } from '../types';

/**
 * M02-02 제보 카드 (광장 목록용).
 *
 * 설계 근거:
 *  - feature-spec §M02-02 (제보 목록 카드형)
 *  - design.md §7.3 #3 IssueCardList + TrackBadge
 *  - mockup/pages/public/issues.html
 */
export interface IssueCardProps {
  issue: IssueListItem;
}

const STAGE_LABEL: Record<string, string> = {
  reported: '제보',
  reviewing: '검토중',
  published: '공개등록',
  mentor_assigned: '멘토배정',
  in_progress: '처리중',
  resolved: '해결완료',
  rejected: '반려',
};

const STAGE_BADGE: Record<string, { bg: string; fg: string }> = {
  published: { bg: '#ede9fe', fg: '#6d28d9' },
  mentor_assigned: { bg: '#fce7f3', fg: '#9d174d' },
  in_progress: { bg: '#fef3c7', fg: '#92400e' },
  resolved: { bg: '#d1fae5', fg: '#047857' },
};

export function IssueCard({ issue }: IssueCardProps) {
  const regionMeta = REGIONS.find((r) => r.code === issue.region);
  const stageKey = issue.stage ?? 'published';
  const stageColor = STAGE_BADGE[stageKey] ?? {
    bg: '#f3f4f6',
    fg: '#374151',
  };

  return (
    <li
      data-testid="issue-card"
      data-stage={stageKey}
      data-region={issue.region}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {regionMeta ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: `${regionMeta.color}22`, color: regionMeta.color }}
            data-testid={`issue-card-region-${regionMeta.code}`}
          >
            {regionMeta.label}
          </span>
        ) : null}
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ background: stageColor.bg, color: stageColor.fg }}
          data-testid={`issue-card-stage-${stageKey}`}
        >
          {STAGE_LABEL[stageKey] ?? stageKey}
        </span>
        {issue.track ? <TrackBadge track={issue.track} size="sm" /> : null}
      </div>

      <Link
        href={`/issues/${issue.id}`}
        className="flex-1 text-base font-bold leading-snug text-text hover:text-primary"
        data-testid="issue-card-link"
      >
        {issue.title}
      </Link>

      {issue.body ? (
        <p className={cn('line-clamp-2 text-sm leading-relaxed text-text-secondary')}>
          {issue.body}
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <time dateTime={issue.created_at}>{formatDate(issue.created_at)}</time>
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          공감 {issue.vote_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          댓글 {issue.comment_count}
        </span>
      </div>
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const diff = Date.now() - d.getTime();
    const day = Math.floor(diff / 86400_000);
    if (day < 1) return '오늘';
    if (day < 7) return `${day}일 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}
