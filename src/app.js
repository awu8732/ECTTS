/* ========================================
   语音键盘 VoiceKeys — Main Application
   (Google Cloud TTS + Web Speech fallback)
   ======================================== */

// ── PINYIN_MAP is loaded from /src/pinyin-dict.js ──

const DEFAULT_PHRASES = [
  { label: "你好", tts: "你好" },
  { label: "谢谢", tts: "谢谢" },
  { label: "对不起", tts: "对不起" },
  { label: "请帮我", tts: "请帮我" },
  { label: "Hello", tts: "Hello" },
  { label: "Thank you", tts: "Thank you" },
  { label: "Excuse me", tts: "Excuse me" },
  { label: "Yes", tts: "Yes" },
  { label: "No", tts: "No" },
  { label: "请再说一次", tts: "请再说一次" },
  { label: "Please help me", tts: "Please help me" },
];

const PINYIN_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m","⌫"],
];
const ENGLISH_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M","⌫"],
];

// ── Storage helpers ──
const Storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem('vk_' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem('vk_' + key, JSON.stringify(val)); } catch {}
  },
};

// ── App State ──
const state = {
  text: '',
  pinyinBuffer: '',
  candidates: [],
  mode: 'pinyin',        // pinyin | english | handwrite
  isSpeaking: false,
  ttsLang: Storage.get('ttsLang', 'zh'),
  showPhrases: false,
  showSettings: false,
  theme: Storage.get('theme', 'auto'),
  speechRate: Storage.get('speechRate', 0.9),
  speechPitch: Storage.get('speechPitch', 1.0),
  history: Storage.get('history', []),
  savedPhrases: Storage.get('savedPhrases', []),
  activeKey: null,
  // Google Cloud TTS state
  gcloudAvailable: false,
  gcloudVoices: { zh: [], en: [] },
  selectedVoiceZh: Storage.get('voiceZh', ''),
  selectedVoiceEn: Storage.get('voiceEn', ''),
  voicesLoaded: false,
  voicesLoading: false,
};

// Currently playing audio element (for Google Cloud TTS)
let currentAudio = null;

// ── SVG Icons ──
const icons = {
  speaker: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.15"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>`,
  play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  stop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
  backspace: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`,
  globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
  draw: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  save: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  playSmall: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
  clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  cloud: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
};

// ── Theme ──
function applyTheme() {
  const t = state.theme;
  if (t === 'auto') {
    document.documentElement.removeAttribute('data-theme');
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : '');
  } else {
    document.documentElement.setAttribute('data-theme', t);
  }
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.theme === 'auto') applyTheme();
});

// ── Google Cloud TTS ──────────────────────────────────────────

async function checkGcloudStatus() {
  try {
    const res = await fetch('/api/tts/status');
    const data = await res.json();
    state.gcloudAvailable = data.configured;
    if (state.gcloudAvailable && !state.voicesLoaded) {
      loadVoices();
    }
  } catch {
    state.gcloudAvailable = false;
  }
}

async function loadVoices() {
  if (state.voicesLoading) return;
  state.voicesLoading = true;
  renderSettingsOnly();
  try {
    const [zhRes, enRes] = await Promise.all([
      fetch('/api/tts/voices?lang=zh'),
      fetch('/api/tts/voices?lang=en'),
    ]);
    const zhData = await zhRes.json();
    const enData = await enRes.json();

    // Filter and sort voices; prefer Wavenet/Neural2/Journey over Standard
    const tierOrder = { 'Journey': 0, 'Neural2': 1, 'Wavenet': 2, 'Studio': 3, 'Chirp': 4, 'Standard': 5 };
    function getTier(name) {
      for (const t of Object.keys(tierOrder)) {
        if (name.includes(t)) return tierOrder[t];
      }
      return 9;
    }
    function sortVoices(voices) {
      return voices
        .map(v => ({ name: v.name, gender: v.ssmlGender, langs: v.languageCodes }))
        .sort((a, b) => getTier(a.name) - getTier(b.name) || a.name.localeCompare(b.name));
    }

    state.gcloudVoices.zh = sortVoices(zhData.voices || []);
    state.gcloudVoices.en = sortVoices((enData.voices || []).filter(v =>
      v.languageCodes.some(lc => lc.startsWith('en-'))
    ));

    // Set defaults if not already chosen
    if (!state.selectedVoiceZh && state.gcloudVoices.zh.length > 0) {
      // Try to find a good default: cmn-CN-Wavenet-A or first available
      const preferred = state.gcloudVoices.zh.find(v => v.name.includes('Wavenet'));
      state.selectedVoiceZh = preferred ? preferred.name : state.gcloudVoices.zh[0].name;
      Storage.set('voiceZh', state.selectedVoiceZh);
    }
    if (!state.selectedVoiceEn && state.gcloudVoices.en.length > 0) {
      const preferred = state.gcloudVoices.en.find(v => v.name.includes('Wavenet') && v.name.includes('en-US'));
      state.selectedVoiceEn = preferred ? preferred.name : state.gcloudVoices.en[0].name;
      Storage.set('voiceEn', state.selectedVoiceEn);
    }

    state.voicesLoaded = true;
  } catch (err) {
    console.warn('Failed to load Google Cloud voices:', err);
  }
  state.voicesLoading = false;
  renderSettingsOnly();
}

async function speakWithGcloud(content) {
  const lang = state.ttsLang;
  const voiceName = lang === 'zh' ? state.selectedVoiceZh : state.selectedVoiceEn;
  // Derive the languageCode from the voice name (e.g. "cmn-CN-Wavenet-A" -> "cmn-CN")
  const langCode = voiceName ? voiceName.split('-').slice(0, 2).join('-') : (lang === 'zh' ? 'cmn-CN' : 'en-US');

  const body = {
    input: { text: content },
    voice: {
      languageCode: langCode,
      ...(voiceName ? { name: voiceName } : {}),
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: state.speechRate,
      pitch: (state.speechPitch - 1.0) * 4, // Google uses semitones: -20 to 20; map 0.5-2.0 -> -2 to 4
    },
  };

  const res = await fetch('/api/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Google TTS returned ${res.status}`);
  }

  const data = await res.json();
  if (!data.audioContent) {
    throw new Error('No audioContent in response');
  }

  // Decode base64 and play
  const audioBytes = atob(data.audioContent);
  const audioArray = new Uint8Array(audioBytes.length);
  for (let i = 0; i < audioBytes.length; i++) {
    audioArray[i] = audioBytes.charCodeAt(i);
  }
  const blob = new Blob([audioArray], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    audio.onended = () => { currentAudio = null; URL.revokeObjectURL(audioUrl); resolve(); };
    audio.onerror = (e) => { currentAudio = null; URL.revokeObjectURL(audioUrl); reject(e); };
    audio.play();
  });
}

// ── TTS (unified: tries Google Cloud first, falls back to Web Speech) ──

async function speak(content) {
  if (!content || !content.trim()) return;

  // Stop anything currently playing
  stopSpeaking();

  state.isSpeaking = true;
  render();
  addToHistory(content);

  if (state.gcloudAvailable) {
    try {
      await speakWithGcloud(content);
      state.isSpeaking = false;
      render();
      return;
    } catch (err) {
      console.warn('Google Cloud TTS failed, falling back to Web Speech:', err);
    }
  }

  // Fallback: Web Speech API
  speakWithWebSpeech(content);
}

function speakWithWebSpeech(content) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(content);
  utter.lang = state.ttsLang === 'zh' ? 'zh-CN' : 'en-US';
  utter.rate = state.speechRate;
  utter.pitch = state.speechPitch;
  utter.onstart = () => { state.isSpeaking = true; render(); };
  utter.onend = () => { state.isSpeaking = false; render(); };
  utter.onerror = () => { state.isSpeaking = false; render(); };
  window.speechSynthesis.speak(utter);
}

function stopSpeaking() {
  // Stop Google Cloud audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  // Stop Web Speech
  window.speechSynthesis.cancel();
  state.isSpeaking = false;
  render();
}

// ── Voice Preview (plays a short sample when switching voices) ──
async function previewVoice(voiceName, lang) {
  stopSpeaking();
  const sampleText = lang === 'zh' ? '你好' : 'Hello';
  const langCode = voiceName
    ? voiceName.split('-').slice(0, 2).join('-')
    : (lang === 'zh' ? 'cmn-CN' : 'en-US');

  if (state.gcloudAvailable && voiceName) {
    try {
      const body = {
        input: { text: sampleText },
        voice: { languageCode: langCode, name: voiceName },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: state.speechRate,
          pitch: (state.speechPitch - 1.0) * 4,
        },
      };
      const res = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Preview TTS returned ${res.status}`);
      const data = await res.json();
      if (!data.audioContent) throw new Error('No audioContent');
      const audioBytes = atob(data.audioContent);
      const audioArray = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i);
      }
      const blob = new Blob([audioArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      audio.onended = () => { currentAudio = null; URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { currentAudio = null; URL.revokeObjectURL(audioUrl); };
      audio.play();
      return;
    } catch (err) {
      console.warn('Voice preview via Google Cloud failed:', err);
    }
  }

  // Fallback: Web Speech API preview
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(sampleText);
  utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  utter.rate = state.speechRate;
  utter.pitch = state.speechPitch;
  window.speechSynthesis.speak(utter);
}

function addToHistory(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (state.history.length > 0 && state.history[0].text === trimmed) return;
  state.history.unshift({ text: trimmed, time: Date.now() });
  if (state.history.length > 50) state.history = state.history.slice(0, 50);
  Storage.set('history', state.history);
}

function savePhrase(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (state.savedPhrases.some(p => p.text === trimmed)) return;
  state.savedPhrases.unshift({ text: trimmed, time: Date.now() });
  Storage.set('savedPhrases', state.savedPhrases);
  render();
}

function removeSavedPhrase(idx) {
  state.savedPhrases.splice(idx, 1);
  Storage.set('savedPhrases', state.savedPhrases);
  render();
}

function clearHistory() {
  state.history = [];
  Storage.set('history', []);
  render();
}

// ── Pinyin lookup ──
function updateCandidates() {
  if (state.mode === 'pinyin' && state.pinyinBuffer.length > 0) {
    const lower = state.pinyinBuffer.toLowerCase();
    const exact = PINYIN_MAP[lower] || [];
    const partials = Object.entries(PINYIN_MAP)
      .filter(([k]) => k.startsWith(lower) && k !== lower)
      .flatMap(([, v]) => v.slice(0, 2));
    state.candidates = [...exact, ...partials].slice(0, 9);
  } else {
    state.candidates = [];
  }
}

// ── Key handling ──
function handleKey(key) {
  state.activeKey = key;
  setTimeout(() => { state.activeKey = null; render(); }, 100);

  if (state.mode === 'pinyin') {
    if (key === '⌫') {
      if (state.pinyinBuffer.length > 0) {
        state.pinyinBuffer = state.pinyinBuffer.slice(0, -1);
      } else {
        state.text = state.text.slice(0, -1);
      }
    } else if (key === 'space') {
      if (state.candidates.length > 0) {
        state.text += state.candidates[0];
        state.pinyinBuffer = '';
      } else {
        state.text += ' ';
      }
    } else if (key === 'return') {
      if (state.pinyinBuffer) {
        state.text += state.pinyinBuffer;
        state.pinyinBuffer = '';
      } else {
        state.text += '\n';
      }
    } else {
      state.pinyinBuffer += key;
    }
  } else if (state.mode === 'english') {
    if (key === '⌫') {
      state.text = state.text.slice(0, -1);
    } else if (key === 'space') {
      state.text += ' ';
    } else if (key === 'return') {
      state.text += '\n';
    } else {
      state.text += key;
    }
  }
  updateCandidates();
  render();
}

function selectCandidate(c) {
  state.text += c;
  state.pinyinBuffer = '';
  state.candidates = [];
  render();
}

// ── Handwriting canvas ──
let isDrawing = false;
let lastPos = { x: 0, y: 0 };
let hwStrokes = [];         // Array of strokes; each stroke = [{x,y}, ...]
let currentStroke = [];     // Current in-progress stroke
let hwRecognizeTimer = null;
let hwCandidates = [];      // Recognition results
let hwRecognizing = false;  // Loading state

const HW_RECOGNIZE_DELAY = 900; // ms after last stroke to auto-recognize

function getCanvasPos(e) {
  const canvas = document.getElementById('hw-canvas');
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: (touch.clientX - rect.left) * (canvas.width / rect.width),
    y: (touch.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function startDraw(e) {
  e.preventDefault();
  isDrawing = true;
  lastPos = getCanvasPos(e);
  currentStroke = [lastPos];
  // Clear the auto-recognize timer on new stroke
  if (hwRecognizeTimer) { clearTimeout(hwRecognizeTimer); hwRecognizeTimer = null; }
  // Hide hint once user starts drawing
  const hint = document.querySelector('.canvas-hint');
  if (hint) hint.style.display = 'none';
}

function draw(e) {
  e.preventDefault();
  if (!isDrawing) return;
  const canvas = document.getElementById('hw-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pos = getCanvasPos(e);
  currentStroke.push(pos);

  ctx.beginPath();
  ctx.moveTo(lastPos.x, lastPos.y);
  ctx.lineTo(pos.x, pos.y);
  const cs = getComputedStyle(document.documentElement);
  ctx.strokeStyle = cs.getPropertyValue('--text-primary').trim() || '#1C1C1E';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  lastPos = pos;
}

function endDraw() {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentStroke.length > 1) {
    hwStrokes.push([...currentStroke]);
  }
  currentStroke = [];
  // Schedule auto-recognition after a pause
  if (hwStrokes.length > 0) {
    if (hwRecognizeTimer) clearTimeout(hwRecognizeTimer);
    hwRecognizeTimer = setTimeout(() => recognizeHandwriting(), HW_RECOGNIZE_DELAY);
  }
}

function clearCanvas() {
  const canvas = document.getElementById('hw-canvas');
  if (canvas) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }
  hwStrokes = [];
  currentStroke = [];
  hwCandidates = [];
  hwRecognizing = false;
  if (hwRecognizeTimer) { clearTimeout(hwRecognizeTimer); hwRecognizeTimer = null; }
  renderHwCandidates();
  // Restore hint
  const hint = document.querySelector('.canvas-hint');
  if (hint) hint.style.display = '';
}

async function recognizeHandwriting() {
  if (hwStrokes.length === 0) return;

  const canvas = document.getElementById('hw-canvas');
  if (!canvas) return;

  hwRecognizing = true;
  renderHwCandidates();

  if (state.gcloudAvailable) {
    try {
      // Send the canvas image as base64 to Google Vision API
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];

      const body = {
        requests: [{
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 10 }],
          imageContext: {
            languageHints: state.ttsLang === 'zh' ? ['zh-Hans', 'zh-Hant', 'en'] : ['en', 'zh-Hans'],
          },
        }],
      };

      const res = await fetch('/api/handwriting/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Recognition API returned ${res.status}`);
      const data = await res.json();

      // Extract recognized text from Vision API response
      const annotation = data.responses?.[0];
      if (annotation?.error) {
        throw new Error(annotation.error.message || 'Vision API error');
      }

      const fullText = annotation?.fullTextAnnotation?.text?.trim() || '';
      const symbols = [];

      // Collect individual symbols/characters from the response
      const pages = annotation?.fullTextAnnotation?.pages || [];
      for (const page of pages) {
        for (const block of (page.blocks || [])) {
          for (const paragraph of (block.paragraphs || [])) {
            for (const word of (paragraph.words || [])) {
              for (const symbol of (word.symbols || [])) {
                if (symbol.text && symbol.text.trim()) {
                  symbols.push(symbol.text);
                }
              }
            }
          }
        }
      }

      // Build candidates: individual characters + the full text if multi-char
      const seen = new Set();
      const candidates = [];
      for (const s of symbols) {
        if (!seen.has(s)) {
          seen.add(s);
          candidates.push(s);
        }
      }
      if (fullText.length > 1 && !seen.has(fullText)) {
        candidates.unshift(fullText);
      }

      // Also add from textAnnotations (often gives alternative readings)
      const textAnnotations = annotation?.textAnnotations || [];
      for (let i = 1; i < textAnnotations.length && candidates.length < 12; i++) {
        const t = textAnnotations[i]?.description?.trim();
        if (t && !seen.has(t)) {
          seen.add(t);
          candidates.push(t);
        }
      }

      hwCandidates = candidates.slice(0, 10);
      hwRecognizing = false;
      renderHwCandidates();
      return;
    } catch (err) {
      console.warn('Handwriting recognition failed:', err);
    }
  }

  // Fallback: no API available
  hwCandidates = [];
  hwRecognizing = false;
  renderHwCandidates();
}

function selectHwCandidate(c) {
  state.text += c;
  // Clear canvas for next character
  clearCanvas();
  render();
}

function renderHwCandidates() {
  const bar = document.getElementById('hw-candidate-bar');
  if (!bar) return;

  if (hwRecognizing) {
    bar.innerHTML = '<span class="hw-recognizing">识别中…</span>';
    return;
  }

  if (hwCandidates.length === 0) {
    bar.innerHTML = '<span class="candidate-hint">手写后自动识别</span>';
    return;
  }

  bar.innerHTML = hwCandidates.map((c, i) =>
    `<button class="candidate-btn ${i === 0 ? 'primary' : ''}" onclick="selectHwCandidate('${escapeAttr(c)}')">${escapeHtml(c)}</button>`
  ).join('');
}

function hwUndo() {
  if (hwStrokes.length === 0) return;
  hwStrokes.pop();
  // Redraw remaining strokes
  const canvas = document.getElementById('hw-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cs = getComputedStyle(document.documentElement);
  ctx.strokeStyle = cs.getPropertyValue('--text-primary').trim() || '#1C1C1E';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of hwStrokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }
  if (hwStrokes.length === 0) {
    hwCandidates = [];
    renderHwCandidates();
    const hint = document.querySelector('.canvas-hint');
    if (hint) hint.style.display = '';
  } else {
    // Re-trigger recognition after undo
    if (hwRecognizeTimer) clearTimeout(hwRecognizeTimer);
    hwRecognizeTimer = setTimeout(() => recognizeHandwriting(), HW_RECOGNIZE_DELAY);
  }
}

function hwRecognizeNow() {
  if (hwStrokes.length === 0) return;
  if (hwRecognizeTimer) { clearTimeout(hwRecognizeTimer); hwRecognizeTimer = null; }
  recognizeHandwriting();
}

// ── Time formatting ──
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  return Math.floor(diff / 86400000) + '天前';
}

// ── Escape helpers ──
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
function escapeAttr(s) {
  return s.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── Voice display helper ──
function voiceDisplayName(name) {
  // e.g. "cmn-CN-Wavenet-A" -> "Wavenet-A (cmn-CN)"
  const parts = name.split('-');
  if (parts.length >= 4) {
    const lang = parts.slice(0, 2).join('-');
    const type = parts.slice(2).join('-');
    return `${type} (${lang})`;
  }
  return name;
}

// ═══════════════════════════════════════════════════════════════
// ── Settings-only render (no full DOM rebuild) ──
// This prevents the startup animation from re-triggering when
// the user adjusts sliders, dropdowns, or buttons in settings.
// ═══════════════════════════════════════════════════════════════

function renderSettingsOnly() {
  const panel = document.getElementById('settings-body-inner');
  if (!panel) return; // settings not open; skip
  panel.innerHTML = settingsBodyHTML();
}

function settingsBodyHTML() {
  const zhVoices = state.gcloudVoices.zh;
  const enVoices = state.gcloudVoices.en;
  const gcloudBadge = state.gcloudAvailable
    ? `<span style="color:var(--accent-green);font-size:12px;font-weight:600">${icons.cloud} Connected</span>`
    : `<span style="color:var(--text-tertiary);font-size:12px">Not configured</span>`;

  return `
    <div class="setting-group">
      <label>主题 Theme</label>
      <div class="theme-options">
        <button class="theme-btn ${state.theme === 'auto' ? 'active' : ''}" onclick="setTheme('auto')">自动 Auto</button>
        <button class="theme-btn ${state.theme === '' ? 'active' : ''}" onclick="setTheme('')">浅色 Light</button>
        <button class="theme-btn ${state.theme === 'dark' ? 'active' : ''}" onclick="setTheme('dark')">深色 Dark</button>
        <button class="theme-btn ${state.theme === 'high-contrast' ? 'active' : ''}" onclick="setTheme('high-contrast')">高对比</button>
      </div>
    </div>

    <div class="setting-group">
      <label>TTS 引擎 Engine ${gcloudBadge}</label>
      ${state.gcloudAvailable ? `
        <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px">中文语音 Chinese Voice</span>
            ${state.voicesLoading ? '<span style="font-size:12px;color:var(--text-tertiary)">Loading…</span>' : ''}
          </div>
          <select class="voice-select" onchange="setVoiceZh(this.value)" ${zhVoices.length === 0 ? 'disabled' : ''}>
            ${zhVoices.length === 0
              ? '<option>Loading voices…</option>'
              : zhVoices.map(v =>
                  `<option value="${v.name}" ${v.name === state.selectedVoiceZh ? 'selected' : ''}>${voiceDisplayName(v.name)} · ${v.gender === 'MALE' ? '♂' : v.gender === 'FEMALE' ? '♀' : '◎'}</option>`
                ).join('')
            }
          </select>
        </div>
        <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px;margin-top:4px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px">英文语音 English Voice</span>
          </div>
          <select class="voice-select" onchange="setVoiceEn(this.value)" ${enVoices.length === 0 ? 'disabled' : ''}>
            ${enVoices.length === 0
              ? '<option>Loading voices…</option>'
              : enVoices.map(v =>
                  `<option value="${v.name}" ${v.name === state.selectedVoiceEn ? 'selected' : ''}>${voiceDisplayName(v.name)} · ${v.gender === 'MALE' ? '♂' : v.gender === 'FEMALE' ? '♀' : '◎'}</option>`
                ).join('')
            }
          </select>
        </div>
        <div style="margin-top:6px;text-align:right">
          <button class="btn-clear" onclick="refreshVoices()" style="display:inline-flex">${icons.refresh} Refresh voices</button>
        </div>
      ` : `
        <div class="setting-row" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span style="font-size:13px;color:var(--text-secondary)">
            Google Cloud TTS is not configured. Using browser TTS as fallback.<br>
            Set <code>GOOGLE_TTS_API_KEY</code> env var and restart the server.
          </span>
        </div>
      `}
    </div>

    <div class="setting-group">
      <label>语速 Speech Rate</label>
      <div class="setting-row">
        <span>慢 ← → 快</span>
        <div class="slider-wrap">
          <input type="range" min="0.3" max="2" step="0.1" value="${state.speechRate}" oninput="setSpeechRate(this.value)">
          <span class="slider-value">${state.speechRate.toFixed(1)}</span>
        </div>
      </div>
    </div>
    <div class="setting-group">
      <label>音调 Pitch</label>
      <div class="setting-row">
        <span>低 ← → 高</span>
        <div class="slider-wrap">
          <input type="range" min="0.5" max="2" step="0.1" value="${state.speechPitch}" oninput="setSpeechPitch(this.value)">
          <span class="slider-value">${state.speechPitch.toFixed(1)}</span>
        </div>
      </div>
    </div>
    <div class="setting-group">
      <label>关于 About</label>
      <div class="setting-row" style="flex-direction:column;align-items:flex-start;gap:4px">
        <span style="font-weight:600">语音键盘 VoiceKeys v2.0</span>
        <span style="font-size:13px;color:var(--text-secondary)">Accessible Chinese + English TTS keyboard with Google Cloud TTS integration. Full pinyin dictionary with 407 syllables and 3,200+ characters. Falls back to browser TTS when offline or unconfigured.</span>
      </div>
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="settings-overlay" onclick="toggleSettings()"></div>
    <div class="settings-panel" onclick="event.stopPropagation()">
      <div class="settings-header">
        <h2>设置 Settings</h2>
        <button class="settings-close" onclick="toggleSettings()">${icons.close}</button>
      </div>
      <div class="settings-body" id="settings-body-inner">
        ${settingsBodyHTML()}
      </div>
    </div>
  `;
}

// ── Render ──
function render() {
  const app = document.getElementById('app');
  const rows = state.mode === 'pinyin' ? PINYIN_ROWS : ENGLISH_ROWS;

  app.innerHTML = `
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${icons.speaker}
        <span class="header-title">语音键盘</span>
        <span class="header-subtitle">VoiceKeys</span>
      </div>
      <div class="header-right">
        <button class="lang-btn ${state.ttsLang === 'zh' ? 'active' : ''}" onclick="setTtsLang('zh')">中文</button>
        <button class="lang-btn ${state.ttsLang === 'en' ? 'active' : ''}" onclick="setTtsLang('en')">EN</button>
        <button class="icon-btn" onclick="toggleSettings()" aria-label="Settings">${icons.settings}</button>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Composer -->
      <div class="composer">
        <textarea id="main-textarea" placeholder="点击键盘输入文字，然后朗读 …" oninput="onTextInput(this.value)">${escapeHtml(state.text)}</textarea>
        <div class="composer-actions">
          ${state.text ? `<button class="btn-clear" onclick="clearText()">${icons.close} 清除</button>` : ''}
          ${state.text ? `<button class="btn-clear" onclick="saveCurrentText()">${icons.save} 保存</button>` : ''}
          <button class="btn-phrases ${state.showPhrases ? 'active' : ''}" onclick="togglePhrases()">快捷短语</button>
          <button class="btn-speak ${state.isSpeaking ? 'speaking' : 'ready'}"
            onclick="${state.isSpeaking ? 'stopSpeaking()' : 'speakCurrent()'}"
            ${!state.text.trim() && !state.isSpeaking ? 'disabled' : ''}>
            ${state.isSpeaking ? icons.stop + ' 停止' : icons.play + ' 朗读'}
          </button>
        </div>
      </div>

      ${state.isSpeaking ? `
        <div class="speak-indicator">
          <div class="speak-bars">
            ${[0,1,2,3,4].map(i => `<div class="speak-bar" style="height:${8+Math.random()*12}px;animation-delay:${i*0.1}s"></div>`).join('')}
          </div>
          <span>${state.gcloudAvailable ? '☁ Google Cloud TTS …' : '正在朗读…'}</span>
        </div>
      ` : ''}

      ${state.showPhrases ? `
        <div class="phrases-grid">
          ${DEFAULT_PHRASES.map(p => `<button class="phrase-btn" onclick="usePhrase('${escapeAttr(p.tts)}')">${escapeHtml(p.label)}</button>`).join('')}
        </div>
      ` : ''}

      ${state.savedPhrases.length > 0 ? `
        <div class="saved-section">
          <div class="saved-header">
            <h3>已保存短语 Saved</h3>
          </div>
          <div class="saved-list">
            ${state.savedPhrases.slice(0, 5).map((p, i) => `
              <div class="saved-item">
                <button onclick="speak('${escapeAttr(p.text)}')" title="朗读">${icons.playSmall}</button>
                <span class="saved-item-text" onclick="loadText('${escapeAttr(p.text)}')">${escapeHtml(p.text)}</span>
                <span class="saved-item-time">${timeAgo(p.time)}</span>
                <button class="delete-btn" onclick="removeSavedPhrase(${i})" title="删除">${icons.trash}</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${state.history.length > 0 ? `
        <div class="history-section">
          <div class="history-header">
            <h3>${icons.clock} 朗读历史 History</h3>
            <button class="history-clear-btn" onclick="clearHistory()">清除</button>
          </div>
          <div class="history-list">
            ${state.history.slice(0, 8).map(h => `
              <div class="history-item" onclick="loadText('${escapeAttr(h.text)}')">
                <span class="history-item-text">${escapeHtml(h.text)}</span>
                <span class="history-item-time">${timeAgo(h.time)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Keyboard -->
    <div class="keyboard">
      <div class="mode-tabs">
        <button class="mode-tab ${state.mode === 'pinyin' ? 'active' : ''}" onclick="setMode('pinyin')">拼音</button>
        <button class="mode-tab ${state.mode === 'english' ? 'active' : ''}" onclick="setMode('english')">ABC</button>
        <button class="mode-tab ${state.mode === 'handwrite' ? 'active' : ''}" onclick="setMode('handwrite')">${icons.draw} 手写</button>
      </div>

      ${state.mode === 'pinyin' ? `
        <div class="candidate-bar">
          ${state.pinyinBuffer ? `<span class="pinyin-display">${escapeHtml(state.pinyinBuffer)}</span>` : ''}
          ${state.candidates.length > 0
            ? state.candidates.map((c, i) => `<button class="candidate-btn ${i === 0 ? 'primary' : ''}" onclick="selectCandidate('${c}')">${c}</button>`).join('')
            : (!state.pinyinBuffer ? '<span class="candidate-hint">输入拼音选择汉字</span>' : '')
          }
        </div>
      ` : ''}

      ${state.mode === 'handwrite' ? `
        <div class="candidate-bar" id="hw-candidate-bar">
          <span class="candidate-hint">手写后自动识别</span>
        </div>
        <div class="handwrite-area">
          <div class="canvas-wrap">
            <canvas id="hw-canvas" width="600" height="220"></canvas>
            <div class="canvas-grid"></div>
            <div class="canvas-hint">在此区域手写输入</div>
            <div class="canvas-actions">
              <button class="canvas-btn" onclick="hwUndo()">撤销</button>
              <button class="canvas-btn" onclick="hwRecognizeNow()">识别</button>
              <button class="canvas-btn" onclick="clearCanvas()">清除</button>
            </div>
          </div>
          ${!state.gcloudAvailable ? '<p class="handwrite-note">⚠ 需要配置 Google API Key 启用手写识别</p>' : ''}
        </div>
      ` : `
        <div class="key-rows">
          ${rows.map(row => `
            <div class="key-row">
              ${row.map(k => {
                const isSpecial = k === '⌫';
                const isActive = state.activeKey === k;
                return `<button class="key ${isSpecial ? 'special' : ''} ${isActive ? 'active' : ''}"
                  onclick="handleKey('${k}')">${k === '⌫' ? icons.backspace : escapeHtml(k)}</button>`;
              }).join('')}
            </div>
          `).join('')}
          <div class="bottom-row">
            <button class="key-globe" onclick="toggleLang()">${icons.globe}</button>
            <button class="key-space" onclick="handleKey('space')">${state.mode === 'pinyin' ? '空格 / 选字' : 'space'}</button>
            <button class="key-return" onclick="handleKey('return')">${state.mode === 'pinyin' && state.pinyinBuffer ? '确认' : '换行'}</button>
          </div>
        </div>
      `}
    </div>

    ${state.showSettings ? renderSettings() : ''}
  `;

  // Re-attach canvas events and restore state
  if (state.mode === 'handwrite') {
    const canvas = document.getElementById('hw-canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('mouseleave', endDraw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', endDraw);

      // Redraw existing strokes (render() wipes innerHTML)
      if (hwStrokes.length > 0) {
        const ctx = canvas.getContext('2d');
        const cs = getComputedStyle(document.documentElement);
        ctx.strokeStyle = cs.getPropertyValue('--text-primary').trim() || '#1C1C1E';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const stroke of hwStrokes) {
          if (stroke.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
          }
          ctx.stroke();
        }
        // Hide hint if strokes exist
        const hint = document.querySelector('.canvas-hint');
        if (hint) hint.style.display = 'none';
      }

      // Restore candidate bar state
      renderHwCandidates();
    }
  }

  // Keep textarea cursor at end
  const ta = document.getElementById('main-textarea');
  if (ta && document.activeElement !== ta) {
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }
}

// ── Global handlers (called from onclick) ──
window.setTtsLang = (lang) => { state.ttsLang = lang; Storage.set('ttsLang', lang); render(); };
window.toggleSettings = () => { state.showSettings = !state.showSettings; render(); };
window.togglePhrases = () => { state.showPhrases = !state.showPhrases; render(); };
window.setMode = (m) => { state.mode = m; state.pinyinBuffer = ''; state.candidates = []; render(); };
window.toggleLang = () => { state.mode = state.mode === 'pinyin' ? 'english' : 'pinyin'; state.pinyinBuffer = ''; render(); };
window.handleKey = handleKey;
window.selectCandidate = selectCandidate;
window.speak = speak;
window.stopSpeaking = stopSpeaking;
window.speakCurrent = () => speak(state.text);
window.clearText = () => { state.text = ''; state.pinyinBuffer = ''; state.candidates = []; render(); };
window.onTextInput = (val) => { state.text = val; };
window.usePhrase = (t) => { state.text += t; speak(t); render(); };
window.loadText = (t) => { state.text = t; render(); };
window.saveCurrentText = () => { savePhrase(state.text); };
window.removeSavedPhrase = removeSavedPhrase;
window.clearHistory = clearHistory;
window.clearCanvas = clearCanvas;
window.selectHwCandidate = selectHwCandidate;
window.hwUndo = hwUndo;
window.hwRecognizeNow = hwRecognizeNow;

// Settings handlers: use renderSettingsOnly() instead of full render()
window.setTheme = (t) => { state.theme = t; Storage.set('theme', t); applyTheme(); renderSettingsOnly(); };
window.setSpeechRate = (v) => { state.speechRate = parseFloat(v); Storage.set('speechRate', state.speechRate); renderSettingsOnly(); };
window.setSpeechPitch = (v) => { state.speechPitch = parseFloat(v); Storage.set('speechPitch', state.speechPitch); renderSettingsOnly(); };
window.setVoiceZh = (v) => { state.selectedVoiceZh = v; Storage.set('voiceZh', v); previewVoice(v, 'zh'); renderSettingsOnly(); };
window.setVoiceEn = (v) => { state.selectedVoiceEn = v; Storage.set('voiceEn', v); previewVoice(v, 'en'); renderSettingsOnly(); };
window.refreshVoices = () => { state.voicesLoaded = false; loadVoices(); };
window.previewVoice = previewVoice;

// ── Init ──
applyTheme();
render();

// dismiss the loading screen
document.getElementById('loading')?.remove();
checkGcloudStatus();