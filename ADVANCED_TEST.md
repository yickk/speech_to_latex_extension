# Advanced Context-Aware Test Scenario

## Complex Multi-Domain Physics Problem

This test demonstrates context awareness across multiple physics domains with custom notation, mixed capitalization, and domain-specific terminology.

---

## Test Setup: Quantum Electrodynamics Document

Create a new Overleaf document and paste the following content:

```latex
\documentclass{article}
\usepackage{amsmath}
\usepackage{physics}

\begin{document}

\section{Quantum Field Theory: Photon-Electron Interaction}

\subsection{Notation Conventions}

In this document, we adopt the following conventions:
\begin{itemize}
    \item Four-vectors are denoted with bold symbols: $\mathbf{p}$, $\mathbf{x}$
    \item Three-vectors use arrow notation: $\vec{E}$, $\vec{B}$, $\vec{k}$
    \item Operators use hat notation: $\hat{H}$, $\hat{a}^\dagger$, $\hat{n}$
    \item Spinors are represented by $\psi$, $\bar{\psi}$
    \item Metric signature: $(+,-,-,-)$
\end{itemize}

\subsection{The Dirac Equation}

The free Dirac equation for a spin-$\frac{1}{2}$ fermion is:
\begin{equation}
    (i\gamma^\mu \partial_\mu - m)\psi = 0
\end{equation}
where $\gamma^\mu$ are the Dirac gamma matrices satisfying $\{\gamma^\mu, \gamma^\nu\} = 2g^{\mu\nu}$.

The adjoint spinor is defined as $\bar{\psi} = \psi^\dagger \gamma^0$.

\subsection{Electromagnetic Field Quantization}

The vector potential in the Coulomb gauge ($\nabla \cdot \vec{A} = 0$) can be expanded as:
\begin{equation}
    \vec{A}(\vec{x}, t) = \sum_{\vec{k}, \lambda} \sqrt{\frac{\hbar}{2\omega_k \epsilon_0 V}} 
    \left[ \hat{a}_{\vec{k},\lambda} \vec{\epsilon}_{\vec{k},\lambda} e^{i(\vec{k} \cdot \vec{x} - \omega_k t)} 
    + \hat{a}^\dagger_{\vec{k},\lambda} \vec{\epsilon}^*_{\vec{k},\lambda} e^{-i(\vec{k} \cdot \vec{x} - \omega_k t)} \right]
\end{equation}

Here:
\begin{itemize}
    \item $\hat{a}_{\vec{k},\lambda}$ and $\hat{a}^\dagger_{\vec{k},\lambda}$ are photon annihilation and creation operators
    \item $\vec{\epsilon}_{\vec{k},\lambda}$ is the polarization vector for mode $(\vec{k}, \lambda)$
    \item $\omega_k = c|\vec{k}|$ is the photon frequency
    \item $V$ is the quantization volume
    \item $\lambda \in \{1, 2\}$ labels the two transverse polarizations
\end{itemize}

The electric and magnetic fields are:
\begin{align}
    \vec{E}(\vec{x}, t) &= -\frac{\partial \vec{A}}{\partial t} \\
    \vec{B}(\vec{x}, t) &= \nabla \times \vec{A}
\end{align}

\subsection{Interaction Hamiltonian}

The QED interaction Hamiltonian in the minimal coupling scheme is:
\begin{equation}
    \hat{H}_{\text{int}} = -e \int d^3x \, \bar{\psi}(\vec{x}) \gamma^\mu \psi(\vec{x}) A_\mu(\vec{x})
\end{equation}

For the non-relativistic limit, this reduces to:
\begin{equation}
    \hat{H}_{\text{int}} \approx -\frac{e}{m} \vec{p} \cdot \vec{A} + \frac{e^2}{2m} \vec{A}^2 - e\phi
\end{equation}

\subsection{Transition Rates and Cross Sections}

[CURSOR POSITION - INSERT NEW CONTENT HERE]

\end{document}
```

---

## Test Sequence

Position your cursor at `[CURSOR POSITION - INSERT NEW CONTENT HERE]` and perform the following dictations:

### **Dictation 1: Fermi's Golden Rule**

**Say**: 
> "The transition rate from initial state psi i to final state psi f is given by Fermi's golden rule: capital W equals two pi over h bar times the absolute value of the matrix element H int between psi f and psi i squared times the density of states rho of E f"

**Expected LaTeX** (should match document conventions):
```latex
The transition rate from initial state $\psi_i$ to final state $\psi_f$ is given by Fermi's golden rule:
\begin{equation}
    W = \frac{2\pi}{\hbar} |\langle \psi_f | \hat{H}_{\text{int}} | \psi_i \rangle|^2 \rho(E_f)
\end{equation}
```

**Context Awareness Checks**:
- ✅ Uses $\psi$ for spinors (from context)
- ✅ Uses $\hat{H}_{\text{int}}$ with hat notation and subscript "int" (from context)
- ✅ Uses $\hbar$ not $h$ (from context)
- ✅ Uses $W$ for transition rate (capital, as spoken)
- ✅ Uses $\rho$ for density of states
- ✅ Uses $E_f$ for final energy (subscript convention)

---

### **Dictation 2: Photon Emission Rate**

**Say**:
> "For spontaneous emission of a photon with wave vector k and polarization lambda, the rate is gamma equals e squared omega k over two epsilon naught h bar c cubed times the absolute value of the dipole matrix element psi f vector r psi i dot epsilon k lambda squared"

**Expected LaTeX**:
```latex
For spontaneous emission of a photon with wave vector $\vec{k}$ and polarization $\lambda$, the rate is:
\begin{equation}
    \Gamma = \frac{e^2 \omega_k}{2\epsilon_0 \hbar c^3} |\langle \psi_f | \vec{r} | \psi_i \rangle \cdot \vec{\epsilon}_{\vec{k},\lambda}|^2
\end{equation}
```

**Context Awareness Checks**:
- ✅ Uses $\vec{k}$ with arrow notation for wave vector (from context)
- ✅ Uses $\lambda$ for polarization (from context)
- ✅ Uses $\Gamma$ for decay rate (standard physics convention)
- ✅ Uses $\epsilon_0$ not "epsilon zero" (from context)
- ✅ Uses $\omega_k$ with subscript (from context)
- ✅ Uses $\vec{r}$ for position vector (arrow notation)
- ✅ Uses $\vec{\epsilon}_{\vec{k},\lambda}$ matching exact context format

---

### **Dictation 3: Scattering Cross Section**

**Say**:
> "The differential cross section for Compton scattering is d sigma over d omega equals r e squared over two times omega prime over omega k squared times the quantity omega k over omega prime plus omega prime over omega k minus sine squared theta"

**Expected LaTeX**:
```latex
The differential cross section for Compton scattering is:
\begin{equation}
    \frac{d\sigma}{d\Omega} = \frac{r_e^2}{2} \left(\frac{\omega'}{\omega_k}\right)^2 
    \left(\frac{\omega_k}{\omega'} + \frac{\omega'}{\omega_k} - \sin^2\theta\right)
\end{equation}
```

**Context Awareness Checks**:
- ✅ Uses $\omega_k$ for photon frequency (from context)
- ✅ Uses $\omega'$ for scattered photon (prime notation)
- ✅ Uses $\sigma$ for cross section
- ✅ Uses $\Omega$ for solid angle
- ✅ Uses $r_e$ for classical electron radius (subscript)
- ✅ Uses $\theta$ for scattering angle
- ✅ Uses $\sin^2$ not $\text{sin}^2$ (proper function)

---

### **Dictation 4: Creation/Annihilation Operators**

**Say**:
> "The photon number operator is n hat k lambda equals a dagger k lambda times a k lambda with commutation relation bracket a k lambda comma a dagger k prime lambda prime equals delta k k prime delta lambda lambda prime"

**Expected LaTeX**:
```latex
The photon number operator is:
\begin{equation}
    \hat{n}_{\vec{k},\lambda} = \hat{a}^\dagger_{\vec{k},\lambda} \hat{a}_{\vec{k},\lambda}
\end{equation}
with commutation relation:
\begin{equation}
    [\hat{a}_{\vec{k},\lambda}, \hat{a}^\dagger_{\vec{k}',\lambda'}] = \delta_{\vec{k}\vec{k}'} \delta_{\lambda\lambda'}
\end{equation}
```

**Context Awareness Checks**:
- ✅ Uses $\hat{n}_{\vec{k},\lambda}$ with hat notation (from context)
- ✅ Uses $\hat{a}^\dagger_{\vec{k},\lambda}$ exact format from context
- ✅ Uses $\vec{k}$ with arrow (from context)
- ✅ Uses square brackets for commutator
- ✅ Uses $\delta$ for Kronecker delta
- ✅ Uses prime notation for second set of quantum numbers

---

### **Dictation 5: Four-Vector Notation**

**Say**:
> "The four momentum is bold p mu equals E over c comma vector p and satisfies the mass shell condition bold p dot bold p equals m squared c squared"

**Expected LaTeX**:
```latex
The four-momentum is $\mathbf{p}^\mu = (E/c, \vec{p})$ and satisfies the mass-shell condition:
\begin{equation}
    \mathbf{p} \cdot \mathbf{p} = m^2 c^2
\end{equation}
```

**Context Awareness Checks**:
- ✅ Uses $\mathbf{p}$ bold for four-vector (from context)
- ✅ Uses $\vec{p}$ arrow for three-vector (from context)
- ✅ Uses $E$ for energy (capital)
- ✅ Uses $m$ for mass (lowercase)
- ✅ Uses $c$ for speed of light
- ✅ Distinguishes four-vector bold from three-vector arrow notation

---

## Advanced Validation Criteria

### **Notation Consistency** (Most Important)
- [ ] Four-vectors use **bold** ($\mathbf{p}$, $\mathbf{x}$)
- [ ] Three-vectors use **arrows** ($\vec{E}$, $\vec{B}$, $\vec{k}$)
- [ ] Operators use **hats** ($\hat{H}$, $\hat{a}^\dagger$, $\hat{n}$)
- [ ] Spinors use plain symbols ($\psi$, $\bar{\psi}$)

### **Capitalization Consistency**
- [ ] $W$ or $\Gamma$ for rates (capital)
- [ ] $\omega$ for frequency (lowercase)
- [ ] $E$ for energy (capital)
- [ ] $m$ for mass (lowercase)
- [ ] $\lambda$ for polarization (lowercase)

### **Subscript/Superscript Patterns**
- [ ] $\omega_k$ (subscript k)
- [ ] $\hat{a}^\dagger_{\vec{k},\lambda}$ (dagger superscript, k,λ subscript)
- [ ] $\psi_i$, $\psi_f$ (initial/final subscripts)
- [ ] $\gamma^\mu$ (superscript index)

### **Physics Constants**
- [ ] $\hbar$ (h-bar, not h)
- [ ] $\epsilon_0$ (epsilon-naught)
- [ ] $c$ (speed of light)
- [ ] $e$ (elementary charge)

### **Special Formatting**
- [ ] $\hat{H}_{\text{int}}$ (text subscript for "int")
- [ ] $\vec{\epsilon}_{\vec{k},\lambda}$ (complex subscript)
- [ ] $|\langle \psi_f | \hat{H} | \psi_i \rangle|^2$ (bra-ket notation)

---

## Debugging: What to Check if Tests Fail

### If notation is inconsistent:

1. **Check context extraction**:
   ```javascript
   // Add to content.js temporarily:
   console.log("Context before:", documentContext.before);
   console.log("Context after:", documentContext.after);
   ```

2. **Verify cursor position**: Make sure cursor is positioned after the notation conventions section

3. **Check context length**: Ensure at least 500+ characters before cursor

### If capitalization is wrong:

1. **Verify the document has clear examples** of each variable with consistent capitalization
2. **Check if Gemini is prioritizing speech over context** (expected behavior)
3. **Try being more explicit in dictation**: "capital W" vs "w"

### If subscripts/superscripts are wrong:

1. **Check if context has similar patterns** to learn from
2. **Verify Gemini is receiving the context** (check network tab in DevTools)
3. **Try dictating more explicitly**: "a dagger subscript k lambda"

---

## Success Metrics

**Excellent** (90%+ accuracy):
- All notation conventions matched
- All capitalizations correct
- All subscripts/superscripts in right places
- Physics constants formatted correctly

**Good** (70-89% accuracy):
- Most notation conventions matched
- Minor capitalization issues
- Subscripts mostly correct
- Constants mostly correct

**Needs Improvement** (<70% accuracy):
- Notation conventions not learned from context
- Random capitalization
- Missing or incorrect subscripts
- Constants not formatted per context

---

## Why This Test is Comprehensive

1. **Multiple notation systems**: Bold, arrows, hats, plain - tests if AI distinguishes them
2. **Capitalization complexity**: E vs e, W vs w, etc. - tests case sensitivity
3. **Complex subscripts**: $\hat{a}^\dagger_{\vec{k},\lambda}$ - tests nested formatting
4. **Domain-specific terms**: Fermi's golden rule, Compton scattering - tests terminology
5. **Mixed math modes**: Inline and display equations - tests mode detection
6. **Physics constants**: $\hbar$, $\epsilon_0$ - tests constant recognition
7. **Long-range dependencies**: References to earlier definitions - tests context window

This test exercises the full capability of context-aware transcription!
