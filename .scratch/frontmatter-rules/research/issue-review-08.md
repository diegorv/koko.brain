# Adversarial review: Issue 08, computed property values

Target: `.scratch/frontmatter-rules/issues/08-computed-property-values.md`. Checked against `main` at `054ace345` (Issue 03 has landed since the scout ran at `17892c5ed`; `auto-move.logic.ts` line numbers below are from `054ace345`). Post-06 names map to today's `features/auto-move/`. Read-only; nothing was run.

The scout's report (`issue-review-08-scout.md`) was used as a lead. Every fact below was re-read in the code.

## Findings

### F1. data-loss: a text-building expression writes `NaN` over the note's value

- **Issue line:** 08:20 ("a string, number, boolean or list is written as is") and 08:24 (Failures cover only `null`, `undefined` and a throw).
- **Evidence:** `+` adds strings as numbers. `evaluateBinary` only does date math when the left side is a `Date` (`src/lib/features/collection/expression/evaluator.ts:248-251`). Otherwise it returns `toNumber(l) + toNumber(r)` (`:277`), and `toNumber` is `Number(val)` (`:634-639`). So `"Note " + file.basename` and `"[[" + file.basename + "]]"` give `NaN`, a number. Behavior 2 writes a number as is. With `always`, every matching note's existing value is replaced by `NaN`. `date("junk")` returns `new Date("junk")`, an Invalid Date (`evaluator.ts:379`), which the date formatter turns into `NaN-NaN-NaN` or throws (`toISOString`) outside the expression's try. Users will write `+` for text, and the engine docs list `+` only as arithmetic (`help/documentation/12-collection.md`, operators table). Issue 09's linking recipe (`09-rule-action-create-note.md:32`, "using a computed value (Issue 08)") needs to build a `[[...]]` string, and the obvious way is `+`.
- **Minimal fix:** in Behavior 3, add "A non-finite number (`NaN`, `Infinity`) or an invalid date is a failure too." In Docs, add one line: "`+` adds numbers and durations, not text; build text with a list: `["[[", file.basename, "]]"].join("")`." Add one Acceptance case: `"x" + file.basename` writes nothing and logs once.

### F2. data-loss: a new note's zero stats stamp `1970-01-01` for good

- **Issue line:** 08:26 (Behavior 5, "when it exists ... Fall back to now, now and the content length") and 08:25 ("to stamp a creation date once").
- **Evidence:** `createFile` upserts the note through `applyNoteChange` (`src/lib/core/filesystem/fs.service.ts:216`). The collection consumer calls `updateNoteInIndex` (`src/lib/features/collection/collection.service.ts:182-185`), which builds a record with `existing?.mtime ?? 0`, `ctime ?? 0`, `size ?? 0` (`:153-160`). Real stats arrive only with the Rust delta, through the throttled `vault-index-updated` listener (2-10 s, `src/lib/core/vault/vault.store.svelte.ts:30-31`). The rule timer fires after `debounceMs`, 3000 by default (`src/lib/core/settings/settings.store.svelte.ts:112`). So a record does exist, with `ctime: 0`. The headline volatile use case, `created: file.ctime` with `if-missing`, writes `1970-01-01` (or `1969-12-31` west of UTC, `evaluator.ts:204`). Because the mode is `if-missing`, nothing ever corrects it.
- **Minimal fix:** in Behavior 5, after "when it exists", add "and its `mtime` and `ctime` are above 0; a zero record counts as missing." Add one Acceptance case: a record with `ctime: 0` falls back to now.

### F3. contradiction: `add` with a volatile value grows the list on every save

- **Issue line:** 08:25 (Behavior 4 refuses only `always`) against the Owner decision at 08:48 ("volatile values only with `if-missing`").
- **Evidence:** Issue 07 makes `add` append every item not already in the list (`07-property-actions-remove-and-add-to-list.md:19-21`), and Issue 08 Behavior 2 says "With `add`, the items of the result are added" (08:23). `now()` is a new instant on each evaluation (`evaluator.ts:363-364`), so `{ mode: 'add', expr: 'now()' }` appends one item on every save of every matching note, without limit. Behavior 4 does not refuse it, which goes against the Issue's own owner decision. `file.size` has the same problem under `always`: every edit changes it, so the note is rewritten on every save. It is missing from the volatile list.
- **Minimal fix:** in Behavior 4 and Acceptance 4, change "An `always` action" to "An `always` or `add` action", and change "`now()`, `file.mtime` or `file.ctime`" to "`now()`, `file.mtime`, `file.ctime` or `file.size`".

### F4. contradiction: a computed value can put text on `_organized`, `_archived` or `_favorite`

- **Issue line:** 08:18-20 (Behaviors 1 and 2 put no type rule on `expr`).
- **Evidence:** PRD Decision 10 says "`_organized`, `_archived` and `_favorite` accept only true or false" (`PRD.md:29`). Delivered Issue 01 enforces this at load by the literal's type (`src/lib/features/auto-move/auto-move.logic.ts:230`). An `expr` has no type at load, and Behavior 2 writes any string as is. So `_archived: status` writes `"done"`. A text value reads as the default in Rust and TS (`auto-move.logic.ts:179-184` doc, `src/lib/features/collection/collection.logic.ts:101-108` `boolFlag`), so the note never archives, or leaves the Inbox.
- **Minimal fix:** in Behavior 2, add "On `_organized`, `_archived` and `_favorite`, only a boolean result is written. Any other result is a failure (Behavior 3)." `todoist_project` stays refused for `expr` too.

### F5. spec-error: example 3 does not run

- **Issue line:** 08:6 (`area: file.folder.split("/").last()`), reused by Docs at 08:33 ("the three examples above").
- **Evidence:** the list methods are `contains, sort, unique, join, flat, slice` (`src/lib/features/collection/expression/methods.logic.ts:140-169`). There is no `last` anywhere in the method registry. `dispatchMethod` throws `Unknown method: last` (`methods.logic.ts:269`). `validateExpression` does not check method names (`evaluator.ts:303-306`), so Settings would accept the example and every run would log the error. The help page would ship a broken example.
- **Minimal fix:** replace it with `area: file.folder.split("/").slice(-1).join("")`. `slice` with a negative start works (`methods.logic.ts:163-168`), and the parser has unary minus (`parser.ts:100-103`). Add one Acceptance case for it.

### F6. spec-error: "the full ISO date and time" is ambiguous, and the obvious reading does not read back as a date

- **Issue line:** 08:21, 08:38, 08:49.
- **Evidence:** `Date.toISOString()` gives UTC with milliseconds and `Z`. The frontmatter type detector accepts only `YYYY-MM-DD` with an optional `THH:mm[:ss]` (`ISO_DATE_REGEX`, `src/lib/core/frontmatter/properties.logic.ts:40`), so that value reads back as text. Its date part is also the UTC day, not the local day. The same trap applies to the date-only form if it is built from `toISOString().slice(0, 10)`.
- **Minimal fix:** in Behavior 2, write "a date is written as the local `YYYY-MM-DD`, or as the local `YYYY-MM-DDTHH:mm:ss` when the expression contains `now()`."

### F7. spec-error: Acceptance 2's "seven days ahead" is false across a DST change

- **Issue line:** 08:38.
- **Evidence:** `today()` is local midnight (`evaluator.ts:365-369`). `"7d"` is a fixed `7 x 86 400 000` ms (`src/lib/features/collection/expression/duration.logic.ts:26`), added as milliseconds (`evaluator.ts:250`). Across a fall-back change, the result is 23:00 on day 6, so the local date written is one day early. `"1d"` can even write today. No test timezone is pinned, so a test whose dates cross a DST change in the runner's zone fails, or it passes by luck.
- **Minimal fix:** in Acceptance 2, add "with the system time set to a date range that crosses no DST change (for example 2026-06-10)". In Docs, add one line: "Durations are fixed lengths: across a daylight-saving change, `today() + "7d"` can land one day early." The engine stays unchanged.

### F8. spec-error: index `mtime` and `size` lag the save, so "real values" and "fixes filters" are wrong for them

- **Issue line:** 08:26 ("This also fixes filters that use `file.mtime`..."), 08:33 ("now the file's real values once the note is indexed"), 08:41.
- **Evidence:** while a note is edited, the TS record keeps its old stats (`collection.service.ts:146-150` doc and `:153-160`). Nothing in the save path updates `mtime` or `size` in `collectionStore` until the throttled Rust delta lands (2-10 s, `vault.store.svelte.ts:30-31`), and the run fires after 3 s. At run time, `file.mtime` is therefore usually the previous save's time and `file.size` the previous size. Today's `Date.now()` is closer to the truth for a save-triggered run. Here is the concrete wrong action: a rule `file.mtime < today() - "30d"` that moves stale notes to `Archive/` fires on the save that makes the note fresh, and moves the note the user is editing.
- **Minimal fix:** keep the owner's choice (stats come from the index) but say what they are. Behavior 5 and Docs should say "the values as of the last index refresh, usually the previous save, not this one". Delete "This also fixes filters that use `file.mtime`" and keep it for `file.ctime` and `file.size` only. Docs should keep the "do not filter rules on `file.mtime`" trap.

## Not blocking

- The record is built before the move (`auto-move.service.ts:207`, move at `:244`), so in a rule that also moves, `file.folder` and `file.path` give the old location. The help page should say so once.
- Expressions see the filter record's derived keys, not the raw frontmatter. `_belongs_to` comes back as bracket-less targets and `tags` includes inline `#tags` (`collection.logic.ts:66-76,84-90`), so copying `_belongs_to` to another key writes plain names, not links.
- A row just switched in Settings has `expr: ''`, and Settings keeps unfinished rows live (`auto-move.logic.ts:248`). A blank `expr` should count as absent and be dropped silently, not evaluated and logged on every run.
- Use the evaluator's `validateExpression` (`evaluator.ts:308-317`), not the parse-only one in `auto-move.logic.ts:384`. Neither checks method names, so the preview is the only place a bad method shows up before a run.
- Resolve each owned `expr` once, before `updateNoteFrontmatter`, because `mutate` runs twice (`frontmatter-write.service.ts:95-96`). Resolve only the owning entry. A failing owner still owns its key, as Issue 01's `if-missing` rule does.

## Tried and could not refute

- Behavior 2's "same record, with `vaultPath`": the filter runs with `{ record, formulas: {}, vaultPath }` (`auto-move.logic.ts` `findMatchingRules`, the service at `auto-move.service.ts:212`), so a relative `file.inFolder` (Issue 04) works in an `expr` too.
- Behavior 5's claim that the record gives size 0 today: `buildNoteRecord(filePath, content, Date.now(), Date.now())` (`auto-move.service.ts:207`), and `size = 0` is the default (`collection.logic.ts:22-28`).
- Acceptance 1 fails first: today an entry without `value` is dropped by `sanitizeRuleProperties` (`auto-move.logic.ts:220-232`), so nothing is written.
- Acceptance 5 fails first: `file.size > 0` is false with size 0 today.
- Loops: a computed write stays inside `writingPaths` (`auto-move.service.ts:257-268`), so an `always` value that changes on every evaluation (`today()` included) rewrites only at the next user save and never chains. `updateNoteFrontmatter` returns early on identical bytes (`frontmatter-write.service.ts:128`).
- Blocker: 07 is the right blocker, because Behavior 2 depends on 07's `add`. The order fits 09 and 11, which reuse 08's `expr`.
- No `src-tauri/` or ts-rs change is needed, so the frontend-only gate is correct.
- PRD: computed values were "Out of the MVP" (`PRD.md:41`), and Issue 08 is post-MVP, so there is no contradiction.
