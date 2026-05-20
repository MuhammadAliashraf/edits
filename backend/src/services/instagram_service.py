"""
Direct Instagram publishing via instagrapi (unofficial Instagram client).
Credentials and reusable session data are stored encrypted in the DB.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Encryption helpers
# ---------------------------------------------------------------------------

def _make_fernet(secret: str) -> Fernet:
    """Derive a Fernet key from BACKEND_AUTH_SECRET."""
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def _encrypt(fernet: Fernet, value: str) -> str:
    return fernet.encrypt(value.encode()).decode()


def _decrypt(fernet: Fernet, token: str) -> str:
    return fernet.decrypt(token.encode()).decode()


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

async def save_credentials(
    db: AsyncSession,
    user_id: str,
    username: str,
    password: str,
    backend_auth_secret: str,
) -> None:
    fernet = _make_fernet(backend_auth_secret)
    enc_password = _encrypt(fernet, password)

    await db.execute(
        text(
            """
            INSERT INTO instagram_credentials (user_id, username, enc_password, enc_session, updated_at)
            VALUES (:user_id, :username, :enc_password, NULL, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE
                SET username     = EXCLUDED.username,
                    enc_password = EXCLUDED.enc_password,
                    enc_session  = NULL,
                    updated_at   = CURRENT_TIMESTAMP
            """
        ),
        {"user_id": user_id, "username": username, "enc_password": enc_password},
    )
    await db.commit()


async def get_credentials(
    db: AsyncSession,
    user_id: str,
    backend_auth_secret: str,
) -> dict[str, Any] | None:
    result = await db.execute(
        text(
            "SELECT username, enc_password, enc_session FROM instagram_credentials WHERE user_id = :user_id"
        ),
        {"user_id": user_id},
    )
    row = result.fetchone()
    if not row:
        return None

    fernet = _make_fernet(backend_auth_secret)
    return {
        "username": row.username,
        "password": _decrypt(fernet, row.enc_password),
        "session": _decrypt(fernet, row.enc_session) if row.enc_session else None,
    }


async def delete_credentials(db: AsyncSession, user_id: str) -> None:
    await db.execute(
        text("DELETE FROM instagram_credentials WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    await db.commit()


async def _save_session(
    db: AsyncSession,
    user_id: str,
    session_json: str,
    backend_auth_secret: str,
) -> None:
    fernet = _make_fernet(backend_auth_secret)
    enc_session = _encrypt(fernet, session_json)
    await db.execute(
        text(
            "UPDATE instagram_credentials SET enc_session = :enc_session, updated_at = CURRENT_TIMESTAMP WHERE user_id = :user_id"
        ),
        {"user_id": user_id, "enc_session": enc_session},
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Publishing
# ---------------------------------------------------------------------------

async def post_reel(
    db: AsyncSession,
    user_id: str,
    clip_path: Path,
    caption: str,
    backend_auth_secret: str,
) -> str:
    """Upload a clip as an Instagram Reel. Returns the media permalink."""
    from instagrapi import Client
    from instagrapi.exceptions import (
        LoginRequired,
        TwoFactorRequired,
        ChallengeRequired,
    )

    creds = await get_credentials(db, user_id, backend_auth_secret)
    if not creds:
        raise ValueError("No Instagram credentials saved for this user")

    if not clip_path.exists():
        raise FileNotFoundError(f"Clip file not found: {clip_path}")

    cl = Client()

    def _login_fresh() -> None:
        logger.info("Instagram: fresh login for user %s", user_id)
        cl.login(creds["username"], creds["password"])

    try:
        if creds["session"]:
            cl.load_settings(json.loads(creds["session"]))
            try:
                cl.login(creds["username"], creds["password"])
            except LoginRequired:
                cl = Client()
                _login_fresh()
        else:
            _login_fresh()
    except TwoFactorRequired:
        raise ValueError(
            "Two-factor authentication is enabled on this Instagram account. "
            "Disable 2FA or use a secondary account without 2FA."
        )
    except ChallengeRequired:
        raise ValueError(
            "Instagram requires account verification. "
            "Open Instagram on your phone, complete the security check, then try again."
        )

    # Persist the session so we avoid a full re-login next time
    session_json = json.dumps(cl.get_settings())
    await _save_session(db, user_id, session_json, backend_auth_secret)

    logger.info("Instagram: uploading reel %s for user %s", clip_path.name, user_id)
    media = cl.clip_upload(clip_path, caption=caption)

    permalink = f"https://www.instagram.com/reel/{media.code}/"
    logger.info("Instagram: reel posted at %s", permalink)
    return permalink
