# 05: An action takes text input and writes a note (`ctx.vault`)

**What to build:** the end of the walking skeleton. An action can ask for one line of input (PRD P8) and read, list, create and overwrite vault files, then open the note it wrote.

```js
ctx.addAction({
	id: 'idea', title: 'New idea note', input: { placeholder: 'Describe the idea' },
	run: async (input) => {
		const path = await ctx.vault.create('Ideas/Idea.md', `# Idea\n\n${input}`);
		await ctx.workspace.openNote(path);
	},
});
```

- **Input step.** An action with `input` makes the picker show a second step with one text field (the two-step shape of `src/lib/plugins/templates/TemplatePicker.svelte`). Enter runs `run(input)`, Escape cancels without running. Without `input`, `run` gets `''`.
- **Paths.** All `ctx.vault` paths are vault-relative; one pure function in `mods.logic.ts` validates them and the host converts to absolute (Indexing rule 9). Rule: split on `/`; reject an empty path, a leading `/`, and any empty, `.` or `..` segment, with `Invalid vault path "<path>"`. Hygiene, not security. (QueryJS's `resolveScriptPath`, `plugins/queryjs/kb-api.ts:526-538`, differs: it treats a leading `/` as vault-root and rejects any `..` substring.)
- **`ctx.vault`:**
  - `read(path)` resolves to the text. `exists(path)` to a boolean. `list(folder)` to `{ name, path, isFolder }[]` for the folder's direct children (no recursion), `path` vault-relative, dot entries left out; `list('')` lists the vault root. plugin-fs, try/catch, errors propagate to the mod.
  - `create(path, content)`: creates a new file at exactly that path, or rejects with `"<path>" already exists; use write` (no renaming). Follow `openOrCreateNote` (`src/lib/core/note-creator/note-creator.service.ts:97-121`): `call('create_folder', { path: parentDir })` (recursive, a no-op if it exists, `src-tauri/src/commands/vault.rs:1012-1022`; Rust `create_note` refuses a missing parent, `vault.rs:972-974`), `call('create_note', ...)`, `markRecentSave`, `applyNoteChange({ kind: 'upsert', source: 'create', path, content, vaultPath })` with `vaultPath` for Markdown files so FTS5 gets it at once, and `addToTree(path)`, which also adds missing parent folders. Do not use `createFile` (it renames on collision and reports its failures to Sentry through `error('FS', ...)`) or `createFolder` (`fs.service.ts:227`, which would turn an existing `Ideas` into `Ideas 1`). Resolves to the vault-relative path.
  - `write(path, content)`: overwrites an existing file. A missing file rejects with `"<path>" does not exist; use create` (`writeTextFile(..., { create: false })`, as `src/lib/core/frontmatter/frontmatter-write.service.ts:153` does). A file open in a tab with unsaved edits rejects with `"<path>" has unsaved changes in an open tab`: overwriting would lose the user's edits, and the tab's next save would overwrite the mod's output. Otherwise: `writeTextFile`, `syncExternalContentToEditor(path, content, true, 'none')` (`src/lib/core/editor/editor.service.ts:71`), then `notifyAfterSave(path, content)` (`src/lib/core/editor/editor.hooks.ts:67`), which marks the self-save, runs `applyNoteChange`, fires the content-invalidation signal and runs the after-save observers (search, file history). Do not copy `link-updater.service.ts:50-72`: it calls `applyNoteChange` without `vaultPath`, which skips FTS5, and with the self-save marked the watcher's incremental pass skips the file too, so the write would never reach search.
- **`ctx.workspace.openNote(path)`**: `openFileInEditor` (`editor.service.ts:99`) with the absolute path.
- Every call checks the vault-switch guard from Issue 02, so a run started in vault A cannot write into vault B.
- Add the members to `contract/mod-api.v1.ts` and its freeze test.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests first:
  - Pure path validation: relative, nested, empty, leading `/`, `.` and `..` segments, double slash.
  - `ctx.vault` with real stores and mocked plugin-fs and Tauri core: `create` puts the note in `fsStore.fileTree` (real store state) and returns the vault-relative path; `create` into a missing folder creates the folder first (the mocked `create_note` rejects when `create_folder` was not called for its parent, as the Rust command does); `create` on an existing path rejects and writes nothing; `write` to a missing file rejects; `write` to a clean open tab updates the tab's content and reaches an after-save observer registered through the real hooks API with the path and content; `write` to a dirty tab rejects and leaves both the file and the tab untouched; `list` returns direct children without dot entries; a call after a vault switch throws.
  - Picker: an action with `input` shows the field; Enter runs with the text; Escape runs nothing.
  - E2E: click the rail button, pick "New idea note", type text, press Enter, and assert the opened note's rendered content.

## Notes

- Docs come in Issue 07.
- 03, 05, 04 and 06 all edit `mods-host.service.ts`, so they run in that order (05 before 04 brings the first real value, writing a note, one Issue earlier).
- The E2E cannot catch the missing-folder case: the mock `create_note` creates parents (`e2e/mocks/virtual-fs.ts:150-151`) and the mock `readDir` returns `[]` for a missing folder (`virtual-fs.ts:50-65`). The unit test above covers it.
- No write deny-list (D1 R5 proposed refusing `.kokobrain/**`, `.git/**`, `.claude/**`): out by the owner's full-trust decision. Recorded so a later sharing story can add it.
- **Size:** M.

## Comments
