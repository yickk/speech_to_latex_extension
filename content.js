function hasMathDelimitersOrEnvironment(text) {
  if (!text) return false;
  if (/\\\(|\\\)|\\\[|\\\]/.test(text)) return true;
  if (/\$\$[\s\S]*\$\$/.test(text)) return true;
  if (/(^|[^$])\$[^$][\s\S]*?[^$]\$(?!\$)/.test(text)) return true;
  if (
    /\\begin\{(?:equation\*?|align\*?|gather\*?|multline\*?|displaymath|math|bmatrix|pmatrix|vmatrix|matrix|cases|aligned)\}/.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

function looksLikeMathLatex(text) {
  if (!text) return false;
  if (/\\(frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|alpha|beta|gamma|theta|pi|cdot|times|pm|leq|geq|neq|approx|left|right)\b/.test(text)) {
    return true;
  }
  if (/[_^]/.test(text)) return true;
  if (/\b-?\d+\s*\/\s*-?\d+\b/.test(text)) return true;
  if (/\b-?\d+(?:\.\d+)?\s*(?:=|<|>|\\leq|\\geq)\s*-?\d+(?:\.\d+)?\b/.test(text)) return true;
  return false;
}

function ensureMathMode(text) {
  const source = typeof text === "string" ? text : "";
  if (!source.trim()) return source;
  if (hasMathDelimitersOrEnvironment(source)) return source;
  if (!looksLikeMathLatex(source)) return source;

  const trailingWhitespaceMatch = source.match(/\s+$/);
  const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
  const core = source.slice(0, source.length - trailingWhitespace.length).trim();
  if (!core) return source;

  const needsDisplayMath = core.includes("\n") || /\\\\/.test(core) || /\\begin\{(?:aligned|cases)\}/.test(core);
  const wrapped = needsDisplayMath ? `$$${core}$$` : `$${core}$`;
  return wrapped + trailingWhitespace;
}

function normalizeDictationOutput(rawText) {
  const source = typeof rawText === "string" ? rawText : "";
  const trailingWhitespaceMatch = source.match(/\s+$/);
  const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
  let text = source.slice(0, source.length - trailingWhitespace.length).trim();
  if (!text) return source;

  const punctuationMap = [
    { re: /\bcomma\b/gi, token: "," },
    { re: /\b(?:period|full stop)\b/gi, token: "." },
    { re: /\bquestion mark\b/gi, token: "?" },
    { re: /\bexclamation mark\b/gi, token: "!" },
    { re: /\bcolon\b/gi, token: ":" },
    { re: /\bsemicolon\b/gi, token: ";" },
  ];
  punctuationMap.forEach(({ re, token }) => {
    text = text.replace(re, token);
  });

  text = text.replace(/\s+([,.:;!?])/g, "$1");
  text = text.replace(/([,.:;!?])(?!\s|$)/g, "$1 ");
  text = text.replace(/\s{2,}/g, " ");

  // Wrap plain single-letter variables after common physics/math nouns.
  text = text.replace(
    /\b(momentum|energy|mass|charge|field|coordinate|variable|parameter)\s+([a-zA-Z])\b/g,
    (_m, noun, variable) => `${noun} $${variable}$`
  );

  // Restore sentence capitalization for prose-style dictation output.
  text = text.replace(/(^|[.!?]\s+)([a-z])/g, (m, prefix, c) => `${prefix}${c.toUpperCase()}`);

  return text + trailingWhitespace;
}

function injectLatex(text, options = {}) {
  const el =
    document.querySelector(".ace_text-input") ||
    document.querySelector("textarea.cm-content") ||
    document.querySelector('[role="textbox"]');

  if (!el) {
    console.error("Speech→LaTeX: could not find Overleaf editor input.");
    return;
  }

  el.focus();
  const shouldNormalize = options?.source === "dictation";
  const preparedText = shouldNormalize ? normalizeDictationOutput(text) : text;
  const insertedText = ensureMathMode(preparedText);
  const inserted = document.execCommand("insertText", false, insertedText);
  if (inserted) {
    lastExtensionInsert = {
      text: insertedText,
      insertedAt: Date.now(),
      canUndo: true,
    };
  }
}

function toast(msg) {
  let el = document.getElementById("speech-latex-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "speech-latex-toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("visible"), 3500);
}

function updateCaptureToggleUI() {
  const btn = document.getElementById("speech-latex-toggle");
  if (!btn) return;
  const active = useMicCapture ? whisperRecording : speechListening;
  btn.textContent = active ? "Stop dictation" : "Start dictation";
  btn.setAttribute("aria-pressed", active ? "true" : "false");
  btn.classList.toggle("recording", active);
}

function ensureCaptureToggleButton() {
  if (document.getElementById("speech-latex-toggle")) {
    updateCaptureToggleUI();
    return;
  }
  const btn = document.createElement("button");
  btn.id = "speech-latex-toggle";
  btn.type = "button";
  btn.className = "speech-latex-toggle";
  btn.setAttribute("aria-label", "Toggle speech to LaTeX dictation");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSpeechCapture();
  });
  document.body.appendChild(btn);
  ensureRedoDictationButton();
  updateCaptureToggleUI();
}

function ensureRedoDictationButton() {
  if (document.getElementById("speech-latex-redo-dictate")) return;
  const btn = document.createElement("button");
  btn.id = "speech-latex-redo-dictate";
  btn.type = "button";
  btn.className = "speech-latex-redo";
  btn.textContent = "Redo + dictate";
  btn.setAttribute("aria-label", "Redo last insertion and start dictation");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    redoLatestAndStartDictation();
  });
  document.body.appendChild(btn);
}

/** When true, Alt+S records mic audio and sends it to Gemini for LaTeX; otherwise Web Speech API. */
let useMicCapture = false;
let lastExtensionInsert = null;

function refreshMicPreference() {
  chrome.storage.local.get(["geminiApiKey"], (d) => {
    if (chrome.runtime.lastError) return;
    useMicCapture = !!(d.geminiApiKey && String(d.geminiApiKey).trim());
    updateCaptureToggleUI();
  });
}

refreshMicPreference();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.geminiApiKey) {
    useMicCapture = !!(
      changes.geminiApiKey.newValue && String(changes.geminiApiKey.newValue).trim()
    );
    updateCaptureToggleUI();
  }
});

// --- Mic recording (MediaRecorder → Gemini multimodal) ---

let whisperRecording = false;
let mediaStream = null;
let mediaRecorder = null;
let mediaChunks = [];

function pickAudioMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

async function startWhisperRecording() {
  if (whisperRecording) return;
  if (typeof MediaRecorder === "undefined") {
    console.error("Speech→LaTeX: MediaRecorder not available.");
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    console.error("Speech→LaTeX: microphone denied or unavailable.", e);
    updateCaptureToggleUI();
    return;
  }
  mediaChunks = [];
  const mimeType = pickAudioMimeType();
  try {
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);
  } catch (e) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
    console.error("Speech→LaTeX: could not start MediaRecorder.", e);
    updateCaptureToggleUI();
    return;
  }
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) mediaChunks.push(e.data);
  };
  mediaRecorder.start();
  whisperRecording = true;
  updateCaptureToggleUI();
  toast("Recording… click Stop dictation or Alt+S to send audio to Gemini.");
  console.log("Speech→LaTeX: recording… Press Alt+S or Stop again to finish.");
}

function stopWhisperAndSend() {
  if (!whisperRecording || !mediaRecorder) return;
  whisperRecording = false;
  updateCaptureToggleUI();
  const rec = mediaRecorder;
  const stream = mediaStream;
  mediaRecorder = null;
  mediaStream = null;

  rec.onstop = () => {
    const blobType = rec.mimeType || "audio/webm";
    const blob = new Blob(mediaChunks, { type: blobType });
    mediaChunks = [];
    if (stream) stream.getTracks().forEach((t) => t.stop());

    if (blob.size === 0) {
      console.warn("Speech→LaTeX: empty recording.");
      return;
    }

    toast("Transcribing and converting to LaTeX…");

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const comma = dataUrl.indexOf(",");
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
      if (!base64) return;

      chrome.runtime.sendMessage(
        { type: "AUDIO_TO_LATEX", audioBase64: base64, mimeType: blobType },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            toast("Extension error — check console.");
            return;
          }
          if (response?.ok && response.latex) {
            injectLatex(response.latex + " ", { source: "dictation" });
            toast("Inserted LaTeX.");
          } else {
            console.warn("Speech→LaTeX:", response?.message || response?.error || "Unknown error");
            toast(response?.message || "Could not get LaTeX.");
            if (response?.transcript) injectLatex(response.transcript + " ", { source: "dictation" });
          }
        }
      );
    };
    reader.readAsDataURL(blob);
  };

  try {
    rec.stop();
  } catch (e) {
    console.error("Speech→LaTeX:", e);
    stream?.getTracks().forEach((t) => t.stop());
  }
}

// --- Web Speech API path ---

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let speechListening = false;

const SPOKEN_NUMBER_UNITS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const SPOKEN_NUMBER_TENS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SPOKEN_DENOMINATORS = {
  half: 2,
  halves: 2,
  third: 3,
  thirds: 3,
  fourth: 4,
  fourths: 4,
  quarter: 4,
  quarters: 4,
  fifth: 5,
  fifths: 5,
  sixth: 6,
  sixths: 6,
  seventh: 7,
  sevenths: 7,
  eighth: 8,
  eighths: 8,
  ninth: 9,
  ninths: 9,
  tenth: 10,
  tenths: 10,
  eleventh: 11,
  elevenths: 11,
  twelfth: 12,
  twelfths: 12,
};

function parseSpokenNumber(raw) {
  const text = String(raw || "").trim().toLowerCase().replace(/-/g, " ");
  if (!text) return null;
  if (/^-?\d+$/.test(text)) return Number(text);

  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;

  let sign = 1;
  let idx = 0;
  if (tokens[0] === "negative" || tokens[0] === "minus") {
    sign = -1;
    idx = 1;
  }

  let value = 0;
  let used = false;
  for (; idx < tokens.length; idx += 1) {
    const t = tokens[idx];
    if (t === "and") continue;
    if (Object.prototype.hasOwnProperty.call(SPOKEN_NUMBER_UNITS, t)) {
      value += SPOKEN_NUMBER_UNITS[t];
      used = true;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(SPOKEN_NUMBER_TENS, t)) {
      value += SPOKEN_NUMBER_TENS[t];
      used = true;
      continue;
    }
    return null;
  }

  if (!used) return null;
  return sign * value;
}

function parseSpokenDenominator(raw) {
  const text = String(raw || "").trim().toLowerCase().replace(/-/g, " ");
  if (!text) return null;
  if (Object.prototype.hasOwnProperty.call(SPOKEN_DENOMINATORS, text)) {
    return SPOKEN_DENOMINATORS[text];
  }
  return parseSpokenNumber(text);
}

function buildFractionFromSpeech(numRaw, denRaw) {
  const num = parseSpokenNumber(numRaw);
  const den = parseSpokenDenominator(denRaw);
  if (num == null || den == null || den === 0) return null;
  return `\\frac{${num}}{${den}}`;
}

function localVibeLatex(transcript) {
  const normalized = transcript.trim().toLowerCase();
  const latex = normalized
    .replace(
      /\bfraction\s+([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2})\s+([a-z-]+(?:s)?)\b/g,
      (match, numRaw, denRaw) => buildFractionFromSpeech(numRaw, denRaw) || match
    )
    .replace(/fraction\s+(-?\d+)\s*\/\s*(-?\d+)/g, "\\frac{$1}{$2}")
    .replace(/fraction\s+(-?\d+)\s+over\s+(-?\d+)/g, "\\frac{$1}{$2}")
    .replace(
      /\bfraction\s+([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2})\s+over\s+([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2})\b/g,
      (match, numRaw, denRaw) => buildFractionFromSpeech(numRaw, denRaw) || match
    )
    .replace(
      /\b([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2})\s+over\s+([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2})\b/g,
      (match, numRaw, denRaw) => buildFractionFromSpeech(numRaw, denRaw) || match
    )
    .replace(/fraction/g, "\\frac{}{}")
    .replace(/square root/g, "\\sqrt{}")
    .replace(/alpha/g, "\\alpha")
    .replace(/section/g, "\\section{}")
    .replace(/begin equation/g, "\\begin{equation}\n\n\\end{equation}");
  return latex + " ";
}

if (SpeechRecognitionCtor) {
  recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onend = () => {
    speechListening = false;
    updateCaptureToggleUI();
  };

  recognition.onerror = (event) => {
    speechListening = false;
    updateCaptureToggleUI();
    console.error("Speech recognition error:", event.error);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    console.log("Speech→LaTeX transcript:", transcript);

    chrome.storage.local.get(["geminiApiKey"], (d) => {
      const hasKey = !!(d.geminiApiKey && String(d.geminiApiKey).trim());
      if (!hasKey) {
        injectLatex(localVibeLatex(transcript), { source: "dictation" });
        return;
      }

      chrome.runtime.sendMessage({ type: "CONVERT_SPEECH_TO_LATEX", transcript }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          injectLatex(transcript + " ", { source: "dictation" });
          return;
        }
        if (response?.ok && response.latex) {
          injectLatex(response.latex + " ", { source: "dictation" });
        } else {
          console.warn("Speech→LaTeX:", response?.message || response?.error || "Unknown error");
          injectLatex(transcript + " ", { source: "dictation" });
        }
      });
    });
  };
}

function startSpeechListening() {
  if (!recognition || speechListening) return;
  try {
    recognition.start();
    speechListening = true;
    updateCaptureToggleUI();
    toast("Listening… click Stop dictation or Alt+S to stop.");
    console.log("Speech→LaTeX: Web Speech listening… Press Alt+S again to stop.");
  } catch (err) {
    if (err?.name === "InvalidStateError") {
      speechListening = true;
      updateCaptureToggleUI();
      return;
    }
    console.error("Speech→LaTeX: could not start recognition:", err);
  }
}

function stopSpeechListening() {
  if (!recognition || !speechListening) return;
  try {
    recognition.stop();
  } catch (err) {
    if (err?.name !== "InvalidStateError") console.error("Speech→LaTeX:", err);
  }
  speechListening = false;
  updateCaptureToggleUI();
}

function isCaptureActive() {
  return useMicCapture ? whisperRecording : speechListening;
}

function startSpeechCapture() {
  if (useMicCapture) {
    if (!whisperRecording) void startWhisperRecording();
    return;
  }
  if (!recognition) {
    toast(
      "Speech recognition unavailable. Add a Gemini API key in extension options to record from the mic."
    );
    console.error(
      "Speech→LaTeX: Web Speech API not available. Add a Gemini key in options to use mic capture."
    );
    return;
  }
  if (!speechListening) startSpeechListening();
}

function removeMostRecentExtensionInsertion() {
  if (!lastExtensionInsert?.canUndo) return false;
  const aceHost = document.querySelector(".ace_editor");
  const aceApi = window.ace;
  if (aceHost && aceApi && typeof aceApi.edit === "function") {
    try {
      const aceEditor = aceApi.edit(aceHost);
      if (aceEditor && typeof aceEditor.undo === "function") {
        aceEditor.focus();
        aceEditor.undo();
        lastExtensionInsert = null;
        return true;
      }
    } catch (e) {
      console.warn("Speech→LaTeX: Ace undo fallback failed:", e);
    }
  }

  const editorInput =
    document.querySelector(".ace_text-input") ||
    document.querySelector("textarea.cm-content") ||
    document.querySelector('[role="textbox"]');
  if (!editorInput) return false;
  editorInput.focus();

  // Overleaf editors respond more consistently to keyboard undo than execCommand("undo").
  const key = "z";
  const code = "KeyZ";
  editorInput.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code,
      bubbles: true,
      cancelable: true,
      metaKey: true,
    })
  );
  editorInput.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code,
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    })
  );

  const execUndo = document.execCommand("undo");
  if (!execUndo) return false;

  lastExtensionInsert = null;
  return true;
}

function redoLatestAndStartDictation() {
  if (isCaptureActive()) {
    toast("Stop dictation before using redo + dictate.");
    return;
  }
  const removed = removeMostRecentExtensionInsertion();
  if (!removed) {
    toast("No recent extension insertion to remove. Starting dictation.");
  } else {
    toast("Removed latest insertion. Listening…");
  }
  startSpeechCapture();
}

function toggleSpeechCapture() {
  if (useMicCapture) {
    if (whisperRecording) stopWhisperAndSend();
    else void startWhisperRecording();
    return;
  }

  if (!recognition) {
    toast(
      "Speech recognition unavailable. Add a Gemini API key in extension options to record from the mic."
    );
    console.error(
      "Speech→LaTeX: Web Speech API not available. Add a Gemini key in options to use mic capture."
    );
    return;
  }

  if (speechListening) stopSpeechListening();
  else startSpeechListening();
}

window.addEventListener("keydown", (e) => {
  if (!e.altKey || e.code !== "KeyS" || e.repeat) return;
  e.preventDefault();
  toggleSpeechCapture();
});

ensureCaptureToggleButton();
