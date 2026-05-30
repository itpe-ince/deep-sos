'use client';

import { cn } from '@/lib/utils';

/**
 * USCP V2 의제 트랙 라벨 (3종) Badge.
 *
 * 설계 근거:
 *  - docs/02-design/features/uscp-v2.design.md §3.2 issue_track ENUM
 *  - mockup/pages/public/issues.html — 색상·아이콘 매핑
 *  - M02-19 (운영자가 검토중 진입 시 부여, 광장 필터 가능)
 *
 * 라벨 매핑 (Plan §M02-19):
 *  - policy_reflection  : 🏛️ 정책반영
 *  - policy_reference   : 📋 정책참고
 *  - citizen_autonomy   : 🌱 시민자율
 */
export type IssueTrack =
  | 'policy_reflection'
  | 'policy_reference'
  | 'citizen_autonomy';

export interface TrackBadgeProps {
  track: IssueTrack;
  /** 아이콘 표시 여부 (기본 true) */
  showIcon?: boolean;
  /** 사이즈 — sm: 12px 패딩 · md: 14px 패딩 */
  size?: 'sm' | 'md';
  className?: string;
}

const TRACK_META: Record<
  IssueTrack,
  { label: string; icon: string; bg: string; fg: string; border: string }
> = {
  policy_reflection: {
    label: '정책반영',
    icon: '🏛️',
    bg: 'bg-track-policy-reflection-bg',
    fg: 'text-track-policy-reflection-fg',
    border: 'border-track-policy-reflection-border',
  },
  policy_reference: {
    label: '정책참고',
    icon: '📋',
    bg: 'bg-track-policy-reference-bg',
    fg: 'text-track-policy-reference-fg',
    border: 'border-track-policy-reference-border',
  },
  citizen_autonomy: {
    label: '시민자율',
    icon: '🌱',
    bg: 'bg-track-citizen-autonomy-bg',
    fg: 'text-track-citizen-autonomy-fg',
    border: 'border-track-citizen-autonomy-border',
  },
};

export function TrackBadge({
  track,
  showIcon = true,
  size = 'sm',
  className,
}: TrackBadgeProps) {
  const meta = TRACK_META[track];

  return (
    <span
      role="status"
      aria-label={`트랙: ${meta.label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        meta.bg,
        meta.fg,
        meta.border,
        className,
      )}
      data-testid={`track-badge-${track}`}
      data-track={track}
    >
      {showIcon ? <span aria-hidden="true">{meta.icon}</span> : null}
      <span>{meta.label}</span>
    </span>
  );
}

/**
 * 모든 트랙 라벨 (필터 UI 등에서 활용).
 * design.md §7.3 #3 광장 카드 IssueFilterBar 의 TrackFilter 에 사용.
 */
export const ISSUE_TRACKS: ReadonlyArray<{ value: IssueTrack; label: string; icon: string }> =
  Object.entries(TRACK_META).map(([value, meta]) => ({
    value: value as IssueTrack,
    label: meta.label,
    icon: meta.icon,
  }));
