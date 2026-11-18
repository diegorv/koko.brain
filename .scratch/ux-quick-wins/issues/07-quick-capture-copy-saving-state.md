# 07: Quick Capture says what it does and shows Saving (copy and state only)

**Origin:** design review 2026-11-17, proposal P15 (copy and the Saving state; the draft part is ticket 45) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/feedback-components.html` (P15), research `.scratch/ux-quick-wins/research/verdict-feedback-a.md` (Q2) and `breakdown.md` (old ticket 05, first part).

**What to build:** one file, `src/routes/composer/+page.svelte`. This ticket must not change draft persistence, add a Discard control, add a "Draft restored" note, add a "Saved" hold or touch `SAVE_FLASH_MS`: all of that is ticket 45.

1. **Honest hints.** Esc hides the window and keeps the draft (the draft is stored on every keystroke, `:41`, and restored on the next summon, `:56-71,:166-186`), so "cancels" is wrong. The three hints at `:250-256` become:
   - default: `Esc hides (draft kept) · ⌘↩ saves` (was `ESC cancels · ⌘↩ saves`);
   - failed (`role="alert"`): `Could not save. ⌘↩ retries, Esc hides (draft kept).`;
   - unknown (`role="alert"`): `Save not confirmed. ⌘↩ saves again, Esc hides (draft kept).`
   The comment at `:136-137` ("so Cmd+Enter retries and Esc cancels") is reworded to match.
2. **Saving state.** `saving` (`let saving = false`, `:26`) becomes `$state(false)`. While a save waits for its result (up to `RESULT_TIMEOUT_MS`, 3 s, `:14`) the hint reads `Saving...` (`saving` is set at `:110` and cleared at `:135`, `:150` and `:182`). It must not read "Saving..." during the 180 ms confirmed-save flash (`saving` stays set through it, `:142-145`), so the condition is `saving && !saved`; the error hints keep priority over the default and over "Saving...", and a retry clears `saveProblem` first (`:103`), so "Saving..." replaces an error hint while the retry waits.
3. **Unchanged.** The draft stays in localStorage under the same key; no Rust, no DTO change, no store; Esc, Cmd+Enter, the saved ring, `withoutWritten` and the double-capture guard behave exactly as today.

Not in this ticket: "Draft restored" and Discard, the 600 ms "Saved" hold, Esc during the hold (ticket 45); "Saved to <folder>/<name>", clipboard and deep-link feedback (need a Rust DTO change and `tauri-plugin-notification`, deferred); a clear-draft shortcut (dropped by the review).

**Size:** S.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes (none expected: the composer has no E2E spec).

- [ ] Failing test first, `src/tests/routes/composer-page.test.ts`: the default hint is `Esc hides (draft kept) · ⌘↩ saves` and neither error hint contains "cancels". The pins at `:107-108` (`ERROR_TEXT`, `UNKNOWN_TEXT`), `:271` and `:429` are updated on purpose to the new strings.
- [ ] With `mockSubmit('silent')` (no result arrives), after Cmd+Enter the hint reads `Saving...`; after `resultHandler()` reports `ok: true` it no longer reads "Saving..." during the flash; after a failed or unconfirmed result it reads the matching error hint, and a retry shows "Saving..." again.
- [ ] Mount or summon with a stored draft behaves as today: no "Draft restored" text, no Discard button (a guard against scope creep into ticket 45), and `SAVE_FLASH_MS` is still 180 (the saved-flash tests at `:321-351` stay unchanged and green).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P15.** The composer says "ESC cancels" but keeps the draft, and saving is hidden: Esc hides the window and keeps the draft, which comes back silently on the next summon, and nothing shows during the save wait of up to 3 s. The hint reads "Esc hides (draft kept) · ⌘↩ saves", the two error hints use the same wording, "Saving..." shows while waiting, and a restored draft shows "Draft restored" with a Discard link. Validation: revise, the clear-draft shortcut is dropped. This ticket ships the copy and "Saving..."; the restored-draft note and Discard are ticket 45.

## Problem

The hint tells the user Esc cancels, but the text comes back on the next summon, so a user who wants it gone does not know it stays, and a user who wants it kept does not know it is. During a slow save nothing changes on screen, so the user cannot tell a pending save from a hung one.

## Evidence

Checked at `085b23c5d`.

- `src/routes/composer/+page.svelte:250-256` the three hints; `:26` `let saving = false` (a plain variable, so a template cannot react to it); `:110` set, `:135`, `:150`, `:182` cleared; `:137` the comment that says "Esc cancels".
- `:16,41,56-71` the draft in localStorage, written on every change; `:166-186` `resetForShow` restores it (`:173`).
- `src/tests/routes/composer-page.test.ts:107-108,271,429` pin the old strings. No help document pins "ESC cancels" (`help/` and `docs/` checked).

## Sequence with

Ticket 45 edits the same file and test (draft restore, Discard, the hold) and is blocked by this ticket: it reuses the `$state` `saving` and the hint block this ticket rewrites. shell-sidebars-ux has no Issue on the composer.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, and the split of old ticket 05 into this copy-and-state ticket and the risky draft ticket 45. Defaults (not individually answered): none.
