'use client';

import { Link2, Link2Off, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';

import { linkIssueToProject, unlinkIssueFromProject } from '../api';
import type { LinkedIssue } from '../types';

/**
 * M03-14 — 의제↔리빙랩 N:M 연결 관리 (운영자, 프로젝트 측).
 *
 * 설계 근거:
 *  - feature-spec §M03-14 (운영자만 연결·해제, 제보 1개 또는 여러 개 — N:M)
 *  - design.md §3.3 project_issues join table / §7.2.1 (ConfirmModal — window.confirm 금지)
 *
 * 한 프로젝트에 여러 의제를 연결할 수 있고, 동일 의제가 다른 프로젝트에도 연결될 수 있다.
 * 연결된 각 의제는 상세로 이동 가능(양방향 탐색) · 개별 해제 가능.
 */
interface Props {
  projectId: string;
  linkedIssues: LinkedIssue[];
  onChanged: () => void;
}

export function LinkedIssuePanel({ projectId, linkedIssues, onChanged }: Props) {
  const toast = useToast();
  const [issueId, setIssueId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedIssue | null>(null);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !issueId.trim()) return;
    setSubmitting(true);
    try {
      await linkIssueToProject(projectId, issueId.trim());
      toast.success('의제를 연결했습니다.');
      setIssueId('');
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'issue_not_found') {
          toast.error('해당 ID의 제보를 찾을 수 없습니다.');
        } else if (detail?.code === 'project_not_found') {
          toast.error('프로젝트를 찾을 수 없습니다.');
        } else {
          toast.error(detail?.message ?? err.message);
        }
      } else {
        toast.error(err instanceof Error ? err.message : '의제 연결 실패');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmUnlink() {
    if (!unlinkTarget) return;
    try {
      await unlinkIssueFromProject(projectId, unlinkTarget.id);
      toast.success('의제 연결을 해제했습니다.');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '연결 해제 실패');
    } finally {
      setUnlinkTarget(null);
    }
  }

  return (
    <div
      className="rounded-xl border border-border bg-surface p-5"
      data-testid="linked-issue-panel"
    >
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-bold text-text">
        <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
        연결된 의제 (제보)
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        이 리빙랩이 발전한 시민 제보를 연결합니다. 여러 제보를 함께 연결할 수 있으며,
        연결 시 제보 상세에서도 본 프로젝트로 이동할 수 있습니다.
      </p>

      {linkedIssues.length > 0 ? (
        <ul className="mb-4 space-y-2" data-testid="linked-issue-list">
          {linkedIssues.map((issue) => (
            <li
              key={issue.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-light/40 px-4 py-3"
              data-testid="linked-issue-item"
            >
              <Link
                href={`/issues/${issue.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                data-testid="linked-issue-link"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {issue.title}
              </Link>
              <button
                type="button"
                onClick={() => setUnlinkTarget(issue)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-700 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                data-testid="unlink-issue"
              >
                <Link2Off className="h-4 w-4" aria-hidden="true" />
                연결 해제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-text-muted" data-testid="linked-issue-empty">
          아직 연결된 의제가 없습니다.
        </p>
      )}

      <form onSubmit={handleLink} className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-text">제보 ID 추가</span>
          <input
            type="text"
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            placeholder="연결할 제보(의제)의 UUID"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            data-testid="link-issue-input"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !issueId.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          data-testid="link-issue-submit"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          연결
        </button>
      </form>

      <ConfirmModal
        open={unlinkTarget !== null}
        title="의제 연결 해제"
        description={
          unlinkTarget
            ? `「${unlinkTarget.title}」 의제와의 연결을 해제하시겠습니까? 제보 상세에서도 본 프로젝트 연결이 사라집니다.`
            : ''
        }
        confirmLabel="연결 해제"
        cancelLabel="취소"
        onConfirm={confirmUnlink}
        onClose={() => setUnlinkTarget(null)}
        variant="danger"
      />
    </div>
  );
}
