# Refute: Issue 009, tab rename and delete keep `_rail_view` in sync

Adversarial validation against HEAD 318b6e9b5 (2026-11-12). Read-only; no tests, checks or builds were run.

## Verdict

- **Still present: yes.** `removeView` (`src/lib/features/collection/yaml-parser.ts:364-379`) and `renameView` (`:388-407`) never read or write `_rail_view`; `railViewIndex` falls back to 0 (`:142-144`). The last commits to `yaml-parser.ts` and `CollectionView.svelte` are `107bcf35a`, `cf6fe6ef3`, `7b71c217f`, none of which touches these two functions. (verified)
- **Impact for this owner: low.** No code path creates `_rail_view`: the only writer is `updateViewEditYaml` (`yaml-parser.ts:319`), and it writes only when the key already resolves (`:298`, `named >= 0`). Grep of `src/lib` and `src-tauri/src` finds no other writer (verified). So the bug needs a hand-written `_rail_view` (key introduced 2026-11-04, ADR 0027 amendment at `docs/adr/0027-frontmatter-system-metadata-underscore-prefix.md:38-40`) in a multi-view `.view`, plus a tab rename or delete of exactly that view. The result is not fully silent: a stale name gets the grey mark (`type-sidebar.logic.ts:439-453`) and the rule line says "first view" instead of `view "<name>"` (`lens.logic.ts:818`, `:857`). No data is lost; recovery is a one-line YAML edit. (frequency is inference; the owner's vault was not inspected)
- **Complexity: S. Risk: low.** Two pure string-in/string-out functions; the callers wrap them in a pure transform passed to `writeYaml` (`CollectionView.svelte:450`, `:478`) and `rewriteViewFile` (`type-definitions.service.ts:350`), which is unchanged. No store, no Rust, no CodeMirror, no indexing path. `_rail_view` is not an editor key (`key-edit.logic.ts:23`), so the reseed check at `CollectionView.svelte:338` is unaffected. (verified)
- **Implementable from the text alone: almost.** One rule as written is wrong for duplicate view names (see Must-fix 1), and a fresh agent following it literally ships a regression. The dossier caught this. No open owner decision: PRD D12 (`.scratch/archived/view-editor/PRD.md:38`) records the decision.
- **Queue position:** fine where it is. It is cheap, but low impact. It blocks 011 (`ledger.md:48`) and precedes 012 by the series rule (`priority-2026-11-08.md:63`), which is the main reason to run it early.

## Must-fix edits to the Issue text

### 1. Rename rule must use "resolves to this index", not "equals the old name"

Evidence: `_rail_view` resolves to the FIRST view with that name (`viewIndexByName`, `yaml-parser.ts:130-134`). Duplicate names are reachable from the UI, not only by hand: `addView` always appends `name: 'Untitled'` with no uniqueness check (`yaml-parser.ts:353`, called from `CollectionView.svelte:431`), so Add view twice and Escape the rename gives two `Untitled` views. With `views: [A, Dup, Dup]` and `_rail_view: Dup` (resolves to 1), renaming index 2 under the Issue's wording ("equals the renamed view's old `name`") writes `_rail_view: X` and moves the rail from index 1 to index 2. That is the very bug the Issue fixes, reintroduced.

Replace the first bullet under **What to build**:

> - `renameView`: when `_rail_view` resolves to the renamed view (`viewIndexByName(views, readRailView(raw._rail_view)) === index`, computed before the rename, first match), write the new name as `_rail_view`. A `_rail_view` that resolves to another view, names no view, or is not a non-blank string is left as it is. With two views of the same name, only renaming the first one rewrites `_rail_view`.

Replace the second bullet to use the same helper by name:

> - `removeView`: when `_rail_view` resolves to the removed view (same condition, computed before the splice), delete `_rail_view`, so the rail runs `views[0]` with no mark. Removing another view keeps it as it is. Do this after the existing guards, so a refusal still returns the input string.

Add a test bullet under the first criterion:

> - Duplicate names: with `views: [A, Dup, Dup]` and `_rail_view: Dup`, renaming index 2 leaves `_rail_view: Dup` and `railViewIndex` stays 1; renaming index 1 writes the new name and `railViewIndex` stays 1.

## Should-fix edits

1. **Say which tests are red today.** "Failing tests first" lists guards that already pass. Fail today: rename of the railed view (key stays old, `railViewIndex` drops to 0), remove of the railed view (key kept), and the CollectionView rename test. Pass today (regression guards): rename another view, remove another view, stale `_rail_view`, the duplicate-name case for index 2. Suggested line under the first checkbox: "Red today: the two railed-view cases and the CollectionView test; the others are guards that pass before and after." Without it, an agent following CLAUDE.md section 4 may stop when a "failing" test passes.
2. **Add a delete case to the CollectionView criterion.** The Issue covers only rename (`CollectionView.view-writes.test.ts`). The delete path (`CollectionView.svelte:450`) also changes. Replacement text: "the tab rename and the tab Delete paths write content whose `_rail_view` follows or is removed. Use a variant of `YAML` with `_rail_view: Second` (`CollectionView.view-writes.test.ts:57-70`), rename `Second` as in `:316-330` and delete `Second` from its menu as in `:332-348`, and assert on `diskYaml()`, the bytes the `writeTextFile` mock stored." "The content handed to the mocked write" is the same thing, but naming `diskYaml()` saves the agent a search.
3. **Add a remove-before-the-railed-view test.** `_rail_view` is by name, so removing an earlier view shifts indexes but must keep the key and `railViewIndex` on the named view. Suggested: "`views: [A, B, C]`, `_rail_view: C`, remove index 0: `_rail_view: C`, `railViewIndex` 1."
4. **Add a non-string `_rail_view` guard test.** `_rail_view: [Board]` with a view named `Board`: rename and remove of `Board` leave the raw value as it is (`readRailView`, `yaml-parser.ts:125-128`). This guards against an implementation that compares `raw._rail_view` loosely.
5. **Refresh the line numbers.** `renameView` is `:388-407` (JSDoc `:381-387`), `removeView` `:364-379` (JSDoc `:358-363`); the delete call is `CollectionView.svelte:450` (handler `:445-451`), the rename call `:478` (handler `:472-479`); the grey mark is `type-sidebar.logic.ts:426-453` (`railViewMissNote` `:440`, `railViewNameNote` `:450`).
6. **Name the JSDoc update.** Both JSDoc blocks must say what happens to `_rail_view` (CLAUDE.md requires JSDoc on exported functions; section 8 of the global rules says update comments the change makes wrong). Add: "Update the JSDoc of both functions."
7. **Exact doc replacements**, so the agent does not have to word them:
   - ADR 0027 line 40, replace "Edit view rewrites it when it renames the view it names; renaming a view tab in the editor does not." with: "Edit view rewrites it when it renames the view it names. In the collection editor's tab strip, renaming the view it names rewrites it to the new name, and deleting that view removes the key (PRD D12 of view-editor ended the stale `_rail_view` this amendment first accepted)."
   - `help/documentation/25-types-and-relationships.md:487`, replace ", and renaming a view tab in the editor does not update `_rail_view` (the row's mark then reports the stale name)." with: ". Renaming that view's tab in the editor rewrites `_rail_view` to the new name, and deleting the tab removes `_rail_view`, so the note list then runs the first view."
   - Optional: `help/documentation/12-collection.md:149-150` (Rename a view, Delete view) could get the same clause; `:157` ("The collection editor does not read `_rail_view`") stays true.
8. **Origin path.** `research/validated/A09.md` in the Notes resolves under `.scratch/archived/view-editor/` (exists), not under `.scratch/open-itens/research/`. Write the full path.

## Dossier errors and weak points

- Header says "against HEAD 115d8d576"; HEAD is 318b6e9b5, 5 commits later. The cited lines still match. Minor.
- Impact "low to medium": I rate it low. The dossier calls the failure "silent", but the stale name after a rename or a remove gets the grey navigator mark and the rule line loses its `view "<name>"` suffix (`lens.logic.ts:818`, `:857`). It did correctly find that no UI writes the key.
- It treats duplicate names as a "hand-edited" case only. They are also reachable through `addView` (`yaml-parser.ts:353`). This makes Must-fix 1 stronger, not weaker.
- "Fine to run as a small direct merge, no adversarial reviewer needed beyond the standard gate": this is a process claim the dossier has no basis for. The owner's memory requires a pre-commit adversarial review, and the relay-lite flow has its own review. It is not a code fact; leave it out of the Issue.
- The rest checks out: callers `CollectionView.svelte:450` and `:478` are the only ones in `src/lib`; consumers `lens.logic.ts:805`, `RailNoteList.svelte:272`, `ViewDialog.svelte:96` and `type-note-list.logic.ts:169,200` exist as cited; the existing test at `yaml-parser.test.ts:904-913` (`_rail_view: Other`, rename index 0 to `other`) stays green under the fix, because index 0 is not the railed view. The green-step plan (compute `railed` before mutating, after the guards) is correct.

## Not checked

- Whether the rail list re-runs right after a `.view` tab save (so the user sees the rail stay on the renamed view without re-picking it). The Issue fixes the file bytes, which is the source of truth; refresh timing is unchanged by this Issue.
- The owner's vault was not searched for `_rail_view`, so the frequency rating is inference.
