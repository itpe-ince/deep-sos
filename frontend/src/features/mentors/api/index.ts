/**
 * USCP V2 Features / mentors — API 클라이언트 (M04).
 *
 * 설계 근거: design.md §4.2 M04
 */
import { api } from '@/lib/api';

import type {
  CreateActivityRequest,
  CreateTeamRequest,
  GrantMentorRequest,
  MatchingActivityListResponse,
  MatchingHistory,
  MatchingListResponse,
  MatchRequest,
  MatchResponse,
  MentorListResponse,
  TeamListResponse,
  UpdateTeamRequest,
} from '../types';

// ── M04-01~03 멘토 ──────────────────────────────────────────

export interface ListMentorsFilters {
  q?: string;
  affiliation?: string;
  expertise?: string;
  include_inactive?: boolean;
  limit?: number;
  offset?: number;
}

export async function listMentors(
  filters: ListMentorsFilters = {},
): Promise<MentorListResponse> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.affiliation) params.set('affiliation', filters.affiliation);
  if (filters.expertise) params.set('expertise', filters.expertise);
  if (filters.include_inactive) params.set('include_inactive', 'true');
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return api.get<MentorListResponse>(`/admin/mentors${qs ? `?${qs}` : ''}`);
}

export async function grantMentor(
  body: GrantMentorRequest,
): Promise<{ mentor_id: string; message: string; already_active: boolean }> {
  return api.post('/admin/mentors/grant', body);
}

export async function revokeMentor(
  mentorId: string,
): Promise<{ mentor_id: string; active_matchings_warning: boolean; message: string }> {
  return api.post(`/admin/mentors/${mentorId}/revoke`);
}

// ── M04-04~05 학생팀 ────────────────────────────────────────

export async function listTeams(
  includeInactive = false,
): Promise<TeamListResponse> {
  const qs = includeInactive ? '?include_inactive=true' : '';
  return api.get<TeamListResponse>(`/admin/teams${qs}`);
}

export async function createTeam(
  body: CreateTeamRequest,
): Promise<{ team_id: string; name: string; member_count: number; message: string }> {
  return api.post('/admin/teams', body);
}

export async function updateTeam(
  teamId: string,
  body: UpdateTeamRequest,
): Promise<{ team_id: string; updated: boolean; message: string }> {
  return api.patch(`/admin/teams/${teamId}`, body);
}

export async function disbandTeam(
  teamId: string,
): Promise<{ team_id: string; active_matchings_warning: boolean; message: string }> {
  return api.delete(`/admin/teams/${teamId}`);
}

// ── M04-06~07 매칭 ──────────────────────────────────────────

export async function listProjectMatchings(
  projectId: string,
): Promise<MatchingListResponse> {
  return api.get<MatchingListResponse>(`/admin/matchings/project/${projectId}`);
}

export async function createMatching(body: MatchRequest): Promise<MatchResponse> {
  return api.post<MatchResponse>('/admin/matchings', body);
}

export async function releaseMatching(
  matchingId: string,
): Promise<{ matching_id: string; message: string }> {
  return api.delete(`/admin/matchings/${matchingId}`);
}

// ── M04-08~09 활동 기록·이력 ────────────────────────────────

export async function listMatchingActivities(
  projectId: string,
): Promise<MatchingActivityListResponse> {
  return api.get<MatchingActivityListResponse>(
    `/projects/${projectId}/matching-activities`,
  );
}

export async function createMatchingActivity(
  projectId: string,
  body: CreateActivityRequest,
): Promise<{ id: string; project_id: string; message: string }> {
  return api.post(`/projects/${projectId}/matching-activities`, body);
}

export async function updateMatchingActivity(
  projectId: string,
  activityId: string,
  body: Partial<CreateActivityRequest>,
): Promise<{ id: string; updated: boolean; message: string }> {
  return api.patch(
    `/projects/${projectId}/matching-activities/${activityId}`,
    body,
  );
}

export async function deleteMatchingActivity(
  projectId: string,
  activityId: string,
): Promise<{ id: string; deleted: boolean; message: string }> {
  return api.delete(`/projects/${projectId}/matching-activities/${activityId}`);
}

export async function getMyMatchingHistory(): Promise<MatchingHistory> {
  return api.get<MatchingHistory>('/me/matching-history');
}

export async function getMentorMatchingHistory(
  mentorUserId: string,
): Promise<MatchingHistory> {
  return api.get<MatchingHistory>(`/admin/mentors/${mentorUserId}/matching-history`);
}
