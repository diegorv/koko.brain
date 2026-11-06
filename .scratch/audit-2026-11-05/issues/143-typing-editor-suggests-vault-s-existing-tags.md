# 143: Typing # in the editor suggests the vault's existing tags

**Migrated from:** `.scratch/tags-obsidian-parity/issues/02-tag-autocomplete.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). A new feature created as 'not to be run now'. It depends on editor-inline-tags Issue 01, which is outside this plan.

**Audit check at `5f8003d67`:** design_or_refactor (ux, medium). Feature not built: the single autocompletion instance lists only wikilinkCompletionSource and dateShortcutCompletionSource (src/lib/core/markdown-editor/setup/editor-extensions.ts:136-142), and rg finds no listTags or tag completion source in src/lib. Its dependency (editor inline tags) is delivered, so it is unblocked; it is new work, not a defect.

**Stale in the text below:** the needs-triage and 'not to be run now' notes are superseded: the owner scheduled it on 2026-11-06, after 142.

**Owner decision (2026-11-06):** schedule it. editor-inline-tags Issue 01 is already resolved; run it after 142.

**What to build:** When you type `#` at a position where a tag can start (line start or after whitespace, outside code and frontmatter), the editor shows a completion list with the vault's tags, filtered by what has been typed after `#`, as Obsidian does. Picking one inserts the full tag name, nested ones included (`#area/sub`). `# ` (a heading) and `#` with no match show no list.

**Blocked by:** 142

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A pure context detector returns the typed prefix only where a tag can start: not after a non-space character (`foo#`), not in inline code, a fenced block or frontmatter, and not for `# ` (a heading) (logic tests)
- [ ] The completion source filters the vault's tags by the prefix with the same fuzzy matcher the wikilink completion uses (`utils/fuzzy-match.ts`) and ranks the most-used tags first among equal matches (logic tests)
- [ ] The tag list reaches the editor through an `EditorHost` method (for example `listTags()`), implemented in `src/lib/app/editor-host.ts` from the tags data (`get_all_tags_v2` / `tagsStore`); `core/` does not import `features/tags` (the layer baseline does not grow)
- [ ] The source is registered in the shared `autocompletion()` instance next to the wikilink and date-shortcut sources (`setup/editor-extensions.ts`)
- [ ] Accepting a suggestion replaces the typed prefix with the tag name; a nested tag inserts in full (completion tests)
- [ ] A tag created after the vault opened shows up in the list after the next index bump, without reopening the vault

## Notes

- **Depends on** editor-inline-tags Issue 01: delivered, so this no longer waits on it. If Issue 01 of this folder lands first, completion uses its rule.
- **Created 2026-11-04** at the owner's request, split out of editor-inline-tags Issue 01 (out of scope there). Not to be run now (superseded 2026-11-06: scheduled after 142).
- **Model to follow:** `core/markdown-editor/extensions/wikilink/completion.ts` + `completion.logic.ts` (context detection apart from the source, data through `editorHost`).
- **Left to the implementer:** whether the list should also open on an empty prefix (right after `#`) or only after the first letter, since `#` is also typed for headings at line start. Obsidian opens it right after `#`; here `# ` with a space already rules out the heading case.
- **Size:** S/M.

## Comments

- 2026-11-06: migrated from `.scratch/tags-obsidian-parity/issues/02-tag-autocomplete.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
