VERDICT: CHANGES_REQUESTED

# 09 review: templates point at the queryjs folder that exists

Reviewed `git diff main...HEAD` at b0749d77 (commits 9147cc92, 9a8186e3, b0749d77).

## Test verdict rests on

- `src/tests/help/templates-script-paths.test.ts` (added by the diff), plus the rest of `src/tests/help/`
  (`examples-scoping`, `queryjs-features-scoping`, `type-definitions-views`):
  `./node_modules/.bin/vitest run src/tests/help` -> 4 files, 86/86 passed.
- Seen failing first, re-verified: with `help/examples/templates` checked out from `main` (restored right after,
  `git status` clean), the new test fails with all 11 `_system/queryjs/...` sites listed; 2 other cases pass.
- `pnpm check`: 0 errors, 0 warnings (log: `.claude/worktrees/test-logs/help-examples-09-review-check.log`).
- `processTemplate` (`src/lib/utils/template.ts:22`) has no direct change; no test of changed code beyond the above.

## Acceptance criteria

- [x] **No template references a queryjs path that does not exist under `help/`** - met.
  `grep -rnE '(kb|dv)\.view' help/examples/templates` shows 11 calls, all `__system/queryjs/<name>`, and each
  `<name>.js` exists in `help/examples/queryjs-features/__system/queryjs/`. No `_system/queryjs` remains in
  `help/` (only hit outside the new test is an unrelated fixture path in `type-sidebar.logic.test.ts:1074`).
  Direction matches the earlier decision in 7eb04dd8 (issue 02), which moved every queryjs-features
  `kb.view()` to `__system/queryjs/` and named the templates as the remaining mismatch.
- [~] **A test in `src/tests/help/` fails if a template references a missing script path (seen failing first)** -
  partly met. It fails on the old paths (verified above), but the suffix matcher accepts paths that no vault
  layout resolves (finding 1), so it does not fail on every missing path.
- [~] **"Make sure a note created from a template still finds its scripts"** (What to build) - partly met. Paths
  are now correct, but no single example folder holds both the templates and their scripts, and nothing tells
  the user where `__system/queryjs/` must go (finding 2).

## Findings

1. **Medium - `src/tests/help/templates-script-paths.test.ts:37-41`** - `scriptExists` matches any `.js` under
   `help/` by path suffix, so it accepts paths that resolve nowhere. Probe with the same logic:
   `scriptExists('meeting-list')`, `scriptExists('queryjs/meeting-list')` and
   `scriptExists('examples/queryjs-features/__system/queryjs/meeting-list')` all return `true`, yet
   `KBAPI.resolveScriptPath` (`src/lib/plugins/queryjs/kb-api.ts:439-450`) joins the path to the vault root, and
   no example folder opened as a vault has `meeting-list.js` or `queryjs/meeting-list.js` at its root. A template
   regressing to `kb.view("meeting-list")` would pass. The sibling test
   `src/tests/help/queryjs-features-scoping.test.ts:111-120` already resolves from a concrete vault root.
   **Fix:** resolve against candidate vault roots instead of suffixes: a path is present when
   `existsSync(join(root, withExt))` for some `root` in `help/examples/*/` directories. Extend the third case to
   assert `scriptExists('meeting-list')` and `scriptExists('queryjs/meeting-list')` are `false` (and keep the
   `__system` true / `_system` false pair). Update the JSDoc at lines 12-15 to describe the rule.

2. **Low - `help/examples/SCOPING.md:44-48`** - the vault-root gap lists only queryjs-features and triada. The
   templates are a third case and the worst one: `help/examples/templates/` has no `__system/` of its own, so a
   note created from a template finds its scripts only if the user copies
   `help/examples/queryjs-features/__system/queryjs/` to the vault root. Nothing in `help/` says so.
   **Fix:** extend the gap sentence to name `templates` and state that its `kb.view()` calls need
   `queryjs-features/__system/queryjs/` at the vault root. One sentence, no template changes (a comment inside
   the queryjs blocks would be copied into every created note).

3. **Info (no change requested) - naming vs app default.** The app's default system folder is `_system`
   (`src/lib/core/settings/settings.store.svelte.ts:86-87`; `help/documentation/09-quick-notes-and-templates.md`,
   `19-settings.md` use `_system/templates/...`), so a user on defaults ends with `_system/templates/` beside
   `__system/queryjs/`, and the scripts sit outside the system-folder exclusion. Harmless for `.js` files, and
   the `__system` choice was already made in 7eb04dd8; discovery did not mention the app-docs side the Issue asked
   to check. Recorded so the fix step does not reopen it.

No scope creep: the diff touches only the 11 template lines, the new test, and scratch files. No layer, error
handling or performance rules apply (examples + test only).
