# igedits

**igedits** is a self-hosted, AI-powered video clipping tool — an open-source alternative to [OpusClip](https://www.opus.pro/), extended with additional features and full control over your own infrastructure. Feed it a long-form video (YouTube URL or direct upload) and it returns a handful of short, vertical (9:16) clips with word-synced captions, face-centered cropping, and virality scoring — ready for TikTok, Reels, or Shorts.

No watermarks, no per-minute quotas, no vendor lock-in.

## What it does

1. **Ingest** — pull a video from a YouTube URL (via `yt-dlp`) or accept a direct upload.
2. **Transcribe** — word-level timestamps via AssemblyAI (cloud) or optional local Whisper.
3. **Analyze** — a Pydantic-AI agent selects 3–7 viral segments (10–45s each) and scores them on hook / engagement / value / shareability.
4. **Render** — MoviePy assembles each segment into a 9:16 clip with face-centered crop, burned-in captions, optional transitions, and optional B-roll overlays.
5. **Serve** — clips are stored on disk and surfaced to the frontend for preview, editing, and export.

---

## Architecture

```
User → Frontend (Next.js 15) → Backend API (FastAPI) → Redis Queue → ARQ Worker
                                      ↓                                  ↓
                               PostgreSQL ←───────────────────────────────┘
```

Task creation returns in <100 ms. The worker handles the heavy video work asynchronously; the frontend subscribes via Server-Sent Events for live progress.

| Service    | Port | Purpose                                 |
| ---------- | ---- | --------------------------------------- |
| Frontend   | 3000 | Next.js UI                              |
| Backend    | 8000 | FastAPI (OpenAPI docs at `/docs`)       |
| Worker     | —    | ARQ job runner (no exposed port)        |
| PostgreSQL | 5432 | Task + user data                        |
| Redis      | 6379 | Job queue + progress pub/sub            |

---

## Deployment

### Prerequisites

- Docker + Docker Compose
- An [AssemblyAI](https://www.assemblyai.com/) API key for transcription
- One LLM provider key: Google Gemini, OpenAI, Anthropic, or a local/remote Ollama instance

### API keys — where to get them

| Key | Free tier | Paid | Where to get it |
|-----|-----------|------|-----------------|
| `ASSEMBLY_AI_API_KEY` | 100 hours/month free | ~$0.65/hour after | [assemblyai.com](https://www.assemblyai.com/) → sign up → API keys |
| `GOOGLE_API_KEY` | Generous free quota via AI Studio | Pay-per-token after | [aistudio.google.com](https://aistudio.google.com/) → Get API key |
| `OPENAI_API_KEY` | No free tier (credits expire) | Pay-per-token | [platform.openai.com](https://platform.openai.com/) → API keys |
| `ANTHROPIC_API_KEY` | No free tier | Pay-per-token | [console.anthropic.com](https://console.anthropic.com/) → API keys |
| Ollama (local) | Free — runs on your hardware | Free | Install [ollama.ai](https://ollama.ai/), no key needed for local |
| `OLLAMA_API_KEY` | — | Paid (Ollama Cloud only) | [ollama.ai](https://ollama.ai/) — only needed for Ollama Cloud, not local |
| `PEXELS_API_KEY` | Free, unlimited | Free | [pexels.com/api](https://www.pexels.com/api/) → Get free API key |
| `APIFY_API_TOKEN` | $5 free monthly credit | ~$0.25/1000 results | [apify.com](https://apify.com/) → Settings → Integrations |
| `YOUTUBE_DATA_API_KEY` | 10,000 units/day free | Paid quota extensions | [Google Cloud Console](https://console.cloud.google.com/) → APIs → YouTube Data API v3 |
| `RESEND_API_KEY` | 3,000 emails/month free | Paid after | [resend.com](https://resend.com/) → sign up → API keys |

**Minimum to get started**: `ASSEMBLY_AI_API_KEY` + one LLM key. Everything else is optional.

**Recommended free stack**: AssemblyAI (free tier) + Google Gemini via AI Studio (free quota) + Pexels (free). Zero cost for light personal use.

### 1. Clone

```bash
git clone git@github.com:tass055/Igedits.git
cd Igedits
```

### 2. Create `.env` in the project root

Start from this minimal working config:

```env
# ── Required: transcription ───────────────────────────────
ASSEMBLY_AI_API_KEY=your_assemblyai_key

# ── Required: LLM provider (pick ONE) ─────────────────────
LLM=google-gla:gemini-2.0-flash
GOOGLE_API_KEY=your_google_key
# LLM=openai:gpt-5.2
# OPENAI_API_KEY=...
# LLM=anthropic:claude-4-sonnet
# ANTHROPIC_API_KEY=...
# LLM=ollama:gpt-oss:20b
# OLLAMA_BASE_URL=http://host.docker.internal:11434/v1

# ── Required in production ────────────────────────────────
BETTER_AUTH_SECRET=change_me_to_a_long_random_string
BACKEND_AUTH_SECRET=change_me_too
NEXT_PUBLIC_APP_URL=https://your-domain.com

# ── Optional ──────────────────────────────────────────────
PEXELS_API_KEY=...                     # Enables B-roll overlays
YOUTUBE_METADATA_PROVIDER=yt_dlp       # or: youtube_data_api
YOUTUBE_DATA_API_KEY=...
RESEND_API_KEY=...                     # Transactional emails
RESEND_FROM_EMAIL=no-reply@your-domain.com
```

### 3. Start

```bash
docker-compose up -d
# first boot pulls images and runs init.sql — tail with:
docker-compose logs -f
```

Open **http://localhost:3000**, create an account, and submit a video.

### 4. Production checklist

- Replace `BETTER_AUTH_SECRET` and `BACKEND_AUTH_SECRET` with long random values (`openssl rand -hex 32`).
- **Close backend port 8000** — in `docker-compose.yml`, remove or comment out the `ports:` block under the `backend` service. The frontend talks to it over the internal Docker network (`http://backend:8000`) so external exposure is unnecessary and a security risk.
- Put the stack behind an HTTPS reverse proxy (Caddy, Nginx, Traefik). Only port 3000 (frontend) needs to be public.
- Set `NEXT_PUBLIC_APP_URL` and `CORS_ORIGINS` to your public domain.
- Set a strong `POSTGRES_PASSWORD` — never leave it as the default.
- Run PostgreSQL outside the container with regular backups for anything important.
- Persist the `uploads`, `clips`, `redis_data`, and `postgres_data` Docker volumes.

---

## GPU vs CPU

The default encoder is **CPU (libx264)**. Switching to NVIDIA GPU encoding is a single env var — no code or Dockerfile changes needed.

### CPU (default)

Nothing to configure. The stack ships CPU-ready:

```env
VIDEO_ENCODER=cpu   # default — libx264
```

The two heaviest workloads are offloaded to the cloud:
- **Transcription** → AssemblyAI (cloud API, no local model)
- **LLM analysis** → your chosen provider (cloud or Ollama)

The only local CPU work is FFmpeg encoding — tune it with these vars:

| Variable                      | Default    | Effect                                                         |
| ----------------------------- | ---------- | -------------------------------------------------------------- |
| `DEFAULT_PROCESSING_MODE`     | `fast`     | `fast` \| `balanced` \| `quality` — encoder preset & features  |
| `FAST_MODE_MAX_CLIPS`         | `4`        | Caps clip count in fast mode                                   |
| `FAST_MODE_TRANSCRIPT_MODEL`  | `nano`     | AssemblyAI model tier for fast mode                            |
| `QUEUED_TASK_TIMEOUT_SECONDS` | `180`      | Fail-safe for stuck tasks                                      |

### GPU (NVENC — NVIDIA only)

Requirements: NVIDIA GPU, [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) installed on the host.

**Step 1** — set the encoder in `.env`:

```env
VIDEO_ENCODER=nvenc
```

**Step 2** — in `docker-compose.yml`, on the `worker` service only (the backend is API-only, no encoding): comment out the CPU `deploy` block and uncomment the GPU `deploy` block. The blocks are already in the file — just swap the comments:

```yaml
# Comment this out:
# deploy:
#   resources:
#     limits:
#       cpus: "4.0"
#       memory: 6G

# Uncomment this:
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

**Step 3** — rebuild:

```bash
docker-compose up -d --build
```

The `worker` container picks up `VIDEO_ENCODER=nvenc` and switches FFmpeg to `h264_nvenc` automatically. The backend container does not need GPU access (it handles only API requests).

> **AMD / Intel GPU**: not supported out of the box. You would need to swap the Dockerfile base image and install a compatible FFmpeg build.

### Local Whisper (no AssemblyAI)

The `WHISPER_MODEL_SIZE` env var (`tiny` / `base` / `small` / `medium` / `large`) is wired in the config, but the local Whisper path requires a CUDA-enabled PyTorch install inside the container — a Dockerfile change. If you want this, raise an issue.

---

## Language, transcripts, and subtitles

### Transcript language

There is **no transcript language env var** — language is auto-detected by AssemblyAI. For non-English source videos, results depend entirely on AssemblyAI's detection; no UI toggle exists today.

| Variable                     | Default  | Purpose                                                |
| ---------------------------- | -------- | ------------------------------------------------------ |
| `ASSEMBLY_AI_API_KEY`        | —        | Required; drives transcription                         |
| `FAST_MODE_TRANSCRIPT_MODEL` | `nano`   | Model tier when `DEFAULT_PROCESSING_MODE=fast`         |
| `WHISPER_MODEL_SIZE`         | `medium` | Only used if the local Whisper path is enabled (no GPU by default — see above) |

### Subtitles / captions

Subtitle appearance is **configured per task**, not via env vars. Every task carries:

- `font_family` (default `TikTokSans-Regular`) — pick from any `.ttf` in `backend/fonts/`
- `font_size` (default `24`)
- `font_color` (default `#FFFFFF`)
- `caption_template` (default `default`) — see below

Defaults for new tasks can be set per-user under **Settings**.

### Caption templates

Templates live in `backend/src/caption_templates.py` and bundle animation style, highlight color, stroke, shadow, and vertical position:

| Template  | Style                                            |
| --------- | ------------------------------------------------ |
| `default` | Clean white text, soft stroke                    |
| `hormozi` | Bold yellow highlight, thick black stroke        |
| `mrbeast` | Large red highlight, heavy stroke, drop shadow   |
| `minimal` | Thin text, no highlight                          |
| `tiktok`  | Karaoke-style word highlighting                  |
| `neon`    | Bright glow highlight                            |
| `podcast` | Centered, small, low-key                         |

### Adding assets

- **Fonts**: drop `.ttf` files into `backend/fonts/` — they appear in the font picker automatically.
- **Transitions**: drop `.mp4` files into `backend/transitions/` — surfaced via `GET /transitions`.

---

## Instagram publishing via Make.com {#instagram-publishing-via-makecom}

igedits publishes to Instagram through [Make.com](https://make.com) (free tier works). No Meta Developer App, no OAuth token management — you connect your Instagram account once inside Make.com and the backend sends a single webhook.

> **Requirement:** Your Instagram must be a **Creator** or **Business** account. Personal accounts cannot publish Reels via API. If yours is personal, go to Instagram → Settings → Account → Switch to Professional Account → Creator.

### Step 1 — Build the scenario

1. Sign up at [make.com](https://make.com) → go to **Scenarios** → **Create a new scenario**.
2. Click the **+** to add the first module → search **Webhooks** → select **Custom webhook**.
   - Click **Add** → name it "igedits" → click **Save**.
   - Copy the **webhook URL** shown (you'll need it in Step 2).
3. Click the **+** after the webhook module → search **Instagram for Business** → select **Create a Reel**.
4. In the **Connection** field, click **Add** → Make.com opens a Facebook login popup.
   - Log in with the **Facebook account linked to your Instagram**.
   - Grant the requested permissions → click **Continue** / **Done**.
   - Your Instagram account is now connected.
5. Fill in the module fields:
   - **Page** → select your Facebook Page.
   - **Video URL** → click the field, enable mapping (the toggle icon), type `{{1.video_url}}`.
   - **Caption** → `{{1.caption}}`.
6. Click **OK** → click **Save** → click the **Activate scenario** toggle (top right).

> **No Facebook Page?** Instagram Business/Creator accounts must be linked to a Facebook Page — this is a Meta requirement regardless of which tool you use. Go to [Meta Business Suite](https://business.facebook.com) → Add Page → connect your Instagram. Takes ~2 minutes.

### Step 3 — Connect to igedits

Paste the webhook URL from Step 2 into your `.env`:

```env
MAKE_INSTAGRAM_WEBHOOK_URL=https://hook.eu2.make.com/xxxxxxxxxxxxxxxxxxxxxxxx
```

Restart the backend: `docker-compose up -d backend`

### How it works

When you click **Publish to Instagram** on a clip, the backend sends:

```json
{ "video_url": "https://api-igedits.asal.life/clips/clip_1.mp4", "caption": "..." }
```

Make.com receives this, downloads the video from `video_url`, and posts it as a Reel on the connected account. The clip appears on Instagram in ~30 seconds.

> **Tip:** The clip must be accessible at `PUBLIC_BASE_URL` (your backend's public URL). Make.com must be able to download it over HTTPS. If `MAKE_INSTAGRAM_WEBHOOK_URL` is not set, the publish button still appears but returns a 503 error.

---

## App navigation

All pages are under `frontend/src/app/` (Next.js App Router).

| Route                  | What it's for                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`                    | Landing + quick-create: paste a YouTube URL or upload a file, pick font/template, start a task.            |
| `/sign-up`, `/sign-in` | Email/password auth (Better Auth).                                                                         |
| `/list`                | All of your tasks with status, clip count, and inline start / resume / delete actions.                     |
| `/tasks/[id]`          | Gallery view for a completed task — all generated clips with virality score, timestamps, and previews.     |
| `/tasks/[id]/edit`     | Per-clip editor: trim, split, merge, edit captions, toggle audio, and export with platform presets.        |
| `/settings`            | User defaults: default font, size, color, email notifications.                                             |
| `/admin`               | Admin-only: user metrics, task metrics, dead-letter queue, per-user admin toggle.                          |

### Typical flow

1. Sign up → land on `/`.
2. Paste a YouTube URL or upload a file, click **Start**.
3. Watch progress stream live (SSE) on the same page.
4. When the task completes, jump to `/tasks/[id]` to browse generated clips.
5. Open any clip in `/tasks/[id]/edit` to trim or re-caption it, then export.
6. All past tasks are available under `/list`.

---

## Local development (without Docker)

Backend uses `uv`, not pip/poetry. Requires Python 3.11+, ffmpeg, and running PostgreSQL + Redis.

```bash
# Backend API
cd backend && uv venv .venv && source .venv/bin/activate && uv sync
uvicorn src.main_refactored:app --reload --host 0.0.0.0 --port 8000

# Worker (required — video processing runs here)
arq src.workers.tasks.WorkerSettings

# Frontend
cd frontend && npm install && npm run dev
```

More detail in [CLAUDE.md](CLAUDE.md) and [`docs/`](docs/README.md).

---

## Testing

```bash
make test           # everything
make test-backend   # pytest
make test-frontend  # vitest + testing-library
make test-e2e       # playwright smoke suite
```

CI runs the same layers with Postgres and Redis service containers.

---

## License

AGPL-3.0. See [LICENSE](LICENSE).

---

## Powered by ASAL

igedits is built and maintained by [**ASAL**](https://asal.life) — a technology company focused on AI-powered tools and automation.

[![ASAL](frontend/public/asal-logo.png)](https://asal.life)

| Platform | Link |
|---|---|
| 🌐 Website | [asal.life](https://asal.life/) |
| 📘 Facebook | [facebook.com/profile.php?id=61573255537897](https://www.facebook.com/profile.php?id=61573255537897) |
| 📸 Instagram | [@asallifeoriginal](https://www.instagram.com/asallifeoriginal/) |
| ▶️ YouTube | [@AsalLlife](https://www.youtube.com/@AsalLlife) |
| 🎵 TikTok | [@asallifeoriginal](https://www.tiktok.com/@asallifeoriginal) |
| 🧵 Threads | [@asallifeoriginal](https://www.threads.com/@asallifeoriginal) |
