'use client';

import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui';
import { REGIONS, RegionSelect, type RegionCode } from '@/features/issues';
import {
  createProject,
  type CreateProjectError,
} from '@/features/projects';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/use-auth';

/**
 * M03-06: 운영자 리빙랩 프로젝트 등록.
 *
 * 설계 근거:
 *  - feature-spec §M03-06 (리빙랩 등록 — 운영자)
 *  - design.md §4.2 M03 admin
 *  - design.md §7.2.1 (alert 금지 — Toast)
 *  - sprint 2 M02-01 submit_issue 패턴 복제
 *
 * 권한: 운영자 (비로그인/비운영자 → redirect 또는 Toast)
 */
const MAX_TITLE = 200;
const MAX_SUMMARY = 500;

export default function AdminProjectNewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [region, setRegion] = useState<RegionCode | null>(null);
  const [sourceIssueId, setSourceIssueId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 비로그인 → /login redirect (운영자 권한은 서버에서 403 으로 검증)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/admin/projects/new');
    }
  }, [authLoading, user, router]);

  const titleOk = title.trim().length >= 1 && title.trim().length <= MAX_TITLE;
  const summaryOk = summary.trim().length <= MAX_SUMMARY;
  const dateOk = useMemo(() => {
    if (!startAt || !endAt) return true;
    return new Date(endAt) >= new Date(startAt);
  }, [startAt, endAt]);

  const formOk = titleOk && summaryOk && dateOk && region !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOk || submitting || !region) return;
    setSubmitting(true);
    try {
      const result = await createProject({
        title: title.trim(),
        summary: summary.trim() || null,
        region,
        source_issue_id: sourceIssueId.trim() || null,
        start_at: startAt || null,
        end_at: endAt || null,
      });
      toast.success(result.message, 5000);
      router.replace(`/projects/${result.project_id}`);
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleError(err: unknown) {
    if (err instanceof ApiError) {
      const detail = (err.detail as { detail?: CreateProjectError })?.detail;
      const code = detail?.code;
      switch (code) {
        case 'operator_required':
          toast.error('운영자만 프로젝트를 등록할 수 있습니다.');
          return;
        case 'invalid_region':
          toast.error('지역을 선택해 주세요.');
          return;
        case 'invalid_title_length':
          toast.error('제목은 1~200자로 입력해 주세요.');
          return;
        case 'invalid_summary_length':
          toast.error('한 줄 요약은 500자 이내로 입력해 주세요.');
          return;
        case 'invalid_date_range':
          toast.error('종료 예정일은 시작 예정일 이후여야 합니다.');
          return;
        case 'source_issue_already_linked':
          toast.warning('해당 의제는 이미 다른 프로젝트에 연결되어 있습니다.');
          return;
      }
      toast.error(detail?.message ?? err.message);
      return;
    }
    toast.error(err instanceof Error ? err.message : '프로젝트 등록 실패');
  }

  if (authLoading || !user) {
    return (
      <div className="container-content py-12" data-testid="admin-project-new-loading">
        <p className="text-sm text-text-muted">확인 중...</p>
      </div>
    );
  }

  return (
    <div className="container-content py-10" data-testid="admin-project-new-page">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          관리자 대시보드
        </Link>

        <h1 className="mb-2 text-2xl font-black text-text">리빙랩 프로젝트 등록</h1>
        <p className="mb-8 text-sm text-text-secondary">
          5개 지역 중 한 곳을 선택하고 새 리빙랩 프로젝트를 등록합니다. 등록
          즉시 「모집중」 단계로 시작됩니다.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm"
          data-testid="admin-project-new-form"
          noValidate
        >
          <RegionSelect
            value={region}
            onChange={setRegion}
            label="지역"
          />

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text">
              제목
              <span className="ml-1 text-danger" aria-hidden="true">
                *
              </span>
            </span>
            <input
              type="text"
              required
              minLength={1}
              maxLength={MAX_TITLE}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 반석동 보행자 안전 리빙랩"
              className={inputClass}
              data-testid="project-title"
              aria-invalid={!!title && !titleOk}
            />
            <span className="mt-1 block text-xs text-text-muted">
              {title.length} / {MAX_TITLE}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text">
              한 줄 요약 (선택)
            </span>
            <textarea
              maxLength={MAX_SUMMARY}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="프로젝트의 핵심 목표를 한 문단으로 요약해 주세요."
              className={cn(inputClass, 'resize-y')}
              data-testid="project-summary"
              aria-invalid={!summaryOk}
            />
            <span className="mt-1 block text-xs text-text-muted">
              {summary.length} / {MAX_SUMMARY}
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text">
                시작 예정일 (선택)
              </span>
              <input
                type="date"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className={inputClass}
                data-testid="project-start-at"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text">
                종료 예정일 (선택)
              </span>
              <input
                type="date"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className={cn(inputClass, !dateOk && 'border-danger')}
                data-testid="project-end-at"
                aria-invalid={!dateOk}
              />
              {!dateOk ? (
                <span className="mt-1 block text-xs text-danger">
                  종료 예정일은 시작 예정일 이후여야 합니다.
                </span>
              ) : null}
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text">
              연결할 의제 ID (선택)
            </span>
            <input
              type="text"
              value={sourceIssueId}
              onChange={(e) => setSourceIssueId(e.target.value)}
              placeholder="예: 22222222-2222-2222-2222-222222222222"
              className={inputClass}
              data-testid="project-source-issue"
            />
            <span className="mt-1 block text-xs text-text-muted">
              비워두면 의제 없이 등록됩니다. (M03-14 의제↔리빙랩 연결)
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg"
              data-testid="project-cancel"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!formOk || submitting}
              className={cn(
                'inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover',
                'disabled:cursor-not-allowed disabled:bg-text-muted',
              )}
              data-testid="project-submit"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {submitting ? '등록 중...' : '프로젝트 등록'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-xs text-text-muted">
          5개 지역:{' '}
          {REGIONS.map((r) => r.label).join(' · ')}
        </p>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
