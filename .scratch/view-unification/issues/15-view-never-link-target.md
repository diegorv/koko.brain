# 15: A view is never a link target

**What to build:** Two resolvers accept views.

- **Rust:** `note_name_from_target` strips any extension (`index.rs:86-92`), and `by_path` / `by_file_name` insert every entry, first path winning (`:415-416,509-513`). `remove_entry` can promote a view (`:1174-1182`). So with `Views/Projects.view` indexed, a later `Notes/Projects.md` gets no backlinks. A full rescan uses walk order and promotion uses HashMap order, so the winner can flip.
- **TypeScript:** `buildResolutionCache` and `resolveWikilink` take any path list (`wikilink-resolution.logic.ts:47,92`), and the editor passes the full tree (`editor-host.ts:70-71`).

These ship in one Issue. Apart, the click and the backlink panel disagree on `[[Projects]]`.

**Rust**
- Private `is_link_target(path)` (`!is_view_filename`) at `index.rs:415-416`, `509-513` and the `surviving` find at `1177`. Same-stem and `.View` cases follow from it.
- Filter views from mention candidates at `index.rs:908` and `982`.

**TypeScript**
- Export `isLinkTargetFile(path)`, false for `.view`, and apply it inside `buildResolutionCache` and `resolveWikilink`. Skip views inside their loops: `resolveWikilink` runs per pill per row (`NoteRow.svelte:103`), so do not `.filter` per call.
- All resolver callers inherit it: `NoteRow`, `PropertiesView`, `kanban.service`, `widgets.ts`, `completion.ts`, `lens.logic.ts:388-402`, `kb-api.ts:451`.
- Candidates: `treeLinkIndex` filters `files`, `listLinkCandidates` drops view entries so view aliases are not offered, and `KanbanWikilinkSuggestions.svelte:27` and `RelationshipSearch.svelte:22` apply the same filter.

**After this ships**
- A click on `[[Projects]]`, or a meta-bind `open` button with that link, where only a view has the name, creates `Projects.md`, like any unresolved link (owner decision). Issue 16 is the way to open a view.
- `[[Projects.view]]` creates `Projects.view.md`, or opens `Projects.md` if that exists (`index.rs:164-166`, `wikilink-resolution.logic.ts:122-125`).
- The gate at `path-change.service.ts:189` stays: no link can target a view, so renaming one has nothing to rewrite.

**Blocked by:** 14, 16

**Status:** resolved

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing tests first, in Rust:
  - Build order view then note: `resolve("Projects")` is the note, and the note holds the backlink.
  - Same through `update_entry`.
  - `remove_entry` of the note: no promotion, `resolve` is None.
  - `resolve("Projects.view")` is None with no note present.
  - `.View` follows the same rules.
  - With a view only, `lookup_outgoing_unlinked_mentions` is empty. `lookup_incoming_unlinked_mentions` with a real temp file holding `_sidebar_label: Projects` is empty.
- [x] Failing tests first, in TypeScript:
  - Pure tests in `wikilink-resolution.logic.test.ts`.
  - `editor-host.test.ts:92`, with a real tree in `fsStore`: `resolveLink` returns null with a view only and the note with both, and `listLinkCandidates` omits views and their aliases.
  - `followWikilink` with a view only calls `create_note` for `Projects.md` (Tauri mocked only).
  - A meta-bind `open` button behaves the same, tested through `followWikilinkInfo`.
- [x] `help/documentation/05-wikilinks.md` and `24-meta-bind.md` state the rule.

## Notes

- Blocked by 16 so buttons have a way to open a view before they lose this one.
- A `.collection` is an ordinary non-Markdown file for this Issue: no special case. It leaves the table world in Issue 23, by owner decision with no migration code.
- `kb.fileLink`, markdown-style links and `deep-link.service.ts` open-by-name were not read. Check them and report if any still reaches a view.
- **Size:** M.

## Comments

- 2026-11-05, branch `issue/15-view-never-link-target`: wikilink resolution (TS and Rust VaultIndex) never resolves a link to a view; docs 05-wikilinks and 24-meta-bind state the rule; review nits fixed in 3b477c320. Tests: full suite at 3b477c320 vitest 542 files / 12868 passed, pnpm build passed; cargo test exit 0. Reviews: round 1 APPROVED, round 2 APPROVED. Follow-up: QueryJS `file.inlinks` basename matching (round 1 finding 1, deferred).
