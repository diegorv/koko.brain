# Adversarial review: Issue 06 (rename Auto Move to Auto Organize)

Read-only, against main at 17892c5ed, with Issue 03 assumed to land as written. Post-06 names are mapped to today's `auto-move` names. Owner decisions (name, no migration, docs merged in) are not reopened.

## Findings

### F1. data-loss + spec-error: the five help examples cannot go into the example rules file

- **Issue lines:** 73 (Acceptance: "put them in `help/examples/auto-organize-features/.kokobrain/auto-organize-rules.json` (or a test fixture)"), 36 (Behavior 5, same path). Issue 12 line 23 (its Behavior 4) builds on it: "added to `help/examples/auto-organize-features/.kokobrain/auto-organize-rules.json` ... as Issue 06 does for its examples".
- **Evidence:**
  - Wrong path: there is no `.kokobrain/` folder in the example. The file is flat, `help/examples/auto-move-features/auto-move-rules.json` (`git ls-files help/examples/auto-move-features`).
  - The example README tells the user to copy that file's rules into their own vault's `.kokobrain/` and enable the feature (`help/examples/auto-move-features/README.md:53-57`). `help/examples/SCOPING.md:77-80` says why every rule there is folder-scoped: "Rules run on every note in the vault."
  - The examples the Issue asks for are not scoped (`status == "blocked"` sets `_icon`/`_color`, `type == "meeting"`, `status == "done"` moves to `Archive/`, Behavior 7, lines 57-61). A user who follows the README stamps icons, colors and properties on every matching note in their vault, and moves every `done` note to the vault-root `Archive/`. Those are mass wrong writes.
  - The repo's tests already refuse it:
    - `findOffenders` flags any rule in that file without a path predicate (`src/tests/help/examples-scoping.test.ts:231-235`, `PATH_PREDICATE_RE` at `:54-55`).
    - "every rule ... moves it inside the folder" requires a destination under the example folder for every rule (`:420-430`). A property-only rule (empty destination) or `Archive/` fails it.
    - The ALLOWLIST cannot take the file either: each entry must name a folder issue 02-07 (`:393-396`). The implementer would have to weaken a test, which CLAUDE.md forbids.
- **Minimal fix:** in Acceptance 73, replace "put them in `help/examples/.../.kokobrain/auto-organize-rules.json` (or a test fixture)" with "put them in a test fixture under `src/tests/` (not in the example rules file, which users copy into their vault and which must stay folder-scoped, `SCOPING.md`)". In Behavior 5, change the path to `help/examples/auto-organize-features/auto-organize-rules.json` (flat). Make the same change to Issue 12 Behavior 4 and its Acceptance: the pair goes in the same fixture.

### F2. spec-error: trap 1 states a false fact and forbids correct examples

- **Issue lines:** 49 ("system keys need their underscore in a filter: `_archived == true` ... Only `type` also works without it (`evaluator.ts:93-95`)") and 63 ("no `archived == true`").
- **Evidence:**
  - `buildNoteRecord` always sets the bare flags `organized`, `archived` and `favorite` (`src/lib/features/collection/collection.logic.ts:61-65`; the comment there cites `archived == true` as the intended filter).
  - The page the Issue makes the source of truth says the same: "`archived` and `_archived` are different fields, not aliases ... Prefer the flag spelling" (`help/documentation/12-collection.md:389-401`).
  - So `archived == true` is valid and recommended. Only `_icon`/`_color`/`_title_color` have no bare form. The alias table is at `evaluator.ts:95-97`, not 93-95.
  - As written, the help page would contradict `12-collection.md`, and line 63 would make the implementer rewrite correct examples.
- **Minimal fix:** trap 1 becomes "`_icon`, `_color` and `_title_color` need their underscore in a filter. Only `type` works without it among plain keys (`evaluator.ts:95-97`). `archived`/`organized`/`favorite` are normalized flags with defaults, and `_archived` etc. are the raw value; link `12-collection.md` 'archived and _archived are different fields'." On line 63, drop "no `archived == true`".

### F3. spec-error: trap 3 is wrong for builder filters after Issue 03

- **Issue line:** 51 ("a method on a missing property throws, so the rule is skipped and logged").
- **Evidence:**
  - This holds only for a string expression, through `findMatchingRules` and `onError` (`auto-move.logic.ts:76-86`; Issue 03 Behavior 2 keeps that path).
  - Issue 03 sends an object filter through `evaluateFilter`. Its `try` wraps evaluation as well as parsing, and returns `false` with no report (`collection.logic.ts:323-330`). Inside `not` ("none") that `false` becomes a match (`:340-342`).
  - Issue 03's pre-check covers only parse errors and blank values (`03-...md:15`). So a "none" raw row `status.lower() == "done"` matches every note without `status`, silently.
  - The page would tell users the rule is skipped and logged when it is not.
- **Minimal fix:** append to trap 3: "This holds for a rule written as one expression. Inside a builder group the condition is silently false, and in a 'none' group it counts as a match. Use the direct comparison or the `isEmpty` guard there too." The behavior itself is Issue 03's. Whether to report it is for 03's review, not this Issue.

### F4. spec-error: Acceptance 70 cannot pass together with Acceptance 69

- **Issue lines:** 69 (a service test proves that "a vault holding only `auto-move-rules.json` loads no rules") and 70 (the grep over `src/` may find only the "Formerly called Auto Move" line and `.scratch`).
- **Evidence:**
  - The test of line 69 must contain the literal `auto-move-rules.json` under `src/tests/`, which the grep of line 70 forbids.
  - `.scratch` is not under `src/ help/ e2e/ scripts/`, so "finds ... the `.scratch` history" is impossible as worded.
- **Minimal fix:** line 70 becomes "... finds only the 'Formerly called Auto Move' line in `22-auto-organize.md` and the legacy-file test in the service test file."

### F5. contradiction: PRD decisions 2 and 9 still name the old file and the old tag

- **Issue lines:** 28-29 (the table renames the file to `auto-organize-rules.json` and the tag to `AUTO-ORGANIZE`), 32.
- **Evidence:**
  - `PRD.md:12` (Decision 2) says "Rules stay in `.kokobrain/auto-move-rules.json`".
  - `PRD.md:21` (Decision 9) logs with `error('AUTO-MOVE', ...)`.
  - The PRD calls both decisions final ("Do not reopen them", `PRD.md:9`). Issues 07-12 tell the agent to read the PRD first (e.g. `07-...md:3`).
- **Minimal fix:** add one Note to Issue 06: "Supersedes the file name in PRD Decision 2 and the log tag in Decision 9 (owner, 2026-11-10). The delivering agent updates those two lines of `PRD.md`." Or edit the PRD now.

### F6. spec-error (low): trap 4 understates the identifier rule

- **Issue line:** 52 ("plain ASCII letters, digits and `_` (`tokenizer.ts:131-165`)").
- **Evidence:** a hyphen followed by a letter continues an identifier (`src/lib/features/collection/expression/tokenizer.ts:143-151`). So `due-date` is a valid property name, and `a-b` is read as one name, not as a subtraction. An identifier cannot start with a digit (`:131`).
- **Minimal fix:** "ASCII letters, digits, `_`, and a hyphen before a letter (`due-date`). It must not start with a digit, and `a-b` is one name: write `a - b` to subtract (`tokenizer.ts:130-165`)."

## Not blocking

- `docs/FEATURES.md:36` links `help/documentation/22-auto-move.md`. Behavior 5 lists only `help/`, READMEs and in-app help, so after the `git mv` that link is dead and the grep (no `docs/`) misses it. Add it to Behavior 5.
- Keep the heading "Type-Driven Lifecycle Rules" in the rewritten page. `03-editor.md:52` and `25-types-and-relationships.md:63,276` link `#type-driven-lifecycle-rules`. No test checks anchors.
- Behavior 3 could say that type `_archive_to` moves also stop until Auto Organize is enabled again: the hook gates lifecycle rules on the same flag (`auto-move.service.ts:130,133`, `app-lifecycle.service.ts:443`).
- Trap 5 "the moment of the save" is really the evaluation time, after the debounce (`auto-move.service.ts:148-158,207`). The advice ("do not filter on them") stands.
- Issue 05 (`needs-triage`) still uses the pre-06 names (`05-...md:3`, `auto-move.service.ts:96`). Rename them when it is triaged.

## Tried and could not refute

- The Gate is frontend only: `src-tauri/` has no mention of the name, and no `#[ts(export)]` type involves it.
- Only `settings.types.ts:359`, `settings.logic.ts:279`, `SettingsPanel.svelte:54,81` and two test lists use the section id. No persisted deep link or command opens the section by id.
- The baseline rename keeps the count and the order (`feature-cycle-baseline.json:4-6`). `layer-baseline.json` has no entry.
- No migration loses data only within the owner's decision: `settings.service.ts:155-158` drops `autoMove`, and the next save writes `autoOrganize`. Nothing else in `src/` reads `auto-move-rules.json` (only `auto-move.service.ts:33`), so the old file sits on disk untouched. No rename, create or write loop comes from the rename.
- Acceptance 68 and 69 fail today. The nav shows "Auto Move" under `auto-move`, and a vault with `auto-move-rules.json` loads its rules.
- `help/examples/mods/kokobrain-mod.d.ts:396` ("Auto Move" in JSDoc) is not pinned by `mods-types.test.ts`, which compares only the exported `*V1` type names.
- `scripts/sync-wiki-docs.mjs` and its test hard-code no page name.
- The blocker on 03 is correct. 01, 02 and 04 are on main (`countMatchingNotes`, `ownedProperties`, vault-relative `inFolder`). Issues 07-11 use the post-06 names consistently. Only Issue 12 inherits F1's path.
- The functions and `file.*` fields listed in Behavior 7 exist (`evaluator.ts:198-206,363-407,567-588`). Not verified: the exact `today() + "7d"` arithmetic form the page will quote.
