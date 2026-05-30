/**
 * USCP V2 Features / gatekeeping — M02-06~11 게이트키핑 워크플로우.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §4.2 M02 admin endpoints
 */
export {
  getAdminIssue,
  getStageStats,
  listGatekeepingQueue,
  patchIssueTrack,
  rejectIssue,
  resolveByComment,
  transitionIssue,
  type AdminIssuesListFilters,
  type AdminStage,
  type AdminTrack,
  type StageStats,
  type TransitionRequest,
  type TransitionResponse,
} from './api';

export { TransitionDialog } from './components/TransitionDialog';
export { RejectDialog } from './components/RejectDialog';
export { ResolveByCommentDialog } from './components/ResolveByCommentDialog';
