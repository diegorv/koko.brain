# 82: Retention days and Debounce delay accept typed values and clamp on commit

**Migrated from:** `.scratch/ux-polish/issues/02-settings-number-fields-clamp-on-change.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Ux/low. It is input fine-tuning on fields edited rarely, and the stored value is already clamped.

**Audit check at `5f8003d67`:** still_present (ux, low). src/lib/core/settings/sections/FileHistorySection.svelte:8-10 (clampRetentionDays) and :38-40 (oninput writes clamp(Number(value)) at once; no onchange). src/lib/features/auto-move/AutoMoveSection.svelte:29-31 (clampDebounce) and :133-136 (oninput writes clampDebounce(Math.round(seconds*1000)); no onchange). Empty field gives Number('')=0, clamps to 1 day or 500 ms, the bound value changes, and Svelte rewrites the field, so clearing then typing '30' gives '130'. git log of both files (ccf65866b, ecd4cadc2, 48bf52fe9, 188c12932) shows copy/style changes only. Read-only audit, not run.

**Stale in the text below:** Line numbers match. Settings fields are edited rarely, and the glitch needs select-all, delete, then type; the stored value is clamped, so no corrupt data persists.

**What to build:** Two settings number fields clamp inside `oninput`: "Retention days" (`src/lib/core/settings/sections/FileHistorySection.svelte`, about line 38) and "Debounce delay" (`src/lib/features/auto-move/AutoMoveSection.svelte`, about line 133). Clearing the field to type a new value reads `Number('') = 0`, clamps it to the floor (1 day, 500 ms), and Svelte writes the floor back into the field with the caret at the end, so typing "30" into Retention days ends as "130". Change both fields so:
- `oninput` writes the parsed value only when it is finite and inside the field's range (retention: `Math.round` result in 1..365; debounce: `Math.round(seconds * 1000)` in 500..30000), and writes nothing otherwise (empty, a partial "0.", out of range);
- a new `onchange` clamps with the existing `clampRetentionDays` / `clampDebounce`, writes the result, and sets `e.currentTarget.value` to the committed value, because Svelte skips the DOM write when the bound value did not change (a commit of "999" with 365 already stored would otherwise stay on screen);
- an empty or non-numeric commit writes nothing and puts the stored value back into the field.

Raw-on-input (the EditorSection style) is not used here on purpose: EditorSection is raw for live preview (`src/tests/lib/core/settings/EditorSection.test.ts`, about line 78), these two fields have nothing to preview, and a raw `retentionDays` of 0 persisted before the commit would reach `cleanup_history` (`src/lib/app/lifecycle/app-lifecycle.service.ts`, about line 276).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: new `src/tests/lib/core/settings/FileHistorySection.test.ts` (real `settingsStore`, `type()` / `commit()` helpers as in `EditorSection.test.ts`). From the default 7: typing "" leaves the store at 7 and the field is not rewritten to "1" (fails today: the store becomes 1); typing "3" then "30" stores 30; typing "400" leaves 30, and committing it stores 365 and shows "365"; committing "0" stores 1; committing "" leaves the store unchanged and shows the stored value
- [ ] Failing first: new `src/tests/lib/features/auto-move/AutoMoveSection.test.ts` (real stores, only Tauri mocked). From the default 3000 ms: typing "" or "0" leaves 3000 (fails today: 500); typing "2" stores 2000; typing "45" leaves the previous value, and committing it stores 30000; committing "0.1" stores 500
- [ ] `min`, `max`, `step` and the descriptions of both fields are unchanged
- [ ] No other number field changes: EditorSection, HeadingTypographyEditor, EventCalendarSection and OneOnOneSection keep their behavior and tests

## Notes

- **Source:** review section 3 row "Number fields clamp on every keystroke" and section 2 "Settings row anatomy" ("number fields clamp on change"); `work/settings.md`.
- **Convention:** clamp on change is already the rule in EditorSection, HeadingTypographyEditor and EventCalendarSection (helpers in `settings.logic.ts`, about lines 54-70).
- **Out of scope:** OneOnOneSection's `Math.floor` on input (no snap-back, since it never raises the value); the Settings row layout work in section 2.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/02-settings-number-fields-clamp-on-change.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
