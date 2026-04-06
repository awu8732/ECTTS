# 语音键盘 VoiceKeys

Accessible Chinese + English text-to-speech keyboard PWA.

## Features

- **Pinyin input** with candidate selection bar (demo dictionary of ~70 syllables)
- **English ABC keyboard** with standard QWERTY layout
- **Handwriting canvas** area (demo; wire to an OCR engine for production)
- **Text-to-speech** playback using the Web Speech API
- **Quick phrases** panel for common expressions in both languages
- **Saved phrases** that persist across sessions via localStorage
- **Conversation history** of recently spoken text
- **Settings panel** with speech rate, pitch, and theme controls
- **Theme support**: auto (system), light, dark, and high-contrast modes
- **Fully offline** via service worker caching
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

1. **Pinyin dictionary**: The included dictionary is a demo subset. For production, integrate a full pinyin IME library such as `pinyin-engine` or Google's libpinyin.
2. **Handwriting recognition**: The canvas is currently draw-only. Connect it to an OCR service like Google Cloud Vision, Baidu OCR, or Tesseract.js for character recognition.
3. **TTS voices**: Quality and availability of Chinese voices varies by OS and browser. Consider a cloud TTS fallback (Google Cloud TTS, Azure Cognitive Services) for consistent quality.
4. **Accessibility**: The app uses semantic HTML and ARIA labels. For a production release, run a full audit with Lighthouse and screen readers.
5. **Cache versioning**: Update `CACHE_NAME` in `sw.js` whenever you deploy new assets to bust the old cache.

## Browser Support

- Chrome / Edge 80+
- Safari 14+ (iOS and macOS)
- Firefox 78+
- Samsung Internet 12+

## License

MIT
