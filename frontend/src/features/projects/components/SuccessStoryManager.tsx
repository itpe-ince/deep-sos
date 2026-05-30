'use client';

import { Eye, EyeOff, FileCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';

import { listAdminSuccessCases, updateSuccessCase } from '../api';
import type { AdminSuccessCaseItem } from '../types';
import { SuccessStoryForm } from './SuccessStoryForm';

/**
 * M03-11/12 — 운영자 성공사례 관리 (작성 + 게시 토글).
 *
 * 설계 근거: feature-spec §M03-11 (작성 후 별도 게시 절차).
 * completed 단계 프로젝트에서만 본 컴포넌트가 노출됨 (호출측 가드).
 */
export function SuccessStoryManager({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [cases, setCases] = useState<AdminSuccessCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminSuccessCases(projectId);
      setCases(res.data);
    } catch {
      // 조용히 무시 — 신규 프로젝트는 사례 없음
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchCases();
  }, [fetchCases]);

  async function togglePublish(item: AdminSuccessCaseItem) {
    setTogglingId(item.id);
    try {
      await updateSuccessCase(item.id, { is_published: !item.is_published });
      toast.success(item.is_published ? '게시를 내렸습니다.' : '공개 게시했습니다.');
      await fetchCases();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { message?: string } })?.detail;
        toast.error(detail?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : '게시 상태 변경 실패');
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-5" data-testid="success-story-manager">
      {!loading && cases.length > 0 ? (
        <ul className="space-y-2" data-testid="success-case-list">
          {cases.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-1.5">
                  {c.is_published ? (
                    <span className="rounded-full bg-secondary-light px-2 py-0.5 text-xs font-semibold text-secondary">
                      공개됨
                    </span>
                  ) : (
                    <span className="rounded-full bg-bg-muted px-2 py-0.5 text-xs font-semibold text-text-muted">
                      미게시
                    </span>
                  )}
                  {c.policy_linked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      <FileCheck className="h-3 w-3" />
                      {c.policy_name ? c.policy_name : '정책 연계'}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm font-semibold text-text">{c.title}</p>
              </div>
              <button
                type="button"
                onClick={() => togglePublish(c)}
                disabled={togglingId === c.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-primary disabled:opacity-60"
                data-testid={`success-toggle-${c.id}`}
              >
                {c.is_published ? (
                  <>
                    <EyeOff className="h-4 w-4" /> 게시 내리기
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" /> 게시하기
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <SuccessStoryForm projectId={projectId} onCreated={fetchCases} />
    </div>
  );
}
