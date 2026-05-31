---
template: compliance-checklist
feature: M08-10
title: USCP WCAG 2.1 AA 접근성 준수 체크리스트
date: 2026-05-31
author: 메인 어시스턴트
status: UAT 직전 검증 대상
references:
  - feature-spec §M08-10
  - design.md §8.4 (접근성 컴플라이언스)
---

# USCP WCAG 2.1 AA 접근성 준수 체크리스트 (M08-10)

공공기관 의무 사항. **시범운영(UAT) 직전** 운영자가 Lighthouse + axe DevTools로
전 화면을 검증하여 **위반 0건**을 목표로 한다. 카카오맵 등 외부 임베드는 검증 예외.

## 핵심 검증 5개 항목 (한혜진 NFR-A11Y)

| # | 항목 | WCAG 기준 | 검증 방법 |
|---|---|---|---|
| ① | **헤딩 구조의 논리적 순서** | 1.3.1, 2.4.6 | 페이지당 `h1` 1개, 건너뛰지 않는 계층(h1→h2→h3) |
| ② | **키보드만으로 모든 기능 접근** | 2.1.1, 2.4.3 | Tab/Shift+Tab/Enter/Esc 로 전 기능 도달·조작, focus ring 가시 |
| ③ | **이미지 대체 텍스트** | 1.1.1 | 의미 이미지 `alt` 제공, 장식 이미지 `alt=""`/`aria-hidden` |
| ④ | **명도 대비 4.5:1 이상** | 1.4.3 | 본문 텍스트/배경 대비 ≥ 4.5:1 (대형 텍스트 3:1) |
| ⑤ | **스크린리더 호환** | 4.1.2, 1.3.1 | label/aria-label, table `caption`+`th[scope]`, role/aria-selected |

## 도구 기반 검증 절차

```
1. Chrome DevTools → Lighthouse → Accessibility 카테고리 실행 (목표 100점)
2. axe DevTools 확장 → 전 화면 Scan → Critical/Serious 위반 0건
3. 키보드 단독 조작 (마우스 미사용) 전 여정 1회 통과
4. 스크린리더(NVDA/VoiceOver) 핵심 여정(로그인·제보·관리자) 청취 확인
```

## 화면별 검증 체크리스트 (24개 화면 / 핵심)

| 화면 | ① 헤딩 | ② 키보드 | ③ alt | ④ 대비 | ⑤ SR | 비고 |
|---|:--:|:--:|:--:|:--:|:--:|---|
| 공통(루트 layout) | — | ☑ skip link `#main-content` | — | — | ☑ | "본문으로 건너뛰기" 제공 |
| 홈 #1 | ☐ | ☐ | ☐ | ☐ | ☐ | 지역 지도 핀 = 카카오맵 **예외** |
| 로그인 #2 | ☐ | ☐ | ☐ | ☐ | ☐ | form label 필수 |
| 제보 광장 #3 | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 제보 상세 #4 | ☐ | ☐ | ☐ | ☐ | ☐ | 사진 alt |
| 리빙랩 상세 #6 | ☐ | ☐ | ☐ | ☐ | ☐ | 게시판 탭 멤버 전용 |
| 성공사례 #7 | ☐ | ☐ | ☐ | ☐ | ☐ | TipTap 본문 헤딩 |
| 관리자 대시보드 #20 | ☐ | ☐ | ☐ | ☐ | ☐ | |
| **사용자·권한 #24** | ☑ h1 | ☑ | ☑ icon aria-hidden | ☐ | ☑ table caption+scope, role=search | M08-03 |
| **감사 로그 #24b** | ☑ h1 | ☑ | ☑ | ☐ | ☑ role=tablist/tab + aria-selected | M08-08 |

> ☑ = 구현 시 적용 완료(코드 검증). ☐ = UAT 직전 도구 검증 대기. ④ 대비는 디자인
> 토큰(`text`/`primary`/`secondary`) 기반이라 토큰 자체 대비를 Lighthouse로 일괄 확인.

## M08 신규 화면 적용 내역 (코드 레벨)

`/admin/users`(M08-01/02/03), `/admin/audit`(M08-08) 구현 시 다음을 반영:

- **① 헤딩**: 각 페이지 `<h1>` 단일 + 섹션 설명 `<p>`
- **② 키보드**: 모든 액션은 `<button>`/`<input>`/`<select>`/`<a>` — 네이티브 포커스 가능,
  `focus:border-primary focus:ring-1` 가시 포커스, 루트 skip link 로 본문 진입
- **③ alt**: 장식 아이콘 전부 `aria-hidden="true"` (lucide)
- **⑤ 스크린리더**:
  - 테이블 `<caption className="sr-only">` + `<th scope="col">`
  - 검색 영역 `role="search" aria-label`, 탭 `role="tablist"/"tab" aria-selected`
  - 모든 입력 `<label>` 텍스트 연결 (운영자 추가 모달 포함)
  - ConfirmModal/Modal 은 §7.2.1 표준(focus trap·Esc) 준수

## 예외 대상

- 카카오맵 임베드(홈 지역 지도, 제보 위치) — 외부 iframe, 검증 예외
- 외부 링크 미리보기 썸네일

## 합격 기준 (DoD)

- [ ] Lighthouse Accessibility 전 화면 ≥ 95 (목표 100)
- [ ] axe DevTools Critical/Serious 위반 0건
- [ ] 키보드 단독 전 여정 통과
- [ ] 스크린리더 핵심 여정(로그인/제보/관리자) 통과
- [ ] 잔여 위반 0건 도달까지 개선 반복
