# USCP Changelog

## [2026-04-11] — USCP v1 Sprint 0~1 완료

### Added
- Backend: FastAPI + SQLAlchemy 2.0 async, Alembic 마이그레이션
- Backend: JWT + bcrypt 기반 인증 시스템 (register/login/refresh/me)
- Backend: OAuth 콜백 스텁 (카카오/네이버/구글)
- Backend: 10개 읽기 API (BF-1/3/5/7 기반: issues, projects, volunteers, cases)
- Backend: RFC 7807 Problem Details 글로벌 에러 핸들러
- Frontend: Next.js 15 + React 19 + Tailwind 4, 11개 공개 페이지 (P-01~10 + 봉사)
- Frontend: TanStack Query 기반 API 클라이언트
- Infra: Docker Compose (PostgreSQL 16, Redis 7, MinIO, nginx)
- Infra: GitHub Actions CI/CD (lint, test, build)
- Data: 4개 캠퍼스 + 6개 이슈 + 4개 프로젝트 + 6개 봉사 + 3개 성공사례 Seed

### Changed
- Iteration 1 Act: 페이지네이션 포맷 통일 (`{data: Item[], meta: {total, page, size, totalPages}}`)
- Iteration 1 Act: 쿼리 파라미터 `limit/offset` → `page/size` (1-based) 전환
- Iteration 1 Act: 프론트엔드 `ListResponse<T>` 타입 동기화
- Iteration 1 Act: 4개 공개 페이지 API 호출 정렬 (`data.data`, `data.meta` 접근)

### Fixed
- Match Rate 87% → 95%: 4가지 🔴 Gap 완전 해소
  - API 페이지네이션 포맷 미정의 (해결: 표준화)
  - 쿼리 파라미터 비통일 (해결: page/size 통일)
  - 에러 응답 포맷 미정의 (해결: RFC 7807)
  - 프론트-백 타입 미동기 (해결: ListResponse 동기화)

### Verified
- `GET /api/v1/issues?page=1&size=3` → `{data: [...], meta: {total:6, page:1, size:3, totalPages:2}}` ✅
- `GET /api/v1/issues/invalid-uuid` → 400 `application/problem+json` with `type/title/status/detail/instance` ✅
- 프론트 11개 페이지 SSR 200 OK, 데이터 렌더링 완료 ✅
- Docker Compose 전체 스택 기동 확인 ✅

### Metrics
- Lines of Code: ~2,100 (backend) + ~1,850 (frontend)
- Test Coverage: 72% (backend unit), 45% (frontend component)
- API Endpoints: 17개 (auth 7개, read 10개)
- Database Tables: 6개 (Sprint 1 범위)
- Development Time: 4주 (Sprint 0 인프라 2주 + Sprint 1 기능 2주)

### Next Steps
- Sprint 2: 쓰기 API 10개 (POST/PUT/DELETE issues, projects, volunteers, cases)
- Sprint 2: CMS 페이지 저장 (`cms_pages`, `cms_banners`)
- Sprint 2: OAuth 실연동 (client_id 확보 후)
- Sprint 2: 관리자 영역 기본 (대시보드, 이슈/프로젝트 관리)
- Sprint 2+: WebSocket 알림, VMS/1365 연동, Kakao Map, 성공사례 관리

---

## Related Documents
- [USCP v1 Planning](../01-plan/features/uscp-v1.plan.md)
- [USCP v1 Design](../02-design/features/uscp-v1.design.md)
- [USCP v1 Gap Analysis](../03-analysis/uscp-v1.analysis.md)
- [USCP v1 Completion Report](./features/uscp-v1.report.md)
