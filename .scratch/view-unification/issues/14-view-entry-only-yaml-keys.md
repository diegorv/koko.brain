# 14: A view's index entry carries only its YAML keys

**What to build:** A `.view` is admitted as markdown so menus can read its keys, and nothing after that separates it from a note. Only frontmatter switches to raw YAML (`vault/entry.rs:238`). The Markdown and relationship extractors still run over the whole file (`:243-245,253-259`):

- Links: any `[[X]]` in the YAML (`parsing.rs:1057`), so a view can be a backlink source.
- Tags: `name: #Projects` or an unquoted `_color: #ff0000` creates a tag (`parsing.rs:445`).
- Tasks: an indented `- [ ] x` in a block scalar becomes a task (`parsing.rs:1676`), and toggling it rewrites the YAML (`commands/vault.rs:760-782`).
- Relationships and `is_a`: a `.view` with `_type: Type` registers a type, and `_type: Event` is an event.

Fix at parse time, not at each reader:

1. **`NoteEntry::from_content_full`:** an early branch for `is_view_filename` builds `{path, title, frontmatter (raw YAML), modified_at, created_at, size, organized, archived, favorite, ..Default::default()}`. `is_a` is None, and links, tags, tasks, relationships, `word_count` and `snippet` are empty. **Keep the flags parsed:** `Default` would turn `organized` false.
2. **`INDEX_SCHEMA_VERSION` 4 to 5 (`index_cache.rs:18`):** mandatory. Without it, cached views keep their links and tags until their mtime changes (`commands/vault.rs:1401-1403`). `vault_test.rs:958` asserts the version and must change.
3. **`extract_title_from_path` (`entry.rs:307`):** make the strip case-insensitive. `Projects.View` becomes `Projects`, and `Note.MD` becomes `Note`.
4. **`rename_note_inner` (`vault.rs:1119-1124`):** when `is_view_filename(old) != is_view_filename(new)`, re-read the new path with `from_content_full`. **On a read error, build the stripped view shape**, not `with_path`: a rename keeps the mtime and `save_vault_cache` persists the entry, so a stale parse would survive restarts. Update the doc comment at `entry.rs:288-293`.

Backlinks, relationship backlinks, tags, tasks, section tasks and type rename then need no edit.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`, unless a `#[ts(export)]` type's doc comment changes. Then it is Both, and the regenerated bindings are committed (rule 6).

- [ ] Failing tests first, through the real parser:
  - `from_content_full` on `.view` and `.View` YAML with `[[Foo]]`, `#tag`, an indented `- [ ] x`, `_belongs_to` and `_type: Event`: note fields are empty, `is_a` is None, and `_rail` and `_sidebar_label` stay in frontmatter. It must call the constructor, because literal `NoteEntry` fixtures pass while the problem stays.
  - `write_snapshot_with_version` (`vault_test.rs:983`) at schema 4 with a view carrying `outgoing_links`, then the cached scan: the links are gone. Parse tests stay green if the bump is forgotten, so this one is the proof.
  - After `build`, `lookup_all_tags`, `lookup_all_tasks` and `lookup_relationship_backlinks` contain no view.
  - `.md` -> `.view` rename: raw-YAML frontmatter and no links, including when the target is missing at re-read.
  - `Projects.View` titles `Projects`, and `Note.MD` titles `Note`.
- [ ] Menus, pins, order, icons and counts are unchanged.

## Notes

- **Behavior that changes, and is intended:** a `.view` with `_type: Type` or `_type: Event` stops acting as one. A view with a top-level `_type` loses the inherited type icon (`boot.ts:55`); its own `_icon` still works.
- **Also intended:** a `[[Foo]]` in view YAML is no longer rewritten on rename (owner decision).
- **Cost:** one slower boot on a large vault, from the cache bump.
- **Residual:** with empty `word_count` and `snippet`, a same-second, same-size edit inside `views:` gives `changed == false` and no event (`index.rs:527`). Rare and recoverable, no code.
- `TASK_RE`'s exact pattern and `canonicalize_key`'s call site were not read.
- **Size:** M.
