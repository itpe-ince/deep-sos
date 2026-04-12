// USCP 관리자 KPI 부하 테스트 — 가장 무거운 집계 API (2분)
// 용도: Redis 캐시 적용 효과 검증 (2회차 응답 < 10ms 목표)
//
// 실행:
//   AUTH_TOKEN=$(curl -s ... /auth/login | jq -r '.access_token')
//   AUTH_TOKEN=$AUTH_TOKEN k6 run tests/load/kpi.js

import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3810/api/v1';
const TOKEN = __ENV.AUTH_TOKEN;

if (!TOKEN) {
  throw new Error('AUTH_TOKEN 환경변수가 필요합니다 (admin 권한)');
}

const summaryLatency = new Trend('kpi_summary_latency');
const campusesLatency = new Trend('kpi_campuses_latency');

export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    // 캐시 적용 후 기대치 (두 번째 호출부터)
    kpi_summary_latency: ['p(50)<50', 'p(95)<300'],
  },
};

const HEADERS = { Authorization: `Bearer ${TOKEN}` };

export default function () {
  {
    const res = http.get(`${BASE_URL}/admin/kpi/summary`, { headers: HEADERS });
    summaryLatency.add(res.timings.duration);
    check(res, { 'kpi summary 200': (r) => r.status === 200 });
  }

  {
    const res = http.get(`${BASE_URL}/admin/kpi/campuses`, { headers: HEADERS });
    campusesLatency.add(res.timings.duration);
    check(res, { 'kpi campuses 200': (r) => r.status === 200 });
  }

  http.get(`${BASE_URL}/admin/kpi/categories`, { headers: HEADERS });
  http.get(`${BASE_URL}/admin/kpi/timeseries?days=30`, { headers: HEADERS });
}
