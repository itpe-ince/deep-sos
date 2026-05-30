'use client';

import { ArrowLeft, MapPin, Sprout } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { StageStepper, TrackBadge } from '@/components/domain';
import {
  CommentSection,
  REGIONS,
  VoteButton,
  getIssue,
  type IssueDetail,
  type IssueStageHistoryEntry,
} from '@/features/issues';

/**
 * M02-03/04/05: USCP V2 제보 상세 (sitemap #4).
 *
 * 설계 근거:
 *  - feature-spec §M02-03 (제보 상세 + 단계 진행 + 공감수 + 댓글)
 *  - design.md §7.3 #4 (IssueDetail + StageStepper + TrackBadge + VoteButton + CommentSection)
 *  - design.md §10.3.3 6항
 */
export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const detail = await getIssue(id);
        if (!cancelled) setIssue(detail);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '제보 상세 조회 실패');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container-content py-12" data-testid="issue-detail-loading">
        <p className="text-sm text-text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="container-content py-12" data-testid="issue-detail-error">
        <p className="text-sm text-danger">
          {error ?? '제보를 찾을 수 없습니다.'}
        </p>
        <Link
          href="/issues"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          광장으로
        </Link>
      </div>
    );
  }

  const regionMeta = REGIONS.find((r) => r.code === issue.region);
  const stage = (issue.stage ?? 'reported') as IssueStageHistoryEntry['stage'];

  return (
    <div className="container-content py-12" data-testid="issue-detail-page">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/issues"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          광장으로
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
                data-testid={`issue-detail-region-${regionMeta.code}`}
              >
                {regionMeta.label}
              </span>
            ) : null}
            {issue.track ? (
              <TrackBadge track={issue.track} size="sm" />
            ) : null}
          </div>
          <h1
            className="text-2xl font-black leading-snug text-text"
            data-testid="issue-detail-title"
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

        {issue.photos.length > 0 ? (
          <div
            className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3"
            data-testid="issue-detail-photos"
          >
            {issue.photos.map((p) => (
              <div
                key={p.minio_key}
                className="aspect-[4/3] overflow-hidden rounded-md border border-border bg-bg"
              >
                <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                  {p.title}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <article
          className="prose prose-sm mb-8 max-w-none rounded-xl border border-border bg-surface p-6"
          data-testid="issue-detail-body"
        >
          <p className="whitespace-pre-wrap leading-relaxed text-text">
            {issue.body}
          </p>
        </article>

        {/* M03-14 양방향 연결 — 이 제보가 발전한 리빙랩 프로젝트 */}
        {issue.linked_project ? (
          <Link
            href={`/projects/${issue.linked_project.id}`}
            className="mb-8 flex items-center gap-2 rounded-xl border border-secondary/40 bg-secondary-light/40 px-4 py-3 text-sm transition hover:border-secondary"
            data-testid="issue-linked-project"
          >
            <Sprout className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="text-text-secondary">이 제보는 리빙랩으로 발전했습니다 →</span>
            <span className="font-semibold text-secondary">
              {issue.linked_project.title}
            </span>
          </Link>
        ) : null}

        {issue.location ? (
          <div className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            위치: {issue.location.lat.toFixed(4)}, {issue.location.lng.toFixed(4)}
          </div>
        ) : null}

        <div className="mb-6">
          <VoteButton
            issueId={issue.id}
            initialVoted={issue.voted}
            initialCount={issue.vote_count}
          />
        </div>

        <StageStepper
          current={stage}
          history={issue.history.map((h) => ({
            stage: h.stage,
            at: h.at,
            actor: h.actor ?? undefined,
            comment: h.comment ?? undefined,
          }))}
        />

        <CommentSection
          issueId={issue.id}
          initialCount={issue.comment_count}
        />
      </div>
    </div>
  );
}
