// 1. Initialize Speech Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'en-US';

// 2. The Logic to Inject LaTeX into Overleaf
function injectLatex(text) {
    // Overleaf uses Ace Editor. We need to dispatch a 'paste' event
    // because it's the most reliable way to insert at the cursor
    // without breaking Overleaf's internal "undo" history.
    const textEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
        bubbles: true,
        cancelable: true
    });
    textEvent.clipboardData.setData('text/plain', text);

    // Target the Ace text input layer
    const el = document.querySelector('.ace_text-input');
    if (el) {
        el.focus();
        el.dispatchEvent(textEvent);
    }
}

// 3. Convert Speech to LaTeX "Vibe"
recognition.onresult = (event) => {
    let transcript = event.results[event.results.length - 1][0].transcript.trim();

    // Simple Mapping (The "Vibe" layer)
    let latex = transcript
        .toLowerCase()
        .replace(/fraction/g, '\\frac{}{}')
        .replace(/square root/g, '\\sqrt{}')
        .replace(/alpha/g, '\\alpha')
        .replace(/section/g, '\\section{}')
        .replace(/begin equation/g, '\\begin{equation}\n\n\\end{equation}');

    injectLatex(latex + " ");
};

// 4. Trigger with a Keyboard Shortcut (Option + S)
window.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyS') {
        recognition.start();
        console.log("Listening for LaTeX...");
    }
});
