'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * USCP V2 6단계 의제 워크플로우 시각화 컴포넌트.
 *
 * 설계 근거:
 *  - docs/02-design/features/uscp-v2.design.md §3.2 issue_stage ENUM (6값)
 *  - mockup/pages/public/issue-detail.html .lifecycle-timeline (수직 timeline)
 *  - design.md §7.3 #4 제보 상세 화면의 핵심 컴포넌트
 *
 * 6단계: reported → reviewing → published → mentor_assigned → in_progress → resolved
 *  + 분기: rejected (반려)
 *
 * 상태 표현:
 *  - done   : 완료한 단계 → 녹색 dot + Check 아이콘
 *  - current: 현재 단계   → amber dot + glow (box-shadow ring)
 *  - future : 미진입 단계 → 회색 dot
 *  - rejected: 분기 단계  → red dot + 반려 사유 표시
 */
export type IssueStage =
  | 'reported'
  | 'reviewing'
  | 'published'
  | 'mentor_assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export interface StageHistoryEntry {
  stage: IssueStage;
  /** ISO 8601 datetime */
  at?: string;
  /** 단계 전환 작업자 (운영자/시민/시스템) */
  actor?: string;
  /** 운영자 검토 의견 또는 반려 사유 */
  comment?: ReactNode;
  /** track 라벨 (검토중 진입 시 부여) */
  track?: ReactNode;
}

export interface StageStepperProps {
  /** 현재 단계 */
  current: IssueStage;
  /** 단계 이력 (선택) — 각 단계별 timestamp/actor/comment 표시용 */
  history?: StageHistoryEntry[];
  /** 헤더 텍스트 */
  title?: ReactNode;
  /** 추가 className */
  className?: string;
}

const STAGE_ORDER: IssueStage[] = [
  'reported',
  'reviewing',
  'published',
  'mentor_assigned',
  'in_progress',
  'resolved',
];

const STAGE_LABEL: Record<IssueStage, string> = {
  reported: '제보',
  reviewing: '검토중',
  published: '공개등록',
  mentor_assigned: '멘토배정',
  in_progress: '처리중',
  resolved: '해결완료',
  rejected: '반려',
};

type StageState = 'done' | 'current' | 'future' | 'rejected';

function stateFor(stage: IssueStage, current: IssueStage): StageState {
  if (current === 'rejected') return 'future'; // 반려는 별도 분기로 표시
  const idxStage = STAGE_ORDER.indexOf(stage);
  const idxCurrent = STAGE_ORDER.indexOf(current);
  if (idxStage < idxCurrent) return 'done';
  if (idxStage === idxCurrent) return 'current';
  return 'future';
}

function formatDateTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export function StageStepper({
  current,
  history = [],
  title = '6단계 의제 진행 상황',
  className,
}: StageStepperProps) {
  const historyByStage = new Map<IssueStage, StageHistoryEntry>();
  for (const entry of history) historyByStage.set(entry.stage, entry);

  const rejected = current === 'rejected' ? historyByStage.get('rejected') : undefined;

  return (
    <section
      aria-label={typeof title === 'string' ? title : '의제 진행 단계'}
      className={cn(
        'flex flex-col gap-3 rounded-lg bg-bg p-5',
        className,
      )}
      data-testid="stage-stepper"
    >
      <div className="mb-1 text-sm font-bold text-text">{title}</div>

      <ol className="flex flex-col gap-3" role="list">
        {STAGE_ORDER.map((stage, idx) => {
          const state = stateFor(stage, current);
          const entry = historyByStage.get(stage);
          const number = idx + 1;
          return (
            <li
              key={stage}
              className="flex items-start gap-3"
              data-state={state}
              data-stage={stage}
              data-testid={`stage-item-${stage}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                  state === 'done' && 'bg-stage-resolved',
                  state === 'current' &&
                    'bg-stage-in-progress ring-4 ring-stage-in-progress/20',
                  state === 'future' && 'bg-text-disabled',
                )}
                aria-hidden="true"
              >
                {state === 'done' ? <Check size={14} aria-hidden="true" /> : number}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-text">
                  <span>
                    {number}. {STAGE_LABEL[stage]}
                  </span>
                  {entry?.track ? (
                    <span className="text-xs font-medium">{entry.track}</span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-text-secondary">
                  {entry ? (
                    <>
                      {formatDateTime(entry.at)}
                      {entry.actor ? ` · ${entry.actor}` : ''}
                      {entry.comment ? (
                        <span className="ml-1">(의견: "{entry.comment}")</span>
                      ) : null}
                    </>
                  ) : state === 'current' ? (
                    '현재 단계 진행 중'
                  ) : state === 'future' ? (
                    '예정'
                  ) : (
                    '완료'
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {rejected ? (
        <div
          className="mt-2 rounded-lg border border-danger/30 bg-danger/5 p-4"
          data-testid="stage-item-rejected"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-danger">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-xs text-white">
              !
            </span>
            반려됨
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            {formatDateTime(rejected.at)}
            {rejected.actor ? ` · ${rejected.actor}` : ''}
          </div>
          {rejected.comment ? (
            <div className="mt-2 text-sm text-text">사유: {rejected.comment}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
