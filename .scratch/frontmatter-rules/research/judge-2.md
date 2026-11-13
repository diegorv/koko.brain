# Judge 2: simplicity, one-engine fit and owner UX

Judge 2, 2026-11-10. Read-only. Inputs: `design-A.md`, `design-B.md`, `design-C.md` (all three present), checked against the scout and validation files in this folder and against the code at HEAD `2e2cc5b60`. Nothing was run. Every code fact below was re-opened by this judge unless it is marked as taken from a research file.

## 0. Verdict

**Ranking: C, A, B.**

All three designs converge on the same core: one runner per path, one pure planner (all-match property actions, claim-on-match per key, in-memory fixed point with a 10-pass cap and cycle abort, first-match move, re-plan at the destination, one `updateNoteFrontmatter` call), a semantic no-op check before the writer, a Markdown gate, a lossy/empty-block gate, real stats, fire-time reads, and a pre-write create transform in the two core creators. The research forced that core, and none of the three duplicates it. They differ in what they wrap around it:

- **C** wraps nothing new: the core lives inside `features/auto-move/`, in the same config file, store and Settings section.
- **A** wraps a rename and a new versioned config file with a migration, and adds per-rule triggers, a property-change hook and folder-child enumeration in v1.
- **B** wraps a provider abstraction, a second feature with its own file, section, switch and excluded-folder list, and a shared config service.

On this lens (what a senior engineer would cut), C needs the least cutting. A is roughly C plus churn. B adds the most machinery and goes against the owner's "one domain" preference at the user-facing level. One more fact favors C: Issue 01's own Origin note records that on 2026-11-10 the owner chose "extend Auto Move" over "a separate per-folder-defaults feature" (`.scratch/auto-move-default-properties/issues/01-...md`, Notes, "Origin").

C does not win unchanged. Section 5 lists five grafts. The two that matter most: a characterization slice before the evaluation model changes (from A and B), and the `previousContent` property-change signal in place of "lower `debounceMs`" (from A and B).

## 1. Scores

The scale is 1 (worst) to 5 (best) on each axis of this lens. The totals are a judgment, not a measurement. Line counts are rough estimates from reading the designs; nothing was prototyped.

| Axis | A | B | C |
|---|---|---|---|
| Duplicated machinery (5 = none) | 5: one list, runner and config | 2: shared runtime, but two lists, two switches, two excluded-folder lists, two config files, two sections, a provider registry for two consumers | 5: one list, runner and config |
| Migration cost (5 = none) | 2: new `automations.json` with `version: 2`, a v1-to-v2 migration, a settings section id rename, an optional folder rename, the `featurePairs` diff, examples-scoping and the raw-write ratchet moved | 4: Auto Move file unchanged, one new file, a new settings key | 4: optional `actions` field on the existing rule; the only one-way step is the legacy `icon` translation |
| Amount of new code (5 = least) | 2 | 1 | 4 |
| Authoring and understanding | 3: uniform `actions[]` hides two semantics (`move` is first-match and at most one, `set` is all-match); four trigger toggles per card | 3: each list has clean semantics, but rules about one note live in two places, and the cross-provider precedence (Property Rules claim before Auto Move's icon) is invisible in both (B section 14.3) | 4: `destination` stays a field and `actions` is a list, so the shape matches the semantics (one move, many writes); the cost is mixed semantics in one list, which A shares |
| Ships value early | 2: owner's main case at S3, after S0, S1, S2 | 2: main case at S3, after S0, S1, S2 | 4: main case at A1, after the existing Issues 001 and 054; A1 can ship JSON-only |
| **Total / 25** | **14** | **12** | **21** |

## 2. Claims checked against the code

### Confirmed (load-bearing for all designs)

- `updateNoteFrontmatter` leaves per-path serialization to callers: "Concurrent calls on one closed note race and the last write wins" (`core/frontmatter/frontmatter-write.service.ts:95-97`). Its no-op check is byte-based after a full rebuild (`:128-129`). The closed branch ends in `notifyAfterSave(path, next)` (`:161`).
- `withIconColors` removes `_color` and `_title_color` when they are not passed (`features/file-icons/frontmatter-icon.service.ts:26-31`). Auto Move passes the optional colors (`auto-move.service.ts:209`).
- `AfterSaveObserver = (filePath, content) => void` (`core/editor/editor.hooks.ts:10`). `writeTab` holds `tab` before `markSavedByPath` (`core/editor/editor.service.ts:187-196`) and the tab carries `savedContent` (`editor.store.svelte.ts:90-94`). So the `previousContent` argument A and B propose is reachable at the two call sites they name. B section 16 said it had not re-read this; it holds. There are 9 `notifyAfterSave` call sites (`frontmatter-write.service.ts:161`, `editor.service.ts:196`, `mod-vault.service.ts:135`, `app/deep-link-actions.ts:78,216`, `features/deep-link/deep-link.service.ts:277,296,313,337`), so the argument is additive.
- Autosave timers: 500 ms for frontmatter, 2000 ms for the body with a 10 s max wait (`editor.service.ts:225-232`).
- Auto Move fakes stats: `buildNoteRecord(filePath, content, Date.now(), Date.now())` (`auto-move.service.ts:154`). It gates on `typeMetadataMap.size > 0` (`:101`). It captures `content` at save time in the timer closure (`:116-119`). `toggleAutoMoveHook(false)` does not clear pending timers (`:134-146`, against `resetAutoMove` `:224-228`).
- An empty destination moves to the vault root: `resolveDestination('')` returns `''` (`auto-move.logic.ts:128-129`), and `isAlreadyInDestination` then compares the folder with `''` (`:69-81`).
- The save path drops unknown top-level keys: it writes only `rules` and `excludedFolders` (`auto-move.service.ts:78-81`). C states this correctly.
- `evaluateExpression` re-parses on every call (`evaluator.ts:75-78`). The strong `validateExpression` is at `:306-315`, `MAX_FORMULA_DEPTH = 10` at `:18`, and the private `toTruthy` at `:632-636`. `isEmptyPropertyValue` is private at `properties.logic.ts:464`.
- The path-change consumer is synchronous and runs after the disk op and tab re-pathing, before the link rewrite, tree move and `rename_note` (`core/filesystem/path-change.service.ts:38-49,173-213`).
- Create seams: `buildContent` then `create_note` (`core/note-creator/note-creator.service.ts:101-103`), and `createFile` calls `create_note` with no transform point (`core/filesystem/fs.service.ts:208`).
- Lifecycle wiring: Auto Move's hook is registered dynamically at `app/lifecycle/app-lifecycle.service.ts:443-447`, the vault-lifetime consumer list is at `:258`, and the reset is at `:669`. The designs cite the file without its `app/lifecycle/` directory; the line numbers match.
- Debounce UI minimum is 500 ms (`AutoMoveSection.svelte:29-31`). C's "about 1 s" floor holds.
- `feature-cycle-baseline.json` already has `auto-move -> collection | file-icons | type-definitions` and `featureCycleEdges: []` (`src/tests/lib/architecture/feature-cycle-baseline.json:2-6`). C's "no new feature pair" holds.
- `examples-scoping.test.ts:231` matches only the `auto-move-rules.json` suffix. A and B must extend it for a new file; C needs nothing.

### Refuted or overstated

| # | Design | Claim | Finding |
|---|---|---|---|
| R1 | A section 3.3, migration table | Migrated `_icon` as `always`: "Behavior change? no (today it is always set on every matching save)". | **Refuted for multi-rule configs.** Today the icon comes only from the one rule `findMatchingRule` returns (`auto-move.logic.ts:17-35`, `auto-move.service.ts:159,200`). Under A's all-match `set` actions, an icon on a lower matching rule now applies whenever the first match has no icon. C lists this change and asks the owner (C section 6.3, O3). A must add the row and the question. |
| R2 | A section 0 | "Only a single owner of the icon keys removes the loop", given as the strongest argument for A's shape. | **Overstated.** validation-05 C1 offers a second fix: stop deleting color keys the rule did not set. C takes that fix (F6), and the loop is gone inside Auto Move with no merged feature. The race argument (`frontmatter-write.service.ts:95-97`) does force one runner per path. That rules out B's separate runtime, not C. |
| R3 | B section 0 | "Auto Move is not bent", and its config contract is unchanged. | **Overstated.** The file is unchanged, but S1 and S2 replace Auto Move's observer, timers and icon path. B section 4.5 changes its timing: a move now follows a frontmatter edit after the short delay instead of about 3.5 s. Its icon also joins cross-provider claims. B section 14.1 and 14.5 concede both points. |
| R4 | B section 0 | "One engine, one domain ... Nothing is duplicated." | **Refuted at the domain level.** The engine is single. The domain is not: two switches, two excluded-folder lists (B section 14.4), two config files, two Settings sections, two rule-row UIs until optional S7, and a precedence rule visible in neither list (B section 14.3). The owner asked for one domain. |
| R5 | B section 5.3 | Keeping the legacy color removal "as a `remove` effect only on unclaimed keys" changes nothing for anyone not using Property Rules. | True, but it puts a third effect kind into the shared planner only to preserve a behavior that conflicts with "nothing is reverted". It is complexity without user value. C and A drop the removal and ask the owner. |
| R6 | A section 5.1, B section 4.1 | `lastEngineWrite` byte guard as a loop layer. | **Redundant by the designs' own argument.** Both say the fixed point makes the written state a no-op on re-run (A section 6 layer 5, "termination no longer depends on byte idempotence"; B section 5.1, "The guard only saves the re-evaluation"). On the tab branch the bytes the observer receives are `tab.content` at `writeTab` time (`editor.service.ts:191-196`). That can differ from `next` when a save is queued on `saveTails` (`:170-178`), so the guard can miss. A miss costs one harmless re-evaluation. C's echo-plus-no-op (C section 8 item 2) is enough. |
| R7 | A and B, match semantics | `toTruthy` at `evaluator.ts:632-636` "keeps Collection semantics". | **Correct result, wrong citation.** Collection filters use a separate, identical copy at `collection.logic.ts:481-485` (called at `:321,355`). Exporting the evaluator's copy gives the same semantics, and the duplicate stays. This also resolves C section 17's open doubt. |
| R8 | C section 7.2 and slice E | "Faster property reaction" by lowering `debounceMs`, with no new hook. | **Has an unflagged cost.** `debounceMs` applies to every save. Lowering it also moves the active note sooner after a body-save pause (2 s autosave plus the debounce), not only after a property edit. A and B separate the two delays with `previousContent`. See graft G2. |
| R9 | C section 14 | A1 can follow P1 and P2 directly. | **Misses a mandatory step.** A1 changes a working evaluation model: first-match for everything becomes first-match for the move and all-match for actions, with the icon translated. CLAUDE.md "Removing or Refactoring Code", items 5 and 6, requires a regression test of the current behavior first. The current service test mocks `editor.hooks`, `fs.service` and `file-icons.service` (validation-01, confirmed in A section 12 and C section 13). A's S0 and B's S0 are the right step. See graft G1. |
| R10 | B section 8, event calendar | Skip move and rename runs for `_type: Event`. | Speculative special case for an unmeasured overlap. A and C accept the low risk and document it. Cut. |

No refutation was found in C's correctness floor (F1 to F8). Each row traces to code re-opened above or to a validator finding.

## 3. Per-design notes on this lens

### C (winner)

- **Keeps:** the file, the store, the loader, the help page, the examples test, the feature pair set, the Settings section and the row component. New pure code is the planner and a normalizer in `auto-move.logic.ts` (C section 3). The single core change is the create transform registry, which the owner's create trigger needs.
- **Data shape:** an optional `actions?: PropertyAction[]` on `AutoMoveRule` (C section 4). Typed by the JSON value, with no `type` field and no version field. That matches the repo convention "optional field, absent means default" (scout-11 F4.1, cited by C). It is forward-compatible: a later optional `triggers?` can mean "all" when absent, with no migration.
- **Cuts already made, all of them right for v1:** per-rule triggers (O6), folder-child evaluation (O7), the byte guard, the new file, the rename, the provider layer and computed values.
- **Weak spots:** A1 is large (type, normalizer, planner, runner hardening, gates, stats, save trigger, help) and has no characterization step first (R9). Slice E couples property latency to all saves (R8). The observer keeps its dynamic registration while the new path-change consumer is vault-lifetime: two lifetimes in one feature (C section 7.3). The `requestPromptIndexRefresh` nudge after lifecycle-key writes (validation-02 M6) is missing.
- **Honest limit:** section 15 lists what minimal does not cover. If the owner's "immediately" means sub-second, or "on property change" means a transition ("when status changes to done"), C needs G2 or a new design. Neither is in the stated goal.

### A (second)

- A is C's core plus: a versioned new file with a migration and a downgrade story (A section 3), a `features/automations/` rename (S4), a settings section id rename touching four files and two tests (A section 10), per-rule triggers with four toggles, `previousContent`, folder-child enumeration with a cap, and the byte guard.
- A's own weakness 1 says it outright: "Extend Auto Move" would ship the motivating case sooner.
- The `{kind: 'move'}` action inside the same `actions[]` as `set` looks uniform but behaves differently: at most one, first-match, no mode. C's separate `destination` field is the more honest shape.
- Worth keeping from A: the S0 characterization slice, the `previousContent` design with its "diff raw frontmatter, never the projected record" rule (validation-04 R2), the refresh nudge, and the broken-file backup pattern.

### B (third)

- B is A's runtime with a provider registry in front and a second feature behind it. B's weakness 2 concedes this: "Design A (extend Auto Move) with a second settings screen". Weakness 7 concedes the provider abstraction is sized for two consumers and shaped by Auto Move's quirks.
- New code is the largest: a `note-rules` feature folder (types, three `.logic.ts` files, a config service, a runner service, shared Svelte pieces), a `property-rules` feature (types, store, normalizer, provider, section, rows), five new feature pairs, a new settings key, a ratchet entry and an examples-test extension.
- B contradicts the owner's recorded choice in Issue 01's Origin note, and its user-facing duplication (R4) goes against the owner's stated preference.
- Worth keeping from B: the explicit warning that a relay run of Issue 01 before the owner decides creates the two-systems state (B section 3.3). It also offers the cleanest switch handling: one vault-lifetime observer that re-checks the switch at fire time, with `toggleAutoMoveHook` deleted, so disabling also cancels pending work (B section 4.5).

## 4. What a senior engineer would cut, across all three

| Cut | From | Why |
|---|---|---|
| New `automations.json`, `version` field and v1-to-v2 migration | A | An optional field on the existing rule does the same job. There is one user. A downgrade story is not needed for an additive field. |
| `features/auto-move` to `features/automations` rename, Settings section id rename | A | Churn with no user value (A section 14.10). Copy can say "Rules" without renaming code. C section 15.6: a later rename is mechanical. |
| Provider registry, second feature, second file, switch, section and exclusion list | B | Duplicated domain for a correctness model that needs one runner anyway. |
| `lastEngineWrite` byte guard | A, B | Redundant given the fixed point and the semantic no-op check (R6). |
| Legacy `remove` effect in the planner | B | Exists only to keep a behavior that conflicts with "nothing is reverted" (R5). |
| Folder-child enumeration with a cap in v1 | A, B | N writes and N History rows for one drag, plus a cap and a toast. C defers it (O7). |
| Per-rule trigger toggles in v1 | A, B | Rules are state-based and nothing is reverted, so the trigger changes when a rule applies, not what it writes. The exception is a "create-only default" that should not backfill old notes on save. Ask the owner (C O6), and add an optional `triggers?` later if the answer is yes. |
| Explicit `type` field on actions | B | The JSON value type already says it (A and C). |
| `_type: Event` skip | B | Speculative (R10). |
| Long key warning lists in v1 | A, B, C | Keep the `todoist_project` deny. Keep warnings for `always` on the lifecycle flags (`_organized`, `_archived`, `_favorite`) and on wikilink values. The calendar-key and `_order` warnings can wait for a real report. |

## 5. Grafts onto C

- **G1. Characterization slice first (from A S0, B S0).** Before A1, pin today's behavior on the real chain (real `editor.hooks` registry, real `updateNoteFrontmatter`, mocked plugin-fs and `call`): first match, lifecycle archive and unarchive, excluded folders, already-in-destination, icon with color removal, lossy skip, move-failure skip. A1 then changes the pinned icon and empty-destination tests on purpose, with owner approval (C O3, CLAUDE.md "Never weaken"). This is required by CLAUDE.md, not optional.
- **G2. `previousContent` in place of slice E's lower `debounceMs` (from A section 5.3, B section 4.2).** Add an optional third argument to `AfterSaveObserver`. `writeTab` passes `tab.savedContent` from before the write, and the closed branch of `updateNoteFrontmatter` passes `base`. When the canonical parsed frontmatter differs, schedule at a short delay; otherwise use `debounceMs`. Diff the raw frontmatter, never the projected record. This gives "immediately" for property edits without speeding up moves after body saves (R8). It stays its own slice, blocked by 001 and the Issue 105 skip-flag fix, as in C. It is a requested trigger, so the owner's "no core changes for corner cases" rule does not apply, but the core edit still needs the owner's yes.
- **G3. One lifetime, switch checked at fire time (from B section 4.5).** Register the after-save observer vault-lifetime next to the path-change consumer, re-check `settingsStore.autoMove.enabled` when the timer fires, and delete `toggleAutoMoveHook`'s dynamic registration. This removes C's two-lifetime split, and "disable cancels pending runs" follows without extra code. The lifecycle test pins one registration instead of a toggle.
- **G4. Refresh nudge (from A section 7, B section 8).** After a write that changes `_favorite`, `_organized`, `_archived`, `_rail`, `_type` or `_icon`, or after a move, call `vaultStore.requestPromptIndexRefresh()`, so the rail and lists do not lag (validation-02 M6). One line, in A1.
- **G5. Hold Issue 01 now (from B section 3.3).** Issue 01 is `ready-for-agent`, and relay auto-launch applies to ready Issues (owner memory). Set it to `needs-info` with a pointer to this research until the owner picks a design. Otherwise a relay run can ship Behaviors 5 and 6, which oscillate once `always` exists (C section 5.1, scout-16 4.3).

Optional, lower value:

- **Split A1** into A1a "runner hardening with no new behavior" (fire-time read, per-path tail, Markdown gate closing 054, real stats, the `archiveTo` gate fix, timers cleared on disable) and A1b "actions planner and save trigger". A1a ships bug fixes alone and keeps each diff reviewable. This is A's S2 ordering without A's migration.
- **AST cache keyed by expression string (A section 4 step 2).** C lists it as a follow-up. It is a few lines because `parse` and `evaluate` are separate exports (`evaluator.ts:38,75-78`). Add it only if the planner's rules-times-passes cost shows up in a profile.

## 6. Constraints any winner must still respect

- One runner per path; no second debounced writer of frontmatter anywhere (`frontmatter-write.service.ts:95-97`).
- No action removes a key, the legacy icon included (validation-05 R1/C1).
- Decide "missing" and "equal" on `parseFrontmatterProperties` with canonical keys, never on the projected record (validation-07 R4).
- The semantic no-op check comes before the writer (validation-01 R1, validation-07 R3).
- Markdown-only gate on actions and moves; skip lossy blocks and unmatched `---` starts (validation-04 R3).
- Nothing in `core/` imports `features/`. Create and property-change seams are registries or additive parameters, wired and pinned in `app-lifecycle.service.ts` (ADR 0003).
- Every slice that writes to an open note is blocked by open-itens 001. The create transform is not.

## 7. Questions only the owner can answer (this lens)

1. Is the shape of C acceptable: one list in the existing Auto Move section, where `destination` is optional and `actions` are all-match? Should the section be relabelled (for example "Rules") with no code rename?
2. Should rules choose their triggers (needed only for "create-only defaults that must not backfill on save"), or does every rule run on every trigger in v1?
3. "Immediately": is about 1 s after a property edit enough? That is G2's short delay plus the 500 ms frontmatter autosave. It is a reasoned figure, not a measurement.
4. Legacy icon: stop removing colors, and let icons apply from every matching rule, not only the first (R1, C O3)?
5. May Issue 01 be set to `needs-info` now and later superseded by A1 (G5)?

## 8. Not verified by this judge

- No line counts, timings or planner costs were measured. Section 1's "amount of new code" scores are reading estimates.
- I did not re-read `properties.service.ts`, `widgets.ts`, `event-calendar.service.ts` or `sync-scheduler.service.ts`. Claims about them are taken from the validators via the designs.
- I did not check `collection.service.ts:152-162` (the stats pattern C cites) or the body of `app-lifecycle.service.test.ts`.
- G3 touches exactly two `toggleAutoMoveHook` callers, `app-lifecycle.service.ts:445` and `AutoMoveSection.svelte:117` (grep of `src/lib`). The tests that call it were not inventoried.
