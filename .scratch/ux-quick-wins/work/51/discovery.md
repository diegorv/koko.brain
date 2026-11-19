# Issue 51 discovery

No `spec.md` in `.scratch/ux-quick-wins/` (README only). Repeats Issue 32's warning pattern (`work/32`); only the Create note path warning changes.

## Files that change

- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`
  - `:344-351` `variableWarnings(template, into)`: add `into: 'path'` with "{x} is not a variable, so the path would contain {x}".
  - `:353` `createPathWarnings`: read `createPathText` (draft, else saved path) with `'path'`.
  - `:252` next to `pathRefused`: `pathDraft = $state<string | null>(null)`, the typed text not saved yet; `createPathText = $derived(pathDraft ?? rule.createNote?.path ?? '')`, as `renameText` (`:338`).
  - `:279-286` `commitCreatePath`: clear `pathDraft` unless the path was refused (a refused path stays in the field and in the draft).
  - `:618-625` path `Input`: `oninput` sets `pathDraft`, as Rename does (`:540`).
- `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` "template variables" (`:1375`):
  - `:1421-1430` existing create-path test asserts the folder wording: update to the path wording.
  - New: `Meetings/{yaer}.md` committed -> warning names the path, no "folder" text.
  - New: saved `a.md`, commit refused `{yaer}/x.txt` -> path not saved, warning for `{yaer}`; commit a valid path -> warning follows it.

## Prior-art tests

- Same describe: `renderStored`, `commit`, `type`, `warnings()`, `input()`; "errors tied to their fields" `:1457` for a refused path.

## Plan

1. Failing tests (wording + typed refused path), see them fail.
2. Component change, tests green; `pnpm check`.

## Risks

- Draft outlives an external reload of the rule while a refused text is shown; same as Rename's draft, accepted.

## Defaults taken

- Wording: "{yaer} is not a variable, so the path would contain {yaer}" for every unknown variable in the path (folder or file name part), from the Issue's example.
- The warning follows each keystroke (`oninput`), as Rename's does; the save still happens on change.
- Move to folder and Rename warnings untouched.
