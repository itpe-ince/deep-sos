# DEEP-SOS
단순한 기술 실증을 넘어 사회 문제의 본질을 깊게(Deep) 파고들어 구조(SOS)하는 리빙랩 플랫폼

1. Detailed appropriately (적절한 상세화)
SOS랩 적용: 초기 아이디어는 추상적일 수밖에 없습니다. 실증 단계가 가까워질수록 '시민 참여 시나리오'와 '데이터 수집 규격'을 상세화합니다.

시스템 기능: 실증 단계별(기획-실험-검증)로 요구사항의 상세도를 차등 관리하는 기능. (예: 초기엔 키워드 위주, 실증 직전엔 상세 UX 시나리오 작성)

2. Emergent (창발성/진화적 특성)
SOS랩 적용: 리빙랩은 실험 중에 사용자 피드백에 따라 솔루션이 계속 변합니다(Pivot). 계획에 없던 사회적 요구사항이 튀어나오는 것을 '장애'가 아닌 '성과'로 받아들여야 합니다.

시스템 기능: 프로젝트 진행 중 요구사항이 추가/변경될 때 그 이력(History)과 이유를 기록하고, 이를 전체 프로젝트 로드맵에 즉시 반영하는 유연한 백로그 관리.

3. Estimated (추정 가능성)
SOS랩 적용: 단순히 개발 공수뿐만 아니라, **'실증 비용'**과 **'사회적 가치(SROI)'**를 추정해야 합니다. 이 실험을 통해 얼마나 많은 시민이 혜택을 볼지 수치화합니다.

시스템 기능: 실증 투입 자원(센서 비용, 리워드 예산) 대비 예상되는 사회적 문제 해결 지수를 시뮬레이션하는 대시보드.

4. Prioritized (우선순위화)
SOS랩 적용: 모든 민원을 다 해결할 수는 없습니다. '시급성', '실행 가능성', '시민 체감도'를 기준으로 실증 과제의 우선순위를 정합니다.

시스템 기능: 이해관계자(시민, 전문가, 지자체)별 투표 및 가중치 산출 알고리즘을 통한 과제 우선순위 자동 정렬.

## SOS랩 · USCP (Union Social Contribution Platform)

> 2025 글로컬대학 본지정 사업 · Local-to-Global 사회 책무성 실현
> 대학-지자체-시민이 함께 지역사회 문제를 해결하는 온라인 사회공헌 플랫폼

## 📊 현재 상태

| PDCA Phase | Feature | 상태 |
|------------|---------|:----:|
| Plan | uscp-v1 | ✅ |
| Design | uscp-v1 | ✅ |
| **Do** | **uscp-v1 · Sprint 0** | **🔄 진행 중** |

## 🏗️ 아키텍처

```
Frontend (Next.js 15) ── Nginx ── FastAPI ── PostgreSQL + PostGIS
                                      │
                                      ├── Redis (Cache/Pub-Sub)
                                      ├── MinIO (S3 Storage)
                                      └── External APIs (VMS/1365/OAuth)
```

## 📁 프로젝트 구조

```
deep-sos/
├── frontend/        # Next.js 15 + TypeScript + Tailwind
├── backend/         # FastAPI + SQLAlchemy 2.0 + async
├── nginx/           # Reverse proxy 설정
├── mockup/          # 31개 화면 HTML/CSS 프로토타입
├── docs/            # PDCA 문서 (plan/design/do/analysis/report)
├── .github/         # GitHub Actions CI/CD
├── docker-compose.yml       # 운영용
├── docker-compose.dev.yml   # 개발용 (DB/Redis/MinIO만)
└── .env.example
```

## 🚀 개발 시작하기

### 1. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일 열어 필요한 값 입력 (JWT keys, OAuth, VMS 등)
```

### 2. 개발용 인프라 기동 (DB/Redis/MinIO)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Backend 실행

```bash
cd backend

# 가상환경 생성 (최초 1회)
python3.12 -m venv .venv
source .venv/bin/activate

# 의존성 설치
pip install -e ".[dev]"

# DB 마이그레이션
export DATABASE_URL="postgresql+asyncpg://uscp:uscp-dev-password@localhost:5432/uscp"
alembic upgrade head

# 서버 기동
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API Docs: http://localhost:8000/api/v1/docs
- Health: http://localhost:8000/api/v1/health

### 4. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

- Web: http://localhost:3000

### 5. 전체 Docker Compose 운영 기동

```bash
docker compose up -d --build
```

- Web: http://localhost/
- API: http://localhost/api/v1/docs

## 🧪 테스트

```bash
# Backend
cd backend && pytest -v --cov=app

# Frontend
cd frontend && npm test         # Vitest (단위)
cd frontend && npm run test:e2e # Playwright (E2E)
```

## 📚 주요 문서

| 문서 | 경로 |
|------|------|
| 현재 Sprint Do 가이드 | [docs/03-do/uscp-v1.do.md](docs/03-do/uscp-v1.do.md) |
| Plan v1 (요구사항) | [docs/01-plan/features/uscp-v1.plan.md](docs/01-plan/features/uscp-v1.plan.md) |
| Design v1 (상세 설계) | [docs/02-design/features/uscp-v1.design.md](docs/02-design/features/uscp-v1.design.md) |
| 상위 기획 (BF-1~7) | [docs/01-plan/features/sos-lab.plan.md](docs/01-plan/features/sos-lab.plan.md) |
| 상위 설계 (DB/API) | [docs/02-design/features/sos-lab.design.md](docs/02-design/features/sos-lab.design.md) |
| UI 표준 | [docs/02-design/ui-standards.md](docs/02-design/ui-standards.md) |
| 92개 기능 명세 | [docs/02-design/functional-spec.md](docs/02-design/functional-spec.md) |
| 프로토타입 (31개 화면) | [mockup/README.md](mockup/README.md) |
| 고객 요구사항 답변 | [docs/v1_answer.md](docs/v1_answer.md) |

## 🎯 Sprint 로드맵 (14주 · 2026.09 ~ 2026.12)

| Sprint | 기간 | 목표 | 상태 |
|:---:|:---:|------|:---:|
| **0** | 2주 | Foundation (환경, DB, 인증, 레이아웃) | 🔄 |
| 1 | 2주 | 공개 영역 + 인증 (P-01~10, P-+) | ⏳ |
| 2 | 2주 | 이슈 관리 (BF-1) | ⏳ |
| 3 | 2주 | 리빙랩 프로젝트 (BF-3) | ⏳ |
| 4 | 2주 | Co-creation + 피드백 | ⏳ |
| 5 | 2주 | 봉사활동 + VMS 연동 (BF-5) | ⏳ |
| 6 | 2주 | CMS + ESG/SDGs (BF-6) | ⏳ |
| 7 | 2주 | 통합 + QA + 배포 | ⏳ |
| **Open** | — | **v1.0 오픈** | 🎯 2026.12 |

## 🛠️ 기술 스택

### Frontend
- Next.js 15 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS 3 (mockup 디자인 토큰 매핑)
- TanStack Query 5 + Zustand
- TipTap (WYSIWYG) · Recharts · Kakao Map

### Backend
- Python 3.12 + FastAPI 0.115+
- SQLAlchemy 2.0 (async) + Alembic
- Pydantic v2 + passlib(bcrypt) + python-jose(JWT)
- PostgreSQL 16 + PostGIS
- Redis 7 + MinIO

### DevOps
- Docker + Docker Compose
- Nginx (Reverse proxy + SSL)
- GitHub Actions (CI)
- Sentry + Prometheus + Grafana (예정)

## 📝 라이선스

본 프로젝트는 2025 글로컬대학 본지정 사업의 일환으로 개발되며, 학내 비공개 프로젝트입니다.
