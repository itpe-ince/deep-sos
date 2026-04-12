# USCP v1 — Do Phase (Sprint 0 착수)

> **현재 단계**: Sprint 0 · Foundation
> **기간**: 2주
> **목표**: 개발 환경 구축 및 기본 인프라 세팅
> **Design Doc**: [uscp-v1.design.md](../02-design/features/uscp-v1.design.md)

---

## Sprint 0 체크리스트

### 🏗️ 1. 프로젝트 인프라 (Day 1-2)

- [x] 폴더 구조 생성 (`frontend/`, `backend/`, `nginx/`, `.github/workflows/`)
- [x] Root `.gitignore`, `README.md` 업데이트
- [x] `docker-compose.yml` (nginx, web, api, db, redis, minio)
- [x] `docker-compose.dev.yml` (개발용 hot reload)
- [x] `.env.example` (환경 변수 템플릿)

### 🔧 2. Backend (FastAPI) — Day 3-5

- [x] `backend/pyproject.toml` + 의존성 정의
- [x] `app/main.py` (FastAPI 진입점)
- [x] `app/core/config.py` (Pydantic Settings)
- [x] `app/core/database.py` (async SQLAlchemy 2.0)
- [x] `app/core/security.py` (JWT, bcrypt)
- [x] `app/models/*` (SQLAlchemy 모델 — users, campuses, issues 등)
- [x] `app/schemas/*` (Pydantic v2)
- [x] `app/api/v1/auth.py` (회원가입/로그인/JWT)
- [x] `app/api/v1/health.py` (헬스체크)
- [x] `alembic/` 초기 설정 + 초기 마이그레이션
- [x] `Dockerfile`

### 🎨 3. Frontend (Next.js 15) — Day 6-8

- [x] `frontend/package.json` + 의존성
- [x] `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- [x] `app/layout.tsx`, `app/globals.css`
- [x] `app/(public)/page.tsx` (임시 홈)
- [x] `components/ui/*` (Button, Card, Badge, Input — shadcn/ui 스타일)
- [x] `components/layout/{Header,Footer,LNB}.tsx` (mockup 기반)
- [x] `lib/api.ts` (API 클라이언트 with TanStack Query)
- [x] `lib/auth.ts` (JWT 관리)
- [x] `middleware.ts` (경로별 인증 체크)
- [x] `Dockerfile`

### 🧪 4. 품질 체계 — Day 9-10

- [x] ESLint + Prettier 설정
- [x] Husky pre-commit hook
- [x] `.github/workflows/ci.yml` (lint + test + build)
- [x] 기본 단위 테스트 (Vitest 샘플 + pytest 샘플)

---

## Sprint 0 완료 기준

- ✅ `docker-compose up` 으로 **전체 스택 기동** 성공
- ✅ `GET /api/v1/health` → 200 OK
- ✅ `POST /api/v1/auth/register` → 사용자 생성
- ✅ `POST /api/v1/auth/login` → JWT 발급
- ✅ Next.js 홈 페이지 렌더링 + API 연결 확인
- ✅ GitHub Actions CI 통과
- ✅ mockup 디자인 토큰이 Tailwind에 반영되어 mockup과 동일한 색상·폰트 사용

---

## 구현 순서 (각 파일 상세는 실제 생성 시 참조)

1. `docker-compose.yml` → 전체 스택 정의
2. `backend/pyproject.toml` → Python 의존성
3. `backend/app/core/{config,database,security}.py` → 기반
4. `backend/app/models/*.py` → DB 스키마
5. `backend/alembic/` → 마이그레이션
6. `backend/app/api/v1/auth.py` → 인증
7. `backend/Dockerfile`
8. `frontend/package.json` → Node 의존성
9. `frontend/tailwind.config.ts` → mockup 토큰 매핑
10. `frontend/src/app/layout.tsx` → 루트 레이아웃
11. `frontend/src/components/layout/*` → Header/LNB/Footer
12. `frontend/Dockerfile`
13. `.github/workflows/ci.yml`

---

## 다음 Sprint 예고

**Sprint 1 (2주)**: 공개 영역 + 인증
- mockup P-01 ~ P-10 + P-+ 실제 구현
- 카카오/네이버/구글 OAuth 연동
- Kakao Map 연동
- SSR + SSG 최적화
