# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoiceKeys is an offline-first Progressive Web App (PWA) providing an accessible Chinese + English text-to-speech keyboard. It has **no build tools, no npm, no dependencies** — pure HTML, CSS, and vanilla JavaScript that runs directly in any modern browser.

## Development

**Serve locally** (any static file server works):
```bash
python3 -m http.server 8080
# or
npx serve .
```

There are no build, lint, or test commands — this is a static site with no toolchain.

## Architecture

All application logic lives in two files:

- **`src/app.js`** — Single-file app: state management, rendering, TTS, keyboard input, pinyin lookup, localStorage persistence, canvas drawing. A central `state` object drives everything; `render()` regenerates the full UI on each state change.
- **`src/style.css`** — All styling via CSS custom properties. Four themes (auto/light/dark/high-contrast) are implemented by swapping property values on `:root`.
- **`sw.js`** — Cache-first service worker. Update `CACHE_NAME` (`voicekeys-v1`) whenever deploying changes so users get fresh assets.
- **`index.html`** — Shell that loads `src/app.js` and registers the service worker.

### State & Rendering

The app uses a single `state` object with direct mutation followed by a `render()` call — no framework, no virtual DOM. All DOM output is generated via `innerHTML` strings inside `render()`.

### Data Persistence

All user data uses `localStorage` with the `vk_` prefix: `vk_history`, `vk_savedPhrases`, `ttsLang`, `theme`, `speechRate`, `speechPitch`.

### Key Limitations (from README)

- **Pinyin dictionary** is a ~40-syllable subset — not production-ready for full Chinese IME.
- **Handwriting recognition** is demo-only (canvas draw, no OCR backend).
- **TTS** uses the Web Speech API; quality varies by browser/OS.

## Deployment

Push to any static host. For Vercel: `vercel`. For Netlify: `netlify deploy --dir=. --prod`. After deploying new assets, bump `CACHE_NAME` in `sw.js` to invalidate cached files.
