const geminiInput = document.getElementById("geminiKey");
const saveBtn = document.getElementById("save");
const showGeminiBtn = document.getElementById("showGemini");
const statusEl = document.getElementById("status");

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = kind || "";
}

chrome.storage.local.get(["geminiApiKey"], (data) => {
  if (chrome.runtime.lastError) {
    setStatus(chrome.runtime.lastError.message, "err");
    return;
  }
  geminiInput.value = typeof data.geminiApiKey === "string" ? data.geminiApiKey : "";
});

saveBtn.addEventListener("click", () => {
  const geminiApiKey = geminiInput.value.trim();
  chrome.storage.local.set({ geminiApiKey }, () => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, "err");
      return;
    }
    setStatus("Saved.", "ok");
  });
});

showGeminiBtn.addEventListener("click", () => {
  geminiInput.type = geminiInput.type === "password" ? "text" : "password";
});
