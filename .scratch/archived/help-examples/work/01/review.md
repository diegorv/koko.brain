VERDICT: CHANGES_REQUESTED

# Review: Issue 01, folder-scoping pattern and guard test

Scope: `git diff main...HEAD` (69f90b5b, b5f9a976, f41e36c2). It adds `help/examples/SCOPING.md`,
`src/tests/help/examples-scoping.test.ts`, the discovery note and Issue comments. It changes no source.

Test verdict rests on: `src/tests/help/examples-scoping.test.ts` (run by me: 12/12 pass), plus
throwaway probe fixtures in `help/examples/canvas-features/` (removed after each run, worktree clean).
`pnpm check`: 0 errors, 0 warnings. I did not run the full gate.

## Acceptance criteria

- [x] **SCOPING.md documents the pattern or the gap for every query surface used in `help/examples/`.**
  Met. It covers QueryJS, collection blocks, `.collection` and `.view` (gap), type definitions (gap),
  auto-move, kanban and canvas, and search. I checked the claims against the code:
  - `parseSource` (`src/lib/plugins/queryjs/queryjs.logic.ts:173-195`) is a substring folder match,
    and an empty `""` falls through to `null`, which means all pages.
  - `inFolder` is a `startsWith` on the absolute folder (`expression/evaluator.ts:508-511`).
  - `.view` files go through `parseCollectionYaml` (`type-definitions/view-parse-cache.ts:25`).
  - `limit` applies to every view type before rendering (`collection.logic.ts:151-152`).
  - `{parent}` is resolved by `resolveDestination` (`auto-move.logic.ts:101-120`).

  Finding 4 (kb.view) and finding 5 (auto-move snippet) are non-blocking gaps.
- [ ] **The guard test fails when an unscoped query is added to a non-allowlisted file.**
  Partly met. A plain `kb.pages()` block in `canvas-features/` fails the test (1 failed, 11 passed;
  I reproduced this). Three other unscoped shapes pass the guard (findings 1-3). One of them already
  exists in an allowlisted file, so it will slip through once issue 03 removes that file's entry.
- [x] **The allowlist names, per file, the folder issue (02-07) that removes it.**
  Met. There are 45 entries, each mapped to the issue that owns its folder:
  - queryjs-features: 02
  - markdown-editor-vault: 03
  - collection-features: 04
  - triada: 05
  - type-definitions-features: 06
  - auto-move: 07

  The entries are enforced by the `0[2-7]: ` test and the stale-entry test.

## Findings

1. **High: `src/tests/help/examples-scoping.test.ts:128-135`.** QueryJS sites are classified per block,
   so one `.limit(` anywhere clears every read in the block.
   - Live instance: `help/examples/markdown-editor-vault/23-queryjs-real-scripts.md:213`.
     `const pages = kb.pages()` renders `pages.file.basename` and `pages.file.tags` for the whole vault.
     The block passes only because a later, separate `kb.pages('#type/project')...limit(5)` call
     contains `.limit(`.
   - The file is in the allowlist today for other sites. Once issue 03 scopes those sites, the
     stale-entry test makes it drop the entry, and this vault-wide dump ships green.
   - Probe: a fixture block with `const all = kb.pages(); kb.paragraph(all.file.basename.join(", ")); kb.list(kb.pages("#x").limit(5).file.link)`
     passed the guard.
   - Fix: classify each `kb|dv.pages|pagePaths(` call by its own statement, meaning the call plus its
     method chain up to the end of the statement. The call is scoped when its argument is a folder
     source or its chain has `.limit(` or a path predicate.
     - Change the unit case at line 209 to a chained `.where(...)`.
     - Add a unit case for the two-call shape above.
2. **Medium: `src/tests/help/examples-scoping.test.ts:87`.** `QUERYJS_FOLDER_SOURCE_RE` only checks that
   the first argument starts with a quote followed by `"`. Two sources that `parseSource` treats as all
   pages pass the guard:
   - A Dataview-style compound source such as `kb.pages('"x" and #y')`. It fails `^"(.+)"$`, so
     `parseSource` returns `null` (all pages). I probed it and it passes the guard.
   - The empty-folder fallback that SCOPING.md itself names as a gotcha:
     ``kb.pages(`"${kb.current()?.file.folder ?? ''}"`)``.

   Fix:
   - Accept a string-literal source only when the whole literal matches `^"[^"]+"$`.
   - Accept a template literal only when it is exactly `` `"${<expr>}"` `` and `<expr>` has no `??` or `||` fallback.
   - Add both shapes as unit cases that must be flagged.
3. **Low: `src/tests/help/examples-scoping.test.ts:137-142`.** `hasPathFilter` counts a path predicate
   under `not:` or inside an `or:` as a scope. For example,
   `filters: { not: ['file.folder.contains("/templates")'] }` excludes one folder and still reads the
   whole vault, yet the guard accepts it (probed).
   - No example uses this today, but issues 03 and 04 are about to write path filters.
   - Fix: count path predicates only in `and:` branches and top-level strings. Count an `or:` only when
     every branch is scoped, and never count `not:`.
4. **Low: `help/examples/SCOPING.md:13-37`.** The QueryJS section says nothing about `kb.view()` script
   paths. `resolveScriptPath` (`src/lib/plugins/queryjs/kb-api.ts:439-450`) prefixes the vault root,
   and `vaultPath` is private, so a script path cannot be relative to the note.
   - Affected callers:
     - `queryjs-features/dashboard.md` uses `__system/queryjs/...`.
     - `queryjs-features/yearly-2026.md` hardcodes `Resources/help/examples/...`.
     - `triada/templates/*.md` use `__system/queryjs/...`.
   - In a copy nested elsewhere these paths do not resolve, which conflicts with the Issue goal
     "behave the same ... nested anywhere".
   - The Issue asks to name a gap when the surface cannot express it.
   - Fix: add a short "Gap: `kb.view()` paths are vault-root relative" note so issues 02 and 05 know.
5. **Low: `help/examples/SCOPING.md:69-79`.** The auto-move snippet scopes on
   `file.folder.contains('/auto-move-features')`, so it also matches notes in the example root and in
   a sibling folder such as `auto-move-features-old`.
   - For a recipe note directly in `auto-move-features/`, `{parent}/Cooking` resolves to the folder
     above the example, which moves the note out of it.
   - Issue 07 requires that the rules "never move notes outside the example folder".
   - Fix: scope the snippet to the source folder, for example
     `file.folder.contains('/auto-move-features/Inbox')`, or state the root-level case explicitly.

Scope creep: none. The diff touches only the files the Issue lists. Layer rules, error handling and
performance rules do not apply because no source changed. The test file uses tabs and has no em-dashes.

## Resolution

All five findings accepted and fixed.

1. Each `kb|dv.pages|pagePaths(` call is now classified on its own argument and method chain
   (to the end of the statement; a newline ends it unless the next line starts with `.`). Unit case
   for the two-call shape added; the `.where` case is now chained. Probed: without its allowlist
   entry, `23-queryjs-real-scripts.md` now reports the block at line 213.
2. A string source counts only when the whole literal is `'"<non-empty>"'`; a template only when it
   is `` `"${expr}"` `` (optional literal suffix) with no `??` / `||` in `expr`. Unit cases flag the
   compound source, `'""'` and the empty-folder fallback.
3. `hasPathFilter` counts top-level strings and `and:` branches, an `or:` only when every branch is
   scoped, and never `not:`. Unit cases added.
4. SCOPING.md QueryJS section names the `kb.view()` vault-root path gap for queryjs-features and triada.
5. The auto-move snippet now scopes on `file.folder.endsWith('/auto-move-features/Inbox')` and explains
   why the example root is excluded.
