# Cross-check: persistence and sources (tickets 243, 116, 123, 124)

Adversarial cross-cutting validation at HEAD `d2304ac9e`. Inputs: tickets 243, 116, 123, 124, 030, 242, 115, 108, 112, 240, 126; `dossier-243.md`, `refute-243.md`, `dossier-116.md`, `dossier-123+124.md`. Nothing was run. (F) = verified in code or ticket text at HEAD. (I) = inference.

## Verified code facts this report relies on

- (F) `parseSettings` rebuilds the settings object from named keys only (`src/lib/core/settings/settings.service.ts:82-198`), and `loadSettings` writes the result back after every good parse (`:68-74`). An unnamed top-level key such as `tasksView` is erased at the next vault open.
- (F) The `todoist` merge is a spread (`settings.service.ts:160-163`); `normalizeSettings` spreads `...settings` and keeps extra keys (`src/lib/core/settings/settings.logic.ts:217-240`).
- (F) `saveSettings` writes directly (`settings.service.ts:270-274` -> `writeSettingsFile` `:251-264`, the single `writeTextFile`). It has no caller outside `settings.service.ts` today (grep over `src/lib`). Store mutations reach disk through `startSettingsPersistence`'s effect and `flushSettingsPersistence` (`src/lib/core/settings/settings-persistence.svelte.ts:46-87`), with baseline `lastWritten = serialize()` at `:50`.
- (F) Precedent for an opaque value parsed in a feature and written by mutating the store: `layout.railListPrefs` typed `Record<string, unknown>` (`src/lib/core/settings/settings.types.ts:111-116`), written by `settingsStore.updateLayout` (`src/lib/features/rail-shell/RailNoteList.svelte:461-463`). `updateLayout` mutates in place on purpose (`settings.store.svelte.ts:247-253`); `updateTodoist` replaces the root (`:320-325`).
- (F) `loadSettings` has one caller, `initializeVault` (`src/lib/app/lifecycle/app-lifecycle.service.ts:210`), followed by the superseded-init guard (`:212`) and `startSettingsPersistence` (`:222`). Teardown order: `stopSettingsPersistence` (`:601`), `resetSettings` (`:656`), `resetTasks` (`:664`). The double-switch path skips `teardownVault` (`:184`, `:200`) but still stops settings persistence (`:154`).
- (F) `app/` is the composition root and may import every layer (`scripts/import-graph.mjs:34-44`, `:161-162`); type-only imports count as edges (`:73-103`). `layer-baseline.json` has 3 entries, none for tasks (`src/tests/lib/architecture/layer-rules.test.ts:32`).
- (F) The lifecycle test mocks `#lib/features/tasks/tasks.service.js` with only `buildTaskIndex` and `resetTasks` (`src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:189-192`).
- (F) `parseSectionTags` (242) adds a `#` to a token that lacks one and returns `[]` for an empty string, which means "no section filter, every task" (`242-tasks-several-section-tags.md:9`). 108 documents that an empty field lists every task (`108-...md:27`), while the owner answer is "the default stays `#to-list`; the view never defaults to every task" (`108-...md:35`).
- (F) Blockers: 243 `242, 030`; 115 `241, 074`; 116 `115`; 123 `112, 116, 030`; 124 `123`; 030 `none`, status `ready-for-agent` (not delivered). 115 lists "the saved tags load per vault (243)" as behavior to keep (`115-...md:25`); 116's default source reads Issue 243's key (`116-...md:14`).

## Findings

### H1 (high). 243, 116, 123, 124: "the settings service's existing save path" points at a function that bypasses Issue 030's guard

- **What is wrong.** 243 (`243:9`) and 123 (`123:9`) say writes go "through the settings service's existing save path". The literal function with that role is `saveSettings` in `settings.service.ts`. Issue 030 puts its "never write a file that was not loaded" guard in `settings-persistence.svelte.ts` only (`030-...md:11`). A `saveSettings` call from `features/tasks` would write defaults plus `tasksView` over an unreadable `settings.json`. That is the data loss 243 and 123 wait on 030 to prevent, and no criterion in either ticket tests it. 116 and 124 inherit the same wording through "243's save path" and "Issue 17's write path" (`126-...md:13-14`).
- **Evidence.** `settings.service.ts:270-274`, `:251-264`; `settings-persistence.svelte.ts:73-87`; `030-...md:11`, `:21-23`.
- **Exact edit, 243.** Replace in `243:9` "saves the new text through the settings service's existing save path. No new `writeTextFile` site." with: "saves the new text by mutating the settings store through a new `settingsStore.updateTasksView(value: unknown)`, which assigns in place as `updateLayout` does; the running settings persistence writes it after its debounce. `features/tasks` never calls `saveSettings` or `writeSettingsFile`: Issue 030's guard lives in persistence and a direct call would bypass it. No new `writeTextFile` site." Add a criterion: "- [ ] After a load where `readTextFile` rejects (Issue 030's protected session), changing the section tag leaves `/vault/.kokobrain/settings.json` unwritten for the rest of the session."
- **Exact edit, 123.** Replace `123:9` with: "Writes mutate `settingsStore.tasksView` through Issue 243's `updateTasksView`; settings persistence writes them. Never call `saveSettings`. No new `writeTextFile` site." Add the same protected-session criterion with "changing the group".
- **Exact edit, 116 and 124.** In 116's default-source bullet, after "written back to `tasksView.sectionTag` (space-joined)", add "by mutating the settings store through `updateTasksView`, never `saveSettings`". In 124, after the `tasksView` shape bullet, add "Every write (Save view, rename, duplicate, delete, active list) mutates `settingsStore.tasksView`; settings persistence writes it."

### H2 (high). 116 (and 115) do not block on 243, yet both build on it

- **What is wrong.** 243 waits on 030 and sits off the main chain ("launch it between two chain Issues once 030 is done", `243:30`). Nothing forces it to land before 115 or 116. 116 removes `tasksStore.sectionTag`, reads the saved tags from `tasksView.sectionTag` and writes heading-card texts back to that key (`116:14`). Without 243, core's `parseSettings` erases `tasksView` at every load (`settings.service.ts:82-198`), `settingsStore` has no getter or updater for it, and 116's implementer must either invent 243's plumbing inside an L-sized ticket or skip the persistence silently. Dossier 123+124 saw the gap (its finding 5) and plans "if 243 is missing, do steps 1-3 yourself", which hides the dependency instead of fixing it.
- **Evidence.** Blocked-by lines listed above; `116-...md:14`, `:23`; `115-...md:25`, `:28`; `dossier-123+124.md:13`, `:95`.
- **Exact edit.** 116: `**Blocked by:** 115, 243`. 115: `**Blocked by:** 241, 074, 243` (115's criterion "the saved tags load per vault (243)" is vacuous without it). 123: the explicit `030` stays; no other change needed once 116 carries 243. In 243's Notes replace "Launch it between two chain Issues once 030 is done." with "Launch it once 030 is done and before 115; 115 and 116 block on it."

### M1 (medium). 243, 116, 123, 124 disagree on what a saved empty filter restores

- **What is wrong.** Four texts give four readings of "the user cleared the filter, then restarted":
  - 243 is silent on `sectionTag: ''`; `refute-243.md` M7 proposes restoring `''` (every task).
  - 116: "with nothing saved, one `#to-list` card"; Clear writes back `''` (`116:14`), and `parseSectionTags('')` is `[]`. Dossier 116 A7 reads that as `#to-list`, so Clear is session-only.
  - 123: a persisted `query.sources: []` would restore "every note" (116: "No cards means every note"), while its legacy read gives `#to-list` for an empty `sectionTag` (`dossier-123+124.md:98`).
  - 124: "seed ... holding the current heading cards"; a 123 query with no heading cards (cleared, or folder cards only) seeds a "To list" view with zero cards, which lists every note and is the vault's opening list (`124:10`).
  So the behavior flips between 243, 116 and 123, and 124 can open a vault on every task, against the owner decision (`108:35`; `124:5`).
- **Exact edit (recommended reading, conservative to the owner decision).** One rule in all four tickets: "Only a non-empty saved filter is restored. An absent, empty or whitespace-only `sectionTag`, an empty `sources`, and a seed with no heading cards all load the `#to-list` heading card. Clear and an emptied box are session-only; 'every task' is reached in-session, and after 124 by picking 'All open'."
  - 243 `:8`, after "A missing key or a missing `sectionTag` gives `#to-list`.": add "So does a `sectionTag` that `parseSectionTags` turns into no tag (`''`, spaces, commas). The text is still saved as typed." Add criterion "`sectionTag: ''` loads `#to-list`." This overrides `refute-243.md` M7.
  - 116 `:14`: replace "with nothing saved, one `#to-list` card" with "when `parseSectionTags` of the saved text yields no tag (absent, empty), one `#to-list` card".
  - 123 `:8`: add "A saved `query.sources` that is empty loads the `#to-list` card."
  - 124 `:10`: replace "holding the current heading cards (...)" with "holding the heading cards of the saved query or saved section tags; when there are none, the `#to-list` card".
  - If the owner prefers that an explicit Clear survives a restart, flip all four together; do not ship mixed readings.

### M2 (medium). 243 and 123 point at the `todoist` merge, the wrong model for an opaque value

- **What is wrong.** `{ ...DEFAULT.todoist, ...parsed.todoist }` applied to `tasksView: 42` gives `{}`, and the load write-back then rewrites the invalid value, breaking "not written until the user changes" (`243:8`, `123:8`). 123 repeats the pointer with a line ref (`123:7`, "as `todoist` does at `:160-162`"). The 42 criterion catches it, so this costs a red cycle rather than shipping a bug. Dossier 116 repeats the error ("243 already extended it [the `todoist` merge]", `dossier-116.md:30`).
- **Evidence.** `settings.service.ts:160-163`, `:68-74`; `settings.logic.ts:217-240`.
- **Exact edit, 243 `:7`.** Replace "and the per-section merge in `settings.service.ts`, as `todoist` does" with "and `parseSettings` in `settings.service.ts`, which drops every key it does not name. Pass `tasksView` through verbatim with no spread and no default (`...(parsed.tasksView !== undefined ? { tasksView: parsed.tasksView } : {})`); `AppSettings.tasksView` is optional and `DEFAULT_SETTINGS` has no `tasksView` key. Precedent for an opaque value parsed in a feature: `layout.railListPrefs` (`settings.types.ts:111-116`)."
- **Exact edit, 123 `:7`.** Replace the whole first bullet with: "Reuse Issue 243's plumbing: `AppSettings.tasksView?: unknown`, the verbatim pass-through in `parseSettings`, `settingsStore.tasksView` and `updateTasksView`, and the load function `initializeVault` calls after `loadSettings`. `core/settings` never imports `TaskQuery` or `TaskExcludes`. In this Issue the key holds `{ version: 1, globalExcludes, query }`." Drop the `todoist` pointer.

### M3 (medium). 123 and 124: the on-disk shapes do not match the store shape 116 defines

- **What is wrong.** 116's `TaskQuery` is `{ version: 1, sources, exclude, quick }`, with `group` and `sort` as separate store fields from 112 (`116:19`, `112:7`). 123's disk shape is `{ version: 1, globalExcludes, query }` where `query` holds "sources, quick filters, group and sort" (`123:7`), so the disk `query` is not a `TaskQuery` and `globalExcludes` must come from `tasksStore.query.exclude`. 124's `savedViews: { id, name, query }[]` does not say whether a view's `query` carries `exclude` (its "own exclude only adds", `124:8`) or `group`/`sort`. Three implementers will each pick a mapping, and 126 then compares saved and session queries (`126:13-14`).
- **Exact edit, 123 `:7`.** Append: "Mapping: `globalExcludes` is `tasksStore.query.exclude`; the saved `query` is `{ sources, quick, group, sort }` (no `exclude`). Collapsed groups (240) and the current row (113) stay session-only. `quick.search` is not saved." (The last sentence is a product choice; see L4.)
- **Exact edit, 124 `:11`.** Replace with: "`tasksView` becomes `{ version: 1, activeList, globalExcludes, savedViews: { id, name, query }[] }`, where a view's `query` is `{ sources, exclude, quick, group, sort }` and its `exclude` defaults to all switches off and empty lists (it only adds to `globalExcludes`). The migrating write removes the legacy `query` and `sectionTag` keys and keeps any other unknown key."

### M4 (medium). 124 undoes 123's headline without saying so

- **What is wrong.** 123 makes sources, quick filters, group and sort survive a restart (`123:5`). 124 then makes every edit on a list session-only and reopens the last list on restart (`124:9`, `:12`), so a user's "Group by due" or folder card stops surviving a restart one ticket after 123 delivers it, until 126. 124 also says both "Issue 16's single query is read once as the active session state" and "the vault then opens on 'To list'" (`124:10-11`), which conflict when 123's query differs from the seed. A user who built a custom 123 query loses it at the first open after 124 (`dossier-123+124.md:122`).
- **Exact edit, 124.** Replace "Issue 16's single `query` is read once as the active session state." with "Issue 16's single `query` is read once, into the seeded 'To list' view (sources, quick, group and sort; heading cards per M1 when it has none), so nothing a user built under Issue 16 is lost." Add under What to build: "**Behavior change:** after this Issue, unsaved edits on a list do not survive a restart (Issue 126 adds Save). The help doc says so." Add a criterion: "A vault whose `tasksView` holds an Issue 16 `query` with a folder card and Group by due seeds 'To list' with both."
- **Owner note (I).** Building `query` persistence in 123 only for 124 to drop it is wasted work. Either confirm the regression, or shrink 123 to `globalExcludes` plus the legacy `sectionTag` read and let 124 seed from that. Ask before launching 123.

### M5 (medium). 124: the active-list fallback and "delete every view" can reopen the vault on every task

- **What is wrong.** 124 does not say what opens when `activeList` names a deleted or unknown id, or when the user deletes every saved view. The only remaining list is "All open" (every note), which contradicts the owner decision. "Once per vault, when `tasksView.savedViews` is missing" (`124:10`) also re-seeds if an implementer omits an empty array or tests `!savedViews?.length`.
- **Exact edit, 124.** Add: "An `activeList` that names no saved view or built-in list falls back to the first saved view, then to 'All open' when no saved view exists. Deleting every view writes `savedViews: []`, which never re-seeds." Add criteria: "Deleting every view, then reloading, leaves `savedViews: []` and no 'To list'." and "An unknown `activeList` opens the first saved view." If the owner wants "never every task" to hold even after deleting every view, forbid deleting the last view instead; that is an owner choice, so record it before launch (memory: owner-decision Issues come back blocked).

### M6 (medium). 116: the write-back of heading texts is lossy and its timing is unspecified

- **What is wrong.** 116 writes "the texts of the heading cards" back to `tasksView.sectionTag`, space-joined (`116:14`). Reloading goes through `parseSectionTags`, which splits on spaces and commas and adds `#` (`242:9`). So a `substring` heading card `To do` comes back as two tag cards `#To` and `#do`, a heading clause inside a card that also has a folder clause comes back as a standalone OR card, and a substring card comes back as a tag card. The ticket also does not say when the write happens; dossier 116 proposes its own debounce timer cleared in `resetTasks()` (`dossier-116.md:103`), which adds the vault-switch race it then has to guard (R2).
- **Exact edit, 116 `:14`.** Replace "the texts of the heading cards are written back to `tasksView.sectionTag` (space-joined)" with "the texts of the cards that hold exactly one heading clause with `match: 'tag'` are written back to `tasksView.sectionTag` (space-joined), synchronously in the function that applies a sources change, by mutating the settings store (H1). Settings persistence debounces the disk write, so the feature adds no timer. Other cards are session-only until Issue 123. `resetTasks()` and `tasksStore.reset()` never write." Add a criterion: "A substring heading card and a folder-plus-heading card are not written back; a reload restores the tag cards only."

### M7 (medium). 116 does not name 243's load site, its invalid-value path or its tests as things to repoint

- **What is wrong.** 116 removes `tasksStore.sectionTag` (`116:14`), the target of 243's loader (dossier 243 `loadSavedTasksView`, called from `initializeVault`). The ticket implies the repoint but does not say to keep 243's invalid-value handling (log, toast, no write-back), the lifecycle call, or 243's round-trip and vault-switch tests. An implementer under L-size pressure can delete the loader with the field.
- **Exact edit, 116.** Add a bullet: "Issue 243's loader stays the single load point (`grep -rn tasksView src/lib src/tests` first): it now builds the default query from `parseSectionTags` of the saved text and sets `tasksStore.query`, keeps 243's invalid-value behavior (`error()`, toast, the value left on disk until the next sources change), and keeps its call from `initializeVault`. 243's round-trip, invalid-value and vault-switch tests move to the query, they are not deleted."

### L1 (low). 123: the "Blocked by (origin)" and "Waits on" lines name `115` for what is Issue 030

- **What is wrong.** `123:13` and `123:17` say "audit-2026-11-05 115". That audit number is open-itens 030 (`030:3`), while open-itens 115 is the fetch ticket. A reader or a parser can take it for 115. 123 is also `needs-triage` while 124, blocked only by 123, is `ready-for-agent` (`123:15`, `124:16`).
- **Exact edit.** Replace `123:13` with "**Blocked by (origin):** audit-2026-11-05 Issue 115 is open-itens 030, listed above." Replace the "Waits on" paragraph with "**Waits on:** 030 (listed in Blocked by): a settings file that was never loaded must not be saved over." Set Status to `ready-for-agent` after M3, M4 and L4 are settled.

### L2 (low). 243 and 123: the two dossiers pick different `updateTasksView` forms

- **What is wrong.** Dossier 243 picks root replacement, the `updateTodoist` form (`dossier-243.md:24`). Dossier 123 requires in-place, the `updateLayout` form, because view edits are frequent (`dossier-123+124.md:25`). Changing the form in 123 churns 243's tests.
- **Exact edit.** Covered by H1's 243 text ("assigns in place as `updateLayout` does"). Add to 243 Notes: "Do not `structuredClone` a value read back from the store; it is a `$state` proxy."

### L3 (low). 123: restore order on the double-switch path

- **What is wrong (I).** If 123 mirrors `tasksStore` into `settingsStore.tasksView` with an effect (dossier 123 step 4), and the double-switch path skips `resetTasks` (`app-lifecycle.service.ts:184`, `:200`), a mirror still alive when the restore applies the defaults for `tasksView: 42` would serialize those defaults into the new vault's settings before `startSettingsPersistence` takes its baseline (`:222`, `settings-persistence.svelte.ts:50`). The 42 would then be overwritten by the next unrelated settings write. Svelte's microtask scheduling probably drops the pending run when the root is disposed synchronously, but the order should not rely on that.
- **Exact edit, 123.** Add: "The restore stops the Tasks mirror first, applies the parsed state, then starts the mirror with that state as its baseline. `resetTasks()` stops it synchronously as its first statement (teardown resets settings at `:656` before tasks at `:664`)." Add a criterion: "Loading a vault with `tasksView: 42` without `resetTasks()` in between (the double-switch path) leaves 42 in `settingsStore.tasksView`."

### L4 (low). 123: "invalid" and "quick filters" are underspecified for later tickets

- **What is wrong.** 118 adds group-by type, property and heading (`118-group-by-type-property-heading.md`); a strict `group` enum in 123 would treat a newer value as invalid, fall back to defaults, and overwrite it at the next change. 123 also says "quick filters" without excluding `search`, which a restart would restore as a hidden filter. 240 says "Issue 123 decides persistence" of collapsed groups (`240:7`), and 123 says nothing.
- **Exact edit, 123 `:8`.** Add: "Only a non-object `tasksView`, `query` or `globalExcludes` counts as invalid (log and toast). A field with an unknown or wrong-typed value falls back to its own default, and `version` is not checked." With M3's mapping line, which already fixes search and collapse.

### L5 (low). 124: the first criterion's snapshot condition is not part of the rule

- **What is wrong.** The migration seeds whenever `savedViews` is missing (`124:10`); the first criterion conditions it on "a vault whose snapshot has a `## Inbox #to-list` heading" (`124:22`). Seeding needs no snapshot read.
- **Exact edit, 124 `:22`.** Replace "a vault whose snapshot has a `## Inbox #to-list` heading and no `savedViews`" with "a vault with no `savedViews` (whatever its notes hold)".

### L6 (low). 116: stale line references

- (F) `settings.types.ts:169-177` is `:176-183`; `settings.store.svelte.ts:95-96` is `:98-99`; `type-definitions.logic.ts:91` is correct; the help doc Section filter row is `:103`, not `:101`. Edit the refs in `116:15` and `116:35`.

## Dossier review (116 and 123+124)

- `dossier-116.md:30` repeats the `todoist` merge as 243's model (M2).
- `dossier-116.md:103` (plan step 7) adds a feature-owned debounce for the write-back; prefer a synchronous store mutation and let settings persistence debounce (M6). R2 then disappears.
- `dossier-116.md:120` (A7) reads `''` as `#to-list`, opposite to `refute-243.md` M7; resolve with M1.
- `dossier-116.md:41` says "invalid value gives `#to-list` + `error()` + toast and no write-back"; with 243's load write-back the precise meaning is "the value stays on disk unchanged until the next change" (`dossier-243.md:10`).
- `dossier-123+124.md:13`, `:95`: it correctly finds the missing 243 blocker, but the remedy "do steps 1-3 yourself" should be a blocker edit (H2).
- `dossier-123+124.md:100` (plan step 5): "apply the state ... then `startTasksViewPersistence()`" needs the stop-first order (L3).
- `dossier-123+124.md:25` vs `dossier-243.md:24`: updater form conflict (L2).
- Otherwise accurate where I checked: lifecycle line numbers (`:154`, `:210`, `:212`, `:222`, `:601`, `:656`, `:664`), the mock factory at `:189-192`, the `parseSettings` erasure and write-back, the `railListPrefs` precedent, and `BASELINE_SIZE = 3`.

## Layer rules

- (F) No ticket in this set needs a new layer edge if core types `tasksView` as `unknown`: `features/tasks -> core/settings` is allowed, `app/lifecycle -> features/tasks` already exists (`app-lifecycle.service.ts:57`), and type-only imports count (`scripts/import-graph.mjs:73-103`), so core must not `import type` from `features/tasks` either. All four tickets state this correctly.
- (I) 116 must not import `isTypeDefinition` from `features/type-definitions` (a new feature pair, which `feature-cycle.test.ts` rewrites rather than fails on); inline `noteType === 'Type'` as dossier 116 R5 says.

## Owner decisions vs ticket text

- `#to-list` default and never every task: 243 and 116 match; 124's seed and fallback can break it (M1, M5).
- Several tags as any-of, saved per vault: 242 and 243 match; 116 keeps it through heading cards, with the lossy write-back in M6.
- B1 revised to (b), vault opens on "To list": 124 matches; the interaction with 123's persisted query is unstated (M4).
- Undo and the merged tickets (235, 237, 120) do not touch this set.

## Confidence changes

- **243: lower to medium until H1 and M1 are applied, then medium-high.** The plumbing is small and the dossier plus refutation are accurate. The `saveSettings` reading is the one path to data loss, and the empty-string question flips behavior in 116.
- **116: lower.** It silently depends on 243 (H2), has to repoint 243's loader without the ticket saying so (M7), and specifies a lossy write-back (M6), all inside an L-sized UI ticket. With H2, M6 and M7 applied: medium.
- **123: lower to low-medium.** Its first bullet re-specifies plumbing 243 already built, with the wrong merge model (M2); the disk shape does not map onto 116's store (M3); its main value is dropped by 124 (M4); status is `needs-triage`. Raise to medium after M2, M3, M4 and L4, and once the owner confirms M4.
- **124: lower to low-medium.** Seed, fallback and legacy handling can each open a vault on every task (M1, M5), and the "read once as session state" sentence contradicts "opens on To list" (M4). Its size (L) also argues for the A/B split in dossier 123+124 section 5.3.
- **030: unchanged.** It is the guard all four depend on. H1 keeps every Tasks write behind it.
