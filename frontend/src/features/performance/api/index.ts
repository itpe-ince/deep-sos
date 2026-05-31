/**
 * USCP V2 Features / performance — API 클라이언트 (M06 성과자료).
 *
 * 설계 근거: design.md §4.2 M06
 */
import { api } from '@/lib/api';

import type {
  ContentDetail,
  ContentListResponse,
  DashboardResponse,
  DownloadResponse,
  KpiListResponse,
  ResourceListResponse,
} from '../types';

// ── M06-02/05 성과지표 (공개) ───────────────────────────────
export async function listKpis(): Promise<KpiListResponse> {
  return api.get<KpiListResponse>('/performance');
}

export async function getDashboard(): Promise<DashboardResponse> {
  return api.get<DashboardResponse>('/performance/dashboard');
}

// ── M06-01/03/06 KPI 운영자 ─────────────────────────────────
export async function createKpi(body: {
  name: string;
  formula?: string | null;
  unit?: string | null;
  target_value?: number | null;
  auto_count_source?: string | null;
}): Promise<{ kpi_id: string; name: string; message: string }> {
  return api.post('/admin/kpi/indicators', body);
}

export async function upsertRecord(body: {
  kpi_id: string;
  period: string;
  value: number;
}): Promise<{ kpi_id: string; period: string; value: number; message: string }> {
  return api.post('/admin/kpi/records', body);
}

/** M06-06 CSV 다운로드 URL (운영자) — 직접 링크/window.open 용. */
export function kpiExportCsvUrl(start?: string, end?: string): string {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const qs = params.toString();
  return `/api/v1/admin/kpi/export.csv${qs ? `?${qs}` : ''}`;
}

// ── M06-07 공지·이벤트 (공개) ───────────────────────────────
export async function listContents(
  category?: string,
  limit = 20,
  offset = 0,
): Promise<ContentListResponse> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return api.get<ContentListResponse>(`/contents?${params.toString()}`);
}

export async function getContent(contentId: string): Promise<ContentDetail> {
  return api.get<ContentDetail>(`/contents/${contentId}`);
}

// ── M06-08 자료실 (공개 조회·다운로드, 운영자 삭제) ─────────
export async function listResources(
  category?: string,
  limit = 50,
  offset = 0,
): Promise<ResourceListResponse> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return api.get<ResourceListResponse>(`/resources?${params.toString()}`);
}

export async function downloadResource(
  attachmentId: string,
): Promise<DownloadResponse> {
  return api.get<DownloadResponse>(`/resources/${attachmentId}/download`);
}

export async function deleteResource(
  attachmentId: string,
): Promise<{ attachment_id: string; deleted: boolean; message: string }> {
  return api.delete(`/admin/resources/${attachmentId}`);
}
