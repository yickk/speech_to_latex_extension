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

/** When true, Alt+S records mic audio and uses OpenAI Whisper; otherwise Web Speech API. */
let useWhisper = false;

function refreshWhisperPreference() {
  chrome.storage.local.get(["openaiApiKey"], (d) => {
    if (chrome.runtime.lastError) return;
    useWhisper = !!(d.openaiApiKey && String(d.openaiApiKey).trim());
  });
}

refreshWhisperPreference();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.openaiApiKey) {
    useWhisper = !!(
      changes.openaiApiKey.newValue && String(changes.openaiApiKey.newValue).trim()
    );
  }
});

// --- OpenAI Whisper path (MediaRecorder → background) ---

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
    return;
  }
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) mediaChunks.push(e.data);
  };
  mediaRecorder.start();
  whisperRecording = true;
  console.log("Speech→LaTeX: recording for Whisper… Press Alt+S again to stop and transcribe.");
}

function stopWhisperAndSend() {
  if (!whisperRecording || !mediaRecorder) return;
  whisperRecording = false;
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
            return;
          }
          if (response?.ok && response.latex) {
            injectLatex(response.latex);
          } else {
            console.warn("Speech→LaTeX:", response?.message || response?.error || "Unknown error");
            if (response?.transcript) injectLatex(response.transcript);
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

if (SpeechRecognitionCtor) {
  recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onend = () => {
    speechListening = false;
  };

  recognition.onerror = (event) => {
    speechListening = false;
    console.error("Speech recognition error:", event.error);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    console.log("Speech→LaTeX transcript:", transcript);

    chrome.runtime.sendMessage(
      { type: "CONVERT_SPEECH_TO_LATEX", transcript },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          injectLatex(transcript);
          return;
        }
        if (response?.ok && response.latex) {
          injectLatex(response.latex);
        } else {
          console.warn("Speech→LaTeX:", response?.message || response?.error || "Unknown error");
          injectLatex(transcript);
        }
      }
    );
  };
}

function startSpeechListening() {
  if (!recognition || speechListening) return;
  try {
    recognition.start();
    speechListening = true;
    console.log("Speech→LaTeX: Web Speech listening… Press Alt+S again to stop.");
  } catch (err) {
    if (err?.name === "InvalidStateError") {
      speechListening = true;
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
}

window.addEventListener("keydown", (e) => {
  if (!e.altKey || e.code !== "KeyS" || e.repeat) return;
  e.preventDefault();

  if (useWhisper) {
    if (whisperRecording) stopWhisperAndSend();
    else startWhisperRecording();
    return;
  }

  if (!recognition) {
    console.error("Speech→LaTeX: Web Speech API not available. Add an OpenAI key to use Whisper.");
    return;
  }
  if (speechListening) stopSpeechListening();
  else startSpeechListening();
});
