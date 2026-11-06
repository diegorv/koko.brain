# 14: Auto-move rules and Todoist sent list: a failed load must not be saved over the file

**What to build:** When .kokobrain/auto-move-rules.json or .kokobrain/todoist-sent.json exists but cannot be read or parsed, the app must not later write its empty in-memory state over that file. loadAutoMoveConfig (src/lib/features/auto-move/auto-move.service.ts:41-64) tells 'missing/blank' (defaults, fine to write) apart from 'unreadable/unparseable'. In the second case it sets a loadFailed flag on autoMoveStore and shows a toast. saveAutoMoveConfig (:69-87) refuses to write for the rest of the session (same policy as settings.json, Issue 03). AutoMoveSection.svelte shows an inline error and disables its edits while loadFailed is set. Do the same for loadSentTasks and saveSentTasks (src/lib/features/tasks/todoist.service.ts:103-131). There, also check that the parsed value is an array instead of casting it (:111).

**Blocked by:** 03

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, in src/tests/lib/features/auto-move/auto-move.service.test.ts with the real autoMoveStore. readTextFile resolves to '{"rules": [' (syntax error), then await loadAutoMoveConfig('/vault'), autoMoveStore.addRule(rule), await saveAutoMoveConfig('/vault').catch(() => {}). Expect writeTextFile not called with '/vault/.kokobrain/auto-move-rules.json'. It fails today.
- [ ] The same holds when readTextFile rejects.
- [ ] In src/tests/lib/features/tasks/todoist.service.test.ts (or the existing todoist test file), a corrupt todoist-sent.json followed by saveSentTasks does not replace the file's entries. A non-array JSON value is reported as a load failure, not stored.
- [ ] A missing or empty auto-move-rules.json still loads defaults, and the first save creates the file (existing tests at :80-89 stay green). Update the corrupt case at :91-100 to the new contract and record that change in the commit.
- [ ] The user gets a toast naming the file that could not be loaded.
- [ ] Frontend gate: pnpm check, pnpm vitest run and pnpm build all pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 2 of the parallel plan.
- **Finding `automove-rules`:** real, medium. Root cause: loadAutoMoveConfig handles a read or parse error by setting DEFAULT_CONFIG in the store, the same result as a missing file, and keeps no record of the failure. saveAutoMoveConfig then writes the store over the file after the user's next edit. No toast tells the user the rules were not loaded.
  Evidence: src/lib/features/auto-move/auto-move.service.ts:49-63: readTextFile, then JSON.parse at :54. The catch at :60-62 only logs through error() and calls setConfig({...DEFAULT_CONFIG}). saveAutoMoveConfig :69-81 writes autoMoveStore.rules/excludedFolders unconditionally. Its triggers are AutoMoveSection.svelte addRule, updateRule (debounced), removeRule, moveRuleUp/Down and the excluded-folder edits, all calling saveConfig() at :33-38. Load runs at app-lifecycle.service.ts:292. Test auto-move.service.test.ts:91-100 asserts the silent reset. Same pattern sibling: src/lib/features/tasks/todoist.service.ts:103-118 loadSentTasks returns [] on read or parse failure, and saveSentTasks :124-131 then writes the in-memory list over it, so tasks can be sent to Todoist twice.
- **Blocking edge:** Reuses the load-outcome policy that Issue 03 establishes for settings.json.
- **Owner decision (2026-11-04):** Same policy as settings.json (D3 a): a file that failed to load is never written in that session; the user gets a toast and the related edits are disabled.
- Related sites found by the sweep, which share the 'parse failure = empty' pattern but are left out on purpose. bookmark-migration.service.ts:22-34 and :102 deletes a bookmarks.json that is not valid JSON. That is documented, deliberate behavior (ADR 0033 migration), so changing it needs a separate owner call. kanban.logic.ts:142-146 turns a malformed %% kanban:settings %% block into {}, and the first settings change rebuilds the block (:290-295). The loss is low impact (board settings only, lanes kept). recent-icons.json (file-icons.service.ts:44-71) is low impact and rebuilds from use. Do not mock auto-move.store or auto-move.logic.
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/116-auto-move-rules-todoist-sent-list-failed.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
