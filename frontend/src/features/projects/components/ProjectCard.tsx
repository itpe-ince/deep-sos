'use client';

import { Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

import { REGIONS } from '@/features/issues';

import { PROJECT_STAGES, type ProjectListItem } from '../types';

export interface ProjectCardProps {
  project: ProjectListItem;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const region = REGIONS.find((r) => r.code === project.region);
  const stage = PROJECT_STAGES.find((s) => s.code === project.stage);

  return (
    <li
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition hover:shadow-md"
      data-testid="project-card"
      data-stage={project.stage}
      data-region={project.region}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {region ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: `${region.color}22`, color: region.color }}
          >
            {region.label}
          </span>
        ) : null}
        {stage ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: stage.bg, color: stage.fg }}
            data-testid={`project-stage-${stage.code}`}
          >
            {stage.label}
          </span>
        ) : null}
      </div>

      <Link
        href={`/projects/${project.id}`}
        className="flex-1 text-base font-bold leading-snug text-text hover:text-primary"
      >
        {project.title}
      </Link>

      {project.summary ? (
        <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {project.summary}
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-xs text-text-muted">
        {project.start_at || project.end_at ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {project.start_at ?? '미정'} ~ {project.end_at ?? '미정'}
          </span>
        ) : null}
        {project.region ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {region?.label ?? project.region}
          </span>
        ) : null}
      </div>
    </li>
  );
}
