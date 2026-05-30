/**
 * USCP V2 Features / projects — Sprint 3 첫 V2 feature 모듈 (M03).
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §2.3 features/ 디렉터리
 *
 * Sprint 3 진행 (예상 10-12일, M02 게이트키핑 패턴 복제로 단축):
 *  - Day 1-3 (M03-01~04): 본 모듈 (등록·목록·상세·연결)
 *  - Day 4-7 (M03-05~10): lifecycle_service (3단계 transition + history)
 *  - Day 8-13 (M03-11~18): 산출물·게시판·성공사례
 */
export {
  createProject,
  getProject,
  listProjectTimeline,
  listProjects,
  updateProject,
  deleteProject,
  transitionProject,
  createTimelineEntry,
  presignDeliverable,
  createDeliverable,
  updateDeliverable,
  uploadDeliverableFile,
  listAdminSuccessCases,
  createSuccessCase,
  updateSuccessCase,
  linkIssueToProject,
  unlinkIssueFromProject,
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  listPostComments,
  createPostComment,
  updatePostComment,
  deletePostComment,
  uploadPostAttachment,
  type ListProjectsFilters,
  type UpdateProjectRequest,
  type TransitionProjectRequest,
  type TransitionProjectResponse,
  type CreateTimelineRequest,
  type DeliverablePresignResponse,
  type CreateDeliverableRequest,
  type DeliverableMeta,
} from './api';

export { ProjectCard } from './components/ProjectCard';
export { ProjectStageStepper } from './components/ProjectStageStepper';
export { Timeline } from './components/Timeline';
export { ProjectTransitionDialog } from './components/ProjectTransitionDialog';
export { TimelineForm } from './components/TimelineForm';
export { DeliverableUpload } from './components/DeliverableUpload';
export { SuccessStoryForm } from './components/SuccessStoryForm';
export { SuccessStoryManager } from './components/SuccessStoryManager';
export { LinkedIssuePanel } from './components/LinkedIssuePanel';
export { ProjectBoard } from './components/ProjectBoard';

export {
  PROJECT_STAGES,
  type ProjectStage,
  type ProjectListItem,
  type ProjectListResponse,
  type ProjectDetail,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type CreateProjectError,
  type TimelineEntry,
  type TimelineListResponse,
  type AdminSuccessCaseItem,
  type CreateSuccessCaseRequest,
  type UpdateSuccessCaseRequest,
  type CreateSuccessCaseResponse,
  type LinkedIssue,
  type PostListItem,
  type PostListResponse,
  type PostDetail,
  type PostComment,
  type CreatePostRequest,
} from './types';
