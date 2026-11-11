# 06: Rename Auto Move to Auto Organize everywhere, and document filters and actions

**What to build:** the feature now moves notes and sets their properties, icons and colors (Issues 01-03), so "Auto Move" no longer describes it. Rename it to **Auto Organize** everywhere: user-visible strings, code, config and help. **No migration:** the owner decided on 2026-11-10 that old configs are not carried over. The same Issue completes the help page, so a user learns from it which filters and actions exist (Behavior 7).

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`. Nothing under `src-tauri/` uses the name.

### Behavior

1. **User-visible:**
   - the Settings navigation label (`src/lib/core/settings/settings.logic.ts:279`);
   - the section heading and the "Enable Auto Move" switch (`AutoMoveSection.svelte:108,111`);
   - every hint, placeholder and empty state in the feature.
   
   All of them say Auto Organize.
2. **Code:**

   | Today | After |
   |---|---|
   | `src/lib/features/auto-move/` | `src/lib/features/auto-organize/` |
   | `src/tests/lib/features/auto-move/` | `src/tests/lib/features/auto-organize/` |
   | `AutoMove*` components, types and functions; `autoMoveStore`; `auto-move.*.ts` files | `AutoOrganize*`; `autoOrganizeStore`; `auto-organize.*.ts` |
   | settings section id `'auto-move'` (`settings.types.ts:359`, `SettingsPanel.svelte:54,81`, `settings.logic.ts:279`) | `'auto-organize'` |
   | settings key `autoMove`, `updateAutoMove` (settings store, types, persistence) | `autoOrganize`, `updateAutoOrganize` |
   | vault file `.kokobrain/auto-move-rules.json` | `.kokobrain/auto-organize-rules.json` |
   | log tag `AUTO-MOVE` | `AUTO-ORGANIZE` |
   
   Keep file contents and behavior identical: this is a rename only. Use `git mv`, so history follows the files.
3. **No migration.** The app never reads `auto-move-rules.json` or the `autoMove` settings key again. An existing vault starts with Auto Organize disabled, the default, and with no rules. Do not add a fallback read, a copy step or a legacy alias.
4. **Architecture baseline:** rename the three `auto-move -> ...` entries in `src/tests/lib/architecture/feature-cycle-baseline.json:4-6` to `auto-organize -> ...` in place. The count does not change. The owner signed this off on 2026-11-10 as part of this rename. It is not a new entry. Check `layer-baseline.json` and the composition-root list for the old path too.
5. **Help and examples:**
   - `git mv help/documentation/22-auto-move.md help/documentation/22-auto-organize.md`. Update every link to it across `help/`, `README`s and the in-app help. Add one line near the top: "Formerly called Auto Move."
   - `help/examples/auto-move-features/` becomes `help/examples/auto-organize-features/`, including its `.kokobrain/auto-move-rules.json`. Update `help/examples/SCOPING.md` and `src/tests/help/examples-scoping.test.ts`.
   - `help/documentation/README.md:43`: the row reads Auto Organize, described as "Move notes and set their properties, icons and colors with rules".
   - `help/documentation/19-settings.md:9,236-245`: the new name, the new key and file names, and a line saying a rule can set properties, not only move notes.
   - Prose and identifiers in `01-getting-started.md`, `03-editor.md`, `12-collection.md`, `25-types-and-relationships.md`, `28-mods.md` and `help/documentation/mods/*.md`. That includes `autoMove`/`updateAutoMove` in `mods/09-raw-app.md:927,945`. The raw mod API is unstable, and no owner mod uses those names (checked in `~/kokobrain-vaults/kokobrain-mods-src` on 2026-11-10).
   - Check `scripts/sync-wiki-docs` and its test for a hard-coded page name.
6. **Not renamed:** `.scratch/` history, ADRs, and past commit messages. The Settings icon (`FolderOutputIcon`) stays; changing it is the owner's call.

7. **Help page content** (`22-auto-organize.md`; the rename and this content land together, so the page is rewritten once):
   - **An overview example near the top:** one rule with a filter, a move and two properties, read in plain words ("when ..., move to ... and set ...").
   - **"Filters" section**, replacing "Writing Expressions":
     - a compact reference of what a rule filter can use, with one example each: comparison (`==`, `!=`, `<`, `>`, `<=`, `>=`); combining (`&&`, `||`, `!`, parentheses); the `file.*` fields (`name`, `basename`, `folder`, `path`, `ext`, `tags`); `file.hasTag()`, `file.inFolder()`, `file.hasProperty()`; list and text checks (`contains`, `startsWith`, `isEmpty`); dates (`today()`, `now()`, `date()`, durations such as `"7d"`). Take each from `12-collection.md` "Expression Language Reference" (`:264` on), verify it against `src/lib/features/collection/expression/evaluator.ts` and `methods.logic.ts`, and link to that reference for the rest;
     - the visual builder groups from Issue 03 ("all", "any", "none"). Keep 03's text and move it here if it lives elsewhere on the page;
     - **traps**, each with the wrong and the right form:
       - system keys need their underscore in a filter: `_archived == true`, `_icon`, `_color`. Only `type` also works without it (`evaluator.ts:93-95`);
       - a misspelled property is empty, not an error, so `stauts == null` matches every note. Check "Matches N notes now";
       - a method on a missing property throws, so the rule is skipped and logged: `status.lower() == "done"` on a note without `status`. Compare directly (`status == "done"`), or guard with `!isEmpty(status) && ...`;
       - property names in a filter must be plain ASCII letters, digits and `_` (`tokenizer.ts:131-165`);
       - in rules, `file.mtime` and `file.ctime` are the moment of the save, and `file.size` is 0 (`auto-organize.service.ts`, `buildNoteRecord(filePath, content, Date.now(), Date.now())`). Do not filter rules on them;
       - date conditions are checked only when a note is saved: `due < today()` does not fire at midnight.
   - **"Actions" section** that lists the two actions in one place, before their details: **Move to folder** (with Dynamic Destinations and Excluded Folders) and **Set properties** (modes, value types, icons and colors). The legacy Icon option is listed as legacy.
   - **Examples** rewritten as complete rules, filter plus actions, at least:
     - only set a property: folder to relationship;
     - only set an icon and color: `status == "blocked"`;
     - set properties by type or tag: `type == "meeting"` or `file.hasTag("1on1")`;
     - move and set together: `status == "done"` moves to `Archive/` and sets `_color`;
     - an "any" filter: `status == "done" || status == "dropped"`.
     
     Every example must match the engine as it is: no `archived == true`, no unquoted wikilinks.
   - The old "Move notes where..." wording in the expression examples is gone.

### Acceptance

- [ ] Failing test first: a Settings test asserts that the navigation shows "Auto Organize" under the section id `auto-organize`.
- [ ] A service test asserts that the rules load from `.kokobrain/auto-organize-rules.json`, and that a vault holding only `auto-move-rules.json` loads no rules.
- [ ] A case-insensitive grep for `auto-move`, `automove`, `auto_move` and `Auto Move` over `src/`, `help/`, `e2e/` and `scripts/` finds only the "Formerly called Auto Move" line and the `.scratch` history.
- [ ] `feature-cycle-baseline.json` has the same number of entries, with `auto-organize` in place of `auto-move`, and `layer-rules.test.ts` passes.
- [ ] `src/tests/help/` and `src/tests/scripts/sync-wiki-docs.test.ts` pass with the renamed page and examples.
- [ ] `22-auto-organize.md` has the overview example, the Filters section with the reference and every trap in Behavior 7, the Actions section, and the five complete examples. Each example rule is valid: put them in `help/examples/auto-organize-features/.kokobrain/auto-organize-rules.json` (or a test fixture), and have `examples-scoping.test.ts` or a new test parse and evaluate each against a sample note.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Review amendments (2026-11-10)

From the scout and adversarial reviews in `.scratch/frontmatter-rules/research/issue-review-06*.md` and `issue-review-cross.md`. **These override the Behavior and Acceptance above where they differ.** The run order and the shared gates are in `PRD.md`, "Run order and gates for Issues 07-13".

1. **Examples are not put in the shipped example rules file.** Users copy `help/examples/auto-organize-features/auto-organize-rules.json` into their vaults (README there), and its rules must stay folder-scoped (`SCOPING.md`, `examples-scoping.test.ts:231-235,405,420-430`). The file is flat, not under `.kokobrain/`. The five help examples (Behavior 7) are checked from a test fixture under `src/tests/help/`. Each one is parsed and run through `findMatchingRules`, `ownedProperties` and `propertiesToWrite` against a sample note.
2. **Trap 1 corrected:**
   - in a filter, the underscore is required only for `_icon`, `_color` and `_title_color`. `type` is aliased (`evaluator.ts:95-97`);
   - `organized`, `archived` and `favorite` always exist as derived true/false flags (`collection.logic.ts:61-65`). They are the recommended spelling for "is it archived" (`12-collection.md:389-401`). `_archived` is the raw value and is null when absent;
   - drop "no `archived == true`" from the examples rule.
3. **Trap 3 is scoped:**
   - a single-expression rule whose condition throws is skipped and reported;
   - in a builder (object) filter, a throwing condition counts as false. Inside "none", that makes it match: point to Issue 03's note on the page and to Issue 13, which fixes it.
4. **Trap 4 reworded:** a property name may contain letters, digits, `_`, and a hyphen before a letter (`due-date`). It may not start with a digit. Write `a - b` with spaces to subtract (`tokenizer.ts:143-151`).
5. **The grep acceptance** allow-lists the "Formerly called Auto Move" line and the legacy-file test (which names `auto-move-rules.json`). Drop the `.scratch` clause.
6. **PRD.** The delivering agent updates `PRD.md` Decisions 2 and 9 to the new names (`auto-organize-rules.json`, `AUTO-ORGANIZE`).
7. **Rename table:** add `src/tests/fixtures/AutoMoveRuleRowHarness.svelte` (from Issue 03) and the link in `docs/FEATURES.md:36`. Grep `docs/` too.

## Notes

- **Origin:** the owner chose the name "Auto Organize" on 2026-11-10, from Automations, Note Rules, Rules and Auto Organize. The owner then asked for a full rename with no migration: no vault uses Auto Move today, so nothing is lost.
- Blocked by 03, because 03 rewrites `AutoMoveRuleRow.svelte`. Doing the rename after 03 avoids a conflict on every file of the feature.
- Large but mechanical: about 62 files mention the name. Behavior 7 is docs only. It was merged in on the owner's request, to rewrite the help page once.

## Comments
