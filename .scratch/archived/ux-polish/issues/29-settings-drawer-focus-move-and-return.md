# 29: Opening Settings moves focus into the drawer, and closing returns it

**What to build:** When Settings opens, keyboard focus lands on the active section's nav item, so Tab and Enter work in the panel at once; when it closes (Escape, the close button, Mod+Comma, the palette command), focus goes back to the element that had it before opening, for example the editor. Today focus stays wherever it was, usually the editor behind the drawer, so typing after Mod+Comma edits the note.

In `src/lib/app/SettingsPanel.svelte`: bind the dialog root; an `$effect` that reads `settingsPanelStore.isOpen` and does its work in `untrack()` (docs/PATTERNS.md): on open, store `document.activeElement` as the opener and, after `tick()`, focus the nav button with `aria-current="page"`; on close, focus the stored opener if it is still connected, then clear it. Switching sections while open does not move focus. Nothing changes in `settings-panel.store.svelte.ts`.

**Blocked by:** 28

**Status:** wontfix

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

- 2026-11-06: migrated to `.scratch/open-itens/issues/199-opening-settings-moves-focus-into-drawer-closing.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
