# SOS랩 (USCP) 프로토타입

> **Sprint 1**: 공개 영역 8개 화면 프로토타입 (HTML/CSS/JS)
> **기준**: [prototype-plan.md](../docs/02-design/prototype/prototype-plan.md), [ui-standards.md](../docs/02-design/ui-standards.md)

---

## 실행 방법

### 1. npm 스크립트 (권장)

```bash
cd /Users/sangincha/dev/deep-sos/mockup

# 최초 1회만 의존성 설치
npm install

# 개발 서버 시작 (핫 리로드 + 자동 브라우저 열기)
npm run dev
```

브라우저가 자동으로 `http://localhost:8765/mockup/pages/index.html` 을 엽니다.
파일 저장 시 자동으로 브라우저가 새로고침됩니다.

### 2. 대체 명령

```bash
# live-server 대신 serve 사용 (핫 리로드 없음)
npm run serve

# 이미 서버가 실행 중일 때 브라우저만 열기
npm run open
```

### 3. 작동 원리

프로토타입은 **절대 경로(`/mockup/...`)** 를 사용하므로,
서버는 `mockup/`의 **상위 디렉토리(프로젝트 루트)** 를 기준으로 파일을 서빙합니다.

`package.json`의 `dev` 스크립트가 자동으로 `live-server .. --port=8765` 를 실행합니다.

---

## 제작 완료 화면

### Sprint 1: 공개 영역 (8개) ✅

| # | 화면 | 파일 | 설명 |
|:---:|------|------|------|
| **P-01** | 홈 | [pages/index.html](pages/index.html) | 플랫폼 정체성, KPI, 최근 활동 |
| **P-02** | SOS랩이란? | [pages/public/about.html](pages/public/about.html) | 플랫폼 소개, 5단계 프로세스 |
| **P-03** | 캠퍼스별 리빙랩 | [pages/public/campus.html](pages/public/campus.html) | 4개 캠퍼스 특화 리빙랩 |
| **P-05** | 지역 문제 목록 | [pages/public/issues.html](pages/public/issues.html) | 리스트/지도 뷰 전환, 필터 |
| **P-06** | 지역 문제 상세 | [pages/public/issue-detail.html](pages/public/issue-detail.html) | 처리 상태 타임라인, 댓글 |
| **P-07** | 리빙랩 프로젝트 목록 | [pages/public/projects.html](pages/public/projects.html) | 카드 그리드, 단계별 필터 |
| **P-08** | 리빙랩 프로젝트 상세 | [pages/public/project-detail.html](pages/public/project-detail.html) | 5단계 시각화, 마일스톤, KPI |
| **P-10** | 로그인/회원가입 | [pages/public/login.html](pages/public/login.html) | 독자 로그인 + 소셜 로그인 |

### Sprint 2: 사용자 영역 (6개) ✅

| # | 화면 | 파일 | 설명 |
|:---:|------|------|------|
| **P-11** | 사용자 대시보드 | [pages/user/dashboard.html](pages/user/dashboard.html) | 히어로 + 빠른실행 + 최근활동 + 내 프로젝트 + 알림 |
| **P-12** | 지역 문제 등록 | [pages/user/issue-new.html](pages/user/issue-new.html) | 카테고리 선택 + 지도 + 사진 업로드 + 자동저장 |
| **P-13** | 프로젝트 참여 상세 | [pages/user/project-member.html](pages/user/project-member.html) | 멤버 관점 + 5단계 + 마일스톤 + 팀 사이드바 |
| **P-14** | 현장 피드백 등록 | [pages/user/feedback-new.html](pages/user/feedback-new.html) | 유형 선택 + 설문 + 체크리스트 + 태그 |
| **P-15** | 아이디어 보드 | [pages/user/idea-board.html](pages/user/idea-board.html) | 4개 컬럼 브레인스토밍 + 카드 투표 + 어피니티 |
| **P-17** | 사회공헌 포트폴리오 | [pages/user/portfolio.html](pages/user/portfolio.html) | 히어로 + 4개 지표 + SDGs 현황 + 연도별 이력 |

### Sprint 3: 관리자 영역 (8개) ✅

| # | 화면 | 파일 | 설명 |
|:---:|------|------|------|
| **P-19** | 관리자 대시보드 | [pages/admin/dashboard.html](pages/admin/dashboard.html) | 4개 KPI + 월별 차트 + 캠퍼스 비교 + 처리대기 목록 |
| **P-20** | CMS 소개 페이지 편집 | [pages/admin/cms-pages.html](pages/admin/cms-pages.html) | 페이지 리스트 + WYSIWYG 에디터 + 발행 관리 |
| **P-22** | 이슈 관리 목록 | [pages/admin/issues.html](pages/admin/issues.html) | 상태 탭 + 필터 + 테이블 + 일괄 작업 |
| **P-23** | 이슈 처리 상세 | [pages/admin/issue-detail.html](pages/admin/issue-detail.html) | 상태 변경 + 담당 배정 + 프로젝트 전환 + 이력 |
| **P-24** | 프로젝트 관리 목록 | [pages/admin/projects.html](pages/admin/projects.html) | 5단계 칸반 보드 (탐색→실행→개발→검증→활용) |
| **P-25** | 프로젝트 관리 상세 | [pages/admin/project-detail.html](pages/admin/project-detail.html) | 그라데이션 헤더 + 단계 전환 + 마일스톤/멤버/KPI |
| **P-26** | 봉사활동 관리 | [pages/admin/volunteers.html](pages/admin/volunteers.html) | VMS/1365 연동 상태 + 동기화 상태 컬럼 |
| **P-30** | KPI · SDGs 대시보드 | [pages/admin/kpi.html](pages/admin/kpi.html) | 3대 KPI 게이지 + SDGs 17개 그리드 + 캠퍼스 성과 |

### Sprint 4: 나머지 화면 (8개) ✅

| # | 화면 | 파일 | 설명 |
|:---:|------|------|------|
| **P-04** | 참여 방법 안내 | [pages/public/guide.html](pages/public/guide.html) | 역할별 탭 + 5단계 가이드 + FAQ |
| **P-09** | 성공 사례 목록 | [pages/public/success-cases.html](pages/public/success-cases.html) | Featured Case + 필터 + 카드 그리드 + 정책연계 뱃지 |
| **P-16** | 봉사활동 신청 | [pages/user/volunteer-apply.html](pages/user/volunteer-apply.html) | 히어로 + 활동정보 + 참여자 + 신청 사이드바 |
| **P-18** | 프로필 설정 | [pages/user/profile.html](pages/user/profile.html) | 좌측 탭 + 기본정보/알림/관심분야/위험영역 |
| **P-21** | CMS 배너 · 공지 | [pages/admin/cms-banners.html](pages/admin/cms-banners.html) | 배너 카드 그리드 + 공지 리스트 + 상태 관리 |
| **P-27** | 참여 기관 · MOU | [pages/admin/organizations.html](pages/admin/organizations.html) | 통계 + MOU 잔여기간 바 + 만료임박 경고 |
| **P-28** | 사용자 관리 | [pages/admin/users.html](pages/admin/users.html) | 역할별 통계 + 활동 레벨 도트 + 기여 현황 |
| **P-29** | 성공 사례 관리 | [pages/admin/success-cases.html](pages/admin/success-cases.html) | 카드 그리드 + 스토리 4단계 진행 + 공개 관리 |

---

## 디렉토리 구조

```
mockup/
├── pages/              # HTML 페이지
│   ├── index.html      # P-01 홈
│   └── public/
│       ├── about.html
│       ├── campus.html
│       ├── issues.html
│       ├── issue-detail.html
│       ├── projects.html
│       ├── project-detail.html
│       └── login.html
│
├── styles/             # CSS
│   ├── main.css        # 진입점 (base + components import)
│   ├── base/
│   │   ├── variables.css    # 디자인 토큰
│   │   └── reset.css
│   ├── components/
│   │   ├── layout.css       # GNB, Footer, 페이지 레이아웃
│   │   └── ui.css           # Button, Card, Badge, Form 등
│   └── pages/
│       └── home.css
│
├── scripts/
│   └── app.js          # 공통 JS (GNB/Footer 주입, 탭 전환, 포맷터)
│
├── data/               # Mock JSON
│   ├── issues.json     # 지역 문제 샘플 6건
│   ├── projects.json   # 리빙랩 프로젝트 샘플 6건
│   └── stats.json      # 플랫폼 통계
│
├── README.md
└── component-mapping.md  # Next.js 전환 매핑
```

---

## 디자인 토큰 요약

### 색상

| 용도 | 토큰 | HEX |
|------|------|-----|
| Primary | `--color-primary` | `#2563EB` |
| Secondary | `--color-secondary` | `#059669` |
| Accent | `--color-accent` | `#F59E0B` |
| Danger | `--color-danger` | `#EF4444` |
| 대전 캠퍼스 | `--color-campus-dj` | `#2563EB` |
| 공주 캠퍼스 | `--color-campus-gj` | `#059669` |
| 예산 캠퍼스 | `--color-campus-ys` | `#7C3AED` |
| 세종 캠퍼스 | `--color-campus-sj` | `#EA580C` |

### 타이포그래피
- **Font**: [Pretendard Variable](https://github.com/orioncactus/pretendard) (CDN)
- **크기**: `--text-xs (12px) ~ --text-4xl (48px)`

### 간격
- 4px 기반 스케일: `--space-1 ~ --space-20`

### 레이아웃
- GNB 높이: 64px (데스크톱) / 56px (모바일)
- 콘텐츠 최대 너비: 1200px (`--layout-content-max`)
- 브레이크포인트: 640px, 1024px, 1440px

---

## UI 표준 준수 사항

[ui-standards.md](../docs/02-design/ui-standards.md) 원칙 적용:

- ✅ GNB 상단 sticky 고정
- ✅ 반응형 4단계 (Mobile / Tablet / Desktop / Wide)
- ✅ 핵심 태스크 3클릭 이내 도달
- ✅ 색상 대비 4.5:1 이상 (접근성)
- ✅ 카드 말줄임 (제목 2줄, 설명 3줄)
- ✅ 터치 타겟 최소 40px
- ✅ 모달 사용 최소화 (로그인 페이지 분리, 상세 페이지 별도)

---

## 다음 단계 (Sprint 2~)

- Sprint 2: 사용자 영역 6개 (대시보드, 이슈 등록, 피드백, 아이디어 보드)
- Sprint 3: 관리자 영역 8개 (CMS, KPI, 프로젝트 관리)
- Sprint 4: 나머지 8개 화면

---

## 고객 검토 체크리스트

프로토타입 시연 시 확인할 사항:

- [ ] 플랫폼의 정체성이 고객 의도와 일치하는가?
- [ ] 홈 화면의 KPI 구성이 적절한가?
- [ ] 지역 문제의 카테고리 분류가 현실적인가?
- [ ] 리빙랩 5단계 시각화가 직관적인가?
- [ ] 캠퍼스별 구분이 명확한가?
- [ ] 색상 톤이 공공기관 플랫폼으로 적합한가?
- [ ] 모바일 반응형이 충분한가?
