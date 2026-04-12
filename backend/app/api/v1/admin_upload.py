"""Admin 전용 이미지 업로드 — Sprint 4 Day 8.

TipTap 에디터에서 CMS 본문에 삽입할 이미지를 MinIO에 업로드하고
presigned GET URL을 반환.
"""
from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import require_admin
from app.core.storage import StorageError, upload_image
from app.models.user import User

router = APIRouter()


@router.post("/image")
async def upload_cms_image(
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
) -> dict:
    body = await file.read()
    if not body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="빈 파일입니다."
        )
    try:
        url = upload_image(
            BytesIO(body),
            content_type=file.content_type or "application/octet-stream",
            size=len(body),
            folder="cms",
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return {"url": url, "filename": file.filename, "size": len(body)}
