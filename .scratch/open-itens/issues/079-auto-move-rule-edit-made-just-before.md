# 079: An Auto Move rule edit made just before Settings closes or changes section is still written to auto-move-rules.json

**Origin:** `audit-2026-11-05` Issue 117, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Every rule field edit calls updateRule (src/lib/features/auto-move/AutoMoveSection.svelte:61-64), which updates autoMoveStore at once and arms a 500 ms timer (saveConfigDebounced, :42-47). The section unmounts when Settings closes (src/lib/app/SettingsPanel.svelte:101-105 Esc, :110 `{#if settingsPanelStore.isOpen}`) or another section is selected (SectionContent derived from the section map at :68-87). onDestroy (:25-27) only clears the timer, so saveAutoMoveConfig never runs for that edit. The store keeps the new rule, so it works until restart; loadAutoMoveConfig, called only at vault open (src/lib/app/lifecycle/app-lifecycle.service.ts:292), then brings the old rule back. Fix direction: on destroy, flush a pending debounced save instead of dropping it (run saveConfig when a timer is pending). Keep whatever load-failed guard Issue 14 adds in force for the flushed save.

**Blocked by:** 031

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/auto-move/AutoMoveSection.test.ts (new, jsdom, same mount/settle style as AutoMoveRuleRow.test.ts in that folder; mock only @tauri-apps/plugin-fs): vaultStore.open('/vault'), autoMoveStore.setConfig with one rule, mount AutoMoveSection, fire an input event on the destination field with 'Archive/2026', unmount at once, advance fake timers by 1000 ms; writeTextFile was called with '/vault/.kokobrain/auto-move-rules.json' and JSON holding destination 'Archive/2026'. It fails today.
- [ ] A switch toggle followed by unmount within 500 ms is written too.
- [ ] Typing without closing still writes once per 500 ms pause, not per keystroke.
- [ ] Add, remove and reorder keep saving immediately.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** corner case (bucket 4-corner). Upheld ux/low. It needs a close within 500 ms. The flush on destroy must respect Issue 14's load-failure guard.
- **Trigger:** In Settings > Auto Move the owner toggles a rule's switch, picks its icon, or types in its name, expression or destination, then presses Esc or clicks another settings section less than about half a second later.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/auto-move/AutoMoveRuleRow.svelte:69, :73, :112, :137 (name, switch, expression, destination call onupdate per input), :45-46 icon; src/lib/features/auto-move/AutoMoveSection.svelte:61-64 updateRule -> :42-47 500 ms timer; :25-27 onDestroy clearTimeout only; :33-39 saveConfig is the only writer; src/lib/app/SettingsPanel.svelte:101-105 Esc closes, :110 `{#if}` unmounts the section after the 200 ms fly outro, :68-87 section map swapped on section change; src/lib/features/auto-move/auto-move.service.ts:70-88 saveAutoMoveConfig; :42-65 load; src/lib/app/lifecycle/app-lifecycle.service.ts:292 only load site; no quit hook saves the config (rg saveAutoMoveConfig: only AutoMoveSection).
- **Related Issues before the audit:** `.scratch/archived/audit-2026-11-04/issues/14-aux-json-load-failure-guard.md`
- **Second opinion:** upheld (ux, low). AutoMoveSection.svelte:25-27 onDestroy only clears the 500 ms timer that updateRule arms (:42-47, :61-64), so an edit followed by Esc or a section change inside 500 ms is never written. The store keeps it until restart. The lost item is a settings edit, not note content, and it needs a sub-half-second close. Corrections to apply while implementing: Category content -> ux.
- **Source:** audit 2026-11-05, domain `metadata`, finding `N-metadata-02` (from metadata-content-1, metadata-ux-3). Size S.

## Comments
