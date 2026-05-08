# USCP v2 Planning Document

> **Summary**: v1 요구사항 점검에서 도출된 미구현 3개 + 부분구현 5개 항목을 구현하여 고객 질의서(v1_answer.md) 전체 요구사항 100% 달성
>
> **Project**: deep-sos (SOS랩 / USCP)
> **Version**: v2.0
> **Author**: sangincha
> **Date**: 2026-04-13
> **Status**: Draft
> **선행 문서**:
> - [uscp-v1.plan.md](uscp-v1.plan.md) — v1 Plan (Sprint 0~7)
> - [uscp-v1.report.md](../../04-report/features/uscp-v1.report.md) — v1 완료 보고서 (97%)
> - [v1_answer.md](../../v1_answer.md) — 고객 요구사항 답변 (38개 질문)
> - [requirements-interview.md](../../00-discovery/requirements-interview.md) — 요구사항 질의서

---

## 1. Overview

### 1.1 Purpose

USCP v1(Sprint 0~6, Match Rate 97%)에서 구현된 핵심 기능 위에 **고객 질의서 답변에서 요구했으나 v1에서 미구현/부분구현된 8개 항목**을 완성한다.

### 1.2 Background

v1 완료 후 요구사항 질의서 대조 점검 결과:

| 상태 | 항목 수 | 비율 |
|------|:-------:|:----:|
| 구현 완료 | 9개 | 53% |
| **부분 구현** | **5개** | **29%** |
| **미구현** | **3개** | **18%** |

v1에서 구현 완료된 9개 항목(Q1 종합플랫폼, Q2 역할체계, Q6 투표/기록, Q7 문제등록, Q19 VMS, Q20 봉사, Q24 성공사례, Q25 정책기록, Q30 권한)은 v2 범위에서 제외.

### 1.3 v1 → v2 Gap 근거

| 질의 | 요구사항 | v1 상태 | v2 액션 |
|------|----------|---------|---------|
| Q11 | MOU 협약 관리 | **미구현** | 신규 개발 |
| Q16 | 온라인 협업 도구 (아이디어 보드) | **미구현** | 신규 개발 |
| Q22 | ESG 활동~성과보고 전체 관리 | **미구현** | 신규 개발 |
| Q5 | 전체 사업 포함 (ESG/사업화) | 부분 구현 | 모델 확장 |
| Q8 | 이슈→프로젝트 전환 워크플로우 | 부분 구현 | API 추가 |
| Q10 | 참여 기관 관리 | 부분 구현 | 전용 모델/CRUD |
| Q12 | 5단계 프로젝트 전체관리 | 부분 구현 | 서브모델 추가 |
| Q23 | KPI 목표 대비 달성률 | 부분 구현 | 타겟 모델 추가 |

---

## 2. Scope

### 2.1 In Scope (v2.0)

#### 신규 페이지 (6개)

| ID | 페이지 | 영역 | 근거 |
|----|--------|------|------|
| P-14 | 현장 피드백 등록 (설문/체크/사진/메모) | 사용자 | Q12 |
| P-15 | 아이디어 보드 (Co-creation) | 사용자 | Q16 |
| P-23 | 이슈 처리 상세 (상태 변경, 프로젝트 전환) | 관리자 | Q8 |
| P-24 | 프로젝트 관리 (5단계 칸반) | 관리자 | Q12 |
| P-27 | 참여 기관·MOU 관리 | 관리자 | Q10, Q11 |
| P-31 | ESG 프로그램 관리 | 관리자 | Q22 |

#### 신규 DB 모델 (7개)

| 모델 | 설명 | 근거 |
|------|------|------|
| `organizations` | 참여 기관 (지자체, 기업, 연구기관) | Q10 |
| `mou_agreements` | MOU 협약 (기관, 기간, 상태) | Q11 |
| `project_deliverables` | 프로젝트 산출물 (파일, 유형, 단계) | Q12 |
| `project_feedbacks` | 현장 피드백 (설문/체크/사진/메모 4종) | Q12 |
| `idea_boards` / `idea_cards` | 아이디어 보드 + 카드 (투표, 이동) | Q16 |
| `esg_programs` | ESG 프로그램 (활동 등록~성과보고) | Q22 |
| `kpi_targets` | KPI 목표치 (연도별 목표 vs 달성) | Q23 |

#### 신규 API (예상 28개)

| 그룹 | 엔드포인트 수 | 근거 |
|------|:----------:|------|
| 기관 관리 CRUD | 4개 | Q10 |
| MOU 관리 CRUD | 4개 | Q11 |
| 프로젝트 전체관리 (CRUD + 산출물 + 피드백) | 6개 | Q8, Q12 |
| 아이디어 보드 (보드 CRUD + 카드 CRUD + 투표) | 6개 | Q16 |
| ESG 프로그램 관리 (CRUD + 성과 기록) | 5개 | Q22 |
| KPI 타겟 관리 (CRUD + 달성률 집계) | 3개 | Q23 |

#### 기존 API 보강 (4개)

| API | 변경 내용 | 근거 |
|-----|----------|------|
| `POST /admin/issues/{id}/convert-to-project` | 이슈→프로젝트 전환 | Q8 |
| `PATCH /admin/issues/{id}/status` | 관리자 이슈 상태 변경 | Q8 |
| `PATCH /admin/issues/{id}/assign` | 관리자 담당자 배정 | Q8 |
| `GET /admin/kpi/targets` | KPI 목표 대비 달성률 | Q23 |

### 2.2 Out of Scope (v2에서 제외 · v3 이후)

- ❌ 학교 SSO 통합 (독자 로그인 유지)
- ❌ 융합연구 그룹 관리
- ❌ ODA 사업 자체 관리
- ❌ 모바일 네이티브 앱
- ❌ AI 의견 분석
- ❌ 다국어 전체 확장 (i18n 기반만 v1에서 완료)
- ❌ 사업화 전용 엔티티 (maker_stage 필드로 대체, Q17 부분 충족)

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-ORG: 참여 기관 관리 (Q10, Q11)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-ORG-01 | 참여 기관 CRUD (이름, 유형, 연락처, 주소) | P0 | Q10, P-27 |
| FR-ORG-02 | 기관 유형 분류 (지자체/기업/연구기관/NGO) | P0 | Q10 |
| FR-ORG-03 | 프로젝트에 기관 연결 (M:N) | P1 | Q10 |
| FR-ORG-04 | MOU 협약 CRUD (기관, 시작일, 종료일, 상태) | P0 | Q11 |
| FR-ORG-05 | MOU 상태 관리 (협의중/체결/만료/해지) | P0 | Q11 |
| FR-ORG-06 | MOU 만료 알림 (30일 전) | P2 | Q11 |

#### FR-PRJ-EX: 프로젝트 확장 (Q8, Q12)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-PRJ-EX-01 | 프로젝트 CRUD (관리자) | P0 | Q12, P-24 |
| FR-PRJ-EX-02 | 이슈→프로젝트 전환 API | P0 | Q8, P-23 |
| FR-PRJ-EX-03 | 이슈 상태 변경 API (관리자) | P0 | Q8, P-23 |
| FR-PRJ-EX-04 | 이슈 담당자 배정 API | P1 | Q8, P-23 |
| FR-PRJ-EX-05 | 프로젝트 산출물 CRUD (파일, 유형, 단계별) | P1 | Q12 |
| FR-PRJ-EX-06 | 프로젝트 일정 마일스톤 확장 (시작일/종료일/완료율) | P1 | Q12 |
| FR-PRJ-EX-07 | 프로젝트 5단계 칸반 뷰 (관리자) | P1 | Q12, P-24 |

#### FR-FB: 현장 피드백 (Q12)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-FB-01 | 피드백 등록 (설문/체크리스트/사진/메모 4종) | P1 | Q12, P-14 |
| FR-FB-02 | 피드백 목록 (프로젝트별 타임라인) | P1 | Q12, P-14 |
| FR-FB-03 | 피드백 템플릿 관리 (관리자) | P2 | Q12 |

#### FR-IDEA: 아이디어 보드 (Q16)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-IDEA-01 | 보드 CRUD (프로젝트당 1개 이상) | P1 | Q16, P-15 |
| FR-IDEA-02 | 카드 추가/수정/삭제 (제목, 설명, 색상) | P1 | Q16, P-15 |
| FR-IDEA-03 | 카드 드래그 이동 (열 간) | P1 | Q16, P-15 |
| FR-IDEA-04 | 카드 투표 (참여자 동의/반대) | P1 | Q16, P-15 |
| FR-IDEA-05 | 보드 뷰 (칸반 or 자유 배치) | P2 | Q16 |

#### FR-ESG: ESG 프로그램 관리 (Q22)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-ESG-01 | ESG 프로그램 CRUD (이름, 유형, 기간, SDG 연결) | P1 | Q22, P-31 |
| FR-ESG-02 | 프로그램 활동 기록 (날짜, 참여자, 결과) | P1 | Q22 |
| FR-ESG-03 | SDGs 달성 현황판 (17개 목표별 활동 매핑) | P1 | Q22, Q5 |
| FR-ESG-04 | ESG 성과 보고서 생성 (PDF 또는 화면) | P2 | Q22 |

#### FR-KPI-EX: KPI 확장 (Q23)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-KPI-EX-01 | KPI 목표치 CRUD (지표명, 연도, 목표값) | P1 | Q23, P-30 |
| FR-KPI-EX-02 | 목표 대비 달성률 자동 계산 | P1 | Q23 |
| FR-KPI-EX-03 | KPI 대시보드에 목표/달성 비교 차트 | P1 | Q23, P-30 |

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | v1 기존 기능 회귀 없음 | 모든 E2E 테스트 통과 |
| NFR-02 | 신규 API 응답 시간 | p95 < 500ms |
| NFR-03 | 아이디어 보드 실시간 업데이트 | SSE (기존 인프라 활용) |
| NFR-04 | 신규 테이블 마이그레이션 | Alembic 0007+ |
| NFR-05 | OWASP 체크리스트 유지 | 신규 API 포함 갱신 |

---

## 4. Sprint Plan

### 4.1 Sprint 구성 (4 Sprint, 8주)

| Sprint | 기간 | 범위 | 우선순위 |
|--------|------|------|---------|
| **Sprint 8** | Week 13~14 | 기관·MOU + 이슈 워크플로우 확장 | P0 |
| **Sprint 9** | Week 15~16 | 프로젝트 전체관리 (산출물/피드백/칸반) | P1 |
| **Sprint 10** | Week 17~18 | 아이디어 보드 + ESG 프로그램 | P1 |
| **Sprint 11** | Week 19~20 | KPI 목표 관리 + 통합 테스트 + UAT | P1 |

### 4.2 Sprint 8 — 기관·MOU + 이슈 워크플로우 (P0)

**목표**: Q10, Q11, Q8 완전 구현

#### 신규 DB (Alembic 0007)
- `organizations` (id, name, type, contact_name, contact_email, phone, address, website, campus_id, created_at)
- `mou_agreements` (id, organization_id FK, title, start_date, end_date, status, document_url, notes, created_at)
- `project_organizations` (project_id FK, organization_id FK) — M:N 연결 테이블

#### 신규 API (12개)
- **기관 CRUD** (4): GET list, GET detail, POST create, PUT update, DELETE
- **MOU CRUD** (4): GET list, GET detail, POST create, PUT update
- **이슈 워크플로우** (4):
  - `PATCH /admin/issues/{id}/status` — 상태 변경 (submitted→reviewing→assigned→...)
  - `PATCH /admin/issues/{id}/assign` — 담당자 배정
  - `POST /admin/issues/{id}/convert-to-project` — 이슈→프로젝트 자동 전환 (제목/설명/카테고리 복사)
  - `GET /admin/issues?status=reviewing` — 관리자 이슈 필터

#### 신규 페이지 (2)
- P-23 이슈 처리 상세 (관리자)
- P-27 참여 기관·MOU 관리 (관리자)

#### Sprint 8 DoD
1. 기관 CRUD API 4개 동작
2. MOU CRUD API 4개 + 상태 전이 (협의중→체결→만료)
3. 이슈→프로젝트 전환 API 1건 성공
4. 이슈 상태 변경 + 담당자 배정 동작
5. P-23, P-27 페이지 렌더링
6. Alembic 0007 마이그레이션 성공
7. v1 E2E 회귀 없음

### 4.3 Sprint 9 — 프로젝트 전체관리 (P1)

**목표**: Q12 완전 구현

#### 신규 DB (Alembic 0008)
- `project_deliverables` (id, project_id FK, title, description, file_url, deliverable_type, phase, created_by FK, created_at)
- `project_feedbacks` (id, project_id FK, feedback_type ENUM(survey/checklist/photo/memo), title, content_json, image_urls, created_by FK, created_at)

#### 신규 API (6개)
- 산출물 CRUD (3): GET list, POST create, DELETE
- 피드백 CRUD (3): GET list, POST create, DELETE

#### 신규 페이지 (2)
- P-14 현장 피드백 등록
- P-24 프로젝트 관리 칸반 (5단계 드래그)

#### 기존 확장
- `project_milestones` 테이블: `progress_pct` 컬럼 추가
- P-08 프로젝트 상세: 산출물/피드백 탭 추가

#### Sprint 9 DoD
1. 산출물 등록 + 파일 업로드 (MinIO) 동작
2. 피드백 4종 (설문/체크/사진/메모) 등록 동작
3. 5단계 칸반 뷰 렌더링 + 드래그 상태 변경
4. P-14, P-24 페이지 동작
5. v1 E2E 회귀 없음

### 4.4 Sprint 10 — 아이디어 보드 + ESG (P1)

**목표**: Q16, Q22 완전 구현

#### 신규 DB (Alembic 0009)
- `idea_boards` (id, project_id FK, title, description, created_at)
- `idea_cards` (id, board_id FK, title, description, color, column_name, position, created_by FK, created_at)
- `idea_card_votes` (id, card_id FK, user_id FK, vote_type ENUM(agree/disagree), created_at)
- `esg_programs` (id, title, description, program_type, sdg_goals ARRAY, start_date, end_date, campus_id FK, status, created_at)
- `esg_activities` (id, program_id FK, title, activity_date, participants_count, result_summary, created_at)

#### 신규 API (11개)
- 아이디어 보드 (6): board CRUD 2 + card CRUD 3 + vote 1
- ESG 프로그램 (5): program CRUD 4 + activity 1

#### 신규 페이지 (2)
- P-15 아이디어 보드 (카드 추가/이동/투표)
- P-31 ESG 프로그램 관리

#### Sprint 10 DoD
1. 아이디어 카드 추가/이동/투표 동작
2. ESG 프로그램 CRUD + SDG 연결 동작
3. ESG 활동 기록 등록 동작
4. P-15, P-31 페이지 동작
5. v1 E2E 회귀 없음

### 4.5 Sprint 11 — KPI 목표 + 통합 검증 (P1)

**목표**: Q23 완전 구현 + 전체 통합 UAT

#### 신규 DB (Alembic 0010)
- `kpi_targets` (id, metric_name, year, target_value, unit, campus_id FK, created_at)

#### 신규 API (3개)
- KPI 타겟 CRUD (2): GET list, POST upsert
- KPI 달성률 (1): `GET /admin/kpi/achievement` (타겟 vs 실제 비교)

#### 기존 확장
- P-30 KPI 대시보드: 목표 대비 달성률 비교 차트 추가

#### Sprint 11 DoD
1. KPI 목표 등록 + 달성률 자동 계산 동작
2. P-30 대시보드에 목표/달성 비교 차트 표시
3. 전체 신규 API E2E 테스트 작성
4. OWASP 체크리스트 갱신 (신규 API 포함)
5. **요구사항 질의서 38개 항목 100% 대조 완료**
6. Match Rate >= 95%

---

## 5. Metrics

### 5.1 구현 규모 예측

| 메트릭 | v1 (현재) | v2 추가 | v2 합계 |
|--------|:--------:|:------:|:------:|
| Backend API | 62개 | +32개 | ~94개 |
| Frontend 라우트 | 24개 | +6개 | ~30개 |
| DB 테이블 | 16개 | +7개 (+4 migration) | ~23개 |
| E2E 시나리오 | 14개 | +8개 | ~22개 |

### 5.2 일정 요약

| 마일스톤 | 일정 | 상태 |
|---------|------|------|
| v1 완료 (Sprint 0~6) | 2026-03 ~ 2026-04 | ✅ 완료 (97%) |
| v1 UAT (Sprint 7) | 2026-04 ~ 2026-05 | 진행 예정 |
| **v2 개발 (Sprint 8~11)** | **2026-05 ~ 2026-07** | **Plan** |
| v2 UAT + GA | 2026-07 ~ 2026-08 | 예정 |
| 1차 오픈 | **2026-12** (고객 요청) | 목표 |

### 5.3 리스크

| 리스크 | 영향도 | 완화 전략 |
|--------|:------:|----------|
| 아이디어 보드 실시간 동기화 | Medium | SSE 기존 인프라 활용 (WebSocket 불필요) |
| ESG 프로그램 범위 확장 | Medium | Q22 답변 기준 "활동 등록~성과 보고"로 한정 |
| 5단계 칸반 드래그 복잡도 | Low | react-beautiful-dnd 또는 @dnd-kit 활용 |
| v1 회귀 | Medium | 매 Sprint E2E + gap-detector 실행 |

---

## 6. 요구사항 매핑 (질의서 전체)

### 6.1 완료 예상 커버리지

| 질의서 항목 | v1 상태 | v2 후 상태 | 담당 Sprint |
|------------|:-------:|:---------:|:----------:|
| Q1 종합 플랫폼 | ✅ | ✅ | — |
| Q2 역할 체계 | ✅ | ✅ | — |
| Q5 전체 사업 포함 | ⚠️ | ✅ | S10 (ESG) |
| Q6 투표/기록/투명성 | ✅ | ✅ | — |
| Q7 시민+관리자 등록 | ✅ | ✅ | — |
| Q8 이슈→프로젝트 전환 | ⚠️ | ✅ | **S8** |
| Q10 참여 기관 관리 | ⚠️ | ✅ | **S8** |
| Q11 MOU 협약 관리 | ❌ | ✅ | **S8** |
| Q12 5단계 전체관리 | ⚠️ | ✅ | **S9** |
| Q16 온라인 협업 도구 | ❌ | ✅ | **S10** |
| Q17 사업화 추적 | ⚠️ | ⚠️ | — (maker_stage 유지) |
| Q19 VMS/1365 자동전송 | ✅ | ✅ | — |
| Q20 리빙랩+봉사 | ✅ | ✅ | — |
| Q22 ESG 전체 관리 | ❌ | ✅ | **S10** |
| Q23 KPI 목표 관리 | ⚠️ | ✅ | **S11** |
| Q24 성공사례 공개 | ✅ | ✅ | — |
| Q25 정책 반영 기록 | ✅ | ✅ | — |
| Q30 게시글 권한 | ✅ | ✅ | — |

**v2 완료 후**: 17/18 항목 ✅ (94%), Q17만 ⚠️ (maker_stage 필드로 부분 충족, 전용 엔티티는 v3)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-13 | Initial draft — v1 Gap 분석 기반 v2 Plan 수립 | sangincha |
