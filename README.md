# speech_to_latex_extension

Chrome extension: dictate on [Overleaf](https://www.overleaf.com), transcribe with **Whisper** (optional) or the browser speech API, then convert to LaTeX with **Gemini**.

## Install (development)

1. Open `chrome://extensions/`
2. Turn on **Developer mode**
3. **Load unpacked** and choose this folder (`speech_to_latex_extension`)
4. Open an Overleaf project (`https://www.overleaf.com/project/...`)
5. Click the extension’s **Options** (or right-click the extension → Options)

## API keys (required for full flow)

Keys are **never** stored in this repo. They live only in **Chrome extension storage** after you save them in Options.

| Key | Purpose |
|-----|--------|
| **Gemini** | Spoken text → LaTeX |
| **OpenAI** | Optional: mic recording → Whisper. If unset, the browser’s built-in speech recognition is used instead. |

Each collaborator should create their own keys:

- **Gemini:** [Google AI Studio](https://aistudio.google.com/apikey)
- **OpenAI (Whisper):** [OpenAI API keys](https://platform.openai.com/api-keys)

Paste them into the extension **Options** page and click **Save keys**.

### Sharing keys with collaborators (without GitHub)

Do **not** put API keys in issues, README, commits, or Gists.

- **Preferred:** each person uses their own keys (simplest billing and revocation).
- **Shared team key:** distribute through a **password manager**, encrypted doc, or private channel your org already uses — not through the repository.

If a key was ever committed or pasted publicly, **rotate (revoke and replace) it** in the provider’s console.

## Usage on Overleaf

1. Focus the editor
2. **Alt+S** (Option+S on Mac) to start; **Alt+S** again to stop (Whisper path) or to stop Web Speech listening
3. Allow microphone when the browser asks (Whisper path)

## Push to GitHub safely

1. Confirm no secrets in tracked files: search the repo for `AIza`, `sk-proj`, `sk-`, etc.
2. Use the `.gitignore` in this repo (ignore `.env`, `secrets.json`, …).
3. If this repo was ever public with keys in history, rotate those keys and consider [removing secrets from Git history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) before pushing again.

```bash
git add .
git status   # review every file
git commit -m "Add Overleaf speech-to-LaTeX extension"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Use a **private** repository if you want to limit who sees the code (keys should still not be in the code).
