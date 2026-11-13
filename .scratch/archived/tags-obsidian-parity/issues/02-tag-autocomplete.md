# 02: Typing # in the editor suggests the vault's existing tags

**What to build:** When you type `#` at a position where a tag can start (line start or after whitespace, outside code and frontmatter), the editor shows a completion list with the vault's tags, filtered by what has been typed after `#`, as Obsidian does. Picking one inserts the full tag name, nested ones included (`#area/sub`). `# ` (a heading) and `#` with no match show no list.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A pure context detector returns the typed prefix only where a tag can start: not after a non-space character (`foo#`), not in inline code, a fenced block or frontmatter, and not for `# ` (a heading) (logic tests)
- [ ] The completion source filters the vault's tags by the prefix with the same fuzzy matcher the wikilink completion uses (`utils/fuzzy-match.ts`) and ranks the most-used tags first among equal matches (logic tests)
- [ ] The tag list reaches the editor through an `EditorHost` method (for example `listTags()`), implemented in `src/lib/app/editor-host.ts` from the tags data (`get_all_tags_v2` / `tagsStore`); `core/` does not import `features/tags` (the layer baseline does not grow)
- [ ] The source is registered in the shared `autocompletion()` instance next to the wikilink and date-shortcut sources (`setup/editor-extensions.ts`)
- [ ] Accepting a suggestion replaces the typed prefix with the tag name; a nested tag inserts in full (completion tests)
- [ ] A tag created after the vault opened shows up in the list after the next index bump, without reopening the vault

## Notes

- **Depends on** editor-inline-tags Issue 01 (another folder, so not in `Blocked by`): deliver it first. If Issue 01 of this folder lands first, completion uses its rule.
- **Created 2026-11-04** at the owner's request, split out of editor-inline-tags Issue 01 (out of scope there). Not to be run now.
- **Model to follow:** `core/markdown-editor/extensions/wikilink/completion.ts` + `completion.logic.ts` (context detection apart from the source, data through `editorHost`).
- **Open question for triage:** whether the list should also open on an empty prefix (right after `#`) or only after the first letter, since `#` is also typed for headings at line start. Obsidian opens it right after `#`; here `# ` with a space already rules out the heading case.
- **Size:** S/M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/143-typing-editor-suggests-vault-s-existing-tags.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
