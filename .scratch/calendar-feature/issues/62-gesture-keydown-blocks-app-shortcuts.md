# 62: App shortcuts work while a Calendar pointer gesture is live

**What to build:** Cmd+S, Cmd+P, Cmd+W and the Cmd+Shift+C toggle keep working between pointerdown and pointerup on the Calendar time grid.

**Blocked by:** None

**Status:** ready-for-agent

- From the ticket 31 post-merge review (finding 1): `EventTimeGrid.svelte:124-125` calls `e.stopPropagation()` on every non-modifier key from a `window` capture listener (`:158`) while a gesture is live, which runs before `global-keybindings.ts:40` and `utils/keybindings.ts:32`. From pointerdown to pointerup on the grid (a plain click included) every app shortcut is dead.
- Fix as the review suggests: stop the key only in the view's own shortcut handler, behind a "gesture live" flag.

- [ ] A test that a document-level listener still sees Cmd+S mid-gesture (fails today)
- [ ] Escape still cancels the gesture; view shortcuts still do not fire mid-gesture
