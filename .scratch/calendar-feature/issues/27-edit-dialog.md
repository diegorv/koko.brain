# 27: Edit dialog with validation and color swatches

**What to build:** the event popover gains an Edit action that opens an edit dialog for the event. The dialog edits the title, date, start and end time, all-day, location and color (six swatches in a keyboard-operable radiogroup), shows inline validation errors and keeps Save disabled while the draft is invalid, and saves through `editEvent` (ticket 24), so a title change renames the note to the sanitized filename and keeps the typed title in `event_title` when it differs from the filename base. A multi-day event shows its date and time fields disabled with a notice. The note body is not editable in this dialog (D21); an "Open note" button leads there instead. A failed save keeps the dialog open with an inline error, and closing the dialog returns focus to the edited block or to the view root.

**Plan reference:** Task 26 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 603-625). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 24, 26

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventDialog.svelte` (new)
- `src/lib/features/event-calendar/EventForm.svelte` (new)
- `src/lib/features/event-calendar/EventColorSwatches.svelte` (new)
- `src/lib/features/event-calendar/EventPopover.svelte` (modify)
- `src/tests/lib/features/event-calendar/EventDialog.test.ts` (new)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`

- [ ] Same bits-ui re-check as ticket 26: if the bits-ui version in `pnpm-lock.yaml` differs from the one recorded in Notes > Pre-flight log of `.scratch/calendar-feature/plan-2026-10-28.md`, Task 1 (a) is re-run and the log is updated in this commit
- [ ] `EventDialog.svelte` uses `ui/dialog` with `class="gap-5 p-5 sm:max-w-[440px]"`, wrapped in `{#key session}`; edit mode has an "Open note" button
- [ ] `EventDialog.svelte` prevents `onCloseAutoFocus` and moves focus to the edited block, or to the view root, with the same rule as ticket 26 (the popover's Edit button that opened the dialog has unmounted)
- [ ] `EventForm.svelte` has a title field, a native `type=date`, `type=time step=900`, `ui/switch` for all-day and `ui/input` for location, each with a native `<label for>`; the note body is not a field in edit mode (D21)
- [ ] Date and time are disabled, with a notice, when `timingLocked` is set (a `multi-day` event)
- [ ] Inline errors come from `validateDraft`, and Save is disabled while the draft is invalid
- [ ] Submit calls `editEvent`; on failure the dialog stays open with an inline error
- [ ] `EventColorSwatches.svelte` is a `role="radiogroup"` where arrow keys move and select, and the popover gains an Edit action that opens the dialog
- [ ] `EventDialog.test.ts` (mount) passes: the empty-date and end-before-start messages are visible and Save is disabled; a title `1:1 with manager` is accepted (no title error); a locked event shows disabled time fields; a valid submit writes through a mocked fs and the store shows the pending event; closing with Escape leaves `document.activeElement` on the edited block
- [ ] `event-calendar.spec.ts`: after editing the time of a seeded event, the rendered time and the note's frontmatter bytes (read via `window.__e2e.fs.readFile`) are asserted and both reflect the new time
- [ ] `event-calendar.spec.ts`: renaming through the title field, then waiting for `window.__e2e.vaultIndex.version` to advance and the 300 ms debounce to pass, leaves exactly one block with the title, at `[data-event-path="<new path>"][data-pending="false"]`
- [ ] `event-calendar.spec.ts`: renaming to `1:1 sync` shows "1:1 sync" on the block, the file is `1-1 sync.md`, and its frontmatter holds `event_title: "1:1 sync"`
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 14:33 — discovery — plan in work/27/discovery.md: EventDialog + EventForm + EventColorSwatches mounted in the view, popover Edit action, EventBlock data-pending true/false for the E2E selector; bits-ui unchanged at 2.19.5 — pending
- 2026-10-28 14:41 — implement — EventDialog + EventForm + EventColorSwatches, popover Edit, eventErrorMessage, EventBlock data-pending true/false; check 0 errors, event-calendar vitest 590/590, event-calendar E2E 14/14 (new edit-dialog tests 9/9 at repeat-each=3); event_title is written unquoted (`event_title: 1:1 sync`), asserted as such — d5e42f54
- 2026-10-28 14:45 — review — CHANGES_REQUESTED: 1 medium (save failing after the dialog closed mid-save is silent), 3 low (stale save closes a newer dialog; midnight end shows 23:59; no root-fallback focus test); check 0 errors, event-calendar vitest 590/590, E2E 14/14 — 871f5729
