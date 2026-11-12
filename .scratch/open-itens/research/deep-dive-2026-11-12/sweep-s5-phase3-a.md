# Sweep s5-phase3-a: Issues 076 to 090

Checked at HEAD afc0a9df8 on 2026-11-12. All 15 ledger rows are `todo`, none done or wontfix, so all are in scope. Read-only sweep: claims checked by reading code, nothing run.

Result in one line: all 15 central claims are still present at HEAD, none is fixed. None has high impact for this owner. Two are cheap enough to be worth queueing as low-priority fillers (077, and 080 only if bundled); the rest should stay deferred.

## Table

Impact = how often the owner's real workflow hits it x how bad. Complexity S/M/L. Risk low/medium/high (core write paths, live preview, Rust lifecycle, shared stores are high).

| # | Title (short) | Still at HEAD? | Impact for this owner (trigger) | Cx | Risk | Owner decision open? |
|---|---|---|---|---|---|---|
| 076 | Atomic note writes | Present. `writeTextFile` still in editor.service.ts:194, link-updater.service.ts:58, frontmatter-write, type-definitions, deep-link, deep-link-actions, templates, file-icons. `write_atomic` (utils/fs.rs:16) only used by Rust commands | Low. Needs full disk or I/O error mid-write; severe when hit (note truncated), but open tabs keep the buffer and retry | L (about 12 writers, new Rust command, guard test, `create:false` contract) | High (every save path) | No (fix sketch settled). Memory "no core changes for corner cases" (fsync refused 2026-11-06) argues against |
| 077 | Rename rewrite touches code blocks and self links | Present. `replaceWikilinks` (link-updater.logic.ts:87-118) is one global regex, no fence or inline-code skip; service.ts:47 filters `oldPath` out of sources | Low to medium. Trigger: rename a note whose name appears as a literal `[[Name]]` in a code fence or inline code of another note, or `[[Old#Heading]]` inside the renamed note. Silent byte change, visible in File History | S | Low (pure logic in `.logic.ts` plus a one-line service change; rename path but well covered) | No |
| 078 | Deep-link path safety (`name=.`, `.kokobrain` overwrite) | Present. path.ts:41 accepts `normalized === base`, :47-50 appends `.md`; deep-link.service.ts:306 overwrite has no `.kokobrain` guard | Low. Needs a crafted `kokobrain://` URL from another process; owner has no external writers. Quick Capture uses deep-link actions but with in-app URLs | S | Low (path util plus branch guard) | No |
| 079 | Auto Move rule edit lost if Settings closes within 500 ms | Present, file renamed: now `src/lib/features/auto-organize/AutoOrganizeSection.svelte:25-27` (`onDestroy` only clears the timer), debounce at :40-45. Issue's `auto-move/` paths are stale | Low. Trigger: edit a rule field, then Esc or switch section within 0.5 s. Settings edit only, not note data; store keeps it until restart. Owner's auto-organize use is not listed | S | Low | No. Still `Blocked by: 031` (031 is todo) |
| 080 | Failure after disk op reports rename as not done | Present, but narrowed. path-change.service.ts:200 `await updateLinksAfterRename` still unguarded; its only live throw is a poisoned VaultIndex lock | Low. Needs a prior Rust panic. Issue itself says candidate for wontfix | S (one try/catch + `error('FS', ...)`) | Low | No (owner scoped it to the try/catch on 2026-11-06) |
| 081 | Unquoted `up: [[Home]]` blocks every frontmatter writer | Present. `detectLossyFrontmatter` (properties.logic.ts:406-462) parses raw without `foldUnquotedWikilinks` (defined :113, used only at :250), so the note is 'nested' and all writers refuse | Low to medium. Trigger: hand-typed unquoted wikilink in frontmatter, then any Properties, meta-bind, icon or archive write; toast refuses, nothing lost. Invalid in Obsidian too. Owner uses meta-bind, so a link-valued property is conceivable, but the app's own writers quote it | S | Medium (properties.logic.ts is in the hot-code group with 005, 022, 008, 002; reverses a pinned test at properties.logic.test.ts:1542-1544) | Decided 2026-11-06 (fold before lossy check) |
| 082 | Failed Auto Move shows no toast | Present. auto-organize.service.ts:339-342 bare `catch { return; }` after `moveItem`; also :330-332 mkdir failure only logged. No toast import in the feature dir | Low. Needs a destination name clash or a disk error. Issue 233 (collision lands as `<name> 2`) removes the main trigger | S | Low (service plus toast; must not spam per autosave) | No. Blocked by 031 and 233 (both todo); 233 changes the same move step, so this Issue's scope shrinks after it |
| 083 | Vault outside the two allowed folders is refused | Present. vault.service.ts:31 `open({directory:true})` then `switchVault` with no scope check | Low. Owner's vault is already inside `~/kokobrain-vaults` or `~/Documents/kokobrain-vaults`. Only hits a new unusual vault location | S | Low (pure `isVaultPathAllowed` plus a message) | Decided 2026-11-06 (refuse with a message naming both folders) |
| 084 | Widget that throws on every render desyncs the tab | Present. MarkdownEditor.svelte:195-201 second catch only logs; `setViewState` (:139-149) same | Low likelihood, serious consequence (typing silently dropped until tab switch). No known daily trigger: `host.assetUrl` is `convertFileSrc` in prod and does not throw | M (source-mode rebuild path plus toast, component tests) | High (live preview, MarkdownEditor.svelte hot file shared with 001, 154) | Decided 2026-11-06 (source-mode fallback plus toast) |
| 085 | `read_files_batch` trusts caller's vault root | Present. files.rs:31 `validate_vault_path(&vault_path)` from the argument; no recorded open root | None in daily use. Defence in depth against a compromised webview | S to M (Rust state, tests that open a vault first, ADR amendment) | Medium (Rust lifecycle: set in `open_vault_db`, clear in `close_vault_db`) | No |
| 086 | QueryJS pager, wikilinks in inline code, media in code | Present, all three. Pager buttons (kb-ui.ts:505-538) only `onclick`; mousedown stops exist only on Run (queryjs-block-widget.ts:208) and Retry (:318); no `InlineCode` check in wikilink-handler or wikilink-embed-plugin; audio-plugin has no `isInsideBlockContext` | Low to medium. Pager click needs a paginated `kb.ui.table`; inline-code wikilinks (`` `[[x]]` ``) in documentation-style notes render as links. Owner uses QueryJS only indirectly (not in the daily list) | M (three independent fixes in live-preview plugins, gate includes `pnpm build`) | High (live preview) | No (owner scheduled it 2026-11-06) |
| 087 | Local graph center follows every focus, hint when center gone | Present. graph-view.service.ts:24-27 `captureCenterPath` called only from `openGraphTab` and `toggleGraphTab` | Low. Graph view is not a daily feature; trigger is a tab-bar click onto the graph | M (tracker registered from the app layer, path-change consumer, layer rules) | Medium (touches editor store subscription and layer baseline) | No |
| 088 | Watcher rescan (dropped FSEvents) not handled | Present. watcher.rs has no `need_rescan` or Rescan handling (grep empty) | None for this owner. Needs an external writer (git pull or sync) dropping FSEvents; owner has no external sync | L (Rust payload field, ts-rs DTO regen, TS handlers, index reconcile) | High (watcher, shared indexes) | No |
| 089 | Keystrokes lost during link rewrite, type rename, watcher reload | Present. link-updater.service.ts:46-66 snapshot, await write, then unconditional `syncExternalContentToEditor(..., true, 'none')`; type-definitions.service.ts:232-236 same; editor.service.ts:442-448 reload checks only disk vs savedContent | Low. Race is a few ms and needs a keystroke in the linked open note at the instant a rename lands; a rename is a deliberate action in another UI, so concurrent typing is implausible. Watcher-reload half needs an external writer | M (3 call sites, race tests) | High (editor.service sync path, same hot file as 004, 015) | No |
| 090 | Dock Quit, logout, shutdown skip the exit flush | Present. lib.rs:402 handles only `RunEvent::ExitRequested`; no `applicationShouldTerminate` in src-tauri/src | Low to medium. Loss is at most the last 2 s (10 s max wait, editor.service.ts:227) of typing, and only if the owner quits via Dock or logs out seconds after typing. Moved out of the first wave by the owner on 2026-11-06 | L (Rust plus Objective-C in the tao delegate, no automated test, risk of blocking logout) | High (Rust lifecycle) | No, but the owner already moved it out |

## Notes

Facts verified in code (path:line at HEAD afc0a9df8)
- 076: editor.service.ts:194 `await writeTextFile(path, content)` in `writeTab`; `write_atomic` callers only in src-tauri/src/commands/vault.rs (:425, :804, :940, :1147, :1203). `src/tests/lib/architecture/` has no writeTextFile guard test.
- 077: link-updater.logic.ts:87-118 and link-updater.service.ts:47 as in the table.
- 079: the section was renamed from Auto Move to Auto Organize; the same bug sits at AutoOrganizeSection.svelte:25-27 and :40-45, `updateRule` at :64-67. Issue text paths (`auto-move/`, `auto-move-rules.json`) are stale and the implementer must retarget the test file names.
- 082: the same rename applies (`src/lib/features/auto-organize/auto-organize.service.ts`).
- 081: `foldUnquotedWikilinks` is applied only inside `toFrontmatterValue` (properties.logic.ts:250), not in `detectLossyFrontmatter`.

Inference (not run)
- 080 and 089 triggers are judged unreachable or near-theoretical from the traced code, not from a repro.
- 090 impact depends on how the owner usually quits. Cmd+Q and window close are already routed through `prepareForExit` (Issue 01); only Dock Quit, logout and shutdown are open.
- 084 consequence is taken from the Issue's reviewer repro; not reproduced here.

Cross-Issue interactions worth knowing
- 079 and 082 are blocked by 031 (todo) and 082 also by 233 (todo). They cannot start before those land.
- 076, 089 sit in the `editor.service.ts` serial group with 004 and 015; 081 sits in the `properties.logic.ts` group with 002; 084 and 086 touch live-preview files; 090 touches the `lib.rs` run handler with 003. All of those need to run serially after the queued Issues in the same files.

## Recommendation

Add to the queue (optional, low priority, none is high impact):
- **077** (rename rewrite skips code fences and inline code, plus self links). Closest to the owner's workflow of all 15: rename is a daily action and the failure is silent byte changes in other notes. S, low risk (pure `.logic.ts` change, existing tests to extend; the repro test needs rewriting against `replaceWikilinks(content, buildRenameResolution(...))` because its old signature no longer compiles). Does not collide with the queued hot files.
- **080** only as a free rider on another path-change.service.ts task: it is a one-line try/catch with `error('FS', ...)`, but the trigger is nearly unreachable, so it should not be a standalone ticket.

Keep deferred (not worth the complexity or risk for this owner):
- 076 (L, high risk, corner trigger; the owner has already declined fsync-style core changes for rare failures), 084 (high risk in live preview, no known trigger), 086, 087, 088, 089, 090, 085, 078, 083 (owner vault is already in an allowed folder).
- 079, 081, 082 are cheap (S) but low impact; 079 and 082 are blocked, 081 touches the properties hot group.

Look already fixed or wontfix-shaped
- None is fixed. 080 is the closest to wontfix: its delete leg was fixed by f618f44ce, and what remains is a defensive guard for a lock-poisoning trigger.
- 082 will mostly lose its main trigger when 233 lands; re-scope it then to non-Markdown, system-folder and disk-error cases.

Stale text in Issue files to correct when picked up: 079 and 082 reference `auto-move` paths that are now `auto-organize`; 077's repro test signature; 080 and 088 line refs (already noted in their headers).
