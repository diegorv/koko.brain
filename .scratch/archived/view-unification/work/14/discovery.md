# 14 discovery: a view's index entry carries only its YAML keys

No `spec.md` for this feature (only `PRD.md`). Same `.view` boundary as `work/12`, but at the VaultIndex parse instead of the search tables.

## Files that change

- `src-tauri/src/vault/entry.rs:230-277` `from_content_full`: early `is_view_filename` branch calling a new `pub fn NoteEntry::from_view_frontmatter(path, frontmatter, modified_at, created_at, size)`. It sets title, frontmatter, timestamps, size and the three flags (`_organized` default true, `_archived`, `_favorite`), `..Default::default()` for the rest (is_a None, links/tags/tasks/relationships/word_count/snippet empty).
- `entry.rs:282-301` `with_path` doc: drop the "carries frontmatter parsed in the previous mode" paragraph, point at `rename_note_inner`'s re-read.
- `entry.rs:304-314` `extract_title_from_path`: case-insensitive strip of `.md` / `.markdown` / `.view` via `to_ascii_lowercase` (same byte length, so slicing the original is safe).
- `src-tauri/src/vault/index_cache.rs:18`: `INDEX_SCHEMA_VERSION` 4 -> 5.
- `src-tauri/src/commands/vault.rs:1098-1130` `rename_note_inner`: when `is_view_filename(old) != is_view_filename(new)`, `fs::read_to_string(new)` and `from_content_full` with the old entry's `modified_at` / `created_at` / `size`. Read error: new path is a view -> `from_view_frontmatter(new, old.frontmatter, ...)`; new path is `.md` -> `with_path` (the old view entry has no links already). Doc comment `:1066-1070` ("No file is re-read") updated.

## Tests (failing first)

- `entry.rs mod tests`: `from_content_full` on `x.view` and `x.View` YAML with `[[Foo]]`, `#tag`, an indented `- [ ] x` in a block scalar, `_belongs_to: "[[Proj]]"`, `_type: Event`, `_rail`, `_sidebar_label`, `_organized: false`, `_favorite: true`: empty links/tags/tasks/relationships/belongs_to, is_a None, word_count 0, snippet empty, flags kept, keys kept. Title tests: `Projects.View` -> `Projects`, `Note.MD` -> `Note`.
- `tests/commands/vault_test.rs`: `:958`, `:969` assertions -> 5. New: scan a vault with `v.view`, inject `outgoing_links` into its entry, `write_snapshot_with_version(.., 4, ..)`, cached scan -> FullScan and the view has no links.
- `tests/vault_index_test.rs`: `build` over a real `.md` and a real `.view` (constructor, not fixtures): `lookup_all_tags`, `lookup_all_tasks`, `lookup_relationship_backlinks(target)` list the note and never the view.
- `tests/vault_file_ops_test.rs`: temp vault, `a.md` holding raw YAML with `[[Foo]]`; disk rename to `a.view`, `rename_note_inner` -> frontmatter has the YAML keys, no links, no backlink on Foo. Same with the file deleted before the call -> no links. Reverse `.view` -> `.md` re-reads (links appear).

## Risks

- Doc comments touched are on methods/functions, not `#[ts(export)]` types or fields, so no bindings move (check `git status` after cargo test).
- TS `getNoteName` stays case-sensitive; Gate is Rust only, left alone.
- Read inside the `VaultIndex` write lock: one file per boundary-crossing rename only.

## Defaults taken

- `.view` -> `.md` read error falls back to `with_path` (Issue names only the view-side fallback).
- Fallback view shape keeps the old entry's frontmatter (the file is gone, nothing better to parse).
