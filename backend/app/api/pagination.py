"""공용 페이지네이션 헬퍼 — design.md §4.0 Convention 준수.

응답 포맷:
{
    "data": [...],
    "meta": {"total": int, "page": int, "size": int, "totalPages": int}
}
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any


@dataclass
class PageParams:
    page: int
    size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size

    @property
    def limit(self) -> int:
        return self.size


def paginated(
    items: list[Any],
    total: int,
    page: int,
    size: int,
) -> dict[str, Any]:
    """설계 규약에 맞는 페이지네이션 응답 생성."""
    total_pages = max(1, math.ceil(total / size)) if size > 0 else 1
    return {
        "data": items,
        "meta": {
            "total": total,
            "page": page,
            "size": size,
            "totalPages": total_pages,
        },
    }
