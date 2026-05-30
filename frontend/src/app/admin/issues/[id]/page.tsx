'use client';

import { AlertOctagon, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { StageStepper, TrackBadge, type IssueStage } from '@/components/domain';
import {
  REGIONS,
  type IssueDetail,
} from '@/features/issues';
import {
  RejectDialog,
  ResolveByCommentDialog,
  TransitionDialog,
  getAdminIssue,
  type AdminStage,
} from '@/features/gatekeeping';
import { cn } from '@/lib/utils';

/**
 * M02-08: 게이트키핑 검토 화면 (sitemap #16).
 *
 * 설계 근거:
 *  - feature-spec §M02-08 (제보 검토 화면 + 의견 입력)
 *  - feature-spec §M02-09~13 (단계 전환 UI)
 *  - feature-spec §M02-14 (반려 UI)
 *  - design.md §7.3 #16 (IssueReviewPanel + TransitionDialog + RejectDialog)
 */
const STAGE_LABEL: Record<string, string> = {
  reported: '제보',
  reviewing: '검토중',
  published: '공개등록',
  mentor_assigned: '멘토배정',
  in_progress: '처리중',
  resolved: '해결완료',
  rejected: '반려',
};

const NEXT_STAGE: Record<string, AdminStage[]> = {
  reported: ['reviewing'],
  reviewing: ['published'],
  published: ['mentor_assigned'],
  mentor_assigned: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
  rejected: [],
};

export default function AdminIssueDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<AdminStage | null>(
    null,
  );
  const [rejectOpen, setRejectOpen] = useState(false);
  const [resolveByCommentOpen, setResolveByCommentOpen] = useState(false);

  const fetchIssue = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminIssue(id);
      setIssue(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '제보 상세 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchIssue();
  }, [fetchIssue]);

  if (loading) {
    return (
      <div className="container-content py-12" data-testid="admin-issue-loading">
        <p className="text-sm text-text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="container-content py-12" data-testid="admin-issue-error">
        <p className="text-sm text-danger">
          {error ?? '제보를 찾을 수 없습니다.'}
        </p>
      </div>
    );
  }

  const stage = (issue.stage ?? 'reported') as IssueStage;
  const nextStages = NEXT_STAGE[stage] ?? [];
  const canReject = stage !== 'resolved' && stage !== 'rejected';
  const canResolveByComment = stage !== 'resolved' && stage !== 'rejected';
  const regionMeta = REGIONS.find((r) => r.code === issue.region);

  return (
    <div className="container-content py-10" data-testid="admin-issue-detail">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/issues"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          게이트키핑 큐
        </Link>

        <header className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {regionMeta ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: `${regionMeta.color}22`,
                  color: regionMeta.color,
                }}
              >
                {regionMeta.label}
              </span>
            ) : null}
            <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-semibold text-text">
              {STAGE_LABEL[stage]}
            </span>
            {issue.track ? <TrackBadge track={issue.track} size="sm" /> : null}
          </div>
          <h1
            className="text-2xl font-black leading-snug text-text"
            data-testid="admin-issue-title"
          >
            {issue.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <span>{issue.reporter?.name ?? '익명'} 제보</span>
            <time dateTime={issue.created_at}>
              {new Date(issue.created_at).toLocaleString('ko-KR')}
            </time>
            <span>공감 {issue.vote_count}</span>
            <span>댓글 {issue.comment_count}</span>
          </div>
        </header>

        {/* 본문 */}
        <article
          className="prose prose-sm mb-8 max-w-none rounded-xl border border-border bg-surface p-6"
          data-testid="admin-issue-body"
        >
          <p className="whitespace-pre-wrap leading-relaxed text-text">
            {issue.body}
          </p>
        </article>

        {/* 사진 갤러리 (간소화) */}
        {issue.photos.length > 0 ? (
          <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {issue.photos.map((p) => (
              <div
                key={p.minio_key}
                className="aspect-[4/3] overflow-hidden rounded-md border border-border bg-bg"
                data-testid="admin-issue-photo"
              >
                <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                  {p.title}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* 액션 패널 (M02-09~14) */}
        <section
          className="mb-8 rounded-xl border border-border bg-surface p-6"
          aria-labelledby="action-heading"
          data-testid="admin-action-panel"
        >
          <h2 id="action-heading" className="mb-3 text-lg font-bold text-text">
            게이트키핑 액션
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {nextStages.length > 0 ? (
              nextStages.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setTransitionTarget(s);
                    setTransitionOpen(true);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover',
                  )}
                  data-testid={`transition-to-${s}`}
                >
                  {STAGE_LABEL[s]} 으로 전환
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ))
            ) : (
              <p className="text-sm text-text-muted">
                현재 단계({STAGE_LABEL[stage]})는 추가 전환이 불가합니다.
              </p>
            )}

            {canReject ? (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
                data-testid="reject-open"
              >
                <AlertOctagon className="h-4 w-4" aria-hidden="true" />
                반려
              </button>
            ) : null}

            {canResolveByComment ? (
              <button
                type="button"
                onClick={() => setResolveByCommentOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-success px-4 py-2 text-sm font-semibold text-success hover:bg-success/10"
                data-testid="resolve-by-comment-open"
              >
                💬 댓글로 해결 종결
              </button>
            ) : null}
          </div>
        </section>

        {/* StageStepper */}
        <StageStepper
          current={stage}
          history={issue.history.map((h) => ({
            stage: h.stage as IssueStage,
            at: h.at,
            actor: h.actor ?? undefined,
            comment: h.comment ?? undefined,
          }))}
        />

        {/* Modals */}
        {transitionTarget ? (
          <TransitionDialog
            open={transitionOpen}
            onClose={() => setTransitionOpen(false)}
            issueId={issue.id}
            currentStage={stage as AdminStage}
            toStage={transitionTarget}
            onSuccess={fetchIssue}
          />
        ) : null}
        <RejectDialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          issueId={issue.id}
          onSuccess={fetchIssue}
        />
        <ResolveByCommentDialog
          open={resolveByCommentOpen}
          onClose={() => setResolveByCommentOpen(false)}
          issueId={issue.id}
          onSuccess={fetchIssue}
        />
      </div>
    </div>
  );
}
