---
template: plan
version: 1.2
feature: uscp-v2
date: 2026-05-14
author: 당사 PM
project: USCP (Union Social Contribution Platform)
status: Draft
---

# USCP V2 — RFI 답변서·사업계획서·견적서 v2.0 작성 사업 계획

> **Summary**: 한혜진 연구원 USCP 구축 계획안(2026-04-29)과 1차 실무 미팅(2026-05-11)의 모든 의사결정을 반영한 V2.0 공식 산출물 3종(RFI 답변서·사업계획서·견적서)을 일괄 작성한다.
>
> **Project**: USCP (국립공주대학교 글로컬사업단 지역사회특화센터)
> **Version**: V2.0
> **Author**: 당사 PM
> **Date**: 2026-05-14
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

V1(책임자 시점·탑다운·1인 운영 자동화) 산출물은 한혜진 연구원 신규 계획안(2026-04-29) 제출로 무효화되었다. V2는 다음 두 단계의 의사결정을 종합하여 발주처에 공식 전달할 V2.0 산출물 3종을 작성하는 것을 목표로 한다.

1. **한혜진 계획안 분석** (`docs/00-discovery/han-plan-comparison-analysis.md`)
2. **2026-05-11 1차 실무 미팅 결정 사항** (`docs/00-discovery/han-plan-followup-questions.md` §-1)

V2 산출물은 다음 핵심 변화를 반영해야 한다:
- 운영 모델: 바텀업 비로그인 시민 자유 제보 → **로그인 회원 제보**
- 사업 범위: 4개 캠퍼스 → **5개 지역(천안 추가)** + 양교 협력(공주대+충남대, 단순 협력 기관)
- 운영 단계: 프로젝트 3단계 → **의제 6단계** (제보→검토→공개→멘토→처리→해결)
- 권한 모델: 5종 역할 → **지역사회특화센터 운영자 단일 역할**
- AI 자동화: 4종 → **전체 제외**
- JA 교원·리빙랩 교과목·거버넌스·KPI(당사 정의): **전체 제외**
- CMS: 풀 CMS → **소개 정적 HTML + 공지·이벤트·약관 WYSIWYG 부분 도입**

### 1.2 Background

#### 1.2.1 V1 → V2 전환 배경

| 시점 | 이벤트 | 영향 |
|------|--------|------|
| 2026-04-13 | 발주처 인터뷰 (사업 책임자) — "1인 운영·탑다운·자동화 우선" | V1 산출물 작성 (`_archive/v1-2026-04-pre-han-plan/`) |
| 2026-04-29 | 한혜진 연구원 신규 계획안 제출 — 바텀업·6단계·멘토단 매칭·관리 기능 충실 | V1 산출물 무효화, V2 작업 개시 |
| 2026-05-07 | 사전 협의 — 권한·감사·개인정보 동의 적용 결정 | V2 베이스라인 시나리오 B 확정 (7,600~10,500만 원) |
| 2026-05-08 | 세 문서 정합성 확보 + CMS 의사결정 프레임워크 추가 | followup-questions·feature-list·comparison-analysis 갱신 |
| **2026-05-11** | **1차 실무 미팅 — 모든 핵심 협의 사항 결정** | **V2 견적 5,000~8,500만 원대 추정, V2.0 산출물 작성 가능 상태** |

#### 1.2.2 V1 ↔ V2 관점 전환

V1(책임자 시점)은 "운영 부담 최소화"가 핵심 가치였고, V2(실무자 시점)는 "관리 기능 충실성"이 핵심 가치이다. 운영 인력 가정(1인/다수)은 본 사업 설계 가정에서 제외한다.

### 1.3 Related Documents

- 발주처 계획안: `/(한혜진 플랫폼) USCP 플랫폼 구축 계획(안).pdf` (2026-04-29, 20페이지)
- 비교 분석 보고서: `docs/00-discovery/han-plan-comparison-analysis.md`
- 협의 항목 트래커: `docs/00-discovery/han-plan-followup-questions.md`
- MECE 기능 목록: `docs/00-discovery/han-plan-feature-list.md`
- 1차 미팅 결정 자료: `docs/00-discovery/han-plan-first-meeting-agenda.md`
- V1 산출물 백업: `_archive/v1-2026-04-pre-han-plan/` (참조 금지)
- 발주처 참조 자료: `리빙랩.pdf`, `지역사회특화센터, 리빙랩, 교육 및 연구 분야 요약.pdf`

---

## 2. Scope

### 2.1 In Scope (V2.0 작성 산출물)

- [ ] **uscp-rfi-response-v2.md** — V2 RFI 답변서 (한혜진 계획안 + 1차 미팅 결정 종합 반영)
- [ ] **uscp-proposal-v2.md** — V2 사업계획서 (6단계 의제 라이프사이클·5개 지역·양교 협력·로그인 회원 제보)
- [ ] **estimate-v2.md** — V2 견적서 (시나리오 B' 5,000~8,500만 원대, 단계별·기능별 단가)

### 2.2 Out of Scope

- 시스템 구현 코드 작성 (Do 단계 이후 별도 진행)
- 신규 mockup 제작 (V2 mockup은 발주처 V2.0 산출물 검수 후 별도 작업)
- AI 자동화 4종 (한혜진 계획안 외 결정)
- JA 교원 관리 / 리빙랩 교과목 운영 / KPI(당사 정의) / 거버넌스(회의록)
- 양교 SSO·학사 시스템 연동
- 비로그인 시민 자유 제보 / 어뷰징 방지(CAPTCHA·IP) / 추적 토큰
- 인증 절차 디테일(Q1-04) — RFP 단계 결정
- 알림 수신거부 옵션 구체 구현(Q1-07) — RFP 단계 결정

---

## 3. Requirements

### 3.1 Functional Requirements (V2.0 산출물 작성 요건)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | uscp-rfi-response-v2.md 작성 — 한혜진 계획안 기반 + 1차 미팅 결정 28건 통합 반영 | High | Pending |
| FR-02 | uscp-proposal-v2.md 작성 — 6단계 의제·5개 지역·양교 협력(단순)·로그인 모델 반영 | High | Pending |
| FR-03 | estimate-v2.md 작성 — 시나리오 B' 5,000~8,500만 원, 11개 변동 항목 산식 명시 | High | Pending |
| FR-04 | V2.0 산출물에 V1 잔여 참조 제거 검증 (mockup·proposal·feature-list 등 백업 폴더 참조 금지) | High | Pending |
| FR-05 | 세 산출물 간 핵심 수치 일관성 확보 (지역 5개·역할 단일·견적 동일) | High | Pending |
| FR-06 | RFI 답변서·사업계획서·견적서 부록 — 기능 목록을 한혜진 계획안 기준 + 1차 미팅 변경 사항 반영 | High | Pending |
| FR-07 | 충남대 협력 정책 명시 — MOU 체결·단순 협력 기관·소개 페이지 static HTML 표시 | High | Pending |
| FR-08 | 데이터 소유권 명시 — 공주대 단독 소유·운영·열람권 | High | Pending |
| FR-09 | 개인정보처리방침 정책 반영 — 회원가입 시 통합 동의·만 14세 이상·광고성 정보 없음 | High | Pending |
| FR-10 | CMS 부분 도입 정책 명시 — 소개 정적 HTML·공지/이벤트/약관 WYSIWYG·배너 단순 관리 도구 | Medium | Pending |
| FR-11 | 멘토단·학생팀 정책 명시 — 가입 사용자 중 관리자 선정·수동 매칭·통보형 | Medium | Pending |
| FR-12 | 비기능 요건 반영 — 트래픽 최대 100명·기본 인프라 사양 | Medium | Pending |

### 3.2 Non-Functional Requirements (V2.0 산출물 품질 기준)

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 일관성 | 세 산출물 간 견적·지역·기능 수·역할 수치 동일 | design-validator 에이전트 정합성 검증 |
| 추적성 | 각 결정 사항이 어느 협의에서 결정되었는지 명시 | 본문 내 (2026-05-07/-11 미팅) 표기 |
| 완전성 | 한혜진 계획안 PDF의 모든 명시 기능이 V2.0에 매핑됨 | feature-list.md 219건과 1:1 매핑 검증 |
| 가독성 | RFI 답변서는 비전문가도 이해 가능 (마케팅 문구 절제) | 항목별 1단락 이내, 표 활용 |
| 협의 결과 반영 | 28건 1차 미팅 결정 + 3건 PDF 명시 + 3건 사전 협의 = 34건 모두 반영 | 체크리스트 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] uscp-rfi-response-v2.md 작성 완료 + 1차 미팅 결정 28건 모두 반영
- [ ] uscp-proposal-v2.md 작성 완료 + 6단계 의제·로그인 모델 반영
- [ ] estimate-v2.md 작성 완료 + 시나리오 B' 정밀 산정
- [ ] 세 문서 간 design-validator 일관성 검증 통과 (95+점)
- [ ] V1 백업 폴더 참조 0건 확인
- [ ] 발주처 협의 결정 사항 34건 모두 추적 가능

### 4.2 Quality Criteria

- [ ] 한혜진 계획안 PDF의 모든 명시 기능이 누락 없이 매핑됨
- [ ] 1차 미팅 결정 28건이 산출물 본문에 명시적으로 반영됨
- [ ] V2.0 견적은 단계별 산식 + 11개 변동 항목 명시
- [ ] 충남대 협력 정책·데이터 소유권·개인정보 정책이 RFI 답변서에 명시됨

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| V2.0 산출물에 V1 잔여 표현이 섞임 (AI 자동화 강조·1인 운영 자동화 등) | High | Medium | 작성 후 V1 표현 검색·제거. design-validator 점검 |
| 세 산출물 간 견적·지역·역할 수치 불일치 | High | Medium | 단일 진실 공급원(feature-list.md)을 기준으로 작성. design-validator 정합성 검증 |
| 한혜진 계획안 PDF 신규 기능 일부 누락 | Medium | Low | feature-list.md 219건 항목 체크리스트로 1:1 매핑 검증 |
| 1차 미팅 결정 사항 일부 미반영 | Medium | Low | followup-questions §-1.3 16건 + §-1.5 잔여 12건 결정 + Q5-01·03 = 28+ 결정 모두 RFI에 별도 섹션으로 추적 |
| 발주처 검수 시 V1과의 변화 폭이 크다는 우려 | Medium | Medium | RFI 답변서 첫 페이지에 "한혜진 계획안 + 1차 미팅 결정 종합 반영" 명시 |
| 잔여 디테일(Q1-04 인증 절차·Q1-07 수신거부 등) RFP 단계 결정 항목 처리 | Low | Low | V2.0 산출물에 "RFP 단계에서 확정 예정" 명시. 견적 범위 내 흡수 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| Starter | 단순 정적 사이트 | 포트폴리오·랜딩 | ☐ |
| Dynamic | Feature-based 모듈, BaaS 연동 | 일반 SaaS·MVP | ☐ |
| **Enterprise** | 계층 분리·DI·미세 권한 제어 | **공공·교육 SI 플랫폼** | ☑ |

**선정 사유**: 다수 의제(시민 제보)·다수 협력 기관·법적 의무(감사 로그·개인정보)·온프레미스 운영 요건으로 인해 Enterprise 레벨 적용. 단, 트래픽 100명 수준이므로 단일 서버·기본 인프라로 충분.

### 6.2 Key Architectural Decisions (V2.0 산출물 반영용)

| Decision | V2.0 결정 | Rationale |
|----------|---------|-----------|
| 프론트엔드 | Next.js (React, App Router) | SSR·SEO·디자인 시스템 통합 |
| 백엔드 | FastAPI (Python) | 고성능 비동기·OpenAPI 문서·확장 용이 |
| 데이터베이스 | PostgreSQL | ACID·관계형·공공기관 친화 |
| 인증 | JWT 자체 로그인 (SSO 미적용) | 1차 미팅 결정 |
| 파일 저장소 | 대학 전산실 NAS 또는 로컬 | 온프레미스 정책 |
| 배포 | Docker Compose (온프레미스) | 데이터 주권·이관성 |
| 알림 | 이메일 단일 (SMTP) | 1차 미팅 결정 |
| 지도 | 카카오맵 API | 한혜진 계획안 명시 |
| AI 자동화 | 미적용 | 한혜진 계획안·발주처 결정 |

### 6.3 Clean Architecture Approach

```
Selected Level: Enterprise (트래픽 100명 수준이지만 법적 의무 + 다영역 권한 분리로 인해)

Folder Structure Preview:
backend/
├── presentation/  ← API Routes (FastAPI)
├── application/   ← Use Cases (제보·게이트키핑·멘토 매칭)
├── domain/        ← Entities (User, Report, LivingLab, Mentor)
└── infrastructure/ ← DB·Email·File Storage

frontend/
├── app/           ← Next.js App Router
├── components/    ← UI Components (Atomic)
├── features/      ← Feature modules (citizen-report, gatekeeping)
└── lib/           ← Utilities, API clients
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] CLAUDE.md 글로벌 가이드 존재 (`~/.claude/CLAUDE.md`)
- [x] V1 백업 보존 (`_archive/v1-2026-04-pre-han-plan/`)
- [x] bkit Enterprise 출력 스타일 권장
- [ ] V2 전용 컨벤션 문서 부재 — V2.0 산출물 작성 후 작성 가능

### 7.2 V2.0 산출물 작성 시 컨벤션

| Category | 적용 규칙 | Priority |
|----------|---------|:--------:|
| 견적 표기 | 만 원 단위, 범위 표기 (예: 5,500~8,500만 원), VAT 포함 명시 | High |
| 협의 결과 추적 | 결정 사항 옆에 (2026-05-07 미팅) / (2026-05-11 미팅) 명시 | High |
| 기능 ID 표기 | feature-list.md ID 그대로 사용 (HOM-01, ISS-01, SUB-01 등) | High |
| 표기 통일 | "지역사회특화센터 운영자" / "시민 회원" / "양교 학생·교수" (한혜진 PDF 용어) | Medium |
| 이모지 사용 | 사용자 정책에 따라 절제 — 우선순위는 [필수]/[권장] 텍스트로 | Medium |

### 7.3 V2.0 산출물 표준 섹션 구조

#### uscp-rfi-response-v2.md (RFI 답변서)

```
0. 제출 확인서 (수신·제출자·대표자)
1. 당사 개요
2. 발주처 RFI 이해도
3. 당사 제안 방향
4. 플랫폼 전체 구조 (5개 지역 IA·6단계 의제)
5. 당사 제안 단계별 상세
6. 제안 기술 환경
7. 당사 수행 역량
8. 예상 일정
9. 개략 비용 가이드 (Indicative)
10. 리스크 및 완화 방안
11. 유지보수 방안
12. 납품 산출물
13. 결론 및 당사 차별점
14. 연락처 및 후속 절차
부록 A: V2.0 요구 기능 상세 (한혜진 PDF + 1차 미팅 결정 반영)
부록 B: 1차 미팅 결정 사항 종합 표
부록 C: 유사 수행 실적
```

#### uscp-proposal-v2.md (사업계획서)

```
1. 사업 개요 (목적·배경·운영 원칙)
2. 플랫폼 전체 구조 (IA)
   2.1 사용자 구조 (시민 회원·운영자 단일 역할·멘토·학생팀)
   2.2 공개 영역 (홈·USCP 소개·지역문제 광장·리빙랩·협력·성과자료)
   2.3 사용자 영역 (로그인 후)
   2.4 관리자 영역
3. 단계별 구축 범위 (1차년도 + 운영 고도화)
4. 기술 환경
5. 일정·산출물
부록: 한혜진 PDF + 1차 미팅 결정 종합 기능 목록
```

#### estimate-v2.md (견적서)

```
1. 견적 개요
2. 시나리오 B' (1차 미팅 반영) — 5,000~8,500만 원
3. 단계별 산식
4. 11개 변동 항목 상세
5. 견적 영향 변수 (LLM·SSO·CAPTCHA 등 가산 변수)
6. 유지보수 방안 (무상 1년 + 유상 옵션)
```

---

## 8. Next Steps

1. [ ] **Design 단계**: `/pdca design uscp-v2` 로 V2.0 산출물 작성 상세 설계 — 본 Plan 기반 산출물별 섹션 매핑·작성 순서 결정
2. [ ] **Do 단계**: `/pdca do uscp-v2` 로 V2.0 3종 일괄 작성
3. [ ] **Check 단계**: `/pdca analyze uscp-v2` 로 한혜진 계획안·1차 미팅 결정 vs V2.0 산출물 정합성 분석 (목표 95% 이상)
4. [ ] **Act 단계**: 90% 미만 시 `/pdca iterate uscp-v2` 로 자동 개선
5. [ ] **Report 단계**: `/pdca report uscp-v2` 로 완료 보고서 + 발주처 전달 패키지 작성
6. [ ] **Archive 단계**: 발주처 검수 완료 후 `/pdca archive uscp-v2`

---

## 9. 협의 결정 사항 통합 추적표 (V2.0 작성 시 필수 반영)

### 9.1 2026-05-07 사전 협의 (3건)

| 결정 사항 | 영향 |
|---------|------|
| 권한 관리 기능 적용 | 단순 운영자 단일 역할로 통합 (1차 미팅 결정 반영) |
| 감사 로그 적용 | 게이트키핑 이력·로그인 이력 기록 필수 |
| 개인정보 동의 약관 적용 | 회원가입 시 통합 동의로 처리 (1차 미팅 결정 반영) |

### 9.2 PDF 명시 사항으로 해결 (3건)

| 항목 | PDF 명시 |
|------|--------|
| 천안 캠퍼스 | 양교 캠퍼스 기준 (PDF p.2) |
| 학생팀 범위 | 사회혁신가 양성과정 학생팀 (PDF p.3) |
| 산출물 공개 | 공개 (PDF p.18) |

### 9.3 2026-05-11 1차 미팅 결정 (28건)

#### 운영 모델 변경 (1건)
- 비로그인 시민 자유 제보 → **로그인 회원 제보** (회원가입 필수)

#### 알림 (5건)
- 알림 채널: 이메일 단일
- 연락처 입력: 회원가입 시 이메일 필수
- 알림 발송 시점: 모든 단계 변경 시 발송
- 운영자 라우팅: 지역사회특화센터 내 관리자 단일 → 일괄 알림
- 댓글 권한·어뷰징: 로그인 모델로 자동 해결

#### 개인정보 (4건)
- 회원가입 시 통합 동의
- 동의 거부 시: 회원가입 불가 (원천 차단)
- 만 14세 미만: 약관 명시 우회 (만 14세 이상만 이용)
- 광고성 정보: 발송 계획 없음

#### CMS (4건)
- 소개 페이지: 정적 HTML
- 약관 관리: WYSIWYG 편집기 + 버전 관리
- 메인 배너: 단순 배너 관리 도구
- 공지·이벤트: WYSIWYG 에디터 제공

#### 멘토단·학생팀 (5건)
- 멘토 풀: 가입 사용자 중 관리자 선정
- 멘토 등록: 관리자가 직접 자격 부여
- 매칭: 운영자 수동 매칭
- 수락·거절: 통보형 (별도 절차 없음)
- 학생팀 구성: 관리자가 가입 사용자 중 직접 구성

#### 양교 협력 (4건)
- 충남대 협력: MOU 체결, 단순 협력 기관
- 양교 인증: 별도 회원가입 (SSO 없음)
- 양교 학사 연동: 없음
- 양교 운영자 권한: 지역사회특화센터 단일

#### 권한 (4건)
- 슈퍼/운영/일반관리자 역할: 단일 운영자로 통합
- 메뉴×역할 매트릭스: 매트릭스 불필요
- 지역별 담당자: 라우팅 불필요
- 게이트키핑 권한: 모든 운영자에게 부여

#### 비기능 (2건)
- 일평균 트래픽: 최대 100명 미미한 수준
- 게이트키핑 부하: 낮음 (기본 인프라 사양으로 충분)

#### 투표 트랙 (3건 → 단순 라벨로 통합)
- 트랙 분류: 별도 절차 없음
- 트랙별 차별 처리: 없음 (단순 라벨)
- 공감수 자동 단계 전환: 수동 전환만

#### 데이터 소유권 (1건)
- 공주대 단독 소유·운영·열람권

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-14 | Initial draft — 한혜진 계획안 + 1차 미팅 결정 종합 반영 Plan 작성 | 당사 PM |
