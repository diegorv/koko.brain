# 05: The collection editor's toolbar writes only its key

**What to build:** `persistState` (`CollectionView.svelte:253-260`) is the same full-state overwrite as the rail toolbar: every Sort click rewrites `filters`, `viewFilters`, `viewSort` and `viewOrder` from local state. Unknown filter keys drop and `and: [x]` flattens. A clean tab can also build on stale `yamlContent`, because it reloads only after the Rust debounce plus 300 ms (`app-lifecycle.service.ts:491-498`). The unification makes this editor the main surface for tables, and no other Issue covers it.

`updateCollectionYaml` already accepts single keys. Have each handler name its key, reusing the per-key check from Issue 04 where the shape allows. The write goes through `rewriteViewFile` semantics where the file is a `.view`, and must not lose a keystroke in a dirty buffer.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, through the mounted component with real stores: change a Sort on a view whose filter is `and: [x]` with an unknown key. The filter stays as written.
- [ ] A newer value of the same key on disk is refused, as in Issue 04.
- [ ] The tab strip's view add, rename and delete keep working, and each writes only what it changes.

## Notes

- Read how `CollectionView` holds `yamlContent` and its self-write detection (`:163-175`) before choosing where the base lives.
- Issue 24 separately removes the no-op rewrite on tab rename (`:373`).
- **Size:** M.
