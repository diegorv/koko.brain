VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first: — every listed case has a test in this branch, and each passes on my run: path validation in `src/tests/lib/plugins/mods/mods.logic.test.ts` (relative, nested, empty, leading `/`, `.`, `..`, double slash, trailing slash, non-string); `ctx.vault` in the new `src/tests/lib/plugins/mods/mod-vault.service.test.ts` with real `fsStore`, `editorStore`, `vaultStore` and the real hooks API, mocking only plugin-fs, `@tauri-apps/api/core`, the toast and `debug` (create lands in `fsStore.fileTree` and resolves to the vault-relative path; the mocked `create_note` rejects a missing parent, and the test asserts `create_folder` comes before `create_note`; create on an existing path rejects with no IPC and an empty tree; write to a missing file rejects; write to a clean tab updates `content`/`savedContent` and an after-save observer gets the path and content; write to a dirty tab rejects with no `writeTextFile` call and leaves the tab alone; list returns direct children with no dot entries, and `list('')` lists the root; calls after a vault switch and after unload throw); picker tests in `ModActionPicker.test.ts` (field with placeholder, Enter runs with the text, Escape runs nothing); `ctx.app`/`ctx.kb` in `mods-host.service.test.ts` (identity of `editorStore`, `openFileInEditor`, `openNoteAt`, `vaultStore`; `activeTab` shows a tab the test opened; `kb()` builds pages from the mocked `get_all_vault_entries_v2` IPC, with `file.tags` holding `#project`; `ctx.app` and `ctx.kb` throw `Mod "alpha" is unloaded` after `stopModsHost()` and after a vault change). I cannot confirm from the diff that each test failed before its code; the build report says so, except for mod-picker.store.test.
- [met] `layer-rules.test.ts` reports no new violation. — `src/tests/lib/architecture/` passes (part of the 20-file run below). The mods->queryjs edge goes through a `PLUGIN_ALLOWLIST` entry (`scripts/import-graph.mjs:51`), backed by the Issue's recorded owner decision, with the allowlist test row added. `layer-baseline.json` and `BASELINE_SIZE` are unchanged, and no composition root was added.

## Findings

1. minor, `src/lib/plugins/mods/mod-vault.service.ts:116-119`: `ctx.workspace.openNote` on a path that does not exist resolves. `openFileInEditor` catches the `readTextFile` failure, shows the generic "Failed to open file." toast and calls `error('EDITOR', ...)`, which reports to Sentry. A mod cannot tell that the open failed, and an error caused by a mod reaches Sentry, which is the opposite of what PRD P9 wants. The Issue prescribes `openFileInEditor`, so this is not a blocker. Fix (optional, a follow-up is fine): check `exists(abs)` first and reject with `"<path>" does not exist`, or record in Issue 07's docs that `openNote` does not reject.
2. nit, `src/lib/plugins/mods/ModActionPicker.svelte:24-26`: Enter runs the action even while IME composition is active (`e.isComposing`), so pressing Enter to confirm a composed character submits text that is not finished. `TemplatePicker.svelte:49` has the same gap. Fix: `if (e.key !== 'Enter' || e.isComposing || !action) return;`.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/plugins/mods/ src/tests/lib/architecture/`: exit 0, 20 files, 256 tests. My test verdict rests on these files: `mods.logic.test.ts`, `mod-vault.service.test.ts`, `mods-host.service.test.ts`, `ModActionPicker.test.ts`, `mod-picker.store.test.ts`, `mod-api-contract.test.ts`, plus `layer-rules.test.ts` and `import-graph.test.ts`, which check the allowlist and ADR change.
- `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: exit 0, 7 passed. The new test picks "New idea note", fills the field and presses Enter. It then asserts the rendered `.cm-content` text and the file bytes on disk.
- Not run: the full vitest suite and `pnpm build` (deliver's job). The build is the step that would catch a circular import or a bundle problem from `mod-app.service.ts` importing `plugins/queryjs`.

## Verified against the code

- `create` follows `openOrCreateNote` (`note-creator.service.ts:97-121`): `create_folder` on the parent, then `create_note`, `markRecentSave`, `applyNoteChange` with source `'create'` and `vaultPath` for Markdown only, then `addToTree`. It uses neither `createFile` nor `createFolder`.
- `write` uses `writeTextFile(..., { create: false })`, then `syncExternalContentToEditor(abs, content, true, 'none')` and `notifyAfterSave`. Indexing rule 6 holds: the single `applyNoteChange` owner runs, and search is updated through the after-save observers. It does not copy the `link-updater` pattern.
- The vault-switch guard runs before every call and again after each await that comes before a store update. Paths are made absolute only in the host (Indexing rule 9). The KBAPI is built the same way as in `queryjs-block-widget.ts:244-254` (Indexing rule 12).
- `app` and `kb` are getters on `ctx`, typed through `ModContext extends ModContextV1` in the host and kept out of `contract/mod-api.v1.ts`. Their doc comments mark them unstable and say that cleanup is the mod's job.
- No scope creep. The ADR-0003 row and the allowlist entry carry out the owner decision written in the Issue. The extra checks on string content and on the shape of `input` are boundary checks on untyped mod JavaScript.

## Resolution

1. Fixed. `ctx.workspace.openNote` checks `exists` first and rejects with `"<path>" does not exist`, so a missing note never reaches `openFileInEditor`'s toast and Sentry report; the guard runs again after the await. The contract doc says it rejects. Test: `mod-vault.service.test.ts` "openNote rejects a missing note and opens no tab" (failed before the fix).
2. Fixed in `ModActionPicker.svelte`: Enter with `e.isComposing` returns early. Test: `ModActionPicker.test.ts` "Enter during IME composition runs nothing and keeps the field open" (failed before the fix). `TemplatePicker.svelte:49` is outside this Issue and left as is.
