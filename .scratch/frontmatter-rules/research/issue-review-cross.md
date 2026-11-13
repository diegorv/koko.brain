# Cross-Issue review: Issues 06 to 12 (Auto Organize)

Read-only. Code at main `5812efc78`. Issue 03 has landed there (`054ace345`, ledger row 03 `done`), so 06 is unblocked. Post-06 names map to today's `src/lib/features/auto-move/`. Issue lines are `NN:line` in `.scratch/frontmatter-rules/issues/`. Findings already raised in a per-Issue review are listed here only when they involve two or more Issues, and they cite that review. Owner decisions are not reopened, and no fix adds scope.

## Findings

### C1. high, 01/08/09/10/11: the run order of the consequences is never stated in one place, and the Issues disagree

- **Evidence:**
  - Today the run is: build the record once (`auto-move.service.ts:207`), match (`:212`), move (`:221-251`), then the legacy icon and the properties at `targetPath` inside the skip set (`:254-267`). A failed move returns before any write (`:238,247,249`; PRD Decision 9, `PRD.md:21`).
  - 09 gives no position for the create step (`09:18-27`).
  - 10 runs "after the move and the property writes" with the path "after the run's move" (`10:15,19`).
  - 11 sets "rename first, then move, then write the properties" (`11:22`) and leaves out 09's create and 10's action.
  - 08 evaluates values "against the same record as the filter" (`08:19`), which is the record from before the move and before 11's rename (`auto-move.service.ts:207`). So 09's `{basename}` create path and 08's `title: file.basename` use the old name after an 11 rename. With 11's volatile names (allowed, `11:31`), a rule that renames and creates `{folder}/{basename} follow-up.md` creates one note per save (also `issue-review-11.md` F4).
  - Raised separately in `issue-review-09.md` F5, `issue-review-10.md` F8 and `issue-review-11.md` F4. Each fix only patches one side.
- **Minimal fix:**
  - 09 Behavior 4: "Order: move, legacy icon, properties, then create. A failed move skips the create. The path variables and `createNote.properties` use the run's record."
  - 10 Behavior 3/4: "after the create step (Issue 09); `notePath` is the note's final path in the run."
  - 11 Behavior 2, the full list: "rename, move, legacy icon, properties, create note (09), mod action (10). After a rename, the destination template, Issue 08 values and Issue 09's create path use the new name and path."

### C2. high, 06/12: Issue 12 builds on 06's example-file target, which is the wrong path and breaks the scoping tests, and 12 has no fixture fallback

- **Evidence:**
  - 06 puts its five examples in `help/examples/auto-organize-features/.kokobrain/auto-organize-rules.json` "(or a test fixture)" (`06:36,73`). 12 puts its pair in the same file, "as Issue 06 does", with no fallback (`12:23,28`).
  - The example has no `.kokobrain/` folder: `help/examples/auto-move-features/` holds `Inbox/`, `README.md` and a flat `auto-move-rules.json`.
  - That file is copied by users into their vault, so every rule must be folder-scoped (`help/examples/SCOPING.md:77-80`). The test enforces this: `findOffenders` flags a rule without a path predicate, and `describe('auto-move-features rules stay inside the example folder')` (`src/tests/help/examples-scoping.test.ts:405`) requires a destination inside the folder. 12's `status != "blocked" -> remove _color` is unscoped and has no destination, so it fails both. Detail in `issue-review-06.md` F1.
  - 12 needs more than 06's harness promises. 06 asks to "parse and evaluate each against a sample note" (`06:73`), which is a filter match. 12 asserts "the expected `_color` result for each" (`12:28`), which needs the planner (`ownedProperties`, `propertiesToWrite`, `auto-move.logic.ts:250,275`).
  - If both sets of examples share one file, ownership decides the result (first matching rule owns the key, `01:41`). 06's "`status == "blocked"` sets an icon and color" (`06:58`) owns `_color` before 12's pair, so 12's "red" assertion depends on 06's chosen color. A 12 `status != "blocked"` rule placed above 06's "`status == "done"` ... sets `_color`" (`06:60`) removes that color.
- **Minimal fix:**
  - 06 Behavior 5 and Acceptance 73: the help examples go in a test fixture under `src/tests/help/`, not in the example rules file. The example file path is the flat `help/examples/auto-organize-features/auto-organize-rules.json`.
  - 12 Behavior 4 and Acceptance: "the pair goes in its own fixture under `src/tests/help/` (not in 06's examples), and the test runs `findMatchingRules`, `ownedProperties` and `propertiesToWrite` on a `blocked` and an `active` sample." 12's gate (`src/tests/help`) then still covers it.

### C3. medium, 09/10/11: a rule whose only consequence is new is dropped by the run and flagged "does nothing" in Settings

- **Evidence:** the run returns when the moving rule has no icon and no rule owns a property: `if (!rule?.icon && owned.length === 0) return;` (`auto-move.service.ts:255`). Settings flags a rule with no destination and no properties (`doesNothing`, `AutoMoveRuleRow.svelte:79`). A create-only (09), action-only (10) or rename-only (11) rule therefore never acts and shows the "does nothing" hint. A rename must also run before the move (`11:22`), which is above that return. None of the three Issues says to widen these lines. Only `issue-review-09.md` F5 and `issue-review-10.md` F2 mention the return, and only `issue-review-11.md` (Not blocking 5) mentions `doesNothing`. All three Issues edit the same two lines in sequence.
- **Minimal fix:** one line in 09, 10 and 11 Behavior: "A rule whose only consequence is <this one> runs: the service's no-work return and `doesNothing` count it, keeping the cases the previous Issues added." One test each.

### C4. medium, PRD/01 vs 09/10/11: the PRD Decision 10 gates cover only property writes, so one rule writes some consequences on a note it must not touch

- **Evidence:** the gates (not Markdown, `_system`, templates folder, type definition, unsafe frontmatter) run only inside the property writer (`auto-move.service.ts:306-313`, `propertyWriteSkipReason` at `auto-move.logic.ts:314`). Matching runs on any after-saved file but `.view` (`auto-move.service.ts:129`). 09 gates only its target (`09:28-30`). 10 and 11 have no gate. For one matching rule on a template or a type definition, the properties are skipped but the rename runs (orphaning the type's members, `issue-review-11.md` F2), and the mod action receives the path (`issue-review-10.md` F3). PRD Decision 10 says these files are "never written by a rule" (`PRD.md:22-27`).
- **Minimal fix:** one sentence in 10 Behavior 4 and in 11 (new Gates line): "Runs only when the Issue 01 Behavior 10 gates pass for the note (`propertyWriteSkipReason`); 11 skips the frontmatter-shape gates." 09 Behavior 7 adds "and the source note passes the same gates".

### C5. medium, 07/08: `add` with a volatile expression appends one item on every save

- **Evidence:** 07 appends every item not already in the list (`07:19-21`). 08 adds the result's items (`08:23`) and refuses volatile values only for `always` (`08:25`), against its own owner decision "volatile values only with `if-missing`" (`08:48`). `now()` differs on each evaluation (`evaluator.ts:363-364`). Raised by both `issue-review-07.md` F3 and `issue-review-08.md` F3.
- **Minimal fix:** 08 Behavior 4 and its Acceptance: "An `always` or `add` action whose `expr` uses `now()`, `file.mtime` or `file.ctime` is refused."

### C6. medium, 07/08: 08 changes 07's `add` load rule without saying so, and gives no type rule for an `add` result

- **Evidence:** 07 drops an `add` entry whose `value` is not a string or `string[]` (`07:15`). 08 makes `value` and `expr` alternatives (`08:18`), so an `add` with `expr` and no `value` is dropped by 07's rule unless 08 amends it. 08 then writes "the items of the result" (`08:23`) with no rule for a number, boolean, date or mixed-list result, while 07 refuses those types for `add`.
- **Minimal fix:** 08 Behavior 1: "an `add` entry needs a string or `string[]` `value`, or an `expr`." 08 Behavior 2: "With `add`, a string or a list of strings is added; any other result is a failure (Behavior 3)."

### C7. medium, 08/11: 11's `expr` relies on a conversion 08 defines only for property values

- **Evidence:** 11 computes the name "as in Issue 08" (`11:19`). 08's rules cover property writes only (`08:19-23`). A date result has no file-name form, and lists, booleans and `null` are unspecified (`issue-review-11.md` F5).
- **Minimal fix:** 11 Behavior 1: "An `expr` result is converted as in Issue 08 Behavior 2 (a date becomes `YYYY-MM-DD`, or date and time with `now()`), then the character replacement. A number becomes its text. Any other result, or a throw, does nothing and logs once per rule per session."

### C8. medium, 10 -> 11 -> 12: the chain stalls on Issue 10's external prerequisite

- **Evidence:** 10 must change `ModActionV1.run` (`node_modules/@kokobrain/mod-core/src/contract/mod-api.v1.ts:103`). That contract lives in another repository, pinned by SHA (`package.json:81`; `docs/MOD-CORE.md:3`), and the local file is a type re-export (`src/lib/plugins/mods/contract/mod-api.v1.ts:1-2`). So 10 needs an owner-pushed commit there, a lockfile change and `pnpm build`. Its Gate says frontend only and its blocker is only 09 (`10:5,9`; `issue-review-10.md` F6). 11 and 12 do not use anything from 10, but they are blocked by it (`11:9`, `12:5`), so a one-at-a-time run stops at 10.
- **Minimal fix:** add the mod-core commit to 10's "Blocked by" and `pnpm build` to its Gate. Reorder so 10 runs last: 11 blocked by 09, 12 blocked by 11, 10 blocked by 12, and update the PRD table (`PRD.md:59-61`). The order is still one Issue at a time on the same files. With 10 after 11, its `notePath` is simply the final path, which also settles `issue-review-10.md` F8.

### C9. medium, PRD vs 06/07/08/10: the PRD that every Issue says to read first contradicts them

- **Evidence:** 07 to 11 start with "Read the PRD first" (`07:3`, `08:8`, `09:8`, `10:3`, `11:7`). The PRD says:
  - the rules stay in `.kokobrain/auto-move-rules.json` (Decision 2, `PRD.md:12`) and are logged under `AUTO-MOVE` (Decision 9, `:21`), against 06's rename (`06:28-29`);
  - "Values are literals" (Decision 4, `:16`), against 08;
  - the skip set is "the whole loop protection" (Decision 6, `:18`), against 10's documented loops (`10:25`);
  - "Nothing new is added to `core/`" (`:5`), against 10's registry (`10:20`);
  - "add to list" and computed values are out of scope (`:41-42`), against 07 and 08.
  
  It also tells the reader "Do not reopen them" (`:9`). Raised in part by `issue-review-06.md` F5 and `issue-review-10.md` F7.
- **Minimal fix:** one paragraph under the PRD's Issues table: "Issues 06-12 are post-MVP owner requests. They supersede the names in Decisions 2 and 9 (06), 'values are literals' in Decision 4 (08), Decision 6 for mod-action writes (10), line 5 for the `core/` registry (10), and the Out-of-MVP items they build (07, 08)."

### C10. medium, 03/06: 06's trap 3 contradicts the limit note 03 put on the same page, which 06 says to keep

- **Evidence:** 06 trap 3 says a method on a missing property "throws, so the rule is skipped and logged" (`06:51`). The note 03 shipped says that inside a builder group such a condition "counts as false and is not logged", and that in a None group it matches every note (`help/documentation/22-auto-move.md:159`). 06 tells the implementer to keep 03's text in the Filters section (`06:47`), so the rewritten page would say both. Issue 13 (`13:3`) will change the same text later. Also in `issue-review-06.md` F3.
- **Minimal fix:** 06 trap 3: "for a rule written as one expression. Inside a builder group, see the note from Issue 03 next to it."

### C11. low, 05/13 vs 06: two sibling Issues use the pre-06 names and can land in the middle of the chain

- **Evidence:**
  - The ledger takes "the lowest number" `todo` whose blockers are done (`ledger.md`, Next up). Row 05 is `todo`, blocked by 01, which is `done`. So an unnumbered `/relay-lite:run` picks 05 before 06, although the Issue is `needs-triage` (`05:7`) and names `auto-move.service.ts` (`05:3`).
  - 13 is blocked only by 03 (`13:5`). It edits `auto-move.logic.ts` and the "Building the Filter" text in `22-auto-move.md` (`13:3,18`), which 06 renames and rewrites. It is in neither the ledger nor the PRD table.
- **Minimal fix:** set 05 and 13 to "Blocked by: 06", and add a line to each: "uses the post-06 names". Run 06-12 with explicit numbers.

### C12. low, 06 vs 09/10/11: the help page's Actions list goes out of date

- **Evidence:** 06 adds an "Actions" section that "lists the two actions in one place, before their details" (`06:55`). 07 updates the modes table (`07:30`). 09, 10 and 11 each add their own section (`09:36`, `10:25`, `11:35`) but never add their action to that list. After 11, the list names 2 of the 5 actions.
- **Minimal fix:** 09, 10 and 11 Docs: "and add it to the Actions list (Issue 06)."

### C13. low, 03 vs 06: the rename table misses files that 03 added or that link the page

- **Evidence:** 03 added `src/tests/fixtures/AutoMoveRuleRowHarness.svelte`. 06's table renames only `src/tests/lib/features/auto-move/` (`06:24`). The grep in 06's Acceptance does catch the file (`06:70`). `docs/FEATURES.md:36` links `help/documentation/22-auto-move.md`, and `docs/` is outside both Behavior 5's list and the grep scope, so the link breaks without any check failing (`issue-review-06.md`, Not blocking).
- **Minimal fix:** in 06 Behavior 2, add "`src/tests/fixtures/AutoMove*`". In Behavior 5, add `docs/FEATURES.md`.

### C14. low, 07/08/09: the property editor reused for `createNote.properties` carries modes that mean nothing on a new note

- **Evidence:** 09 reuses "Issue 02's editor" for the new note's properties (`09:31`). By then 07 has added `remove` and `add` and 08 has added the value/expression switch. 08 does not say whether the switch is hidden on a `remove` row (`07:26`, `08:27-29`). `remove` on a note that does not exist yet does nothing, and 09 gives no load rule for these entries (`issue-review-09.md` F8).
- **Minimal fix:** 09 Behavior 1: "`createNote.properties` load with the rules of `properties` (Issues 01, 07, 08); a `remove` entry is dropped." 08 Behavior 6: "a `remove` row shows no switch."

## Chain check: 06 -> 12, one Issue at a time on main

- Blocked-by order: 06<-03 (done), 07<-06, 08<-07, 09<-08, 10<-09, 11<-10, 12<-11 match the PRD table (`PRD.md:55-61`) and the ledger. Real dependencies: 07 needs 06's names; 08 needs 07's `add`; 09 and 11 need 08's `expr`; 12 needs 07's `remove` and 06's page. The chain is correct apart from C8.
- No Issue undoes another, provided:
  - 08 is the only Issue that edits 06's `file.mtime` trap line (`08:33`), and it does that on purpose;
  - each of 09, 10 and 11 keeps the widenings of the previous one (C3);
  - 11 restates the full run order (C1).
- No two Issues claim the same change. 09, 10 and 11 each touch the service's no-work return and `doesNothing` (C3), but each adds its own case.
- Post-06 names are consistent in 07-12 (`features/auto-organize/`, `22-auto-organize.md`, `auto-organize-rules.json`). The only wrong path is the `.kokobrain/` folder in 06 and 12 (C2).

## Could not refute

- The Blocked-by chain matches the PRD table and the ledger, and 03 is on main (`5812efc78`, ledger row 03 `done`). 06 can start now.
- 06's rename does not conflict with 07-12 names, paths or the docs page name. Every later Issue names `22-auto-organize.md` and `features/auto-organize/`.
- Ownership ("first matching rule that names a key owns it", `01:41`, `auto-move.logic.ts:250`) is used the same way by 07 (`07:25`) and 12 (`12:22`).
- 09's "no chaining" (`09:26`) and 11's skip set (`11:23`) cite Issue 01 Behavior 9 correctly (`01:53`). `createFile` and `renameItem` fire no after-save (`issue-review-09.md`, `issue-review-11.md`, Could not refute).
- 10's `core/` registry adds no `layer-baseline.json` entry, and 06's baseline rename touches only `feature-cycle-baseline.json` (`issue-review-06.md` and `issue-review-10.md`, Could not refute).
- 12 needs nothing from 09, 10 or 11. Its blocker on 11 is only there to avoid conflicts on the help page, which is harmless.
