# 49: The mod run log is a live region before its first line arrives

**Origin:** review of Issue 37 (`.scratch/ux-quick-wins/work/37/review.md`, finding 2), 2026-11-18.

**What to build:** The run view's log box (`src/lib/plugins/mods/ModActionPicker.svelte`, the `role="log"` div under `{#if run.lines.length > 0}`) mounts together with its first line. Some screen readers do not announce content that arrives in the same update as a newly inserted live region, so the first log line of a run can go unannounced. Render the `role="log"` container whenever a run is shown and keep only the lines conditional. The empty box must not add visible space before the first line (for example no padding or background while it is empty), so the empty-run layout stays as it is.

Not in this ticket: the load time shown only in a tooltip (`ModsStatusList.svelte`, owner default 37.1, P169).

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first: with a run shown and no lines yet, `[data-mod-run-log]` exists with `role="log"`; a line added later renders inside that same element.
- [x] A run with no lines shows no visible log box (no padding or background while empty); existing `ModActionPicker.test.ts` tests stay green.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass; `bash scripts/e2e.sh vault-mods.spec.ts` passes.

## Evidence

- `ModActionPicker.svelte` at a52bc3d78: `{#if run.lines.length > 0}` wraps the `role="log"` div, so the live region and its first child are inserted in one update.
- Review 37 marked it optional and outside Issue 37's criteria, which only asked for `role="log"`.

## Comments

- 2026-11-18, triage: ready-for-agent. Accepted by the owner as written.
- 2026-11-19, issue/49-mod-run-log-live-region-mounts-early: `[data-mod-run-log]` (role="log") now mounts with the run, before its first line, and stays invisible while empty. Review round 1 APPROVED (comment wording fix applied at ModActionPicker.svelte:136; the Playwright bounding-box suggestion was declined as out of scope); fix round ran; round 2 APPROVED with no findings. Tests: pnpm check 0 errors; ModActionPicker.test.ts 41 passed; full suite at 120dbc646: 665 files, 17863 tests passed, exit=0.
