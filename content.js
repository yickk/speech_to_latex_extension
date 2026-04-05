// 1. Initialize Speech Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'en-US';

console.log("Extension content script loaded!");

// 2. The Logic to Inject LaTeX into Overleaf
function injectLatex(text) {
    // Debugging: What CAN we see?
    console.log("Textareas found:", document.querySelectorAll('textarea').length);
    console.log("Inputs found:", document.querySelectorAll('input').length);
    // Look for the standard Ace input, or the new CodeMirror-style input
    const el = document.querySelector('.ace_text-input') ||
               document.querySelector('textarea.cm-content') ||
               document.querySelector('[role="textbox"]');

    if (el) {
        el.focus();
        // This is the most modern way to 'type' into a web editor
        document.execCommand('insertText', false, text);
        console.log("Success! Injected:", text);
    } else {
        console.error("Still can't find it. Let's look at the page structure.");
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
