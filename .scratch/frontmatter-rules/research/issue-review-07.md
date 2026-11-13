# Adversarial review: Issue 07 (property actions: remove and add to list)

Code read at main `17892c5ed`. Post-06 names map to today's `src/lib/features/auto-move/`. Issue lines refer to `.scratch/frontmatter-rules/issues/07-property-actions-remove-and-add-to-list.md`. Owner decisions are not reopened, and no fix below adds scope.

## Findings

### 1. data-loss / spec-error: `remove` on `tags` wipes every frontmatter tag, and Behavior 4 reads as a per-tag remove

- **Issue lines:** 14 (`remove` value ignored), 16 ("whatever its value"), 24 ("`tags` works with `add` and `remove` ... Tags are compared without a leading `#`").
- **Problem:** Behaviors 1 and 2 make `remove` delete the whole key and ignore any `value`. Behavior 4 puts `remove` next to a tag-name comparison, which only means something for a per-item remove. An implementer or a JSON author reads `{ "key": "tags", "value": "draft", "mode": "remove" }` as "drop the tag `draft`". As written, it deletes all frontmatter tags on every matching note that anyone saves. Rules also run on saves made by Todoist sync, the calendar and mods (PRD Decision 13). Issue 08 keeps this ("`remove` ignores both", `08-computed-property-values.md:18`).
- **Evidence:** the value is dropped from the decision, because the planner compares by canonical key only (`auto-move.logic.ts:212-218`), and the write rebuilds the YAML from the filtered `Property[]` (`properties.logic.ts:689-696`).
- **Minimal fix:** in Behavior 4, replace the last sentence with: "`remove` on `tags` deletes the whole frontmatter `tags` key, all tags at once. Removing one tag is not supported. Tags are compared without a leading `#` by `add` only." In Docs, add: "the help page says that `remove` on `tags` clears every frontmatter tag."

### 2. data-loss (minor): blank `add` items are written into real lists

- **Issue lines:** 15 (an `add` needs "a string or a `string[]`"), 26 ("An `add` row takes comma-separated items").
- **Problem:** `''` and `[""]` are valid by that rule. A new Settings row starts with `value: ''` (`AutoMoveRuleRow.svelte:83`), and the loader accepts an empty string today (`auto-move.logic.ts:147-148,164`). A user who picks a key and "add to list" before typing items, or types `a, , b`, gets a rule that appends `""` to the list on every matching note at its next save: `tags: [a]` becomes `["a", ""]`, and `_belongs_to: ["[[A]]"]` becomes `["[[A]]", ""]`. The tag readers hide the blank item (`tag-extraction.ts:62`), but the Properties panel and other list keys show it. The spec also does not say whether `" b"` is trimmed.
- **Minimal fix:** in Behavior 1, after the `add` bullet, add: "items are trimmed, blank items are ignored, and an `add` with no item left is dropped." The Settings field splits on commas with the same rule.

### 3. contradiction with Issue 08 / data-loss: `add` plus a volatile expression grows the list at every save

- **Issue lines:** 19 ("appends each item that is not already in the list"), together with `08-computed-property-values.md:23` ("With `add`, the items of the result are added") and `:25` (only `always` is refused for `now()`, `file.mtime`, `file.ctime`).
- **Problem:** with an `add` whose `expr` is `now()` or `file.mtime`, every save produces a new value that is "not already in the list". So every save writes and appends one more item, without bound, on every matching note. Issue 08 Behavior 5 makes `file.mtime` change on each save. This is the same hazard 08 refuses for `always`, but `add` is not refused.
- **Minimal fix (in Issue 08, Behavior 4):** "An `always` or `add` action whose `expr` uses `now()`, `file.mtime` or `file.ctime` is refused ...". Optionally, Issue 07 Notes gets one line: "`add` must stay idempotent; Issue 08 must refuse volatile `add`."

### 4. spec-error (docs): "back to the default: not archived" hides that the note stays in the archive folder

- **Issue line:** 17.
- **Problem:** the help page is told to say that `remove` on `_archived` means "not archived". The flag reads false (`collection.logic.ts:64,101-108`), but the generated unarchive rule matches `_archived == false` literally (`type-lifecycle-rules.ts:52`). Equality is `a == b` (`evaluator.ts:714`), and `undefined == false` is false. So removing the key never moves the note back. Worse, in one run the archive rule is evaluated on the content before the write: the note moves into the archive first, and then the key is removed (`auto-move.service.ts:220-264`). A note archived with the Archive button, under a matching `remove _archived` rule, ends up inside the type's archive folder and flagged as not archived.
- **Minimal fix:** append to Behavior 2's first bullet: "Removing `_archived` does not move the note out of a type's archive folder, because the unarchive rule needs `_archived == false`. Use `always` with `_archived: false` for that. The help page says so."

### 5. spec-error (minor): the "map" case in Behavior 3 cannot reach the planner, and it does not log once per rule

- **Issue line:** 23 ("a number, a boolean or a map, nothing is written, and the skip is logged once per rule per session").
- **Problem:** nested maps are dropped from the parse (`properties.logic.ts:286-296`). They are flagged `nested` by `detectLossyFrontmatter` (`:431-433`). The whole note is then skipped by the gate (`auto-move.logic.ts:263-264`) with a quiet `debug` (`auto-move.service.ts:311-313`), before any planning, so there is no once-per-rule log. A test written from this line ("a map logs once") cannot pass.
- **Minimal fix:** change it to "a number or a boolean". Optionally add: "A map is already skipped for the whole note by Issue 01's lossy-frontmatter gate."

## Not blocking

1. `tags: work` with `add work`: the spec does not say this is a no-op. It should write nothing (PRD Decision 11), not turn the value into `[work]` or `[work, work]`. Also unspecified: whether the `#` is stripped on both sides and on the written item.
2. Settings: the row's X button is titled "Remove property" (`AutoMoveRuleProperty.svelte:167`, test `AutoMoveRuleRow.test.ts:196`), which clashes with a mode label "remove". A mode change keeps the old value (`:152`), so switching a yes/no row to `add` saves a boolean that the loader then drops.
3. The logger for the skip is not named. `debug` matches Issue 01's quiet skips, and `error` reports to Sentry. The skip needs its own set, apart from `reportedWriteFailures` (`auto-move.service.ts:49,326-335`), collected on the first `propertiesToWrite` pass only (`:315` versus `:318`).
4. Issue 06 Behavior 7 and Issue 12 Behavior 4 put their help examples in the examples config, where a test evaluates them. Issue 07's two examples are not required to go there.
5. Allowing `remove` on `_organized`, `_archived` and `_favorite` widens PRD Decision 10 ("accept only true or false") without a line in Notes. It is harmless in effect, since it matches what the readers default to. The loader must also check the mode before the value check (`auto-move.logic.ts:163-167`), and the Issue leaves that implicit.

## Tried and could not refute

- Ownership "first matching rule that names a key owns it", so a higher `if-missing` blocks a lower `add`: `auto-move.logic.ts:187-196`.
- `todoist_project` stays refused in every mode: `auto-move.logic.ts:109,166`. Other `todoist_*` strings in `src/lib` are IPC command names, not frontmatter keys.
- No chaining or loop for `remove` and `add`: they go through the same `updateNoteFrontmatter` call inside `writingPaths` (`auto-move.service.ts:257-267,318`). Both are idempotent with literal items: an absent key is not written, and present items are skipped.
- Inline `#tags` are untouched: the write path parses only the frontmatter and rebuilds the YAML (`properties.logic.ts:689-696`).
- The failing-first test fails today: `add` is dropped by the mode check (`auto-move.logic.ts:163`).
- Single string to list keeps the tags readable: scalar `tags:` values are not split in TS or Rust (`tag-extraction.ts:66-67`, `parsing.rs:398`). Flow lists are read (`tag-extraction.ts:57-62`).
- Wikilink items survive the round trip: the serializer writes flow lists (`properties.logic.ts:610-613`), and the fold at `:157-166` only applies to a sequence inside a sequence.
- Removing the last property drops the block cleanly, with no stacked `---` (`properties.logic.ts:692`).
- `remove _organized` cannot strand a note: the Inbox is a lens over flags (`lens.logic.ts:307`), not a folder. In effect it equals `always _organized: true`, which Issue 01 already allows.
- Blocker 06 is right: 07 edits the planner, service and row that 06 renames, and 08 builds on 07.
- "Load: an `add` with a boolean value is dropped" is testable at the existing load test (`auto-move.service.test.ts:106-132`).
