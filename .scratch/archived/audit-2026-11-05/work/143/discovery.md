# 143 discovery: tag autocomplete

No `spec.md` in the feature folder (only `PRD.md`); the Issue text is the spec.

## Files that change

- `src/lib/core/markdown-editor/editor-host.ts:43-79` add `VaultTag { name, count }`, `EditorHost.listTags()`, `NOOP_HOST.listTags` (resolves `[]`).
- `src/lib/core/markdown-editor/extensions/tag/completion.logic.ts` (new): `detectTagContext(docText, pos)` and `rankTags(query, tags)`.
- `src/lib/core/markdown-editor/extensions/tag/completion.ts` (new): `tagCompletionSource`, data through `state.facet(editorHost).listTags()`.
- `src/lib/core/markdown-editor/setup/editor-extensions.ts:136-142` add the source to the shared `autocompletion({ override })`.
- `src/lib/app/editor-host.ts:94-160` `listTags()` over `call('get_all_tags_v2')`, mapped to `{ name, count }`, memoized per (vault path, `vaultIndexVersion`).
- Tests: `src/tests/lib/core/markdown-editor/extensions/tag/completion.logic.test.ts` (new), completion tests in `src/tests/lib/core/markdown-editor/editor-host.test.ts` (next to the wikilink completion ones, `fakeHost` gains `listTags`), `src/tests/lib/app/editor-host.test.ts` (listTags + index bump), `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts` (registration).

## Plan

1. Logic test-first: the prefix regex mirrors `INLINE_TAG_REGEX` (`utils/tag-extraction.ts`): `#` at line start or after whitespace, first char a letter or `_`, then `[\p{L}\d_/-]`. Null inside an open inline-code run before the `#`, inside a ``` / ~~~ fence, inside a closed `---` frontmatter. `# ` and `foo#` never match. `rankTags`: `fuzzyMatch` (`utils/fuzzy-match.ts`), score asc, then count desc, then name.
2. Host method + source + registration. Accepting inserts the label over `[from, pos)` (default apply), so `#ar` -> `#area/sub`.
3. App host: not `tagsStore`. It only rebuilds while TagsView is mounted (`TagsView.svelte:44` is the only `scheduleTagIndexRebuild` caller), so it would miss criterion 6. A per-version memo over the IPC instead, like `vault-entries.service.ts`, so typing does not send one `get_all_tags_v2` per keystroke.

## Defaults taken

- The list opens right after `#` (empty prefix, Obsidian parity); `# ` closes it, `##` never opens it (`#` before `#`).
- No count shown in the row; no trailing space inserted.
- `listTags()` resolves `[]` while `vaultStore.indexReady` is false, and the memo key includes the vault path: the version counter is never rewound, so during a vault switch the Rust index still holds the previous vault (the window `app-lifecycle.service.ts:344-352` describes). No lifecycle wiring needed.
- A `listTags()` rejection is reported (`reportError`) and the source returns null; the memo drops a failed entry.

## Risks

- Reopening the SAME vault path at an unchanged version serves the previous session's tags until the next bump (rare, recoverable).
- Inline-code detection is per line and conservative: an unclosed backtick before `#` suppresses the list.
- Prior art: `extensions/wikilink/completion.ts` + `completion.logic.ts`, `extensions/date-shortcut/*`.
