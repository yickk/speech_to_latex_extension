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

function getEditorElement() {
  return (
    document.querySelector(".ace_text-input") ||
    document.querySelector(".cm-content[contenteditable]") ||
    document.querySelector('[role="textbox"]')
  );
}

function extractDocumentContext() {
  const el = getEditorElement();
  if (!el) {
    console.warn("Speech→LaTeX: could not find editor for context extraction.");
    return null;
  }

  try {
    let fullText = "";
    let cursorPos = 0;

    if (el.classList && el.classList.contains("ace_text-input")) {
      fullText = el.value || "";
      cursorPos = el.selectionStart || 0;
    } else if (el.getAttribute("contenteditable") === "true") {
      fullText = el.textContent || "";
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        cursorPos = preRange.toString().length;
      }
    } else {
      fullText = el.value || el.textContent || "";
      cursorPos = el.selectionStart || 0;
    }

    const beforeChars = 700;
    const afterChars = 300;

    const startPos = Math.max(0, cursorPos - beforeChars);
    const endPos = Math.min(fullText.length, cursorPos + afterChars);

    const before = fullText.substring(startPos, cursorPos);
    const after = fullText.substring(cursorPos, endPos);

    return { before, after };
  } catch (e) {
    console.warn("Speech→LaTeX: context extraction failed:", e);
    return null;
  }
}

function injectLatex(text) {
  const el = getEditorElement();

  if (!el) {
    console.error("Speech→LaTeX: could not find Overleaf editor input.");
    return;
  }

  el.focus();
  document.execCommand("insertText", false, ensureMathMode(text));
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
  btn.textContent = isRecording ? "Stop dictation" : "Start dictation";
  btn.setAttribute("aria-pressed", isRecording ? "true" : "false");
  btn.classList.toggle("recording", isRecording);
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
  updateCaptureToggleUI();
}


// --- Audio recording (MediaRecorder → Gemini multimodal) ---

let isRecording = false;
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

async function startRecording() {
  if (isRecording) return;
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
  isRecording = true;
  updateCaptureToggleUI();
  toast("Recording… click Stop dictation or Alt+S to send audio to Gemini.");
  console.log("Speech→LaTeX: recording… Press Alt+S or Stop again to finish.");
}

function stopRecordingAndSend() {
  if (!isRecording || !mediaRecorder) return;
  isRecording = false;
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

    const documentContext = extractDocumentContext();

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const comma = dataUrl.indexOf(",");
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
      if (!base64) return;

      const message = {
        type: "AUDIO_TO_LATEX",
        audioBase64: base64,
        mimeType: blobType,
      };

      if (documentContext) {
        message.documentContext = documentContext;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          toast("Extension error — check console.");
          return;
        }
        if (response?.ok && response.latex) {
          injectLatex(response.latex + " ");
          toast("Inserted LaTeX.");
        } else {
          console.warn("Speech→LaTeX:", response?.message || response?.error || "Unknown error");
          toast(response?.message || "Could not get LaTeX.");
          if (response?.transcript) injectLatex(response.transcript + " ");
        }
      });
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


function toggleSpeechCapture() {
  chrome.storage.local.get(["geminiApiKey"], (d) => {
    const hasKey = !!(d.geminiApiKey && String(d.geminiApiKey).trim());
    if (!hasKey) {
      toast(
        "Gemini API key required. Add your key in extension options to use speech-to-LaTeX."
      );
      console.error(
        "Speech→LaTeX: Gemini API key required. Add a key in extension options."
      );
      return;
    }

    if (isRecording) stopRecordingAndSend();
    else void startRecording();
  });
}

window.addEventListener("keydown", (e) => {
  if (!e.altKey || e.code !== "KeyS" || e.repeat) return;
  e.preventDefault();
  toggleSpeechCapture();
});

ensureCaptureToggleButton();
