'use client';

import { ArrowLeft, Calendar, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { REGIONS } from '@/features/issues';
import {
  PROJECT_STAGES,
  ProjectBoard,
  ProjectStageStepper,
  Timeline,
  getProject,
  type ProjectDetail,
  type ProjectStage,
} from '@/features/projects';

/**
 * M03-02/03: USCP V2 리빙랩 상세 (sitemap #6).
 *
 * 설계 근거:
 *  - feature-spec §M03-02 (개요·참여자·진행 단계)
 *  - feature-spec §M03-03 (활동 타임라인 조회)
 *  - design.md §7.3 #6 (ProjectHeader + Timeline + ProjectBoardTab[멤버 전용])
 *  - design.md §10.3.3 6항
 *
 * V2 구성:
 *   1. Header — region/stage 뱃지 + 제목 + 기간
 *   2. ProjectStageStepper — 3단계 (recruiting/in_progress/completed)
 *   3. Summary + Description
 *   4. Source Issue 링크 (M03-14)
 *   5. Timeline (M03-03)
 */
export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getProject(id);
        if (!cancelled) setProject(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '프로젝트 조회 실패');
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
      <div className="container-content py-12" data-testid="project-detail-loading">
        <p className="text-sm text-text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container-content py-12" data-testid="project-detail-error">
        <p className="text-sm text-danger">{error ?? '프로젝트를 찾을 수 없습니다.'}</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          리빙랩 목록으로
        </Link>
      </div>
    );
  }

  const region = REGIONS.find((r) => r.code === project.region);
  const stage = PROJECT_STAGES.find((s) => s.code === project.stage);
  const stageCode = (project.stage ?? 'recruiting') as ProjectStage;

  return (
    <div className="container-content py-12" data-testid="project-detail-page">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          리빙랩 목록
        </Link>

        <header className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {region ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: `${region.color}22`, color: region.color }}
                data-testid={`project-detail-region-${region.code}`}
              >
                {region.label}
              </span>
            ) : null}
            {stage ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: stage.bg, color: stage.fg }}
                data-testid={`project-detail-stage-${stage.code}`}
              >
                {stage.label}
              </span>
            ) : null}
          </div>
          <h1
            className="text-2xl font-black leading-snug text-text"
            data-testid="project-detail-title"
          >
            {project.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            {project.start_at || project.end_at ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {project.start_at ?? '미정'} ~ {project.end_at ?? '미정'}
              </span>
            ) : null}
            {project.linked_issue || project.source_issue_id ? (
              <Link
                href={`/issues/${project.linked_issue?.id ?? project.source_issue_id}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
                data-testid="project-detail-source-issue"
              >
                <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {project.linked_issue
                  ? `연결된 의제: ${project.linked_issue.title}`
                  : '연결된 의제 보기'}
              </Link>
            ) : null}
          </div>
        </header>

        <ProjectStageStepper current={stageCode} />

        {project.summary ? (
          <article
            className="prose prose-sm mt-8 max-w-none rounded-xl border border-border bg-surface p-6"
            data-testid="project-detail-summary"
          >
            <p className="whitespace-pre-wrap leading-relaxed text-text">
              {project.summary}
            </p>
          </article>
        ) : null}

        {project.description &&
        project.description !== project.summary ? (
          <article
            className="prose prose-sm mt-4 max-w-none rounded-xl border border-border bg-surface p-6"
            data-testid="project-detail-description"
          >
            <p className="whitespace-pre-wrap leading-relaxed text-text">
              {project.description}
            </p>
          </article>
        ) : null}

        {/* M03-03 활동 타임라인 */}
        <Timeline projectId={project.id} />

        {/* M03-15~18 멤버 전용 게시판 — 비멤버에게는 렌더되지 않음 */}
        <div className="mt-10">
          <ProjectBoard projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
