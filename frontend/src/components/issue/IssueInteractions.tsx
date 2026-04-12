'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, ThumbsUp, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

interface VoteState {
  voted: boolean;
  vote_count: number;
}

interface Comment {
  id: string;
  issue_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; size: number; totalPages: number };
}

interface Props {
  issueId: string;
  initialVoteCount: number;
  initialCommentCount: number;
}

export function IssueInteractions({
  issueId,
  initialVoteCount,
  initialCommentCount,
}: Props) {
  const { user, loading: authLoading } = useAuth();

  const [vote, setVote] = useState<VoteState>({
    voted: false,
    vote_count: initialVoteCount,
  });
  const [voteBusy, setVoteBusy] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTotal, setCommentTotal] = useState(initialCommentCount);
  const [commentLoading, setCommentLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초기 로드: 내 투표 상태 + 댓글 목록
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.get<ListResponse<Comment>>(
          `/issues/${issueId}/comments?page=1&size=50`,
        );
        if (!cancelled) {
          setComments(list.data);
          setCommentTotal(list.meta.total);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setCommentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueId]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    api
      .get<VoteState>(`/issues/${issueId}/vote`)
      .then((v) => {
        if (!cancelled) setVote(v);
      })
      .catch(() => {
        /* not voted yet */
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, issueId]);

  const handleVoteToggle = useCallback(async () => {
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }
    setError(null);
    setVoteBusy(true);
    try {
      const next = vote.voted
        ? await api.delete<VoteState>(`/issues/${issueId}/vote`)
        : await api.post<VoteState>(`/issues/${issueId}/vote`);
      setVote(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : '투표 처리 실패');
    } finally {
      setVoteBusy(false);
    }
  }, [user, vote.voted, issueId]);

  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }
      if (!newComment.trim()) return;
      setError(null);
      setSubmitting(true);
      try {
        const created = await api.post<Comment>(
          `/issues/${issueId}/comments`,
          { content: newComment.trim() },
        );
        setComments((prev) => [...prev, created]);
        setCommentTotal((n) => n + 1);
        setNewComment('');
      } catch (err) {
        if (err instanceof ApiError) {
          const detail = (err.detail as { detail?: string } | undefined)?.detail;
          setError(detail ?? err.message);
        } else {
          setError(err instanceof Error ? err.message : '댓글 작성 실패');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [user, newComment, issueId],
  );

  const handleCommentDelete = useCallback(
    async (commentId: string) => {
      if (!confirm('댓글을 삭제하시겠어요?')) return;
      try {
        await api.delete(`/issues/${issueId}/comments/${commentId}`);
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, is_deleted: true, content: '[삭제된 댓글입니다]' }
              : c,
          ),
        );
        setCommentTotal((n) => Math.max(0, n - 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : '댓글 삭제 실패');
      }
    },
    [issueId],
  );

  return (
    <section className="mt-8 space-y-6">
      {/* 공감 버튼 */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-white p-6">
        <div>
          <p className="text-xs text-text-muted">이 문제에 공감하시나요?</p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            현재 {vote.vote_count}명이 공감했어요
          </p>
        </div>
        <button
          type="button"
          onClick={handleVoteToggle}
          disabled={voteBusy || authLoading}
          className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
            vote.voted
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'border border-border text-text-secondary hover:border-primary hover:text-primary'
          } disabled:opacity-60`}
        >
          <ThumbsUp className="h-4 w-4" />
          {vote.voted ? '공감 취소' : '공감하기'}
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">
            {vote.vote_count}
          </span>
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 댓글 영역 */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">
            댓글 {commentTotal}개
          </h3>
        </div>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="mb-6 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="의견을 남겨주세요..."
              maxLength={2000}
              className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="flex items-center gap-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              <Send className="h-3 w-3" />
              등록
            </button>
          </form>
        ) : (
          <div className="mb-6 rounded-md bg-bg-muted p-4 text-center text-sm text-text-secondary">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              로그인
            </Link>
            {' '}후 댓글을 작성할 수 있어요.
          </div>
        )}

        {commentLoading ? (
          <p className="py-6 text-center text-sm text-text-muted">불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            첫 댓글을 남겨보세요.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className={`rounded-lg border border-border p-4 ${
                  c.is_deleted ? 'bg-bg-muted' : 'bg-white'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {new Date(c.created_at).toLocaleString('ko-KR')}
                  </span>
                  {user && user.id === c.author_id && !c.is_deleted && (
                    <button
                      type="button"
                      onClick={() => handleCommentDelete(c.id)}
                      className="text-text-muted hover:text-danger"
                      title="삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p
                  className={`text-sm ${
                    c.is_deleted ? 'italic text-text-muted' : 'text-text-primary'
                  }`}
                >
                  {c.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
