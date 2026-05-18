# USCP 플랫폼 프로토타입 (V2.2)

> **버전**: V2.2 (2026-05-16)<br/>
> **기준 문서**: [estimate-v2.md](../docs/00-discovery/estimate-v2.md), [uscp-proposal-v2.md](../docs/00-discovery/uscp-proposal-v2.md), [uscp-rfi-response-v2.md](../docs/00-discovery/uscp-rfi-response-v2.md)<br/>
> **이전 버전**: V1 (`_archive/v1-2026-04-pre-han-plan/mockup/`)

---

## V2.2 변경 사항

### 제거된 영역 (V1 → V2.2)

- **봉사활동 일체**: VMS·1365 자원봉사포털 연계, 봉사실적·시간, 봉사단 모집 — 2026-05-14 발주처 결정
- **AI 자동화 4종**: 챗봇, 산출물 분석, 지역문제 자동 수집, 프로젝트 지원 — 1차 미팅 범위 외
- **다단계 권한 매트릭스**: 슈퍼/운영/일반관리자 3단계 → 단일 운영자
- **사용자 영역 일부**: 현장 피드백, 아이디어 보드, 포트폴리오, 봉사 신청, 프로젝트 참여
- **CMS 페이지 편집기**: 소개 페이지 정적 HTML 결정

### 신규 추가 영역

- **멘토단 운영**: 멘토 자격 부여·수동 매칭·학생팀 구성 (`admin/mentors.html`)
- **약관 관리**: WYSIWYG + 버전 관리 (`admin/terms.html`)
- **감사 로그**: 1년 보관·게이트키핑·로그인·개인정보 조회 이력 (`admin/audit.html`)
- **내 활동**: 사용자 대시보드를 단순화한 제보 진행·이메일 알림 페이지 (`user/my-activities.html`)
- **5개 지역**: 4 캠퍼스 → 5 지역(대전·공주·예산·천안·세종) 재구성 (`public/about.html#regions`)

### 변경된 규칙

- **의제 라이프사이클**: 5단계 → **6단계** (제보 → 검토중 → 공개등록 → 멘토배정 → 처리중 → 해결완료)
- **참여 모델**: 비로그인 자유 제보 → **로그인 회원 제보**
- **알림**: 다중 채널 → **이메일 단일**
- **인증**: SSO 미적용, 만 14세 이상, 개인정보·약관 통합 동의 필수
- **양교 협력**: 충남대는 단순 협력 기관 (특별 권한·연동 없음)

---

## 실행 방법

### 1. npm 스크립트 (권장)

```bash
cd /Users/sangincha/dev/deep-sos/mockup

npm install   # 최초 1회만
npm run dev   # 핫 리로드 + 자동 브라우저 열기
```

브라우저: `http://localhost:8765/mockup/pages/index.html`

### 2. 대체 명령

```bash
npm run serve    # live-server 대신 serve
npm run open     # 서버 실행 중일 때 브라우저만
```

---

## 화면 목록 (총 24개)

### 공개 영역 (10개) — RFI 6개 메뉴 IA

| # | 화면 | 파일 |
|:---:|------|------|
| P-01 | 홈 | [pages/index.html](pages/index.html) |
| P-02 | USCP 소개 (5 지역·참여 방법 통합) | [pages/public/about.html](pages/public/about.html) |
| P-03 | 지역문제 광장 | [pages/public/issues.html](pages/public/issues.html) |
| P-04 | 지역문제 상세 | [pages/public/issue-detail.html](pages/public/issue-detail.html) |
| P-05 | 리빙랩 목록 | [pages/public/projects.html](pages/public/projects.html) |
| P-06 | 리빙랩 상세 | [pages/public/project-detail.html](pages/public/project-detail.html) |
| P-07 | 협력 네트워크 🆕 | [pages/public/network.html](pages/public/network.html) |
| P-08 | 성과자료 🆕 | [pages/public/performance.html](pages/public/performance.html) |
| P-09 | 성공 사례 | [pages/public/success-cases.html](pages/public/success-cases.html) |
| P-10 | 로그인 · 회원가입 | [pages/public/login.html](pages/public/login.html) |

> GNB 6개 메뉴: 홈 / USCP 소개 / 지역문제 광장 / 리빙랩 / 협력 네트워크 / 성과자료 (성공 사례는 푸터·홈·리빙랩에서 진입)

### 사용자 영역 (3개)

| # | 화면 | 파일 |
|:---:|------|------|
| P-11 | 내 활동 | [pages/user/my-activities.html](pages/user/my-activities.html) |
| P-12 | 문제 제보 | [pages/user/issue-new.html](pages/user/issue-new.html) |
| P-13 | 프로필 설정 | [pages/user/profile.html](pages/user/profile.html) |

### 관리자 영역 (13개)

| # | 화면 | 파일 |
|:---:|------|------|
| A-01 | 통합 대시보드 | [pages/admin/dashboard.html](pages/admin/dashboard.html) |
| A-02 | 게이트키핑 목록 | [pages/admin/issues.html](pages/admin/issues.html) |
| A-03 | 게이트키핑 처리 | [pages/admin/issue-detail.html](pages/admin/issue-detail.html) |
| A-04 | 리빙랩 운영 목록 | [pages/admin/projects.html](pages/admin/projects.html) |
| A-05 | 리빙랩 운영 상세 | [pages/admin/project-detail.html](pages/admin/project-detail.html) |
| A-06 | 멘토단 운영 🆕 | [pages/admin/mentors.html](pages/admin/mentors.html) |
| A-07 | 협력기관 · MOU | [pages/admin/organizations.html](pages/admin/organizations.html) |
| A-08 | 회원 목록 | [pages/admin/users.html](pages/admin/users.html) |
| A-09 | 성공 사례 관리 | [pages/admin/success-cases.html](pages/admin/success-cases.html) |
| A-10 | 성과지표 | [pages/admin/kpi.html](pages/admin/kpi.html) |
| A-11 | 공지 · 자료실 · 배너 | [pages/admin/cms-banners.html](pages/admin/cms-banners.html) |
| A-12 | 약관 관리 🆕 | [pages/admin/terms.html](pages/admin/terms.html) |
| A-13 | 감사 로그 🆕 | [pages/admin/audit.html](pages/admin/audit.html) |

---

## 디자인 토큰

### 5개 지역 색상

| 지역 | 토큰 | HEX |
|------|------|-----|
| 대전 | `--color-region-dj` | `#2563EB` |
| 공주 | `--color-region-gj` | `#059669` |
| 예산 | `--color-region-ys` | `#7C3AED` |
| 천안 🆕 | `--color-region-ca` | `#DB2777` |
| 세종 | `--color-region-sj` | `#EA580C` |

### 6단계 의제 상태 색상

| 단계 | 토큰 | HEX |
|------|------|-----|
| 1. 제보 | `--color-status-submitted` | `#6B7280` |
| 2. 검토중 | `--color-status-reviewing` | `#3B82F6` |
| 3. 공개등록 🆕 | `--color-status-registered` | `#06B6D4` |
| 4. 멘토배정 | `--color-status-assigned` | `#8B5CF6` |
| 5. 처리중 | `--color-status-progress` | `#F59E0B` |
| 6. 해결완료 | `--color-status-resolved` | `#10B981` |
| - 반려 | `--color-status-rejected` | `#EF4444` |

### 타이포그래피 · 레이아웃

- **Font**: Pretendard Variable (CDN)
- **크기**: `--text-xs` (12px) ~ `--text-4xl` (48px)
- **간격**: 4px 기반 스케일 `--space-1 ~ --space-20`
- **GNB**: 64px (PC) / 56px (모바일)
- **콘텐츠 최대 너비**: 1200px
- **브레이크포인트**: 640px, 1024px, 1440px

---

## 디렉토리 구조

```
mockup/
├── pages/
│   ├── index.html
│   ├── public/   (10개)
│   ├── user/     (3개)
│   └── admin/    (11개)
├── styles/
│   ├── main.css
│   ├── base/variables.css      # 디자인 토큰 (5 지역·6단계)
│   ├── base/reset.css
│   ├── components/layout.css
│   ├── components/ui.css
│   └── pages/home.css
├── scripts/
│   └── app.js                  # GNB·LNB·관리자 사이드바·푸터·데모 독 주입
├── data/
│   ├── issues.json
│   ├── projects.json
│   └── stats.json
├── README.md
└── package.json
```

---

## UI 표준 준수

- GNB 상단 sticky 고정
- 반응형 4단계 (Mobile / Tablet / Desktop / Wide)
- 핵심 태스크 3클릭 이내 도달
- 색상 대비 4.5:1 이상 (접근성)
- 카드 말줄임 (제목 2줄·설명 3줄)
- 터치 타겟 최소 40px
- **모달 사용 최소화** (로그인 페이지 분리, 상세 페이지 별도) — UI 표준 메모리 반영

---

## 발주처 시연 체크리스트

- [ ] 6단계 의제 라이프사이클이 직관적인가?
- [ ] 5개 지역(대전·공주·예산·천안·세종) 구분이 명확한가?
- [ ] 회원가입 시 14세·약관·개인정보 통합 동의 흐름이 자연스러운가?
- [ ] 게이트키핑 워크플로우(승인/반려/단계 전환)가 명확한가?
- [ ] 멘토단 수동 매칭 화면이 운영자에게 충분한가?
- [ ] 약관 버전 관리 + 감사 로그 화면이 법적 의무를 충족하는가?
- [ ] 모바일 반응형이 충분한가?
- [ ] 봉사활동·AI 기능이 노출되지 않는가? (V2.2 범위 외)
