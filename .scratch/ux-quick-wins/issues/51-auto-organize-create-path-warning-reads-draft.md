# 51: The Create note path warning names a path and follows the typed text

**Origin:** review of Issue 32 (`.scratch/ux-quick-wins/work/32/review.md`, findings 1 and 3), 2026-11-18.

**What to build:** Two fixes to the unknown-variable warning under Create note path in `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte` (`createPathWarnings`, around `:310-316`):

1. **Wording.** The warning always says "a folder named {x} would be created". That is wrong when the unknown variable sits in the file name: `Meetings/{yaer}.md` creates a note named `{yaer}.md`, not a folder. Word it for a path, for example "so the path would contain {x}".
2. **Typed text.** The warning reads the saved `rule.createNote.path`. When a typed path is refused and left unsaved, the warning describes the old saved path while the field shows the typed text. Read the field's draft, as `renameText` does for Rename.

Not in this ticket: the Rename and Move to folder warnings (their wording was reviewed and kept in Issue 32).

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first: with Create note path `Meetings/{yaer}.md`, the warning names the path and does not say a folder would be created.
- [x] Failing test first: typing a refused path that contains `{yaer}` shows the warning for the typed text, not for the saved path.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Evidence

- `AutoOrganizeRuleRow.svelte:310-316` at 1f700be11: the Create note path warning text and its read of `rule.createNote.path`.
- Issue 32 asked for the folder wording, so the review marked both points optional and outside that ticket.

## Comments

- 2026-11-18, triage: ready-for-agent. Accepted by the owner as written.
- 2026-11-19, delivered from branch issue/51-auto-organize-create-path-warning-reads-draft. The Create note path warning now names the path (`{yaer} is not a variable, so the path would contain {yaer}`) instead of saying a folder would be created, and reads the typed draft, so a refused path still gets its warning. Review fix round: a refused draft is dropped when the stored path changes from outside the field, and a test pins the live warning while typing. Tests: `pnpm check` 0 errors; AutoOrganizeRuleRow and AutoOrganizeSection tests 147/147; full suite at c92c64259 passed (665 files, 17868 tests, exit=0). Reviews: round 1 APPROVED (2 findings, fixed), round 2 APPROVED (no findings).
