"""USCP V2 Infrastructure Layer (외부 시스템 어댑터).

설계 근거: docs/02-design/features/uscp-v2.design.md §2.2

도메인이 의존하는 외부 시스템 (DB, Email, Object Storage, External API,
Audit Sink) 의 구현체를 격리. domain/ 의 abstract interface 를
infrastructure/ 의 concrete class 로 구현.

Sprint 1 부터 점진 추가 예정:
  - db/        : SQLAlchemy async session, repositories/
  - email/     : SMTP client, queue (Redis Stream), Jinja2 templates
  - storage/   : MinIO client, presigned URL
  - external/  : Kakao Map proxy (Optional)
  - audit/     : audit_writer (audit_logs 비동기 작성)
"""
