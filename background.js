/** Try in order; later entries are often less loaded when demand spikes. */
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const GEMINI_RETRIES_PER_MODEL = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LATEX_SYSTEM_PROMPT = `You turn spoken mathematics and technical dictation into LaTeX for Overleaf.
You are a physics-specialist notation expert for mechanics, E&M, thermodynamics, waves, relativity, and quantum mechanics.

Always respond with ONLY valid JSON (no markdown fences, no commentary). The JSON shape is given in the user message.

Rules for the "latex" string:
- Ready to paste into an editor: correct LaTeX commands and math mode.
- Prefer inline math with \\( ... \\) or $ ... $ for short fragments; use \\[ ... \\] or equation environments when the speaker clearly wants a displayed equation.
- For prose sentences, output natural written English capitalization and punctuation (sentence starts capitalized, proper commas/periods).
- If speech includes spoken punctuation words (for example "comma", "period", "full stop", "question mark", "colon", "semicolon"), convert them to punctuation marks instead of leaving the words.
- Use \\left( \\right), \\left[ \\right], \\left\\{ \\right\\} for scalable brackets when nesting or for tall expressions.
- Fractions: \\frac{numerator}{denominator}. Subscripts/superscripts: x_1, x^2, x_{10}, x^{n+1}.
- Greek letters by name (alpha → \\alpha). Functions: \\sin, \\cos, \\log, \\lim, \\sum, \\int with limits as spoken.
- Preserve variable case exactly as intended by speech. For single-letter variables, default to lowercase unless the user explicitly says "capital" or "uppercase".
- Do not silently promote lowercase variables to uppercase (g stays g, n stays n).
- If the spoken symbol is "varphi", output \\varphi (not \\phi).
- In prose, wrap symbolic variables and math fragments in inline math delimiters automatically (for example: "incoming momentum p" -> "incoming momentum $p$"; "energy E equals m c squared" -> "$E = mc^2$" where appropriate).
- Matrices: bmatrix, pmatrix, vmatrix; aligned / cases when appropriate.
- Before differentials (dx, dy, dt, …), use \\, (thin space) when standard.
- Physics notation defaults:
  - Vectors as \\vec{v}, \\vec{F}, \\vec{E}, \\vec{B}.
  - Unit vectors as \\hat{x}, \\hat{y}, \\hat{z}; operators like \\hat{H}.
  - Time derivatives as \\dot{x}, \\ddot{x}; partial derivatives with \\partial.
  - Use \\nabla, \\nabla \\cdot, \\nabla \\times when spoken as del/nabla/divergence/curl.
  - Use standard constants/symbols when spoken: \\hbar, \\epsilon_0, \\mu_0, k_B.
  - Keep units upright with \\mathrm{...} and include thin space, e.g. 9.81\\,\\mathrm{m/s^2}.
- Speech disambiguation for physics:
  - "mu naught" or "mu zero" => \\mu_0
  - "epsilon naught" or "epsilon zero" => \\epsilon_0
  - "h bar" => \\hbar
  - "del" => \\nabla
  - "dot x" => \\dot{x}, "double dot x" => \\ddot{x}
- Keep punctuation-tight math formatting unless spacing is semantically needed (for example, output $-\\frac{g}{n!}\\varphi^n$ without inserting extra spaces).
- Transcribe math as spoken; do not substitute a "more standard" formula unless the speech clearly matches it.
- Plain prose: escape LaTeX specials where needed (% $ & # _ ^).
- No document preamble; output only the fragment to insert.`;

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

async function getGeminiKey() {
  const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
  const key = typeof geminiApiKey === "string" ? geminiApiKey.trim() : "";
  return key;
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

function geminiResponseText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

async function geminiGenerateOnce(apiKey, model, userParts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: LATEX_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: userParts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
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
      message: `Gemini returned non-JSON (HTTP ${response.status}).`,
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

  const text = geminiResponseText(data);
  if (!text) {
    return {
      ok: false,
      error: "no_candidate",
      message: "Gemini returned no text (blocked or empty response).",
      httpStatus: response.status,
      retryable: false,
    };
  }

  let latex = "";
  let transcript = "";
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.latex === "string") latex = parsed.latex.trim();
    if (typeof parsed?.transcript === "string") transcript = parsed.transcript.trim();
  } catch {
    latex = parseLatexFromLooseText(text);
  }

  if (!latex) {
    return {
      ok: false,
      error: "no_latex",
      message: "Gemini returned no usable LaTeX in JSON.",
      httpStatus: response.status,
      retryable: false,
    };
  }

  return { ok: true, latex, transcript };
}

function parseLatexFromLooseText(raw) {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  try {
    const parsed = JSON.parse(s);
    return typeof parsed?.latex === "string" ? parsed.latex.trim() : "";
  } catch {
    return "";
  }
}

async function geminiWithRetries(userParts, opts = {}) {
  const { isAudio = false } = opts;
  const key = await getGeminiKey();
  if (!key) {
    return {
      ok: false,
      error: "missing_gemini_key",
      message: "Add your Gemini API key in the extension options.",
    };
  }

  let lastErr = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < GEMINI_RETRIES_PER_MODEL; attempt++) {
      const result = await geminiGenerateOnce(key, model, userParts);
      if (result.ok) return result;

      lastErr = result;

      if (result.httpStatus === 404) break;

      if (!result.retryable) {
        if (isAudio && result.httpStatus === 400) {
          break;
        }
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

async function convertTranscriptToLatex(transcript) {
  const trimmed = typeof transcript === "string" ? transcript.trim() : "";
  if (!trimmed) {
    return { ok: false, error: "empty_transcript", message: "No speech detected." };
  }

  const userText = `Convert this transcript to LaTeX suitable for Overleaf.
Preserve natural sentence capitalization and punctuation for prose.
Automatically use inline math delimiters for symbolic variables/expressions that appear in prose when needed.
Output JSON only with this exact shape: {"latex":"<LaTeX string ready to paste>"}.

Transcript:
${trimmed}`;

  return geminiWithRetries([{ text: userText }], { isAudio: false });
}

async function audioToLatex(audioBase64, mimeType) {
  const trimmedB64 = typeof audioBase64 === "string" ? audioBase64.trim() : "";
  if (!trimmedB64) {
    return { ok: false, error: "empty_audio", message: "No audio data." };
  }

  const mime = mimeType && mimeType.trim() ? mimeType.trim() : "audio/webm";

  const userText = `The attached audio is the user dictating mathematics or technical text for LaTeX (Overleaf).

Listen to the audio, transcribe it, and produce correct LaTeX.

Output JSON only with this shape:
{"latex":"<LaTeX string ready to paste>","transcript":"<what was said, plain text>"}

Both fields are required. The transcript is for debugging; latex is what gets inserted.`;

  const userParts = [
    {
      inline_data: {
        mime_type: mime,
        data: trimmedB64,
      },
    },
    { text: userText },
  ];

  const result = await geminiWithRetries(userParts, { isAudio: true });
  if (result.ok) {
    return {
      ok: true,
      latex: result.latex,
      transcript: result.transcript || undefined,
    };
  }

  return {
    ok: false,
    error: result.error,
    message: result.message,
    transcript: result.transcript,
  };
}
