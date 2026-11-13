# Refute: Issue 002, keyboard edits next to the hidden frontmatter

Checked at HEAD `318b6e9b5` (2026-11-12). Read-only. The dossier was written at `afc0a9df8`; the two commits since (`1198d8e7b`, `318b6e9b5`) touch status colors and the ledger, not the editor.

## Verdict

- **Bug still present: yes.** Verified in code:
  - `src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:14-20`: per-line `hiddenLineDeco` plus `Decoration.replace({})` over `line.from..line.to`. No line break covered, no atomic range.
  - `plugins/frontmatter-field.ts:23` hides lines openIdx..closeIdx; `:88-110` (`frontmatterClick`) is a `mouseSelectionStyle` only; `:86` says "Keyboard moves (ArrowUp into the frontmatter) are not changed."
  - `rg "atomicRanges|transactionFilter|changeFilter|filterTransaction" src e2e` returns nothing.
  - `parsers/frontmatter.ts:10,20-31`: line 0 and a later line must match `/^---\s*$/`.
  - `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` asserts ArrowUp lands on the first hidden line (`:61-62`).
  - `@codemirror/commands` 6.11.1 (`node_modules/.pnpm/@codemirror+commands@6.11.1/.../dist/index.js`): `cursorDocStart` dispatches `userEvent: "select"` (`:581`, via `setSel`), `selectAll` dispatches anchor 0 with `"select"` (`:1085`), `moveLine` dispatches `"move.line"` (`:1425-1430`), bindings `Mod-Home`/`Cmd-ArrowUp` (`:1751,1759`), `Alt-ArrowUp` moveLineUp (`:1799`), `Mod-a` selectAll (`:1763`). All installed through `defaultKeymap` at `src/lib/core/markdown-editor/setup/editor-extensions.ts:159`.
- **Impact: medium, upheld.** Daily core editing on notes with properties and meta-bind. The damage needs a movement key then an edit key (or a held Backspace), it is visible at once (the raw YAML appears) and Cmd+Z restores it, so it is wrong data that autosave writes, not silent loss. Inference: weekly-ish for this owner, not daily.
- **Complexity: S to M. Risk: medium, not low.** The guard runs on every user transaction in every note, and the Issue's fix direction has three gaps that a literal implementation would ship (below): `move.*` edits are not guarded, "dropped or narrowed" is left open and the dossier's choice (drop) breaks search replace-all, and the Cmd+A behavior is unstated.
- **Agent-ready: no, run after edits.** A fresh agent would guess on drop vs narrow and on Cmd+A, and the Notes contradict the body about the e2e.

## Must-fix edits to the Issue text

### M1. Guard `move.*` edits too (Alt+ArrowUp breaks the fence today)

Evidence: `moveLine` (`@codemirror/commands` dist `:1403-1430`) skips only `block.from == 0`; on the first body line it deletes `nextLine.from..block.from` (the closing fence line and its break) and reinserts it below, with `userEvent: "move.line"`. `Alt-ArrowUp` is bound (`:1799`). Result: `---\nstatus: todo\nFirst body line.\n---\n...`, so the YAML block swallows the body line. `transposeChars` (`Ctrl-t` on macOS via `emacsStyleKeymap`, `:1707`) at a line start swaps the preceding break (`"move.character"`, `:1382`), and drag-drop moves are `"move.drop"` (`@codemirror/view` 6.43.15 dist `:5155`). The Issue lists only `input.*` and `delete.*`.

Replace in "Fix direction" item (2) the words "A user `input.*` or `delete.*` change" with:

> A change in a transaction whose userEvent is `input`, `delete` or `move` (`tr.isUserEvent(...)`, which also matches their subtypes such as `move.line` from Alt+ArrowUp)

### M2. Pin "dropped or narrowed": narrow with a change-filter range, drop only a pure insert at 0

Evidence: `filterTransaction` (`@codemirror/state` 6.7.6 dist `:2430-2455`): a `changeFilter` returning `false` drops every change in the transaction and maps the selection back. `@codemirror/search` 6.7.2 `replaceAll` dispatches all matches in one transaction (`userEvent: "input.replace.all"`, dist `:975`); with `false`, a replace-all whose query also matches in the frontmatter replaces nothing in the body either (inference from the code path, not run). `ChangeSet.filter` (`state` dist `:892-922`) with ranges `[0, bodyStart]` suppresses changes inside the range, keeps an insert at `bodyStart` (Enter at the body start works), but also keeps a pure insert at position 0 (`pos == next && iter.len == 0` branch), which a programmatic caret at 0 can still reach: a right-click in the top padding moves the caret there with no userEvent (`MarkdownEditor.svelte:308`) and menu Paste then dispatches `input.paste` at 0 (`MarkdownEditor.svelte:360-364`).

Replace the rest of item (2), from "is dropped or narrowed to the body." to the end of that sentence, with:

> is narrowed to the body: an `EditorState.changeFilter` returns `[0, bodyStart]` so changes inside the hidden lines and the line break after the closing fence are suppressed and the rest apply (a search replace-all still replaces the body matches). A changeFilter range lets a pure insertion at position 0 through (`ChangeSet.filter`), so a transaction that inserts at 0 returns `false` instead. An insertion at exactly `bodyStart` passes. Undo and redo (`undo`/`redo` userEvents) pass unchanged.

### M3. State the Cmd+A behavior (owner-visible change)

Evidence: `selectAll` puts the anchor at 0 with userEvent `select` (`commands` dist `:1085`), also from the editor menu (`MarkdownEditor.svelte:373-377`). Item (1) as written clamps it, so Cmd+A selects the body only and Cmd+A, Cmd+C stops copying the properties. Exempting it instead is worse: Cmd+A then typing replaces `0..length`, and `ChangeSet.filter` drops an insert attached to a deletion that starts in a suppressed range, so the first typed character is lost (verified in `state` dist `:910-918`).

Add to the end of item (1):

> This includes Cmd+A and the menu Select All: in live preview they select the body only, so copy and cut leave out the hidden frontmatter (source mode is unchanged). Owner-visible; say it in the commit message.

If the owner wants Cmd+A to keep copying properties, that is a separate design and this Issue should go to needs-info. Recommended: confirm in one line with the owner before launch, or accept the default above.

### M4. Remove the Notes contradiction about the e2e

Evidence: the body says to change `frontmatter.spec.ts:53-65`; Notes "Priority" says "The e2e at frontmatter.spec.ts:53-65 pins only where the cursor lands, not edits, so it stays valid." After the fix the cursor no longer lands on a hidden line, so `:61-62` fail.

Replace that sentence with:

> The e2e at frontmatter.spec.ts:53-65 pins today's cursor landing (Issue 03 Notes), so this Issue changes it.

### M5. Acceptance criteria that cover the gaps

Add to the acceptance list (same jsdom file, each fails today unless marked):

> - [ ] Same file: `moveLineUp(view)` with the cursor on 'First body line.' leaves the doc unchanged (fails today: the closing fence moves below the body line).
> - [ ] Same file: a dispatch `{ changes: { from: 0, insert: 'x' }, userEvent: 'input.paste' }` leaves the doc unchanged (fails today).
> - [ ] Same file: one dispatch with `userEvent: 'input.replace.all'` that replaces 'todo' in the frontmatter and a 'todo' in the body changes only the body occurrence; assert the full doc (fails today: both change). It also fails under a `false`-returning filter (nothing changes), which is the point of the test.
> - [ ] Same file: `selectAll(view)` gives a selection from the first body line to the doc end (fails today: anchor 0).
> - [ ] Same file: `undo(view)` after a no-userEvent frontmatter write restores the old frontmatter (regression guard, passes today).

## Should-fix edits

- **S1. Strengthen criterion 1 and 2 to full-doc equality.** "starts with `---\nstatus: todo\n---\n`" passes for an implementation that inserts the newline anywhere after the fence. Use `expect(view.state.doc.toString()).toBe('---\nstatus: todo\n---\n\nFirst body line.\n\nEnd line.')` and `toBe(DOC)` for the Backspace case.
- **S2. ArrowUp and Cmd+Up are e2e only.** `cursorLineUp` and `cursorPageUp` need layout; jsdom has none (`frontmatter-field-click.test.ts:8-10` stubs coordinates for this reason). Say: jsdom covers `cursorDocStart` and `selectDocStart`; the e2e covers ArrowUp and `ControlOrMeta+Home` (`Mod-Home` is bound on every platform, `commands` dist `:1759`; `Cmd-ArrowUp` is mac-only, `:1751`). The e2e helper already uses `ControlOrMeta` (`e2e/specs/live-preview/click-reveal/wikilink.spec.ts:57`).
- **S3. Multi-range clamp.** `selectSelectionMatches` (`"select.search.matches"`, search dist `:894,916`) can put one range inside the frontmatter. Clamping it to a cursor at `bodyStart` would make the next keystroke type there. Specify: ranges that end at or before `bodyStart` are removed; ranges that straddle it have the start clamped; if none remains, one cursor at `bodyStart`.
- **S4. Leave `select.pointer` to `frontmatterClick`.** Clamping pointer selections too would move a drag head onto a first-body-line block widget and reveal its source, which `frontmatterClick` avoids on purpose (`frontmatter-field.ts:82-85,93`). Either exclude `select.pointer` or say why it is harmless; `frontmatter-field-click.test.ts` must pass unchanged.
- **S5. Name the edge the guard skips.** With no line after the closing fence, `bodyStart` is null (`frontmatter-field.ts:62-65`) and the guard stays off, matching `frontmatter-field-click.test.ts:150-155`. A frontmatter-only note opens with the caret at the end of the closing fence (`editor.logic.ts:110-123` returns `content.length`), so typing there still appends to `---`. Out of scope; record it in Notes so the agent does not widen the fix.
- **S6. Update the stale comment** at `frontmatter-field.ts:86` and add the guard to `BLOCK_EXTENSIONS.frontmatter` at `live-preview.ts:47` (kill-switch and source mode then remove it, `live-preview.ts:90-92,109-111`).
- **S7. Name the existing suites to run.** `invariants-harness.test.ts` mounts `19-meta-bind.md`, which starts with frontmatter, and dispatches `input.type`/`delete` at line starts and `select`/`select.pointer` ranges (`invariants-harness.test.ts:316,335-337,347-358`); after the guard, those inside the frontmatter become no-ops or clamp. It is expected to stay green (inference), but it is the test most likely to move. Also run `frontmatter-field.test.ts`, `frontmatter-field-click.test.ts`, `meta-bind-writers.test.ts`, `undo-history-across-notes.test.ts`.
- **S8. Series group.** `priority-2026-11-08.md:60` puts 002 in the `properties.logic.ts` / `properties.service.ts` group. 002 touches neither; its files are `frontmatter-field.ts`, `live-preview.ts`, the new test and `frontmatter.spec.ts`. Move it out of that group.
- **S9. Size.** Change "Size M" to "Size S to M" and add one line on risk: a bug in the filter drops user typing in every note with properties.

## Dossier errors

- **Recommends `changeFilter` returning `false`** (dossier section 4 step 3) without noticing `input.replace.all`: a replace-all that matches in the frontmatter would then replace nothing in the body. Its own library note on `ChangeSet.filter` is correct (verified at `state` dist `:892-922`) but the conclusion is wrong; narrow with ranges plus a `false` for a pure insert at 0 (M2).
- **Selection clamp maps every range with `max(pos, start)`** (section 4 step 3): collapses in-frontmatter search matches into a stray cursor at the body start (S3), and applies to `select.pointer` (S4).
- **Does not flag the Cmd+A behavior change.** It lists "select-all" as a test to add (section 4, "Missing in the Issue") as if keeping the frontmatter were the only reading; copying the whole note changes too (M3).
- **Says `move` belongs in the filter but does not flag that the Issue omits it.** It lists drag-drop `move.*` as missing but not `move.line` (Alt+ArrowUp), the likeliest `move` trigger (M1).
- **"Do not return `[tr, {selection}]`"** is overstated: `resolveTransactionInner` reads `changes`, `selection`, `effects`, `annotations`, `scrollIntoView` and a `Transaction` exposes all of them, so it works by duck typing (inference from source; the dossier marks it as inference too). Harmless.
- **HEAD cited as `afc0a9df8`**; HEAD is `318b6e9b5`. No editor change between them.
- Correct and verified: the code facts in section 1, the programmatic writers carry no userEvent (`widgets.ts:885-896`, `MarkdownEditor.svelte:189-194`), the userEvent dispatcher list, the size estimate, the S-size file list.

## Not verified

- Nothing was run. The replace-all and ArrowUp outcomes come from reading `@codemirror/state` 6.7.6, `@codemirror/commands` 6.11.1, `@codemirror/search` 6.7.2 and the e2e, not from executing them.
- Whether the invariants harness stays green after the guard is inference.
