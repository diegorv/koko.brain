# Scout 20: history and prior art

Read-only research at HEAD 130d6b8f7. Nothing was executed (no tests, no build). Paths are relative to `/Users/diegorv/Dev/pet-projects/koko/brain`. Git evidence is cited by commit SHA because the plan files were deleted by the done+delete flow.

## Summary

1. Composer autocomplete was deliberately deferred twice and never started. Nothing in `.scratch` (live or archived) or in git contains a plan, discussion or Issue for it beyond one deferred line in the original merge plan and one line in ADR 0028.
2. The deferral reason recorded in history is exactly the two blockers this task names: "swap textarea to CodeMirror" and "IPC exposing vault entries to the composer webview". The original idea was to port the sibling quick-capture app's CodeMirror composer, not to reuse kokobrain's editor code (d3b14ae0c, plan lines P2.6, P2.7, P5.2).
3. The `EditorHost` seam was created for layering (ADR 0003 violations), not for a second editor surface. Its tag method was added later for tag completion. The seam makes the completion sources host-driven, which is the property a composer-side reuse would need.
4. The pure `.logic.ts` halves of both completions are already reused outside CodeMirror by Kanban (`KanbanWikilinkSuggestions.svelte:2-3`). That is the in-repo precedent for a textarea path.
5. The composer window has since gained constraints that any swap must preserve (draft persistence, saved/failed/unknown result flow, theme mirror, tests that query `textarea`).

## 1. History of the composer

| Commit | Date | What it fixed in place |
|---|---|---|
| 61db51a90 (P2.2) | 2026-05 | Bare route with autofocused textarea. Plan note: vault-path read deferred, stores do not cross webviews. |
| b697ca468 (P2.4) | 2026-05 | Esc and Cmd+Enter UI. Commit body: "The QC `Composer.svelte` is CodeMirror-backed for its wikilink autocomplete (P2.6 territory); for now we ship a plain textarea to mirror the kokobrain rule of 'extract files only when complexity justifies it'". Divergence list: "Textarea instead of CodeMirror (autocomplete moves with P2.6)". |
| 4e7d1fad7 (P2.5) | 2026-05 | Save goes through Rust `submit_composer_capture`, which emits `qc:capture-detected` to the main window. |
| 03ab8930f | 2026-05 | `dismiss` made idempotent. |
| e13806e1a | 2026-11 | Theme: main window mirrors CSS vars into shared origin localStorage (`kokobrain:theme-vars`), composer applies them on mount, summon and `storage` event. Evidence that the two webviews share an origin and localStorage. |
| df6b5f190 (Issue 01), 0a1c22a73 (Issue 12) | 2026-11-05 | Keep typed text on failure, round-trip ack `qc:composer-capture-result`, 3 s timeout, draft persisted at `kokobrain:composer-draft`. |

Current composer: `src/routes/composer/+page.svelte:14` (`text` state from `readDraft()`), `:34` (`$effect(() => writeDraft(text))`), `:161-171` (window keydown: Esc dismisses, Cmd/Ctrl+Enter saves), `:205-212` (the `<textarea bind:value={text}>`), `:152` (`text = readDraft()` on every summon), `:137-140` (`withoutWritten`).

## 2. Deferral trail (the only prior discussion)

- `d3b14ae0c` "docs(quick-capture): defer status toast (P3.4) and autocomplete to Phase 5". Quote: "Wikilink autocomplete was already deferred earlier in the session for the same reason (needs CodeMirror swap + vault IPC)". Adds `P5.2 - Wikilink [[ autocomplete in composer (was P2.6/P2.7). Swap textarea -> CodeMirror, port quick-capture/src/lib/wikilink/, add Rust IPC exposing vault entries to the composer webview.`
- Earlier plan lines (read from `20a8057cf^:tasks/todo/merge-quick-capture.md`, lines 44, 76, 77, 100): "P2.6 Port `src/lib/mentions/` wikilink parser ... autocomplete requires CodeMirror swap + Rust IPC to expose vault entries to the composer webview. Out of scope for this merge." The port map row (line 44) planned `quick-capture/src/lib/mentions/` -> `src/lib/plugins/quick-capture/mentions/` "as-is parsing; adapt source to call `get_all_vault_entries_v2` for path list". So the original design was: pure parser plus `get_all_vault_entries_v2` IPC from the composer.
- `docs/adr/0028-quick-capture-merge-into-kokobrain.md:47` ("Out of scope (Phase 5 follow-ups)"): "Wikilink `[[` autocomplete in the composer (requires CodeMirror swap + IPC exposing vault entries to the composer webview)". ADR lines 36 and 63: the composer is a separate webview and "cannot import `vaultStore`"; it saves through one extra IPC round trip.
- The plan was moved to `tasks/done/` in `20a8057cf` with P5.1 and P5.2 still unchecked, then the file was removed later (`27096bd09 Delete old issues`). `tasks/` does not exist in the tree now. No `.scratch` Issue replaced P5.2 (grep of `.scratch/archived`, `.scratch/open-itens`, `.scratch/frontmatter-rules`, `.scratch/tasks-view-ux`, `.scratch/mods-host-robustness` found composer mentions only in iOS and vault-mods research about the window, never about autocomplete).
- `.scratch/composer-autocomplete/` currently holds only the 13 scout reports from this run (untracked, per git status). There is no PRD, plan or Issue yet.
- Tag completion was never scoped for the composer in any Issue. The tags-obsidian-parity Issue 02 and its migrated audit Issue 143 mention only the editor (`.scratch/archived/audit-2026-11-05/issues/143-*.md`).

## 3. Why the EditorHost seam exists

- Created by commit `5bcbf6c0e` "refactor: editorhost facet and profiling port for the editor (Issue 31)" (architecture-stability). Motive in the Issue (read from `5bcbf6c0e:.scratch/architecture-stability/issues/31-editor-host-facet.md`): remove 15 ADR-0003 violations (core importing stores, services, Tauri, features, plugins) and let widget tests use a fake host. Its Notes: "this removes 15 ADR-0003 violations and lets widget tests use a fake host".
- Design decisions in that Issue and its discovery (`5bcbf6c0e:.scratch/architecture-stability/work/31/discovery.md`) that constrain this feature:
  - `editorHost` is a static Facet with `combine: v => v[0] ?? NOOP_HOST`, installed once outside every compartment, never reconfigured ("Performance trap: never reconfigure the host when settings change. `checkUpdateAction:21` rebuilds on any `t.reconfigured`").
  - "Host calls stay out of compute": no host method inside a StateField compute/update or decoration build. Only event handlers, `toDOM` and completion sources. Enforced by a counter test in `src/tests/lib/core/markdown-editor/editor-host.test.ts`.
  - Completion and the copy-block-link keymap live outside `livePreviewCompartment` and must work in source mode, which is why the host sits outside every compartment.
  - Guard test `src/tests/lib/architecture/markdown-editor-imports.test.ts:12-30`: no `.ts` under `core/markdown-editor/` may import a store, `.service`, `@tauri-apps/*`, `features/`, `plugins/` or `utils/debug`. Any composer reuse that needs Tauri calls must live outside that folder (composer route or a plugin file), or inject through a host.
  - Review 1 finding 7: `reportError` replaced `utils/debug.error` in completion; failed completion reads no longer reach Sentry (recorded as a known choice).
- Tag completion extended the seam in `a44f9f3a9` (Issue 143): `VaultTag`, `EditorHost.listTags()`, `NOOP_HOST.listTags`, `app/editor-host.ts` memoizing `get_all_tags_v2` per (vault path, `vaultIndexVersion`) (`src/lib/app/editor-host.ts:96-111`, `:195`). Discovery decision: the app host does not read `tagsStore` because it only rebuilds while TagsView is mounted (`TagsView.svelte:44`); it memoizes the IPC like `vault-entries.service.ts`. `listTags()` resolves `[]` while `vaultStore.indexReady` is false and includes the vault path in the memo key (vault switch window, `app-lifecycle.service.ts:344-352`). Those rules read `vaultStore`, so a composer-side `listTags` cannot reuse `app/editor-host.ts` as is (it imports main-window stores).
- Current interface: `src/lib/core/markdown-editor/editor-host.ts:44-76` (11 methods incl. `listTags`, `listLinkCandidates`, `resolveLink`, `readNote`). `NOOP_HOST` at `:87-98` resolves `[]`/empty candidates and rejects `readNote`. Facet at `:104-107`. The docs state the same: `docs/architecture/modules/src/lib/core/markdown-editor.md:50-53` (host call limits, only one `autocompletion()` extension allowed).
- No ADR mentions EditorHost (grep of `docs/adr` returns nothing). ADR 0003 holds the layer rules; the `app/` layer amendment (2026-11-01) is where the host implementation lives (`src/lib/app/**`).

## 4. History of the completion code (constraints for reuse)

- `0a47e8ca3` (Phase 11.5e): the wikilink source became async with a module-level entries cache keyed by index version; rationale: the source runs on every keystroke, a per-call IPC would cost about 50 to 100 ms per character. Constraint: a composer data path must also cache between keystrokes.
- `f3a63ec64` perf(vault): one version-keyed entries memo shared by completion, queryjs and the index listener (now `getVaultEntries()`, imported at `src/lib/app/editor-host.ts:24`).
- `d3d6a87c0` date shortcut: "the autocomplete config facet has NO combiner for override, so a second `autocompletion()` instance throws 'Config merge conflict'". The editor uses one shared instance at `setup/editor-extensions.ts` (sources: wikilink, date-shortcut, tag). Relevant only if the composer ever embeds a CodeMirror view: it would build its own instance and must not reuse the editor's `createExtensions` wholesale (it installs live preview, keymaps and more).
- `5bcbf6c0e` edited `extensions/wikilink/completion.ts` (33 lines) to read the host. `be9381ee0` (Issue 20) moved shared pure logic below features and touched `wikilink/completion.logic.ts`, `completion.ts`, `KanbanWikilinkSuggestions.svelte`: that is why Kanban can import the logic from `core/`.
- E2E `e2e/specs/wikilink-completion.spec.ts` (commit `73c8fbe4b`) asserts `.cm-tooltip-autocomplete` and `.cm-completionLabel` in the main editor. No E2E exists for the composer window.

## 5. Prior art outside CodeMirror

- `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:2-3, 15-30` uses `detectWikilinkContext` and `matchFilesForWikilink` from `core/markdown-editor/extensions/wikilink/completion.logic.js` with a plain textarea/input (props `text`, `cursorPos`, `onSelect`; keyboard handled by the parent through `handleKeydown`). Initial-commit origin (`b7358e712`), later touched by Issue 20 and Issue 15 (`3eb8f454a`). This proves the project already accepts "pure logic from core/markdown-editor consumed by a non-CodeMirror Svelte surface", and a plugins to core import is the allowed layer direction. It reads `fsStore` (main window store), so it cannot be dropped into the composer as is. Scout 08 in this folder covers its defects.
- Sibling quick-capture app at `/Users/diegorv/Dev/pet-projects/koko/quick-capture` (named in ADR 0028:12 and the plan's source list, line 122: `src/{routes/composer,lib/composer,lib/mentions,lib/wikilink}/`). UNVERIFIED in detail: it lives outside the working directory, so it was not opened. From commit text only: its `Composer.svelte` is CodeMirror-backed for wikilink autocomplete, with `lib/wikilink/` and `lib/mentions/` modules. Open question below.
- Shared-origin localStorage between the two webviews already carries the theme (`e13806e1a`; `src/routes/composer/+page.svelte:6,142-144`; `docs/architecture/modules/src/routes.md:19-20`). It is existing precedent for a main-window-to-composer data channel that needs no new Rust command or capability. UNVERIFIED: size limits and whether it suits vault-sized lists (scout 06 and 15 cover paths and payloads).

## 6. Decisions that constrain this feature

1. Owner constraint repeated in history: the composer must stay light. The first composer commit chose a plain textarea per "extract files only when complexity justifies it" (b697ca468). A CodeMirror swap was always the stated price of autocomplete in the earlier plan; the owner's current hard constraint 1 (reuse editor completion) pushes toward the CodeMirror/headless route or toward reusing only `.logic.ts`.
2. ADR 0028 keeps the kokobrain receiver (`executeCaptureAction`) as the only writer of captured notes, and the composer as a separate webview with no `vaultStore`. Any data reaches the composer through IPC (or shared localStorage), never through importing main-window stores.
3. ADR 0028 amendment (2026-11-05): the composer keeps unsent text in `kokobrain:composer-draft`, restores it per summon, waits for `qc:composer-capture-result` (3 s) and keeps text on failure. A replacement input must keep `text` as the single source of truth, `withoutWritten` semantics, and the Cmd/Ctrl+Enter and Esc handlers (the window listener at `+page.svelte:161-171` would also fire while a completion popup is open: Esc would dismiss the composer instead of closing the list. Scout 09 covers conflicts.)
4. `src/tests/routes/composer-page.test.ts` (459 lines) queries `textarea` directly (`:60, :139, :143-144`) and asserts `.textarea().value`; changing the control to a CodeMirror view would force a test rewrite. Keeping the `<textarea>` and layering a popup keeps those tests valid.
5. `src-tauri/capabilities/composer.json` was written to expose no filesystem, clipboard or extra IPC: "The popover only needs to invoke the submit and dismiss commands and listen for the open-composer and composer-capture-result events". Its description is a deliberate minimal-permission statement and would need an edit if new commands are called (scout 05).
6. Editor-side rules: one `autocompletion()` per view; host calls only from completion sources/handlers; the markdown-editor import guard forbids Tauri and stores inside `core/markdown-editor/*.ts`. Therefore a composer-specific host (an `EditorHost` implementation backed by IPC) must live outside that folder, for example in the composer route or `plugins/quick-capture/`. `NOOP_HOST` already shows the minimal shape: only `listLinkCandidates`, `listTags`, `readNote` and `resolveLink` are touched by completion, and the others can stay no-op.
7. Memory notes in the owner's index that bear on this work (user memory, not repo files): "No core changes for corner cases" (don't add core write-path behavior for rare failures), "Small issues merge directly", "Serial checks only", "Cargo builds throttled".

## 7. Reuse opportunities (history-supported)

- Headless or hosted reuse of `tagCompletionSource` / `wikilinkCompletionSource` through a small composer-side `EditorHost` (precedent: `editor-host.test.ts` builds views with `fakeHost`; `NOOP_HOST` exists). Works only if a `CompletionContext`/EditorView is available, which a textarea does not provide (scout 08 section 6 explores this).
- Pure `.logic.ts` reuse in a textarea (Kanban precedent). Needs a new popup and apply code, because `completion.ts` bits (`]]` handling at `wikilink/completion.ts:75-81`, alias options, heading and block modes) are not in `.logic.ts`.
- Data path precedents: `get_all_tags_v2` and `get_all_vault_entries_v2` already exist as IPC commands (plan line 44 chose `get_all_vault_entries_v2` for the composer's path list), and the per-version memo pattern (`0a47e8ca3`, `f3a63ec64`, `a44f9f3a9`).

## 8. Risks from history

- A CodeMirror swap touches the draft, result and theme logic added in Issue 12 and e13806e1a (risk of regression; the original deferral called it out).
- `core/markdown-editor` guard test fails if a Tauri or store import is added there; any refactor to make completion reusable inside that folder risks violating hard constraint 2 (no editor behavior change).
- Memo keys in `app/editor-host.ts:100` use `vaultStore.path` and `vaultIndexVersion`, which the composer does not have; a composer cache needs another freshness signal (scout 11).
- `reportError` in completion routes to the profiling port log (configured in `registerAppPorts`); in the composer webview the port is unconfigured, so errors would go to console only (UNVERIFIED: I did not read `profiling.ts` in this scout).

## 9. Open questions

1. Is the sibling quick-capture composer's autocomplete (CodeMirror, `lib/wikilink/`, `lib/mentions/`) a spec the owner wants matched, or only a historical source? Reading it requires a path outside the working directory, so the owner must grant it.
2. Does the owner count porting QC's `mentions/` parser as "reusing existing completion code", or only kokobrain's editor files (`extensions/tag`, `extensions/wikilink`)? The earlier plan assumed the former; the current constraint says the latter.
3. Should the composer reflect P5.2's original scope (wikilinks only) plus the new tag scope, and does `[[` heading/block-id modes (`#`, `#^` inside links) belong, given the composer cannot read notes (`readNote`) without a new capability?
4. Is it acceptable to edit `composer.json` and add a Rust command, given ADR 0028's "no other IPC" intent? (Scout 05 and 04.)
