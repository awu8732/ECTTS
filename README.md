# 语音键盘 VoiceKeys

Accessible Chinese + English text-to-speech keyboard PWA.

## Features

- **Pinyin input** with candidate selection bar (comprehensive dictionary: 478 syllables, ~21,000 characters)
- **English ABC keyboard** with standard QWERTY layout
- **Handwriting canvas** with Google Cloud Vision OCR recognition
- **Text-to-speech** playback via Google Cloud TTS (browser Web Speech API fallback)
- **Translation** between Chinese and English via Google Cloud Translation API
- **Quick phrases** panel for common expressions in both languages
- **Saved phrases** that persist across sessions via localStorage
- **Conversation history** of recently spoken text
- **Settings panel** with speech rate, pitch, translation target, and theme controls
- **Theme support**: auto (system), light, dark, and high-contrast modes
- **Fully offline** core functionality via service worker caching (translation requires network)
- **Installable PWA** with manifest, icons, and Add to Home Screen support

## Project Structure

```
voicekeys/
├── index.html          # Entry point with PWA meta tags
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (cache-first offline)
├── src/
│   ├── app.js          # Main application logic + rendering
│   └── style.css       # All styles with CSS variable theming
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── README.md
```

## Running Locally

Any static file server works. For example:

```bash
# Python
cd voicekeys && python3 -m http.server 8080

# Node (npx)
npx serve voicekeys

# PHP
php -S localhost:8080 -t voicekeys
```

Then open http://localhost:8080 in your browser.

> **Note:** Service workers require HTTPS in production. Localhost is exempt during development.

## Deploying as a PWA

### Vercel (recommended for simplicity)
```bash
npm i -g vercel
cd voicekeys
vercel
```

### Netlify
Drag the `voicekeys/` folder into the Netlify dashboard, or use the CLI:
```bash
npm i -g netlify-cli
netlify deploy --dir=voicekeys --prod
```

### Cloudflare Pages
```bash
npm i -g wrangler
wrangler pages deploy voicekeys
```

### GitHub Pages
Push the contents to a repo and enable Pages in Settings → Pages → Source: main branch.

## Production Notes

1. **Pinyin dictionary**: The included dictionary covers ~21,000 characters across 478 syllables (full CJK Unified Ideographs block U+4E00–U+9FFF), frequency-sorted with common characters first. To regenerate, run `scripts/build-pinyin-dict.js` (requires `pypinyin`).
2. **Handwriting recognition**: Connected to Google Cloud Vision API via the server proxy. Requires the Vision API to be enabled on the same GCP project.
3. **Translation**: Uses Google Cloud Translation API v2. Requires the Cloud Translation API to be enabled on the GCP project. The same `GOOGLE_TTS_API_KEY` is reused; translation is online-only with a graceful offline message.
4. **TTS voices**: Google Cloud TTS is the primary engine; the browser's Web Speech API is the automatic offline fallback.
5. **Accessibility**: The app uses semantic HTML and ARIA labels. For a production release, run a full audit with Lighthouse and screen readers.
6. **Cache versioning**: Update `CACHE_NAME` in `sw.js` whenever you deploy new assets to bust the old cache.

## Browser Support

- Chrome / Edge 80+
- Safari 14+ (iOS and macOS)
- Firefox 78+
- Samsung Internet 12+

## License

MIT