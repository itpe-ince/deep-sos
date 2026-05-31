/**
 * USCP V2 Features / performance — 타입 정의 (M06 성과자료).
 *
 * 설계 근거: design.md §4.2 M06, feature-spec §M06-01~08
 */

export interface KpiIndicator {
  id: string;
  name: string;
  unit: string | null;
  formula: string | null;
  target_value: number | null;
  actual_value: number;
  achievement_rate: number | null;
  auto_count_source: string | null;
}

export interface KpiListResponse {
  data: KpiIndicator[];
  meta: { total: number };
}

export interface DashboardSeries {
  kpi_id: string;
  name: string;
  unit: string | null;
  points: { period: string; value: number }[];
}

export interface DashboardResponse {
  data: DashboardSeries[];
  meta: { total: number };
}

export type ContentCategory = 'notice' | 'event';

export interface ContentItem {
  id: string;
  category: ContentCategory | string;
  category_label: string;
  title: string;
  is_pinned: boolean;
  published_at: string | null;
  event_at: string | null;
}

export interface ContentListResponse {
  data: ContentItem[];
  meta: { total: number; limit: number; offset: number };
}

export interface ContentDetail extends ContentItem {
  body: string;
  author_name: string | null;
}

export type ResourceCategory = 'guide' | 'template' | 'toolkit' | 'etc';

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  guide: '가이드',
  template: '양식',
  toolkit: '툴킷',
  etc: '기타',
};

export interface ResourceItem {
  id: string;
  title: string;
  category: ResourceCategory | string;
  category_label: string;
  tags: string[];
  file_size: number | null;
  content_type: string | null;
  download_count: number;
  created_at: string | null;
}

export interface ResourceListResponse {
  data: ResourceItem[];
  meta: { total: number; limit: number; offset: number };
}

export interface DownloadResponse {
  attachment_id: string;
  title: string;
  minio_key: string;
  content_type: string | null;
  download_url: string | null;
}
