# 29: The template picker names the template and what Enter will do

**Origin:** design review 2026-11-17, proposal P81, prototype `.scratch/design-review/prototypes/settings-auto-organize.html` (section `P81`), research `.scratch/ux-quick-wins/research/verdict-settings-b.md` and `breakdown.md` (old ticket 37). Absorbs open-itens 059 (`.scratch/open-itens/issues/059-new-file-from-template-says-name-taken.md`): the opposite design (059 refuses a taken name, this ticket announces that Enter opens the existing note), so do not run both; 059 stays open until the owner decides between the two designs.

**What to build:**

1. **Template chip.** In the naming step, a chip shows the chosen template's name (from `templatesStore.templates`, by `selectedTemplatePath`). Today the step shows only the name input (`src/lib/plugins/templates/TemplatePicker.svelte:72-90`).
2. **Honest hint.** The line under the input reads "Creates Standup.md in the vault root" for a plain name. When the typed name has a `/`, it shows the typed folder part ("Creates Projects/Standup.md in the vault"), because the service creates parent folders (`src/lib/core/note-creator/note-creator.service.ts:98-99`). It appends `.md` exactly as `createFileFromTemplate` does (`templates.service.ts:55-69`). The empty-name text ("Type a name for the new file") stays.
3. **Existing note.** When a file with that vault-relative path already exists, the hint reads "Enter opens the existing note". The match is case-insensitive: `exists()` is case-insensitive on APFS and `findFileNode` (`src/lib/core/filesystem/fs.logic.ts:25-39`) is an exact case-sensitive match, so `standup` against `Standup.md` would claim "Creates standup.md" and Enter would then open `Standup.md`. A new pure function in `templates.logic.ts` walks `fsStore.fileTree` by path segment with a case-insensitive compare (it imports only the `FileTreeNode` type, as `fs.logic.ts:6` does). An empty or unloaded tree never reports an existing note. Enter still calls `createFileFromTemplate` once with the typed name; the service is unchanged and still opens the existing file without writing (`note-creator.service.ts:87-88`).
4. **Back step.** Backspace on an empty name returns to the template list with the dialog open and creates nothing.
5. **Doc.** `help/documentation/09-quick-notes-and-templates.md:183-184` (steps 4 and 5) and `:190` (vault root) mention the chip, the Enter hint and Backspace.

Not in this ticket: refusing a taken name or any change to `createFileFromTemplate` (that is 059); choosing a destination folder (the root is by design, the review's validation says so); files inside dot folders (`scan_vault` skips them, so they never show as existing).

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, `src/tests/lib/plugins/templates/TemplatePicker.test.ts`: after selecting "Daily" and typing "Standup", the dialog shows "Daily" and "Creates Standup.md in the vault root".
- [x] With `/vault/Standup.md` in the real `fsStore` tree and `vaultStore.path` `/vault`, typing "standup" shows "Enter opens the existing note"; Enter still calls `createFileFromTemplate` once with the typed name. A name with a `/` (`Projects/Standup`) shows the folder form.
- [x] Backspace on the empty name input shows the template list again, keeps the dialog open and creates nothing (`createFileFromTemplate` not called).
- [x] An empty tree never shows "opens the existing note"; the existing create, trim, close and empty-Enter tests (`:66-95`) pass unchanged.
- [x] `src/tests/lib/plugins/templates/templates.logic.test.ts`: the existence function matches case-insensitively at the root and in a folder, ignores directories with the same name, adds `.md` the way the service does, and returns false for an empty tree and for a path outside the tree.
- [x] Tests use the real `templatesStore`, `fsStore` and `vaultStore`; only `templates.service` stays mocked, as in the file's header comment.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P81.** The template picker hides the chosen template and silently opens existing files. The naming step does not name the template, an existing name opens that note without a word, and there is no back step. Show a "Creates <name>.md in the vault root" line and a template chip; change the hint to "Enter opens the existing note" when the name exists; Backspace on an empty name goes back. Validation: revise, the root destination is by design.
- **open-itens 059.** New File from Template says the name is taken instead of silently opening the existing note. Opposite design (refuse); stays open until the owner decides.

## Problem

Typing a name that already exists in the vault root does not create anything: Enter opens the older note and the person may type into it believing it is new. The step never says which template was chosen, and a wrong pick means closing the dialog and starting over.

## Evidence

Checked at `085b23c5d`.

- `TemplatePicker.svelte:72-90`: the naming step (input and hint), the hint reads "Press Enter to create <name>.md" whatever exists (`:85-86`); `:33-46` `confirmCreate`; `:48-55` the Enter handler; `selectedTemplatePath` and `fileName` at `:10-11`.
- `templates.service.ts:55-69`: the path is `${vaultPath}/${fullFileName}`, so the destination is the vault root plus whatever the name holds.
- `note-creator.service.ts:87-88` (`exists(filePath)` then open) and `:98-99` (`create_folder` for the parent directory).
- `fs.logic.ts:25-39`: `findFileNode` is exact and case-sensitive.
- `src/tests/lib/plugins/templates/TemplatePicker.test.ts:19-95` and `templates.logic.test.ts` hold the current cases.

## Sequence with

No live Issue edits these files. Shell-sidebars-ux 08 builds a new picker on the same Command primitives, as a pattern only; it edits none of this. Open-itens 059 is superseded, not sequenced.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown; open-itens 059 is the opposite design and stays unrun.
- 2026-11-18, delivered from branch issue/29-template-picker-names-template-enter-will: the picker shows the chosen template, the target file and whether Enter opens an existing note (case-insensitive check in templates.logic.ts); Backspace on the empty name goes back to the list. Review round 1 APPROVED with findings, fixed in a fix round (held Backspace ignored, NFC-folded name match; the `../` escape moved to Issue 48); round 2 APPROVED. Tests: `pnpm check` exit 0; full suite at a31b75d6b exit 0, 656 files, 17482 passed, 56 skipped.
