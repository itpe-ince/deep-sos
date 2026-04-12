#!/usr/bin/env bash
# USCP v1 — Let's Encrypt 최초 발급 스크립트 (Sprint 5 Day 1)
#
# 사용법:
#   SERVER_NAME=staging.uscp.example.com \
#   EMAIL=ops@uscp.example.com \
#   STAGING=1 \
#   scripts/init-letsencrypt.sh
#
# STAGING=1 → Let's Encrypt staging 서버 사용 (rate limit 회피, 테스트용)
# STAGING=0 → production 인증서 발급
#
# 최초 실행 시에만 필요. 이후 갱신은 docker-compose.prod.yml의 certbot 컨테이너가 자동 처리.

set -euo pipefail

: "${SERVER_NAME:?SERVER_NAME 환경변수가 필요합니다}"
: "${EMAIL:?EMAIL 환경변수가 필요합니다}"
STAGING="${STAGING:-1}"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "=== USCP Let's Encrypt 초기 발급 ==="
echo "  domain: $SERVER_NAME"
echo "  email:  $EMAIL"
echo "  staging: $STAGING"
echo ""

echo "[1/5] dummy 인증서 생성 (nginx 기동용)..."
$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$SERVER_NAME/privkey.pem' \
    -out '/etc/letsencrypt/live/$SERVER_NAME/fullchain.pem' \
    -subj '/CN=localhost' && \
  mkdir -p /etc/letsencrypt/live/$SERVER_NAME" certbot

echo "[2/5] nginx 기동..."
$COMPOSE up -d nginx

echo "[3/5] dummy 인증서 제거..."
$COMPOSE run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$SERVER_NAME && \
  rm -rf /etc/letsencrypt/archive/$SERVER_NAME && \
  rm -rf /etc/letsencrypt/renewal/$SERVER_NAME.conf" certbot

STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
    STAGING_FLAG="--staging"
fi

echo "[4/5] Let's Encrypt 인증서 요청..."
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_FLAG \
    --email $EMAIL \
    -d $SERVER_NAME \
    --rsa-key-size 2048 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "[5/5] nginx 재로드..."
$COMPOSE exec nginx nginx -s reload

echo ""
echo "=== 완료 ==="
echo "https://$SERVER_NAME 에 접속하여 확인하세요."
if [ "$STAGING" = "1" ]; then
    echo "※ STAGING 인증서는 브라우저 경고가 표시됩니다."
    echo "  운영 발급 시 STAGING=0 으로 재실행하세요."
fi
