/**
 * Server-side API helper for SSR/RSC fetches.
 * 브라우저는 /api/v1 prefix로 프록시되지만, SSR은 내부 URL로 직접 호출한다.
 */
const SERVER_API_URL =
  process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:8000/api/v1';

interface PageMeta {
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

type ListResponse<T> = { data: T[]; meta: PageMeta };

export async function serverFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${SERVER_API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    throw new Error(`Server fetch failed: ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface CmsPageContent {
  id: string;
  slug: string;
  title: string;
  content_json: Record<string, unknown>;
  content_html: string | null;
  status: string;
  updated_at: string;
}

/**
 * CMS 페이지를 안전하게 조회 — 실패 시 null 반환 (페이지는 기본 콘텐츠로 렌더).
 */
export async function fetchCmsPage(slug: string): Promise<CmsPageContent | null> {
  try {
    return await serverFetch<CmsPageContent>(`/cms/pages/${slug}`);
  } catch {
    return null;
  }
}

export type { ListResponse };

export interface IssueItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  campus_id: string | null;
  location_address: string | null;
  image_urls: string[] | null;
  vote_count: number;
  view_count: number;
  comment_count: number;
  created_at: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  phase: string;
  status: string;
  campus_id: string | null;
  leader_id: string | null;
  target_sdgs: number[] | null;
  start_date: string | null;
  end_date: string | null;
  member_count: number;
  partner_count: number;
  progress: number;
  outcome_summary: string | null;
  cover_image_url: string | null;
}

export interface VolunteerItem {
  id: string;
  title: string;
  description: string;
  activity_type: string | null;
  campus_id: string | null;
  location: string | null;
  start_datetime: string;
  end_datetime: string;
  max_participants: number | null;
  current_participants: number;
  volunteer_hours: number;
  status: string;
}

export interface SuccessCaseItem {
  id: string;
  title: string;
  problem_summary: string;
  process_summary: string;
  result_summary: string;
  impact_summary: string | null;
  sdg_goals: number[] | null;
  campus_id: string | null;
  policy_linked: boolean;
  global_transfer_candidate: boolean;
  view_count: number;
  cover_image_url: string | null;
  created_at: string;
}
