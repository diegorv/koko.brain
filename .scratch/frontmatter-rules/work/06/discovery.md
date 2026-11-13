# Issue 06 discovery: rename Auto Move to Auto Organize

No `spec.md` for this feature; `PRD.md` holds the decisions (2 and 9 name the old file and log tag).

## What changes

- **Code (git mv + mechanical rename):** `src/lib/features/auto-move/` (8 files) to `auto-organize/`, `src/tests/lib/features/auto-move/` (7 tests) to `auto-organize/`, `src/tests/fixtures/AutoMoveRuleRowHarness.svelte`. Identifier map: `auto-move` to `auto-organize`, `AutoMove` to `AutoOrganize`, `autoMove` to `autoOrganize`, `AUTO-MOVE` to `AUTO-ORGANIZE`, `Auto Move` / `Auto-move` / `auto-move` prose to Auto Organize.
- **Callers:** `settings.logic.ts:279` (id + label), `settings.types.ts:286-290,359,407-408`, `settings.store.svelte.ts:1,110,179,303-307`, `settings.service.ts:155-157`, `SettingsPanel.svelte:11,54,81`, `app-lifecycle.service.ts:77,296-303,443-447,669`, comments in `properties/lifecycle.{logic,service}.ts`.
- **Tests naming the old name:** `settings.logic.test.ts:373,389`, `settings.store.test.ts:260-263`, `settings-controls.test.ts:24`, `raw-write-ratchet.test.ts:32`, `app-lifecycle.service.test.ts:222-225,275,484-495,1647,1676`, `feature-cycle.test.ts:121-124`, `feature-cycle-baseline.json:4-6` (renamed in place, count unchanged), `mod-vault.service.test.ts:510`, `lifecycle.service.test.ts:249`, `examples-scoping.test.ts:6-7,231,351-359,405-430`. `layer-baseline.json` has no auto-move entry.
- **Help:** `22-auto-move.md` to `22-auto-organize.md` (rewritten, Behavior 7), `help/examples/auto-move-features/` to `auto-organize-features/` (flat `auto-organize-rules.json`), `SCOPING.md:78-122`, `README.md:43`, `19-settings.md:9,236-245`, `01-getting-started.md:136`, `03-editor.md:52`, `12-collection.md:266`, `25-types-and-relationships.md:63,267,276,345`, `28-mods.md:304,308`, `mods/04,05,09,13,14`, `help/examples/mods/kokobrain-mod.d.ts:396`.
- **Docs outside help:** `docs/FEATURES.md:36`, `docs/INSPIRATIONS.md:14`, `CONTRIBUTING.md:183`, `CLAUDE.md:70` (folder listing). ADRs untouched. `scripts/sync-wiki-docs.mjs` and `e2e/` have no page name.
- **PRD.md** Decisions 2 and 9 (amendment 6).

## Plan

1. Failing test: `settings.logic.test.ts` asserts the Vault group has `{ id: 'auto-organize', label: 'Auto Organize' }`.
2. `git mv` the folders and files, then a scripted case-preserving rename over the listed files. New service test: loads from `.kokobrain/auto-organize-rules.json`; a vault holding only `auto-move-rules.json` loads no rules (mock `exists` true only for the legacy path). Commit.
3. Help, examples and docs rename; commit.
4. Rewrite `22-auto-organize.md` (overview, Filters with reference and traps, Actions, five complete examples). New `src/tests/help/auto-organize-doc-examples.test.ts` plus fixture `src/tests/help/fixtures/auto-organize-doc-examples.json`: each rule runs through `findMatchingRules`, `ownedProperties`, `propertiesToWrite` against a sample note, and the test checks the page contains each fixture expression so the two cannot drift. Commit.
5. PRD decisions; commit.

## Prior art

Service load tests in `auto-move.service.test.ts:58-160` (mocked `exists`/`readTextFile`); help example tests in `examples-scoping.test.ts:405-430` (builds records with `buildNoteRecord`).

## Risks and defaults

- Blind sed could hit "auto-moved" style words; every replacement is reviewed by a final grep.
- `22-auto-move.md:219` says `Archive/{type}/{year}` gives `Archive/project/2026/`, but `{type}` is capitalised (table row above it): the rewrite says `Archive/Project/2026/` after checking `resolveDestination`.
- Default: the "Formerly called Auto Move." line is the only old-name hit in help; the legacy-file service test is the only hit in src.
