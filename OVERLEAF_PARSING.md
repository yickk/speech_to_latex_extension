# Overleaf HTML Parsing: Technical Deep Dive

## Overview

This extension injects LaTeX into Overleaf's editor by parsing the DOM to find the active text input element. This document explains how Overleaf's HTML structure is handled and key lessons learned.

## The Challenge

Overleaf uses different editor implementations depending on user preferences and project settings:
1. **Ace Editor** (legacy, still common)
2. **CodeMirror 6** (newer default)
3. **Rich Text Mode** (WYSIWYG-style)

Each has a different DOM structure, requiring a fallback chain to find the correct input element.

## The Solution

### Code Implementation

```javascript
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
  document.execCommand("insertText", false, ensureMathMode(text));
}
```

### Selector Breakdown

#### 1. `.ace_text-input` (Ace Editor)
- **What it is**: A hidden `<textarea>` element used by Ace Editor
- **DOM structure**:
  ```html
  <div class="ace_editor">
    <textarea class="ace_text-input" autocorrect="off" ...></textarea>
    <div class="ace_scroller">...</div>
  </div>
  ```
- **Why it works**: Ace uses a hidden textarea for actual text input, while rendering a styled overlay
- **Gotcha**: The textarea is visually hidden but receives all keyboard input

#### 2. `textarea.cm-content` (CodeMirror 6)
- **What it is**: CodeMirror 6's editable content area
- **DOM structure**:
  ```html
  <div class="cm-editor">
    <div class="cm-scroller">
      <div class="cm-content" contenteditable="true" role="textbox">...</div>
    </div>
  </div>
  ```
- **Why it works**: CodeMirror 6 uses a `contenteditable` div, not a textarea
- **Note**: The selector `textarea.cm-content` is actually **incorrect** - it should be `div.cm-content` or `.cm-content[contenteditable]`

#### 3. `[role="textbox"]` (Generic Fallback)
- **What it is**: ARIA role for any text input element
- **Why it works**: Catches rich text mode or future editor changes
- **Coverage**: Works for accessibility-compliant editors

### Text Injection Method

```javascript
el.focus();
document.execCommand("insertText", false, ensureMathMode(text));
```

#### Why `document.execCommand("insertText")`?

1. **Preserves undo/redo**: Unlike `el.value += text`, this maintains editor history
2. **Triggers events**: Fires `input` and `change` events that Overleaf listens for
3. **Respects selection**: Replaces selected text or inserts at cursor
4. **Works with contenteditable**: Functions on both `<textarea>` and `contenteditable` elements

#### Alternative Approaches (Not Used)

❌ **Direct value assignment**: `el.value = text`
- Breaks undo/redo
- Doesn't trigger Overleaf's change detection
- Overwrites entire content

❌ **Synthetic keyboard events**: `new KeyboardEvent(...)`
- Complex to implement
- Unreliable across browsers
- Doesn't handle special characters well

❌ **Clipboard API**: `navigator.clipboard.writeText()` + paste
- Requires user permission
- Async complexity
- May trigger paste handlers unexpectedly

## Content Script Injection

### Manifest Configuration

```json
"content_scripts": [
  {
    "matches": ["https://www.overleaf.com/project/*"],
    "js": ["content.js"],
    "css": ["styles.css"]
  }
]
```

### Why This Pattern?

- **URL matching**: Only runs on Overleaf project pages, not homepage/settings
- **Automatic injection**: Chrome injects the script when page loads
- **Isolated context**: Content script has DOM access but isolated JavaScript environment
- **CSS injection**: Styles for the toggle button are injected alongside

## Key Lessons Learned

### 1. **Always Use Fallback Chains**

Web apps change their implementations. Overleaf has migrated from Ace to CodeMirror over time. A robust extension must handle:
- Legacy implementations (Ace)
- Current implementations (CodeMirror 6)
- Future implementations (generic ARIA roles)

**Pattern**:
```javascript
const element = 
  document.querySelector(".specific-current") ||
  document.querySelector(".specific-legacy") ||
  document.querySelector("[generic-fallback]");
```

### 2. **Prefer Standard APIs Over Hacks**

`document.execCommand("insertText")` is deprecated but still the best option because:
- It's the **standard way** to programmatically insert text
- Alternatives (clipboard, synthetic events) are more complex
- Modern replacement (Input Events API) isn't fully supported

**Lesson**: Use the simplest API that works, even if deprecated, until a better standard emerges.

### 3. **Focus Before Insertion**

```javascript
el.focus();
document.execCommand("insertText", false, text);
```

Always focus the element first because:
- `execCommand` operates on the **focused** element
- Ensures cursor position is correct
- Triggers editor's focus handlers (syntax highlighting, etc.)

### 4. **Understand Editor Architectures**

Modern code editors use **virtual rendering**:
- **What you see**: Styled `<div>` elements with syntax highlighting
- **What receives input**: Hidden `<textarea>` or `contenteditable` div
- **Why**: Performance - only render visible lines, not entire document

**Implication**: Always target the **input element**, not the visual display.

### 5. **Test Across Editor Modes**

Overleaf users can switch editors in settings. Your extension must work with:
- Source code mode (Ace/CodeMirror)
- Rich text mode (visual editor)
- Visual mode (WYSIWYG)

**Testing checklist**:
- [ ] Legacy Ace editor
- [ ] New CodeMirror editor  
- [ ] Rich text mode
- [ ] Different browser engines (Chrome, Firefox, Safari)

### 6. **Handle Edge Cases Gracefully**

```javascript
if (!el) {
  console.error("Speech→LaTeX: could not find Overleaf editor input.");
  return;
}
```

**Why this matters**:
- User might be on a non-editor page
- Overleaf might change their DOM structure
- Page might still be loading

**Better approach**: Could add retry logic or wait for DOM ready.

### 7. **Content Scripts Run in Isolated Context**

Content scripts can:
- ✅ Access and modify the DOM
- ✅ Listen to DOM events
- ✅ Use Chrome extension APIs (storage, messaging)

Content scripts **cannot**:
- ❌ Access page JavaScript variables
- ❌ Call page JavaScript functions
- ❌ Share objects with page scripts

**Implication**: You must work through the DOM, not the page's JavaScript API.

## Potential Improvements

### 1. **Fix CodeMirror Selector**

Current selector `textarea.cm-content` is wrong. Should be:
```javascript
document.querySelector(".cm-content[contenteditable]") ||
document.querySelector(".cm-content[role='textbox']")
```

### 2. **Add MutationObserver for Dynamic Loading**

Overleaf loads the editor asynchronously. Better approach:
```javascript
function waitForEditor() {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector(".ace_text-input") || 
                 document.querySelector(".cm-content[contenteditable]");
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
```

### 3. **Verify Editor State Before Injection**

Check if editor is:
- Loaded and ready
- Not in read-only mode
- Not currently compiling
- Has focus or can receive focus

### 4. **Support Multiple Cursors**

CodeMirror 6 supports multiple cursors. Could inject at all cursor positions.

## Testing Strategy

### Manual Testing

1. **Test each editor type**:
   - Go to Overleaf settings → Editor
   - Switch between Ace, CodeMirror, Rich Text
   - Test speech-to-LaTeX in each mode

2. **Test edge cases**:
   - Page just loaded (editor not ready)
   - During compilation
   - With read-only files
   - In comments vs. math mode

### Automated Testing (Future)

Could use Playwright/Puppeteer to:
```javascript
// Load Overleaf project
await page.goto('https://www.overleaf.com/project/...');

// Inject extension
await page.addScriptTag({ path: 'content.js' });

// Simulate speech input
await page.evaluate(() => {
  injectLatex('\\frac{1}{2}');
});

// Verify insertion
const content = await page.evaluate(() => 
  document.querySelector('.ace_text-input').value
);
expect(content).toContain('\\frac{1}{2}');
```

## Conclusion

### What Makes This Approach Robust

1. **Fallback chain** handles multiple editor implementations
2. **Standard API** (`execCommand`) preserves editor state
3. **Graceful degradation** with error logging
4. **Minimal assumptions** about Overleaf's internal structure

### What Could Break This

1. **Overleaf switches to a new editor** without ARIA roles
2. **Shadow DOM adoption** (selectors won't penetrate shadow roots)
3. **`execCommand` removal** from browsers (unlikely soon)
4. **CSP restrictions** preventing content script injection

### Key Takeaway

**When building browser extensions for third-party sites, always code defensively:**
- Use multiple selectors with fallbacks
- Prefer standard APIs over hacks
- Log errors for debugging
- Test across different configurations
- Expect the unexpected

The web is constantly evolving. Your extension should be resilient to change.
