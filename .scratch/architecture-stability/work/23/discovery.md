# Issue 23 discovery

No `spec.md` for architecture-stability. Move pattern from `work/20` (git mv, rewrite importers, no shims); port pattern from `work/21` (`registerAppPorts()` in `app/boot.ts`).

Precondition holds: `TypeSidebar.svelte` and `TypeNoteList.svelte` are gone from `src/`.

## Files that change

- `features/type-definitions/type-definitions.service.ts:13-18,287-301`: `toggleFavoriteForPath` -> `features/properties/lifecycle.service.ts`; importers `note-list/NoteRowMenu.svelte:22`; tests move from `type-definitions.service.test.ts:625-713,1072` to `lifecycle.service.test.ts`; mocks in `NoteRowMenu.test.ts:37`, `RailNoteList.test.ts:60,93`, `RailNoteList.view.test.ts:71` retarget.
- `git mv` `features/properties/{properties.logic,properties.types,yaml-quoting.logic,frontmatter-write.service}.ts` -> `core/frontmatter/`, and their tests -> `src/tests/lib/core/frontmatter/` (`frontmatter-parity.test.ts` stays, imports rewritten). About 26 source + 12+ test importers (list from grep). `raw-write-ratchet.test.ts:19` exemption path. Path refs in ADR 0029 / 0032.
- `features/file-icons/icon-resolver.ts:3,51,62`: a `TypeIconLookup` slot (`setTypeIconLookup`) with `typeOf(path)` and `definitionPathOf(typeName)`; `app/boot.ts` fills it from `typeDefinitionsStore` (and clears it in `unregisterAppPorts`).
- Baselines: `layer-baseline.json` loses the 5 `live-preview -> properties` lines (31 -> 26); `featureCycleEdges` loses each pair as it leaves the cycle, per commit.

## Conflict found, and the default taken

The five steps alone do not meet "no SCC containing properties, type-definitions or file-icons". Simulated on the import graph: after them the SCC `{backlinks, collection, event-calendar, type-definitions}` remains (`type-definitions -> collection` via yaml-parser / filter.logic, `collection -> type-definitions` via `collection.logic.ts:17` `normalizeTypeCasing`, `collection -> backlinks` via `collection.logic.ts:16` `parseWikilinks`, `backlinks -> event-calendar`, `event-calendar -> type-definitions`). The criteria do not contradict each other, so this is not a refusal: the smallest extra cut is two pure one-function moves, which the simulation shows leaves no feature cycle at all:
- `normalizeTypeCasing` -> `core/frontmatter/properties.logic.ts` (it normalizes the `_type` frontmatter value; users: collection.logic, note-action-bar.logic, type-definitions.logic).
- `parseWikilinks` -> `core/filesystem/wikilink-resolution.logic.ts` (issue 20's home for the rest of the wikilink logic; users: collection.logic, tests fixture `vault-entries.fixture.ts`, `backlinks.logic.test.ts`).
- Found while building: step 2 adds `note-list -> properties`, which closes `properties -> tags -> search -> rail-shell -> note-list -> properties`. The cut: `tags/tag-colors.logic.ts` (pure, 44 lines, only `PropertyField.svelte:13` reaches it from outside tags) -> `utils/tag-colors.ts`, committed before step 2.
Result: `featureCycleEdges` 23 -> 0 (no feature cycle left). Order: core/utils < file-icons, collection < type-definitions < properties < {quick-switcher, note-list} < rail-shell < app.

## Plan (one commit each)

1. Tests first, green on current code: `NoteRowMenu.favorite.test.ts` (real `updateNoteFrontmatter`, Tauri fs mocked: writes `_favorite: true`; lossy frontmatter -> `toast.error`); icon-resolver: type icon follows `typeDefinitionsStore.setEntries` changes.
2. Favorite toggle move (+ drops `type-definitions -> properties` from `featureCycleEdges`).
3. Frontmatter engine move (+ layer baseline, cycle edges that leave).
4. Icon lookup slot + boot wiring; test: lookup unset -> frontmatter icon or `undefined`, no throw.
5. `normalizeTypeCasing` + `parseWikilinks` moves (+ remaining cycle edges).

## Risks

- `featureCycleEdges` stale checks fail per commit if a pair leaves and is not deleted in the same commit: run `feature-cycle.test.ts` before each commit.
- Icon slot: reactivity must hold, so the lookup reads the store at call time (closures, no snapshot).
- E2E specs (properties-cross-note, rail-shell, sidebars) are left to deliver's gate.
