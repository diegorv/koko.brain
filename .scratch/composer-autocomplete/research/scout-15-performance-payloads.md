# Scout 15: performance, payload size and caching for composer autocomplete

Read-only research at HEAD 130d6b8f7. No code was run; no numbers below were measured. Every estimate is marked as such. Anything not verified is marked UNVERIFIED.

## 1. Summary

- The composer needs two data sets: the tag list and the file/alias candidates. Both are reachable by IPC from the composer without a new Rust command (see scout 03 and 05 for the permission inference).
- The cheap-looking editor path (`listLinkCandidates(false)` for an empty `[[` query) does not exist for the composer: the editor's file list comes from the main window's file tree (`fsStore.fileTree`), which the composer cannot see. The only vault-wide list without a vault path is `get_all_vault_entries_v2`, the heaviest read. So even an empty `[[` costs the full entries IPC on the first trigger.
- `get_all_tags_v2` is smaller than the entries read but not tiny: its wire shape carries every tag's `filePaths`, which the editor discards on the TS side.
- Both commands are synchronous Rust `fn`s, which the repo itself says run on the app main thread. Prefetching them on every summon would compete with the hotkey-to-focus path. Recommendation: load lazily at the first `#` or `[[` of a show, never on summon.
- Per-keystroke cost of the completion sources is negligible for a quick-capture note (short text). The costly part is the first-trigger IPC and, for a large vault, the empty-query `[[` path (sort of all files).

## 2. What crosses IPC, and how big

### 2.1 get_all_vault_entries_v2 (aliases and, in the composer, the file list)

- Command is a synchronous `pub fn` at `src-tauri/src/commands/vault.rs:563-575`: takes a read lock, `idx.entries().values().cloned().collect()`, sorts by path, returns `Vec<NoteEntry>`. It clones every entry, in full.
- The `NoteEntry` wire type (`src/lib/contracts/generated/NoteEntry.ts`) carries per note: `path` (absolute), `title`, `frontmatter` (full parsed YAML as JSON), `outgoingLinks` (array of WikiLink objects), `tags`, `modifiedAt`, `createdAt`, `size`, `wordCount`, `snippet` (up to 280 bytes, `src-tauri/src/vault/entry.rs:24`), `tasks` (array of Task objects), optional `taskHeadings`, `isA`, `organized`, `archived`, `favorite`, `belongsTo`, `relatedTo`, `hasMany`, `relationships`.
- The composer needs from this: `path` (to build a `FileEntry`) and `frontmatter.aliases` / `frontmatter.alias` (`wikilink/completion.ts:26-36`). Everything else is dead weight for this use.
- Size estimate (NOT measured): a typical note is on the order of 0.5 to 3 KB of JSON (280 B snippet, ~100 B path, frontmatter, links, tasks). A 2,000-note vault is roughly 1 to 6 MB, a 10,000-note vault roughly 5 to 30 MB. UNVERIFIED; no repo doc quotes the payload size.
- Evidence for the Rust-side cost scale: the doc comment on `get_unlinked_mentions_v2` (`vault.rs:583`, `vault.rs:592`) says cloning "~2000" candidate paths is cheap (~1-5 ms), while cloning the full candidate `NoteEntry`s was ~50-100 ms of allocation on the dogfood vault. That is the only repo-recorded figure for entry cloning. It does not include serde serialization, the webview transfer or `JSON.parse`.
- Main-thread caveat: the comment at `vault.rs:113-116` states a synchronous `fn` command "runs on the app main thread and stalls the window" (the scan_vault measurement it cites is "up to ~2.4 s"). `get_all_vault_entries_v2` (`vault.rs:563`) and `get_all_tags_v2` (`vault.rs:638`) are both plain `fn`, so by the repo's own statement they run on the main thread. I did not verify the Tauri docs for this. The stall for entries on a large vault is plausibly tens to hundreds of ms (estimate only).
- The editor mitigates all of this by (a) asking for entries only when the query is non-empty (`wikilink/completion.ts:68`), and (b) memoizing per index version (`src/lib/core/vault/vault-entries.service.ts:26-38`) and patching the memo with deltas (`:73-84`). Neither mitigation is available to the composer as is.

### 2.2 get_all_tags_v2 (tags)

- Synchronous `pub fn`, `vault.rs:638-648` -> `VaultIndex::lookup_all_tags` (`src-tauri/src/vault/index.rs:1039-1065`).
- Cost on the Rust side: one pass over every entry's tags, lowercasing each (`index.rs:1048-1053`), then one `TagAggregate` per distinct tag with `file_paths: paths.iter().cloned().collect()` (`index.rs:1057-1061`) and a sort by lowercased name (`:1063`). So it is O(total tag occurrences) and clones one path string per (note, tag) pair.
- Wire shape `TagAggregate` = `{name, count, filePaths}` (`src-tauri/src/vault/task.rs:160-168`, `src/lib/contracts/generated/TagAggregate.ts`). The editor host maps the result to `{name, count}` right after the IPC (`src/lib/app/editor-host.ts:102`), so `filePaths` is paid for in transit and thrown away.
- Size estimate (NOT measured): notes x average tags per note x ~90 B path. 5,000 notes with 3 tags each is about 1.3 MB; 10,000 notes with 5 tags about 4.5 MB. Much smaller than entries in practice, but not "tiny".
- No lighter tag command exists: the commands registered around `src-tauri/src/lib.rs:347-359` expose only `get_all_tags_v2` for tags. UNVERIFIED that no other registered command returns tag names alone (I grepped lib.rs for the two commands and `index.rs` for `lookup_*tag*`; only `lookup_all_tags` exists).
- Tags could instead be derived from the entries snapshot (`NoteEntry.tags`), saving a second IPC when both are loaded. The editor's output is case-insensitive de-duplicated with first-occurrence casing and a count of distinct notes (`index.rs:1047-1061`, `TagAggregate.ts`); re-deriving that in the composer would be new logic and could drift from the editor. Prefer `get_all_tags_v2` unless a trimmed command is added.

### 2.3 File tree (scan_vault)

- Not a good composer source. `scan_vault` needs the vault path (`vault.rs:120`), stat()s every file and returns a nested tree with timestamps (`vault.rs:140-175`, `FileNode.ts`), and is async/`spawn_blocking` because it was measured at up to ~2.4 s (`vault.rs:113-116`). The composer has no vault path (scout 03, section 4).
- It would also return non-markdown files (images, pdf), which the editor offers as link targets (`editor-host.ts:80`, `flattenFileTree` at `src/lib/core/filesystem/file-entries.logic.ts:10-26`). Entries-only data loses attachment suggestions (scout 03 notes the same gap).

## 3. Existing caching in the editor host path

- Link index: `linkIndexByTree` WeakMap keyed on the identity of the `fsStore.fileTree` array (`src/lib/app/editor-host.ts:73-85`). Holds `files` (flattened, `.view` filtered) and the name-resolution cache. Built lazily on first use per tree: O(N) flatten plus index build. Not reusable in the composer (no tree), but `buildResolutionCache` is a pure function if heading/block completion is later wanted.
- Tags: `tagsMemo` keyed `${vaultStore.path}\n${vaultStore.vaultIndexVersion}` (`editor-host.ts:93-111`); a rejected read is dropped; `[]` until `vaultStore.indexReady` (`:99`).
- Entries: `versionGated` memo (`vault-entries.service.ts:26-29`, implementation `src/lib/utils/inflight.ts` `versionGated`) keyed on `vaultStore.vaultIndexVersion`, advanced in place by `patchVaultEntries` from the `vault-index-updated` listener. Index version bumps are throttled in the main window (2 s after an isolated event, at most one per 10 s in a burst, per the comment at `vault-entries.service.ts:13-20`).
- Notably, `docs/agents/indexing-watcher-rules.md` rule 12 says the whole-vault read runs only for `fullRescan`, a refresh window over 200 paths, an empty memo or a failed delta read. The composer cannot join that scheme because `vaultStore` and the listener live in the main window.
- Nothing in the editor host is keyed on time. Staleness is bounded only by the throttled version bump.

## 4. Per-keystroke cost of the completion sources

CodeMirror side (verified in `node_modules/@codemirror/autocomplete/dist/index.js`): `activateOnTyping` default true, `activateOnTypingDelay` default 100 ms (`:377-379`), `maxRenderedOptions` default 100 (`:383`). The editor sets `autocompletion({override: [...], activateOnTyping: true})` (`src/lib/core/markdown-editor/setup/editor-extensions.ts:142-145`) so these defaults apply. Typing is debounced by 100 ms before sources are queried (`:1180`).

Neither source returns `validFor` (grep of both `completion.ts` files found none), so CodeMirror re-queries the sources on each debounced keystroke while a list is open, rather than filtering the previous result locally. Each query repeats the source work below.

### wikilinkCompletionSource (`wikilink/completion.ts:43-59`)
- Calls `state.doc.toString()` on every query, before checking whether a `[[` exists (`:46`). Cost is O(document length) per query, plus `detectWikilinkContext` (`wikilink/completion.logic.ts:26-70`) which does `lastIndexOf` and a `substring` of the current line only.
- For a quick-capture note this is a copy of a few hundred characters at most. UNVERIFIED that no composer note gets large (the textarea has no length cap in what I read), but at 100 ms debounce even 100 KB would be a non-issue for a string join.
- After the context matches, file mode does the heavy part, per query:
  - `listLinkCandidates(query.length > 0)` (`:68`). In the composer this resolves from the memo (microtask) once loaded.
  - Empty query: `matchFilesForWikilink` copies and sorts ALL files with `localeCompare` (`completion.logic.ts:77-79`), then maps all of them to `Completion` objects with a closure each (`completion.ts:71-82`). CodeMirror renders at most 100 (`maxRenderedOptions`), but the sort and the object build are over N. Sorting 10k names with `localeCompare` is O(N log N) string compares; ballpark tens to a few hundred ms. NOT measured, UNVERIFIED. This is the editor's existing worst case and the composer inherits it unchanged if it reuses the source.
  - Non-empty query: `fuzzyMatch` per file (`fuzzy-match.ts:8-41`) allocates two lowercased strings per file plus a result object; linear in N x name length. Then sorts only the matches. Then a loop over all `notes` for aliases (`completion.ts:88-114`): `getAliasesFromEntry` per entry, `fuzzyMatch` per alias. Linear again.
- Heading and block modes (`[[Note#`) call `resolveLink` and `readNote` per query (`:15-24`, `:139`, `:191`); each query re-reads the target file. These need `fs` access and a file tree in the composer (scout 03) and are the likeliest to be left out; if they stay in, a per-keystroke `readTextFile` is the per-keystroke IPC risk in this area.

### tagCompletionSource (`tag/completion.ts:14-41`)
- Guards the full-text copy: it returns early unless the line text before the cursor contains `#` (`:19-21`). Only then does `state.doc.toString()` run (`:23`), because the detector scans frontmatter and fences from the document start (`tag/completion.logic.ts:51-63`, `:79-95`).
- Then `listTags()` (memo after the first), `rankTags` = `fuzzyMatch` per tag plus sort (`completion.logic.ts:98-102`). Tag lists are usually hundreds to low thousands; negligible.

### Composer baseline that already exists per keystroke
- `$effect(() => writeDraft(text))` writes the whole text to `localStorage` on every change (`src/routes/composer/+page.svelte:40`). Completion cost sits on top of that; it is not part of this change.

## 5. Recommendations: what to cache and when to load

1. Keep the data layer out of the per-keystroke path. Implement the composer's host (or whatever adapter feeds the reused sources) over a module-level memo of promises, so the second and later calls within a show are microtask-resolved. This mirrors `tagsMemo` and `versionGated`.
2. Load lazily on the first trigger in a show: first `#` for tags, first `[[` for links. Do not load on summon. Reasons: (a) both commands are sync `fn` and the repo says that means main thread (`vault.rs:113-116`), so a prefetch on every hotkey press can stall the window the user is about to type in; (b) many captures contain neither `#` nor `[[`; (c) the composer is meant to appear instantly. The cost is a visible delay for the first suggestion of a show (the IPC time). Open question: whether the owner prefers a prefetch after first keystroke or after a short idle instead. An in-between option is to start the load when the user types a lone `[` or the `#` itself, which is the same as first-trigger for `#` and one keystroke earlier for `[[`.
3. Tags and links are separate loads. A `#` must not pull the entries payload, and a `[[` must not pull tags.
4. In the composer the `[[` load is always the entries read, whatever the query. Ignore `includeNotes` in a composer host: it cannot satisfy `files` without the entries, and fetching once with notes avoids a second IPC when the user types the first query character.
5. Retain only what is needed. After the entries arrive, keep a compact array of `{path, name, nameWithoutExt}` plus, for notes with aliases only, `{path, frontmatter: {aliases|alias}}`, and drop the rest so the large payload can be collected. Caveat: `LinkCandidates.notes` is typed `NoteEntryV2[]` (`editor-host.ts:14-17`), so a trimmed object needs a cast, which sits at odds with the repo's strictness. Weigh memory saved (a few MB) against the cast; a long-lived hidden webview holding a 10-30 MB snapshot is the thing to avoid. UNVERIFIED how much of the snapshot V8 retains after parse.
6. Invalidation. There is no version counter in the composer and no cheap "index version" command (I found none; `IndexStats` is the FTS reconcile result, not an index version, `IndexStats.ts`). Options, cheapest first:
   - Per show: key the memo on the summon counter (`show` in `+page.svelte:25`, incremented in `resetForShow`, `:146-157`). Simple and always fresh at the cost of one reload per show that uses `[[` or `#`.
   - Event-driven: `app.emit(VAULT_INDEX_UPDATED_EVENT, ...)` is app-wide (`vault.rs:376`), so the composer can listen and mark its memo dirty (O(1)), reloading lazily on the next trigger. The raw events are not throttled outside the main window's listener (the 2 s / 10 s throttle lives in `tauri-listeners.service.ts`), but a dirty flag is cheap. UNVERIFIED: that the composer's `core:default` capability allows listening to it (it already listens to two events, `+page.svelte:173-193`, so the mechanism works), and that a hidden window keeps receiving events.
   - Time-based TTL: not used anywhere in the editor path; avoid unless the per-show reload proves slow.
   - Wrong-vault window is covered by scout 03 (section 5.2); the composer cannot see `indexReady`. Accept per the owner's "rare, visible, recoverable glitch" rule.
7. Do not build a composer-side delta-patching scheme (`patchVaultEntries` analog). It would be a new subsystem; a per-show full reload is the simple trade.
8. If the first-trigger delay is unacceptable on large vaults, the real fix is a small purpose-built read-only Rust command (paths and aliases only; tag names and counts only). It would shrink both payloads and, if declared `async` with `spawn_blocking`, keep the main thread free. This touches Rust but not the editor. It is a larger change than "reuse existing code"; I only flag it. The owner's constraints forbid editor behavior changes, not new read commands, but the scope rule (tags and wikilinks autocomplete only) should be checked with the owner.

## 6. Reuse opportunities (performance-relevant)

- `fuzzyMatch`, `matchFilesForWikilink`, `rankTags`, `detectTagContext`, `detectWikilinkContext` are pure and store-free (`tag/completion.logic.ts:1`, `wikilink/completion.logic.ts:1-4`); import them directly in the composer. If the composer keeps a plain `<textarea>`, the detectors can be called with `textarea.value` and `selectionStart`, skipping the `doc.toString()` copy that a CodeMirror state needs; that is a possible per-keystroke saving but it only matters for big text.
- `versionGated` / `dedupeInflight` in `src/lib/utils/inflight.ts` are `utils/`-layer, side-effect free, and importable from the composer for the memo (use a version callback that returns the show counter or a dirty counter).
- `NOOP_HOST` (`editor-host.ts:87-98`) already returns empty candidates without throwing, so a failed or pending load degrades to "no suggestions".
- The editor's `tagsMemo` shape (promise cached, dropped on rejection, `editor-host.ts:96-111`) is the right pattern to copy, not import: it is private to `src/lib/app/editor-host.ts` and bound to `vaultStore`.

## 7. Risks

- First-trigger latency on a big vault (IPC on the main thread plus JSON parse of a multi-MB payload in the composer). Not measured. This is the main user-visible risk; measure with the existing LP-PROFILE style timing or `CmdTrace` before choosing prefetch vs lazy.
- Empty `[[` on a large vault sorts and builds Completion objects for every file (`completion.logic.ts:77-79`, `completion.ts:71-82`). Existing editor behavior; cannot be changed without editing editor files, which is forbidden. A composer-side workaround is only to hand the source a pre-trimmed list.
- Memory: long-lived hidden composer webview retains the snapshot. Per-show invalidation plus compact retention bounds it.
- Main-thread stalls: the two commands are sync; a concurrent composer read can delay the main window while it is busy indexing, and the reverse. UNVERIFIED how Tauri schedules them; relies on the repo comment at `vault.rs:113-116`.
- Extra work per show if the user opens the composer many times a day and types `[[` each time: one full entries IPC each. Acceptable for per-show invalidation only if the first-trigger latency measures small.
- `get_all_tags_v2` `filePaths` waste: small relative to entries, but grows with tag usage.

## 8. Open questions

1. What is the real payload and latency of `get_all_vault_entries_v2` and `get_all_tags_v2` on the owner's vault (note count, MB, ms for Rust, transfer and parse)? Nothing in the repo records it.
2. Is a purpose-built lean read command acceptable in scope, or must the composer reuse the two existing commands as is?
3. Per-show reload vs event-driven dirty flag: does a hidden composer webview receive `vault-index-updated`? Needs a runtime check (no code run here).
4. Does the composer capability's `core:default` cover event listening for a new event name (it already listens to `qc:*` events)? Scout 05 covers permissions.
5. Should heading and block-id completion (`[[Note#`) be in scope? It needs per-keystroke `readNote`, which is the one path with per-keystroke IPC, and needs fs permission the composer lacks.
6. Is the composer note ever large enough for `doc.toString()` per query to matter? Probably not for quick capture.
