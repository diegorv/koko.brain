# 03: Right click on note rows and folders, with `run.target`

**What to build:** the plan's EP-03, as changed by its section 12. `ctx.labs` already exists from Issue 02; this adds its `menu` placement.

```ts
ctx.labs.place(actionId, { menu: { on: ('note' | 'folder')[]; files?: 'markdown' | 'all' } }); // files defaults to 'markdown', note rows only
run.target?: { on: 'note' | 'folder'; path: string } // vault-relative; '' is the vault root; absent from rail and palette
```

Items are flat, among the built-ins, rendered with `inset`. Touch `rail-registry.store.svelte.ts` (one more `$state.raw` list, its getter and a line in `reset()`), `NoteRowMenu.svelte` (an `extraItems` prop, default empty, before the separator, filtered with `isMarkdownFile`), `RailNoteList.svelte` and `FilesNavigator.svelte`.

The vault root gives `''` through `target.isRoot`, because `getRelativePath` returns the root unchanged. No mod code runs at render. No `when`.

**Blocked by:** 02

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [x] Failing tests first. With zero items the menus render today's labels, with no stray separator (`NoteRowMenu.test.ts`, `FilesNavigator.menu.test.ts` stay green).
- [x] Real registry: a `.canvas` row hides a `markdown` item; the root gives `''`; a relative path reaches `run.target`.
- [x] Host: an unknown id throws; one item after reload; none after unload.
- [x] E2E: right-click a row, pick the item, assert the written note. Another covers `ctx.ui.prompt` opened from an item, for focus.
- [x] `help/documentation/28-mods.md` documents `menu` and `run.target`.

## Comments

- 2026-11-07, `issue/03-right-click-menus`: Added note/folder menu placements, vault-relative `run.target`, registry cleanup, documentation, and real-store/E2E coverage. A delivery fix round extracted the shared menu types into a leaf utils contract, retained rail-shell type aliases, and added an import-graph regression test to remove the note-list/rail-shell dependency cycle without baseline exemptions. Review round 1: APPROVED; review round 2: APPROVED, confirming the fix. Initial full suite: 575 files passed, 1 failed; 13,911 tests passed, 4 failed, 54 skipped, 1 todo (exit 1; `../test-logs/mods-extension-points/03-deliver.log`). Regression test failed before the fix. Fix checks: `pnpm check` passed on 226 files with zero errors/warnings (`../test-logs/mods-extension-points/03-fix-check.log`); targeted checks passed 21 files and 774 tests (`../test-logs/mods-extension-points/03-fix-targeted.log`). Final full suite: 576 files and 13,916 tests passed, zero failures, 54 skipped, 1 todo (exit 0; `../test-logs/mods-extension-points/03-deliver-2.log`). Round 1 also passed all 14 Chromium E2E tests. Ship-only delivery reused these results without rerunning checks. Production build and native Tauri/WKWebView behavior were not verified.
