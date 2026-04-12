// USCP 읽기 API 부하 테스트 — 이슈/프로젝트/봉사 (5분)
// 용도: Sprint 5 DoD 검증 — 100 VUs × 5분, p95<500ms, error<1%
//
// 실행: BASE_URL=http://127.0.0.1:3810/api/v1 k6 run tests/load/issues.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3810/api/v1';

const errors = new Rate('custom_errors');
const issueListLatency = new Trend('issue_list_latency');
const projectListLatency = new Trend('project_list_latency');
const detailLatency = new Trend('detail_latency');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 워밍업
    { duration: '1m', target: 100 },   // 램프업
    { duration: '3m', target: 100 },   // 지속 부하
    { duration: '30s', target: 0 },    // 쿨다운
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    custom_errors: ['rate<0.01'],
    issue_list_latency: ['p(95)<300'],
    project_list_latency: ['p(95)<300'],
    detail_latency: ['p(95)<400'],
  },
};

export function setup() {
  // 상세 조회용 ID 미리 확보
  const issuesRes = http.get(`${BASE_URL}/issues?page=1&size=10`);
  const projectsRes = http.get(`${BASE_URL}/projects?page=1&size=10`);
  const issueIds = issuesRes.json('data').map((i) => i.id);
  const projectIds = projectsRes.json('data').map((p) => p.id);
  return { issueIds, projectIds };
}

export default function (data) {
  // 1. 이슈 목록
  {
    const res = http.get(`${BASE_URL}/issues?page=1&size=20`, {
      tags: { endpoint: 'issue_list' },
    });
    issueListLatency.add(res.timings.duration);
    const ok = check(res, { 'issues list 200': (r) => r.status === 200 });
    errors.add(!ok);
  }

  // 2. 프로젝트 목록
  {
    const res = http.get(`${BASE_URL}/projects?page=1&size=20`, {
      tags: { endpoint: 'project_list' },
    });
    projectListLatency.add(res.timings.duration);
    const ok = check(res, { 'projects list 200': (r) => r.status === 200 });
    errors.add(!ok);
  }

  // 3. 이슈 상세 (랜덤)
  if (data.issueIds.length > 0) {
    const id = data.issueIds[Math.floor(Math.random() * data.issueIds.length)];
    const res = http.get(`${BASE_URL}/issues/${id}`, {
      tags: { endpoint: 'issue_detail' },
    });
    detailLatency.add(res.timings.duration);
    check(res, { 'issue detail 200': (r) => r.status === 200 });
  }

  // 4. 프로젝트 상세
  if (data.projectIds.length > 0) {
    const id = data.projectIds[Math.floor(Math.random() * data.projectIds.length)];
    const res = http.get(`${BASE_URL}/projects/${id}`, {
      tags: { endpoint: 'project_detail' },
    });
    detailLatency.add(res.timings.duration);
    check(res, { 'project detail 200': (r) => r.status === 200 });
  }

  // 5. 봉사 목록 (가벼운 다양성)
  http.get(`${BASE_URL}/volunteers?page=1&size=20`);

  sleep(Math.random() * 2);
}
