/**
 * USCP V2 Features / network — 타입 정의 (M05 협력 네트워크).
 *
 * 설계 근거: design.md §4.2 M05, feature-spec §M05-01~09
 */

export type OrgCategory = 'public' | 'industry' | 'academic' | 'government';

export const ORG_CATEGORY_LABELS: Record<OrgCategory, string> = {
  government: '지자체',
  industry: '산업체',
  academic: '학교',
  public: '관련기관',
};

export interface Organization {
  id: string;
  name: string;
  category: OrgCategory | string;
  region: string | null;
  contact: string | null;
  intro: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface OrganizationListResponse {
  data: Organization[];
  meta: { total: number; limit: number; offset: number };
}

export interface CreateOrgRequest {
  name: string;
  category: OrgCategory;
  region?: string | null;
  contact?: string | null;
  intro?: string | null;
}

export interface Mou {
  id: string;
  title: string;
  organization_id: string | null;
  organization_name: string | null;
  signed_at: string | null;
  expires_at: string | null;
  status: 'active' | 'expired';
  has_attachment: boolean;
  body: string | null;
}

export interface MouListResponse {
  data: Mou[];
  meta: { total: number; limit: number; offset: number };
}

export interface CreateMouRequest {
  title: string;
  signed_at: string;
  expires_at: string;
  body?: string | null;
  attachment_key?: string | null;
}

export interface ExpiringMou {
  id: string;
  title: string;
  organization_name: string | null;
  expires_at: string | null;
  days_left: number | null;
  notified: boolean;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  linked_project_id: string | null;
  project_title: string | null;
  linked_organization_id: string | null;
  organization_name: string | null;
  created_at: string | null;
}

export interface CommunityPostItem {
  id: string;
  title: string;
  is_pinned: boolean;
  view_count: number;
  author_name: string | null;
  comment_count: number;
  created_at: string | null;
}

export interface CommunityComment {
  id: string;
  body: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string | null;
}

export interface CommunityPostDetail {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  author_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  comments: CommunityComment[];
}

export interface CommunityListResponse {
  data: CommunityPostItem[];
  meta: { total: number; limit: number; offset: number };
}
