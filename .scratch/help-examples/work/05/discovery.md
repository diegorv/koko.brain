# 05 discovery: scope triada and templates

Template: issue 01 (`work/01/discovery.md`, `help/examples/SCOPING.md`). Only the differences are below.

## Files that change
- `help/examples/triada/__system/queryjs/_shared-triada.js:27-31` `notesIn`: `kb.pages().whereTag().whereDate().sort()`, vault-wide.
- `help/examples/triada/__system/queryjs/triada-inbox.js:7` `kb.pages().where(hasInbox)`, vault-wide by design (GTD inbox).
- `help/examples/triada/README.md`: Files table + Setup; add a "Scope" section.
- `help/examples/templates/{Daily,Weekly,Monthly,Quarterly,Yearly} Note.md`: queryjs blocks only call `kb.view("_system/queryjs/...")`; no direct read. `One on One.md`, `Quick Note.md`: no queries.
- `src/tests/help/examples-scoping.test.ts:66-67`: drop the two `05:` allowlist entries.
- Other triada scripts (`triada-rollup`, `triada-parent-outcomes`, `triada-moved`) read only through `notesIn`.

## Why not folder scope
Every query here runs inside a note created from a template, and reads OTHER notes: a weekly rollup reads the
week's daily notes, a daily reads its weekly note, the inbox reads `#inbox` tasks wherever they were captured.
Periodic Notes files each period under `<periodicNotes.folder>/<date format dirs>` (default `_notes/YYYY/MM-MMM/...`,
`settings.store.svelte.ts:8-31`), so a week's dailies span folders and the quarter note sits above them. A script
cannot read that setting, so `kb.current().file.folder` (or any parent of it) is not the right scope.

## Plan
1. Test first: remove the two allowlist entries, run the guard, see it fail on both scripts.
2. `notesIn`: keep the tag + `created` date selection (it already bounds results to one period) and cap it with
   `.limit(100)` (a quarter holds at most 92 days). Comment states why it is not folder-scoped.
3. `triada-inbox.js`: keep the vault-wide intent, cap at 20 notes (`.limit(20)`), and say so when the cap is hit
   ("process these first" fits the one-at-a-time rule).
4. README: "Scope" section: why period/inbox reads are vault-wide and capped, and the `kb.view()` vault-root path gap.
5. `templates/`: state why not, as a `//` comment in the first queryjs block of each period template (the scripts
   live in `queryjs-features/__system/queryjs`, scoped by issue 02, and read other period notes).

## Prior art
- Guard: `src/tests/help/examples-scoping.test.ts` (real scan + stale-entry test). No new test file: the folders hold no
  source code, and the guard is the test for these examples.

## Risks / defaults taken
- A cap, not a folder scope: SCOPING.md accepts "an explicit limit" where a read must stay vault-wide; the Issue's
  "or state why not" is met in the README and the template comments. No allowlist entry remains.
- `templates/` call `_system/queryjs/...` (single underscore) scripts that ship as `queryjs-features/__system/queryjs/`;
  the path mismatch predates this issue and is a vault-root path (documented gap). Left unchanged.
- A vault whose own notes use `type/journal/*` tags still feeds TRIADA rollups; that is the method's intent when adopted.
