VERDICT: APPROVED

# Review: Issue 06, scope type-definitions-features views

Range reviewed: `git diff main...HEAD` (58ea25a3, 221f4d7b, 65f24bf2).

## Checks I ran

- `pnpm vitest run src/tests/help/ src/tests/lib/features/type-definitions/`: 12 files, 321/321 pass.
  The test verdict rests on `src/tests/help/type-definitions-views.test.ts` (new) and
  `src/tests/help/examples-scoping.test.ts` (allowlist changed), plus the existing
  type-definitions suite under `src/tests/lib/features/type-definitions/`.
- `pnpm check`: 211 files, 0 errors, 0 warnings.
- Red probe: ran the new test against main's two `.view` files (copied to the scratchpad,
  probe test file removed afterwards). 2 of 3 fail. active-projects lists
  `/vault/Work/personal-project.md` and the `type-definitions-features-old` sibling.
  recent-meetings lists nothing, because `file.created` resolves to `null`
  (`src/lib/features/collection/expression/evaluator.ts:193-212` has no `created` case).
- Mutation reasoning: without the folder predicate, recent-meetings would list
  `/vault/Meetings/1-1 with boss.md` (recent ctime, type Meeting), so the scope stays guarded
  even though main's red came from `file.created`. Swapping `endsWith` for `contains` would list
  the `-old` sibling in the active-projects case, so that is guarded too.
- Render paths: I compared them with the components. `TypeSidebar.svelte:103` calls
  `executeQuery(parsed.definition, view, propertyIndex)`. `TypeNoteList.svelte:239-256` calls
  `seedToolbarStateFromDefinition` then `buildOverriddenQuery`
  (`type-note-list.logic.ts:41-85`). The test calls the same functions with the same arguments.
- Fixture realism: `type == "Project"` resolves to the stored `_type` (`evaluator.ts:84-93`),
  and Rust sets `_type` from `is_a` (`src-tauri/src/commands/vault.rs:745-747`), so fixtures
  that use `_type` match the real index. `file.folder` is the absolute parent path
  (`vault.rs:740-743`). `endsWith` is case-insensitive (`evaluator.ts:331-334`).

## Acceptance criteria

- [x] **Both `.view` files list only notes in the folder.** Met.
  `active-projects.view:14` and `recent-meetings.view:9` add
  `&& file.folder.endsWith("/type-definitions-features")`. The new test shows that both sidebar
  paths drop notes elsewhere in the vault and in a sibling `-old` folder. Notes are kept when the
  folder is nested in a larger vault or is the vault root.
- [x] **The folder's allowlist entries are removed.** Met. `src/tests/help/examples-scoping.test.ts`
  drops both `06:` entries, and the guard still passes (its string-filter check lists
  `endsWith` in `PATH_PREDICATE_RE`, `:91-92`).
- [x] **Every file in the folder is reviewed and gaps are documented.** Met. The notes contain no
  queries. `_types/*.md` have no filter, and the README (`:12-17`) states the vault-global gap,
  which matches SCOPING.md "Type definitions".
- [ ] **The gap is listed in the closing commit.** Pending, belongs to the deliver step (finding 4).
- Issue checkboxes in `06-type-definitions-features.md` are still `[ ]`. Deliver should tick them
  in the closing commit.

## Scope

- Changing `file.created` to `file.ctime` (`recent-meetings.view:9`) stays inside Touches. The
  example was broken without it: the view always listed nothing. Without the change, the new test
  could not show that the scope keeps in-folder notes. `help/documentation/12-collection.md:316`
  documents `file.ctime`, not `file.created`. I accept it.
- `endsWith` instead of SCOPING.md's `contains` is stricter, and works here because the folder
  is flat for these types. The README states the rename gap.
- No other source changes. The two test files are what CLAUDE.md requires.

## Findings

1. **Low (follow-up, out of Touches):** `help/documentation/25-types-and-relationships.md:642`
   has the same dead `file.created > today() - duration("7d")` filter, so that documented example
   always lists nothing. Fix: change it to `file.ctime` in a separate Issue or follow-up commit,
   and mention it in the closing commit.
2. **Low (nit):** `src/tests/help/type-definitions-views.test.ts:13-17`: the `/** ... */` block
   after the imports is attached to the `FOLDER` const, not to the suite. Fix (optional): move it
   above `describe(...)` or make it a plain `//` file header.
3. **Info (pre-existing, not query-related):** `meeting-kickoff.md` has no `type: Meeting`, so it
   is never a Meeting. `_types/Project.md` points `_template` at `_system/templates/Project.md`,
   which does not exist under `help/`. No action in this Issue.
4. **Info (deliver):** the closing commit must list the `_types/` gap (type definitions are
   vault-global and merge with the vault's own types of the same name), as the Issue body asks.
5. **Info (Issue 01 guard, out of scope):** `examples-scoping.test.ts:191` accepts a string filter
   when the path predicate appears anywhere, including in a `||` branch
   (`a || file.folder.endsWith(...)`). Both 06 filters use `&&`, so this Issue is not affected.

None of the findings blocks delivery.
