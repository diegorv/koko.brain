# 54: Vault open creates every missing placeholder template, including the parent folders periodic-note/ and quick-capture/

**What to build:** ensureTemplatesFolder (src/lib/plugins/templates/templates.service.ts:75-125) creates only the templates root through create_folder (:100-107). The loop at :111-121 then calls writeTextFile for paths like `_system/templates/periodic-note/Daily-Note.md`. plugin-fs writeTextFile opens the file and does not create parent folders (WriteFileOptions has no recursive option, node_modules/@tauri-apps/plugin-fs/dist-js/index.d.ts:770-781; other writers in the app mkdir first, deep-link-actions.ts:157, note-creator.service.ts:97-98). The first write throws, the single catch at :122-124 only logs, and the remaining templates are skipped too. Doc 09:176 promises the placeholders. Fix direction: create each missing file's parent folder (create_folder is recursive) before writing it, and let one failed placeholder not stop the others. The unit test at templates.service.test.ts:225-264 passes only because writeTextFile is mocked; add the folder expectations to it.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/templates/templates.service.test.ts: with exists resolving false for every path and writeTextFile rejecting only for `/vault/_system/templates/periodic-note/Daily-Note.md`, run ensureTemplatesFolder; every other default template path is still written. It fails today (the loop stops at the first rejection).
- [ ] With everything missing, `create_folder` is invoked for `/vault/_system/templates/periodic-note` and `/vault/_system/templates/quick-capture` before the first writeTextFile into each.
- [ ] Existing template files are never rewritten, and the file tree still gains the created paths (existing tests at :214-283 stay green).
- [ ] A failed placeholder is logged with its path.
- [ ] Frontend gate: `pnpm check` + `pnpm vitest run` pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. Only empty placeholder templates go missing, and only on a fresh vault.
- **Trigger:** Open a vault that has no `_system/templates/periodic-note/` or `_system/templates/quick-capture/` folder (a new vault, or one where only `_system/templates/` exists) with default settings.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/app/lifecycle/app-lifecycle.service.ts:386 calls ensureTemplatesFolder at vault open. src/lib/core/settings/settings.store.svelte.ts:12-49 default template paths under `_system/templates/periodic-note/` and `_system/templates/quick-capture/`. templates.service.ts:100-107 create_folder only for the root; :111-121 writeTextFile(absPath, '') with no parent mkdir; :122-124 one catch around the whole loop. node_modules/@tauri-apps/plugin-fs/dist-js/index.d.ts:770-781 (plugin-fs 2.7.1) WriteFileOptions: append, create, createNew, mode, baseDir. help/documentation/09-quick-notes-and-templates.md:176. Test mocks writeTextFile: src/tests/lib/plugins/templates/templates.service.test.ts:15-20, :225-264.
- **Second opinion:** upheld (ux, low). Confirmed. ensureTemplatesFolder (templates.service.ts:99-124) creates only the templates root via create_folder, then calls writeTextFile into `periodic-note/` and `quick-capture/` subfolders with no mkdir. plugin-fs 2.7.1 WriteFileOptions has no recursive option, and the single catch stops the loop at the first failure. The impact is missing empty placeholder files on a fresh vault only, so no content is lost. Corrections to apply while implementing: Category ux, not content: only empty placeholder templates are missing.
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-04` (from calendar-ux-3, calendar-spec-4). Size S.

## Comments
