'use client';

import { ArrowLeft, ArrowRight, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import { REGIONS } from '@/features/issues';
import {
  DeliverableUpload,
  PROJECT_STAGES,
  LinkedIssuePanel,
  ProjectBoard,
  ProjectStageStepper,
  ProjectTransitionDialog,
  SuccessStoryManager,
  Timeline,
  TimelineForm,
  deleteProject,
  getProject,
  updateProject,
  type ProjectDetail,
  type ProjectStage,
} from '@/features/projects';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M03-07/08/09/10/13 — 관리자 리빙랩 상세·수정·삭제·전환.
 *
 * 설계 근거:
 *  - feature-spec §M03-07/13 (수정·삭제·단계 전환)
 *  - feature-spec §M03-08 (타임라인 작성)
 *  - feature-spec §M03-09/10 (산출물 업로드·메타데이터)
 *  - design.md §7.2.1 (Modal/ConfirmModal/Toast)
 */
const NEXT_STAGE: Record<ProjectStage, ProjectStage | null> = {
  recruiting: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

export default function AdminProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const toast = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<ProjectStage | null>(
    null,
  );

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [timelineKey, setTimelineKey] = useState(0); // 새 항목 추가 시 Timeline 강제 refetch

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProject(id);
      setProject(data);
      setEditTitle(data.title);
      setEditSummary(data.summary ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProject();
  }, [fetchProject]);

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!project || editSubmitting) return;
    setEditSubmitting(true);
    try {
      await updateProject(project.id, {
        title: editTitle.trim(),
        summary: editSummary.trim() || null,
      });
      toast.success('프로젝트를 수정했습니다.');
      setEditing(false);
      await fetchProject();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { message?: string } })?.detail;
        toast.error(detail?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : '수정 실패');
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!project) return;
    try {
      await deleteProject(project.id);
      toast.success('프로젝트를 삭제했습니다.');
      router.replace('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'completed_protected') {
          toast.error('완료된 프로젝트는 삭제할 수 없습니다.');
          return;
        }
        toast.error(detail?.message ?? err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="container-content py-12" data-testid="admin-project-loading">
        <p className="text-sm text-text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container-content py-12" data-testid="admin-project-error">
        <p className="text-sm text-danger">{error ?? '프로젝트 미존재'}</p>
      </div>
    );
  }

  const stage = (project.stage ?? 'recruiting') as ProjectStage;
  const stageMeta = PROJECT_STAGES.find((s) => s.code === stage);
  const region = REGIONS.find((r) => r.code === project.region);
  const nextStage = NEXT_STAGE[stage];
  const canDelete = stage !== 'completed';

  return (
    <div className="container-content py-10" data-testid="admin-project-detail">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          관리자 대시보드
        </Link>

        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              {region ? (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: `${region.color}22`, color: region.color }}
                >
                  {region.label}
                </span>
              ) : null}
              {stageMeta ? (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: stageMeta.bg, color: stageMeta.fg }}
                >
                  {stageMeta.label}
                </span>
              ) : null}
            </div>
            <h1
              className="text-2xl font-black leading-snug text-text"
              data-testid="admin-project-title"
            >
              {project.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:border-primary"
              data-testid="project-edit-toggle"
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
              {editing ? '수정 닫기' : '수정'}
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-danger px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
                data-testid="project-delete-open"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                삭제
              </button>
            ) : null}
          </div>
        </header>

        {editing ? (
          <form
            onSubmit={handleEditSave}
            className="mb-6 space-y-3 rounded-xl border border-border bg-surface p-5"
            data-testid="project-edit-form"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text">제목</span>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={inputClass}
                data-testid="project-edit-title"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text">한 줄 요약</span>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                maxLength={500}
                className={cn(inputClass, 'resize-y')}
                data-testid="project-edit-summary"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={editSubmitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                data-testid="project-edit-submit"
              >
                {editSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : null}

        <ProjectStageStepper current={stage} />

        {/* M03-14 의제 양방향 연결 */}
        <div className="mt-6">
          <LinkedIssuePanel
            projectId={project.id}
            linkedIssue={project.linked_issue}
            onChanged={fetchProject}
          />
        </div>

        {nextStage ? (
          <div className="my-6 rounded-xl border border-border bg-surface p-4">
            <button
              type="button"
              onClick={() => {
                setTransitionTarget(nextStage);
                setTransitionOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
              data-testid={`project-transition-to-${nextStage}`}
            >
              {PROJECT_STAGES.find((s) => s.code === nextStage)?.label} 으로 전환
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="mt-2 text-xs text-text-muted">
              단방향 전환이며, 전환 시 감사 로그가 자동 기록됩니다.
            </p>
          </div>
        ) : null}

        {project.summary ? (
          <article
            className="prose prose-sm mt-6 max-w-none rounded-xl border border-border bg-surface p-5"
            data-testid="admin-project-summary"
          >
            <p className="whitespace-pre-wrap leading-relaxed text-text">
              {project.summary}
            </p>
          </article>
        ) : null}

        {/* M03-08 타임라인 — 작성 폼 + 목록 */}
        <section
          className="mt-8"
          aria-labelledby="admin-timeline-section"
          data-testid="admin-timeline-section"
        >
          <h2 id="admin-timeline-section" className="mb-3 text-lg font-bold text-text">
            활동 기록
          </h2>
          <TimelineForm
            projectId={project.id}
            onCreated={() => setTimelineKey((k) => k + 1)}
          />
          {/* key 변경으로 Timeline 강제 refetch */}
          <Timeline key={timelineKey} projectId={project.id} />
        </section>

        {/* M03-09 산출물 업로드 */}
        <section
          className="mt-8"
          aria-labelledby="admin-deliverables-section"
          data-testid="admin-deliverables-section"
        >
          <h2
            id="admin-deliverables-section"
            className="mb-3 text-lg font-bold text-text"
          >
            산출물 업로드
          </h2>
          <DeliverableUpload projectId={project.id} />
        </section>

        {/* M03-15~18 멤버 전용 게시판 (비멤버에게는 컴포넌트가 렌더되지 않음) */}
        <section className="mt-8" data-testid="admin-board-section">
          <ProjectBoard projectId={project.id} />
        </section>

        {/* M03-11/12 성공사례·정책반영 — 완료 단계 프로젝트만 */}
        {stage === 'completed' ? (
          <section
            className="mt-8"
            aria-labelledby="admin-success-section"
            data-testid="admin-success-section"
          >
            <h2
              id="admin-success-section"
              className="mb-1 text-lg font-bold text-text"
            >
              성공사례 작성
            </h2>
            <p className="mb-3 text-sm text-text-muted">
              해결 완료된 리빙랩의 전 과정을 4단계 스토리로 작성하고, 정책 반영
              내용을 기록합니다. 저장 후 게시해야 외부에 공개됩니다.
            </p>
            <SuccessStoryManager projectId={project.id} />
          </section>
        ) : (
          <section className="mt-8 rounded-xl border border-dashed border-border bg-bg-muted/40 p-5">
            <h2 className="mb-1 text-lg font-bold text-text">성공사례 작성</h2>
            <p className="text-sm text-text-muted">
              성공사례는 프로젝트가 <strong>완료</strong> 단계에 도달한 뒤 작성할 수
              있습니다.
            </p>
          </section>
        )}
      </div>

      {transitionTarget ? (
        <ProjectTransitionDialog
          open={transitionOpen}
          onClose={() => setTransitionOpen(false)}
          projectId={project.id}
          currentStage={stage}
          toStage={transitionTarget}
          onSuccess={fetchProject}
        />
      ) : null}

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="프로젝트 삭제"
        description="이 프로젝트를 삭제하시겠습니까? 완료 단계가 아닌 프로젝트만 삭제할 수 있으며, 관련 산출물·게시판은 보존됩니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
      />
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
