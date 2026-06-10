# Negative Patterns Remediation

Fixes for verified negative patterns found in a stack-aware audit of the codebase
(Svelte 5 reactivity, CodeMirror live-preview, Tauri service/IPC, Rust backend,
test suite). Only findings that were manually verified against the source are
listed here; agent-reported items that turned out to be false positives were
discarded (see Notes).

Tasks are ordered from simplest/lowest-risk to most invasive/complex. One commit
per task, run the relevant tests before each commit (Quick Reference rule 6).

## Tasks

- [x] Task 1: Replace `console.*` with `appendLog`/`debug` in non-debug code
      Swap `console.error`/`console.log` for the project logger so failures are
      persisted to the session log.
      Files: `src/lib/core/layout/tauri-listeners.service.ts` (:31,:64,:102,:107,:128,:135),
      `src/lib/core/keybindings/global-keybindings.ts` (:106,:112,:129,:130,:131,:132 — `.catch(console.error)`),
      `src/lib/features/copy-block-link/copy-block-link.service.ts` (:37,:59),
      `src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts` (:25).
      Leave `debug-composition.ts` (intentional dev tool) and `utils/log.service.ts`/`utils/debug.ts` (logger infra) untouched.
      Tests: update/extend the existing service tests to assert the logger is used.

- [x] Task 2: Add `isConnected` guard to QueryJS widget cache re-attach
      `queryjs-block-widget.ts:85` does `if (cached) { container.appendChild(cached) }`
      with no `isConnected` check. Two identical visible queryjs blocks make the
      second steal the first's DOM via `appendChild`. Mirror the
      mermaid/collection/block-math pattern: `if (cached && !cached.isConnected) { ... }`,
      else fall through to fresh execution.
      File: `src/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.ts:84-89`.
      Tests: add a widget test with two identical blocks asserting both render content.

- [x] Task 3: Cache InlineMathWidget renders (parity with BlockMathWidget)
      `inline-math-widget.ts` calls `katex.renderToString` in every `toDOM()` with
      no cache, re-rendering identical formulas on viewport re-entry. Add a
      module-level cache keyed by formula (same approach as `BlockMathWidget`'s
      `mathCache`), or the live-DOM re-attach pattern.
      File: `src/lib/core/markdown-editor/extensions/live-preview/widgets/inline-math-widget.ts`.
      Tests: assert a second `toDOM()` for the same formula reuses the cached render.

- [x] Task 4: Add `vaultIndexVersion` `$effect` to BacklinksPanel and OutgoingLinksPanel
      Both panels only fetch on expand click and reset on path change; neither
      re-fetches when `vaultStore.vaultIndexVersion` bumps (watcher / other-tab
      edits). CLAUDE.md § "Reactive consumer pattern" names both as panels that
      MUST follow the `vaultIndexVersion` pattern. Add an `$effect` that reads
      `vaultStore.vaultIndexVersion` and re-invokes the fetch under `untrack()`,
      only while `expanded` and for the active markdown tab.
      Files: `src/lib/features/backlinks/BacklinksPanel.svelte:31-37`,
      `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:28-34`.
      Tests: component/store tests asserting a version bump triggers a refetch.

- [x] Task 5: Harden async service flows against stale/cross-vault writes
      Trace the full execution chain first (CLAUDE.md "Removing or Refactoring Code"
      mandatory checks) before changing orchestration; write a regression test
      capturing current behavior first.
      5a. `search.service.ts:365-394` — `activeBuildPromise` is reused across vault
          switches; a build started on vault A can resolve into vault B's UI.
          Scope the inflight promise per-vault or clear it on vault teardown.
      5b. `app-lifecycle.service.ts:291-310` — `buildSemanticIndex()` is called
          inside `.then()` but not returned/awaited, so its rejection escapes the
          outer `.catch`. Chain it (return the promise) so failures surface a toast.
      5c. `deep-link.service.ts:242,256,415` — `void refreshTree()` suppresses
          errors; surface failures (log + inline/toast) so a captured note that
          fails to appear is not silent.
      Tests: add error-path tests for each (invoke rejects, vault switch mid-build).

- [x] Task 6: Test-suite remediation — remove store/logic mocks, add state assertions
      Largest/most invasive task; split into sub-commits per file if needed.
      6a. Remove store mocks, use real stores + assert real state:
          `global-keybindings.test.ts` (7 stores), `tauri-listeners.service.test.ts`
          (settings-panel.store), `command-palette.service.test.ts` (settings-panel.store),
          `profiling.test.ts` (settings.store).
      6b. Remove `.logic.ts` mocks: `collection-block-widget.test.ts` (collection.store
          + collection.logic), `deep-link.service.test.ts`, `deep-link.service.race-audit.test.ts`,
          `wikilink-navigation.test.ts` (periodic-notes.logic).
      6c. For call-only tests (`toHaveBeenCalled()` as the sole assertion), add a
          companion assertion on resulting store state / rendered content. Start
          with `global-keybindings.test.ts` (majority are call-only).
      Tests: the test files themselves; ensure `pnpm vitest run` stays green.

## Notes

### Verified findings (this plan)
All tasks above were confirmed by reading the source, not just agent output.

### Discarded false positives (do NOT action)
- "4 live-preview plugins missing the viewport scroll guard" (footnote/image/
  wikilink-embed/meta-bind-input). `checkUpdateAction` (`core/check-update-action.ts:21`)
  already returns `'none'` for any `viewportChanged` update, centrally, for all 27
  plugins. The explicit per-plugin guard in CLAUDE.md is now redundant; these
  plugins are correct.
- "semantic.rs:338 `guard.unwrap()` panics on lock poisoning". `BUILD_LOCK` is a
  `tokio::sync::Mutex` (no poisoning), `try_lock()`'s error case is already handled
  at line 330, so the `unwrap()` at 338 cannot panic.
- "CalloutTypeSwitcherWidget leaks a document mousedown listener". `destroy(dom)`
  removes it via `__cleanupDocListener`; toDOM/destroy are balanced. Correct pattern.

### Lower-confidence items folded into Task 5
The Rust `remove_entry` tags/properties pruning concern and several other
service-layer race claims were reported but not conclusively reproduced. Task 5
mandates tracing + a regression test before any change, per CLAUDE.md.
