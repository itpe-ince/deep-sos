/* USCP - Common Scripts */

// 공통 컴포넌트 주입 (GNB, Footer)
const COMMON_HEADER_PUBLIC = `
<header class="gnb" data-component="Header">
  <div class="gnb__inner">
    <a href="/mockup/pages/index.html" class="gnb__brand">
      <img src="/mockup/images/logo.png" alt="국립공주대학교" style="height:32px;">
      <div style="display:flex;flex-direction:column;line-height:1.2;">
        <span style="font-size:20px;font-weight:900;letter-spacing:-0.02em;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">USCP</span>
        <span style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:var(--color-text-secondary);">온라인 사회공헌 플랫폼</span>
      </div>
    </a>
    <nav class="gnb__menu" data-component="Navigation">
      <a href="/mockup/pages/public/about.html" data-nav="about">플랫폼 소개</a>
      <a href="/mockup/pages/public/guide.html" data-nav="guide">참여 방법</a>
      <a href="/mockup/pages/public/issues.html" data-nav="issues">지역 문제</a>
      <a href="/mockup/pages/public/projects.html" data-nav="projects">리빙랩 프로젝트</a>
      <a href="/mockup/pages/public/volunteers.html" data-nav="volunteers">봉사활동</a>
      <a href="/mockup/pages/public/success-cases.html" data-nav="cases">성공 사례</a>
    </nav>
    <div class="gnb__actions">
      <button class="btn btn--icon btn--ghost" aria-label="검색">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
      </button>
      <a href="/mockup/pages/public/login.html" class="btn btn--secondary">로그인</a>
      <a href="/mockup/pages/public/login.html" class="btn btn--primary">회원가입</a>
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
    <a href="/mockup/pages/index.html" class="gnb__brand">
      <img src="/mockup/images/logo.png" alt="국립공주대학교" style="height:32px;">
      <div style="display:flex;flex-direction:column;line-height:1.2;">
        <span style="font-size:20px;font-weight:900;letter-spacing:-0.02em;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">USCP</span>
        <span style="font-size:12px;font-weight:600;letter-spacing:0.08em;color:var(--color-text-secondary);">온라인 사회공헌 플랫폼</span>
      </div>
    </a>
    <nav class="gnb__menu" data-component="Navigation">
      <a href="/mockup/pages/public/about.html" data-nav="about">플랫폼 소개</a>
      <a href="/mockup/pages/public/issues.html" data-nav="issues">지역 문제</a>
      <a href="/mockup/pages/public/projects.html" data-nav="projects">리빙랩 프로젝트</a>
      <a href="/mockup/pages/public/volunteers.html" data-nav="volunteers">봉사활동</a>
      <a href="/mockup/pages/public/success-cases.html" data-nav="cases">성공 사례</a>
    </nav>
    <div class="gnb__actions">
      <button class="btn btn--icon btn--ghost" aria-label="검색">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
      </button>
      <button class="btn btn--icon btn--ghost gnb__notify" aria-label="알림">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span class="gnb__notify-dot"></span>
      </button>
      <button class="gnb__user">
        <div class="gnb__user-avatar">박</div>
        <span class="gnb__user-name">박학생</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <button class="gnb__mobile-toggle btn btn--icon btn--ghost" aria-label="메뉴">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M4 12h16M4 6h16M4 18h16"/>
        </svg>
      </button>
    </div>
  </div>
</header>
`;

const ADMIN_SIDE = `
<aside class="admin-side" data-component="AdminSidebar">
  <div class="admin-side__brand">
    <img src="/mockup/images/logo.png" alt="국립공주대학교" style="height:28px;">
    <div>
      <div class="admin-side__title">USCP 관리자</div>
    </div>
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
      KPI · SDGs
    </a>

    <div class="admin-side__section">콘텐츠 관리 (CMS)</div>
    <a href="/mockup/pages/admin/cms-pages.html" class="admin-side__item" data-admin-nav="cms-pages">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
      </svg>
      소개 페이지
    </a>
    <a href="/mockup/pages/admin/cms-banners.html" class="admin-side__item" data-admin-nav="cms-banners">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
      배너 · 공지
    </a>

    <div class="admin-side__section">활동 관리</div>
    <a href="/mockup/pages/admin/issues.html" class="admin-side__item" data-admin-nav="issues">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      지역 문제
      <span class="admin-side__item-badge admin-side__item-badge--danger">7</span>
    </a>
    <a href="/mockup/pages/admin/projects.html" class="admin-side__item" data-admin-nav="projects">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-4"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      리빙랩 프로젝트
      <span class="admin-side__item-badge">12</span>
    </a>
    <a href="/mockup/pages/admin/volunteers.html" class="admin-side__item" data-admin-nav="volunteers">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
      봉사활동
      <span class="admin-side__item-badge">24</span>
    </a>
    <a href="#" class="admin-side__item">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      ESG · SDGs 프로그램
    </a>
    <a href="/mockup/pages/admin/success-cases.html" class="admin-side__item" data-admin-nav="success-cases">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
      </svg>
      성공 사례
    </a>

    <div class="admin-side__section">시스템</div>
    <a href="/mockup/pages/admin/users.html" class="admin-side__item" data-admin-nav="users">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
      사용자 관리
    </a>
    <a href="/mockup/pages/admin/organizations.html" class="admin-side__item" data-admin-nav="organizations">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M3 21v-2a4 4 0 014-4h10a4 4 0 014 4v2M7 3h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/>
      </svg>
      참여 기관 · MOU
    </a>
    <a href="#" class="admin-side__item">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
      시스템 설정
    </a>
  </nav>
  <div class="admin-side__profile">
    <div class="admin-side__profile-avatar">관</div>
    <div style="flex: 1; min-width: 0;">
      <div class="admin-side__profile-name">관리자</div>
      <div class="admin-side__profile-role">지역사회특화센터</div>
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
      <span>이슈·프로젝트·사용자 검색...</span>
    </div>
  </div>
  <div class="admin-top__actions">
    <button class="admin-top__icon-btn" aria-label="도움말">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
      </svg>
    </button>
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

const USER_LNB = `
<aside class="lnb" data-component="UserLNB">
  <div class="lnb__profile">
    <div class="lnb__avatar">박</div>
    <div class="lnb__profile-info">
      <div class="lnb__profile-name">박학생</div>
      <div class="lnb__profile-role">대전캠퍼스 · 학생</div>
    </div>
  </div>
  <nav class="lnb__nav">
    <div class="lnb__section">내 활동</div>
    <a href="/mockup/pages/user/dashboard.html" class="lnb__item" data-user-nav="dashboard">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
        <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
      대시보드
    </a>
    <a href="/mockup/pages/user/issue-new.html" class="lnb__item" data-user-nav="issue-new">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      문제 제보하기
    </a>
    <a href="/mockup/pages/user/project-member.html" class="lnb__item" data-user-nav="projects">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-4"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      내 프로젝트
      <span class="lnb__item-badge">3</span>
    </a>
    <a href="/mockup/pages/user/volunteer-apply.html" class="lnb__item" data-user-nav="volunteer-apply">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
      봉사활동 신청
    </a>
    <a href="/mockup/pages/user/portfolio.html" class="lnb__item" data-user-nav="portfolio">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
      사회공헌 포트폴리오
    </a>

    <div class="lnb__section">참여 프로젝트</div>
    <a href="/mockup/pages/user/project-member.html" class="lnb__item" data-user-nav="project-current">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      대전잡스 프로젝트
      <span class="badge badge--status-progress" style="margin-left:auto;font-size:10px;padding:2px 6px;">실행</span>
    </a>
    <a href="#" class="lnb__item" style="opacity:0.5;pointer-events:none;">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      공주 리빙랩 프로젝트
      <span class="badge badge--gray" style="margin-left:auto;font-size:10px;padding:2px 6px;">탐색</span>
    </a>
    <a href="#" class="lnb__item" style="opacity:0.5;pointer-events:none;">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      세종 교통문제 해결
      <span class="badge badge--success" style="margin-left:auto;font-size:10px;padding:2px 6px;">완료</span>
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
          <img src="/mockup/images/logo.png" alt="국립공주대학교" style="height:32px;filter:brightness(0) invert(1);">
        </div>
        <p class="footer__desc">
          대학-지자체-시민이 함께하는 온라인 사회공헌 플랫폼.<br>
          지역의 문제를 함께 발견하고, 해결하고, 성과를 나눕니다.
        </p>
      </div>
      <div>
        <h4 class="footer__title">플랫폼</h4>
        <ul class="footer__list">
          <li><a href="/mockup/pages/public/about.html">USCP란?</a></li>
          <li><a href="/mockup/pages/public/campus.html">캠퍼스 소개</a></li>
          <li><a href="/mockup/pages/public/guide.html">참여 방법</a></li>
          <li><a href="/mockup/pages/public/success-cases.html">성공 사례</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__title">활동</h4>
        <ul class="footer__list">
          <li><a href="/mockup/pages/public/issues.html">지역 문제</a></li>
          <li><a href="/mockup/pages/public/projects.html">리빙랩 프로젝트</a></li>
          <li><a href="/mockup/pages/public/volunteers.html">봉사활동</a></li>
          <li><a href="#">ESG/SDGs</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__title">운영 기관</h4>
        <ul class="footer__list">
          <li>지역사회특화센터</li>
          <li>ESG센터</li>
          <li>국제협력센터</li>
          <li style="margin-top:12px;"><a href="#">문의: sos-lab@univ.ac.kr</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <div>© 2026 USCP · 2025 글로컬대학 본지정 사업</div>
      <div class="footer__sdgs">
        <div class="footer__sdg-badge" title="SDG 4">4</div>
        <div class="footer__sdg-badge" title="SDG 9">9</div>
        <div class="footer__sdg-badge" title="SDG 10">10</div>
        <div class="footer__sdg-badge" title="SDG 11">11</div>
        <div class="footer__sdg-badge" title="SDG 17">17</div>
      </div>
    </div>
  </div>
</footer>
`;

const DEMO_DOCK = `
<div class="demo-dock" id="demoDock">
  <button class="demo-dock__toggle" id="demoDockToggle" type="button">
    <span class="demo-dock__toggle-dot"></span>
    데모 네비게이션
  </button>
  <div class="demo-dock__panel">
    <div class="demo-dock__header">
      <div class="demo-dock__title">🎯 전체 화면 (31개)</div>
      <button class="demo-dock__close" id="demoDockClose" type="button" aria-label="닫기">✕</button>
    </div>

    <div class="demo-dock__group" style="--group-color: #2563eb;">
      <div class="demo-dock__group-title">공개 영역 (11)</div>
      <a href="/mockup/pages/index.html" class="demo-dock__item"><span class="demo-dock__item-code">P-01</span>홈</a>
      <a href="/mockup/pages/public/about.html" class="demo-dock__item"><span class="demo-dock__item-code">P-02</span>USCP란?</a>
      <a href="/mockup/pages/public/campus.html" class="demo-dock__item"><span class="demo-dock__item-code">P-03</span>캠퍼스별 리빙랩</a>
      <a href="/mockup/pages/public/guide.html" class="demo-dock__item"><span class="demo-dock__item-code">P-04</span>참여 방법 안내</a>
      <a href="/mockup/pages/public/issues.html" class="demo-dock__item"><span class="demo-dock__item-code">P-05</span>지역 문제 목록</a>
      <a href="/mockup/pages/public/issue-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">P-06</span>지역 문제 상세</a>
      <a href="/mockup/pages/public/projects.html" class="demo-dock__item"><span class="demo-dock__item-code">P-07</span>프로젝트 목록</a>
      <a href="/mockup/pages/public/project-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">P-08</span>프로젝트 상세</a>
      <a href="/mockup/pages/public/success-cases.html" class="demo-dock__item"><span class="demo-dock__item-code">P-09</span>성공 사례</a>
      <a href="/mockup/pages/public/login.html" class="demo-dock__item"><span class="demo-dock__item-code">P-10</span>로그인/회원가입</a>
      <a href="/mockup/pages/public/volunteers.html" class="demo-dock__item"><span class="demo-dock__item-code">P-+</span>봉사활동 목록</a>
    </div>

    <div class="demo-dock__group" style="--group-color: #059669;">
      <div class="demo-dock__group-title">사용자 영역 (8)</div>
      <a href="/mockup/pages/user/dashboard.html" class="demo-dock__item"><span class="demo-dock__item-code">P-11</span>대시보드</a>
      <a href="/mockup/pages/user/issue-new.html" class="demo-dock__item"><span class="demo-dock__item-code">P-12</span>이슈 등록</a>
      <a href="/mockup/pages/user/project-member.html" class="demo-dock__item"><span class="demo-dock__item-code">P-13</span>프로젝트 참여</a>
      <a href="/mockup/pages/user/feedback-new.html" class="demo-dock__item"><span class="demo-dock__item-code">P-14</span>현장 피드백</a>
      <a href="/mockup/pages/user/idea-board.html" class="demo-dock__item"><span class="demo-dock__item-code">P-15</span>아이디어 보드</a>
      <a href="/mockup/pages/user/volunteer-apply.html" class="demo-dock__item"><span class="demo-dock__item-code">P-16</span>봉사활동 신청</a>
      <a href="/mockup/pages/user/portfolio.html" class="demo-dock__item"><span class="demo-dock__item-code">P-17</span>포트폴리오</a>
      <a href="/mockup/pages/user/profile.html" class="demo-dock__item"><span class="demo-dock__item-code">P-18</span>프로필 설정</a>
    </div>

    <div class="demo-dock__group" style="--group-color: #7c3aed;">
      <div class="demo-dock__group-title">관리자 영역 (12)</div>
      <a href="/mockup/pages/admin/dashboard.html" class="demo-dock__item"><span class="demo-dock__item-code">P-19</span>통합 대시보드</a>
      <a href="/mockup/pages/admin/cms-pages.html" class="demo-dock__item"><span class="demo-dock__item-code">P-20</span>CMS 편집</a>
      <a href="/mockup/pages/admin/cms-banners.html" class="demo-dock__item"><span class="demo-dock__item-code">P-21</span>배너/공지</a>
      <a href="/mockup/pages/admin/issues.html" class="demo-dock__item"><span class="demo-dock__item-code">P-22</span>이슈 관리</a>
      <a href="/mockup/pages/admin/issue-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">P-23</span>이슈 처리</a>
      <a href="/mockup/pages/admin/projects.html" class="demo-dock__item"><span class="demo-dock__item-code">P-24</span>프로젝트 칸반</a>
      <a href="/mockup/pages/admin/project-detail.html" class="demo-dock__item"><span class="demo-dock__item-code">P-25</span>프로젝트 상세</a>
      <a href="/mockup/pages/admin/volunteers.html" class="demo-dock__item"><span class="demo-dock__item-code">P-26</span>봉사 관리 (VMS)</a>
      <a href="/mockup/pages/admin/organizations.html" class="demo-dock__item"><span class="demo-dock__item-code">P-27</span>참여기관·MOU</a>
      <a href="/mockup/pages/admin/users.html" class="demo-dock__item"><span class="demo-dock__item-code">P-28</span>사용자 관리</a>
      <a href="/mockup/pages/admin/success-cases.html" class="demo-dock__item"><span class="demo-dock__item-code">P-29</span>성공 사례 관리</a>
      <a href="/mockup/pages/admin/kpi.html" class="demo-dock__item"><span class="demo-dock__item-code">P-30</span>KPI · SDGs</a>
    </div>

    <a href="/mockup/pages/sitemap.html" class="demo-dock__sitemap-btn">
      📋 사이트맵 전체 보기
    </a>
  </div>
</div>
`;

// 공통 요소 주입
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

  // Demo Dock 자동 주입 (모든 페이지에 고정 네비게이션)
  if (!document.getElementById('demoDock')) {
    document.body.insertAdjacentHTML('beforeend', DEMO_DOCK);
    const dock = document.getElementById('demoDock');
    const toggle = document.getElementById('demoDockToggle');
    const close = document.getElementById('demoDockClose');
    toggle.addEventListener('click', () => dock.classList.toggle('is-open'));
    close.addEventListener('click', () => dock.classList.remove('is-open'));
    // ESC 닫기
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

// 포맷터
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7) return `${diff}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

// JSON 데이터 로더
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

// Export (모듈 환경 대비)
if (typeof window !== 'undefined') {
  window.USCP = { formatDate, formatNumber, loadData };
}
