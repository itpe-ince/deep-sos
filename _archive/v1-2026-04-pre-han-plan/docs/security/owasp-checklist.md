# OWASP Top 10 (2021) Security Checklist — USCP v1

> 작성일: 2026-04-12 | Sprint 6 Quality Hardening

---

## A01: Broken Access Control

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | 인증 필수 엔드포인트에 `get_current_user` 의존성 | OK | `backend/app/api/v1/auth.py:55-100` |
| 2 | 관리자 전용 엔드포인트에 `require_admin` 가드 | OK | `backend/app/api/deps.py:10-17`, `admin_kpi.py:37` |
| 3 | 리소스 소유권 검증 (자신의 이슈/댓글만 수정) | OK | `issues.py` — owner_id 비교 후 403 |
| 4 | CORS origin 제한 (와일드카드 금지) | OK | `backend/app/main.py:63-69` — `settings.CORS_ORIGINS` |
| 5 | JWT 만료 시간 적정 (access 1h, refresh 7d) | OK | `backend/app/core/security.py:35-69` |

## A02: Cryptographic Failures

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | 비밀번호 bcrypt 해싱 (rounds=12) | OK | `backend/app/core/security.py:13-23` |
| 2 | JWT 서명 알고리즘 HS256 + 환경변수 시크릿 | OK | `security.py:54,68`, `config.py:41-48` |
| 3 | 비밀번호 리셋 토큰 bcrypt 해싱 | OK | `backend/app/api/v1/auth.py:262-279` |
| 4 | HTTPS 강제 (nginx redirect) | OK | `deploy/nginx/uscp.conf` — 80→443 redirect |
| 5 | `.env` 파일 `.gitignore`에 포함 | OK | `.gitignore` — `*.env`, `.env*` |

## A03: Injection

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | SQLAlchemy ORM 사용 (raw SQL 없음) | OK | `backend/app/core/database.py:16-22` |
| 2 | Pydantic 입력 검증 (EmailStr, Field 제약) | OK | `backend/app/schemas/auth.py:15-21` |
| 3 | 콘텐츠 길이 제한 (issue body 2000자) | OK | `schemas/issue_write.py:20` |
| 4 | 파라미터화된 쿼리만 사용 | OK | `services/auth_service.py:25,34,58` — `select().where()` |

## A04: Insecure Design

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | Rate limiting (로그인 10/분, 등록 5/시간) | OK | `backend/app/core/rate_limit.py:27-54` |
| 2 | 비밀번호 최소 길이 8자, 최대 72자 | OK | `schemas/auth.py:17` |
| 3 | 로그아웃 시 토큰 블랙리스트 | OK | `backend/app/core/token_blacklist.py:13-24` |
| 4 | 비밀번호 찾기 — 이메일 존재 여부 노출 방지 | OK | `auth.py:246` — 동일 응답 메시지 |

## A05: Security Misconfiguration

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | 프로덕션 디버그 모드 비활성화 | OK | `backend/app/core/config.py:20-21` — env 기반 |
| 2 | OpenAPI docs 프로덕션 비노출 | OK | `backend/app/main.py:56-58` — settings 제어 |
| 3 | X-Powered-By 헤더 제거 | OK | `frontend/next.config.ts:5` — `poweredByHeader: false` |
| 4 | 기본 에러 메시지에 스택 트레이스 미포함 | OK | `core/problem_details.py` — RFC 7807 형식 |
| 5 | gitleaks 스캔 CI 통합 | OK | `.github/workflows/security.yml` |

## A06: Vulnerable and Outdated Components

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | `pip-audit` CI 주간 스캔 | OK | `.github/workflows/security.yml` |
| 2 | `npm audit` CI 주간 스캔 | OK | `.github/workflows/security.yml` |
| 3 | Dependabot 자동 업데이트 PR | OK | `.github/dependabot.yml` |
| 4 | Python 3.12 + Node 22 LTS | OK | CI workflow 참조 |

## A07: Identification and Authentication Failures

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | bcrypt 비밀번호 해싱 (평문 저장 없음) | OK | `security.py:16-23` |
| 2 | JWT refresh token 별도 시크릿 | OK | `config.py:41-48` |
| 3 | 로그인 rate limit (brute force 방지) | OK | `auth.py:123` — 10/분 |
| 4 | OAuth 토큰 state 검증 | OK | `api/v1/oauth.py` — CSRF state 파라미터 |
| 5 | 로그아웃 시 JTI 블랙리스트 등록 | OK | `token_blacklist.py:13-24` |

## A08: Software and Data Integrity Failures

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | CI 파이프라인 자동 테스트 (lint + test + build) | OK | `.github/workflows/ci.yml` |
| 2 | npm lockfile (`package-lock.json`) 커밋 | OK | frontend 루트 |
| 3 | Docker 이미지 빌드 CI 통합 | OK | `ci.yml:docker-build` job |
| 4 | Alembic 마이그레이션 버전 관리 | OK | `backend/alembic/versions/` |

## A09: Security Logging and Monitoring Failures

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | structlog 구조화 로깅 (JSON in prod) | OK | `backend/app/core/logging.py:14-63` |
| 2 | Request ID 미들웨어 (요청 추적) | OK | `logging.py:70-86` — RequestIdMiddleware |
| 3 | Sentry 에러 트래킹 연동 | OK | `backend/app/main.py:7-32` |
| 4 | 인증 실패 로깅 | OK | `auth_service.py` — login failure 로그 |

## A10: Server-Side Request Forgery (SSRF)

| # | 점검 항목 | 상태 | 증거 |
|---|----------|------|------|
| 1 | 외부 API 호출 timeout 설정 (10초) | OK | `integrations/vms_client.py:86-100` |
| 2 | 사용자 입력 URL 직접 fetch 없음 | OK | 코드 검색 — user-supplied URL fetch 없음 |
| 3 | S3/MinIO presigned URL 서버 생성 | OK | 파일 업로드 — 서버 사이드 URL 생성 |

---

## Summary

| 카테고리 | 통과 | 미통과 | 비율 |
|----------|------|--------|------|
| A01 ~ A10 | 39 | 0 | 100% |

> 다음 점검: Sprint 7 UAT 전 재검증
