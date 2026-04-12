function injectLatex(text) {
  const el =
    document.querySelector(".ace_text-input") ||
    document.querySelector("textarea.cm-content") ||
    document.querySelector('[role="textbox"]');

  if (!el) {
    console.error("Speech→LaTeX: could not find Overleaf editor input.");
    return;
  }

  el.focus();
  document.execCommand("insertText", false, text);
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
  updateCaptureToggleUI();
}

/** When true, Alt+S records mic audio and sends it to Gemini for LaTeX; otherwise Web Speech API. */
let useMicCapture = false;

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
            injectLatex(response.latex + " ");
            toast("Inserted LaTeX.");
          } else {
            console.warn("Speech→LaTeX:", response?.message || response?.error || "Unknown error");
            toast(response?.message || "Could not get LaTeX.");
            if (response?.transcript) injectLatex(response.transcript + " ");
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

function localVibeLatex(transcript) {
  const latex = transcript
    .trim()
    .toLowerCase()
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
        injectLatex(localVibeLatex(transcript));
        return;
      }

      chrome.runtime.sendMessage({ type: "CONVERT_SPEECH_TO_LATEX", transcript }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          injectLatex(transcript + " ");
          return;
        }
        if (response?.ok && response.latex) {
          injectLatex(response.latex + " ");
        } else {
          console.warn("Speech→LaTeX:", response?.message || response?.error || "Unknown error");
          injectLatex(transcript + " ");
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
