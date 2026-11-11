VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: a Settings test asserts that the navigation shows "Auto Organize" under the section id `auto-organize`. — `src/tests/lib/core/settings/settings.logic.test.ts:392-395` asserts `toContainEqual({ id: 'auto-organize', label: 'Auto Organize' })` in the Vault group. On main `settings.logic.ts:279` is `{ id: 'auto-move', label: 'Auto Move' }`, so the test fails there; it passes on the branch.
- [met] A service test asserts that the rules load from `.kokobrain/auto-organize-rules.json`, and that a vault holding only `auto-move-rules.json` loads no rules. — `src/tests/lib/features/auto-organize/auto-organize.service.test.ts:76-108`: `vaultWith()` makes `exists`/`readTextFile` answer only for one path; the new path loads rule `r1`, the legacy-only vault leaves `rules`/`excludedFolders` empty, `isConfigLoaded` true and `readTextFile` never called.
- [met] A case-insensitive grep for `auto-move`, `automove`, `auto_move` and `Auto Move` over `src/`, `help/`, `e2e/` and `scripts/` finds only the "Formerly called Auto Move" line and the `.scratch` history. — `grep -rniE 'auto-move|automove|auto_move|auto move' src help e2e scripts docs --exclude-dir=adr` returns only `22-auto-organize.md:3` and the legacy-file test at `auto-organize.service.test.ts:99-100`, which amendment 5 allow-lists. `src-tauri/`, `.github/`, `.claude/` and root configs have no hit either.
- [met] `feature-cycle-baseline.json` has the same number of entries, with `auto-organize` in place of `auto-move`, and `layer-rules.test.ts` passes. — 30 `featurePairs` on main and on the branch, the three pairs at lines 4-6 renamed in place. `layer-baseline.json` and `BASELINE_SIZE` (3) untouched. `src/tests/lib/architecture/` passes (layer-rules and feature-cycle included).
- [met] `src/tests/help/` and `src/tests/scripts/sync-wiki-docs.test.ts` pass with the renamed page and examples. — Both ran green in the targeted run below. `scripts/sync-wiki-docs.mjs` holds no page name.
- [met] `22-auto-organize.md` has the overview example, the Filters section with the reference and every trap in Behavior 7, the Actions section, and the five complete examples. Each example rule is valid: put them in `help/examples/auto-organize-features/.kokobrain/auto-organize-rules.json` (or a test fixture), and have `examples-scoping.test.ts` or a new test parse and evaluate each against a sample note. — Overview (lines 11-31), Filters with builder groups, reference table and the six traps as amended (lines 70-186), Actions (188-299, Icon marked legacy), five examples (301-390). Per amendment 1 the rules are not in the shipped example file; `src/tests/help/auto-organize-doc-examples.test.ts` reads every json block of Overview and Examples from the page and runs each through `findMatchingRules`, `findMoveRule`/`resolveDestination`, `ownedProperties` and `propertiesToWrite` against fixture notes (matches and misses). I also probed every reference row and trap against the evaluator (see Verification).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0, 0 errors, 0 warnings. Targeted vitest run green (below). The full `pnpm vitest run` is deliver's to run.

## Findings

1. **minor** `help/examples/auto-organize-features/README.md:41-43`: the branch edits line 41 (`autoOrganize.debounceMs`) but leaves "default 2000 ms" and "The **first matching rule wins**, later rules are skipped" in place. The default is 3000 ms (`settings.store.svelte.ts:112`), and since Issues 01-03 every matching rule applies its properties, with only the first rule that has a destination moving the note (`22-auto-organize.md:43`). This README is the one users follow to copy the example rules, so it now contradicts the page it links to. Fix: say 3000 ms and reuse the page's line 43 wording. Pre-existing, but this Issue rewrites the help, and the build report lists it as left undone.
2. **minor** `src/tests/lib/core/settings/` (no test): Behavior 3 says the `autoMove` settings key is never read again, and nothing pins that. A `parseSettings` test given `{"autoMove":{"enabled":true}}` that expects `autoOrganize.enabled === false` would catch a later fallback or legacy alias. The rules-file half has a test; the settings half has none. Optional, since the acceptance list only names the rules file.
3. **nit** `.scratch/frontmatter-rules/PRD.md:12-13`: Decision 2 is still titled "Extend Auto Move in place", and Decision 3 still cites `auto-move.service.ts:94-127`, a path that no longer exists. Amendment 6 only asks for the file and log-tag names, so this is optional. Fix: point Decision 3 at `auto-organize.service.ts`.

No blocker or major findings. Nothing that is not a feature file was renamed by mistake. ADRs and `.scratch` history are untouched, and the Settings icon `FolderOutputIcon` is kept.

## Verification

- **Rename is mechanical:** each renamed source file (`auto-organize.{logic,service,store.svelte,types}.ts`, `type-lifecycle-rules.ts`, the three `AutoOrganize*.svelte` components, `AutoOrganizeRuleRowHarness.svelte`, `auto-organize.store.test.ts`) is byte-identical to its main version after a sed of `auto-move/AutoMove/autoMove/AUTO-MOVE/Auto Move` to the new names (empty `diff`). No behavior change hides in the rename. The store test and harness show up as delete plus create only because git's similarity heuristic misses them on such short files.
- **No migration:** `settings.service.ts:155-157` reads only `parsed.autoOrganize`. `auto-organize.service.ts` builds its path only from `auto-organize-rules.json`. No fallback, copy step or alias.
- **Doc claims, checked with a throwaway probe test (deleted, not committed):** every row of "What a filter can use" evaluates as the page says:
  - `file.folder` is absolute, and `file.ext` is `.md`.
  - `file.tags` holds body tags, and `hasTag` is variadic and case-insensitive.
  - `contains`/`startsWith` are case-insensitive.
  - `"1h 30m"`, `"2 weeks"` and `"1M"` all parse.

  Every trap checks out:
  - `color`/`icon`/`title_color` give false and the underscore forms give true. `_type == "meeting"` equals `type == "Meeting"`.
  - `archived` is false where `_archived` is null, and `_archived == false` is false.
  - `stauts == null` is true.
  - `nostatus.lower()` throws, and the `!isEmpty(...) &&` guard short-circuits to false.
  - A single-expression throw is skipped and reported, while a throw inside `not` matches with no report.
  - `total-spent` reads as one identifier, and `total - spent` subtracts.
  - `file.size` is 0.
  - `{parent}` on a top-level note resolves to the vault root, `Archive/{type}/{year}` gives `Archive/Project/2026`, and an empty `and` matches nothing.

  The cross-page anchors (`12-collection.md` #expression-language-reference, #fileinfolder-..., #archived-and-_archived-..., `02-file-explorer.md` #frontmatter-icons and #custom-file-icons, `25-types-and-relationships.md` #frontmatter-key-aliases) exist.
- **Typecheck:** `pnpm check`: exit 0, 0 errors.
- **Tests my verdict rests on** (one `pnpm vitest run` call, exit 0, 91 files, 1877 tests):
  - `src/tests/lib/features/auto-organize/`
  - `src/tests/lib/core/settings/`
  - `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`
  - `src/tests/lib/architecture/`
  - `src/tests/lib/raw-write-ratchet.test.ts`
  - `src/tests/lib/plugins/mods/mod-vault.service.test.ts`
  - `src/tests/lib/features/properties/`
  - `src/tests/help/`, which includes the new `auto-organize-doc-examples.test.ts` and `examples-scoping.test.ts`
  - `src/tests/scripts/sync-wiki-docs.test.ts`

## Resolution

1. Fixed. `help/examples/auto-organize-features/README.md:41-46` says default 3000 ms and uses the wording of `22-auto-organize.md:43` (every matching rule applies its properties, the first matching rule with a destination moves the note); the list is renumbered.
2. Fixed. `src/tests/lib/core/settings/settings.service.test.ts` adds a `loadSettings` test: a settings.json holding only `{"autoMove":{"enabled":true,"debounceMs":500}}` loads `autoOrganize.enabled === false` and the default debounce.
3. Fixed. `.scratch/frontmatter-rules/PRD.md:12-13`: Decision 2 is titled "Extend Auto Organize in place", Decision 3 points at `registerAutoOrganizeHook` in `auto-organize.service.ts`.
