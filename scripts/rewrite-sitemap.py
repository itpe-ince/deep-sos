#!/usr/bin/env python3
"""sitemap.md의 §3 ASCII 트리 4개를 Mermaid + 헤더/리스트 구조로 교체."""
import re
from pathlib import Path

PATH = Path('docs/01-plan/uscp-sitemap.md')

NEW_SECTION_3 = """## 3. 전체 메뉴 구조 (Information Architecture)

### 3.0 전체 개요

```mermaid
flowchart TD
  ROOT(["🌐 USCP 플랫폼"])

  PUB["<b>공개 영역</b><br/>10개 화면<br/>비로그인 열람"]
  USR["<b>사용자 영역</b><br/>3개 화면<br/>시민 회원 전용"]
  ADM["<b>관리자 영역</b><br/>11개 화면<br/>운영자 단일 역할"]

  ROOT --> PUB
  ROOT --> USR
  ROOT --> ADM

  PUB --> P1["🏠 홈"]
  PUB --> P2["📖 USCP 소개"]
  PUB --> P3["💬 지역문제 광장"]
  PUB --> P4["🧪 리빙랩"]
  PUB --> P5["🤝 협력 네트워크"]
  PUB --> P6["📊 성과자료"]
  PUB --> P7["🔐 로그인 / 회원가입"]

  USR --> U1["✍️ 지역문제 제보"]
  USR --> U2["📋 내 활동"]
  USR --> U3["👤 프로필"]

  ADM --> A1["📊 대시보드"]
  ADM --> A2["🔎 게이트키핑"]
  ADM --> A3["🧪 리빙랩 관리"]
  ADM --> A4["👥 멘토·학생팀"]
  ADM --> A5["🤝 협력 네트워크 관리"]
  ADM --> A6["📈 성과자료 관리"]
  ADM --> A7["📝 콘텐츠 관리"]
  ADM --> A8["🗂 사용자·감사"]

  classDef root fill:#1E40AF,stroke:#1E3A8A,color:#fff,stroke-width:2px
  classDef pub fill:#DBEAFE,stroke:#1E40AF,color:#1E3A8A
  classDef usr fill:#DCFCE7,stroke:#15803D,color:#14532D
  classDef adm fill:#FEF3C7,stroke:#92400E,color:#78350F

  class ROOT root
  class PUB,P1,P2,P3,P4,P5,P6,P7 pub
  class USR,U1,U2,U3 usr
  class ADM,A1,A2,A3,A4,A5,A6,A7,A8 adm
```

> 위 다이어그램은 3개 영역과 24개 화면의 계층 관계를 시각화한 것입니다. 각 영역별 상세 메뉴는 아래 §3.1~§3.4에서 계단식으로 표기됩니다.

---

### 3.1 공개 영역 (비로그인 열람)

> 🌐 **URL Base**: `/`

#### 🏠 홈 — `/`
- 통계 카드 (운영 지역 수·진행중 리빙랩 수·해결 완료 수)
- 6단계 프로세스 안내 바
- 최근 제보 카드
- 5개 지역 현황 지도 (카카오맵)
- 리빙랩 현황 요약 (모집중·진행중·완료)
- 협력기관 현황 요약 (지·산·학·관)
- 공지사항 바

#### 📖 USCP 소개 — `/about` *(정적 HTML)*
- 플랫폼 소개
- 5개 지역 안내
- 참여주체 안내 (지·산·학·관)
- 양교 MOU 안내 (공주대·충남대)

#### 💬 지역문제 광장 — `/issues`
- 카드형 목록 (지역·단계·**트랙 라벨** 필터, **키워드 검색** 지원)
- 단계별 진행 상태 공개
- 트랙 라벨 뱃지 표시 (정책반영·정책참고·시민자율)
- 공감수 정렬
- 📄 **제보 상세** — `/issues/:id`

#### 🧪 리빙랩 — `/projects`
- 단계별 목록 (모집중·진행중·완료)
- 📄 **리빙랩 상세** — `/projects/:id`
  - 개요·멤버·기관 정보
  - 활동 타임라인
  - 산출물 조회
  - 🔒 게시판 탭 — *멤버 전용 (멘토·학생팀·운영자만 노출)*
- 🏆 **성공사례 스토리** — `/success-cases` *(4단계: 문제→과정→결과→정책반영)*

#### 🤝 협력 네트워크 — `/network`
- 참여기관 현황 (지·산·학·관)
- MOU 현황
- 프로그램 운영 현황
- 커뮤니티 (활동소식·모임)

#### 📊 성과자료 — `/performance`
- 성과지표 현황
- 공지·이벤트 통합 게시판 *(카테고리 필터: 전체/공지/이벤트, 카드 뱃지 구분)*
- 자료실 *(가이드·양식·툴킷·기타 — 카테고리 탭, 다운로드 카운트 표시)*

#### 🔐 로그인 / 회원가입 — `/login`
- 이메일 로그인 *(실패 5회 시 30분 잠금)*
- 회원가입 *(이메일·비밀번호·이름·만 14세 이상 확인·통합 동의)*
- 비밀번호 보안 정책 *(8자 이상·영문/숫자/특수문자, JWT TTL Access 1h/Refresh 7d, 다중 디바이스 허용)*
- 약관 재동의 모달 *(로그인 시 약관 신 버전 미동의 회원에게 노출 — 동의/거부 처리)*

---

### 3.2 사용자 영역 (시민 회원 로그인 후)

> 👤 **URL Base**: `/user/*`

#### ✍️ 지역문제 제보 — `/user/issue-new`
- 지역 선택 (5개 중 1개)
- 제목·내용 입력
- 사진 첨부 *(최대 5장, 각 5MB 이내, JPG/PNG/WebP)*
- 제보 등록 → 검토 단계 진입

#### ❤️ 공감투표
*의제 상세 페이지 내, 1인 1회 (취소 가능)*

#### 💬 댓글 작성·수정·삭제
*의제 상세 페이지 내, 로그인 필수, 수정·삭제는 작성자 본인 또는 운영자*

#### 📋 내 활동 — `/user/my-activities`
- 내 제보 목록·진행 상황
- 내가 공감한 의제
- 내 댓글

#### 👤 프로필 — `/user/profile`
- 이름·소속·연락처 수정
- 비밀번호 변경
- 이메일 알림 수신 설정
- 회원 탈퇴

---

### 3.3 관리자 영역 (운영자 단일 역할)

> ⚙️ **URL Base**: `/admin/*`

#### 📊 대시보드 — `/admin/dashboard`
- 전체 현황 수치
- 처리 대기 제보 (게이트키핑 큐)
- 시각화 차트 (지역별·단계별)

#### 🔎 지역문제 게이트키핑 — `/admin/issues`
- 신규 제보 검토 큐 *(키워드 검색·필터)*
- 📄 **상세 검토** — `/admin/issues/:id`
- 승인 → 단계 전환 *(자동 이메일 알림)*
- 검토중 진입 시 **트랙 라벨 지정** (정책반영·정책참고·시민자율)
- 반려 → 사유 기록 *(감사 로그)*
- 검토 의견 입력
- 댓글로 해결 → 단계 전환 *(resolved, 사유=comment_resolution)*
- 6단계 진행 이력 자동 기록

#### 🧪 리빙랩 관리 — `/admin/projects`
- 리빙랩 등록·수정 *(5개 지역 분류·6단계 연동)*
- 📄 **상세** — `/admin/projects/:id`
- 활동 타임라인 작성
- 산출물 업로드 *(단계별 분류)*
- 게시판 관리 — *게시글·댓글 조정 권한 (멤버 전용 비공개 게시판)*
- 🏆 **성공사례 스토리 작성** — `/admin/success-cases` *(4단계)*

#### 👥 멘토·학생팀 운영 — `/admin/mentors`
- 멘토 선정 *(가입자 중 운영자가 자격 부여)*
- 학생팀 구성 *(가입자 중 운영자가 직접 편성)*
- 멘토단 매칭 *(운영자 수동 매칭)*
- 매칭 알림 발송 *(이메일 통보형)*
- 멘토단 활동 기록

#### 🤝 협력 네트워크 관리 — `/admin/organizations`
- 협력기관 등록·수정·삭제·활성 토글 *(지·산·학·관, FK 무결성 검증)*
- MOU 등록·생애주기 관리
- 프로그램 통합 운영
- 커뮤니티 게시글·댓글 관리

#### 📈 성과자료 관리 — `/admin/kpi`
- 성과지표 등록·수정
- 실적 입력 *(월별·분기별)*
- 자동 집계 *(해결완료 카운트)*
- 엑셀/CSV 다운로드
- 성과지표 대시보드

#### 📝 콘텐츠 관리 — `/admin/cms-banners`
- 공지사항 *(WYSIWYG 에디터)* — 공지·이벤트 통합 게시판에 "공지" 뱃지로 노출
- 이벤트 공지 *(WYSIWYG 에디터)* — 공지·이벤트 통합 게시판에 "이벤트" 뱃지로 노출
- 자료실 파일 업로드 *(카테고리: 가이드/양식/툴킷/기타, 다운로드 카운트 조회)*
- 메인 배너 관리 *(단순 도구)*
- 📜 **약관 관리** — `/admin/terms` — WYSIWYG + 버전 관리 + **새 버전 발행 시 재동의 필요 토글**

#### 🗂 사용자 관리 — `/admin/users`
- 시민 회원 목록·검색
- 운영자 추가·삭제
- 멘토 자격 부여

#### 🛡 권한·감사 — `/admin/audit`
- 로그인 이력
- 게이트키핑 이력 *(누가·언제·승인/반려)*
- 개인정보 조회 로그
- 시스템 활동 로그
- 보관 정책: 최소 1년

---

### 3.4 공통 요소 (전체 화면 공통)

#### 🧭 헤더 (GNB)
- 로고 (USCP)
- 메뉴: 홈 · USCP 소개 · 지역문제 광장 · 리빙랩 · 협력 네트워크 · 성과자료
- 우측: 로그인 / 회원가입 (또는 마이페이지·로그아웃)

#### 🏷 푸터
- 기관 정보 (공주대 지역사회특화센터)
- 약관 링크 (이용약관·개인정보처리방침)
- 저작권

#### 📱 반응형 레이아웃
- PC · 태블릿 · 모바일 (Tailwind breakpoints: sm 640 / md 768 / lg 1024 / xl 1280)

#### ♿ 접근성 (WCAG 2.1 AA)
- 헤딩 구조 · 키보드 네비 · 이미지 alt · 색상 대비 4.5:1 · 스크린리더 호환
- UAT 직전 Lighthouse + axe DevTools 검증, 위반 0건 목표

"""

# 기존 파일 읽기
text = PATH.read_text(encoding='utf-8')

# §3 전체 영역을 매칭 (## 3. ... 부터 다음 ## 4. 직전까지)
# re.DOTALL 사용해서 multi-line 매칭
pattern = re.compile(r'## 3\. 전체 메뉴 구조 \(Information Architecture\).*?(?=\n## 4\. 화면 목록)', re.DOTALL)
match = pattern.search(text)

if not match:
    print("✗ §3 패턴 매칭 실패")
    raise SystemExit(1)

print(f"기존 §3 길이: {len(match.group())} 문자")

# 교체
new_text = pattern.sub(NEW_SECTION_3, text)

# Version History 추가 — 만약 Version History 섹션이 없으면 추가
if 'Version History' in new_text:
    # 최신 버전 행 위에 새 행 추가
    new_text = re.sub(
        r'(\| 3\.4 \| 2026-05-27 \|)',
        r'| 3.5 | 2026-05-28 | §3 IA 트리를 **Mermaid 다이어그램 + 헤더/리스트 계단식 구조**로 전면 교체 (ASCII 트리 폐기). PDF 변환 시 가독성·구조 인식 향상. |\n\\1',
        new_text,
    )
else:
    # Version History 섹션 추가
    new_text += """

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 3.5 | 2026-05-28 | §3 IA 트리를 **Mermaid 다이어그램 + 헤더/리스트 계단식 구조**로 전면 교체 (ASCII 트리 폐기). PDF 변환 시 가독성·구조 인식 향상. |
"""

PATH.write_text(new_text, encoding='utf-8')

print(f"✓ {PATH} 갱신 완료")
print(f"  - ASCII 트리 4개 (3.1~3.4) → Mermaid + 헤더/리스트로 교체")
print(f"  - 3.0 Mermaid 전체 개요 다이어그램 추가")
print(f"  - 최종 길이: {len(new_text)} 문자")

# 검증
verify = PATH.read_text(encoding='utf-8')
print("\n=== 검증 ===")
print(f"ASCII 트리 문자(├) 잔존: {verify.count('├')} (0 기대)")
print(f"ASCII 트리 문자(└) 잔존: {verify.count('└')} (0 기대)")
print(f"ASCII 트리 문자(│) 잔존: {verify.count('│')} (0 기대)")
print(f"mermaid 블록 개수: {verify.count('```mermaid')} (1 기대)")
print(f"#### 헤더 개수: {verify.count(chr(10) + '#### ')} (영역별 메뉴 헤더, 25+ 기대)")
