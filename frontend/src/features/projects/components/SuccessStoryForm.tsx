'use client';

import { Award, Send } from 'lucide-react';
import { useState } from 'react';

import { TipTapEditor } from '@/components/admin/TipTapEditor';
import { useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';

import { createSuccessCase, updateSuccessCase } from '../api';

/**
 * M03-11/12 — 성공사례 스토리 작성 (운영자, completed 단계 전용).
 *
 * 설계 근거:
 *  - feature-spec §M03-11 (4단계 본문: 문제·과정·결과·정책반영, 편집기 작성)
 *  - feature-spec §M03-12 (정책 반영 기록: 정책명·시행일·반영 내용)
 *  - design.md §7.2.1 (Toast — window.alert 금지)
 *
 * 4단계 본문은 TipTap HTML 로 저장. 작성 직후 미게시 상태이며,
 * "게시" 토글로 is_published=true 처리해야 공개 노출.
 */
interface Props {
  projectId: string;
  /** 작성 완료 후 콜백 (목록 refetch 등). */
  onCreated?: () => void;
}

const EMPTY_HTML = '';

export function SuccessStoryForm({ projectId, onCreated }: Props) {
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [problemHtml, setProblemHtml] = useState(EMPTY_HTML);
  const [processHtml, setProcessHtml] = useState(EMPTY_HTML);
  const [resultHtml, setResultHtml] = useState(EMPTY_HTML);

  // ④ 정책반영 (M03-12)
  const [policyLinked, setPolicyLinked] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [policyHtml, setPolicyHtml] = useState(EMPTY_HTML);

  const [publishNow, setPublishNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 작성 후 에디터 초기화용 key (TipTap setContent 재마운트)
  const [formKey, setFormKey] = useState(0);

  function isBlankHtml(html: string): boolean {
    return html.replace(/<[^>]*>/g, '').trim().length === 0;
  }

  function reset() {
    setTitle('');
    setProblemHtml(EMPTY_HTML);
    setProcessHtml(EMPTY_HTML);
    setResultHtml(EMPTY_HTML);
    setPolicyLinked(false);
    setPolicyName('');
    setEffectiveDate('');
    setPolicyHtml(EMPTY_HTML);
    setPublishNow(false);
    setFormKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) {
      toast.error('제목을 입력해 주세요.');
      return;
    }
    if (isBlankHtml(problemHtml) || isBlankHtml(processHtml) || isBlankHtml(resultHtml)) {
      toast.error('①문제 · ②과정 · ③결과 단계를 모두 작성해 주세요.');
      return;
    }
    if (policyLinked && !policyName.trim() && isBlankHtml(policyHtml)) {
      toast.error('정책 반영으로 표시한 경우 정책명 또는 반영 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createSuccessCase({
        project_id: projectId,
        title: title.trim(),
        problem_summary: problemHtml,
        process_summary: processHtml,
        result_summary: resultHtml,
        policy_linked: policyLinked,
        policy_name: policyName.trim() || null,
        effective_date: effectiveDate || null,
        policy_detail: isBlankHtml(policyHtml) ? null : policyHtml,
      });

      if (publishNow) {
        await updateSuccessCase(created.id, { is_published: true });
        toast.success('성공사례를 작성하고 공개 게시했습니다.');
      } else {
        toast.success('성공사례를 저장했습니다. (미게시 — 목록에서 게시 처리 가능)');
      }
      reset();
      onCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'project_not_completed') {
          toast.error('해결 완료된 리빙랩에서만 성공사례를 작성할 수 있습니다.');
        } else {
          toast.error(detail?.message ?? err.message);
        }
      } else {
        toast.error(err instanceof Error ? err.message : '성공사례 작성 실패');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border bg-surface p-5"
      data-testid="success-story-form"
    >
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-text">성공사례 제목</span>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 골목 침수 문제, 시민 데이터로 해결한 6개월"
          className={inputClass}
          data-testid="success-title"
        />
      </label>

      <div key={formKey} className="space-y-5">
        <StageField
          step="①"
          label="어떤 문제였는가"
          color="text-rose-600"
          onChange={setProblemHtml}
        />
        <StageField
          step="②"
          label="어떻게 해결 과정을 진행했는가"
          color="text-amber-600"
          onChange={setProcessHtml}
        />
        <StageField
          step="③"
          label="어떤 결과를 얻었는가"
          color="text-secondary"
          onChange={setResultHtml}
        />

        {/* ④ 정책반영 (M03-12) */}
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-primary">
              ④ 어떤 정책에 반영되었는가 (정책반영 기록)
            </span>
          </div>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={policyLinked}
              onChange={(e) => setPolicyLinked(e.target.checked)}
              data-testid="success-policy-linked"
            />
            <span className="text-text">이 사례는 실제 정책에 반영되었습니다</span>
          </label>

          {policyLinked ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">정책 이름</span>
                  <input
                    type="text"
                    maxLength={200}
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    placeholder="예: 대전시 스마트 배수 관리 조례"
                    className={inputClass}
                    data-testid="success-policy-name"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">시행일</span>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className={inputClass}
                    data-testid="success-effective-date"
                  />
                </label>
              </div>
              <div className="text-sm">
                <span className="mb-1 block font-medium text-text">반영 내용</span>
                <TipTapEditor initialContent={null} onChange={(_d, html) => setPolicyHtml(html)} />
              </div>
              <p className="text-xs text-text-muted">
                ※ 글로컬대학 성과지표 보고에 활용될 수 있어 정확하게 작성해 주세요.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publishNow}
          onChange={(e) => setPublishNow(e.target.checked)}
          data-testid="success-publish-now"
        />
        <span className="text-text">작성 즉시 공개 게시</span>
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          data-testid="success-submit"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? '저장 중...' : '성공사례 저장'}
        </button>
      </div>
    </form>
  );
}

function StageField({
  step,
  label,
  color,
  onChange,
}: {
  step: string;
  label: string;
  color: string;
  onChange: (html: string) => void;
}) {
  return (
    <div className="text-sm">
      <span className={`mb-1 block font-semibold ${color}`}>
        {step} {label}
      </span>
      <TipTapEditor initialContent={null} onChange={(_d, html) => onChange(html)} />
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
