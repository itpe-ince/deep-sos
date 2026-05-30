/**
 * USCP V2 도메인 컴포넌트 barrel export.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §7.2.2, §7.3
 *
 * UI atomic 컴포넌트(components/ui/*)와 분리하여, USCP 비즈니스 도메인
 * (의제 6단계·3종 트랙·약관 재동의·프로젝트 게시판 등) 전용 컴포넌트를 관리.
 */
export {
  StageStepper,
  type IssueStage,
  type StageHistoryEntry,
  type StageStepperProps,
} from './StageStepper';

export {
  TrackBadge,
  ISSUE_TRACKS,
  type IssueTrack,
  type TrackBadgeProps,
} from './TrackBadge';
