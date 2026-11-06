# 142: A tag may start with a digit and may carry emoji, as in Obsidian

**Migrated from:** `.scratch/tags-obsidian-parity/issues/01-tag-format-matches-obsidian.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). A parity feature created as 'not to be run now'. The owner decided it on 2026-11-06 (below).

**Audit check at `5f8003d67`:** still_present (content, medium). Digit-first and emoji tags are still rejected: src-tauri/src/vault/parsing.rs:468 requires is_alphabetic or '_' first, :477 continuation alphabetic/ASCII digit/_/-//; src/lib/utils/tag-extraction.ts:2 INLINE_TAG_REGEX starts with [\p{L}_]; src/lib/plugins/kanban/kanban.logic.ts:735 keeps its own copy of the regex. INDEX_SCHEMA_VERSION is still 5 (src-tauri/src/vault/index_cache.rs:18), so the bump the Issue requires is still needed when the rule changes. Status needs-triage; no commit implements it.

**Stale in the text below:** The emoji set and the task-metadata rule were decided by the owner on 2026-11-06 (decision line below), so it is startable.

**Owner decision (2026-11-06):** follow Obsidian: digit-first tags with a non-digit character (#2024-goals, #1on1) and emoji are tags, all-digit #2024 stays text. Emoji means Unicode Extended_Pictographic plus ZWJ (U+200D) and variation selectors (U+FE0E, U+FE0F). The task-metadata tag regex accepts the same characters as the inline extractor. editor-inline-tags Issue 01 is already resolved, so nothing blocks it.

**What to build:** An inline `#tag` follows Obsidian's format: letters, digits, `_`, `-`, `/` and emoji, with at least one character that is not a digit. `#2024-goals`, `#1on1` and `#ideas🚀` become tags; `#1984` and `#2024` stay plain text. Every place that recognizes an inline tag applies the same rule, so the Tags panel, search, Collections, Kanban cards, task metadata and the editor pills (editor-inline-tags Issue 01) agree on what a tag is.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Rust `vault/parsing.rs::extract_inline_tags` (the `VaultIndex` view, behind the Tags panel, `entry.tags`, Collections and QueryJS) accepts a digit-first tag that has a non-digit character, and an emoji, and still rejects an all-digit tag (Rust unit tests)
- [ ] TS `utils/tag-extraction.ts` (`INLINE_TAG_REGEX`) applies the same rule, and a shared test table runs the same cases against the TS and Rust extractors so they cannot drift
- [ ] The copies in `plugins/kanban/kanban.logic.ts` (`INLINE_TAG_RE`, `COMBINED_RE`) use the shared TS rule instead of their own regex
- [ ] The task-metadata tag regex (`vault/parsing.rs`, `#([A-Za-z0-9_][A-Za-z0-9_-]*)`) accepts the same characters as the strict extractor, including non-ASCII letters, `/` and emoji. Today it is ASCII only and already accepts `#2024`; after the change it also rejects an all-digit tag, like the inline extractor
- [ ] The FTS extractor (`search/fts_logic.rs::extract_tags`) agrees with the strict one, or the Notes record why it stays broader
- [ ] The editor tag pill handler from editor-inline-tags Issue 01 styles exactly what the new rule accepts
- [ ] A vault opened after the change shows the new tags without a manual reindex (check whether the `VaultIndex` cache in `vault/index_cache.rs` needs a version bump to re-parse unchanged notes)

## Notes

- **Depends on** editor-inline-tags Issue 01: delivered (d1a7c2ffc, 53ff0da41), so this no longer waits.
- **Created 2026-11-04** at the owner's request, split out of editor-inline-tags Issue 01 (out of scope there). Not to be run now (superseded 2026-11-06: the owner scheduled it).
- **Source:** [Obsidian help, Tags](https://obsidian.md/help/tags): "Tags must contain at least one non-numerical character. For example, #1984 isn't a valid tag, but #y1984 is." Allowed: letters, numbers, `_`, `-`, `/`, and "commonly accepted Unicode characters, including emojis and other symbols". The page does not define "commonly accepted", and says nothing about the character before `#`. Keep the whitespace-or-line-start rule we have.
- **Emoji set (decided 2026-11-06):** the `Extended_Pictographic` property plus ZWJ (U+200D) and variation selectors (U+FE0E, U+FE0F), so sequences like 👩‍💻 stay one tag. Keep punctuation such as `.`, `,`, `!`, `?`, `)` out of tags so `#tag.` at the end of a sentence still ends at the `g`.
- **Today's rule** in all strict copies: first char a letter or `_`, then letters, ASCII digits, `_`, `/`, `-`. The FTS extractor already accepts a digit-first tag.
- **Out of scope:** tag autocomplete (Issue 02), frontmatter `tags:` values (they are taken verbatim).
- **Size:** M.

## Comments

- 2026-11-06: migrated from `.scratch/tags-obsidian-parity/issues/01-tag-format-matches-obsidian.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
