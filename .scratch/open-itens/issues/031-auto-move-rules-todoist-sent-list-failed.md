# 031: Auto-move rules: a failed load is never saved over the file

**Origin:** `audit-2026-11-05` Issue 116, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/audit-2026-11-04/issues/14-aux-json-load-failure-guard.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs an unparseable file. It keeps its Blocked-by 03, and it also covers sections 1-2 of Issue 32.

**Audit check at `5f8003d67`:** still_present (content, low). loadAutoMoveConfig's catch sets DEFAULT_CONFIG with no flag (src/lib/features/auto-move/auto-move.service.ts:61-64); saveAutoMoveConfig writes the store unconditionally (:70-88). No loadFailed flag in src/lib/features/auto-move.

**Stale in the text below:** Line ranges shifted by one: auto-move load is :42-65 (Issue :41-64), save :70-88 (Issue :69-87). Still Blocked by Issue 03. The new 'flush on destroy' Issue for AutoMoveSection must respect the guard this one adds.

**What to build:** When .kokobrain/auto-move-rules.json exists but cannot be read or parsed, the app must not later write its empty in-memory state over that file. loadAutoMoveConfig (src/lib/features/auto-move/auto-move.service.ts:41-64) tells 'missing/blank' (defaults, fine to write) apart from 'unreadable/unparseable'. In the second case it sets a loadFailed flag on autoMoveStore and shows a toast. saveAutoMoveConfig (:69-87) refuses to write for the rest of the session (same policy as settings.json, Issue 03). AutoMoveSection.svelte shows an inline error and disables its edits while loadFailed is set.

**Blocked by:** 030

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, in src/tests/lib/features/auto-move/auto-move.service.test.ts with the real autoMoveStore. readTextFile resolves to '{"rules": [' (syntax error), then await loadAutoMoveConfig('/vault'), autoMoveStore.addRule(rule), await saveAutoMoveConfig('/vault').catch(() => {}). Expect writeTextFile not called with '/vault/.kokobrain/auto-move-rules.json'. It fails today.
- [ ] The same holds when readTextFile rejects.
- [ ] A missing or empty auto-move-rules.json still loads defaults, and the first save creates the file (existing tests at :80-89 stay green). Update the corrupt case at :91-100 to the new contract and record that change in the commit.
- [ ] The user gets a toast naming the file that could not be loaded.
- [ ] Frontend gate: pnpm check, pnpm vitest run and pnpm build all pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/archived/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 2 of the parallel plan.
- **Finding `automove-rules`:** real, medium. Root cause: loadAutoMoveConfig handles a read or parse error by setting DEFAULT_CONFIG in the store, the same result as a missing file, and keeps no record of the failure. saveAutoMoveConfig then writes the store over the file after the user's next edit. No toast tells the user the rules were not loaded.
  Evidence: src/lib/features/auto-move/auto-move.service.ts:49-63: readTextFile, then JSON.parse at :54. The catch at :60-62 only logs through error() and calls setConfig({...DEFAULT_CONFIG}). saveAutoMoveConfig :69-81 writes autoMoveStore.rules/excludedFolders unconditionally. Its triggers are AutoMoveSection.svelte addRule, updateRule (debounced), removeRule, moveRuleUp/Down and the excluded-folder edits, all calling saveConfig() at :33-38. Load runs at app-lifecycle.service.ts:292. Test auto-move.service.test.ts:91-100 asserts the silent reset.
- **Blocking edge:** Reuses the load-outcome policy that Issue 03 establishes for settings.json.
- **Owner decision (2026-11-04):** Same policy as settings.json (D3 a): a file that failed to load is never written in that session; the user gets a toast and the related edits are disabled.
- Related sites found by the sweep, which share the 'parse failure = empty' pattern but are left out on purpose. bookmark-migration.service.ts:22-34 and :102 deletes a bookmarks.json that is not valid JSON. That is documented, deliberate behavior (ADR 0033 migration), so changing it needs a separate owner call. kanban.logic.ts:142-146 turns a malformed %% kanban:settings %% block into {}, and the first settings change rebuilds the block (:290-295). The loss is low impact (board settings only, lanes kept). recent-icons.json (file-icons.service.ts:44-71) is low impact and rebuilds from use. Do not mock auto-move.store or auto-move.logic.
- **Size:** M.

## Comments

- 2026-11-06: migrated from `.scratch/archived/audit-2026-11-04/issues/14-aux-json-load-failure-guard.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-10: the Todoist half (`todoist-sent.json`, `loadSentTasks` / `saveSentTasks`) was removed by `todoist-bisync` Issue 15, which deleted that code: the two-way sync never reads or writes the file. Only the auto-move half remains; the file name keeps its old slug so links to it hold.
