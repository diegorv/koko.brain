VERDICT: APPROVED

# Issue 36 review: calendar follow-ups filed, full E2E green

Reviewed `git diff main...HEAD` (ce25f473, 4c26b825, 297abe81) in the worktree, against the Issue's acceptance criteria, plan Task 35 (lines 818-821) and Notes > Follow-ups (lines 1297-1318), and the owner's 2026-10-28 rule for the extra tickets (A-D).

The diff is tracker-only: 25 new tickets (40-64), the kit-3 ticket 11 comment, discovery.md and two Issue comments. No file under `src/`, `src-tauri/`, `e2e/` or the config changed, so no Pre-Change Checklist or test-file rule applies.

## Test verdict basis

- No test file was added or changed, and no source file was changed. No vitest run was needed, so none was made, and `pnpm check` was not run (no frontend file in the diff).
- The kit-3 comment's claims were checked with `grep -n "vi.mock("` plus `git blame` on the three test files. A diff from the plan's add commit (f7310930^) to `main` over modified test files shows these are the only `$lib` `vi.mock` strings the plan added to pre-existing test files:
  - `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`
  - `src/tests/lib/core/layout/tauri-listeners.service.test.ts`
  - `src/tests/lib/features/type-definitions/type-definitions.service.test.ts`
- The full E2E run and the frontend gate are the deliver step's job and have not run yet.

## Acceptance criteria

- [x] **Each Notes > Follow-ups item has its own file, numbered without reuse.** Met.
  - Tickets 40-60 match the 21 plan items one-to-one, in plan order. I compared each title and body with plan lines 1298-1318.
  - Numbering starts at 40, not the 38 the Issue names. `git log main --name-only -- .scratch/calendar-feature/issues/` shows that 38-dates-prototype-parity and 39-write-service-rename-flicker were already used. This follows the owner rule ("numbered after the highest existing number (39 ...)") and the Issue's own intent (no reuse).
  - The count is 25, not 21. The extra four are the owner's A-D, so the count is correct under the owner rule.
- [x] **Every ticket has a `**Blocked by:**` line and a `**Status:**` line in the template format.** Met.
  - A grep over the 25 files finds exactly one of each per file. 7 tickets are `needs-triage` (42, 43, 44, 45, 50, 52, 53) and 18 are `ready-for-agent`.
  - The layout matches `.scratch/embedder-memory/issues/02-update-semantic-file-silent-skip.md`: title, What to build, Blocked by, Status, context bullets, checklist.
- [x] **The archify ticket is filed only if ticket 34 left both map files untouched.** Met.
  - The last commit on `docs/architecture/archify/kokobrain-runtime.architecture.json` and `kokobrain-runtime.html` is 0001d3b6 (2026-08-31), before the plan.
  - `:73` still reads `"tag": "5 change sources"`, and the ticket 34 close commit c0103ff5 says the map was left untouched.
  - Ticket 51 is therefore correctly filed.
- [x] **Kit-3 ticket 11 gets a `## Comments` entry with the plan's `vi.mock` strings, if it is still open.** Met.
  - The ticket file still exists, and the entry was appended at the bottom under a new `## Comments`.
  - The three lines are confirmed by blame, each from a plan commit dated 2026-10-28: `:151` (8b6bb486), `:67` (70c60368), `:17` (58561937).
- [ ] **One full `bash scripts/e2e.sh` run passes.** Not yet run. This is the deliver step's job.
- [ ] **`pnpm check`, `pnpm vitest run` and `pnpm build` pass.** Not yet run. This is the deliver step's job.
- [x] **The staged diff lists only the follow-up files and the kit-3 ticket.** Met. `git show --stat 4c26b825` lists exactly the 25 new tickets plus `.scratch/sveltekit-3-migration/issues/11-migrate-tests-to-lib-subpath.md` (26 files). Discovery and the step comments are in separate workflow commits, as the process rules require.
- [x] **One commit in the full format.** Met for content. 4c26b825 has Context, Problem, Solution, Behavior, Files with line ranges, and the Co-Authored-By trailer. The gate-green half belongs to deliver.

## Owner rule (2026-10-28), extra tickets

- [x] **(A) Ticket 61, the vault-switch drain gap.** Met.
  - It quotes the f984319f text verbatim.
  - The chain checks out on the current tree:
    - `vault.service.ts:11` and `:33` call `vaultStore.open`.
    - `deep-link.service.ts:137` is the third caller. A grep over `src/lib` and `src/routes` finds no others.
    - The drain is at `app-lifecycle.service.ts:178`.
    - In `frontmatter-write.service.ts`, `writeTextFile` is at `:119`, `assertVault` at `:120` and `notifyAfterSave` at `:123`.
  - It offers both fixes the owner named: drain earlier, or change the writer.
- [x] **(B) Ticket 62, the gesture keydown blocking app shortcuts.** Met.
  - `EventTimeGrid.svelte:124-125` holds the modifier check and `e.stopPropagation()`, and `:158` holds the `window` capture listener. Both are confirmed.
  - `global-keybindings.ts:40` and `utils/keybindings.ts:32` are confirmed as document-level listeners.
- [x] **(C) Ticket 63, every restore failure reported as not-in-trash.** Met. These anchors are confirmed:
  - `event-calendar.service.ts:773` (`if (restored === null) throw new EventCalendarError('not-in-trash')`)
  - `:863` (the refused branch)
  - `:1124` (the toast)
  - `trash.service.ts:108` (`restoreItem`)
- [x] **(D) Ticket 64, one polish ticket.** Met.
  - It holds every candidate from the ticket 22 (3), 28 (3), 26 (3), 27 (1), 29 (2) and 32 (1 plus nit) comments, as one checklist, not split.
  - Ticket 31's two findings are excluded because 62 and 63 cover them.
  - The file:line anchors are quoted as recorded.
- [x] **The archify refresh is filed with the plan follow-ups (51), not as an extra.** Met.

## Findings

1. **Low: ticket 52 depends on ticket 60, but its Blocked by line says None.**
   - Where: `.scratch/calendar-feature/issues/52-consolidate-calendar-date-grid-helpers.md:5` and `:11`.
   - The body says "Do ticket 60 (collection time-of-day defects) first or together, so the move does not freeze a bug", but the Blocked by line says `None`. The workflow picks tickets by Status and Blocked by, so it would not see the ordering.
   - Fix: set `**Blocked by:** 60`, or drop the ordering sentence if "together" is the intent.
2. **Low: ticket 61's What to build disagrees with its own acceptance criterion.**
   - Where: `.scratch/calendar-feature/issues/61-vault-switch-drain-index-gap.md:1` and `:3` against `:13`.
   - The title and What to build commit to one outcome: the write "updates the old vault's index after it reaches disk". The first checkbox also accepts a second one: "either updates the old vault's index or is refused before writing".
   - The title reads like a description of the current state, which is the opposite of today's behaviour.
   - Fix: phrase the title and What to build as the target ("no calendar write lands on disk without its index update across a vault switch"), so both fix options satisfy the ticket.
3. **Low: tickets cite plan sections that ticket 37 is about to delete.**
   - Where: the tickets that cite the plan:
     - 41:9 ("Plan D2")
     - 43:9 ("Plan Open questions item 11 and D-notes")
     - 44:9 ("The plan (D-notes on core changes)")
     - 46:9 ("Plan D19")
     - 50:9 ("Plan Notes > Dependencies and Risks item 15")
     - 53:9 ("Plan Risks item 9")
     - 55:9 ("Plan D-notes")
     - 56:9 and 58:9 ("Prototype parity row")
   - Ticket 37 deletes `.scratch/calendar-feature/plan-2026-10-28.md` next, and none of these tickets names the file.
   - Fix: add one line per affected ticket (or a shared sentence), such as "Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`".
4. **Nit: ticket 57 leaves out the plan's reason for deferring the dialog.**
   - Where: `.scratch/calendar-feature/issues/57-calendar-shortcuts-help-dialog.md:9`.
   - The plan's parity table (plan:1141) defers the `?` dialog as "covered by help page 20". Ticket 34 since added the shortcut tables to `help/documentation/20-keyboard-shortcuts.md` and `27-calendar.md:159-171`.
   - The ticket is `ready-for-agent` without mentioning either page, so an agent may build a third copy of the table, or build something the owner judged low value.
   - Fix: mention both help pages, and either mark the ticket `needs-triage` or keep the drift-guard checkbox so it also covers the help tables.
5. **Nit: several ticket 64 anchors have drifted about 30 lines.**
   - Where: `.scratch/calendar-feature/issues/64-calendar-review-polish.md:17-35`.
   - Examples:
     - `opsUpTo` is now `event-calendar.service.ts:734`, not `:705`.
     - The Undo `undoDeleteEvent(path)` call is now `:1021`, not `:1016`.
     - `FOCUSABLE` is `EventPopover.svelte:32`, not `:24`.
     - The pending dashed border is `EventBlock.svelte:66`, not `:60`.
   - The ticket says anchors are "quoted as recorded and may have drifted", and most items carry a symbol name, so this follows the owner's "quoted" instruction.
   - Optional fix: add the current line beside each recorded one. No change is required.
6. **Nit: ticket 64 trims part of the ticket 27 quote.**
   - Where: `64-calendar-review-polish.md:30`.
   - The ticket 27 item drops "Same class as the ticket 26 popover note above (lookup by `path` across a rename). Probably pre-existing; no test covers a rename during save." and rewords the E2E sentence. Every other item is verbatim.
   - Fix (optional): restore the dropped sentences, so the item is quoted like the rest.

No correctness, scope-creep or layer-rule problems were found. Ticket 40's "clicking one opens the note at the task line" and similar behaviour notes are proposals inside the follow-up tickets, not changes to the code.
