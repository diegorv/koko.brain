# Scout 12: what happens to [[links]] and #tags typed in the composer after save

Read-only research at HEAD 130d6b8f7. All paths relative to the repo root. Nothing was run.

## Verdict

Text typed in the composer reaches the note file byte for byte. No step escapes, rewrites or evaluates `[[...]]` or `#tag` in the body. Both are picked up by the same indexers that handle notes typed in the editor. Autocomplete only has to insert the right text into the textarea; nothing downstream needs to change.

## Findings

### 1. The body is raw from textarea to file

- Composer sends `text` untouched: `src/routes/composer/+page.svelte:86` (`const body = text`), `:102` (`call('submit_composer_capture', { text: body, requestId })`). The only guard is `body.trim()` being non-empty (`:87`); the text itself is never trimmed.
- Rust does not modify the text. `src-tauri/src/quick_capture/commands.rs:469-486` (`submit_composer_capture`) only checks `text.trim().is_empty()` (`:474`), then `build_composer_note_payload(&text, ...)` puts it in the JSON `text` field (`:439-454`). It is emitted as a Tauri event, not a URI, so there is no percent-encoding step. (The `kokobrain://capture` parser at `src/lib/features/deep-link/deep-link.logic.ts:170-179` is not on this path.)
- Main-window listener: `src/lib/plugins/quick-capture/quick-capture.service.ts:139-142` builds `{kind:'note', text}`. It does not set `tags` (`:130-137` build `common` without it), so `action.tags` is `undefined` for composer captures.
- `renderCaptureBody` for kind `note`: `src/lib/features/deep-link/deep-link.logic.ts:256-262` returns `action.text` as is. The only addition is a footer `\n\n> Source: [<sourceTitle ?? sourceUrl>](<sourceUrl>)` when `sourceUrl` exists (`:309-316`). The composer payload carries `sourceUrl` only when a browser tab was frontmost (`commands.rs:329-342`, `merge_context`). No escaping of the body anywhere.

### 2. Template processing never touches the body

- `src/lib/app/deep-link-actions.ts:165` `body = renderCaptureBody(action)`; `:166` `fileContent = body`.
- If a template is configured (`:168-198`): the template text alone goes through `processCaptureTemplate(template, fileTitle, vars)` (`:193`), then the result is concatenated: `fileContent = processed + '\n' + body` (`:194`). The body is appended after processing, so `<% ... %>` typed in the composer is never evaluated.
- `vars.content = body` (`:174`) is the only way body text enters template evaluation, via a `<% content %>` placeholder. `processTemplate` is a single `String.replace` pass (`src/lib/utils/template.ts:28-30`), so the inserted value is not re-evaluated. No repo file outside tests references `<% content %>` (grep over `src` and `docs`, only the Svelte/TS sources inspected; no template hit). If a user template did use it, the body would appear twice (`:174` plus `:194`). That is an existing quirk unrelated to autocomplete.
- `processCaptureTemplate` (`src/lib/plugins/quick-capture/note-composer.logic.ts:122-133`) only YAML-quotes capture text variables inside the template's frontmatter block. It does not see the body.
- A template that has frontmatter ends with `---`, then `\n`, then the body. A `#tag` at the first body line keeps its line-start position, which the tag rule accepts.

### 3. Frontmatter injection does not apply, explicit organization is the only post-step

- `injectTags = !!action.tags && action.tags.length > 0` (`deep-link-actions.ts:201`) is false for composer captures (see 1). `injectTitle` needs kind `link` (`:200`). So `detectLossyFrontmatter` / `injectTagsIntoContent` do not run and the body is never parsed as YAML.
- `applyExplicitOrganization(fileContent, settingsStore.explicitOrganization)` (`:210`) is the last transform. `withUnorganizedFlag` (`src/lib/core/note-creator/explicit-organization.logic.ts:29-37`) only inserts `_organized: false` right after an opening `---`, or prepends a new block (`:34`). It never edits body lines.
- Edge case (pre-existing, not autocomplete-related): composer text that itself starts with a `---` ... `---` block, with no template, is treated as frontmatter and gets `_organized: false` inserted into it.
- Write: `resolveUniqueCapturePath` (`:213`), `writeTextFile` (`:215`), `notifyAfterSave(targetPath, fileContent)` (`:216`), `addToTree` (`:225`).

### 4. Tags in the body are indexed as tags

- `notifyAfterSave` (`src/lib/core/editor/editor.hooks.ts:67-92`) calls `applyNoteChange({kind:'upsert', source:'save', path, content})` (`:81`), which refreshes `VaultIndex` including tags (`src/lib/core/filesystem/note-change.service.ts:198`, comment at `:237` lists `tags_index`). The watcher skips the file through `markRecentSave` (`editor.hooks.ts:68-78` comment).
- Rust rule, `src-tauri/src/vault/parsing.rs:456-501` (`scan_inline_tags`): `#` at text start or after whitespace; first char `\p{L}` or `_` (digit-first rejected); then letters, ASCII digits, `_`, `/`, `-`; trailing `/` dropped. `extract_inline_tags` (`:513-526`) first strips frontmatter, fenced code, inline code and HTML comments. TS mirror: `src/lib/utils/tag-extraction.ts` (`INLINE_TAG_NAME_SOURCE` and `INLINE_TAG_REGEX`, lines 1-9 of the file; `extractInlineTags` strips the same things).
- Consequence: a tag chosen from completion (names from `listTags()`, which come from this same index) round-trips exactly. Tag text typed after `#` in the composer is indexed with no extra work. `[[Book#Chapter]]` is not a tag (the `#` is mid-word), matching `detectTagContext`'s refusal after a non-space char.
- Existing caveat: a browser tab title containing ` #foo` in the `> Source: [..]` footer becomes a tag too (footer is plain body text). Unrelated to this feature.

### 5. Wikilinks survive, including alias and heading/block forms

- Outgoing links are parsed from the raw content. Rust: `parsing.rs:1081-1142` (`extract_outgoing_links`): `[[target]]`, `[[target|alias]]`, `[[target#heading]]`, `[[target#^block]]`, `[[target#heading|alias]]`; splits `|` first, then `#` on the left side (`:1111-1121`). It does not strip frontmatter or code (`:1063-1066`). TS mirror: `src/lib/core/filesystem/wikilink-resolution.logic.ts:151` (`WIKILINK_REGEX = /\[\[([^\]]+?)\]\]/g`) and `parseWikilinks` `:154-184`.
- What the editor's completion inserts, and therefore what a composer port would insert:
  - File: `label + ']]'` (`src/lib/core/markdown-editor/extensions/wikilink/completion.ts:71-82`); closing brackets skipped if the next two chars are already `]]` (`:75-76`).
  - Alias entry: `noteName|alias` (`:100-108`), i.e. `[[Note|alias]]`. That parses to target `Note`, alias `alias`.
  - Heading: `[[Note#Heading]]` (`:157-168`); block id: `[[Note#^id]]` (`:209-220`).
  All four forms are valid under the regexes above and none is altered by the capture pipeline.
- Problem forms: `]` inside the inner text ends the match (`[^\]]+?`), so `[[a]b]]` is not a link. Both the editor and the indexer behave the same, so nothing new.
- Resolution of `[[name]]` for a duplicate basename in two folders is the same ambiguity as in the editor. The completion label is `nameWithoutExt` (`completion.ts:72`), not a path.

## Reuse opportunities (relevant to what the saved text must look like)

- `tag/completion.logic.ts` is pure and already matches the indexer's rule: `detectTagContext(docText, pos)` (`:75-89`) and `rankTags(query, tags)` (`:96-102`). It imports only `utils/fuzzy-match.js`, so the composer webview can import it unchanged. Its `TAG_PREFIX_RE` (`:22`) equals the indexer rule, so tags typed in the composer are detected exactly as they will be indexed.
- `wikilink/completion.logic.ts` is pure too (`detectWikilinkContext` `:26-72`, `matchFilesForWikilink` `:75-90`, heading/block-id extractors `:93-114`). Its imports are `utils/fuzzy-match.js`, a type from `core/filesystem/file-entries.logic.js`, and `navigation.logic` (not read in this scout, so its purity is UNVERIFIED).
- The `completion.ts` wrappers are tied to `CompletionContext`/`EditorView`, so a textarea-based composer would need its own apply step. The insert strings above (`label]]`, `Note|alias]]`, no double `]]`) are the contract to keep.
- `detectTagContext` treats a leading `---`...`---` block and fenced code as non-tag zones (`tag/completion.logic.ts:56-68`). In a composer textarea this is correct for the saved file too, because the saved text is scanned with the same strip rules.

## Risks

1. Heading and block-id completion (`[[Note#`, `[[Note#^`) calls `host.resolveLink` and `host.readNote` (`wikilink/completion.ts:14-24`), i.e. needs vault data in the composer webview. The empty-target form (`[[#`) reads the current document (`:136-138`, `:188-190`), which for the composer means the textarea content. Scope decision for another scout: file/alias-only completion would need only the file and note lists.
2. `detectWikilinkContext` works on a single line (`:27-28`) and refuses completion after `|` (`:37`). A composer must pass the full textarea value and caret offset (it uses `docText`/`pos` only), which a textarea provides.
3. Because the body is raw and the Rust side does not trim, any extra text a completion UI left in the textarea (placeholders, ghost text) would be saved. Only real inserted text should land in `value`.
4. A tag or link typed in a body that starts with a `---` block is invisible to the tag rule both in completion and in the index (frontmatter strip). Consistent, but surprising for a capture note that begins with `---`.

## Open questions

- Is the composer to offer heading/block-id completion, or only `[[file` and aliases (affects what must cross the webview boundary, outside this scout)?
- `navigation.logic` imports (`HEADING_RE`, `BLOCK_ID_RE`) were not read: UNVERIFIED that `wikilink/completion.logic.ts` is importable from the composer route without pulling framework code.
- Whether the composer's Svelte/Vite bundle may import from `core/markdown-editor/extensions/**` under the layer rules (`layer-rules.test.ts`, baseline) was not checked in this scout.
- No test or runtime check was done; every claim is from reading source.
