/**
 * USCP V2 Features / mentors — barrel export (M04 멘토·학생팀 매칭).
 */
export {
  listMentors,
  grantMentor,
  revokeMentor,
  listTeams,
  createTeam,
  updateTeam,
  disbandTeam,
  listProjectMatchings,
  createMatching,
  releaseMatching,
  listMatchingActivities,
  createMatchingActivity,
  updateMatchingActivity,
  deleteMatchingActivity,
  getMyMatchingHistory,
  getMentorMatchingHistory,
  type ListMentorsFilters,
} from './api';

export {
  ACTIVITY_TYPE_LABELS,
  type Mentor,
  type MentorListResponse,
  type GrantMentorRequest,
  type StudentTeam,
  type TeamListResponse,
  type CreateTeamRequest,
  type UpdateTeamRequest,
  type Matching,
  type MatchingListResponse,
  type MatchRequest,
  type MatchResponse,
  type ActivityType,
  type MatchingActivity,
  type MatchingActivityListResponse,
  type CreateActivityRequest,
  type MatchingHistory,
} from './types';
