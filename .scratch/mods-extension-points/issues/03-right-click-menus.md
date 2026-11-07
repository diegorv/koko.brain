# 03: Right click on note rows and folders, with `run.target`

**What to build:** the plan's EP-03, as changed by its section 12. `ctx.labs` already exists from Issue 02; this adds its `menu` placement.

```ts
ctx.labs.place(actionId, { menu: { on: ('note' | 'folder')[]; files?: 'markdown' | 'all' } }); // files defaults to 'markdown', note rows only
run.target?: { on: 'note' | 'folder'; path: string } // vault-relative; '' is the vault root; absent from rail and palette
```

Items are flat, among the built-ins, rendered with `inset`. Touch `rail-registry.store.svelte.ts` (one more `$state.raw` list, its getter and a line in `reset()`), `NoteRowMenu.svelte` (an `extraItems` prop, default empty, before the separator, filtered with `isMarkdownFile`), `RailNoteList.svelte` and `FilesNavigator.svelte`.

The vault root gives `''` through `target.isRoot`, because `getRelativePath` returns the root unchanged. No mod code runs at render. No `when`.

**Blocked by:** 02

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests first. With zero items the menus render today's labels, with no stray separator (`NoteRowMenu.test.ts`, `FilesNavigator.menu.test.ts` stay green).
- [ ] Real registry: a `.canvas` row hides a `markdown` item; the root gives `''`; a relative path reaches `run.target`.
- [ ] Host: an unknown id throws; one item after reload; none after unload.
- [ ] E2E: right-click a row, pick the item, assert the written note. Another covers `ctx.ui.prompt` opened from an item, for focus.
- [ ] `help/documentation/28-mods.md` documents `menu` and `run.target`.
