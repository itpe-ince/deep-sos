# USCP v1 — k6 부하 테스트 시나리오 (Sprint 5 Day 5)

## 사전 준비

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Docker (설치 없이)
docker run --rm -i --network host grafana/k6 run - < issues.js
```

## 환경변수
- `BASE_URL` (default: `http://127.0.0.1:3810/api/v1`) — 대상 API
- `AUTH_TOKEN` (optional) — admin/사용자 토큰 (인증 필요 엔드포인트)

## 실행

```bash
# 읽기 API 단독
BASE_URL=http://127.0.0.1:3810/api/v1 k6 run tests/load/issues.js

# Admin KPI (토큰 필요)
AUTH_TOKEN=$(curl -s -X POST http://127.0.0.1:3810/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@univ.ac.kr","password":"test12345"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
AUTH_TOKEN=$AUTH_TOKEN k6 run tests/load/kpi.js

# 종합 스모크
k6 run tests/load/smoke.js
```

## 목표 (Sprint 5 DoD §13.9)
- p95 < 500ms
- 에러율 < 1%
- 100 VUs × 5분 기준
