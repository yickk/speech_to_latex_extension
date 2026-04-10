const openaiInput = document.getElementById("openaiKey");
const geminiInput = document.getElementById("geminiKey");
const saveBtn = document.getElementById("save");
const showOpenaiBtn = document.getElementById("showOpenai");
const showGeminiBtn = document.getElementById("showGemini");
const statusEl = document.getElementById("status");

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = kind || "";
}

chrome.storage.local.get(["openaiApiKey", "geminiApiKey"], (data) => {
  if (chrome.runtime.lastError) {
    setStatus(chrome.runtime.lastError.message, "err");
    return;
  }
  openaiInput.value = typeof data.openaiApiKey === "string" ? data.openaiApiKey : "";
  geminiInput.value = typeof data.geminiApiKey === "string" ? data.geminiApiKey : "";
});

saveBtn.addEventListener("click", () => {
  const openaiApiKey = openaiInput.value.trim();
  const geminiApiKey = geminiInput.value.trim();
  chrome.storage.local.set({ openaiApiKey, geminiApiKey }, () => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, "err");
      return;
    }
    setStatus("Saved.", "ok");
  });
});

showOpenaiBtn.addEventListener("click", () => {
  openaiInput.type = openaiInput.type === "password" ? "text" : "password";
});

showGeminiBtn.addEventListener("click", () => {
  geminiInput.type = geminiInput.type === "password" ? "text" : "password";
});
