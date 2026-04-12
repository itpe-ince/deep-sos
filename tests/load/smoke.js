// USCP 스모크 부하 테스트 — 빠른 기본 검증 (1분)
// 용도: 배포 직후 5개 VUs × 30초로 모든 주요 읽기 엔드포인트 훑기
//
// 실행: k6 run tests/load/smoke.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3810/api/v1';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const PATHS = [
  '/health',
  '/issues?page=1&size=20',
  '/projects?page=1&size=20',
  '/volunteers?page=1&size=20',
  '/success-cases?page=1&size=20',
  '/cms/pages/about',
  '/cms/pages/guide',
  '/cms/banners?position=hero',
];

export default function () {
  PATHS.forEach((path) => {
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`${path} 200`]: (r) => r.status === 200,
      [`${path} < 500ms`]: (r) => r.timings.duration < 500,
    });
  });
  sleep(1);
}
