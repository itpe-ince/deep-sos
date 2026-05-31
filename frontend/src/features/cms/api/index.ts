/**
 * USCP V2 Features / cms — API 클라이언트 (M07 콘텐츠 관리).
 *
 * 설계 근거: design.md §4.2 M07
 */
import { api } from '@/lib/api';

import type {
  AdminContentItem,
  Banner,
  CreateBannerRequest,
  CreateContentRequest,
  CurrentTerms,
  ReconsentRequiredResponse,
  ReconsentSubmitResponse,
  TermsVersion,
} from '../types';

// ── M07-01~04 공지·이벤트 (운영자) ──────────────────────────
export async function listAdminContents(
  category?: string,
): Promise<{ data: AdminContentItem[]; meta: { limit: number; offset: number } }> {
  const qs = category ? `?category=${category}` : '';
  return api.get(`/admin/cms/contents${qs}`);
}

export async function createContent(
  body: CreateContentRequest,
): Promise<{ content_id: string; category: string; message: string }> {
  return api.post('/admin/cms/contents', body);
}

export async function updateContent(
  contentId: string,
  body: Partial<CreateContentRequest>,
): Promise<{ content_id: string; updated: boolean; message: string }> {
  return api.patch(`/admin/cms/contents/${contentId}`, body);
}

export async function deleteContent(
  contentId: string,
): Promise<{ content_id: string; deleted: boolean; message: string }> {
  return api.delete(`/admin/cms/contents/${contentId}`);
}

// ── M07-05 자료실 업로드 (운영자) ───────────────────────────
export async function presignResource(
  filename: string,
  contentType?: string,
): Promise<{ upload_url: string; minio_key: string; expires_in_seconds: number }> {
  return api.post('/admin/cms/resources/presign', {
    filename,
    content_type: contentType ?? null,
  });
}

export async function createResource(body: {
  title: string;
  category: string;
  minio_key: string;
  tags?: string[] | null;
  file_size?: number | null;
  content_type?: string | null;
}): Promise<{ attachment_id: string; title: string; category: string; message: string }> {
  return api.post('/admin/cms/resources', body);
}

// ── M07-07~09 배너 ──────────────────────────────────────────
export async function listAdminBanners(): Promise<{ data: Banner[]; meta: { total: number } }> {
  return api.get('/admin/cms/banners');
}

export async function listPublicBanners(): Promise<{ data: Banner[]; meta: { total: number } }> {
  return api.get('/banners');
}

export async function createBanner(
  body: CreateBannerRequest,
): Promise<{ banner_id: string; message: string }> {
  return api.post('/admin/cms/banners', body);
}

export async function updateBanner(
  bannerId: string,
  body: Partial<CreateBannerRequest> & { is_active?: boolean },
): Promise<{ banner_id: string; updated: boolean; message: string }> {
  return api.patch(`/admin/cms/banners/${bannerId}`, body);
}

// ── M07-10~12 약관 (운영자) ─────────────────────────────────
export async function listTermsVersions(
  kind?: string,
): Promise<{ data: TermsVersion[]; meta: { total: number } }> {
  const qs = kind ? `?kind=${kind}` : '';
  return api.get(`/admin/cms/terms/versions${qs}`);
}

export async function publishTerms(body: {
  kind: string;
  body: string;
  effective_at?: string | null;
  require_reconsent?: boolean;
}): Promise<{ terms_id: string; kind: string; version: string; message: string }> {
  return api.post('/admin/cms/terms', body);
}

export async function getCurrentTerms(kind: string): Promise<CurrentTerms> {
  return api.get<CurrentTerms>(`/terms/${kind}/current`);
}

// ── M07-14 재동의 (로그인 시민) ─────────────────────────────
export async function checkReconsentRequired(): Promise<ReconsentRequiredResponse> {
  return api.get<ReconsentRequiredResponse>('/auth/reconsent/required');
}

export async function submitReconsent(
  termsIds: string[],
  accept: boolean,
): Promise<ReconsentSubmitResponse> {
  return api.post<ReconsentSubmitResponse>('/auth/reconsent', {
    terms_ids: termsIds,
    accept,
  });
}
