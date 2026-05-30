'use client';

import { Link2, Link2Off, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';

import { linkIssueToProject, unlinkIssueFromProject } from '../api';
import type { LinkedIssue } from '../types';

/**
 * M03-14 — 의제↔리빙랩 양방향 연결 관리 (운영자, 프로젝트 측).
 *
 * 설계 근거:
 *  - feature-spec §M03-14 (운영자만 연결·해제, 중복 연결 시 경고)
 *  - design.md §7.2.1 (ConfirmModal — window.confirm 금지)
 *
 * 연결된 의제는 상세로 이동 가능(양방향 탐색). 의제 상세에서도 본 프로젝트로 역방향 이동.
 */
interface Props {
  projectId: string;
  linkedIssue: LinkedIssue | null | undefined;
  onChanged: () => void;
}

export function LinkedIssuePanel({ projectId, linkedIssue, onChanged }: Props) {
  const toast = useToast();
  const [issueId, setIssueId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);

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
        if (detail?.code === 'source_issue_already_linked') {
          toast.error('해당 의제는 이미 다른 프로젝트에 연결되어 있습니다.');
        } else if (detail?.code === 'issue_not_found') {
          toast.error('해당 ID의 제보를 찾을 수 없습니다.');
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
    try {
      await unlinkIssueFromProject(projectId);
      toast.success('의제 연결을 해제했습니다.');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '연결 해제 실패');
    } finally {
      setUnlinkOpen(false);
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
        이 리빙랩이 발전한 시민 제보를 연결합니다. 연결 시 제보 상세에서도 본
        프로젝트로 이동할 수 있습니다.
      </p>

      {linkedIssue ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-light/40 px-4 py-3">
          <Link
            href={`/issues/${linkedIssue.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            data-testid="linked-issue-link"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {linkedIssue.title}
          </Link>
          <button
            type="button"
            onClick={() => setUnlinkOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
            data-testid="unlink-issue"
          >
            <Link2Off className="h-4 w-4" aria-hidden="true" />
            연결 해제
          </button>
        </div>
      ) : (
        <form onSubmit={handleLink} className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-text">제보 ID</span>
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
      )}

      <ConfirmModal
        open={unlinkOpen}
        onClose={() => setUnlinkOpen(false)}
        onConfirm={confirmUnlink}
        title="의제 연결 해제"
        description="이 프로젝트와 제보의 연결을 해제하시겠습니까? 제보 측 역방향 링크도 함께 제거됩니다."
        confirmLabel="연결 해제"
        cancelLabel="취소"
        variant="danger"
      />
    </div>
  );
}
