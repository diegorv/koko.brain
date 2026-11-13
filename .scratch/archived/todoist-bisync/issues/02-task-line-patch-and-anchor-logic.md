# 02: Pure task-line patch and anchor helpers

**What to build:** The pure functions every later sync ticket uses to change one task line token by token and to manage `🆔 td-…` anchors, in a `.logic.ts` with no framework imports. Verifiable by unit tests alone. Later tickets compute the new line here; the Rust writer only swaps an expected line for a new one. Design: `.scratch/todoist-bisync/research/design.md` rules 4, 5, 10, 11 and Anchor.

**Blocked by:** none

**Status:** resolved

- [x] Failing tests first, real logic, no mocks.
- [x] Lives in a new `src/lib/features/todoist-sync/` folder (e.g. `task-line.logic.ts`, `anchor.logic.ts`).
- [x] Token patches on a raw task line string (both `- [ ]` and ordered `1. [ ]` forms, any indent): set status (open/closed per rule 5: opening keeps `/ ? ! >`, closing keeps `-`, otherwise `x` / space), set or remove `📅 YYYY-MM-DD`, set or remove the priority emoji (`🔺⏫🔼🔽⏬`), add or remove a `#tag` (inserted before the anchor), replace the description text.
- [x] Every patch preserves everything it does not own: `⏳ 🛫 ➕ ✅ ❌ 🔁 ⛔ 🏁`, links, wikilinks, the anchor and its position, trailing text.
- [x] Description replace returns a conflict result instead of a line when the description is "mid-sentence" per design rule 4 (a tag, link or unmapped signifier before its last word).
- [x] Anchor helpers: read the `td-` value from a line (`🆔 td-…` anywhere on the line); detect a user `🆔` without the prefix; build `🆔 td-<todoist id>` and `🆔 td-<8 base36>`; generate a value unique against a given set; build the anchor -> occurrences map from a list of `{relPath, line}`; scope filter that excludes the templates folder (from settings, passed in), `_system/`, `.view` files and `.kokobrain/`.
- [x] A round-trip check: given Todoist content, report whether writing it into a line and parsing it back would change it (contains `#`, a signifier emoji, `🆔`, a newline, or would be collapsed). Pure, no parser call: the rules are listed in the test.
- [x] Gate: frontend (`pnpm check` + `pnpm vitest run`).

## Notes

- Size: S to M.
- The parser's tag rule is ASCII `[A-Za-z0-9_][A-Za-z0-9_-]*` (Rust `TASK_TAG_RE`); keep the TS constant next to a comment pointing at it.

## Comments

- 2026-11-09, branch `issue/02-task-line-patch-and-anchor-logic`: added pure task-line patch helpers (`task-line.logic.ts`) and anchor helpers (`anchor.logic.ts`) in `src/lib/features/todoist-sync/`. Review round 1 APPROVED with findings; fix round matched the parser's tag rule (no left boundary, links skipped), spaced inserts before a glued `🆔`, kept CRLF, flagged empty content in the round-trip check, and counted bare `td-` as foreign (rule 4 reading left as an owner decision before ticket 08). Review round 2 APPROVED with one nit (CRLF recurrence in replaceDescription, safe conflict, not fixed). Full suite at f5c0f41aa: 584 files, 14278 passed, 54 skipped, 1 todo; `pnpm check` 0 errors.
