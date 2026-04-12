"""Seed E2E test user for Playwright tests.

Usage:
    python -m scripts.seed_e2e

Requires DATABASE_URL env var pointing to a running Postgres instance
with migrations already applied (alembic upgrade head).
"""
from __future__ import annotations

import asyncio
import os
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Allow importing app modules from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.security import hash_password  # noqa: E402
from app.models.user import User  # noqa: E402

E2E_USER_EMAIL = "test@univ.ac.kr"
E2E_USER_PASSWORD = "test12345"
E2E_USER_NAME = "박학생"


async def seed() -> None:
    db_url = os.environ["DATABASE_URL"]
    engine = create_async_engine(db_url, echo=False)

    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(User).where(User.email == E2E_USER_EMAIL)
        )
        if result.scalar_one_or_none():
            print(f"E2E user '{E2E_USER_EMAIL}' already exists — skipping.")
            return

        user = User(
            email=E2E_USER_EMAIL,
            name=E2E_USER_NAME,
            password_hash=hash_password(E2E_USER_PASSWORD),
            role="student",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        print(f"E2E user '{E2E_USER_EMAIL}' created successfully.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
