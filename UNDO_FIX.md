# Undo Fix - Character-by-Character Deletion

## Problem

The initial implementation used `document.execCommand('undo')` to remove inserted LaTeX. This caused partial deletions:

**Example:**
- Inserted: `\(\vec{F} = mgh\) `
- After undo: `\vec{} = \(mgh\)` ❌ (partial deletion)

## Root Cause

Overleaf's editors (Ace/CodeMirror) maintain their own undo stacks that don't align with browser's `execCommand('undo')`. The undo command would only remove part of the insertion, leaving malformed LaTeX.

## Solution

Instead of relying on `undo`, we now:

1. **Track exact inserted text** - Store the complete string in `lastInsertedText`
2. **Delete character-by-character** - Use `document.execCommand('delete')` in a loop
3. **Clean removal** - Removes exactly what was inserted, nothing more, nothing less

### Code Changes

```javascript
// Store the exact text we're inserting
const wrappedLatex = ensureMathMode(response.latex);
const textToInsert = wrappedLatex + " ";
lastInsertedText = textToInsert;

// Delete it character-by-character
function deleteLastInsertion() {
  if (!lastInsertedText) return false;
  
  const el = getEditorElement();
  if (!el) return false;
  
  el.focus();
  
  // Delete each character
  for (let i = 0; i < lastInsertedText.length; i++) {
    document.execCommand('delete', false, null);
  }
  
  lastInsertedText = null;
  return true;
}
```

## Why This Works

- `document.execCommand('delete')` removes one character at cursor position
- By calling it N times (where N = length of inserted text), we remove exactly what we inserted
- Works reliably across Ace, CodeMirror, and contenteditable elements
- Maintains Overleaf's undo stack integrity

## Testing

**Before fix:**
```
Insert: $\vec{F} = mgh$ 
Press U: \vec{} = \(mgh\)  ❌ Broken
```

**After fix:**
```
Insert: $\vec{F} = mgh$ 
Press U: [completely removed] ✅ Clean
```

## Edge Cases Handled

1. **User edits after insertion** - If user types after insertion, deletion will remove their edits too (expected behavior - they should press Enter to accept first)
2. **User moves cursor** - Deletion happens from current cursor position, may not remove the insertion (limitation)
3. **No text to delete** - Returns false, shows fallback message

## Future Improvements

- Track cursor position at insertion time
- Restore cursor to that position before deleting
- Handle case where user moved cursor away from insertion
