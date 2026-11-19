# 51: The Create note path warning names a path and follows the typed text

**Origin:** review of Issue 32 (`.scratch/ux-quick-wins/work/32/review.md`, findings 1 and 3), 2026-11-18.

**What to build:** Two fixes to the unknown-variable warning under Create note path in `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte` (`createPathWarnings`, around `:310-316`):

1. **Wording.** The warning always says "a folder named {x} would be created". That is wrong when the unknown variable sits in the file name: `Meetings/{yaer}.md` creates a note named `{yaer}.md`, not a folder. Word it for a path, for example "so the path would contain {x}".
2. **Typed text.** The warning reads the saved `rule.createNote.path`. When a typed path is refused and left unsaved, the warning describes the old saved path while the field shows the typed text. Read the field's draft, as `renameText` does for Rename.

Not in this ticket: the Rename and Move to folder warnings (their wording was reviewed and kept in Issue 32).

**Size:** S.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first: with Create note path `Meetings/{yaer}.md`, the warning names the path and does not say a folder would be created.
- [ ] Failing test first: typing a refused path that contains `{yaer}` shows the warning for the typed text, not for the saved path.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Evidence

- `AutoOrganizeRuleRow.svelte:310-316` at 1f700be11: the Create note path warning text and its read of `rule.createNote.path`.
- Issue 32 asked for the folder wording, so the review marked both points optional and outside that ticket.

## Comments

- 2026-11-18, triage: ready-for-agent. Accepted by the owner as written.
