# 01: The Properties panel never writes one note's properties into another note

**What to build:** A Properties panel commit only ever writes the properties of the note they were parsed from, into that same note. Today `commitChanges` (`src/lib/features/properties/properties.service.ts:37-50`) builds the new content from `propertiesStore.properties` plus `extractBody(editorStore.activeTab.content)` and writes it into the active tab via `syncExternalContentToEditor(activePath, ...)`. `propertiesStore` holds one note's properties and is refreshed by a 300 ms debounced `$effect` in `PropertiesView.svelte` (~L99-110), so after a tab switch a commit combines note A's full property set with note B's body; the 500 ms frontmatter auto-save then writes it to disk. Two windows, both reproduced:
1. Within 300 ms of a tab switch, any panel commit (`updateProperty`, `removePropertyByKey`, rename, relationship add/remove) writes the previous note's properties into the new note.
2. A panel edit sets `skipNextParse = true` (`properties.service.ts:43`); if the tab changes within 300 ms, the re-armed timer consumes the flag while the new note is active, so the new note is never parsed and the panel keeps showing the previous note's properties until the new note's content changes. Any panel action in that state, even a no-op such as removing a missing key, writes them in.

Fix both: record the path the properties were parsed from and refuse (or re-parse from the active tab before) a commit when the active path differs; clear `skipNextParse` when the active path changes; the panel must never display another note's properties.

**Context:** Owner-observed 2026-10-29: `help/examples/markdown-editor-vault/10-tables.md` (no frontmatter) gained `status: doing` / `prioridade: media`, the intermediate frontmatter of `19-meta-bind.md`, with its body intact (`.scratch/suspected-bugs/notes-2026-10-30.md`, item 1). Reproduced 2026-10-30 by a read-only investigation; the meta-bind widgets were ruled out (they write a single key from the current doc). Silent data corruption: priority.

**Reproduction:** `.scratch/properties-cross-note/repro/repro-cross-note-frontmatter.test.ts` (real editor and properties stores/services, fake timers, Tauri fs/core mocked; the `PropertiesView` `$effect` is inlined as a helper because the repo has no component-testing library). Move it under `src/tests/` as the failing test first, then fix.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/properties/properties.service.ts` (modify; `commitChanges`, `skipNextParse`)
- `src/lib/features/properties/properties.store.svelte.ts` (modify; source path of the parsed properties)
- `src/lib/features/properties/PropertiesView.svelte` (modify; reset on active-path change)
- `src/tests/lib/features/properties/` (tests)

**Gate:** frontend (classifier picks `pnpm check` + `pnpm vitest run` + `pnpm build`)

- [ ] Both repro scenarios are tests that fail first and pass after the fix
- [ ] A commit for note A while note B is active never changes B's content or file
- [ ] After a tab switch the panel shows the new note's properties even when a panel edit happened within 300 ms before the switch
- [ ] Remove the item from `.scratch/suspected-bugs/notes-2026-10-30.md` (delete the file if it becomes empty) and `.scratch/properties-cross-note/repro/` in the closing commit

## Comments

- 2026-10-30 07:20 — discovery — store records sourcePath; path-scoped skip flag; commit guard (refuse + re-parse) in properties and lifecycle services; view parses immediately on path change — b5a0eec1
- 2026-10-30 07:23 — implement — store sourcePath + commit guard (refuse, re-parse active note) in properties and lifecycle services, path-scoped skip flag, view parses on path change; properties tests 460/460, app-lifecycle 68/68, pnpm check 0 errors; repro + suspected-bugs cleanup left for the closing commit — 0e3619a6
- 2026-10-30 07:27 — review — APPROVED; all data ACs met (fail-first verified against main sources); 2 Low (stale skip flag on the immediate-parse branch, that branch untested), 3 Info — 1e7a62cb
