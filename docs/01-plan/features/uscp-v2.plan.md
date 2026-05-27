---
template: plan
version: 1.0
feature: uscp-v2
date: 2026-05-27
author: 당사 PM
project: USCP (Union Social Contribution Platform)
status: Draft
basis: USCP_견적서_20260516.xlsx (부가세 포함 5,500만 원)
supersedes: docs/archive/2026-05/uscp-v2-deliverables/ (산출물 작성 PDCA 완료)
---

# USCP V2 — 플랫폼 시스템 구축 사업 계획

> **Summary**: 2026-05-16 발주처 견적 최종 합의(부가세 포함 5,500만 원, 공급가 5,000만 원) 기준으로 USCP 플랫폼을 9개 모듈·116개 기능·24개 화면 규모로 실제 구축한다. 이전 PDCA(`uscp-v2-deliverables`)는 발주처 산출물 작성이 목적이었고 완료(Match Rate 97%)되어 archive됨.
>
> **Project**: USCP (국립공주대학교 글로컬사업단 지역사회특화센터)
> **Phase**: Build (실제 시스템 구축)
> **Author**: 당사 PM
> **Date**: 2026-05-27
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

본 사업의 목표는 다음 단일 진실 공급원(Authoritative)에 정의된 USCP 플랫폼을 **5,500만 원 합의 범위 내에서 실제로 구축**하는 것이다.

- **메뉴 구조도**: [`docs/01-plan/uscp-sitemap.md`](../uscp-sitemap.md) — 24개 화면
- **기능 목록**: [`docs/01-plan/uscp-feature-list.md`](../uscp-feature-list.md) — 9개 모듈 × 116개 기능
- **사업계획서**: [`docs/00-discovery/uscp-proposal-v2.md`](../../00-discovery/uscp-proposal-v2.md) — V2.2 (현행)
- **견적 정본**: `USCP_견적서_20260516.xlsx`

### 1.2 Background

| 시점 | 이벤트 |
|---|---|
| 2026-04-29 | 한혜진 연구원 USCP 계획안 제출 |
| 2026-05-07 | 사전 협의 (권한·감사·개인정보) |
| 2026-05-11 | 1차 실무 미팅 (28건 결정 — AI/심화 기능 다수 제외) |
| 2026-05-14 | V2.0 산출물 PDCA 완료 (`uscp-v2-deliverables` archived) |
| 2026-05-15 | V2.2 개정 (5,000만 원 공급가 한도·VAT 별도·FP 기반 산정) |
| **2026-05-16** | **견적 최종 합의: 부가세 포함 5,500만 원** |
| 2026-05-27 | 메뉴 구조도·기능 목록 현행화, **본 PDCA(시스템 구축) 시작** |

### 1.3 합의 결과 요약 (사업 범위)

| 항목 | 합의 결과 |
|---|---|
| 합의 금액 | **부가세 포함 5,500만 원** (공급가 5,000만 + VAT 500만) |
| 구축비 | 38,000,000원 (분석·설계 1.5 M/M + 개발 9모듈 8.0 + 시범운영 1.0 = 10.5 M/M) |
| 유지보수 | 12,000,000원 (1년차 무상 + 2~3년차 Basic 월 50만 × 24개월 = 1,200만) |
| 총 M/M | 12.9 M/M |
| 사업 기간 | 2026 1Q 분석·설계 → 2~3Q 개발 → 4Q 시범운영 → 2027~2029 유지보수 |
| **오픈 목표일** | **2026-08-20 정식 오픈** (시범운영 단축 — 일정 부담 6건 §2.2.5로 제외) |
| 운영 모델 | 운영자 단일 역할, 의제 6단계, 5개 지역, 이메일 단일 알림, 자체 회원가입 |

### 1.4 Related Documents

- 견적 정본: `USCP_견적서_20260516.xlsx`
- 사이트맵: `docs/01-plan/uscp-sitemap.md`
- 기능 목록: `docs/01-plan/uscp-feature-list.md`
- 사업계획서(현행): `docs/00-discovery/uscp-proposal-v2.md`
- 기존 코드 베이스: `backend/` (FastAPI), `frontend/` (Next.js 15), `docker-compose.yml`
- 인프라 산정: 본 세션 대화 (8 vCPU / 16GB RAM / 250GB NVMe SSD)
- 직전 PDCA 보관: `docs/archive/2026-05/uscp-v2-deliverables/_INDEX.md`

---

## 2. Scope

### 2.1 In Scope (5,500만 원 합의 범위)

#### 2.1.1 분석·설계 (1.5 M/M)
- 요구사항 분석, UI 설계, 메뉴 구조 확정, DB 설계, 소개 페이지 작성

#### 2.1.2 개발 9개 모듈 (8.0 M/M, 116 기능)

| 견적서 # | 모듈 | M/M | 핵심 산출물 |
|:---:|---|---:|---|
| **row 2** | M01. 회원·인증 | 0.7 | 이메일 회원가입·로그인·통합 동의·프로필·탈퇴·**비밀번호 보안 정책** (13 기능) |
| **row 3** | M02. 제보·게이트키핑 | 1.8 | 5개 지역 제보·6단계 워크플로우·공감·댓글·트랙 라벨 3종·**키워드 검색**·**댓글 종결 처리**·이메일 알림 (21 기능) |
| **row 4** | M03. 리빙랩 운영 | 1.4 | 등록·타임라인·산출물 DB·성공사례 4단계·**프로젝트별 게시판(멤버 전용)** (18 기능) |
| **row 5** | M04. 멘토·학생팀 매칭 | 0.8 | 멘토 자격 부여·학생팀 편성·수동 매칭·이메일 통보 (9 기능) |
| **row 6** | M05. 협력 네트워크 | 0.4 | 협력기관(등록·수정·삭제·활성 토글)·MOU·프로그램·커뮤니티 (9 기능) |
| **row 7** | M06. 성과자료 | 0.5 | 성과지표·실적 입력·자동 집계·엑셀 다운로드 (8 기능) |
| **row 8** | M07. 콘텐츠 관리 | 1.2 | WYSIWYG 공지·이벤트·약관 버전·재동의 모달·배너·**자료실(카테고리·다운로드 카운트)** (16 기능) |
| **row 9** | M08. 권한·감사 | 0.3 | 단일 역할·로그인 이력·게이트키핑 이력·1년 보관·**WCAG 2.1 AA** (10 기능) |
| **row 10** | M09. 공통 컴포넌트 | 0.9 | 홈·통계·5개 지역 지도·이메일 큐·카카오맵·SMTP (12 기능) |

> 견적서 row 번호는 `USCP_견적서_20260516.xlsx` 시트 "1. 산출내역" 기준. row 1(분석·설계 1.5 M/M), row 11(시범운영 1.0 M/M)은 §2.1.1/§2.1.3 별도 명시. row 12~14는 §2.1.4 유지보수.

#### 2.1.3 시범운영 (1.0 M/M)
- UAT 진행, 피드백 수집·핫픽스, 운영 매뉴얼 작성

#### 2.1.4 유지보수 (2.4 M/M)
- 1년차 무상 (2026.12~2027.12): 버그 수정·서버 장애 대응·경미한 UI 수정
- 2~3년차 Basic (2027.12~2029.12): 월 50만 원 기준 정기 점검·소규모 요청

### 2.2 Out of Scope (본 사업 범위 외 — 4년차 이후 별도 협의)

#### 2.2.1 1차 미팅 합의 제외 사항
- AI 자동화 4종 (챗봇·산출물 분석·자동 수집·프로젝트 지원)
- 봉사활동 관리 (VMS·1365 자원봉사포털 연계, 봉사 시간·증명서)
- JA 교원 관리·리빙랩 교과목 운영·자체 KPI 정의·거버넌스
- 양교 SSO·학사 시스템 연동
- 자동 멘토 매칭 알고리즘, 매칭 수락/거절 워크플로우
- 다단계 권한 매트릭스 (운영자 단일 역할로 통합)
- 비로그인 자유 제보·CAPTCHA·IP 차단
- SMS·카카오 알림톡·푸시 알림·실시간 채팅

#### 2.2.2 8/20 오픈 일정 부담으로 제외 (6건 — 운영 매뉴얼/RFP 위임)
- **GATE-04 제보 보관 (재검토 대기)** — 6단계 + 반려로 충분. 운영 매뉴얼로 대체
- **GATE-09 처리 SLA 임박 표시** — 운영자 1~2명 가정 시 불필요. 7일 룰 운영 매뉴얼 명시
- **GATE-13 다단계 일괄 처리** — UI 복잡도↑, 시범 케이스 적음. 향후 협의
- **LLM-09 산출물 공개/비공개 토글** — 기본 전체 공개, 비공개 필요 시 운영자 임시 삭제
- **BG-MON-05 백업 Slack 알림** — Uptime Kuma로 일부 커버, 인프라 셋업 단계 결정
- **NFR-AVAIL-04 점검 시간대 정책** — 운영 매뉴얼 항목 (시스템 기능 아님)

---

## 3. Requirements

### 3.1 Functional Requirements (모듈별 핵심 요구)

| ID | Requirement | Module | Priority |
|---|---|---|---|
| FR-01 | 이메일 회원가입 시 만 14세 이상 확인 + 개인정보·이용약관 통합 동의 | M01 | High |
| FR-02 | 시민 회원이 5개 지역 중 1개를 선택하여 사진 첨부 제보 등록 | M02 | High |
| FR-03 | 운영자가 6단계 워크플로우(제보→검토중→공개등록→멘토배정→처리중→해결완료) 전환 가능 | M02 | High |
| FR-04 | 단계 변경 시 제보자·운영자에게 이메일 알림 자동 발송 | M02, M09 | High |
| FR-05 | 리빙랩 등록 시 5개 지역 분류·의제(제보) 연결·6단계 의제 연동 | M03 | High |
| FR-06 | 산출물 단계별 분류 업로드 (MinIO 저장), 메타데이터 관리 | M03 | High |
| FR-07 | 운영자가 가입자 중 멘토 자격 부여, 학생팀 직접 편성, 수동 매칭 | M04 | High |
| FR-08 | 협력기관·MOU 등록·생애주기 관리 (만료 임박 알림) | M05 | Medium |
| FR-09 | 성과지표 실적 월별·분기별 입력, 해결완료 자동 집계, 엑셀/CSV 다운로드 | M06 | Medium |
| FR-10 | WYSIWYG 에디터로 공지·이벤트·약관 작성, 약관 버전 관리 | M07 | High |
| FR-11 | 단순 배너 관리 도구 (이미지 업로드·노출 순서·연결 URL) | M07 | Medium |
| FR-12 | 운영자 단일 역할로 모든 관리 기능 접근, 게이트키핑 권한 일괄 부여 | M08 | High |
| FR-13 | 로그인·게이트키핑·개인정보 조회·시스템 활동 로그 1년 보관 | M08 | High |
| FR-14 | 홈 화면 5개 지역 카카오맵 지도, 의제·리빙랩 위치 마커 | M09 | High |
| FR-15 | 비동기 이메일 발송 큐 (재시도 정책 포함), SMTP 연동 | M09 | High |
| FR-16 | 의제 트랙 라벨 (정책반영·정책참고·시민자율 3종) — 운영자가 검토중 진입 시 지정, 단순 라벨 (자동 처리 없음) | M02 | Medium |
| FR-17 | 약관 새 버전 발행 시 회원 재동의 모달 (개인정보보호법 권고 사항) | M07 | High |
| FR-18 | 성과자료 공지·이벤트 통합 게시판 (카테고리 필터 + 카드 뱃지 구분) | M06 | Medium |
| FR-19 | 비밀번호 보안 정책 (복잡도·실패 5회 잠금·세션 TTL·다중 로그인 허용) | M01 | High |
| FR-20 | 제보·게이트키핑 큐 키워드 검색 (PostgreSQL `ILIKE`) | M02 | Medium |
| FR-21 | 댓글로 해결된 제보 자동 종결 처리 (한혜진 CMT-04 명시) | M02 | Medium |
| FR-22 | 협력기관 삭제 (FK 무결성 검증) + 활성·비활성 토글 | M05 | Medium |
| FR-23 | 자료실 카테고리(가이드/양식/툴킷/기타) + 다운로드 카운트 | M07 | Medium |
| FR-24 | WCAG 2.1 AA 접근성 준수 (Lighthouse + axe DevTools, UAT 전 검증) | M08 | High |

### 3.2 Non-Functional Requirements

| Category | Criteria | Target |
|---|---|---|
| 성능 | 페이지 로딩 (LCP) | < 2.5초 (30 동시접속) |
| 성능 | API 응답 시간 (p95) | < 500ms |
| 가용성 | 운영 시간 가용률 | 99% (월 7시간 다운타임 허용) |
| 트래픽 가정 | 동시접속 / 일 방문자 | 20~30 / 200명 |
| 보안 | HTTPS 강제, JWT(Access 1h/Refresh 7d), bcrypt | 필수 |
| 보안 | OWASP Top 10 대응 (XSS·CSRF·SQLi·인증) | 필수 |
| 개인정보 | 통합 동의, 만 14세 이상, 1년 보관, 파기 정책 | 법적 의무 |
| 접근성 | WCAG 2.1 AA (헤딩 구조·키보드 네비게이션·이미지 대체텍스트) | 권장 |
| 반응형 | PC·태블릿·모바일 (Tailwind breakpoints) | 필수 |
| 브라우저 | Chrome, Safari, Edge, Firefox 최신 2버전 | 필수 |
| 운영 | Docker Compose 단일 호스트 + 1일 1회 백업 | 필수 |
| 운영 | Uptime Kuma 모니터링 + Slack 알림 | 권장 |

---

## 4. Success Criteria

### 4.1 Definition of Done (시범운영 종료 기준)

- [ ] 9개 모듈 **116개 기능** 구현 완료 (기능 목록 1:1 매핑)
- [ ] **2026-08-20 정식 오픈 (시범운영 1개월 축소 운영)**
- [ ] WCAG 2.1 AA Lighthouse·axe 검증 통과 (위반 0건)
- [ ] 24개 화면 구현 완료 (사이트맵 1:1 매핑)
- [ ] UAT 통과 (공주대·충남대 학생·교수 시범 참여)
- [ ] 운영 매뉴얼 작성 완료 (관리자용)
- [ ] 5개 지역 동시 운영 가능 상태 확인
- [ ] 보안 점검 통과 (자체 점검 체크리스트)
- [ ] 개인정보처리방침·이용약관 게시 완료
- [ ] 운영 환경 배포 완료 (HTTPS·도메인·SMTP·MinIO 가동)

### 4.2 Quality Criteria

- [ ] Gap Analysis Match Rate ≥ 90%
- [ ] Critical Issues 0건
- [ ] 페이지 LCP < 2.5초 (전체 화면 평균)
- [ ] API p95 응답 시간 < 500ms
- [ ] 단위 테스트 커버리지 ≥ 60% (Critical Path)
- [ ] 운영 환경 Uptime Kuma /health 모니터링 활성

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| 5,500만 원 한도 초과 | High | Medium | 9개 모듈 Out-of-scope 엄격 적용. 추가 요구는 4년차 협의 항목으로 분류 |
| 시범운영 시 발견되는 UX 이슈 | Medium | High | 모달 최소화·고객 여정 최소화 등 UI 표준 선행 적용 (memory: [[feedback_ui-design]]) |
| 게이트키핑 워크플로우 누락 단계 | High | Low | M02 18개 기능을 단계별 e2e 시나리오로 검증 |
| 카카오맵 API 키·정책 변경 | Medium | Low | API 키 환경변수 분리, fallback 정적 지도 이미지 |
| SMTP 발송 실패 (메일 큐 적체) | Medium | Medium | 비동기 큐 + 재시도 (지수 백오프) + Sentry 알림 |
| MinIO 파일 누적으로 디스크 부족 | Medium | Medium | 별도 디스크 마운트, 1년 후 보존 정책 수립 |
| 개인정보 동의 이력 누락 | High | Low | 회원가입·약관 갱신 시 이력 자동 기록 (감사 로그 연동) |
| 운영자 단일 역할 보안 위험 | Medium | Medium | 감사 로그 1년 보관 + 로그인 이력 모니터링 |
| 동시접속 100명 초과 시 응답 저하 | Low | Low | Gunicorn 4 worker → 부하 시 8 worker로 증설 |

---

## 6. Architecture Considerations

### 6.1 Project Level: Enterprise

| Level | Selected |
|---|:---:|
| Starter | ☐ |
| Dynamic | ☐ |
| **Enterprise** | ☑ |

**선정 사유**: 공공·교육 SI 플랫폼, 법적 의무(감사 로그·개인정보), 다영역 모듈 분리. 단, 트래픽 20~30 동시 수준이므로 단일 서버 + 기본 인프라로 충분.

### 6.2 Tech Stack (확정 — 기존 코드 베이스 유지)

| Layer | Stack | Rationale |
|---|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript | SSR·SEO·디자인 시스템 통합 |
| UI | Tailwind CSS + Tiptap (WYSIWYG) + Lucide Icons | 합의된 CMS 요건 충족 |
| State | Zustand + React Query (TanStack) | 단순·캐시 효율 |
| Forms | React Hook Form + Zod | 14세 확인·통합 동의 검증 |
| Charts | Recharts | 대시보드·성과지표 |
| Backend | FastAPI + Python 3.12 + Gunicorn(4w) + Uvicorn | 비동기 고성능·자동 OpenAPI |
| ORM | SQLAlchemy 2.0 (async) + asyncpg + Alembic | 마이그레이션 안전성 |
| DB | PostgreSQL 16 + PostGIS 3.4 | 공간 데이터(5개 지역) |
| Cache | Redis 7 | 세션·rate limit·큐 |
| Storage | MinIO (단일 노드) | 산출물·이미지·약관 첨부 |
| Auth | JWT (Access 1h / Refresh 7d) + bcrypt | 자체 회원가입, SSO 없음 |
| Email | SMTP (외부 또는 자체) + 비동기 큐 | 단계 변경 알림 |
| Map | 카카오맵 API | 한혜진 계획안 명시 |
| Infra | Docker Compose + nginx + Let's Encrypt | 온프레미스 또는 단일 클라우드 VM |
| Monitoring | Uptime Kuma + Slack webhook | 단순 헬스체크·알림 |
| Error Tracking | Sentry (Optional, 환경변수로 toggle) | 운영 안정성 |

### 6.3 Hardware Sizing (운영 환경 확정)

| 항목 | 권장 사양 |
|---|---|
| CPU | 8 vCPU (x86_64) |
| RAM | 16 GB |
| Disk | 250 GB NVMe SSD (시스템·DB) + 250 GB SSD (MinIO·백업) |
| Network | 100 Mbps 대칭, 고정 IP 1개 |
| OS | Ubuntu Server 24.04 LTS |
| 백업 | 일 1회 (pg_dump + MinIO mc mirror), 7일 보관 |

### 6.4 Clean Architecture (Backend)

```
backend/
├── app/
│   ├── presentation/   ← FastAPI Routes (라우터별 분리)
│   │   ├── auth/, users/, issues/, projects/, mentors/,
│   │   ├── organizations/, kpi/, cms/, audit/
│   ├── application/    ← Use Cases (서비스 계층)
│   │   ├── auth_service.py, issue_service.py, gatekeeping_service.py,
│   │   ├── project_service.py, mentor_service.py, ...
│   ├── domain/         ← Entities + Value Objects
│   │   ├── user.py, issue.py, project.py, mentor.py, ...
│   ├── infrastructure/ ← DB·Email·Storage·External APIs
│   │   ├── repositories/, db/, email/, storage/, kakao_map/
│   └── main.py
└── alembic/            ← Migrations
```

### 6.5 Frontend Module Structure

```
frontend/src/
├── app/                ← Next.js App Router (24개 페이지)
│   ├── (public)/       ← 공개 영역 10개
│   ├── (user)/         ← 사용자 영역 3개 (로그인 게이트)
│   └── (admin)/        ← 관리자 영역 11개 (운영자 게이트)
├── components/         ← Atomic + Composite UI
│   ├── ui/             ← Button, Input, Modal, Toast
│   └── shared/         ← Header, Footer, KakaoMap, Editor
├── features/           ← 모듈별 기능 (9개 모듈 매핑)
│   ├── auth/, issues/, projects/, mentors/,
│   ├── organizations/, kpi/, cms/, audit/
├── lib/                ← API client, validators, utils
└── styles/             ← Tailwind config, design tokens
```

---

## 7. Convention Prerequisites

### 7.1 적용 컨벤션 (선행 결정)

- [x] CLAUDE.md 글로벌 가이드 (`~/.claude/CLAUDE.md`)
- [x] bkit Enterprise 출력 스타일
- [x] UI 표준: 모달 최소화 + 고객 여정 최소화 + 모달 header/footer 고정 (memory: [[feedback_ui-design]])
- [ ] Backend 컨벤션: Ruff + Mypy strict (pyproject.toml에 이미 정의)
- [ ] Frontend 컨벤션: ESLint Next.js config + Prettier + tailwind plugin
- [ ] Git 컨벤션: Conventional Commits (feat/fix/docs/refactor/test/chore)
- [ ] 브랜치 전략: `master` + feature 브랜치 + PR 리뷰

### 7.2 분석·설계 단계 산출물 (Design 단계에서 작성)

| 산출물 | 용도 |
|---|---|
| 데이터 모델 ERD | 9개 모듈 엔티티·관계 |
| API 명세 (OpenAPI) | 모듈별 엔드포인트 정의 |
| 화면 와이어프레임 | 24개 화면 인터랙션 |
| 인증·권한 흐름도 | 세션·JWT·운영자 단일 역할 |
| 알림 흐름도 | 6단계 트리거·이메일 큐·재시도 |
| 파일 업로드 흐름도 | MinIO·Presigned URL·메타데이터 |
| 백업·복구 절차서 | pg_dump·mc mirror·복원 시나리오 |

---

## 8. Implementation Order (Build Phase)

```
[Build Phase - 8/20 오픈 압축 일정]
─────────────────────────────────────────────
2026-05 (분석·설계 단축, 2주)
  ├── 요구사항 확정 (5,500만 원 + 8/20 일정 범위 재확인)
  ├── ERD·API 명세·와이어프레임 작성  ← Design 단계 산출물
  ├── 디자인 시스템 토큰·컴포넌트 정의
  └── 인프라 셋업 (운영 VM·도메인·SMTP·MinIO)

2026-06 ~ 2026-07 (개발 Sprint 1~5, 약 8주)
  Week 1~2 (Sprint 1)
    ├── M01. 회원·인증 + M09. 공통 컴포넌트 (헤더·푸터·KakaoMap)
  Week 3~4 (Sprint 2)
    ├── M02. 제보·게이트키핑 (6단계 핵심) — 가장 긴 모듈
  Week 5 (Sprint 3)
    ├── M03. 리빙랩 운영 + 프로젝트 게시판
  Week 6 (Sprint 4)
    ├── M07. 콘텐츠 관리 (공지·이벤트·약관·배너·자료실)
    └── M04. 멘토·학생팀 매칭
  Week 7 (Sprint 5)
    ├── M05. 협력 네트워크 + M06. 성과자료
    └── M08. 권한·감사 + WCAG 검증

2026-08 (시범운영 단축, 2주)
  Week 8 (Pre-launch)
    ├── 통합 테스트·성능 튜닝
    ├── 운영 매뉴얼 작성
  Week 9~10 (UAT)
    ├── UAT (공주대·충남대 학생·교수)
    ├── 피드백 핫픽스
    └── 보안·접근성 최종 점검

2026-08-20: 정식 오픈 ✅

2026-09 ~ 2026-12 (안정화 + 시범운영 연속)
  ├── 사용자 피드백 수집
  ├── 추가 핫픽스
  └── 검수·발주처 인수

[Maintenance Phase - 2027.01 ~ 2029.12]
  ├── 1년차 (~2027.12): 무상 (버그·장애·경미 UI)
  ├── 2년차 (2027.12~2028.12): Basic (월 50만)
  └── 3년차 (2028.12~2029.12): Basic (월 50만)
```

---

## 9. Next Steps

1. [ ] **Design 단계**: `/pdca design uscp-v2` — 데이터 모델·API·화면 와이어프레임·인증/알림 흐름 설계
2. [ ] **Do 단계**: `/pdca do uscp-v2` — Sprint 별 모듈 구현 시작 (M01·M09 우선)
3. [ ] **Check 단계**: Sprint 종료 시마다 `/pdca analyze uscp-v2` — Gap 분석
4. [ ] **Act 단계**: 90% 미만 시 `/pdca iterate uscp-v2`
5. [ ] **Report 단계**: 시범운영 완료 후 `/pdca report uscp-v2`
6. [ ] **Archive 단계**: 발주처 검수 후 `/pdca archive uscp-v2`

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.4 | 2026-05-27 | **100점 달성 + 8/20 오픈 일정 반영**. 한혜진 PDF 누락 7건 신규(M01-13·M02-20/21·M05-09·M07-15/16·M08-10) + 2건 보강(M02-01/05). 일정 부담 6건(GATE-04/09/13·LLM-09·BG-MON-05·NFR-AVAIL-04) §2.2.2로 명시 제외. **2026-08-20 정식 오픈** 일정 §1.3·§4.1·§8에 반영 (12주 압축). FR-19~24 추가. 109 → **116개**. |
| 1.3 | 2026-05-27 | design-validator 96점 달성: §2.1.2 모듈 표에 **견적서 row 번호 컬럼** 추가 (M3 해결, sitemap §6과 정합). |
| 1.2 | 2026-05-27 | design-validator 재검증 결과 반영: **M02-19 의제 트랙 라벨**(VOTE-06 명시 누락), **M07-14 약관 재동의 모달**(법적 권고), **M06-07 공지·이벤트 통합 게시판 명세 보강**. FR-16/17/18 추가. 총 기능 107 → **109개**. 화면 수 24개 유지. |
| 1.1 | 2026-05-27 | M03 프로젝트별 게시판 4개 기능 추가 (한혜진 계획안 LL-02 복구). 총 기능 103 → **107개**. 24개 화면 유지 (탭 통합). |
| 1.0 | 2026-05-27 | 시스템 구축 PDCA 시작 — 5,500만 원 합의본 기준 9개 모듈 103개 기능 24개 화면 |
