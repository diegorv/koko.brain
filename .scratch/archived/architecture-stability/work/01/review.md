VERDICT: CHANGES_REQUESTED

# Issue 01 review

Reviewed `git diff main...HEAD` (735113a3, cf95c055): `CLAUDE.md` +12 lines (308-318) and `.scratch/architecture-stability/work/01/discovery.md` (new). No source or test file changes.

## Acceptance criteria

- [met] Chosen option recorded in CLAUDE.md § Implementation process — `CLAUDE.md:308-318` adds "### Post-delivery review (main session)" under `## Implementation process` (line 304), recording option (B): when (312), range (313), skip rule for tests/docs/copy (314), opus refute-style reviewer with null-is-not-a-pass (315), follow-up rule (316), and the no-launch-script-edit rule (318). The text is recorded, but its range rule is wrong as written (finding 1).
- [not met] The next delivered Issue whose deliver diff changes source code gets a post-delivery review with a non-null verdict, and its findings are filed — Only the main session can check this, after a future `/relay-lite:run` delivery. This branch cannot show it. It does not hold back the verdict alone; finding 1 does, because following the rule as written would miss deliver fixes on that next run.

## Findings

1. **major** — `CLAUDE.md:313`. The range anchor `<last "Issue NN review" SHA>` is a match on the commit subject, and the subjects in the squash bodies are not consistent. Checked across all 2026-10-30..11-01 squashes on main:
   - Some review commits do not carry the text at all: 3d656180 (Issue 26, the one the main session reviewed by hand) has `9cb01563 docs(sidebar-redesign): review for the Rust YAML frontmatter parser`. 025b9282 (`review of drag to move and folder notes`) and 08bdb76e (`review of the hub actions in the action bar`) are the same.
   - Deliver-written commits after the fixes do carry it. In 3a6e41da (Issue 13, one of the 14 cited) the order is `2953320f ... Issue 13 review`, then the fixes 816f9187, 8fd2b40e and 3e326869, then `9f6e4330 ... Issue 13 review resolution`. In a57a47c3 (Issue 07) the order is `57b10edb ... Issue 07 review`, then `610c1a6e fix(rail-shell): resolve the Issue 07 review findings`, then `780de280 ... resolved`. The latest commit whose subject contains the text is then the resolution commit or the fix itself. The range shrinks to bookkeeping, and the step-2 "nothing to review" clause skips exactly the deliver fixes this Issue is about.
   - Re-reviews use different text: `Issue 25 re-review, round 2`, `Issue 12 review 2`, `Issue 08 round 2 review resolution`.
   **Fix:** anchor on the review file, not the subject. The start of the range is the last sub-commit that **adds** a review file under `.scratch/<feature>/work/NN/` (`review.md` or `review-N.md`). Find it with `git show --stat --diff-filter=A <sha>`, or with `git log --diff-filter=A --format=%H <first-sub-commit>^..<last-sub-commit> -- .scratch/<feature>/work/NN/`. Say that later commits editing `review.md` ("review resolution") are deliver's and fall inside the range.
2. **minor** — `CLAUDE.md:313`. "With no commit after the last review commit, there is nothing to review" never applies: deliver always commits at least the `resolved` / ticks bookkeeping after the review (every squash checked has one). **Fix:** say "With no commit after the last review commit other than the Issue's `.scratch` bookkeeping, there is nothing to review", so the rule matches the exclusion already stated in the same bullet.
3. **nit** — `.scratch/architecture-stability/work/01/discovery.md:39`. The What-to-build step "Ask the plugin author whether a re-review-after-deliver option exists" is recorded only in the discovery file and the build report. Neither persists past the Issue close. **Fix:** deliver should note it in the squash body or the Issue's delivery comment as an owner action still open.

## Other checks

- Issue gate `node -e "JSON.parse(require('fs').readFileSync('.agent-relay-lite/config.json'))"` passed in the worktree: exit 0.
- `pnpm check` passed in the worktree after `pnpm install --frozen-lockfile`: exit 0, 0 errors and 0 warnings.
- Tests: the diff touches no source or test file. A search of `src/`, `scripts/` and `e2e/` for "Implementation process" and "Post-delivery review" matched nothing (grep exit 1), so no test asserts the changed text. My test verdict rests on no test file. The full suite is deliver's to run.
- I checked these claims in the CLAUDE.md text against the main checkout's `.agent-relay-lite/launch/architecture-stability-01.js:226-261` and found them accurate: `reReviews` loops only on CHANGES_REQUESTED, and APPROVED with findings goes to deliver. `.agent-relay-lite/launch/` is git-ignored (`.agent-relay-lite/launch/.gitignore:1: *`), which explains why it is missing from the worktree.
- Scope: no launch script, no `config.json` and no ledger edits. Option (A) was correctly not applied. There is no `spec.md` for architecture-stability, as the discovery file says.

## Resolution

1. **Fixed** in 8a488365. `CLAUDE.md:313` now starts the range at the last sub-commit that adds `.scratch/<feature>/work/NN/review*.md`, found with `git log -1 --diff-filter=A --format=%H <first>^..<last> -- '.scratch/<feature>/work/NN/review*.md'`, and says not to match on subjects. The pathspec is narrowed to `review*.md` so `discovery.md` (also added under `work/NN/`) can never be picked. Run against the main checkout, it returns the review commit before the deliver fixes on Issue 13 (2953320f, before 816f9187/8fd2b40e; not the 9f6e4330 resolution), Issue 07 (57b10edb, before 610c1a6e) and Issue 26 (9cb01563, whose subject lacks "Issue 26 review").
2. **Fixed** in 8a488365. The clause reads "With no commit after it other than that bookkeeping, there is nothing to review."
3. **Fixed in part, rest is deliver's.** The fix step cannot write the squash body or the delivery comment. I added an "Open owner action" note to the Issue file (`.scratch/architecture-stability/issues/01-review-deliver-phase-fixes.md`, Notes) telling deliver to carry the plugin-author question into the squash body and the delivery comment. Committed with this resolution.
