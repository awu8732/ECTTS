# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoiceKeys is an offline-capable Progressive Web App (PWA) providing an accessible Chinese + English text-to-speech keyboard. It uses **Google Cloud TTS** for high-quality speech synthesis, with the browser's Web Speech API as an automatic fallback.

## Development

**Start the server** (requires Node.js; no npm install needed):
```bash
export GOOGLE_TTS_API_KEY="AIza..."
node server.js
```

The server runs on port 8080 by default (override with `PORT` env var). It serves static files and proxies TTS requests to Google Cloud, keeping the API key server-side.

If no API key is set, the app still works: it falls back to the browser's Web Speech API.

There are no build, lint, or test commands; this is a static site with a thin Node proxy.

## Architecture

### Server (`server.js`)
- Lightweight Node.js HTTP server (zero dependencies)
- Proxies `/api/tts/synthesize` -> `POST texttospeech.googleapis.com/v1/text:synthesize`
- Proxies `/api/tts/voices` -> `GET texttospeech.googleapis.com/v1/voices`
- Exposes `/api/tts/status` so the frontend knows if Google Cloud is configured
- Serves all static files from the project root

### Frontend
- **`src/app.js`**: Single-file app with state management, rendering, TTS orchestration (Google Cloud primary, Web Speech fallback), keyboard input, pinyin lookup, localStorage persistence, canvas drawing. A central `state` object drives everything; `render()` regenerates the full UI, while `renderSettingsOnly()` patches just the settings panel to avoid full-page flicker on slider/button changes.
- **`src/style.css`**: All styling via CSS custom properties. Four themes (auto/light/dark/high-contrast).
- **`sw.js`**: Cache-first service worker. Update `CACHE_NAME` when deploying changes.
- **`index.html`**: Shell that loads scripts and registers the service worker.

### TTS Flow
1. On startup, frontend calls `/api/tts/status` to check if Google Cloud is available.
2. If available, it fetches voice lists via `/api/tts/voices?lang=zh` and `/api/tts/voices?lang=en`.
3. On speak: POST to `/api/tts/synthesize` -> receives base64 MP3 -> decodes and plays via `<audio>`.
4. On failure or if unconfigured: falls back to `window.speechSynthesis`.

### Data Persistence
All user data uses `localStorage` with the `vk_` prefix: `vk_history`, `vk_savedPhrases`, `vk_ttsLang`, `vk_theme`, `vk_speechRate`, `vk_speechPitch`, `vk_voiceZh`, `vk_voiceEn`.

## Deployment

1. Deploy to any Node.js host (Render, Railway, Fly.io, a VPS, etc.).
2. Set `GOOGLE_TTS_API_KEY` as an environment variable.
3. After deploying new frontend assets, bump `CACHE_NAME` in `sw.js`.