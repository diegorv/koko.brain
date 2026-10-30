# Issue 02 discovery: E2E for cross-note property writes

## Files that change
- `e2e/specs/properties-cross-note.spec.ts` (new). No source change; `e2e/fixtures/test-vault.ts` stays as is: the spec seeds its two notes with `window.__e2e.fs.populate` + a `vault-files-changed` event, the pattern in `e2e/specs/editor-state-persistence.spec.ts:28-40`.

## Code under test (read, not changed)
- `src/lib/features/properties/PropertiesView.svelte:99-115` - the re-parse `$effect` (immediate on a path change via `syncPropertiesFromActiveTab`, 300 ms debounce otherwise).
- `src/lib/features/properties/properties.service.ts:44-90` - `propertiesMatchActiveNote` guard in `commitChanges`.
- `src/lib/features/properties/PropertyField.svelte:100-125` - key input carries `data-property-key`; the text value `Input` commits on `input`.
- Meta-bind select: `.cm-lp-meta-bind-select` (`e2e/specs/live-preview/meta-bind.spec.ts`).

## Plan
Notes: A `19-meta-bind.md` (`status: todo`, `prioridade: media`, body with `INPUT[inlineSelect(todo, doing, done):status]`), B `10-tables.md` (no frontmatter), mirroring the owner's case. Open A, B, then back to A.
- Timing: the "within 300 ms" window is made deterministic with the Playwright clock (`test.use({ clockTime })`, fixture option in `e2e/fixtures/test-vault.ts`), `page.clock.pauseAt` before the A edit, and `page.clock.runFor(2000)` after the B action (past the 300 ms parse debounce and the 500 ms frontmatter auto-save). With real timers a slow run would leave the window and the spec would pass on buggy code.
- Panel action on B: "Add property" (`foo`). It exists on both buggy and fixed code (a remove-row action needs A's rows, which the fixed panel must not show).
- S1: fill A's `prioridade` value in the panel, click B's tab, add `foo`. S2: same, but A changes through the meta-bind select. S3: panel edit in A, click B, run past the debounce, assert the panel shows no property rows.
- Assertions: B's editor doc (read from the active CodeMirror view), B's saved file via `window.__e2e.fs.readFile`, and the panel's `[data-property-key]` inputs.
- Proof: revert `src/lib/features/properties/` to `a50c4699^` locally (not committed), run with `--retries=0`, record which scenarios fail and the messages in the Issue comments, restore, run again.

## Prior art
`e2e/specs/editor-state-persistence.spec.ts` (seeding), `e2e/specs/event-calendar.spec.ts` (`clockTime`, `fs.readFile`), `e2e/specs/live-preview/meta-bind.spec.ts` (select).

## Risks
- Reading the editor doc uses CodeMirror's DOM back-reference (`.cm-content` -> `cmTile.root.view`), the same lookup `EditorView.findFromDOM` does; a CodeMirror upgrade could rename it. Isolated in one helper.
- A paused clock also pauses `requestAnimationFrame`; CodeMirror's measure pass waits for `runFor`. If an action needs it, run the clock briefly between steps.
