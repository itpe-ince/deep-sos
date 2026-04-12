"""MinIO 스토리지 헬퍼 — 이미지 업로드.

Sprint 2 BF-1 쓰기 API에서 multipart 업로드를 처리.
운영: MinIO (on-premise, S3 호환).
"""
from __future__ import annotations

import uuid
from datetime import timedelta
from io import BytesIO
from typing import BinaryIO

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

_ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
_ALLOWED_DOC_TYPES = {
    "application/pdf": ".pdf",
}
_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
_MAX_PDF_BYTES = 20 * 1024 * 1024  # 20MB (PDF는 조금 더 관대)


class StorageError(Exception):
    """Storage 계층 에러."""


def get_minio_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def ensure_bucket(client: Minio | None = None) -> None:
    """앱 시작 시 또는 첫 업로드 시 버킷 존재 보장."""
    client = client or get_minio_client()
    try:
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)
    except S3Error as exc:
        raise StorageError(f"Failed to ensure bucket: {exc}") from exc


def upload_image(
    file_obj: BinaryIO,
    content_type: str,
    *,
    size: int,
    folder: str = "issues",
) -> str:
    """이미지 파일을 MinIO에 업로드하고 접근 URL 반환.

    Args:
        file_obj: 파일 like object (e.g., UploadFile.file)
        content_type: multipart Content-Type
        size: 파일 크기 (bytes)
        folder: MinIO 내 폴더 prefix

    Returns:
        presigned GET URL (7일 유효) 또는 direct URL
    """
    if content_type not in _ALLOWED_IMAGE_TYPES:
        raise StorageError(
            f"Unsupported content type: {content_type}. "
            f"Allowed: {', '.join(_ALLOWED_IMAGE_TYPES)}"
        )
    if size > _MAX_SIZE_BYTES:
        raise StorageError(
            f"File too large: {size} bytes (max {_MAX_SIZE_BYTES})"
        )

    ext = _ALLOWED_IMAGE_TYPES[content_type]
    object_name = f"{folder}/{uuid.uuid4().hex}{ext}"

    client = get_minio_client()
    ensure_bucket(client)

    try:
        # 메모리 버퍼로 읽어 put_object 사용
        data = file_obj.read() if not isinstance(file_obj, BytesIO) else file_obj.getvalue()
        buf = BytesIO(data)
        client.put_object(
            settings.minio_bucket,
            object_name,
            buf,
            length=len(data),
            content_type=content_type,
        )
    except S3Error as exc:
        raise StorageError(f"Upload failed: {exc}") from exc

    # 로컬 개발: presigned GET URL (7일)
    try:
        url = client.presigned_get_object(
            settings.minio_bucket,
            object_name,
            expires=timedelta(days=7),
        )
        return url
    except S3Error as exc:
        raise StorageError(f"Presign failed: {exc}") from exc


def upload_pdf(
    data: bytes,
    *,
    folder: str = "portfolios",
) -> str:
    """PDF 바이너리 업로드 + presigned URL 반환."""
    if len(data) > _MAX_PDF_BYTES:
        raise StorageError(f"PDF too large: {len(data)} bytes (max {_MAX_PDF_BYTES})")

    object_name = f"{folder}/{uuid.uuid4().hex}.pdf"
    client = get_minio_client()
    ensure_bucket(client)

    try:
        client.put_object(
            settings.minio_bucket,
            object_name,
            BytesIO(data),
            length=len(data),
            content_type="application/pdf",
        )
    except S3Error as exc:
        raise StorageError(f"PDF upload failed: {exc}") from exc

    try:
        return client.presigned_get_object(
            settings.minio_bucket,
            object_name,
            expires=timedelta(days=7),
        )
    except S3Error as exc:
        raise StorageError(f"Presign failed: {exc}") from exc
