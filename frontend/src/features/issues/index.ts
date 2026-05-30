/**
 * USCP V2 Features / issues — Sprint 2 첫 V2 feature 모듈 (CR-4 흡수).
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §2.3 (features/ 디렉터리 구조)
 *
 * Sprint 2 진행:
 *  - Day 1-3 (M02-01~05): 본 모듈 (제보 작성·목록·상세·공감·댓글)
 *  - Day 4-7 (M02-06~11): 게이트키핑 워크플로우 (별도 features/gatekeeping/)
 *  - Day 8-13 (M02-12~21): 검색·관리자·트랙
 */
export {
  createComment,
  deleteComment,
  getIssue,
  listComments,
  listIssues,
  presignPhoto,
  submitIssue,
  unvoteIssue,
  uploadPhoto,
  voteIssue,
} from './api';

export { RegionSelect } from './components/RegionSelect';
export { PhotoUpload } from './components/PhotoUpload';
export { IssueCard } from './components/IssueCard';
export { VoteButton } from './components/VoteButton';
export { CommentSection } from './components/CommentSection';
export { useDebouncedValue } from './hooks/useDebouncedValue';

export {
  ALLOWED_PHOTO_MIMES,
  MAX_PHOTOS,
  MAX_PHOTO_SIZE_BYTES,
  REGIONS,
  type RegionCode,
  type PhotoMeta,
  type PhotoMime,
  type SubmitIssueRequest,
  type SubmitIssueResponse,
  type SubmitIssueError,
  type IssueListItem,
  type IssueListResponse,
  type IssueListFilters,
  type IssueDetail,
  type IssueStageHistoryEntry,
  type CommentItem,
  type IssueStage,
  type IssueTrack,
} from './types';
