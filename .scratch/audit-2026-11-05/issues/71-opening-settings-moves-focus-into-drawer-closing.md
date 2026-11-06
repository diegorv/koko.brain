# 71: Opening Settings moves focus into the drawer, and closing returns it

**Migrated from:** `.scratch/ux-polish/issues/29-settings-drawer-focus-move-and-return.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Still present. It is keyboard focus fine-tuning, and its blocker 28 is delivered.

**Audit check at `5f8003d67`:** still_present (ux, medium). src/lib/app/SettingsPanel.svelte (read whole file): the dialog root has no bind:this, no $effect on settingsPanelStore.isOpen, no focus call and no opener save; the only keyboard code is the window Escape handler in handleKeydown. A grep for 'focus' in SettingsPanel.svelte and settings-panel.store.svelte.ts matches only the nav button focus-visible classes. So Mod+Comma leaves focus in the editor behind the drawer, and after clicking inside Settings and closing it, focus is on body, not on the editor, so the owner must click the editor before typing.

**Stale in the text below:** Blocked-by 28 is delivered (c1c126972). SettingsPanel line numbers in the Issue are generic and still fine; the Escape handler is now at handleKeydown near line 103. Not verified by running the app.

**What to build:** When Settings opens, keyboard focus lands on the active section's nav item, so Tab and Enter work in the panel at once; when it closes (Escape, the close button, Mod+Comma, the palette command), focus goes back to the element that had it before opening, for example the editor. Today focus stays wherever it was, usually the editor behind the drawer, so typing after Mod+Comma edits the note.

In `src/lib/app/SettingsPanel.svelte`: bind the dialog root; an `$effect` that reads `settingsPanelStore.isOpen` and does its work in `untrack()` (docs/PATTERNS.md): on open, store `document.activeElement` as the opener and, after `tick()`, focus the nav button with `aria-current="page"`; on close, focus the stored opener if it is still connected, then clear it. Switching sections while open does not move focus. Nothing changes in `settings-panel.store.svelte.ts`.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [ ] Failing first, `src/tests/lib/app/SettingsPanel.test.ts`: with an outside button focused, `settingsPanelStore.open('editor')` then `flushSync()` and a tick leaves `document.activeElement` on the Editor nav button; `settingsPanelStore.close()` returns focus to the outside button
- [ ] Same file: when the opener was removed from the DOM while the panel was open, closing does not throw and does not focus anything detached
- [ ] Same file: `settingsPanelStore.setSection('rail')` while open leaves focus where it was
- [ ] E2E in `settings.spec.ts`: Mod+Comma, the focused element is inside `[role="dialog"][aria-label="Settings"]`; Escape closes the panel and the focused element is no longer inside it
- [ ] The "Escape closes the panel" case and `global-keybindings.test.ts` (the `/` guard inside `role="dialog"`) stay green

## Notes

- Source: review section 3 Settings row "Drawer chrome" (no focus move); review section 2 drawer recommendation ("focus move and return"); `.scratch/ux-polish/work/settings.md` P2.
- The drawer stays a non-modal `role="dialog"` here; `aria-modal` comes only with the scrim ticket, because claiming modality while the app behind stays clickable would be wrong.
- Not verified: whether the window Escape handler (about line 104) also fires when a bits-ui Select or Popover inside the panel is open; out of scope.
- Size: S.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/29-settings-drawer-focus-move-and-return.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
