# USCP v1 Planning Document

> **Summary**: mockup 검증이 완료된 31개 화면을 실제 Next.js + FastAPI 플랫폼으로 구현 (v1)
>
> **Project**: deep-sos (SOS랩 / USCP)
> **Version**: v1.0
> **Author**: sangincha
> **Date**: 2026-04-11
> **Status**: Draft
> **선행 문서**:
> - [sos-lab.plan.md](sos-lab.plan.md) — 7개 업무흐름(BF-1~7) 기반 전체 기획
> - [sos-lab.design.md](../../02-design/features/sos-lab.design.md) — DB/API/UI 상세 설계
> - [v1_answer.md](../../v1_answer.md) — 고객 요구사항 답변
> - [mockup/](../../../mockup/) — 31개 화면 HTML/CSS 프로토타입

---

## 1. Overview

### 1.1 Purpose

대학-지자체-시민이 함께 지역사회 문제를 해결하는 **온라인 사회공헌 플랫폼(USCP, Union Social Contribution Platform)** 의 v1.0을 실제 서비스로 구현한다. Sprint 1~4를 통해 고객 검증이 완료된 31개 화면 프로토타입을 실제 Next.js + FastAPI 기반으로 구현하는 것이 본 단계의 목표이다.

### 1.2 Background

- **선행 검증 완료**
  - ✅ Plan v2.0 (7개 업무흐름 BF-1~7 기반) — [sos-lab.plan.md](sos-lab.plan.md)
  - ✅ Design v2.0 (DB 12+6 테이블, API 9그룹, UI/UX) — [sos-lab.design.md](../../02-design/features/sos-lab.design.md)
  - ✅ UI 표준 — [ui-standards.md](../../02-design/ui-standards.md)
  - ✅ 프로토타입 31개 화면 (Sprint 1~4) — [mockup/](../../../mockup/)
  - ✅ 고객 답변서 — [v1_answer.md](../../v1_answer.md)
- **고객 확정 사항**
  - 플랫폼 유형: **⑤ 종합 플랫폼** (예산 1.05~1.58억)
  - 1차 오픈: **2026년 12월**
  - 인증: **독자 로그인 체계** + 소셜 로그인 (SSO 미사용)
  - 서버: **대학 전산실 온프레미스**
  - 운영: 지역사회특화센터 전담
  - 사용자 규모: 약 470명 + 시민
- **v1.0 범위**: 고객이 지정한 우선순위 TOP 5 기능 완성 구현
  1. CMS 소개 페이지 (단체·제도·참여 방법 안내)
  2. 지역 문제 등록·투표
  3. 리빙랩 프로젝트 관리 (5단계)
  4. 봉사활동 관리 + VMS/1365 인증
  5. ESG/SDGs 성과 관리

### 1.3 Related Documents

| 구분 | 문서 | 역할 |
|------|------|------|
| 상위 기획 | [sos-lab.plan.md](sos-lab.plan.md) | BF-1~7 업무 흐름 기반 전체 범위 |
| 상세 설계 | [sos-lab.design.md](../../02-design/features/sos-lab.design.md) | DB 스키마, API 명세, UI 구조 |
| UI 표준 | [ui-standards.md](../../02-design/ui-standards.md) | 레이아웃, 컴포넌트, 모달 규칙 |
| 기능 명세 | [functional-spec.md](../../02-design/functional-spec.md) | 92개 세부 기능 |
| 프로토타입 기획 | [prototype-plan.md](../../02-design/prototype/prototype-plan.md) | 30개 화면 기획 |
| 고객 답변 | [v1_answer.md](../../v1_answer.md) | 38개 질문 답변 |
| 실행계획서 | [리빙랩.pdf](../../../리빙랩.pdf) | 2025 글로컬대학 §4-3 |

---

## 2. Scope

### 2.1 In Scope (v1.0)

#### 페이지 구현 (31개)

**공개 영역 (11개)** — 비로그인 접근 가능
- [ ] P-01 홈 (히어로, KPI, 최근 활동, 캠퍼스 4개)
- [ ] P-02 SOS랩이란? (CMS 편집 가능)
- [ ] P-03 캠퍼스별 리빙랩
- [ ] P-04 참여 방법 안내 (CMS 편집 가능)
- [ ] P-05 지역 문제 목록 (리스트/지도 뷰)
- [ ] P-06 지역 문제 상세
- [ ] P-07 리빙랩 프로젝트 목록
- [ ] P-08 리빙랩 프로젝트 상세 (5단계 시각화)
- [ ] P-09 성공 사례 목록
- [ ] P-10 로그인/회원가입 (독자 + 소셜)
- [ ] P-+ 봉사활동 목록

**사용자 영역 (8개)** — 로그인 필요
- [ ] P-11 대시보드 (내 활동, 알림, 내 프로젝트)
- [ ] P-12 지역 문제 등록 (카테고리, 지도, 사진)
- [ ] P-13 프로젝트 참여 상세 (멤버 관점)
- [ ] P-14 현장 피드백 등록 (설문/체크/사진/메모)
- [ ] P-15 아이디어 보드 (Co-creation)
- [ ] P-16 봉사활동 신청
- [ ] P-17 사회공헌 포트폴리오
- [ ] P-18 프로필 설정

**관리자 영역 (12개)** — 관리자 권한
- [ ] P-19 통합 대시보드 (KPI, 차트)
- [ ] P-20 CMS 소개 페이지 편집 (WYSIWYG)
- [ ] P-21 배너·공지 관리
- [ ] P-22 이슈 관리 목록
- [ ] P-23 이슈 처리 상세 (상태 변경, 프로젝트 전환)
- [ ] P-24 프로젝트 관리 목록 (5단계 칸반)
- [ ] P-25 프로젝트 관리 상세
- [ ] P-26 봉사활동 관리 (VMS 연동)
- [ ] P-27 참여 기관·MOU 관리
- [ ] P-28 사용자 관리
- [ ] P-29 성공 사례 관리
- [ ] P-30 KPI·SDGs 대시보드

#### 핵심 기능
- [ ] 독자 로그인 + 소셜 로그인 (카카오/네이버/구글)
- [ ] 4개 캠퍼스 멀티테넌트 지원
- [ ] 리빙랩 5단계 프로세스 관리
- [ ] 지역 문제 제보·투표·상태 추적
- [ ] Co-creation 아이디어 보드
- [ ] 현장 피드백 수집 (설문/체크/사진/메모)
- [ ] VMS/1365 자원봉사포털 자동 연동
- [ ] CMS 소개 페이지 WYSIWYG 편집
- [ ] ESG/SDGs 성과 대시보드
- [ ] 이슈→프로젝트 전환 워크플로우
- [ ] 사회공헌 포트폴리오 + PDF 다운로드

### 2.2 Out of Scope (v1.0에서 제외 · v2 이후)

- ❌ 학교 SSO 통합 (독자 로그인으로 대체)
- ❌ 융합연구 그룹 관리 (4개 연구그룹 별도 시스템)
- ❌ 한민족교육문화원 운영
- ❌ 글로벌 오픈캠퍼스 연계
- ❌ ODA 사업 자체 관리 (성과 연계만)
- ❌ 모바일 네이티브 앱 (반응형 웹 + PWA 대체)
- ❌ AI 의견 분석 (수동 분류로 대체)
- ❌ 다국어 (한국어만)

---

## 3. Requirements

### 3.1 Functional Requirements

> 상세 기능은 [functional-spec.md](../../02-design/functional-spec.md)의 92개 기능 중 MVP(34개) + Phase 2 일부를 v1 범위로 선정

#### 인증·회원 (FR-AUTH)

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-AUTH-01 | 이메일 + 비밀번호 회원가입 | P0 | Pending | P-10 |
| FR-AUTH-02 | 이메일 로그인 / JWT 토큰 발급 | P0 | Pending | P-10 |
| FR-AUTH-03 | 카카오/네이버/구글 소셜 로그인 | P1 | Pending | P-10 |
| FR-AUTH-04 | 역할 관리 (student/professor/citizen/gov/enterprise/admin) | P0 | Pending | 전체 |
| FR-AUTH-05 | 프로필 수정 (기본정보/알림/관심분야) | P1 | Pending | P-18 |
| FR-AUTH-06 | 비밀번호 찾기·재설정 | P1 | Pending | P-10 |

#### 지역 문제 (FR-ISSUE) — BF-1

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-ISSUE-01 | 이슈 등록 (제목/설명/카테고리/위치/사진) | P0 | Pending | P-12 |
| FR-ISSUE-02 | 이슈 목록 (필터/정렬/페이지네이션) | P0 | Pending | P-05 |
| FR-ISSUE-03 | 이슈 상세 조회 (타임라인/댓글/공감) | P0 | Pending | P-06 |
| FR-ISSUE-04 | 이슈 공감 투표 (토글) | P0 | Pending | P-06 |
| FR-ISSUE-05 | 이슈 댓글 작성 (익명 옵션) | P0 | Pending | P-06 |
| FR-ISSUE-06 | 지도 뷰 (Kakao/Naver Map) | P1 | Pending | P-05 |
| FR-ISSUE-07 | 이슈 익명 등록 옵션 | P1 | Pending | P-12 |
| FR-ISSUE-08 | 관리자 이슈 목록 (상태 탭) | P0 | Pending | P-22 |
| FR-ISSUE-09 | 관리자 이슈 상태 변경 | P0 | Pending | P-23 |
| FR-ISSUE-10 | 관리자 담당자 배정 | P0 | Pending | P-23 |
| FR-ISSUE-11 | 이슈→프로젝트 전환 워크플로우 | P1 | Pending | P-23 |

#### 리빙랩 프로젝트 (FR-PRJ) — BF-3

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-PRJ-01 | 프로젝트 CRUD | P0 | Pending | P-24, P-25 |
| FR-PRJ-02 | 5단계 프로세스 관리 (탐색→실행→개발→검증→활용) | P0 | Pending | P-08, P-13, P-25 |
| FR-PRJ-03 | 프로젝트 목록 (칸반 + 리스트 뷰) | P0 | Pending | P-07, P-24 |
| FR-PRJ-04 | 프로젝트 상세 (7개 탭) | P0 | Pending | P-08 |
| FR-PRJ-05 | 멤버 관리 (추가/제거/역할 변경) | P0 | Pending | P-25 |
| FR-PRJ-06 | 마일스톤 CRUD | P0 | Pending | P-13, P-25 |
| FR-PRJ-07 | 산출물 업로드 | P1 | Pending | P-13 |
| FR-PRJ-08 | 현장 피드백 등록 (4종) | P1 | Pending | P-14 |
| FR-PRJ-09 | 피드백 템플릿 관리 | P2 | Pending | P-14 |
| FR-PRJ-10 | 아이디어 보드 (카드 추가/이동/투표) | P1 | Pending | P-15 |
| FR-PRJ-11 | 프로젝트 KPI 관리 | P1 | Pending | P-25 |
| FR-PRJ-12 | 단계 전환 (관리자 승인) | P0 | Pending | P-25 |

#### 봉사활동 (FR-VOL) — BF-5

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-VOL-01 | 봉사활동 CRUD | P0 | Pending | P-26 |
| FR-VOL-02 | 봉사활동 목록 (카드 + 캘린더) | P0 | Pending | P-+, P-26 |
| FR-VOL-03 | 봉사활동 신청 | P0 | Pending | P-16 |
| FR-VOL-04 | 참여 확정/취소 | P0 | Pending | P-26 |
| FR-VOL-05 | 봉사 시간 인증 | P0 | Pending | P-26 |
| FR-VOL-06 | VMS API 자동 연동 | P1 | Pending | P-26 |
| FR-VOL-07 | 1365 자원봉사포털 자동 연동 | P1 | Pending | P-26 |
| FR-VOL-08 | 사회공헌 포트폴리오 | P0 | Pending | P-17 |
| FR-VOL-09 | 포트폴리오 PDF 다운로드 | P1 | Pending | P-17 |

#### CMS 콘텐츠 관리 (FR-CMS)

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-CMS-01 | 소개 페이지 CRUD | P0 | Pending | P-20 |
| FR-CMS-02 | WYSIWYG 에디터 (TipTap 기반) | P0 | Pending | P-20 |
| FR-CMS-03 | 페이지 발행/비공개 관리 | P0 | Pending | P-20 |
| FR-CMS-04 | 이미지 업로드 | P0 | Pending | P-20 |
| FR-CMS-05 | 메인 배너 관리 | P1 | Pending | P-21 |
| FR-CMS-06 | 공지사항 관리 | P1 | Pending | P-21 |

#### ESG / SDGs (FR-ESG) — BF-6

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-ESG-01 | ESG 활동 등록/관리 | P1 | Pending | P-30 |
| FR-ESG-02 | SDGs 17개 태깅 | P1 | Pending | P-30 |
| FR-ESG-03 | SDGs 대시보드 | P1 | Pending | P-30 |
| FR-ESG-04 | 플랫폼 KPI (연차별) | P1 | Pending | P-30 |
| FR-ESG-05 | 캠퍼스별 성과 비교 | P2 | Pending | P-30 |

#### 참여주체 · MOU (FR-ORG) — BF-2

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-ORG-01 | 참여 기관 CRUD | P1 | Pending | P-27 |
| FR-ORG-02 | MOU 상태/기간 관리 | P1 | Pending | P-27 |
| FR-ORG-03 | 만료 임박 알림 | P2 | Pending | P-27 |
| FR-ORG-04 | 프로젝트-기관 매칭 | P1 | Pending | P-25 |

#### 성공 사례 (FR-CASE) — BF-7

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-CASE-01 | 성공 사례 CRUD (문제→과정→결과→임팩트) | P1 | Pending | P-29 |
| FR-CASE-02 | 공개/비공개 전환 | P1 | Pending | P-29 |
| FR-CASE-03 | 성공 사례 목록/상세 (공개) | P1 | Pending | P-09 |
| FR-CASE-04 | 정책 연계·글로벌 전환 태그 | P2 | Pending | P-29 |

#### 관리자 대시보드 (FR-ADMIN)

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-ADMIN-01 | 통합 대시보드 (KPI/차트) | P0 | Pending | P-19 |
| FR-ADMIN-02 | 사용자 관리 (역할 변경/비활성) | P0 | Pending | P-28 |
| FR-ADMIN-03 | 캠퍼스별 통계 | P1 | Pending | P-19 |
| FR-ADMIN-04 | 실시간 알림 (WebSocket) | P1 | Pending | 전체 |

#### 공통 기능 (FR-COM)

| ID | Requirement | Priority | Status | Source |
|----|-------------|----------|--------|--------|
| FR-COM-01 | 4개 캠퍼스 멀티테넌트 | P0 | Pending | 전체 |
| FR-COM-02 | 반응형 웹 + PWA | P0 | Pending | 전체 |
| FR-COM-03 | 실시간 알림 푸시 | P1 | Pending | 전체 |
| FR-COM-04 | 게이미피케이션 (포인트/뱃지/등급) | P2 | Pending | P-11, P-17 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| **Performance** | 페이지 로드 < 3초 (4G 기준) | Lighthouse, WebPageTest |
| | API 응답 < 500ms (p95) | APM 모니터링 |
| | 동시 사용자 1,000명 처리 | 부하 테스트 (k6/Locust) |
| **Availability** | 99.5% (학기 중, 월 3.6시간 이내 다운타임) | Uptime 모니터링 |
| **Security** | OWASP Top 10 대응 | 보안 감사 |
| | 개인정보보호법 준수 | 영향평가 |
| | HTTPS 전 구간 | SSL Labs A 등급 |
| **Accessibility** | WCAG 2.1 AA | Lighthouse Accessibility ≥ 90 |
| **Browser** | Chrome 120+, Safari 17+, Edge 120+, Firefox 120+ | BrowserStack |
| **Mobile** | iOS Safari 16+, Android Chrome 120+ (반응형) | 실기기 테스트 |
| **i18n** | 한국어 (v1은 한국어만) | - |

---

## 4. Success Criteria

### 4.1 Definition of Done (v1.0 오픈 기준)

- [ ] 31개 화면 모두 실구현 완료 (mockup ↔ 실제 구현 매핑)
- [ ] 4개 캠퍼스 데이터 격리 및 통합 뷰 동작 확인
- [ ] 독자 로그인 + 카카오/네이버/구글 소셜 로그인 동작
- [ ] 이슈 등록 → 투표 → 관리자 배정 → 처리 → 알림 흐름 E2E 동작
- [ ] 프로젝트 생성 → 5단계 전환 → 마일스톤/멤버/피드백/KPI 관리 E2E
- [ ] 봉사활동 등록 → 신청 → 확정 → 시간 인증 → VMS/1365 연동 E2E
- [ ] CMS 소개 페이지 편집 → 발행 → 공개 사이트 반영 확인
- [ ] 관리자 대시보드 KPI 실시간 반영 확인
- [ ] 반응형 웹 (Mobile/Tablet/Desktop/Wide) 동작 확인
- [ ] PWA 설치 가능 + 푸시 알림 동작
- [ ] 단위/통합/E2E 테스트 커버리지 70% 이상
- [ ] Lighthouse Performance 80+, Accessibility 90+
- [ ] 개인정보 영향평가 통과
- [ ] 대학 전산실 온프레미스 배포 완료
- [ ] 운영자 매뉴얼 + 사용자 가이드 작성

### 4.2 Quality Criteria

- [ ] ESLint · Prettier 경고 0건
- [ ] TypeScript strict 모드 + any 타입 0건
- [ ] 빌드 성공 (Frontend + Backend)
- [ ] CI/CD 자동화 (GitHub Actions)
- [ ] 크리티컬 보안 취약점 0건

### 4.3 KPI (실행계획서 기반)

| 지표 | 2026 목표 (v1 오픈 후 1개월) |
|------|:---:|
| 등록 사용자 | 500명+ |
| 제보된 이슈 | 30건+ |
| 운영 중 리빙랩 프로젝트 | 4건 (누적) |
| 봉사활동 등록 | 12건+ |
| VMS 연동 성공률 | 95%+ |
| 사용자 만족도 (NPS) | +30 이상 |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:------:|------------|
| **VMS/1365 API 규격 미확보** | High | Medium | 관련 기관 사전 접촉, 수동 연동 fallback 준비, v1 초기는 CSV 업로드로 대체 가능 |
| **대학 전산실 온프레미스 환경 제약** | High | Medium | 학교 IT 부서 조기 협의, Docker 기반 배포로 이식성 확보 |
| **2026.12 오픈 일정 촉박** | High | High | MVP 우선순위(P0) 완성 후 P1/P2 단계 배포, 오픈 지연 시 단계적 오픈 계획 |
| **교수 참여율 저조** | High | High | 업적평가 반영 제도화, 간편 UX, 최소 입력 설계 |
| **사용자 테스트 피드백 반영 부족** | Medium | Medium | 각 Sprint 종료 시 사용자 테스트, 2주 단위 피드백 수렴 |
| **개인정보 관련 법적 이슈** | High | Low | 개인정보 영향평가 선행, 법무 검토, 익명성 설계 |
| **소셜 로그인 API 정책 변경** | Medium | Low | 표준 OAuth2 어댑터 패턴, 각 Provider 독립 모듈화 |
| **CMS WYSIWYG 에디터 복잡도** | Medium | Medium | TipTap 등 검증된 오픈소스 사용, 자주 쓰는 블록 위주 구성 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | ☐ |

> **선정 근거**: 31개 화면 + 4개 캠퍼스 테넌트 + 외부 API 연동(VMS/1365/소셜) + 중간 트래픽(~1000동접)은 Dynamic 수준에 적합. 운영 안정화 후 Enterprise 전환 고려.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Frontend Framework | Next.js / React(Vite) | **Next.js 15 (App Router)** | SSR/SSG(공개 페이지 SEO), 이미지 최적화, 라우팅, 빌드 최적화 |
| Language | JavaScript / TypeScript | **TypeScript (strict)** | 타입 안전성, 유지보수성 |
| UI Library | shadcn/ui + Tailwind / MUI | **shadcn/ui + Tailwind CSS** | mockup의 CSS 변수 토큰과 1:1 매핑 용이, 커스터마이징 |
| State Management | Zustand / Redux / Jotai | **Zustand** | 경량, 간단한 전역 상태에 적합 |
| Server State | TanStack Query / SWR | **TanStack Query** | 캐시, 리페치, 에러 핸들링 |
| Backend Framework | Django / FastAPI / Flask | **FastAPI** | 비동기, 고성능, OpenAPI 자동, Pydantic 검증 |
| ORM | SQLAlchemy / Tortoise | **SQLAlchemy 2.0 + Alembic** | 마이그레이션, 레퍼런스 풍부 |
| Database | PostgreSQL / MySQL | **PostgreSQL 16 + PostGIS** | 위치 데이터, JSONB, 신뢰성 |
| Cache/Queue | Redis | **Redis 7** | 세션, 캐시, 알림 큐, Pub/Sub |
| Realtime | WebSocket / SSE | **WebSocket (FastAPI + Redis Pub/Sub)** | 양방향 통신 |
| File Storage | S3 / MinIO | **MinIO** (온프레미스) | 대학 전산실 환경, S3 호환 |
| Auth | JWT / Session | **JWT (Access 15분 + Refresh 7일)** | Stateless, 멀티 디바이스 |
| Social Login | - | **OAuth2 (카카오/네이버/구글)** | 표준 프로토콜 |
| Map | Kakao / Naver / Google | **Kakao Map** (국내 최적화) | 한국 주소, 무료 할당량 |
| WYSIWYG | TipTap / Quill / TinyMCE | **TipTap** | 확장성, React 통합 우수 |
| Charts | Chart.js / Recharts / D3 | **Recharts** | React 친화, 선언적 |
| Testing | Jest / Vitest + Playwright | **Vitest + Playwright** | 속도, DX |
| CI/CD | GitHub Actions | **GitHub Actions** | 무료, 통합 용이 |
| Container | Docker | **Docker + Docker Compose** | 온프레미스 이식성 |
| Monitoring | Sentry / Grafana | **Sentry + Prometheus + Grafana** | 에러 + 메트릭 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

프로젝트 구조:
┌────────────────────────────────────────────────────────────────┐
│ Frontend (Next.js 15 App Router)                               │
│   app/                                                         │
│   ├── (public)/              # 공개 영역 (SSR)                   │
│   │   ├── page.tsx           # P-01 홈                          │
│   │   ├── about/             # P-02~04                          │
│   │   ├── issues/            # P-05~06                          │
│   │   ├── projects/          # P-07~08                          │
│   │   ├── volunteers/        # P-+                             │
│   │   └── success-cases/     # P-09                             │
│   ├── (auth)/                # 인증 플로우                       │
│   │   └── login/             # P-10                             │
│   ├── (user)/                # 사용자 영역                       │
│   │   ├── mypage/            # P-11                             │
│   │   ├── issues/new/        # P-12                             │
│   │   ├── projects/[id]/     # P-13~15                          │
│   │   ├── volunteers/[id]/   # P-16                             │
│   │   ├── portfolio/         # P-17                             │
│   │   └── profile/           # P-18                             │
│   ├── admin/                 # 관리자 영역                       │
│   │   ├── dashboard/         # P-19                             │
│   │   ├── cms/               # P-20~21                          │
│   │   ├── issues/            # P-22~23                          │
│   │   ├── projects/          # P-24~25                          │
│   │   ├── volunteers/        # P-26                             │
│   │   ├── organizations/     # P-27                             │
│   │   ├── users/             # P-28                             │
│   │   ├── success-cases/     # P-29                             │
│   │   └── kpi/               # P-30                             │
│   └── api/                   # Next.js API Routes (BFF)        │
│                                                                │
│   components/                                                  │
│   ├── ui/                    # shadcn/ui 커스텀                 │
│   ├── layout/                # Header/LNB/Footer               │
│   └── common/                # 공통 컴포넌트                     │
│                                                                │
│   features/                  # 기능 모듈                         │
│   ├── auth/                                                    │
│   ├── issues/                                                  │
│   ├── projects/                                                │
│   ├── volunteers/                                              │
│   ├── cms/                                                     │
│   ├── esg/                                                     │
│   └── admin/                                                   │
│                                                                │
│   lib/                       # API 클라이언트, 유틸              │
│   hooks/                     # 커스텀 hooks                     │
│   stores/                    # Zustand 스토어                   │
│   types/                     # TypeScript 타입                  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Backend (FastAPI)                                              │
│   app/                                                         │
│   ├── api/v1/                # 라우터 (BF-1~7 기준)              │
│   │   ├── auth.py                                             │
│   │   ├── bf1_issues.py                                       │
│   │   ├── bf2_organizations.py                                │
│   │   ├── bf3_projects.py                                     │
│   │   ├── bf5_volunteers.py                                   │
│   │   ├── bf6_esg.py                                          │
│   │   ├── bf7_cases.py                                        │
│   │   ├── cms.py                                              │
│   │   ├── admin.py                                            │
│   │   └── notifications.py                                    │
│   ├── models/                # SQLAlchemy 2.0 모델              │
│   ├── schemas/               # Pydantic v2                      │
│   ├── services/              # 비즈니스 로직                     │
│   ├── integrations/          # 외부 연동                         │
│   │   ├── vms_client.py                                        │
│   │   ├── portal_1365.py                                       │
│   │   ├── kakao_oauth.py                                       │
│   │   ├── naver_oauth.py                                       │
│   │   └── google_oauth.py                                      │
│   ├── core/                  # 설정, 인증, 미들웨어              │
│   └── utils/                                                    │
│   alembic/                   # DB 마이그레이션                   │
│   tests/                                                        │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` (user global)
- [ ] `docs/01-plan/conventions.md` (신규 작성 필요)
- [ ] ESLint + Prettier 설정
- [ ] TypeScript strict 설정

### 7.2 Conventions to Define

| Category | To Define | Priority |
|----------|-----------|:---:|
| **Naming** | camelCase(TS)/snake_case(Python)/PascalCase(Component) | High |
| **Folder structure** | App Router + feature-based (위 6.3 참조) | High |
| **API Convention** | RESTful, `/api/v1/*`, 한국어 에러 메시지 | High |
| **Error handling** | RFC 7807 Problem Details | High |
| **Commit** | Conventional Commits (feat/fix/docs/...) | High |
| **Branch** | `main` (protected) / `dev` / `feature/*` | High |
| **Code review** | PR 필수, 1명 이상 승인 | High |
| **Test** | Vitest (단위), Playwright (E2E) | Medium |

### 7.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `DATABASE_URL` | PostgreSQL | Server |
| `REDIS_URL` | Redis | Server |
| `JWT_SECRET_KEY` | JWT 서명 | Server |
| `JWT_REFRESH_SECRET_KEY` | Refresh token | Server |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | 카카오 OAuth | Server |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 OAuth | Server |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 구글 OAuth | Server |
| `VMS_API_KEY` / `VMS_API_URL` | VMS 연동 | Server |
| `PORTAL_1365_API_KEY` / `PORTAL_1365_API_URL` | 1365 연동 | Server |
| `KAKAO_MAP_API_KEY` | 카카오 지도 | Client (NEXT_PUBLIC_) |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | 파일 저장소 | Server |
| `NEXT_PUBLIC_API_URL` | API 엔드포인트 | Client |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | 이메일 발송 | Server |
| `SENTRY_DSN` | 에러 모니터링 | Both |

---

## 8. v1 Sprint Plan (14주 · 2026.09 ~ 2026.12)

### Sprint 0: Foundation (2주)
**목표**: 개발 환경 구축 및 기본 인프라

- [ ] 프로젝트 초기화 (Next.js 15 + FastAPI + PostgreSQL + Redis Docker Compose)
- [ ] DB 스키마 마이그레이션 (sos-lab.design.md 기반 12+6개 테이블)
- [ ] CI/CD 파이프라인 (GitHub Actions)
- [ ] 인증 기초 (JWT, 회원가입/로그인)
- [ ] 공통 레이아웃 (Header, LNB, Footer) — mockup 기반
- [ ] 디자인 시스템 (Tailwind 설정, shadcn/ui 세팅, mockup CSS 변수 매핑)

### Sprint 1: 공개 영역 + 인증 (2주)
**목표**: P-01 ~ P-10 + P-+ 구현 (11개)

- [ ] P-01 홈 (SSR, KPI 위젯, 최근 활동)
- [ ] P-02~04 소개 페이지 (SSG, CMS 렌더링)
- [ ] P-05~06 이슈 목록/상세 (조회만)
- [ ] P-07~08 프로젝트 목록/상세 (조회만)
- [ ] P-09 성공 사례 목록
- [ ] P-+ 봉사활동 목록
- [ ] P-10 로그인/회원가입 + 소셜 로그인
- [ ] 카카오 지도 연동

### Sprint 2: 이슈 관리 (BF-1) (2주)
**목표**: 사용자 이슈 등록 + 관리자 처리

- [ ] P-12 이슈 등록 (사진 업로드, 지도 피커)
- [ ] P-22 이슈 관리 목록 (상태 탭, 필터, 일괄 작업)
- [ ] P-23 이슈 처리 상세 (상태 변경, 담당 배정)
- [ ] 이슈 상태 변경 워크플로우 + 알림
- [ ] 이슈→프로젝트 전환 버튼 (Sprint 3 연계)

### Sprint 3: 리빙랩 프로젝트 (BF-3) (2주)
**목표**: 프로젝트 생성 → 5단계 → 멤버/마일스톤

- [ ] P-24 프로젝트 관리 목록 (칸반)
- [ ] P-25 프로젝트 관리 상세 (단계 전환, 멤버)
- [ ] P-13 사용자 프로젝트 참여 상세
- [ ] 마일스톤 CRUD
- [ ] 산출물 업로드 (MinIO 연동)
- [ ] 단계 전환 워크플로우
- [ ] 이슈→프로젝트 전환 완성

### Sprint 4: Co-creation + 피드백 (BF-3 확장) (2주)
**목표**: 아이디어 보드 + 현장 피드백

- [ ] P-14 현장 피드백 등록 (4종: 설문/체크/사진/메모)
- [ ] 피드백 템플릿 CRUD
- [ ] P-15 아이디어 보드 (Drag & Drop 카드)
- [ ] 아이디어 카드 투표
- [ ] 프로젝트 KPI 관리

### Sprint 5: 봉사활동 + VMS 연동 (BF-5) (2주)
**목표**: 봉사 등록 → 신청 → VMS 자동 연동

- [ ] P-11 사용자 대시보드
- [ ] P-16 봉사활동 신청 상세
- [ ] P-26 관리자 봉사활동 관리
- [ ] 봉사 시간 인증
- [ ] VMS API 연동 (자동 전송)
- [ ] 1365 자원봉사포털 연동
- [ ] P-17 사회공헌 포트폴리오 + PDF
- [ ] P-18 프로필 설정

### Sprint 6: CMS + ESG/SDGs (BF-6) (2주)
**목표**: 콘텐츠 관리 + 성과 대시보드

- [ ] P-20 CMS 소개 페이지 편집 (TipTap)
- [ ] P-21 배너/공지 관리
- [ ] P-30 KPI/SDGs 대시보드
- [ ] P-19 관리자 통합 대시보드
- [ ] P-27 참여 기관/MOU 관리
- [ ] P-28 사용자 관리
- [ ] P-29 성공 사례 관리

### Sprint 7: 통합 + QA + 배포 (2주)
**목표**: 품질 보증 및 온프레미스 배포

- [ ] PWA 설정 (Service Worker, manifest, 푸시)
- [ ] 성능 최적화 (이미지, 번들, 쿼리)
- [ ] 보안 점검 (OWASP Top 10)
- [ ] E2E 테스트 (핵심 시나리오 20개)
- [ ] 크로스 브라우저/디바이스 테스트
- [ ] 개인정보 영향평가
- [ ] 운영자 매뉴얼 작성
- [ ] 대학 전산실 배포 + 리허설
- [ ] **2026.12 v1.0 오픈**

---

## 9. Stakeholders

| 역할 | 조직 | 책임 |
|------|------|------|
| **발주자** | 지역사회특화센터 | 요구사항 확정, 검수, 최종 승인 |
| **협력** | ESG센터 | ESG/SDGs 요구사항 검토 |
| **협력** | 국제협력센터 | ODA 연계 요구사항 검토 |
| **시스템** | 대학 IT 부서 | 온프레미스 서버 제공, 네트워크 |
| **법무** | 대학 법무팀 | 개인정보 영향평가 |
| **개발** | 개발팀 | 설계·구현·테스트·배포 |
| **사용자** | 교수·학생·시민·지자체·기업 | 사용자 테스트 및 피드백 |

---

## 10. Next Steps

1. [ ] 본 Plan 문서 발주처 검토·승인
2. [ ] Design v1 작성 — `/pdca design uscp-v1`
3. [ ] Convention 문서 작성 — 코드 스타일, 폴더 구조
4. [ ] Sprint 0 착수 — 프로젝트 초기 세팅
5. [ ] 외부 시스템 연동 규격 확인 (VMS, 1365, 카카오/네이버/구글 OAuth)
6. [ ] 대학 전산실 배포 환경 사전 협의

---

## 11. Sprint 3 Plan — Production Hardening + BF-3/5/6

> Sprint 2 완료(Match Rate 97%) 후 Sprint 3 범위 확정.
> **핵심 원칙**: Rate Limit을 최우선으로 배치하여 쓰기 API(BF-1) 오픈 상태의 운영 리스크를 즉시 차단.

### 11.1 목표 (2주 · Week 5~6)

| # | 영역 | 항목 | 우선순위 |
|---|---|---|:---:|
| S3-1 | **보안/운영** | Rate Limit (Redis) — 쓰기/인증 API | 🔴 P0 |
| S3-2 | **보안/운영** | SMTP 실발송 — 비밀번호 재설정/알림 | 🟡 P1 |
| S3-3 | **BF-3** | 프로젝트 팀원 워크플로 (project_members) | 🟡 P1 |
| S3-4 | **BF-5** | 봉사활동 신청/확정 (volunteer_participations) | 🟡 P1 |
| S3-5 | **BF-6** | 포트폴리오 조회 (MVP) | 🟢 P2 |
| S3-6 | **인증** | Refresh token 블랙리스트 (Redis) | 🟢 P2 |
| S3-7 | **프론트** | P-25 프로젝트 상세 확장 + P-16 봉사 신청 + P-17 포트폴리오 | 🟡 P1 |

### 11.2 P0 — Rate Limit (최우선, 1~2일)

**배경**: Sprint 2 완료 시점 Rate Limit Critical Gap으로 식별됨. 쓰기 API(POST /issues, vote, comment)가 오픈된 상태에서 DoS/스팸 위험이 실재.

**구현 방식**:
- Redis 기반 sliding window (초 단위 TTL)
- FastAPI dependency `rate_limit(key, max, window)`로 라우터 레벨 적용
- 키: `{user_id}:{endpoint}` 우선, 미인증 엔드포인트는 `{ip}:{endpoint}`
- 초과 시 RFC 7807 `429 Too Many Requests` + `Retry-After` 헤더

**적용 대상**:
| 엔드포인트 | 제한 |
|---|---|
| POST /issues | 10/시간 |
| POST /issues/{id}/vote, /comments | 30/분 |
| DELETE /issues/{id}/comments/{id} | 30/분 |
| POST /auth/register | 5/시간/IP |
| POST /auth/login | 10/분/IP |
| POST /auth/password/forgot | 3/시간/email + 10/시간/IP |
| POST /cms/banners (admin write) | 60/분 |

**산출물**:
- `backend/app/core/rate_limit.py` — Redis sliding window 구현
- `backend/app/api/deps.py` — `rate_limit()` dependency factory
- 테스트: 제한 초과 시 429 응답 + 단위 테스트

### 11.3 P1 — SMTP 실발송 (1일)

- 개발 환경: MailHog 또는 콘솔 로그 유지 (현재 동작)
- 운영 환경: SMTP (Gmail/SendGrid) 연동, `.env`에 `SMTP_*` 필드 추가
- `backend/app/core/mailer.py` 헬퍼 작성 (Jinja2 템플릿)
- 우선 대상: `password/forgot` 재설정 링크 이메일
- Sprint 3 말에 실제 SMTP 주소 확보 후 QA 1회

### 11.4 P1 — BF-3 프로젝트 팀원 워크플로 (3일)

**신규 테이블**:
- `project_members` (project_id, user_id, role[leader/member/mentor], joined_at)
- `project_milestones` (project_id, title, due_date, status, order_index)
- `project_applications` (project_id, user_id, message, status[pending/accepted/rejected])

**신규 API**:
- `POST /projects/{id}/apply` — 참여 신청
- `GET /projects/{id}/members` — 팀원 목록 (리더만)
- `PUT /projects/{id}/applications/{aid}` — 수락/거절
- `GET /projects/{id}/milestones`, `POST /projects/{id}/milestones`

**프론트**:
- P-25 `/projects/[id]` 상세 확장: 팀원 섹션 + 지원 버튼 + 마일스톤 진행 표시
- `GET /users/me/projects` 쿼리 확장 → `project_members` 조인으로 리더+멤버 모두 반환

### 11.5 P1 — BF-5 봉사 신청/확정 (3일)

**신규 테이블**:
- `volunteer_participations` (activity_id, user_id, status[applied/confirmed/completed/cancelled], applied_at, confirmed_hours)

**신규 API**:
- `POST /volunteers/{id}/apply`
- `DELETE /volunteers/{id}/apply` — 신청 취소
- `PUT /volunteers/{id}/participations/{pid}` — 운영자 확정/시간 기록
- `GET /users/me/volunteers` — 복원 (Sprint 2에서 projects로 대체되었던 항목)

**프론트**:
- P-16 `/volunteers/[id]` 상세 + 신청 폼
- `/user/dashboard`에 `my_volunteer_hours` 실제 집계 연동 (현재 0 고정)

### 11.6 P2 — BF-6 포트폴리오 MVP (2일)

**접근**: 별도 테이블 없이 기존 `issues/projects/volunteer_participations`를 사용자별로 집계하는 `GET /users/{id}/portfolio` 읽기 전용 API부터 시작.

- 공개 프로필: `/u/{username}` 또는 `/portfolio/{user_id}`
- P-17 포트폴리오 페이지 — 내 이슈 + 참여 프로젝트 + 봉사 시간 타임라인
- PDF/이미지 내보내기는 Sprint 4 이월

### 11.7 P2 — Refresh Token 블랙리스트 (1일)

- JWT에 `jti` 클레임 추가
- Redis `SETEX blacklist:{jti} <ttl>` 로그아웃 시
- `decode_token()` 검증 단계에서 블랙리스트 조회
- 현재 stateless 운영 → 로그아웃 즉시 무효화로 전환

### 11.8 Sprint 3 범위 제외 (Sprint 4+ 이월)

- VMS/1365 실연동 (API 키 확보 대기)
- 카카오맵 (P-05 지도 뷰)
- OAuth 실연동 (client_id 확보)
- 관리자 KPI 대시보드 (P-30)
- TipTap 이미지 업로드 편집기 내부화 (현재는 URL 입력)
- PDF 포트폴리오 내보내기

### 11.9 Sprint 3 구현 순서 (10 영업일)

**Week 5 — Backend 우선**
1. Day 1: Rate Limit 코어 + 쓰기 API 적용 + 단위 테스트
2. Day 2: Rate Limit 인증 API 적용 + SMTP 헬퍼
3. Day 3: Alembic 0004 (project_members, milestones, applications, volunteer_participations)
4. Day 4: BF-3 프로젝트 API (apply/members/milestones)
5. Day 5: BF-5 봉사 API (apply/confirm) + /users/me/volunteers 복원

**Week 6 — Frontend + 마무리**
6. Day 6: P-25 프로젝트 상세 확장 + 지원 UI
7. Day 7: P-16 봉사 상세 + 신청 + P-17 포트폴리오 MVP
8. Day 8: Refresh token 블랙리스트 + logout 연동
9. Day 9: Sprint 3 통합 스모크 테스트 + 회귀
10. Day 10: `/pdca analyze uscp-v1` + 97% 유지 확인 + Sprint 4 Plan 착수

### 11.10 Sprint 3 DoD

- Rate Limit 적용 후 부하 시나리오에서 429 정상 동작 (1 req/sec 초과 시)
- SMTP dev/prod 환경 분리, 실제 이메일 1건 수신 확인 (prod)
- BF-3/5 E2E 플로우: 사용자 로그인 → 프로젝트 지원 → 리더 수락 → 대시보드 반영
- 봉사 시간이 `/user/dashboard`에 실제로 집계됨 (현재 0 고정 → 실제 값)
- Sprint 2 회귀 없음 (Match Rate ≥ 95% 유지)
- Gap Analysis Match Rate ≥ 90%

### 11.11 Sprint 3 리스크

| 리스크 | 완화 |
|---|---|
| Rate Limit 기본값이 실사용에 너무 촘촘 | Redis 키 prefix로 환경별(dev/prod) 다른 값 적용, 운영 중 조정 가능하게 설계 |
| SMTP 미승인 상태에서 운영 차단 | 개발 환경 콘솔 폴백 유지, feature flag로 분리 |
| BF-3/5 신규 테이블이 Sprint 2 쓰기 API와 충돌 | Alembic 0004 downgrade 스크립트 필수, 사전 staging 적용 |
| Frontend P-17 포트폴리오 범위 확장 유혹 | MVP 원칙 엄수: 집계 카드만, PDF는 Sprint 4 |

---

## 12. Sprint 4 Plan — External Integrations + KPI

> Sprint 3 완료(Match Rate 99%) 후 Sprint 4 범위.
> **원칙**: 외부 의존성(API 키) 있는 항목은 어댑터 패턴으로 구현하고 Mock 모드에서 완전 검증 가능하게 한다.
> P-30 KPI 대시보드(내부 의존성 없음)를 Day 1 최우선 배치.

### 12.1 목표 (2주 · Week 7~8)

| # | 영역 | 항목 | 의존성 | 우선순위 |
|---|---|---|---|:---:|
| S4-1 | **P-30 KPI 대시보드** | 관리자 통계 집계 + 차트 | 내부만 | 🔴 P0 |
| S4-2 | **카카오맵** | P-05 지도 뷰 + 이슈 마커 | Kakao SDK 키 | 🟡 P1 |
| S4-3 | **OAuth 실연동** | 카카오/네이버/구글 콜백 처리 | client_id + secret | 🟡 P1 |
| S4-4 | **VMS/1365 연동** | 봉사 시간 자동 동기화 어댑터 | API 키 | 🟢 P2 |
| S4-5 | **TipTap 이미지 presigned** | 에디터 이미지 업로드 MinIO | 내부만 | 🟢 P2 |

### 12.2 P0 — P-30 KPI 대시보드 (Day 1~2)

**내부 집계만 사용, 외부 의존성 없음** → Sprint 4 최우선.

**집계 지표**:
- 플랫폼 전체: 총 사용자 수, 활성 사용자 (로그인 30일), 총 이슈 수, 해결률(%), 진행 중 프로젝트, 누적 봉사 시간, 성공 사례 수
- 캠퍼스별: 4개 캠퍼스 이슈/프로젝트/봉사 시간 막대
- 카테고리별: 이슈 카테고리 6종 분포 (도넛)
- 시계열: 최근 30일 일별 신규 이슈/신규 사용자 (라인)

**API**: `GET /admin/kpi/summary`, `GET /admin/kpi/campuses`, `GET /admin/kpi/categories`, `GET /admin/kpi/timeseries?days=30` (모두 admin 권한)

**프론트**: `/admin/kpi` 신규 페이지 (recharts 또는 직접 SVG — Sprint 4 범위는 직접 구현으로 의존성 최소화)

### 12.3 P1 — 카카오맵 (Day 3~4)

- 클라이언트 전용 SDK 삽입 (`script` 태그 + `NEXT_PUBLIC_KAKAO_MAP_KEY`)
- 새 라우트 `/issues?view=map` 또는 `/issues` 상단 토글 버튼
- 이슈 `location_lat/lng`가 있는 항목만 마커 렌더, 클릭 시 Popover
- 키 미설정 시 fallback: "지도 보기 준비 중" 메시지

### 12.4 P1 — OAuth 실연동 (Day 5~6)

기존 스텁(501) 교체:
- `GET /auth/oauth/{provider}/callback` — code → access_token 교환 → 프로필 조회 → User upsert → JWT 발급 → 프론트로 redirect with token
- 카카오: `POST https://kauth.kakao.com/oauth/token` + `GET https://kapi.kakao.com/v2/user/me`
- 네이버: `GET https://nid.naver.com/oauth2.0/token` + `GET https://openapi.naver.com/v1/nid/me`
- 구글: `POST https://oauth2.googleapis.com/token` + `GET https://www.googleapis.com/oauth2/v2/userinfo`
- Frontend `/auth/oauth/[provider]` 콜백 페이지에서 쿼리 토큰 → localStorage 저장
- User 모델의 `oauth_provider` / `oauth_id` 실 사용 (이미 컬럼 존재)
- client_id 미설정 시 기존 501 동작 유지 (환경변수 가드)

### 12.5 P2 — VMS/1365 어댑터 (Day 7)

- `backend/app/integrations/vms_client.py` — 어댑터 인터페이스 `VmsClient` (abstract)
- 구현체 2개: `MockVmsClient`, `PortalVmsClient` (1365)
- `VMS_MODE=mock|real` 환경변수로 선택
- 참여 확정 시 자동 동기화: `PUT /volunteers/:id/participations/:pid` → status=completed 진입 시 `vms_client.record_hours(user, hours)` 호출 (실패 허용)
- Mock 모드에서 Sprint 4 DoD 전부 통과 가능

### 12.6 P2 — TipTap 이미지 업로드 (Day 8)

- `POST /admin/upload` (presigned PUT URL 발급, admin only, multipart 불필요)
- TipTapEditor 이미지 버튼 개선: URL 입력 → 파일 선택 + 직접 업로드
- MinIO storage 헬퍼 재사용

### 12.7 Sprint 4 구현 순서 (10 영업일)

**Week 7 — 내부 의존성 우선**
1. Day 1: P-30 KPI 집계 API 4개
2. Day 2: P-30 프론트 (`/admin/kpi`) + 차트 컴포넌트
3. Day 3: 카카오맵 SDK 로더 + P-05 지도 토글
4. Day 4: 지도 마커/Popover + empty state
5. Day 5: OAuth 카카오 실연동 (code→token→user upsert)

**Week 8 — 외부 통합 + 마무리**
6. Day 6: OAuth 네이버/구글 확장 + 프론트 콜백 수신
7. Day 7: VMS/1365 어댑터 + Mock/Real 분기
8. Day 8: TipTap 이미지 업로드 (presigned)
9. Day 9: 통합 스모크 + Sprint 1~3 회귀 확인
10. Day 10: `/pdca analyze` → Sprint 4 최종 + `/pdca report` 확장

### 12.8 Sprint 4 DoD

- P-30 관리자 KPI 페이지에 4개 차트 정상 렌더, 캠퍼스 드릴다운 동작
- 카카오맵 API 키 주입 시 마커 표시, 미설정 시 fallback
- OAuth 3종 중 최소 1개 실연동 로컬 데모 성공 (카카오 우선)
- VMS Mock 모드에서 봉사 완료 → 시간 자동 동기화 로그 확인
- TipTap 에디터에서 이미지 업로드 → MinIO 저장 → 본문 삽입
- Sprint 1~3 회귀 없음 (Match Rate ≥ 95% 유지)
- 새 Gap Analysis ≥ 90%

### 12.9 Sprint 5+ 이월

- PDF 포트폴리오 내보내기 (Playwright 또는 weasyprint)
- WebSocket 실시간 알림 (Notifications 테이블 + SSE)
- E2E 자동화 테스트 (Playwright)
- 성능 최적화 / 부하 테스트
- nginx reverse proxy + HTTPS + 운영 배포

---

## 13. Sprint 5 Plan — Production Deployment Readiness

> Sprint 4 완료(Match Rate **100%**, Perfect Score) 후 Sprint 5 범위.
> **원칙**: 기능 추가 최소화, 운영 배포에 필요한 **인프라 · 관측성 · 안정성**에 집중.
> 2026.12 오픈까지 6주 남음. Sprint 5 종료 시 **staging 환경 배포 가능** 상태 목표.

### 13.1 목표 (2주 · Week 9~10)

| # | 영역 | 항목 | 우선순위 |
|---|---|---|:---:|
| S5-1 | **인프라** | nginx reverse proxy + HTTPS (Let's Encrypt) + docker-compose.prod.yml | 🔴 P0 |
| S5-2 | **CI/CD** | GitHub Actions 빌드/테스트/배포 워크플로 완성 | 🔴 P0 |
| S5-3 | **관측성** | Sentry 연동 + 구조화 로깅 + health endpoint 강화 | 🟡 P1 |
| S5-4 | **성능** | k6 부하 테스트 + DB 인덱스 점검 + Redis 캐시 도입 | 🟡 P1 |
| S5-5 | **BF-6 PDF** | 포트폴리오 PDF 내보내기 (Playwright 서버사이드) | 🟢 P2 |
| S5-6 | **WebSocket** | 실시간 알림 (notifications 테이블 + SSE) | 🟢 P2 |

### 13.2 P0 — nginx + HTTPS (Day 1~2)

**목표**: 외부 도메인에서 HTTPS로 접근 가능한 staging URL 확보.

**작업**:
- `docker-compose.prod.yml` 신규 — nginx 컨테이너 추가
- `nginx/conf.d/uscp.conf`:
  - `server_name` + `listen 443 ssl http2`
  - `/api/v1/*` → backend:8000 proxy
  - `/*` → frontend:3000 proxy
  - WebSocket upgrade header (Sprint 5 P2 대비)
  - gzip, client_max_body_size 10M
- Let's Encrypt via `certbot` (Docker 볼륨 공유) 또는 `acme.sh`
- HTTP → HTTPS 301 redirect
- HSTS 헤더
- env 분리: `.env.prod` 템플릿

**검증**: `curl https://staging.uscp.local/api/v1/health` → 200

### 13.3 P0 — GitHub Actions CI/CD (Day 3)

**작업**:
- `.github/workflows/ci.yml` (기존) 확장:
  - Backend: ruff check + pytest + coverage
  - Frontend: ESLint + tsc --noEmit + next build
  - Docker image build (backend, frontend)
- `.github/workflows/deploy-staging.yml` 신규:
  - main 브랜치 push → SSH 배포 또는 GHCR 이미지 푸시
  - docker compose pull + up -d --no-deps
- Secrets: `SSH_KEY`, `GHCR_TOKEN`, `STAGING_HOST`
- 롤백 스크립트: `scripts/rollback.sh` — 이전 이미지 태그로 복구

### 13.4 P1 — 관측성 (Day 4)

**Sentry**:
- `sentry-sdk[fastapi]` + `@sentry/nextjs`
- `SENTRY_DSN` 환경변수 이미 config.py에 있음 → 활성화만
- 에러 샘플링 100%, 트랜잭션 샘플링 10%

**구조화 로깅**:
- `backend/app/core/logging.py` — JSON 로그 포맷 (structlog)
- request_id 추적 (ASGI middleware)
- Level: INFO 기본, ERROR는 Sentry 자동 전송

**Health 강화**:
- `GET /health/ready` → DB / Redis / MinIO 3종 ping 결과 반환
- Kubernetes readiness probe 호환

### 13.5 P1 — 성능 (Day 5~6)

**k6 부하 테스트**:
- `tests/load/` 디렉토리 신규
- 시나리오: 100 VUs, 5분, 주요 읽기 API 3종 (`/issues`, `/projects`, `/admin/kpi/summary`)
- 목표: p95 < 500ms, 에러율 < 1%

**DB 인덱스 점검**:
- `EXPLAIN ANALYZE`로 느린 쿼리 식별
- 현재 없는 예상 인덱스: `issues(campus_id, status)`, `livinglab_projects(status, phase)`
- Alembic 0005 마이그레이션

**Redis 캐시**:
- `GET /admin/kpi/summary` 5분 TTL (집계 쿼리 가장 무거움)
- `GET /cms/pages/{slug}` 1분 TTL
- 캐시 무효화: CMS 저장 시 명시적 DEL

### 13.6 P2 — BF-6 PDF 내보내기 (Day 7)

- `POST /users/me/portfolio/pdf` — 본인 포트폴리오 PDF 생성
- Playwright Python으로 `/portfolio/{user_id}` 렌더링 후 `page.pdf()`
- MinIO 업로드 후 presigned URL 반환 (7일 유효)
- 무거운 작업 → 백그라운드 태스크 (FastAPI `BackgroundTasks`)
- P-17 프론트에 "PDF 다운로드" 버튼 추가

### 13.7 P2 — WebSocket 실시간 알림 (Day 8)

**테이블 추가** (Alembic 0006):
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    link_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**구현**:
- SSE (Server-Sent Events) 채택 — WebSocket보다 간단, 읽기 전용 알림에 충분
- `GET /notifications/stream` (text/event-stream, 인증 필요)
- Backend: 이슈 댓글/투표/프로젝트 수락 시 notification 생성
- Frontend: `EventSource` 기반 useNotifications hook + Header bell 아이콘

### 13.8 Sprint 5 구현 순서 (10 영업일)

**Week 9 — 인프라 + 관측성**
1. Day 1: docker-compose.prod.yml + nginx 설정
2. Day 2: Let's Encrypt + HTTPS 전환
3. Day 3: GitHub Actions CI/CD (빌드/테스트/배포)
4. Day 4: Sentry + 구조화 로깅 + health ready
5. Day 5: k6 부하 테스트 시나리오 + 초기 실행

**Week 10 — 성능 + 확장 기능 + 마무리**
6. Day 6: DB 인덱스 + Redis 캐시 + 재부하 테스트
7. Day 7: PDF 내보내기 (Playwright)
8. Day 8: WebSocket/SSE 알림 + Alembic 0006
9. Day 9: staging 배포 리허설 + Sprint 1~4 회귀
10. Day 10: `/pdca analyze` → Sprint 5 최종 + `/pdca report`

### 13.9 Sprint 5 DoD

1. `https://staging.uscp.local` HTTPS 200 (nginx + Let's Encrypt)
2. GitHub Actions main push → staging 자동 배포 성공 1회
3. Sentry 대시보드에서 테스트 에러 1건 수신
4. `GET /health/ready` DB/Redis/MinIO 3종 헬스 반환
5. k6 100 VUs × 5분 → p95 < 500ms, 에러율 < 1%
6. Redis 캐시: `/admin/kpi/summary` 2회차 호출 시간 10ms 이하
7. PDF 포트폴리오 다운로드 → 3페이지 이상 PDF 생성
8. SSE 알림: 댓글 작성 → 작성자에게 실시간 수신
9. Sprint 1~4 회귀 없음 (Match Rate ≥ 95%)

### 13.10 Sprint 6~7 이월

- Sprint 6: E2E 자동화 (Playwright) + 보안 감사 + 접근성 WCAG AA
- Sprint 7: 운영 리허설 + 실 도메인 전환 + 사용자 수용 테스트 + v1.0 GA

### 13.11 리스크

| 리스크 | 완화 |
|---|---|
| Let's Encrypt rate limit (staging 도메인 반복 갱신) | Staging 도메인 고정 + certbot renewal 주 1회 |
| CI/CD secret 유출 | GitHub OIDC + 환경별 secret 분리 |
| k6 부하 테스트가 dev DB 손상 | 별도 staging DB 인스턴스 사용 |
| Playwright 컨테이너 크기 (~400MB) | 별도 worker 컨테이너로 격리, 필요 시 serverless 전환 |
| WebSocket/SSE 확장성 (인스턴스 간 브로드캐스트) | Redis Pub/Sub 채널 (Sprint 6에서 고도화) |

---

## 14. Sprint 6 Plan — Quality Hardening (E2E + 보안 + 접근성)

> Sprint 5 완료(Match Rate 96%) 후 Sprint 6.
> **원칙**: 기능 추가 금지, 품질 게이트 강화. Sprint 5 외부 의존성 4건(도메인/Secrets/Sentry/k6)과 병행.
> 2026.12 오픈까지 4주 남음. Sprint 6 종료 시 **UAT 진입 가능** 상태.

### 14.1 목표 (2주 · Week 11~12)

| # | 영역 | 항목 | 우선순위 |
|---|---|---|:---:|
| S6-1 | **E2E 자동화** | Playwright 3개 기본 시나리오 + CI 통합 | 🔴 P0 |
| S6-2 | **보안 감사** | 의존성 스캔 + OWASP Top 10 체크리스트 + 시크릿 점검 | 🔴 P0 |
| S6-3 | **접근성** | 공개 페이지 WCAG 2.1 AA 준수 (axe-core 통과) | 🟡 P1 |
| S6-4 | **i18n 기본** | ko/en 2종 최소 공개 페이지 (Sprint 7 확장) | 🟢 P2 |
| S6-5 | **운영 모니터링** | Sentry 연동 완결 + Grafana/Uptime-Kuma (선택) | 🟢 P2 |

### 14.2 P0 — Playwright E2E (Day 1~3)

**목표**: main 푸시 → staging 배포 → 자동 smoke 검증까지 연결.

**시나리오 (핵심 happy path)**:
1. **공개 영역 탐색** — /, /issues, /projects, /volunteers, /success-cases 렌더 확인
2. **로그인 + 대시보드** — /login → email/password → /user/dashboard 진입 + summary 카드 표시
3. **이슈 등록 → 상세 → 댓글 → 공감** — BF-1 전체 루프 (인증 사용자)

**작업**:
- `frontend/tests/e2e/` 디렉토리 신규
- `playwright.config.ts` — 3개 브라우저(chromium, firefox, webkit), baseURL 환경변수
- `fixtures/auth.ts` — 공통 로그인 fixture (storageState 재사용)
- `tests/e2e/{public,auth,bf1-issue}.spec.ts`
- CI에 `e2e-test` job 추가 (postgres/redis/minio docker services)
- 실행 시간 목표: 3분 이내

### 14.3 P0 — 보안 감사 (Day 4~5)

**작업**:
1. 의존성 스캔
   - Python: `pip-audit` CLI 실행 → HIGH/CRITICAL 0건 목표
   - Node: `npm audit --production` → HIGH 0건
   - GitHub Dependabot 활성화
2. OWASP Top 10 자체 체크리스트 (`docs/security/owasp-checklist.md`)
   - A01 Broken Access Control — 권한 체크 매트릭스
   - A02 Cryptographic Failures — JWT secret 관리
   - A03 Injection — SQLAlchemy ORM 사용 (raw SQL 없음 검증)
   - A04 Insecure Design — Rate Limit + RFC 7807 이미 구현
   - A05 Security Misconfiguration — CORS allow_origins 점검
   - A07 Authentication Failures — bcrypt + JWT jti blacklist 이미 구현
   - A08 SSRF — OAuth callback URL 화이트리스트
3. 시크릿 점검
   - `git-secrets` 또는 `gitleaks` 실행
   - `.env` / `.env.prod` Git ignore 확인
4. Security headers 검증 (nginx 설정 기반)

### 14.4 P1 — 접근성 WCAG 2.1 AA (Day 6~7)

**작업**:
- `@axe-core/playwright` 설치 → E2E 테스트에 접근성 검증 통합
- 공개 페이지 11개 axe-core run → violation 0 목표
- 주요 개선 포인트 (예상):
  - 이미지 alt 속성 누락
  - 폼 label 연결 누락
  - 색상 대비 부족 (text-muted 특히)
  - 키보드 포커스 trap (드롭다운, 모달)
- `docs/accessibility/wcag-report.md` 보고서

### 14.5 P2 — i18n 기본 (Day 8)

- `next-intl` 설치 (App Router 호환)
- `messages/ko.json`, `messages/en.json` — 공개 페이지 키만
- `/[locale]/...` 경로 구조는 **Sprint 7 이월** (v1 완료 후 마이그레이션 비용이 크므로 기본 파일만 준비)
- Header에 언어 선택 스텁 (`useLocale` 훅만)

### 14.6 P2 — Grafana/모니터링 대시보드 (Day 9)

- Sentry 대시보드는 Day 9 기준 프로젝트 생성 + DSN 주입만 필요 (Sprint 5 이월)
- Uptime Kuma 또는 BetterStack 무료 tier 도입 (external synthetic)
- `/health` + `/health/ready` 5분 주기 체크 + Slack 알림 연결

### 14.7 Sprint 6 구현 순서 (10 영업일)

**Week 11 — E2E + 보안**
1. Day 1: Playwright 설치 + `playwright.config.ts` + 공개 탐색 시나리오
2. Day 2: 로그인 + 대시보드 시나리오 + storageState fixture
3. Day 3: BF-1 이슈 등록→상세→댓글→공감 전체 루프 + CI 통합
4. Day 4: 의존성 스캔 (pip-audit + npm audit) + Dependabot 설정
5. Day 5: OWASP 체크리스트 + gitleaks 1회 + nginx security header 검증

**Week 12 — 접근성 + 마무리**
6. Day 6: axe-core 통합 + 공개 페이지 스캔 + violations 수집
7. Day 7: 접근성 수정 (alt/label/contrast) + 재검증
8. Day 8: next-intl 기본 세팅 + ko/en 메시지 파일
9. Day 9: Sentry 실 DSN 연동 + Uptime Kuma 스텁
10. Day 10: `/pdca analyze` → Sprint 6 최종 + `/pdca report` 확장

### 14.8 Sprint 6 DoD

1. `npx playwright test` 3개 시나리오 전부 통과 (local + CI)
2. CI e2e-test job 평균 실행 시간 < 3분
3. pip-audit + npm audit HIGH/CRITICAL 0건
4. gitleaks 스캔 클린 (0 findings)
5. OWASP 10대 항목 체크리스트 작성 완료
6. axe-core 공개 페이지 11개 violation 0
7. next-intl 설치 + ko/en 공용 키 2세트 저장
8. Sentry 테스트 에러 1건 수신 (실 DSN, Sprint 5 이월 해결)
9. Sprint 1~5 회귀 없음 (Match Rate ≥ 95%)

### 14.9 Sprint 7 이월 (v1.0 GA)

- 실 도메인 전환 (DNS 스위치)
- UAT (사용자 수용 테스트)
- 성능 최종 튜닝 (Sentry 트랜잭션 분석 후)
- 데이터 이관 (stage → prod)
- 실 OAuth client_id 운영 환경 주입
- VMS/1365 실연동 (외부 기관 협의 필요)
- i18n 전체 페이지 확장
- v1.0 GA 런칭

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-11 | Initial draft — mockup 31개 화면 기반 v1 범위 확정 | sangincha |
| 0.2 | 2026-04-11 | §11 Sprint 3 Plan 추가 — Rate Limit P0, BF-3/5/6 P1~P2 | sangincha |
| 0.3 | 2026-04-12 | §12 Sprint 4 Plan 추가 — KPI, 카카오맵, OAuth, VMS/1365 | sangincha |
| 0.4 | 2026-04-12 | §13 Sprint 5 Plan 추가 — 운영 배포 준비 (nginx/HTTPS/CI-CD/PDF/WS/부하) | sangincha |
| 0.5 | 2026-04-12 | §14 Sprint 6 Plan 추가 — E2E/보안/접근성/모니터링 대시보드 | sangincha |
