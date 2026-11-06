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
- **`ctx.vault`** (all paths vault-relative; one host function converts to absolute, Indexing rule 9). Reject `..` segments and a leading `/` with a clear error, as `plugins/queryjs/kb-api.ts:526-538` does (hygiene, not security).
  - `read(path)`, `list(folder)`, `exists(path)`: plugin-fs, try/catch, errors propagate to the mod.
  - `create(path, content)`: through `createFile` (`src/lib/core/filesystem/fs.service.ts:198`), which writes through Rust, marks the self-save and calls `applyNoteChange` (Indexing rule 6). `createFile` starts with `readDir(parentPath)`, which throws for a missing folder, and Rust `create_note` refuses a missing parent (`src-tauri/src/commands/vault.rs:972-974`). So when the parent is missing, the host first calls the `create_folder` command (recursive, a no-op if it exists, `vault.rs:1012-1022`) and adds the folder to the tree, then calls `createFile`. Do not use `createFolder` (`fs.service.ts:225`): it picks a unique name, so an existing `Ideas` would become `Ideas 1`. `create` resolves to the **vault-relative** path actually written (`createFile` dedupes names and returns an absolute path).
  - `write(path, content)` (overwrite an existing file): `writeTextFile`, then `syncExternalContentToEditor(path, content, true, 'none')` (`src/lib/core/editor/editor.service.ts:71`), then `notifyAfterSave(path, content)` (`src/lib/core/editor/editor.hooks.ts:67`). `notifyAfterSave` marks the self-save, runs `applyNoteChange`, fires the content-invalidation signal and runs the after-save observers (search, file history). Do not copy `link-updater.service.ts:50-72` as is: it calls `applyNoteChange` without `vaultPath`, which skips FTS5, and if you also mark the self-save the watcher's incremental pass skips the file, so a mod's write would never reach search. **If the file is open in a tab with unsaved edits, refuse** with `"<path>" has unsaved changes in an open tab`: overwriting would lose the user's edits, and the tab's next save would overwrite the mod's output.
  - Validate paths before calling `createFile`: its own failures go through `error('FS', ...)`, which reports to Sentry. A failure inside it after validation is a host failure and may reach Sentry; that is accepted.
- **`ctx.workspace.openNote(path)`**: `openFileInEditor` (`editor.service.ts:99`).
- Every call checks the vault-switch guard from Issue 02, so a run started in vault A cannot write into vault B.
- Add the members to `contract/mod-api.v1.ts` and its freeze test.

**Blocked by:** 04

04, 05 and 06 all edit `mods-host.service.ts`, the picker and the contract, so they run in order.

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - Pure path normalization: relative, nested, `..`, leading `/`, empty.
  - `ctx.vault` with real stores and mocked plugin-fs and Tauri core: `create` indexes the note (assert the real index store, not a call count) and returns the deduped vault-relative path; `create` into a missing folder, with the plugin-fs `readDir` mock **rejecting** for it, creates the folder first and succeeds; `write` to a clean open tab updates the tab's content and reaches an after-save observer registered through the real hooks API with the path and content; `write` to a dirty tab refuses and leaves both the file and the tab untouched; a call after a vault switch throws.
  - Picker: an action with `input` shows the field; Enter runs with the text; Escape runs nothing.
  - E2E: click the rail button, pick "New idea note", type text, press Enter, and assert the opened note's rendered content.
- [ ] Docs come in Issue 07.

## Notes

- The E2E cannot catch the missing-folder case: the mock `create_note` creates parents (`e2e/mocks/virtual-fs.ts:150-151`) and the mock `readDir` returns `[]` for a missing folder (`virtual-fs.ts:50-65`). The unit test above is what covers it.
- No write deny-list (D1 R5 proposed refusing `.kokobrain/**`, `.git/**`, `.claude/**`): out by the owner's full-trust decision. Recorded so a later sharing story can add it.
- **Size:** M.

## Comments
