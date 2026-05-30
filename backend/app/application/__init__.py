"""USCP V2 Application Layer (Use Cases / Services).

설계 근거: docs/02-design/features/uscp-v2.design.md §2.2

본 레이어는 도메인 로직과 인프라 (DB/Email/Storage) 사이의 use case
오케스트레이션을 담당. presentation/ (FastAPI Router) 은 본 레이어의
service 만 호출하고, domain/ 의 entity·value object 를 직접 조작하지 않음.

Sprint 1 (M01·M09) 부터 실제 service 모듈을 점진 추가:
  - auth_service.py
  - issue_service.py
  - gatekeeping_service.py
  - notification_service.py
  - project_service.py
  - mentor_matching_service.py
  - ...
"""
