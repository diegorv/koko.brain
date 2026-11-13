# Validation group 5: scouts 09 (keyboard), 12 (written note content), 18 (E2E)

Adversarial check at HEAD 130d6b8f7. Read-only; nothing was run. Library line numbers are `dist/index.js` of @codemirror/autocomplete 6.20.4, @codemirror/view 6.43.15, @codemirror/commands 6.11.1 (versions confirmed in each `package.json`).

## Scout 09: keyboard conflicts

### Confirmed

- Composer key handling: `<svelte:window on:keydown={onKeyDown}>` at `src/routes/composer/+page.svelte:202`; `onKeyDown` at `:161-171` never reads `defaultPrevented`, `target` or `isComposing`. Svelte `event()` builds `{ capture, passive }` with `capture` undefined (`node_modules/svelte/src/internal/client/dom/elements/events.js:121-122`). The wrapper also skips the handler when `event.cancelBubble` is set (`events.js:65`), so a `stopPropagation()` from CodeMirror reliably suppresses it.
- CodeMirror listens on `contentDOM` (view 4630-4645). `InputState.runHandlers` calls `preventDefault()` only, never `stopPropagation()` (view 4614-4628). The keymap `runHandlers` stops propagation only for a binding with `stopPropagation` (view 9249-9311, the call is at 9309-9310).
- `autocompletion()` already installs `completionKeymap` at `Prec.highest` (autocomplete 2046-2053, 2074; `defaultKeymap: true` at 384). The editor's extra `...completionKeymap` (`src/lib/core/markdown-editor/setup/editor-extensions.ts:164`) is deduped by the `ran` Set (view 9262-9264).
- `defaultKeymap` binds `Escape -> simplifySelection` (commands 1805) and `Mod-Enter -> insertBlankLine` (1806). `standardKeymap` (1743-1769) has neither. Its `Enter -> insertNewlineAndIndent` is at 1762.
- The `buildKeymap` merge (view 9206-9228) makes Option A work as described: a run-less `{ key: 'Escape', stopPropagation: true }` sets the flag on the merged `Escape` binding at any precedence.
- `acceptCompletion` and `interactionDelay` 75 ms (autocomplete 1096-1104, 393). `closeOnBlur` blur handler (1270-1279). `commitCharacters` always returns false (1294-1307). The tag and wikilink sources set no commit characters (`tag/completion.ts:35-40`, `wikilink/completion.ts:118-123`).
- Rust hide paths: `dismiss_composer` (`src-tauri/src/quick_capture/commands.rs:422-431`) and `intercept_close_as_hide` (`src-tauri/src/lib.rs:95-103`). Window 600x240 (`lib.rs:135-153`).
- Test helper `press()` dispatches at `window` (`src/tests/routes/composer-page.test.ts:148-150`).

### Refuted or wrong

- **Esc after typing (wrong conclusion).** Finding 3 says `closeCompletion` returns false "with no popup and no pending query", so Esc falls through, and calls the pending case "same as the editor". In practice the pending case covers ordinary typing in the composer:
  - Every `input.type` transaction moves every override source from Inactive to Pending (`getUpdateType` autocomplete 955-956, `ActiveSource.update` 974-975). This happens on every keystroke, even on a line with no `#` and no `[[`.
  - The sources start only after the `activateOnTypingDelay` debounce, 100 ms by default (379, plugin 1179-1181). The tag source then adds a `listTags()` IPC round trip when `#` is on the line.
  - During that time `closeCompletion` returns true (1116-1122). With Option A or Option B, an Esc pressed within roughly 100 ms of the last keystroke closes an invisible pending query and the composer stays open, so the user has to press Esc twice.
  - In the editor Esc does nothing else, so nothing is lost there. In the composer Esc is "dismiss", so both proposed fixes change dismiss behavior beyond "Esc with an open popup".
  - A guard keyed on a visible popup avoids this. One option is a composer `Prec.highest` Escape command, listed before `autocompletion()`, that returns false when `currentCompletions(state).length > 0` and otherwise dismisses. Another is a window guard that checks whether the popup was open. Both are UNVERIFIED and need a jsdom test (see Gaps).
- **Wrong reference (minor).** Finding 3 points to `keyName` at "view 9140-9148 area". `keyName` comes from `w3c-keyname` (imported at view line 3, `node_modules/.pnpm/w3c-keyname@2.2.8/.../index.js:101-119`), and the modifier prefixing is `modifiers()` at view 9138-9147. The conclusion (`Meta-Enter` does not match `Enter`) still holds.
- **Wrong reference (minor).** Finding 4 gives `defaultKeymap` as 1796-1822. The array is 1796-1816 (`.concat(standardKeymap)` at 1816), and 1824 is `indentWithTab`.

### Gaps

- **Undo is lost.** The textarea gets native Cmd+Z today. The editor adds `history()` and `...historyKeymap` (`editor-extensions.ts:133`, `:163`). A CodeMirror composer without them changes undo, which constraint 3 rules out. Scout 09 does not list `historyKeymap` with `standardKeymap`. Whether native contenteditable undo works under CodeMirror without `history()` is UNVERIFIED.
- **closeBrackets differs.** The editor's `closeBrackets()` and `closeBracketsKeymap` (`editor-extensions.ts:138`, `:158`) auto-insert `]` when `[` is typed. The completion `apply` skips `]]` when they are already there (`wikilink/completion.ts:75-76`). Without closeBrackets, typing `[[Wel` + Enter still yields `[[Welcome]]`. Typing without accepting leaves `[[Wel` unclosed, which matches the textarea today. This is a parity choice for the owner, not a conflict.
- **Existing tests break.** The composer unit tests drive a `<textarea>` through `textarea()` / `type()` (`composer-page.test.ts:142-146`). A CodeMirror swap invalidates those helpers, not only the Esc case. A jsdom precedent for keydown on `contentDOM` exists (`src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts:209-210`), so Option A (and the pending-Esc fix) can be pinned in vitest.
- **Two-way text sync.** `text` is reassigned at `+page.svelte:113`, `:130` and `:152` (written-text removal and draft restore). Scout 09 only covers doc to `text`. The reverse direction (rune to doc) is also needed, or the view keeps showing text that was already saved.
- **Alt-i / Alt-\` checked, no conflict found.** `w3c-keyname` uses `event.key`, which is `Dead` for dead keys on a US mac layout. The base-key fallback is skipped for mac Alt-only combos (view 9286-9290). So the mac `Alt-i` / ``Alt-` `` `startCompletion` bindings do not eat accent dead keys. This was not checked on non-US layouts (UNVERIFIED).

## Scout 12: what is written to the note

### Confirmed

- Raw body path: `+page.svelte:86`, `:102`. Rust `submit_composer_capture` only checks `trim().is_empty()` (`commands.rs:474`) and builds JSON with `build_composer_note_payload` (`:439-454`), then emits it as an event.
- `buildCaptureAction` builds `common` without `tags` (`src/lib/plugins/quick-capture/quick-capture.service.ts:130-137`) and `{ kind: 'note', text }` (`:140-142`).
- `renderCaptureBody` for `note` returns `action.text` plus an optional footer (`src/lib/features/deep-link/deep-link.logic.ts:256-262`, footer `:309-316`).
- `executeCaptureAction`: `:165-166`, `vars.content = body` (`:174`), `processCaptureTemplate` (`:193`), `processed + '\n' + body` (`:194`), `injectTags` false for composer captures (`:201`), `applyExplicitOrganization` (`:210`), write and notify (`:213-216`, `:225`), all in `src/lib/app/deep-link-actions.ts`. `processTemplate` is a single `replace` pass (`src/lib/utils/template.ts:28-30`).
- `notifyAfterSave` calls `applyNoteChange({ source: 'save' })` (`src/lib/core/editor/editor.hooks.ts:67-92`), which calls `update_note_in_index` (`note-change.service.ts:237-240`).
- Rust tag rule (`src-tauri/src/vault/parsing.rs:456-501`, strip at `:513-526`) and link parser (`:1081-1142`). TS mirror: `WIKILINK_REGEX` (`wikilink-resolution.logic.ts:151`) and `parseWikilinks` (`:154`).
- Insert strings: `label + ']]'` with `]]` skipped (`wikilink/completion.ts:71-82`), `noteName|alias` (`:100-108`), heading (`:157-168`), block id (`:209-220`).
- `TAG_PREFIX_RE` (`tag/completion.logic.ts:22`) matches `INLINE_TAG_REGEX` (`src/lib/utils/tag-extraction.ts:7-8`). No `<% content %>` usage outside tests (grep over `src`, `docs`, `e2e`).
- Open question resolved: `navigation.logic.ts` has no imports (only `HEADING_RE` / `BLOCK_ID_RE`, lines 6 and 14). `wikilink/completion.logic.ts` imports only a type from `file-entries.logic.js`, `fuzzy-match.js` and `navigation.logic`, so it is pure. `getNoteName` (`wikilink-resolution.logic.ts:4`) pulls in only a type import.

### Refuted or wrong

- **Risk 4 is wrong under the default config.** It says a tag in a body that starts with a `---` block is "invisible both in completion and in the index". The default Quick Capture settings set a `note` template (`src/lib/core/settings/settings.store.svelte.ts:37`, `_system/templates/quick-capture/Composer-Note.md`). When that file exists, the body is appended after the processed template (`deep-link-actions.ts:194`). The composer's leading `---` block is then no longer at the start of the file, and Rust `frontmatter_range` only matches at the start (`parsing.rs:41-53`). So completion refuses those tags (`tag/completion.logic.ts:56-58`), but the indexer indexes them. This is an edge case: the two agree only when no template is read, and the template read failure is swallowed at `deep-link-actions.ts:195-197`.
- **"Equals the indexer rule" is close, not exact.** TS uses `\p{L}` and `\s`; Rust uses `char::is_alphabetic()` (the Alphabetic property, which includes some combining marks) and `char::is_whitespace()` (`parsing.rs:466`, `:475`, `:484`). This is pre-existing and the editor has the same gap, so it is not a composer issue.

### Gaps

- **The completion wrappers cannot be imported for free.** `tag/completion.ts:2-3` and `wikilink/completion.ts:5-6` import `../../editor-host` (only `@codemirror/state` plus types, `editor-host.ts:1-4`) and `../live-preview/core/profiling` (`reportError`, `profiling.ts:36-39`, a module-level port that only logs to the console until configured). Reusing `tagCompletionSource` / `wikilinkCompletionSource` unchanged in a CodeMirror composer needs only an `editorHost.of(composerHost)` that implements `listTags`, `listLinkCandidates`, `resolveLink` and `readNote` (`editor-host.ts:44-76`). Scout 12 frames reuse as logic-only. The whole source can be reused if the composer uses CodeMirror.
- **Link resolution ignores the capture's folder.** `resolveWikilink(target, allFilePaths, vaultRoot)` (`wikilink-resolution.logic.ts:64`) takes no source path, so where the capture note lands does not change what `[[Name]]` resolves to. This strengthens scout 12's verdict.

## Scout 18: E2E feasibility

### Confirmed

- `scripts/e2e.sh:40`, `:46`, `:89`, `:116`. `e2e/playwright.config.ts:5-24`. Playwright `^1.64.1` (`package.json:84`). CI runs 4 shards (`.github/workflows/e2e.yml:27`, `:57`).
- Mock aliases in `vite.config.js:57-67`, applied at about `:135`, with the optimize exclude at about `:116-129`. `ipc.ts:1-2` imports the aliased `invoke` / `listen`.
- `tauri-core.ts` imports `virtual-fs` and `vault-index` (`:14-15`), so a bare `/composer` load registers `window.__e2e.fs` (`virtual-fs.ts:299-301`), `__e2e.vaultIndex` (`vault-index.ts:690-694`) and `__e2e.events` (`tauri-event.ts:44-47`). `populate` triggers `rebuildAll` (`vault-index.ts:672-676`, `:366-375`).
- Handlers: `Handlers` type `:470`, `HANDLERS` `:472`, `get_all_tags_v2` `:491` (impl `:155`), `get_all_vault_entries_v2` `:485` (impl `:127`). The composer commands are no-ops (`:558-561`, `handleQuickCaptureNoop` `:453`). The unknown-command warning is at `:584`.
- Console guard allowlist is empty (`e2e/fixtures/console-guard.ts:21`).
- `src/routes/+layout.svelte:1-7` and `+layout.ts:5` render no app shell, so `/composer` boots bare. `TEST_FILES` / `TEST_VAULT_PATH` (`e2e/fixtures/test-vault.ts:21`, `:126`).
- `wikilink-completion.spec.ts` has 50 lines and 3 tests, and is the only spec using `.cm-tooltip-autocomplete` (grep over `e2e/`). No spec mentions the composer except a template path in `deep-link.spec.ts:8`.
- Tooltip `position: fixed` and `windowSpace` uses `documentElement.clientHeight` (view 10395-10398, 10403).
- `qc:open-composer` payload is a `string` (`src/lib/contracts/events.ts:54`).

### Refuted or wrong

- **Wrong reference (minor).** Section 4 gives the tag option shape `type: 'keyword'`, `filter: false` at `tag/completion.ts:43-46`. The file has 41 lines; the options are at `:38` and `filter: false` at `:39`.
- **Wrong reference (minor).** Section 4 says `listTags` calls `get_all_tags_v2` "keyed by `vaultStore.path` and `vaultIndexVersion`" (`editor-host.ts:100-110`). That key is the memo key (`:99`; the code at `:98-99`). The command itself takes no args (`src/lib/contracts/commands.ts:103`, `:284`) and reads whatever index Rust holds. It also returns `[]` until `vaultStore.indexReady` (`:98`). This matters because a composer host cannot reuse that gating.

### Gaps

- **Esc timing makes naive tests flaky.** Given the pending-state finding under scout 09, an E2E or unit case like "type then Esc dismisses" depends on timing: Esc within about 100 ms of typing goes to `closeCompletion`. Tests should wait for a visible tooltip before the "Esc closes popup" case. For the "Esc dismisses" case they should wait until `completionStatus(state) === null`, or a fixed time longer than `activateOnTypingDelay`. The current scout 18 plan does not say this.
- **The Esc case can be a vitest case instead of E2E.** The jsdom keydown-on-`contentDOM` precedent (`editor-extensions.test.ts:209-210`) and the mocked `call` (`composer-page.test.ts:5-8`) make "Esc with popup open does not call `dismiss_composer`" testable without the `tauri-core.ts` recorder. The E2E recorder is then optional.
- **No E2E can catch a wrong production data source** (scout 18 risk 1-2, agreed). The claim that app commands are not gated per capability rests on `src-tauri/build.rs:23` calling plain `tauri_build::build()` with no app manifest. The Tauri default ("commands are allowed for all windows unless an app manifest restricts them") is from memory, UNVERIFIED against the docs.
