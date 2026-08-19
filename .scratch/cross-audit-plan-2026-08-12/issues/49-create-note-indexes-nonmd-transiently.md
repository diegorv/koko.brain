# Issue 49: create_note indexes non-md files that the next full rescan silently drops

Status: ready-for-agent
Phase: unplanned
Source: issue 06 adversarial review (2026-08-17) — pre-existing, not introduced by the createFile content fix

## What

`create_note` (`src-tauri/src/commands/vault.rs:885-911`) runs `update_note_in_index_inner` for
whatever path it is given, so creating a `.canvas` / `.kanban` / `.collection` file inserts a
`VaultIndex` entry for it. But full rescans collect only `.md` / `.markdown` / `.view`
(`is_markdown_filename`, `src-tauri/src/utils/fs.rs:114-117`), so those entries exist only until the
next full rebuild drops them. The index is inconsistent depending on whether the last touch was a
create/save or a rescan.

Consequence today is benign: the default canvas/kanban/collection bodies are index-inert (no
frontmatter delimiters, no wikilinks/tags/tasks that parse), so nothing user-visible flickers. But a
kanban board whose cards contain `[[wikilinks]]` would contribute backlinks right after a save and
lose them after the next full rescan — silent, timing-dependent data in query results.

## How

- Decide the invariant first: either the `VaultIndex` covers md+view only, or it covers everything
  `create_note`/`update_note_in_index` touch. Then make both sides agree:
  - Option A (likely lazy fix): make `create_note` / `update_note_in_index` skip index insertion for
    paths failing `is_markdown_filename`, matching the scan. One guard in
    `update_note_in_index_inner` covers every caller.
  - Option B: include the extra extensions in the scan walk — only if non-md content is actually
    meant to participate in backlinks/tags/tasks (product decision).
- Regression test FIRST (red): index a `.kanban` file via the create/update path, run a full scan,
  assert the entry set is identical before and after.

## Gate

- Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 — fixed (Option A), red-green verified

**Decision: Option A.** The `VaultIndex` covers `.md` / `.markdown` / `.view` only, i.e. exactly what
`collect_markdown_paths_with_metadata` walks. One guard at the top of `update_note_in_index_inner`
(`src-tauri/src/commands/vault.rs:248-274`) returns `UpdateResult { changed: false, affected: [],
version: idx.version() }` for any path failing `vault_fs::is_markdown_filename`. Option B (widening
the scan walk) is rejected: it would push JSON canvas blobs through the frontmatter parser and put
kanban cards in the Tasks panel permanently, which is a product change nobody asked for.

The guard sits in the shared inner fn, not in `create_note` and `update_note_in_index` separately, as
the issue's own parenthetical prescribes. All four insertion paths funnel through it
(`create_note` :902-ish, `update_note_in_index`, `propagate_type_rename_inner`,
`toggle_task_status_inner`), so one edit closes every one of them; two guards would have left the
latter two open and duplicated the predicate.

`is_markdown_filename` is reused rather than a hand-written `.md`/`.markdown` check. That is
load-bearing: `.view` files ARE index members (`src-tauri/src/utils/fs.rs:114-117`) and are created
through the same `createFile -> create_note` path from
`src/lib/features/type-definitions/type-definitions.service.ts`. A hand-rolled predicate would have
silently deleted the whole `.view` surface from the index.

**Red-green.** New tests in `src-tauri/tests/vault_file_ops_test.rs`. Against unfixed code:

```
---- create_note_index_set_matches_full_rescan_for_non_markdown stdout ----
assertion `left == right` failed: the save/create index set must equal the full-rescan set
  left: {".../board.kanban", ".../note.md"}
 right: {".../note.md"}
---- kanban_card_wikilink_does_not_produce_a_transient_backlink stdout ----
a non-markdown file must not contribute backlinks, got Some({".../board.kanban"})
test result: FAILED. 20 passed; 2 failed
```

After the guard: `test result: ok. 22 passed; 0 failed`. Full crate suite green, 0 failures across
every test binary. `pnpm check` (0 errors), `pnpm vitest run` (284 files / 6331 tests passed) and
`pnpm build` also run green even though no frontend file changed.

The probe compares the incremental set against the ACTUAL rescan output rather than a hardcoded
expectation, so it pins the two sides to each other. The tempdir is canonicalized once up front:
`collect_v2_entries` canonicalizes the root, and on macOS an uncanonicalized `/var/folders/...`
fixture would have produced a total set mismatch (red for the wrong reason, and still red after the
fix). Both files are written to disk so the scan genuinely encounters `board.kanban` and chooses to
skip it, rather than vacuously never seeing it.

**Discovery correction — the report's "benign today" line is wrong.** `serializeKanbanBoard`
(`src/lib/plugins/kanban/kanban.logic.ts:118-145`) emits every card as literal `- [ ] card text`, so
`NoteEntry::from_content_full` already parses real kanban cards into `tasks`. Real boards were
therefore already leaking into `get_all_tasks_v2` / the Tasks panel, and any card containing
`[[link]]` already contributed a backlink, both vanishing at the next rescan. The consequence was
not hypothetical. The transient entry also leaked into `get_all_property_records` (collection panel)
and `get_all_vault_entries_v2` (queryjs `kb.pages()`).

**Scope correction.** The issue scopes the bug to `create_note`. It also reaches the index through
`update_note_in_index` (the save + watcher path: `EditorView.svelte` mounts Kanban/Canvas/Collection
views wired to `onContentChange` -> `editor.service.ts` autosave -> `editor.hooks.ts` ->
`invoke('update_note_in_index')`) and, transitively, `toggle_task_status_inner`.

**Behaviour delta, intended.** A `.collection` / `.canvas` / `.kanban` file no longer appears even
transiently in the collection panel, `kb.pages()`, the Tasks panel or the backlinks graph. The
post-rescan state is now the always-state. Also: `update_note_in_index` only emits
`vault-index-updated` when `result.changed`, so a `.kanban` save stops emitting — correct, nothing
md-related changed. `create_note` emits unconditionally, so file-creation listeners are unaffected.
Neither emit condition was touched.

**Not touched, deliberately.** `remove_note_from_index` is left unguarded: removing an absent path
is already a harmless no-op, and guarding it would risk stranding entries inserted by a pre-fix
binary in the same session.

**Plan discrepancies.** Issue 49 is `Phase: unplanned` and appears nowhere in
`plan-2026-08-12.md`, so there is no plan section to cross-check — the issue file is the sole
authority. Noting it so the absence is not later read as an oversight. `Status:` was flipped from
`needs-triage` to `ready-for-agent` as part of this change.

**Minor finding, follow-up material.** `is_markdown_filename` is documented as taking a file name but
is implemented as `ends_with` on a lowercased string, so passing a full absolute path works and is
what the new guard does. A directory named `foo.md/` containing a `.kanban` file would still be
handled correctly (the guard sees the full path ending in `.kanban`), but the name/param mismatch is
a small readability trap worth a rename to `is_markdown_path` some day. Not filed; not worth a
commit on its own.
