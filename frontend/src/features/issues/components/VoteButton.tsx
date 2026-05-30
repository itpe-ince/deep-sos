'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/use-auth';

import { unvoteIssue, voteIssue } from '../api';

/**
 * M02-04 공감 투표 버튼.
 *
 * 설계 근거:
 *  - feature-spec §M02-04 (공감 투표 1인 1회)
 *  - design.md §7.2.1 (Toast 사용)
 *
 * 동작:
 *  - 비로그인 시 클릭 → /login?next=/issues/{id} redirect
 *  - 로그인 시 Optimistic Update (실패하면 롤백 + Toast)
 *  - 이미 공감한 제보를 다시 누르면 자동 취소 (V2 feature-spec)
 */
export interface VoteButtonProps {
  issueId: string;
  initialVoted: boolean;
  initialCount: number;
  /** 비로그인 시 redirect 할 경로 (기본: 현재 페이지) */
  nextPath?: string;
}

export function VoteButton({
  issueId,
  initialVoted,
  initialCount,
  nextPath,
}: VoteButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();

  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    if (busy || authLoading) return;
    if (!user) {
      const next = nextPath ?? `/issues/${issueId}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const prevVoted = voted;
    const prevCount = count;
    // Optimistic update
    const nextVoted = !prevVoted;
    const nextCount = prevCount + (nextVoted ? 1 : -1);
    setVoted(nextVoted);
    setCount(Math.max(0, nextCount));

    setBusy(true);
    try {
      const res = nextVoted
        ? await voteIssue(issueId)
        : await unvoteIssue(issueId);
      // 서버 응답으로 최종 동기화
      setVoted(res.voted);
      setCount(res.vote_count);
    } catch (err) {
      // 롤백
      setVoted(prevVoted);
      setCount(prevCount);
      if (err instanceof ApiError && err.status === 401) {
        const next = nextPath ?? `/issues/${issueId}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      toast.error(err instanceof Error ? err.message : '공감 처리 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy || authLoading}
      aria-pressed={voted}
      aria-label={voted ? '공감 취소' : '공감하기'}
      data-testid="vote-button"
      data-voted={voted}
      data-count={count}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
        voted
          ? 'border-danger bg-danger/10 text-danger'
          : 'border-border bg-surface text-text hover:border-danger hover:text-danger',
        busy && 'opacity-60',
      )}
    >
      <Heart
        className={cn('h-4 w-4', voted ? 'fill-current' : 'fill-none')}
        aria-hidden="true"
      />
      공감 {count}
    </button>
  );
}
