-- Migration: Remove Meta API Instagram tables (replaced by Make.com webhook)
-- Instagram publishing now uses Make.com (MAKE_INSTAGRAM_WEBHOOK_URL).
-- Safe to run multiple times.

DROP TABLE IF EXISTS instagram_publishes;
DROP TABLE IF EXISTS instagram_accounts;
