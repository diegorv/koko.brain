# 01: A tag may start with a digit and may carry emoji, as in Obsidian

**What to build:** An inline `#tag` follows Obsidian's format: letters, digits, `_`, `-`, `/` and emoji, with at least one character that is not a digit. `#2024-goals`, `#1on1` and `#ideas🚀` become tags; `#1984` and `#2024` stay plain text. Every place that recognizes an inline tag applies the same rule, so the Tags panel, search, Collections, Kanban cards, task metadata and the editor pills (editor-inline-tags Issue 01) agree on what a tag is.

**Blocked by:** none

**Status:** wontfix

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Rust `vault/parsing.rs::extract_inline_tags` (the `VaultIndex` view, behind the Tags panel, `entry.tags`, Collections and QueryJS) accepts a digit-first tag that has a non-digit character, and an emoji, and still rejects an all-digit tag (Rust unit tests)
- [ ] TS `utils/tag-extraction.ts` (`INLINE_TAG_REGEX`) applies the same rule, and a shared test table runs the same cases against the TS and Rust extractors so they cannot drift
- [ ] The copies in `plugins/kanban/kanban.logic.ts` (`INLINE_TAG_RE`, `COMBINED_RE`) use the shared TS rule instead of their own regex
- [ ] The task-metadata tag regex (`vault/parsing.rs`, `#([A-Za-z0-9_][A-Za-z0-9_-]*)`) accepts the same characters as the strict extractor, including non-ASCII letters, `/` and emoji. Owner decision first: today it is ASCII only and already accepts `#2024`
- [ ] The FTS extractor (`search/fts_logic.rs::extract_tags`) agrees with the strict one, or the Notes record why it stays broader
- [ ] The editor tag pill handler from editor-inline-tags Issue 01 styles exactly what the new rule accepts
- [ ] A vault opened after the change shows the new tags without a manual reindex (check whether the `VaultIndex` cache in `vault/index_cache.rs` needs a version bump to re-parse unchanged notes)

## Notes

- **Depends on** editor-inline-tags Issue 01 (another folder, so not in `Blocked by`): deliver it first, so its handler moves onto the shared rule.
- **Created 2026-11-04** at the owner's request, split out of editor-inline-tags Issue 01 (out of scope there). Not to be run now.
- **Source:** [Obsidian help, Tags](https://obsidian.md/help/tags): "Tags must contain at least one non-numerical character. For example, #1984 isn't a valid tag, but #y1984 is." Allowed: letters, numbers, `_`, `-`, `/`, and "commonly accepted Unicode characters, including emojis and other symbols". The page does not define "commonly accepted", and says nothing about the character before `#`. Keep the whitespace-or-line-start rule we have.
- **Open question for triage:** which emoji/symbol code points count. A narrow reading is the `Extended_Pictographic` property plus variation selectors and ZWJ, so sequences like 👩‍💻 stay one tag. Decide before building, and keep punctuation such as `.`, `,`, `!`, `?`, `)` out of tags so `#tag.` at the end of a sentence still ends at the `g`.
- **Today's rule** in all strict copies: first char a letter or `_`, then letters, ASCII digits, `_`, `/`, `-`. The FTS extractor already accepts a digit-first tag.
- **Out of scope:** tag autocomplete (Issue 02), frontmatter `tags:` values (they are taken verbatim).
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/152-tag-may-start-digit-may-carry-emoji.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
