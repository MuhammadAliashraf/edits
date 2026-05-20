-- Migration 004: Instagram direct-posting credentials
-- Stores per-user Instagram credentials (encrypted) and instagrapi session data
-- so users can post Reels without Make.com or Meta Business API.

CREATE TABLE IF NOT EXISTS instagram_credentials (
    user_id      VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username     VARCHAR(255) NOT NULL,
    enc_password TEXT NOT NULL,   -- Fernet-encrypted password
    enc_session  TEXT,            -- Fernet-encrypted instagrapi session JSON (reused across logins)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
