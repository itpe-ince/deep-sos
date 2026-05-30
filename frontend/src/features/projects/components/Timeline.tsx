'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { listProjectTimeline } from '../api';
import type { TimelineEntry } from '../types';

/**
 * M03-03 활동 타임라인 조회 (공개).
 *
 * 설계 근거:
 *  - feature-spec §M03-03 (날짜순 아카이빙)
 *  - design.md §7.3 #6 (Timeline 컴포넌트)
 *
 * 최근 항목이 상단. 비어있으면 EmptyState.
 */
export interface TimelineProps {
  projectId: string;
}

export function Timeline({ projectId }: TimelineProps) {
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listProjectTimeline(projectId);
        if (!cancelled) setItems(res.data);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <section
      aria-labelledby="timeline-heading"
      data-testid="project-timeline"
      className="mt-8"
    >
      <h2 id="timeline-heading" className="mb-4 text-lg font-bold text-text">
        활동 타임라인 {items.length > 0 ? `(${items.length})` : ''}
      </h2>

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p
          className="rounded-md border border-dashed border-border bg-bg p-6 text-center text-sm text-text-muted"
          data-testid="project-timeline-empty"
        >
          아직 등록된 활동이 없습니다.
        </p>
      ) : (
        <ol className="relative ml-2 flex flex-col gap-4 border-l-2 border-border pl-6" data-testid="project-timeline-list">
          {items.map((entry) => (
            <li
              key={entry.id}
              className="relative"
              data-testid="project-timeline-item"
            >
              <span
                className={cn(
                  'absolute -left-[31px] top-1 inline-block h-3 w-3 rounded-full border-2 border-white bg-primary',
                )}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <time dateTime={entry.entry_date} className="font-bold text-primary">
                  {entry.entry_date}
                </time>
                <span>· {entry.created_by.name}</span>
              </div>
              <div className="mt-1 text-base font-bold text-text">
                {entry.title}
              </div>
              {entry.description ? (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {entry.description}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
