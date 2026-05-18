/* USCP V2.2 — Common Scripts */
/* 2026-05-15 ~ 2026-05-16 한혜진 계획안 + 1차 미팅 결정 + 추가 결정 반영 */
/* V2.2 변경 사항:
   - 4 캠퍼스 → 5 지역 (대전·공주·예산·천안·세종)
   - 5단계 → 6단계 의제 라이프사이클
   - 봉사활동 메뉴 전면 제거 (VMS·1365 포함)
   - AI 자동화 메뉴 전면 제거 (챗봇·산출물 분석·이슈 수집·프로젝트 지원)
   - 단일 운영자 역할 (다단계 권한 매트릭스 제거)
   - 멘토단·약관·감사 로그 메뉴 신규 추가
   - 사용자 LNB: 대시보드 → my-activities, 봉사·포트폴리오 제거
*/

// ───────────────────────────────────────────────────────
// 공통 컴포넌트 (GNB, LNB, Footer)
// ───────────────────────────────────────────────────────

const COMMON_HEADER_PUBLIC = `
<header class="gnb" data-component="Header">
  <div class="gnb__inner">
    <div class="gnb__brand">
      <a href="https://www.kongju.ac.kr" target="_blank" rel="noopener noreferrer"
         class="gnb__brand-center" title="국립공주대학교 홈페이지 (새 창)">
        <img src="/mockup/images/center-logo.svg" alt="" class="gnb__brand-center-logo" aria-hidden="true">
        <div class="gnb__brand-center-text">
          <div class="gnb__brand-center-univ">국립공주대학교</div>
          <div class="gnb__brand-center-name">지역사회특화센터</div>
        </div>
      </a>
      <div class="gnb__brand-divider" aria-hidden="true"></div>
      <a href="/mockup/pages/index.html" class="gnb__brand-platform" title="USCP 홈으로 이동">
        <div class="gnb__brand-platform-line">
          <span class="gnb__brand-uscp">USCP</span>
          <span class="gnb__brand-subtitle">온라인 사회공헌 플랫폼</span>
        </div>
      </a>
    </div>
    <nav class="gnb__menu" data-component="Navigation">
      <a href="/mockup/pages/public/about.html" data-nav="about">USCP 소개</a>
      <a href="/mockup/pages/public/issues.html" data-nav="issues">지역문제 광장</a>
      <a href="/mockup/pages/public/projects.html" data-nav="projects">리빙랩</a>
      <a href="/mockup/pages/public/network.html" data-nav="network">협력 네트워크</a>
      <a href="/mockup/pages/public/performance.html" data-nav="performance">성과자료</a>
      <a href="/mockup/pages/public/success-cases.html" data-nav="cases">성공 사례</a>
    </nav>
    <div class="gnb__actions">
      <a href="/mockup/pages/public/login.html" class="btn btn--secondary">로그인</a>
      <a href="/mockup/pages/public/login.html?mode=signup" class="btn btn--primary">회원가입</a>
      <button class="gnb__mobile-toggle btn btn--icon btn--ghost" aria-label="메뉴">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M4 12h16M4 6h16M4 18h16"/>
        </svg>
      </button>
    </div>
  </div>
</header>
`;

const COMMON_HEADER_USER = `
<header class="gnb" data-component="Header">
  <div class="gnb__inner">
    <div class="gnb__brand">
      <a href="https://www.kongju.ac.kr" target="_blank" rel="noopener noreferrer"
         class="gnb__brand-center" title="국립공주대학교 홈페이지 (새 창)">
        <img src="/mockup/images/center-logo.svg" alt="" class="gnb__brand-center-logo" aria-hidden="true">
        <div class="gnb__brand-center-text">
          <div class="gnb__brand-center-univ">국립공주대학교</div>
          <div class="gnb__brand-center-name">지역사회특화센터</div>
        </div>
      </a>
      <div class="gnb__brand-divider" aria-hidden="true"></div>
      <a href="/mockup/pages/index.html" class="gnb__brand-platform" title="USCP 홈으로 이동">
        <div class="gnb__brand-platform-line">
          <span class="gnb__brand-uscp">USCP</span>
          <span class="gnb__brand-subtitle">온라인 사회공헌 플랫폼</span>
        </div>
      </a>
    </div>
    <nav class="gnb__menu" data-component="Navigation">
      <a href="/mockup/pages/public/about.html" data-nav="about">USCP 소개</a>
      <a href="/mockup/pages/public/issues.html" data-nav="issues">지역문제 광장</a>
      <a href="/mockup/pages/public/projects.html" data-nav="projects">리빙랩</a>
      <a href="/mockup/pages/public/network.html" data-nav="network">협력 네트워크</a>
      <a href="/mockup/pages/public/performance.html" data-nav="performance">성과자료</a>
    </nav>
    <div class="gnb__actions">
      <a href="/mockup/pages/user/issue-new.html" class="btn btn--primary btn--sm">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        문제 제보
      </a>
      <button class="btn btn--icon btn--ghost gnb__notify" aria-label="이메일 알림 (수신함 안내)">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span class="gnb__notify-dot"></span>
      </button>
      <a href="/mockup/pages/user/my-activities.html" class="gnb__user">
        <div class="gnb__user-avatar">박</div>
        <span class="gnb__user-name">박시민</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </a>
      <button class="gnb__mobile-toggle btn btn--icon btn--ghost" aria-label="메뉴">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M4 12h16M4 6h16M4 18h16"/>
        </svg>
      </button>
    </div>
  </div>
</header>
`;

// 관리자 사이드바 — V2.2 단일 운영자, AI/봉사 제거, 멘토단/약관/감사 신규
const ADMIN_SIDE = `
<aside class="admin-side" data-component="AdminSidebar">
  <div class="admin-side__brand">
    <a href="https://www.kongju.ac.kr" target="_blank" rel="noopener noreferrer"
       class="admin-side__brand-center" title="국립공주대학교 홈페이지 (새 창)">
      <img src="/mockup/images/center-logo.svg" alt="" class="admin-side__brand-center-logo" aria-hidden="true">
      <div class="admin-side__brand-center-text">
        <div class="admin-side__brand-center-univ">국립공주대학교</div>
        <div class="admin-side__brand-center-name">지역사회특화센터</div>
      </div>
    </a>
    <div class="admin-side__brand-rule" aria-hidden="true"></div>
    <a href="/mockup/pages/admin/dashboard.html" class="admin-side__brand-platform" title="관리자 대시보드로 이동">
      <div class="admin-side__brand-line">
        <span class="admin-side__brand-uscp">USCP</span>
        <span class="admin-side__brand-role">관리자</span>
      </div>
    </a>
  </div>
  <nav class="admin-side__nav">
    <div class="admin-side__section">대시보드</div>
    <a href="/mockup/pages/admin/dashboard.html" class="admin-side__item" data-admin-nav="dashboard">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
        <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
      통합 대시보드
    </a>
    <a href="/mockup/pages/admin/kpi.html" class="admin-side__item" data-admin-nav="kpi">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
      성과지표 (글로컬대학)
    </a>

    <div class="admin-side__section">의제 관리</div>
    <a href="/mockup/pages/admin/issues.html" class="admin-side__item" data-admin-nav="issues">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      게이트키핑
      <span class="admin-side__item-badge admin-side__item-badge--danger">7</span>
    </a>
    <a href="/mockup/pages/admin/projects.html" class="admin-side__item" data-admin-nav="projects">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-4"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      리빙랩 운영
      <span class="admin-side__item-badge">12</span>
    </a>
    <a href="/mockup/pages/admin/mentors.html" class="admin-side__item" data-admin-nav="mentors">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
      멘토단 운영
      <span class="admin-side__item-badge" style="background:#dbeafe;color:#1d4ed8;">신규</span>
    </a>
    <a href="/mockup/pages/admin/success-cases.html" class="admin-side__item" data-admin-nav="success-cases">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
      </svg>
      성공 사례
    </a>

    <div class="admin-side__section">협력 네트워크</div>
    <a href="/mockup/pages/admin/organizations.html" class="admin-side__item" data-admin-nav="organizations">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M3 21v-2a4 4 0 014-4h10a4 4 0 014 4v2M7 3h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/>
      </svg>
      협력기관 · MOU
    </a>

    <div class="admin-side__section">콘텐츠 관리</div>
    <a href="/mockup/pages/admin/cms-banners.html" class="admin-side__item" data-admin-nav="cms-banners">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
      공지 · 이벤트 · 자료실 · 배너
    </a>
    <a href="/mockup/pages/admin/terms.html" class="admin-side__item" data-admin-nav="terms">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
      </svg>
      약관 관리 (버전)
      <span class="admin-side__item-badge" style="background:#dbeafe;color:#1d4ed8;">신규</span>
    </a>

    <div class="admin-side__section">시스템</div>
    <a href="/mockup/pages/admin/users.html" class="admin-side__item" data-admin-nav="users">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      </svg>
      회원 목록
    </a>
    <a href="/mockup/pages/admin/audit.html" class="admin-side__item" data-admin-nav="audit">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 2L4 7v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V7l-8-5z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
      감사 로그 (1년 보관)
      <span class="admin-side__item-badge" style="background:#dbeafe;color:#1d4ed8;">신규</span>
    </a>
  </nav>
  <div class="admin-side__profile">
    <div class="admin-side__profile-avatar">관</div>
    <div style="flex: 1; min-width: 0;">
      <div class="admin-side__profile-name">운영자</div>
      <div class="admin-side__profile-role">지역사회특화센터 (단일 역할)</div>
    </div>
  </div>
</aside>
`;

const ADMIN_TOP = `
<header class="admin-top" data-component="AdminTop">
  <div class="admin-top__left">
    <div class="admin-top__search">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <span>의제·리빙랩·회원·멘토 검색...</span>
    </div>
  </div>
  <div class="admin-top__actions">
    <button class="admin-top__icon-btn" aria-label="알림">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      <span class="badge-dot"></span>
    </button>
    <a href="/mockup/pages/index.html" class="btn btn--secondary btn--sm">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/>
      </svg>
      공개 사이트
    </a>
  </div>
</header>
`;

// 사용자 LNB — V2.2 최소 (대시보드 단순화 → my-activities)
const USER_LNB = `
<aside class="lnb" data-component="UserLNB">
  <div class="lnb__profile">
    <div class="lnb__avatar">박</div>
    <div class="lnb__profile-info">
      <div class="lnb__profile-name">박시민</div>
      <div class="lnb__profile-role">대전 시민 회원</div>
    </div>
  </div>
  <nav class="lnb__nav">
    <div class="lnb__section">내 활동</div>
    <a href="/mockup/pages/user/my-activities.html" class="lnb__item" data-user-nav="my-activities">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
        <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
      내 제보 진행 상황
      <span class="lnb__item-badge">3</span>
    </a>
    <a href="/mockup/pages/user/issue-new.html" class="lnb__item" data-user-nav="issue-new">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      문제 제보하기
    </a>

    <div class="lnb__section">계정</div>
    <a href="/mockup/pages/user/profile.html" class="lnb__item" data-user-nav="profile">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      프로필 설정
    </a>
    <a href="/mockup/pages/index.html" class="lnb__item">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
      </svg>
      로그아웃
    </a>
  </nav>
</aside>
`;

const COMMON_FOOTER = `
<footer class="footer" data-component="Footer">
  <div class="footer__inner">
    <div class="footer__grid">
      <div>
        <div class="footer__brand">
          <a href="https://www.kongju.ac.kr" target="_blank" rel="noopener noreferrer"
             class="footer__brand-center" title="국립공주대학교 홈페이지 (새 창)">
            <img src="/mockup/images/center-logo.svg" alt="" class="footer__brand-center-logo" aria-hidden="true">
            <div class="footer__brand-center-text">
              <div class="footer__brand-center-univ">국립공주대학교</div>
              <div class="footer__brand-center-name">지역사회특화센터</div>
            </div>
          </a>
          <div class="footer__brand-divider" aria-hidden="true"></div>
          <a href="/mockup/pages/index.html" class="footer__brand-platform" title="USCP 홈으로 이동">
            <div class="footer__brand-line">
              <span class="footer__brand-uscp">USCP</span>
              <span class="footer__brand-subtitle">온라인 사회공헌 플랫폼</span>
            </div>
          </a>
        </div>
        <p class="footer__desc">
          글로컬사업단 지역사회특화센터 · 2025 글로컬대학 본지정 사업 (추진과제 4-3-1)<br>
          5개 지역(대전·공주·예산·천안·세종) 시민·대학·지자체·기업이 함께하는 온라인 사회공헌 플랫폼
        </p>
      </div>
      <div>
        <h4 class="footer__title">플랫폼</h4>
        <ul class="footer__list">
          <li><a href="/mockup/pages/public/about.html">USCP 소개</a></li>
          <li><a href="/mockup/pages/public/about.html#regions">5개 지역</a></li>
          <li><a href="/mockup/pages/public/about.html#guide">참여 방법</a></li>
          <li><a href="/mockup/pages/public/success-cases.html">성공 사례</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__title">활동</h4>
        <ul class="footer__list">
          <li><a href="/mockup/pages/public/issues.html">지역문제 광장</a></li>
          <li><a href="/mockup/pages/public/projects.html">리빙랩</a></li>
          <li><a href="/mockup/pages/public/network.html">협력 네트워크</a></li>
          <li><a href="/mockup/pages/public/performance.html">성과자료</a></li>
          <li><a href="/mockup/pages/public/login.html">회원가입 · 로그인</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__title">법적 안내</h4>
        <ul class="footer__list">
          <li><a href="#">개인정보처리방침</a></li>
          <li><a href="#">이용약관</a></li>
          <li>만 14세 이상 이용 가능</li>
          <li style="margin-top:12px;">문의: uscp@kongju.ac.kr</li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <div>© 2026 국립공주대학교 USCP · 2025 글로컬대학 본지정 사업 (추진과제 4-3-1)</div>
      <div style="color:#94a3b8;font-size:12px;">공주대-충남대 MOU 협력</div>
    </div>
  </div>
</footer>
`;

// 데모 독 — V2.2 24개 페이지
const DEMO_DOCK = `
<div class="demo-dock" id="demoDock">
  <button class="demo-dock__toggle" id="demoDockToggle" type="button">
    <span class="demo-dock__toggle-dot"></span>
    데모 네비게이션
  </button>
  <div class="demo-dock__panel">
    <div class="demo-dock__header">
      <div class="demo-dock__title">USCP V2.2 — 전체 화면 (24개)</div>
      <button class="demo-dock__close" id="demoDockClose" type="button" aria-label="닫기">✕</button>
    </div>

    <div class="demo-dock__group" style="--group-color: #2563eb;">
      <div class="demo-dock__group-title">공개 영역 (10) — RFI 6개 메뉴 IA</div>
      <a href="/mockup/pages/index.html" class="demo-dock__item"><span class="demo-dock__item-code">P-01</span>홈</a>
      <a href="/mockup/pages/public/about.html" class="demo-dock__item"><span class="demo-dock__item-code">P-02</span>USCP 소개 (5 지역·참여 통합)</a>
      <a href="/mockup/pages/public/issues.html" class="demo-dock__item"><span class="demo-dock__item-code">P-03</span>지역문제 광장</a>
      <a href="/mockup/pages/public/issue-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">P-04</span>지역문제 상세</a>
      <a href="/mockup/pages/public/projects.html" class="demo-dock__item"><span class="demo-dock__item-code">P-05</span>리빙랩 목록</a>
      <a href="/mockup/pages/public/project-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">P-06</span>리빙랩 상세</a>
      <a href="/mockup/pages/public/network.html" class="demo-dock__item"><span class="demo-dock__item-code">P-07</span>협력 네트워크 <span style="font-size:9px;color:#7c3aed;font-weight:700;">신규</span></a>
      <a href="/mockup/pages/public/performance.html" class="demo-dock__item"><span class="demo-dock__item-code">P-08</span>성과자료 <span style="font-size:9px;color:#7c3aed;font-weight:700;">신규</span></a>
      <a href="/mockup/pages/public/success-cases.html" class="demo-dock__item"><span class="demo-dock__item-code">P-09</span>성공 사례</a>
      <a href="/mockup/pages/public/login.html" class="demo-dock__item"><span class="demo-dock__item-code">P-10</span>로그인 · 회원가입</a>
    </div>

    <div class="demo-dock__group" style="--group-color: #059669;">
      <div class="demo-dock__group-title">사용자 영역 (3)</div>
      <a href="/mockup/pages/user/my-activities.html" class="demo-dock__item"><span class="demo-dock__item-code">P-11</span>내 활동</a>
      <a href="/mockup/pages/user/issue-new.html" class="demo-dock__item"><span class="demo-dock__item-code">P-12</span>문제 제보</a>
      <a href="/mockup/pages/user/profile.html" class="demo-dock__item"><span class="demo-dock__item-code">P-13</span>프로필 설정</a>
    </div>

    <div class="demo-dock__group" style="--group-color: #7c3aed;">
      <div class="demo-dock__group-title">관리자 영역 (13)</div>
      <a href="/mockup/pages/admin/dashboard.html" class="demo-dock__item"><span class="demo-dock__item-code">A-01</span>통합 대시보드</a>
      <a href="/mockup/pages/admin/issues.html" class="demo-dock__item"><span class="demo-dock__item-code">A-02</span>게이트키핑 목록</a>
      <a href="/mockup/pages/admin/issue-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">A-03</span>게이트키핑 처리</a>
      <a href="/mockup/pages/admin/projects.html" class="demo-dock__item"><span class="demo-dock__item-code">A-04</span>리빙랩 운영 목록</a>
      <a href="/mockup/pages/admin/project-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">A-05</span>리빙랩 운영 상세</a>
      <a href="/mockup/pages/admin/mentors.html" class="demo-dock__item"><span class="demo-dock__item-code">A-06</span>멘토단 운영 <span style="font-size:9px;color:#7c3aed;font-weight:700;">신규</span></a>
      <a href="/mockup/pages/admin/organizations.html" class="demo-dock__item"><span class="demo-dock__item-code">A-07</span>협력기관 · MOU</a>
      <a href="/mockup/pages/admin/users.html" class="demo-dock__item"><span class="demo-dock__item-code">A-08</span>회원 목록</a>
      <a href="/mockup/pages/admin/success-cases.html" class="demo-dock__item"><span class="demo-dock__item-code">A-09</span>성공 사례 관리</a>
      <a href="/mockup/pages/admin/kpi.html" class="demo-dock__item"><span class="demo-dock__item-code">A-10</span>성과지표</a>
      <a href="/mockup/pages/admin/cms-banners.html" class="demo-dock__item"><span class="demo-dock__item-code">A-11</span>공지 · 자료실 · 배너</a>
      <a href="/mockup/pages/admin/terms.html" class="demo-dock__item"><span class="demo-dock__item-code">A-12</span>약관 관리 <span style="font-size:9px;color:#7c3aed;font-weight:700;">신규</span></a>
      <a href="/mockup/pages/admin/audit.html" class="demo-dock__item"><span class="demo-dock__item-code">A-13</span>감사 로그 <span style="font-size:9px;color:#7c3aed;font-weight:700;">신규</span></a>
    </div>

    <div style="padding:12px 16px;border-top:1px solid #e5e7eb;background:#f9fafb;font-size:11px;color:#6b7280;line-height:1.5;">
      <strong style="color:#374151;">V2.2 (2026-05-16 기준)</strong><br>
      봉사활동 · AI 자동화 · SSO 메뉴 제거됨<br>
      6단계 의제 라이프사이클 적용
    </div>
  </div>
</div>
`;

// ───────────────────────────────────────────────────────
// 공통 요소 주입 (DOMContentLoaded)
// ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const headerSlot = document.querySelector('[data-slot="header"]');
  const headerUserSlot = document.querySelector('[data-slot="header-user"]');
  const lnbSlot = document.querySelector('[data-slot="user-lnb"]');
  const footerSlot = document.querySelector('[data-slot="footer"]');
  const adminSideSlot = document.querySelector('[data-slot="admin-side"]');
  const adminTopSlot = document.querySelector('[data-slot="admin-top"]');
  if (headerSlot) headerSlot.outerHTML = COMMON_HEADER_PUBLIC;
  if (headerUserSlot) headerUserSlot.outerHTML = COMMON_HEADER_USER;
  if (lnbSlot) lnbSlot.outerHTML = USER_LNB;
  if (adminSideSlot) adminSideSlot.outerHTML = ADMIN_SIDE;
  if (adminTopSlot) adminTopSlot.outerHTML = ADMIN_TOP;
  if (footerSlot) footerSlot.outerHTML = COMMON_FOOTER;

  // Demo Dock 자동 주입
  if (!document.getElementById('demoDock')) {
    document.body.insertAdjacentHTML('beforeend', DEMO_DOCK);
    const dock = document.getElementById('demoDock');
    const toggle = document.getElementById('demoDockToggle');
    const close = document.getElementById('demoDockClose');
    toggle.addEventListener('click', () => dock.classList.toggle('is-open'));
    close.addEventListener('click', () => dock.classList.remove('is-open'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') dock.classList.remove('is-open');
    });
  }

  // 현재 페이지 네비게이션 활성화
  const currentNav = document.body.dataset.nav;
  if (currentNav) {
    const activeLink = document.querySelector(`[data-nav="${currentNav}"]`);
    if (activeLink) activeLink.classList.add('is-active');
  }
  const currentUserNav = document.body.dataset.userNav;
  if (currentUserNav) {
    const activeLink = document.querySelector(`[data-user-nav="${currentUserNav}"]`);
    if (activeLink) activeLink.classList.add('is-active');
  }
  const currentAdminNav = document.body.dataset.adminNav;
  if (currentAdminNav) {
    const activeLink = document.querySelector(`[data-admin-nav="${currentAdminNav}"]`);
    if (activeLink) activeLink.classList.add('is-active');
  }

  // 뷰 탭 전환
  document.querySelectorAll('.view-tabs').forEach((tabs) => {
    tabs.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const view = btn.dataset.view;
        document.querySelectorAll('[data-view-content]').forEach((el) => {
          el.style.display = el.dataset.viewContent === view ? '' : 'none';
        });
      });
    });
  });
});

// ───────────────────────────────────────────────────────
// 포맷터 · 데이터 로더
// ───────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7) return `${diff}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const formatNumber = (num) => new Intl.NumberFormat('ko-KR').format(num);

const loadData = async (name) => {
  try {
    const response = await fetch(`/mockup/data/${name}.json`);
    if (!response.ok) throw new Error(`Failed to load ${name}`);
    return await response.json();
  } catch (err) {
    console.error(err);
    return null;
  }
};

// V2.2 6단계 의제 라이프사이클 + 5개 지역 헬퍼
const ISSUE_STATUS = {
  submitted: { label: '제보', color: 'var(--color-status-submitted)', order: 1 },
  reviewing: { label: '검토중', color: 'var(--color-status-reviewing)', order: 2 },
  registered: { label: '공개등록', color: 'var(--color-status-registered)', order: 3 },
  assigned: { label: '멘토배정', color: 'var(--color-status-assigned)', order: 4 },
  progress: { label: '처리중', color: 'var(--color-status-progress)', order: 5 },
  resolved: { label: '해결완료', color: 'var(--color-status-resolved)', order: 6 },
  rejected: { label: '반려', color: 'var(--color-status-rejected)', order: 0 },
};

const REGIONS = {
  dj: { label: '대전', color: 'var(--color-region-dj)' },
  gj: { label: '공주', color: 'var(--color-region-gj)' },
  ys: { label: '예산', color: 'var(--color-region-ys)' },
  ca: { label: '천안', color: 'var(--color-region-ca)' },
  sj: { label: '세종', color: 'var(--color-region-sj)' },
};

if (typeof window !== 'undefined') {
  window.USCP = { formatDate, formatNumber, loadData, ISSUE_STATUS, REGIONS };
}
