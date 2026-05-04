# Single-Key Retry/Undo Testing Guide
 
## Quick Test Checklist
 
### Basic Functionality
- [ ] **Insert LaTeX** → See toast "✓ Inserted • R=retry U=undo (10s)" for 10 seconds
- [ ] **Press R within 10s** → Insertion undone, see "Undone. Press Alt+S to record again."
- [ ] **Press U within 10s** → Insertion undone, see "Undone."
- [ ] **Press Enter within 10s** → See "Accepted.", correction window dismissed
 
### Timing Tests
- [ ] **Wait 10+ seconds after insertion** → Press R → Nothing happens (window expired)
- [ ] **Wait 10+ seconds after insertion** → Press U → Nothing happens (window expired)
- [ ] **Multiple insertions quickly** → Each gets its own 10s window (timer resets)
 
### Edge Cases
- [ ] **Start new recording during correction window** → Window auto-dismisses
- [ ] **Type "r" in editor during correction window** → Should NOT trigger retry (only bare R key)
- [ ] **Press Cmd+R during correction window** → Browser refreshes normally (modifier ignored)
- [ ] **Press Alt+R during correction window** → No retry triggered (modifier ignored)
- [ ] **Type normally during correction window** → Only R/U/Enter intercepted, other keys work
 
### Accessibility Tests
- [ ] **Single-key shortcuts work without modifiers** → Just R, U, Enter (no Cmd/Ctrl/Alt needed)
- [ ] **Toast stays visible for full 10 seconds** → User has time to read it
- [ ] **Undo works reliably** → Uses browser's native undo (Cmd+Z equivalent)
 
## Test Scenarios
 
### Scenario 1: Correct on First Try
1. Press Alt+S to start recording
2. Say "force equals mass times acceleration"
3. Press Alt+S to stop
4. See LaTeX inserted: `$\vec{F} = m\vec{a}$`
5. See toast: "✓ Inserted • R=retry U=undo (10s)"
6. Press Enter to accept
7. ✅ Toast shows "Accepted." and window closes
 
### Scenario 2: Retry After Wrong Insertion
1. Press Alt+S to start recording
2. Say something (e.g., "alpha plus beta")
3. Press Alt+S to stop
4. See LaTeX inserted (e.g., `$\alpha + \beta$`)
5. Realize it's wrong
6. Press R within 10 seconds
7. ✅ Insertion undone, toast shows "Undone. Press Alt+S to record again."
8. Press Alt+S to re-record
9. Say the correct phrase
10. ✅ New LaTeX inserted with fresh 10s correction window
 
### Scenario 3: Simple Undo
1. Insert LaTeX via dictation
2. Decide you don't want it
3. Press U within 10 seconds
4. ✅ Insertion undone, toast shows "Undone."
 
### Scenario 4: Expired Correction Window
1. Insert LaTeX via dictation
2. Wait 11+ seconds
3. Press R or U
4. ✅ Nothing happens (shortcuts inactive)
5. Can still use Cmd+Z to undo manually
 
### Scenario 5: Multiple Insertions
1. Insert LaTeX #1
2. Within 10s, press Alt+S and insert LaTeX #2
3. ✅ Correction window for #1 auto-dismissed
4. ✅ New correction window active for #2
5. Press U
6. ✅ Only LaTeX #2 undone (not #1)
 
## Known Limitations
 
1. **Undo only works once** - Pressing U undoes the last insertion. To undo multiple insertions, use Cmd+Z.
2. **No visual timer** - User doesn't see countdown of remaining time (just knows it's 10s).
3. **Retry = Undo** - R doesn't re-send audio, just undoes. User must re-record.
4. **No transcript shown** - Toast doesn't show what Gemini heard (by design for brevity).
 
## Troubleshooting
 
**Q: Pressing R doesn't undo**
- Check if 10 seconds have passed (window expired)
- Check if you're holding a modifier key (Cmd/Ctrl/Alt/Shift)
- Check browser console for errors
 
**Q: Toast disappears too quickly**
- Should last 10 seconds - check if JavaScript errors are clearing it early
- Check browser console
 
**Q: Shortcuts interfere with typing**
- Should only intercept bare R/U/Enter keys during 10s window
- If typing "r" triggers retry, there's a bug - report it
 
**Q: Undo doesn't work**
- Overleaf's undo stack might be in unexpected state
- Try manual Cmd+Z to verify undo works at all
- Check if editor element is focused