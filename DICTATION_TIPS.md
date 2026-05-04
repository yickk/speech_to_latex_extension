# Dictation Tips for Better Context Matching

## Based on Real Test Results

### What's Working Well ✅

From your test results, the context awareness is successfully:
- Extracting and using surrounding document text
- Matching vector notation (`\vec{k}`)
- Using correct physics constants (`\hbar`, `\epsilon_0`)
- Maintaining subscript patterns (`\omega_k`)
- Recognizing variable names from context

### What Needs Improvement ⚠️

The AI sometimes uses "standard" physics notation instead of exact context patterns:
- Used `H_{\mathrm{int}}` instead of `\hat{H}_{\text{int}}` (missing hat)
- Used `\bra{}` `\ket{}` instead of `\langle |` `| \rangle`
- Used `\vec{\epsilon}_{k\lambda}` instead of `\vec{\epsilon}_{\vec{k},\lambda}`

---

## Dictation Strategies

### **Strategy 1: Be Explicit About Special Notation**

When dictating operators, decorations, or special formatting:

❌ **Don't say**: "H int"
✅ **Do say**: "**hat H** subscript **text int**"

❌ **Don't say**: "epsilon k lambda"
✅ **Do say**: "epsilon subscript **vector k comma lambda**"

❌ **Don't say**: "psi i"
✅ **Do say**: "psi subscript **lowercase i**"

### **Strategy 2: Spell Out Complex Subscripts**

For nested or complex subscripts:

**Example**: `\hat{a}^\dagger_{\vec{k},\lambda}`

Say: "**hat a dagger** subscript **vector k comma lambda**"

**Example**: `\vec{\epsilon}_{\vec{k},\lambda}`

Say: "**vector epsilon** subscript **vector k comma lambda**"

### **Strategy 3: Mention Decorations First**

Always mention hats, vectors, bars, tildes BEFORE the symbol:

✅ "**hat** H" → `\hat{H}`
✅ "**vector** k" → `\vec{k}`
✅ "**bar** psi" → `\bar{\psi}`
✅ "**tilde** phi" → `\tilde{\phi}`

### **Strategy 4: Be Explicit About Capitalization**

When capitalization matters:

✅ "**capital** W equals" → `W =`
✅ "**lowercase** omega" → `\omega`
✅ "**capital** Gamma" → `\Gamma`

### **Strategy 5: Use Phonetic Cues for Ambiguity**

For similar-sounding symbols:

- "**lowercase** psi **subscript lowercase i**" → `\psi_i`
- "**capital** Psi **subscript capital I**" → `\Psi_I`

---

## Specific Fixes for Your Tests

### **Test 1: Fermi's Golden Rule**

**What you said**:
> "...matrix element H int between psi f and psi i..."

**What you got**: `H_{\mathrm{int}}`

**What to say instead**:
> "...matrix element **hat H subscript text int** between psi **lowercase** f and psi **lowercase** i..."

**Expected result**: `\hat{H}_{\text{int}}`

---

### **Test 2: Photon Emission**

**What you said**:
> "...epsilon k lambda..."

**What you got**: `\vec{\epsilon}_{k\lambda}`

**What to say instead**:
> "...epsilon subscript **vector k comma lambda**..."

**Expected result**: `\vec{\epsilon}_{\vec{k},\lambda}`

**Also for rate**:
> "...the rate is **capital Gamma** equals..."

**Expected result**: `\Gamma =` (not `\gamma =`)

---

## Advanced Dictation Patterns

### **Bra-Ket Notation**

If your document uses explicit `\langle |` `| \rangle`:

❌ Don't say: "bra psi f ket"
✅ Do say: "**angle bracket** psi f **pipe** H int **pipe** psi i **close angle bracket**"

Or more naturally:
✅ "the matrix element of H int between psi f and psi i"

The AI should recognize the pattern from context.

### **Fractions in Subscripts**

For complex expressions like `\omega_k = c|\vec{k}|`:

Say: "omega subscript k equals c times the **magnitude of vector k**"

### **Multiple Subscripts/Superscripts**

For `\hat{a}^\dagger_{\vec{k},\lambda}`:

Say: "**hat a dagger** subscript **vector k comma lambda**"

Break it down:
1. Decoration: "hat"
2. Symbol: "a"
3. Superscript: "dagger"
4. Subscript: "vector k comma lambda"

---

## Context Strengthening Techniques

### **Technique 1: Add More Examples**

Before dictating, add 2-3 more equations using the exact notation you want:

```latex
\subsection{Additional Examples}

The interaction Hamiltonian is $\hat{H}_{\text{int}}$.
The photon creation operator is $\hat{a}^\dagger_{\vec{k},\lambda}$.
The polarization vector is $\vec{\epsilon}_{\vec{k},\lambda}$.

[NOW DICTATE HERE]
```

More examples = stronger signal for the AI.

### **Technique 2: Position Cursor Strategically**

Place your cursor **immediately after** the section with the notation you want to match.

**Good**: Right after the "Notation Conventions" section
**Bad**: At the very end of a long document (context window might miss conventions)

### **Technique 3: Use Consistent Patterns**

If you want `\hat{H}_{\text{int}}` throughout:
- Use it 3+ times in the context
- Never use `H_{\mathrm{int}}` or `H_{int}` in the same document
- Consistency helps the AI learn

---

## Quick Reference: Common Physics Dictations

### **Operators**
- `\hat{H}` → "**hat H**"
- `\hat{a}^\dagger` → "**hat a dagger**"
- `\hat{n}` → "**hat n**"

### **Vectors**
- `\vec{F}` → "**vector F**" or "**force vector**"
- `\vec{k}` → "**vector k**" or "**wave vector k**"
- `\mathbf{p}` → "**bold p**" (for four-vectors)

### **Greek Letters with Subscripts**
- `\omega_k` → "omega subscript k" or "omega k"
- `\epsilon_0` → "epsilon naught" or "epsilon zero"
- `\psi_i` → "psi subscript i" or "psi i"

### **Complex Subscripts**
- `_{\vec{k},\lambda}` → "subscript **vector k comma lambda**"
- `_{\text{int}}` → "subscript **text int**"
- `_{k\lambda}` → "subscript k lambda" (no comma)

### **Rates and Cross Sections**
- `\Gamma` → "**capital Gamma**"
- `\gamma` → "**lowercase gamma**"
- `\sigma` → "sigma"
- `W` → "**capital W**"

---

## Testing Your Improvements

After reloading the extension with the enhanced prompt:

1. **Reload extension** in `chrome://extensions/`
2. **Try Test 1 again** with explicit dictation:
   - "...matrix element **hat H subscript text int**..."
3. **Check if it now generates**: `\hat{H}_{\text{int}}`
4. **Try Test 2 again** with:
   - "...the rate is **capital Gamma** equals..."
   - "...epsilon subscript **vector k comma lambda**..."

---

## Expected Improvements

With the enhanced system prompt and explicit dictation:

**Before**:
- `H_{\mathrm{int}}` (missing hat)
- `\gamma` (wrong capitalization)
- `\vec{\epsilon}_{k\lambda}` (missing arrow and comma)

**After**:
- `\hat{H}_{\text{int}}` ✅
- `\Gamma` ✅
- `\vec{\epsilon}_{\vec{k},\lambda}` ✅

---

## When Context Isn't Enough

If the AI still doesn't match context perfectly:

1. **Add more examples** in the document (3-5 instances of the pattern)
2. **Be more explicit** in dictation ("hat", "vector", "subscript text")
3. **Check context extraction** (verify 700 chars before cursor includes the notation)
4. **Consider post-editing** for very complex notation (faster than re-dictating)

Remember: The goal is to get **80-90% accuracy** from dictation, then quick manual fixes for the rest. Perfect context matching is hard even for humans!
