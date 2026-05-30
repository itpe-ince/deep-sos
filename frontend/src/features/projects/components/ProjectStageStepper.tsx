'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

import { PROJECT_STAGES, type ProjectStage } from '../types';

/**
 * M03 리빙랩 3단계 라이프사이클 시각화 (recruiting → in_progress → completed).
 *
 * 설계 근거:
 *  - feature-spec §M03-13 (3단계 — 모집중·진행중·완료)
 *  - design.md §3.2 project_stage ENUM
 *  - M02 StageStepper (6단계) 와 별개로 3단계 전용 컴포넌트
 */
export interface ProjectStageStepperProps {
  current: ProjectStage;
  className?: string;
}

const STAGE_ORDER: ProjectStage[] = ['recruiting', 'in_progress', 'completed'];

type State = 'done' | 'current' | 'future';

function stateFor(stage: ProjectStage, current: ProjectStage): State {
  const idxStage = STAGE_ORDER.indexOf(stage);
  const idxCurrent = STAGE_ORDER.indexOf(current);
  if (idxStage < idxCurrent) return 'done';
  if (idxStage === idxCurrent) return 'current';
  return 'future';
}

export function ProjectStageStepper({
  current,
  className,
}: ProjectStageStepperProps) {
  return (
    <section
      aria-label="리빙랩 3단계 진행 상황"
      className={cn(
        'flex flex-col gap-3 rounded-lg bg-bg p-5',
        className,
      )}
      data-testid="project-stage-stepper"
    >
      <div className="mb-1 text-sm font-bold text-text">
        리빙랩 3단계 진행 상황
      </div>
      <ol className="flex items-center justify-between gap-2" role="list">
        {STAGE_ORDER.map((stage, idx) => {
          const meta = PROJECT_STAGES.find((s) => s.code === stage)!;
          const s = stateFor(stage, current);
          return (
            <li
              key={stage}
              className="flex flex-1 items-center gap-2"
              data-state={s}
              data-stage={stage}
              data-testid={`project-stage-item-${stage}`}
              aria-current={s === 'current' ? 'step' : undefined}
            >
              <div className="flex flex-1 flex-col items-center">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white',
                    s === 'done' && 'bg-stage-resolved',
                    s === 'current' &&
                      'bg-stage-in-progress ring-4 ring-stage-in-progress/20',
                    s === 'future' && 'bg-text-disabled',
                  )}
                  aria-hidden="true"
                >
                  {s === 'done' ? <Check size={16} aria-hidden="true" /> : idx + 1}
                </div>
                <div className="mt-2 text-center text-sm font-semibold text-text">
                  {meta.label}
                </div>
              </div>
              {idx < STAGE_ORDER.length - 1 ? (
                <div
                  className={cn(
                    'h-0.5 flex-1',
                    s === 'done' ? 'bg-stage-resolved' : 'bg-text-disabled',
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
