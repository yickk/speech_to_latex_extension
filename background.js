/** Try in order; later entries are often less loaded when 2.5-spike errors occur. */
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const GEMINI_RETRIES_PER_MODEL = 3;
const WHISPER_MODEL = "whisper-1";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const t = message?.type;
  if (t === "CONVERT_SPEECH_TO_LATEX") {
    (async () => {
      const result = await convertTranscriptToLatex(message.transcript ?? "");
      sendResponse(result);
    })();
    return true;
  }
  if (t === "AUDIO_TO_LATEX") {
    (async () => {
      const result = await audioToLatex(message.audioBase64 ?? "", message.mimeType ?? "audio/webm");
      sendResponse(result);
    })();
    return true;
  }
});

async function whisperTranscribe(audioBase64, mimeType) {
  const trimmedB64 = typeof audioBase64 === "string" ? audioBase64.trim() : "";
  if (!trimmedB64) {
    return { ok: false, error: "empty_audio", message: "No audio data to transcribe." };
  }

  const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
  const key = typeof openaiApiKey === "string" ? openaiApiKey.trim() : "";
  if (!key) {
    return {
      ok: false,
      error: "missing_openai_key",
      message: "Add your OpenAI API key in extension options to use Whisper.",
    };
  }

  let bytes;
  try {
    bytes = base64ToUint8Array(trimmedB64);
  } catch {
    return { ok: false, error: "invalid_base64", message: "Could not decode audio." };
  }

  if (bytes.length === 0) {
    return { ok: false, error: "empty_audio", message: "Decoded audio was empty." };
  }

  const blob = new Blob([bytes], { type: mimeType || "audio/webm" });
  const ext = mimeType.includes("wav") ? "wav" : "webm";
  const formData = new FormData();
  formData.append("file", new File([blob], `speech.${ext}`, { type: mimeType || "audio/webm" }));
  formData.append("model", WHISPER_MODEL);

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: formData,
    });
  } catch (e) {
    return {
      ok: false,
      error: "network_error",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      error: "invalid_json",
      message: `OpenAI returned non-JSON (HTTP ${response.status}).`,
    };
  }

  if (!response.ok) {
    const apiMsg = data?.error?.message ?? response.statusText;
    return {
      ok: false,
      error: "openai_error",
      httpStatus: response.status,
      message: apiMsg || `HTTP ${response.status}`,
    };
  }

  const text = typeof data?.text === "string" ? data.text.trim() : "";
  if (!text) {
    return { ok: false, error: "empty_transcript", message: "Whisper returned no text." };
  }

  return { ok: true, transcript: text };
}

async function audioToLatex(audioBase64, mimeType) {
  const whisperResult = await whisperTranscribe(audioBase64, mimeType);
  if (!whisperResult.ok) return whisperResult;

  const latexResult = await convertTranscriptToLatex(whisperResult.transcript);
  if (latexResult.ok) {
    return { ok: true, latex: latexResult.latex, transcript: whisperResult.transcript };
  }
  return {
    ok: false,
    error: latexResult.error,
    message: latexResult.message,
    transcript: whisperResult.transcript,
  };
}

function isRetryableGeminiError(httpStatus, apiMessage, errorStatus) {
  if (httpStatus === 429 || httpStatus === 502 || httpStatus === 503) return true;
  const s = String(errorStatus ?? "").toUpperCase();
  if (s.includes("RESOURCE_EXHAUSTED") || s === "UNAVAILABLE") return true;
  const m = String(apiMessage ?? "").toLowerCase();
  if (m.includes("high demand")) return true;
  if (m.includes("try again later")) return true;
  if (m.includes("overloaded")) return true;
  if (m.includes("rate limit")) return true;
  return false;
}

async function geminiGenerateOnce(apiKey, model, trimmed) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: `You are a LaTeX expert. Turn the spoken text into LaTeX for Overleaf.

Output rules (follow strictly):
- Return ONLY the LaTeX. No markdown, no backticks, no explanations, no "Here is your code".
- If the speech is a standalone equation, integral, or one clear math statement meant on its own line, wrap it in display math using \\[ and \\], with a space after \\[ and before \\] (example shape: \\[ \\int_a^b f(x) \\, dx \\]).
- Before differentials (dx, dy, dt, d\\theta, …), always insert \\, (thin space).
- Transcribe the math exactly as spoken: do not change exponents, powers, or standard forms (e.g. if they said "e to the minus x", output e^{-x}; do not substitute e^{-x^2} or other "usual" integrals unless the speech clearly says so).
- Use inline \\( ... \\) only when the speech is clearly a short fragment inside a sentence, not a full display equation.

Spoken text: ${JSON.stringify(trimmed)}`,
          },
        ],
      },
    ],
  });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (e) {
    return {
      ok: false,
      error: "network_error",
      message: e instanceof Error ? e.message : String(e),
      httpStatus: 0,
      retryable: true,
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      error: "invalid_json",
      message: `API returned non-JSON (HTTP ${response.status}).`,
      httpStatus: response.status,
      retryable: isRetryableGeminiError(response.status, "", ""),
    };
  }

  if (!response.ok) {
    const apiMsg = data?.error?.message ?? response.statusText;
    const errStatus = data?.error?.status;
    return {
      ok: false,
      error: "api_error",
      httpStatus: response.status,
      message: apiMsg || `HTTP ${response.status}`,
      retryable: isRetryableGeminiError(response.status, apiMsg, errStatus),
    };
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    return {
      ok: false,
      error: "no_candidate",
      message: "Gemini returned no text (blocked or empty response).",
      httpStatus: response.status,
      retryable: false,
    };
  }

  return { ok: true, latex: text.trim() };
}

async function convertTranscriptToLatex(transcript) {
  const trimmed = typeof transcript === "string" ? transcript.trim() : "";
  if (!trimmed) {
    return { ok: false, error: "empty_transcript", message: "No speech detected." };
  }

  const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
  const key = typeof geminiApiKey === "string" ? geminiApiKey.trim() : "";
  if (!key) {
    return {
      ok: false,
      error: "missing_api_key",
      message: 'Add your Gemini API key in the extension’s options (right-click the extension icon → Options).',
    };
  }

  let lastErr = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < GEMINI_RETRIES_PER_MODEL; attempt++) {
      const result = await geminiGenerateOnce(key, model, trimmed);
      if (result.ok) return result;

      lastErr = result;

      if (result.httpStatus === 404) break;

      if (!result.retryable) {
        return {
          ok: false,
          error: result.error,
          message: result.message,
          httpStatus: result.httpStatus,
        };
      }

      const delayMs = 800 * Math.pow(2, attempt);
      await sleep(delayMs);
    }
  }

  return {
    ok: false,
    error: lastErr?.error ?? "api_error",
    message:
      lastErr?.message ??
      "Gemini could not complete the request after retries. Try again in a minute or check API quota.",
    httpStatus: lastErr?.httpStatus,
  };
}

function base64ToUint8Array(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out;
}
