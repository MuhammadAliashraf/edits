# Backend Docs

## API Keys

| Service | Required | Free tier | Paid | Get your key |
|---------|----------|-----------|------|--------------|
| **AssemblyAI** | Yes | 100 hours free | Pay-as-you-go from $0.37/hr | [app.assemblyai.com](https://www.assemblyai.com/app) |
| **Google Gemini** | One LLM required | 15 req/min free | Pay-as-you-go | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **OpenAI** | One LLM required | No free tier | Pay-as-you-go from $0.15/1M tokens | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Anthropic** | One LLM required | No free tier | Pay-as-you-go from $0.80/1M tokens | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| **Pexels** | No (B-roll only) | Free, unlimited | Free | [www.pexels.com/api](https://www.pexels.com/api/) |
| **Resend** | No (email only) | 100 emails/day free | From $20/mo | [resend.com/api-keys](https://resend.com/api-keys) |
| **YouTube Data API v3** | No (metadata only) | 10,000 units/day free | Quota extensions available | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) |

> Only one LLM key is needed. Google Gemini is recommended for its generous free tier.

## Requirements

Ensure you have `ffmpeg` installed.

```
# MacOS
brew install ffmpeg

# Linux (Ubuntu)
sudo apt update -y && sudo apt install install ffmpeg -y

# Windows (Chocolatey https://chocolatey.org/)
choco install ffmpeg
```

You must also have `uv` package manager installed.

1. Create a virtual environment

```
uv venv .venv
source .venv/bin/activate
```

## Running Tests

The backend test suite uses `pytest` and is organized into:

- `tests/unit` for fast unit coverage around helpers and services
- `tests/integration` for FastAPI, database, and queue-backed API checks
- legacy `unittest`-style tests, which still run under `pytest`

Install dependencies:

```bash
uv sync --all-groups
```

Run the backend suite:

```bash
DATABASE_URL=postgresql+asyncpg://localhost:5432/supoclip \
TEST_DATABASE_URL=postgresql+asyncpg://localhost:5432/supoclip \
REDIS_HOST=127.0.0.1 \
REDIS_PORT=6379 \
.venv/bin/pytest
```

Notes:

- `TEST_DATABASE_URL` should point at a disposable local test database.
- Redis is only required for the integration paths that validate queue and health behavior.
- Coverage thresholds are enforced in `pyproject.toml` during the test run.
- For repo-level entrypoints, use `make test-backend` or `make test-ci` from the repository root.

## Email Configuration

The backend now sends subscription lifecycle emails through Resend.

Set these env vars when using hosted billing:

```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="SupoClip <onboarding@your-domain.com>"
```

Notes:

- `RESEND_FROM_EMAIL` must be a verified sender/domain in Resend.
- The thank-you email is triggered after a successful Stripe checkout.
- The cancellation email is triggered after Stripe subscription deletion.

## YouTube Metadata Provider

YouTube downloads still use the existing Apify-first flow with `yt-dlp` fallback. Metadata lookup is now configurable separately.

Set these env vars to use the official YouTube Data API v3 for title, duration, channel, thumbnail, and view-count preflight:

```env
YOUTUBE_METADATA_PROVIDER=youtube_data_api
YOUTUBE_DATA_API_KEY=your_youtube_data_api_key
```

Notes:

- `YOUTUBE_METADATA_PROVIDER=yt_dlp` preserves the previous metadata behavior.
- If `YOUTUBE_DATA_API_KEY` is not set, the backend will try `GOOGLE_API_KEY` for YouTube metadata requests.
- The selected metadata provider is the primary path only; the backend automatically falls back to the other provider if the first one fails.
- `videos.list` costs 1 quota unit per request in the YouTube Data API.
- The public API does not expose some `yt-dlp`-specific metadata fields like `format_id`, `resolution`, `fps`, or file size.
- Enable the YouTube Data API v3 for your Google Cloud project before using this mode.
