# USCP v1 Sprint 4 — Final Gap Analysis

## 분석 개요
- 대상: Sprint 4 전체 (P-30 KPI, 카카오맵, OAuth 실연동, VMS/1365, TipTap 업로드)
- 설계 기준: `docs/02-design/features/uscp-v1.design.md` §17
- 이전 분석: `uscp-v1-sprint3.analysis.md` (Sprint 3 99%)
- 분석일: 2026-04-12

---

## 1. Match Rate: **100%** 🎯

Sprint 3 99% → Sprint 4 **100%** (+1%p). 설계 §17 산출물 전량 반영 + 미설계 신규 항목 0 + 회귀 0.

---

## 2. §17.6 DoD — 7/7 충족

| # | 항목 | 근거 |
|---|---|---|
| 1 | `/admin/kpi` 4개 차트 | Day 2: 4 API 병렬 + 8 summary cards + CampusBars/CategoryDonut/TimeseriesLine (순수 SVG) |
| 2 | 카카오맵 키 분기 | Day 3~4: `KakaoMap.tsx` + fallback UI + `?view=map` SSR 토글 |
| 3 | OAuth 카카오 실연동 | Day 5: 3-provider 어댑터, 가짜 key 주입 시 kakao 서버 실호출 → `invalid_client` 전달 검증 |
| 4 | VMS Mock 자동 동기화 | Day 7: status 전이 트리거, 재호출 방지, `[VMS_MOCK]` 로그 + `mock-xxx` id |
| 5 | TipTap → MinIO | Day 8: `POST /admin/upload/image` admin only, 권한 401/403 확인 |
| 6 | Sprint 1~3 회귀 없음 | Day 9: 57 endpoints / 24 routes 전체 200 |
| 7 | Gap ≥ 90% | 본 분석 100% |

---

## 3. Sprint 4 구현 내역 (Day 1~10)

### Backend (+5 endpoints)
- 4 × `/admin/kpi/*` (summary/campuses/categories/timeseries)
- 1 × `POST /admin/upload/image`
- `oauth.py` callback 501 stub → 실 구현 (기존 경로)
- `volunteers.py confirm_participation` — VMS 트리거 추가

### Backend 신규 모듈
- `backend/app/services/oauth_service.py` — 3-provider httpx 어댑터
- `backend/app/integrations/vms_client.py` — Protocol + Mock + Real + safe wrapper
- `backend/app/api/v1/admin_kpi.py` — KPI 집계
- `backend/app/api/v1/admin_upload.py` — 이미지 업로드
- `backend/app/schemas/kpi.py` — KPI 스키마

### Frontend (+1 route)
- `/admin/kpi` (P-30)
- `/issues?view=map` (P-05 토글)
- `/auth/oauth/[provider]` 토큰 수신 실구현
- `components/map/KakaoMap.tsx` — SDK 로더 + 마커 + fallback
- `components/admin/TipTapEditor.tsx` — 이미지 업로드 버튼 확장

### 메트릭 추이
| 항목 | Sprint 3 | Sprint 4 | Δ |
|---|:---:|:---:|:---:|
| Backend endpoints | 52 | **57** | +5 |
| Backend paths | 41 | **46** | +5 |
| Frontend routes | 23 | **24** | +1 |
| DB tables | 15 | 15 | 0 |
| Match Rate | 99% | **100%** | +1%p |

---

## 4. 남은 Gap 심각도

### 🔴 Critical: 0건
### 🟡 Important: 0건
### 🟢 Deferred (§17.7 Sprint 5+ 이월)
- PDF 포트폴리오 내보내기 (Playwright/weasyprint)
- WebSocket 실시간 알림
- 성능 최적화, 부하 테스트
- 운영 배포 (nginx reverse proxy, HTTPS, CI/CD 완성)
- `vms_record_id` 컬럼 추가 (VMS real 연동 준비)

모두 설계상 정식 이월 항목.

---

## 5. Sprint 4 완료 판정

**✅ 승인 — Sprint 4 완료 선언**

- §17.6 DoD 7/7 전부 충족
- Match Rate **100%** (목표 90% 대비 +10%p)
- Critical/Important Gap 0건
- Sprint 1~3 회귀 0건
- 설계 외 신규 추가 항목 0개 (범위 완벽 준수)

### 권장 후속 단계
1. `/pdca report uscp-v1` — Sprint 1+2+3+4 통합 완료 보고서 확장
2. `/pdca plan` → **Sprint 5** (운영 배포 + PDF + WebSocket + 부하 테스트)
3. Dynamic 레벨이므로 Sprint 5 운영 배포 단계에서 `/pdca team` 병렬 실행 검토 가능

### 2026.12 오픈 로드맵 진행률
- Sprint 0~4 완료: **8주 / 14주 = 57%**
- Sprint 5~7: 6주 남음 (운영/배포/안정화)
