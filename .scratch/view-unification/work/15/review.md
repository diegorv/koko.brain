VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first, in Rust: — `src-tauri/tests/vault_index_test.rs:2172-2265` covers each sub-bullet: build view-then-note (`build_view_before_note_resolves_the_note_and_credits_its_backlink`), the same through `update_entry` (also asserts `resolve` is None while only the view exists), `remove_entry` of the note with no promotion (`by_path().get("projects")` is None), `Projects.view` / `Views/Projects.view` resolve to None with no note, `.View` through build, remove and update, outgoing mentions empty with a view only, incoming mentions and `unlinked_mentions_candidates` empty with a real temp `Board.view` holding `_sidebar_label: Projects`. Each fails by inspection against main (the view takes `by_path["projects"]`, and the mention loops had no view filter). Fix at `src-tauri/src/vault/index.rs:95-101` (`is_link_target`), `:423`, `:521`, `:922`, `:999`, `:1192`. `cargo test --test vault_index_test`: 132 passed, 0 failed; `cargo test --lib vault::`: 372 passed.
- [met] Failing tests first, in TypeScript: — pure tests in `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts:180-231` (both resolvers, view only, view first, `Projects.view`, `.VIEW`, cache holds no view); `src/tests/lib/app/editor-host.test.ts:101-133` with a real tree in `fsStore` (`resolveLink` null with the view only, the note with both; `listLinkCandidates` omits view files and the view entry's alias); `src/tests/lib/app/meta-bind-open-view.test.ts:272-285` (`followWikilink` invokes `create_note` for `/vault/Projects.md`, only Tauri and the toast mocked, with the top-level `beforeEach` tree holding `Projects.view` and no `Projects.md`); `:246-253` a meta-bind `open` button `[[Projects]]` clicked through `MetaBindButtonWidget`, whose `open` case calls `followWikilinkInfo` (`meta-bind-button-widget.ts:103-112`), creates `/vault/Projects.md`. All pass (see Checks run).
- [met] `help/documentation/05-wikilinks.md` and `24-meta-bind.md` state the rule. — `05-wikilinks.md:144-146` ("Views are never link targets") and `24-meta-bind.md:151`; the anchors `#views-are-never-link-targets` and `#openview--open-a-view` match the headings (`24-meta-bind.md:164`).

## Findings

1. minor — `src/lib/plugins/queryjs/queryjs.logic.ts:46-84`: QueryJS `file.inlinks` (`buildReverseIndex` / `resolveInlinks`) still matches by basename, so `kb.page('<view path>').file.inlinks` lists every source of `[[Projects]]` even though the view is no link target. This is outside the Issue's enumerated call sites and the build report flags it; the basename matching is older than this Issue and also mis-credits same-stem notes. Fix: in a follow-up Issue, make `resolveInlinks` return `[]` for a path that fails `isLinkTargetFile` (or rebuild inlinks over `buildResolutionCache`). Not a blocker.
2. nit — `src-tauri/src/vault/index.rs:15`: `use crate::utils::fs::is_view_filename;` sits between two `crate::vault::` imports. Move it above them so the `use` block stays sorted (rustfmt would reorder it; CI does not run `cargo fmt --check`).
3. nit — `src/lib/core/filesystem/wikilink-resolution.logic.ts:16,38`: `isLinkTargetFile` allocates a lowercased copy of every path on each uncached `resolveWikilink` loop iteration (per pill per row in `NoteRow.svelte:103`), and `isExactFile` lowercases an already-lowercase path again. A case-insensitive compare of the last five characters avoids the allocation. Cost is small next to the existing `getNoteName` substring, so optional.

## Checks run (by this review)

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run` on the changed and added test files plus the architecture tests and link-updater: `wikilink-resolution.logic.test.ts`, `app/editor-host.test.ts`, `app/meta-bind-open-view.test.ts`, `features/properties/RelationshipSearch.test.ts`, `plugins/kanban/KanbanWikilinkSuggestions.test.ts`, `core/filesystem/link-updater.logic.test.ts`, `src/tests/lib/architecture/`: exit 0, 14 files, 222 tests passed.
- Resolver callers that inherit the change: `features/properties/PropertiesView.test.ts`, `features/rail-shell/lens.logic.test.ts`, `plugins/graph-view/graph-view.logic.test.ts`, `plugins/kanban/kanban.service.test.ts`, `plugins/queryjs/kb-api.test.ts`, `plugins/queryjs/kb-api.view-page.test.ts`, `core/markdown-editor/extensions/wikilink/`, `features/note-list/`: exit 0, 13 files, 526 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_index_test`: 132 passed, 2 ignored. `--lib vault::`: 372 passed.
- Full suite and `pnpm build` not run: deliver runs them.

## Other checks

- Spec decisions: the owner decision (a view-only `[[Projects]]` creates `Projects.md`; `[[Projects.view]]` creates `Projects.view.md` or opens `Projects.md`) is what the code and tests do. The `path-change.service.ts:189` gate is untouched.
- `openView` (`src/lib/app/editor-host.ts:148-162`) now looks the path up with `findNodeByPath` instead of the link-target index, which no longer holds views. Same acceptance set as before (any file node in the tree, folders refused); the Issue 16 tests in `meta-bind-open-view.test.ts` pass.
- Rust `resolves_to` fallback (`index.rs:839-842`) cannot credit a view: a view's `target_lower` keeps `.view`, while `note_name_from_target` strips the extension from the link target.
- Notes check: deep-link `open` takes an explicit `file`/`path` (`deep-link.logic.ts:69-78`), and `kb.fileLink(path)` builds a link from an explicit path (`kb-api.ts:209-213`). Neither resolves a name, so neither reaches a view through a link.
- No layer-baseline entry, `BASELINE_SIZE` change or composition root added. No ts-rs binding change. Worktree clean before this review file.

## Resolution

1. Not fixed here, deferred: the review itself scopes it to a follow-up Issue (QueryJS `file.inlinks` basename matching predates this Issue and sits outside its enumerated call sites). The main session should file it.
2. Fixed: `use crate::utils::fs::is_view_filename;` moved above the `crate::vault::` imports in `src-tauri/src/vault/index.rs`.
3. Fixed: `isLinkTargetFile` tests a case-insensitive `/\.view$/i` regex instead of lowercasing the path, so neither it nor `isExactFile` allocates a lowercased copy.
