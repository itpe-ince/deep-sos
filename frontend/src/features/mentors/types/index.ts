/**
 * USCP V2 Features / mentors — 타입 정의 (M04 멘토·학생팀 매칭).
 *
 * 설계 근거: design.md §4.2 M04, feature-spec §M04-01~09
 */

// ── M04-01~03 멘토 ──────────────────────────────────────────
export interface Mentor {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  affiliation: string | null;
  expertise: string[];
  is_active: boolean;
  granted_at: string | null;
  revoked_at: string | null;
}

export interface MentorListResponse {
  data: Mentor[];
  meta: { total: number; limit: number; offset: number };
}

export interface GrantMentorRequest {
  user_id: string;
  affiliation?: string | null;
  expertise?: string[] | null;
}

// ── M04-04~05 학생팀 ────────────────────────────────────────
export interface StudentTeam {
  id: string;
  name: string;
  leader_id: string | null;
  leader_name: string | null;
  is_active: boolean;
  member_count: number;
  created_at: string | null;
  disbanded_at: string | null;
}

export interface TeamListResponse {
  data: StudentTeam[];
  meta: { total: number; limit: number; offset: number };
}

export interface CreateTeamRequest {
  name: string;
  leader_id: string;
  member_ids: string[];
}

export interface UpdateTeamRequest {
  name?: string;
  leader_id?: string;
  member_ids?: string[];
}

// ── M04-06~07 매칭 ──────────────────────────────────────────
export interface Matching {
  id: string;
  status: string;
  mentor_id: string | null;
  mentor_name: string | null;
  team_id: string | null;
  team_name: string | null;
  matched_at: string | null;
}

export interface MatchingListResponse {
  data: Matching[];
  meta: { total: number };
}

export interface MatchRequest {
  project_id: string;
  mentor_ids: string[];
  team_id?: string | null;
}

export interface MatchResponse {
  project_id: string;
  created: number;
  skipped: number;
  matching_ids: string[];
  message: string;
}

// ── M04-08~09 활동 기록·이력 ────────────────────────────────
export type ActivityType = 'meeting' | 'advice' | 'review';

export interface MatchingActivity {
  id: string;
  activity_date: string | null;
  activity_type: ActivityType | string;
  summary: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string | null;
}

export interface MatchingActivityListResponse {
  data: MatchingActivity[];
  meta: { total: number };
}

export interface CreateActivityRequest {
  activity_date: string;
  activity_type: ActivityType;
  summary: string;
}

export interface MatchingHistory {
  matchings: {
    id: string;
    project_id: string | null;
    project_title: string | null;
    status: string;
    matched_at: string | null;
  }[];
  activities: {
    id: string;
    project_id: string | null;
    project_title: string | null;
    activity_date: string | null;
    activity_type: string;
    summary: string;
  }[];
  meta: { matching_count: number; activity_count: number };
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  meeting: '회의',
  advice: '자문',
  review: '검토',
};
