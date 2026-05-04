# Testing Guide: Context-Aware Speech-to-LaTeX

## Quick Start Testing

### 1. Reload the Extension

1. Open `chrome://extensions/`
2. Find "Speech → LaTeX" extension
3. Click the reload icon (circular arrow)
4. Verify no errors appear

### 2. Basic Functionality Test

1. Open any Overleaf project
2. Press **Alt+S** to start recording
3. Say something simple: "x equals one"
4. Press **Alt+S** to stop
5. Verify LaTeX is inserted: `$x = 1$`

**Expected**: Extension works normally (baseline test)

### 3. Context Awareness Test

#### Test A: Vector Notation Consistency

**Setup**:
```latex
The force vector is $\vec{F} = m\vec{a}$.
The velocity vector is $\vec{v} = \vec{v}_0 + \vec{a}t$.
[CURSOR HERE]
```

**Action**: 
- Position cursor after the text above
- Record: "The acceleration vector equals"

**Expected Result**: 
- Should generate: `$\vec{a} =$` (using `\vec{}` style, not `\mathbf{}`)

**Why**: Context shows consistent use of `\vec{}` for vectors

---

#### Test B: Capitalization Consistency

**Setup**:
```latex
Let $T$ be the temperature in Kelvin and $t$ be the time in seconds.
We have $T = 300\,\mathrm{K}$ at $t = 0$.
[CURSOR HERE]
```

**Action**:
- Record: "At time t equals 5 seconds, temperature T equals"

**Expected Result**:
- Should use lowercase `t` for time and uppercase `T` for temperature
- Example: `At $t = 5\,\mathrm{s}$, $T =$`

**Why**: Context establishes `T` = temperature, `t` = time

---

#### Test C: Domain-Specific Notation

**Setup**:
```latex
The Hamiltonian operator is $\hat{H}\psi = E\psi$.
The momentum operator is $\hat{p} = -i\hbar\nabla$.
[CURSOR HERE]
```

**Action**:
- Record: "The energy operator is"

**Expected Result**:
- Should use `\hat{}` notation: `$\hat{E}$` or `$\hat{H}$`
- Should recognize quantum mechanics context

**Why**: Context shows quantum mechanics notation with operators using `\hat{}`

---

#### Test D: Custom Terminology

**Setup**:
```latex
We define the Lagrangian as $\mathcal{L} = T - V$.
The Euler-Lagrange equation is $\frac{d}{dt}\frac{\partial\mathcal{L}}{\partial\dot{q}} = \frac{\partial\mathcal{L}}{\partial q}$.
[CURSOR HERE]
```

**Action**:
- Record: "The Lagrangian equals"

**Expected Result**:
- Should use `\mathcal{L}` (not just `L`)

**Why**: Context shows Lagrangian is formatted as `\mathcal{L}`

---

### 4. Edge Case Testing

#### Test E: Empty Document

**Setup**: Empty Overleaf document

**Action**: Record: "x equals one"

**Expected Result**: 
- Should work normally (no context available)
- Should generate: `$x = 1$`

**Why**: Graceful fallback when no context exists

---

#### Test F: Cursor at Start

**Setup**:
```latex
[CURSOR HERE]
The force is $F = ma$.
```

**Action**: Record: "The acceleration is"

**Expected Result**:
- Should work (uses "after" context only)
- May or may not match `F` style (limited context)

**Why**: Tests asymmetric context extraction

---

#### Test G: Cursor at End

**Setup**:
```latex
The force is $F = ma$.
The acceleration is $a = F/m$.
[CURSOR HERE]
```

**Action**: Record: "The mass is"

**Expected Result**:
- Should work (uses "before" context only)
- Should recognize `F`, `m`, `a` variables

**Why**: Tests context extraction with no "after" text

---

### 5. Browser Console Verification

Open browser console (F12) and check for:

**Success Messages**:
- No warnings about "could not find editor"
- No errors during context extraction

**Context Extraction Logs** (optional - add for debugging):
```javascript
// In content.js, temporarily add:
console.log("Context extracted:", documentContext);
```

**Expected Output**:
```
Context extracted: {
  before: "...text before cursor...",
  after: "...text after cursor..."
}
```

---

### 6. Different Editor Types

#### Test with Ace Editor

1. Go to Overleaf Menu → Settings → Editor
2. Select "Ace" (legacy editor)
3. Run Tests A-D above
4. Verify context extraction works

#### Test with CodeMirror 6

1. Go to Overleaf Menu → Settings → Editor
2. Select "CodeMirror" (default)
3. Run Tests A-D above
4. Verify context extraction works

---

## Debugging Checklist

### Context Not Working?

- [ ] Extension reloaded after code changes?
- [ ] On Overleaf project page (not homepage)?
- [ ] Editor fully loaded before recording?
- [ ] Cursor positioned in document?
- [ ] Browser console shows no errors?
- [ ] Gemini API key configured?

### Unexpected Results?

- [ ] Check if context has enough relevant text (>100 chars recommended)
- [ ] Verify existing notation is consistent in document
- [ ] Remember: Gemini prioritizes speech over context
- [ ] Try with more explicit context (more examples in document)

### Performance Issues?

- [ ] Document size reasonable (<10,000 lines)?
- [ ] Browser not overloaded (close other tabs)?
- [ ] Network connection stable?

---

## Advanced Testing

### Test Context Limits

**Setup**: Create document with >1000 characters before cursor

**Action**: Record something

**Verify**: 
- Only last 700 chars before cursor are sent
- Only first 300 chars after cursor are sent
- Check in browser console (add logging if needed)

### Test Special Characters

**Setup**:
```latex
The equation is $\alpha + \beta = \gamma$.
[CURSOR HERE]
```

**Action**: Record: "alpha plus beta"

**Expected**: Should use `\alpha + \beta` (matching Greek letter style)

### Test Mixed Content

**Setup**:
```latex
Some text here.
$$
\vec{F} = m\vec{a}
$$
More text.
[CURSOR HERE]
```

**Action**: Record: "The force vector"

**Expected**: Should recognize both inline and display math context

---

## Success Criteria

✅ **Basic functionality**: Extension inserts LaTeX without errors

✅ **Context extraction**: No console errors about missing editor

✅ **Notation consistency**: Matches existing vector/operator notation

✅ **Capitalization**: Maintains variable name capitalization

✅ **Domain adaptation**: Recognizes physics/math domain from context

✅ **Edge cases**: Works with empty docs, cursor at start/end

✅ **Multiple editors**: Works with both Ace and CodeMirror

✅ **Backward compatibility**: Works even when context extraction fails

---

## Reporting Issues

If you find issues, note:

1. **What you did**: Exact steps to reproduce
2. **What happened**: Actual result
3. **What you expected**: Expected result
4. **Context**: Document content around cursor
5. **Console output**: Any errors or warnings
6. **Editor type**: Ace or CodeMirror
7. **Browser**: Chrome version

---

## Next Steps After Testing

1. **If tests pass**: Extension is ready to use!
2. **If tests fail**: Check console for errors, verify setup
3. **For improvements**: See CONTEXT_IMPLEMENTATION.md for future enhancements
4. **For questions**: Review code comments in content.js and background.js
