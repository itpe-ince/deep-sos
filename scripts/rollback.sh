#!/usr/bin/env bash
# USCP v1 — 롤백 스크립트 (Sprint 5 Day 3)
#
# 사용법 (staging 서버 SSH 접속 후):
#   cd /srv/uscp
#   IMAGE_TAG=<이전 SHA 7자리> ./rollback.sh
#
# 예:
#   IMAGE_TAG=a1b2c3d ./rollback.sh
#
# GHCR에 푸시된 이미지 태그로 즉시 복구한다. DB 마이그레이션은 수동으로
# `alembic downgrade -1` 실행 필요 (파괴적 작업이라 자동화하지 않음).

set -euo pipefail

: "${IMAGE_TAG:?IMAGE_TAG 환경변수가 필요합니다. 예: IMAGE_TAG=a1b2c3d ./rollback.sh}"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod"

echo "=== USCP 롤백 ==="
echo "  target tag: $IMAGE_TAG"
echo ""

# 현재 실행 중 태그 기록 (재롤백 대비)
CURRENT_TAG=$(docker inspect uscp-api 2>/dev/null \
    | grep -oE 'uscp-backend:[a-f0-9]+' | head -1 | cut -d: -f2 || echo unknown)
echo "  current tag: $CURRENT_TAG"
echo "$CURRENT_TAG" > /tmp/uscp-previous-tag
echo ""

echo "[1/4] 이미지 pull..."
GHCR_USER="${GHCR_USER:-$USER}"
docker pull "ghcr.io/${GHCR_USER}/uscp-backend:${IMAGE_TAG}"
docker pull "ghcr.io/${GHCR_USER}/uscp-frontend:${IMAGE_TAG}"

echo "[2/4] 태그 재설정..."
docker tag "ghcr.io/${GHCR_USER}/uscp-backend:${IMAGE_TAG}" \
           "ghcr.io/${GHCR_USER}/uscp-backend:latest"
docker tag "ghcr.io/${GHCR_USER}/uscp-frontend:${IMAGE_TAG}" \
           "ghcr.io/${GHCR_USER}/uscp-frontend:latest"

echo "[3/4] 컨테이너 재시작 (api + web)..."
$COMPOSE up -d --no-deps --force-recreate api web

echo "[4/4] 헬스체크..."
sleep 5
SERVER_NAME="${SERVER_NAME:-staging.uscp.local}"
if curl -fsS "https://$SERVER_NAME/api/v1/health"; then
    echo ""
    echo "✅ 롤백 성공"
else
    echo ""
    echo "❌ 헬스체크 실패 — 로그 확인 필요"
    $COMPOSE logs --tail 50 api web
    exit 1
fi

echo ""
echo "=== 완료 ==="
echo "이전 태그: $CURRENT_TAG (재롤백 시 IMAGE_TAG=$CURRENT_TAG)"
echo ""
echo "⚠️  DB 마이그레이션은 자동 롤백하지 않았습니다."
echo "   필요 시: docker compose exec api alembic downgrade -1"
