VERDICT: APPROVED

Review of `git diff main...HEAD` (19d94d8e, dd843140, 00b49a74) on `issue/02-my-people-counts-only-1on1s`.

## Acceptance criteria

- [met] Failing test first, reproducing the problem; it passes after the change. — Probe: with the `|| !isOneOnOneNote(entry)` filter removed from `src/lib/plugins/one-on-one/one-on-one.logic.ts:216` (restored with `git checkout` afterwards), `pnpm vitest run src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts -t "group meeting|whose kind is"` failed 4 tests (exit 1), among them "does not reset the counter for a group meeting related to the person; a 1:1 does". With the branch code the file passes.
- [met] A group meeting `_related_to` a direct report does not reset their counter; a 1:1 does. — `buildMyPeople` skips a note unless `isOneOnOneNote` (`one-on-one.logic.ts:163-167`, `:216`): `kind` is `one-on-one` (trimmed, any case) or the tag `type/meeting/one-one`. The test at `one-on-one.logic.test.ts:247-253` checks both cases: a `team-sync` note related to Ana and Bruno leaves Ana at `lastDate: null`, and a `kind: one-on-one` note sets 2026-10-20 / 12 days. `entry.tags` merges frontmatter and inline tags (`src-tauri/src/vault/parsing.rs:537`), and `kind` is not an aliased key (`utils/frontmatter-aliases.ts`, `src-tauri/src/vault/aliases.rs`), so `entry.frontmatter.kind` holds the raw value.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (232 files, 0 errors, 0 warnings). The targeted tests pass, listed under Checks run. Deliver runs the full `pnpm vitest run`.

## Findings

1. minor, `src/lib/plugins/one-on-one/one-on-one.service.ts:98`: "New 1:1" now writes `kind: one-on-one` into every created note, which the Issue does not ask for, and users see the extra frontmatter line. Ruling: accepted and in scope. Under the Issue's rule, a note created from the default empty template (or from a template with neither the kind nor the tag) would never count. That would break the tested "New 1:1, then the row reads 0d" flow (`MyPeopleSection.test.ts:150-173`) and the promise in the help page. A template's own `kind` is kept (`one-on-one.create.test.ts:103-109`). The fix is consistent with `withUnorganizedFlag`. Fix: none required. If the owner prefers it, write the tag instead of `kind`.
2. minor, `src/lib/plugins/one-on-one/one-on-one.logic.ts:216`: existing 1:1 notes that carry neither `kind: one-on-one` nor `type/meeting/one-one` stop counting, and nothing warns about it. Their people jump to "never" or overdue. The Issue sets this rule, and the help page (`09-quick-notes-and-templates.md:120`) now states it. Nobody checked whether the vault's older 1:1 notes carry the kind or the tag. Fix: the owner checks the vault, or backfills the tag before relying on the counters. No code change.
3. nit, `src/lib/plugins/one-on-one/one-on-one.logic.ts:157,160`: `ONE_ON_ONE_KIND` and `ONE_ON_ONE_TAG` are exported, but nothing outside this file imports them. Fix: make them module-private, or leave them for the tests.
4. nit, `src/lib/plugins/one-on-one/one-on-one.logic.ts:183`: the top-level key check `/^kind\s*:/` misses a quoted key (`"kind": meeting` or `'kind': ...`). Such a template would get a second `kind` key, which is a duplicate YAML key, so `ensureFrontmatterLink` may refuse it and creation fails with "Failed to create 1:1 note.". This is rare. Fix: allow optional quotes in the regex (`/^["']?kind["']?\s*:/`), or accept the edge case.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/plugins/one-on-one/ src/tests/lib/features/note-action-bar/NoteActionBar.test.ts`: 7 files, 153 tests passed. These are every test file the diff changes, plus the tests of `one-on-one.logic.ts` and `one-on-one.service.ts`.
- `pnpm vitest run` on the other test files that reference 1:1 creation or My people: `help/queryjs-contract`, `app/commands`, `app/global-keybindings`, `app/lifecycle/app-lifecycle.service`, `architecture/layer-rules`, `core/settings/OneOnOneSection`, `core/settings/settings.logic`, `features/command-palette/CommandPalette`, `features/note-action-bar/note-action-bar.logic`, `features/rail-shell/rail-shell.boundary`, `features/rail-shell/RailNoteList`, `plugins/mods/mods-host.service`. Result: 12 files, 772 tests passed.
- `pnpm vitest run src/tests/lib/core/settings/settings-copy.test.ts src/tests/scripts/sync-wiki-docs.test.ts` (help and copy checks): 2 files, 18 tests passed.
- The failing-first probe is described under the first criterion. The worktree was clean after it.
- No layer-baseline entry, no `BASELINE_SIZE` change, no composition root, no `src-tauri/` change.
- The commit bodies have Context, Problem (on the fix), Solution, Behavior and Files.

## Resolution

1. minor (`kind: one-on-one` written by New 1:1): kept as is. The review accepts it: without it a note made from a template that lacks the kind and the tag would never count. Switching to the tag is the owner's call.
2. minor (older 1:1 notes without the kind or the tag stop counting): no code change; this is the rule the Issue sets. The owner checks or backfills the vault.
3. nit (exported constants): fixed. `ONE_ON_ONE_KIND` and `ONE_ON_ONE_TAG` are module-private.
4. nit (quoted `kind` key): fixed. `withOneOnOneKind` treats `"kind":` and `'kind':` as an existing key, so it adds no duplicate; covered by a new case in `one-on-one.logic.test.ts` that failed before the change.
