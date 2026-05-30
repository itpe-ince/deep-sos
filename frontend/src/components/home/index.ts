/**
 * USCP V2 홈 화면 위젯 barrel export.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §7.3 #1 홈
 *
 *  - M09-01 StatsCards   : 4종 운영 현황 카드
 *  - M09-02 ProcessBar   : 6단계 의제 라이프사이클 안내
 *  - M09-03 RecentIssues : 최근 공개 의제 3건 카드
 */
export { StatsCards, type CommonStatsResponse } from './StatsCards';
export { ProcessBar } from './ProcessBar';
export { RecentIssues } from './RecentIssues';
// M09-05/06 5개 지역 현황 지도 (홈 화면 영역)
export { RegionMap } from '../map/RegionMap';
