# Verdict: Note list rows and rail sections cluster (P117, P119, P120)

Adversarial check of `scout-nl-rows-sections.md` against HEAD `ab143a411`. Read-only. I opened every cited source line, the tests the scout says must change, `e2e/specs/file-explorer.spec.ts` and `focus-ring.spec.ts`, the help pages, the watcher's modify-only branch, the archived Issue that set today's subtitle rule, and grepped `.scratch/*/issues/*.md` and the sibling scouts of this batch for `FilesNavigator`, `fileToLensNote`, `toLensNote`, `noteSubtitle`, `FILE_KIND_LABELS`, `navigatorFolders`, `MyPeopleSection`, `myPeopleDaysLabel`.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P117 | half | `lens.logic.ts:258-260` `noteSubtitle` joins time and `vaultFolder`; `:290` subtitle in `toLensNote`; `:960-976` `fileToLensNote` gives non-markdown rows `FILE_KIND_LABELS[kind]` (`:925-933`). A folder lens lists direct children only (`:1004-1006`), so the folder part always equals the lens folder: the first half is real. The second half (show the modified time on non-markdown rows) rests on a tree time that is stale; see finding 1. |
| P119 | yes, but not with the proposed rule | `vault.rs:1784-1809` dirs first, `natural_cmp`; `_` sorts before letters. `FilesNavigator.svelte:77` and `:430` call `navigatorFolders` (`lens.logic.ts:941-943`), a filter that keeps tree order. Name span `:493` has no muted variant. `countFiles` (`fs.logic.ts:187`) has no UI caller. The underscore-prefix rule would mute and sink the default journal folder `_notes` (`settings.store.svelte.ts:8`). |
| P120 | three of four parts | Empty text `MyPeopleSection.svelte:35-38`; label `myPeopleDaysLabel` (`one-on-one.logic.ts:239-241`) gives `Nd`/`never`; overdue is `text-warning` only (`:58`). The fourth part ("rows have no focus style") is false; see finding 3. |

## Where the scout is wrong or incomplete

1. **P117's non-markdown time is stale, so that half should not ship as proposed.** `fileToLensNote` would read `node.modifiedAt` from `fsStore.fileTree`. That value is set only by a scan (`scan_vault`) or an in-app create (`fs.service.ts:163-164`, `fs.logic.ts:607`). A content save never updates it: the watcher's modify-only branch returns with "tree untouched" (`fs.watcher.ts:185-196`), and its own doc says "The tree's `modifiedAt` goes stale for these; nothing shows it" (`fs.watcher.ts:119-124`). `editor.service.ts` has no `fsStore` write, and canvas persists through its tab (`CanvasView.svelte:10`). So a canvas or kanban board edited a minute ago would read "3d ago" until its folder is rescanned. Canvas and kanban are among the owner's daily features (memory: owner uses kanban, canvas). Fixing the staleness means writing the tree on every autosave, which is the hot path the modify-only branch exists to skip (and a core write-path change for a cosmetic gain). The archived Issue that introduced relative times kept the kind label on purpose (`.scratch/archived/rail-shell-ux/issues/14-note-rows-show-relative-modified-time.md:17,26`). Recommendation: keep `FILE_KIND_LABELS` for non-markdown rows and drop only the repeated folder. The scout's "fallback to kind label when time is 0" design point becomes moot.
2. **The scout's RailNoteList AC would fail as written.** `RailNoteList.test.ts:1035` asserts `alpha` reads `'Work'` because the `entryV2` fixture has `modifiedAt: 0`. Dropping the folder makes that subtitle `''`, and `NoteRow.svelte:92` then renders no `[data-note-row-subtitle]` at all. The test must give the entry a time under a pinned clock (pattern `lens.logic.test.ts:79` `pinClock`) and assert the time-only string, plus one assertion that a time-less folder-lens markdown row renders no subtitle node.
3. **P120 focus premise is false at HEAD.** `src/app.css:495` (`* { @apply border-border outline-ring/50 }`) colours the UA outline, and Chromium draws it on `:focus-visible` for any button without `outline-none`. `e2e/specs/focus-ring.spec.ts:38-58` pins exactly that ("a raw button without its own focus style uses the theme ring color"). The My people buttons have no `outline-none`, so keyboard focus already shows an outline. The scout's "there is no global button focus rule in app.css" is wrong. What remains is consistency: other rail rows use an inset ring on the row (`FilesNavigator.svelte:437`, `NoteRow.svelte:70`). Keep it as a small criterion, framed as "one indicator, the row ring", not as a missing feature.
4. **The setup line alone loses information.** Today's empty text names the property and the folder, and `help/documentation/09-quick-notes-and-templates.md:121` says so ("With nobody marked, the section says which property to add"). The settings page the setup line opens (`OneOnOneSection.svelte:20-95`) names `_one_on_one_every` only inside the due-days description (`:90`). A criterion "click opens Settings on one-on-one" can pass while the user still cannot find out how to start tracking. The ticket must add one setup sentence at the top of `OneOnOneSection.svelte` (property, folder) and test it.
5. **Missed cross-cluster edit of the same function.** `scout-nl-actions-keyboard.md:130,138` (ticket B) adds `organized`/`archived` to `toLensNote` and to the non-markdown literal in `fileToLensNote`, the exact lines P117 edits. The scout claimed no clash with nl-actions-keyboard. Not semantic, but the two must not run in parallel.
6. **Missed help line for P119.** `help/documentation/02-file-explorer.md:86` says "The navigator's folders and the note list of a folder use the same order: by name". P119 makes that false. The scout pointed at `:90-104` (the `_order` text), which stays right.
7. **P119 counts belong in the same ticket.** The scout's T3 edits the same `folderRow` snippet line (`:493`, the name span) and the same test file as T2 and is blocked by it. Two tickets on the same lines is a split, not a grouping. Merge, with counts gated by the owner answer.
8. **The counts cost argument is wrong.** The scout says a recursive count would "cost a walk per entries change". Counts come from `fsStore.fileTree`, not the entries snapshot, and the tree changes only on scans, creates, moves and deletes (not autosaves, finding 1). A recursive count is a cheap tree walk. The real argument for a direct count is that it equals the list header (`resolveFolderLens` `:1004-1005`). Its cost: `_notes` (daily notes under `YYYY/MM-MMM`) shows no number at all, while the prototype draws "Daily 31". That trade belongs in the owner question.
9. **More e2e at risk than one spec.** `focus-ring.spec.ts:97,108` take `.first()` folder row, and `:74-80` tab to the first toggle. Both are `_system` today and become `Daily`/`Projects` after the reorder. They read the path dynamically, so they should pass, but T2's gate must run `focus-ring.spec.ts` with `file-explorer.spec.ts`.
10. **Overlap corrections.** Issue 094's fix lives in `editor.service.ts`/`fs.logic.ts`, not `lens.logic.ts`, so it is not a dependency of P117 (exclude). Issue 169 is in the abandoned folder and does not overlap behaviour; it is no blocker for T2 (the scout said "sequence 169 before T2"). No open-itens Issue targets the subtitle, the Files tree order or My people: nothing is replaced.
11. **Small line drift.** `MyPeopleSection.svelte` is 77 lines, not 73. The open button is `:47-56`, the New 1:1 button `:65-74`. The `folderRow` snippet is `:429-502`. The cited `FilesNavigator.svelte:~509` does not exist (502 lines). `NoteRow.svelte` ring is `:70`. The other cited lines hold.

Checked with no overlap: active folders tasks-view-ux (111, 240 resolved; only incidental mentions), finders-ux 03/07 (resolved; 07 moved `KIND_ICONS`, T1 relies on it), vault-organization-v2 02 (resolved, `buildMyPeople`), frontmatter-rules (resolved). Sibling clusters: nl-header-creation P38 edits `FilesNavigator.svelte` header `:303-311`, creators `:80-91`, menu `:346-403` and `FilesNavigator.test.ts` (disjoint from T2's `:77` and `:493`; sequence, do not parallelize). nl-empty-states leaves My people to P120 (`scout-nl-empty-states.md:35`). nl-actions-keyboard P24 roving keeps Today sections in normal tab order (`scout-nl-actions-keyboard.md:95`), compatible with T3. ADR-0003 layers: a plugin importing `settingsPanelStore` (core) is allowed; precedent `SearchPanel.svelte:190`. No ADR or `docs/agents/*-rules.md` rule is touched: T2 stays in the navigator layer and leaves `fs.watcher.ts`, `fs.service.ts` and the Rust sort alone.

## Ticket breakdown

Order: T1 and T2 serially (both edit `lens.logic.ts`); T3 any time. T1 also serial with nl-actions-keyboard ticket B; T2 serial with nl-header-creation's P38 ticket.

### T1: Folder-lens rows stop repeating the folder (P117, revised, S)

**What to build.** In `fileToLensNote` (`lens.logic.ts:960-976`), a markdown row with an entry gets the time-only subtitle (`formatRelativeTime(entry.modifiedAt)`), because a folder lens lists direct children and the folder part always equals the lens. Do it with an explicit option on `toLensNote`/`noteSubtitle` (for example `{ withFolder: false }`), not by passing `null` as the vault path. Non-markdown rows and unindexed markdown keep their `FILE_KIND_LABELS` subtitle (finding 1). Every other lens keeps `<time> · <folder>`. Update the doc comments on `noteSubtitle` (`:252-257`), `FILE_KIND_LABELS` (`:924`) and `LensNote.subtitle` (`rail-shell.types.ts:40`). `NoteRow.svelte` and `RailNoteList.svelte` are not touched.

**Files:** `src/lib/features/rail-shell/lens.logic.ts`, `src/lib/features/rail-shell/rail-shell.types.ts`, `src/tests/lib/features/rail-shell/lens.logic.test.ts`, `src/tests/lib/features/rail-shell/RailNoteList.test.ts`.

**Blocked by:** none. Serial with T2 and with nl-actions-keyboard ticket B (same function, textual only).

Acceptance criteria:
- [ ] Failing test first, `lens.logic.test.ts` `describe('resolveFolderLens through resolveLens')` under `pinClock()`: the `Plan` row of `folder(WORK)` reads `'2h ago'` (today `:1978` `'2h ago · Work'`), and the tree-order test reads `'4d ago'`, `'10m ago'` (today `:2004-2007`). An expected update, not a weakened test.
- [ ] A folder lens at a nested folder (`Work/projects`) also drops the folder: `Alpha` reads its time only.
- [ ] Non-markdown rows keep the kind label: `:1979` `subtitle: 'Canvas'` stays green, and so do `Kanban`, `View`, `PDF`, `Image`, `File`. An unindexed `.md` node still reads `'Note'`.
- [ ] Non-folder lenses unchanged: `noteSubtitle` tests (`:742-771`), Today/Favorites/type cases (`:235`, `:275`, `:417`, `:429`) and the neighbourhood `:1062` stay green.
- [ ] `RailNoteList.test.ts:1035`: give `ALPHA`'s entry a `modifiedAt` under a pinned clock and assert the time-only subtitle; `Board` still reads `'Canvas'` (`:1036`); the kind icon test (`:1039-1046`) stays green. One added assertion: a folder-lens markdown row whose entry has `modifiedAt: 0` renders no `[data-note-row-subtitle]`.
- Gate: `pnpm check` + `pnpm vitest run` (targeted files in a relay run).

### T2: Files tree puts system folders last, muted, with file counts (P119, revised, M)

**What to build.**
- A pure predicate in `lens.logic.ts` beside `navigatorFolders`: a folder is a system folder when its vault-relative path equals, or lies under, `templates.systemFolder` (default `_system`) or `templates.folder` (default `_system/templates`; `_templates` in the e2e fixture). A blank value disables that half, as `excludeSystemFolder` does (`type-sidebar.logic.ts:65-75`). Not an underscore prefix (`_notes` and `Work/_people` are user folders in a default vault).
- A pure stable partition `systemFoldersLast(folders, isSystem)` applied to `topFolders` (`FilesNavigator.svelte:77`) only, and skipped when the root has a custom order: `fsStore.folderOrder['.']` is set, or any top-level folder path is in `fsStore.contentOrder`.
- The name span (`:493`) of a system folder and of its descendants gets `text-file-explorer-muted-fg` when not picked. A file-icon `titleColor` still wins (inline `style:color`). The picked row keeps `text-file-explorer-primary`.
- Counts (unless the owner says no): the direct, non-hidden file count of each folder row, right-aligned, `tabular-nums`, muted, from a pure helper that `resolveFolderLens` (`:1004-1005`) also uses, so the number equals the note list header when that folder is picked. No number for zero. Not on the vault root row.
- Help: rewrite `help/documentation/02-file-explorer.md:86` (system folders after the others when there is no custom order) and mention the counts on `:9`.
- Out of scope: `scan_vault`, `compareTreeNodes`, `applyFolderOrder`, `fs.service.ts`, `fs.watcher.ts`, the natural-sort parity fixture. Every other `fileTree` consumer keeps scan order.

**Files:** `src/lib/features/rail-shell/lens.logic.ts`, `src/lib/features/rail-shell/FilesNavigator.svelte`, `src/tests/lib/features/rail-shell/lens.logic.test.ts`, `src/tests/lib/features/rail-shell/FilesNavigator.test.ts`, `e2e/specs/file-explorer.spec.ts`, `help/documentation/02-file-explorer.md`.

**Blocked by:** owner questions 2 to 4 below. Serial with T1 (`lens.logic.ts`) and with nl-header-creation's P38 ticket (`FilesNavigator.svelte`, `FilesNavigator.test.ts`).

Acceptance criteria:
- [ ] Failing test first, `lens.logic.test.ts`: the predicate is true for `_system`, `_system/templates` and `_templates` (when `templates.folder` is `_templates`), false for `_notes` and `Work/_people`; a blank `systemFolder` and blank `templates.folder` make it false for everything. `systemFoldersLast` keeps relative order within each half.
- [ ] Failing test first, `FilesNavigator.test.ts` with real `settingsStore`, `fsStore`, `vaultStore` (no store mocks): tree order `_notes, _system, Areas, Daily` renders `[root, _notes, Areas, Daily, _system]`; the `_system` name span has `text-file-explorer-muted-fg`, `_notes` does not.
- [ ] With `fsStore.setFolderOrder({ '.': [...] })`, or a top-level folder in `fsStore.setContentOrder`, the incoming order is kept and `_system` is still muted.
- [ ] An expanded `_system/templates` row is muted; a `titleColor` icon rule on `_system` wins over the muted class; picking `_system` shows the primary colour, not muted.
- [ ] Counts: a folder with two notes, a canvas, a dotfile and a subfolder shows `3`; an empty folder shows no number; the number equals `resolveLens(folder(path)).notes.length` for the same tree; after `fsStore.setFileTree` adds a file the number updates.
- [ ] `e2e/specs/file-explorer.spec.ts:57-75` expects `[root, Daily, Projects, _system, _templates]` and its comment and title are updated; it passes through `bash scripts/e2e.sh` together with `focus-ring.spec.ts`.
- [ ] The existing "tree order" test (`FilesNavigator.test.ts:92-98`) and the `navigatorFolders` tests (`lens.logic.test.ts:2036-2046`) stay green.
- Gate: `pnpm check` + `pnpm vitest run` + the two e2e specs. Not Rust.

### T3: My people reads as a feature (P120, revised, S)

**What to build.**
- Empty state (`MyPeopleSection.svelte:35-38`): one muted button "Set up 1:1 tracking" that calls `settingsPanelStore.open('one-on-one')` (precedent `SearchPanel.svelte:190`). Keep `data-my-people-empty`. No property name or folder path in the rail.
- Settings (`OneOnOneSection.svelte`, below the heading): one muted sentence saying that a person in the work people folder is listed in My people when their note sets `_one_on_one_every` (finding 4).
- Labels: `myPeopleDaysLabel` returns `today` for 0, `Nd ago` otherwise, `never` for null. The hover title (`:59`) stays.
- Overdue (every row with `overdue`, which includes `never`): a `TriangleAlert` icon in `text-warning` beside the label, `aria-hidden`, plus a visually hidden "Overdue" text (or the same word in the title); `data-overdue` unchanged.
- Focus: the row wrapper gets `has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring/50 has-[button:focus-visible]:ring-inset` and the open button `focus-visible:outline-none` (the `FilesNavigator.svelte:437` pattern), so the row ring replaces the UA outline. The small New 1:1 button keeps one indicator of its own (its own inset ring, or the row ring too).
- Help: `09-quick-notes-and-templates.md:112` quotes the new labels; `:121` describes the setup line and the settings sentence.

**Files:** `src/lib/plugins/one-on-one/MyPeopleSection.svelte`, `src/lib/plugins/one-on-one/one-on-one.logic.ts`, `src/lib/core/settings/sections/OneOnOneSection.svelte`, `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts`, `src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts`, `src/tests/lib/core/settings/OneOnOneSection.test.ts`, `help/documentation/09-quick-notes-and-templates.md`.

**Blocked by:** none. If the owner picks hide (question 5), the ticket grows into `rail-shell.types.ts`, `rail-registry.store.svelte.ts` and `RailNoteList.svelte:671-674` and must then sequence behind the nl-header-creation, nl-actions-keyboard and nl-empty-states tickets that edit `RailNoteList.svelte`.

Acceptance criteria:
- [ ] Failing test first, `MyPeopleSection.test.ts` (real stores; it mocks only Tauri, editor open, tree add, toast, debug): with nobody tracked, the section text contains neither `_one_on_one_every` nor `Work/_people` (today asserted at `:195-196`) and shows a "Set up 1:1 tracking" button inside `[data-my-people-empty]`.
- [ ] Failing test first: clicking it leaves the real `settingsPanelStore` with `isOpen === true` and `activeSection === 'one-on-one'` (reset with `_reset()` in `beforeEach`).
- [ ] Failing test first, `OneOnOneSection.test.ts`: the page shows a sentence naming `_one_on_one_every` and the configured work people folder.
- [ ] Failing test first, `one-on-one.logic.test.ts:517-523`: `myPeopleDaysLabel(0)` is `today`, `1` is `1d ago`, `15` is `15d ago`, `null` is `never`. Section assertions `:109`, `:118`, `:155`, `:173`, `:188` updated to the new strings.
- [ ] An overdue row (past cadence, and a `never` row) renders the warning icon and the "Overdue" text; an on-time row renders neither. The "uses only theme tokens" test (`:129-135`) stays green.
- [ ] The row and its buttons carry the ring classes listed above and the open button carries `focus-visible:outline-none` (class assertions; jsdom has no `:focus-visible`, and the pattern itself is pinned in a browser by `focus-ring.spec.ts:74-92`).
- [ ] `RailNoteList.test.ts:464-475` (Loading, then `[data-my-people-empty]`) and the registration test (`:202`) stay green.
- Gate: `pnpm check` + `pnpm vitest run`.

## Replaced open-itens Issues

None. No open-itens Issue that is not resolved or wontfix targets the folder-lens subtitle, the Files tree order or counts, or My people. 094, 131, 132, 136, 137, 141, 142, 154, 163, 169 and 214 share files or neighbouring code only; none is a dependency.

## Dropped

- **P117 second half (relative time on canvas, kanban, view, pdf, image and other rows):** dropped. The tree time it would show is stale after any content save (finding 1), and fixing that needs a tree write on every autosave in the watcher hot path. Reopen only if the owner wants it with that known staleness (question 1).
- **P119 underscore-prefix rule:** replaced by the configured system folder rule (default vaults keep user content in `_notes` and `_people`).
- **P119 "Show note counts" toggle from the prototype:** no setting; counts are on or off by the owner answer.
- **P120 "hide the section" alternative:** not the default; it needs a visibility field on `RailTodaySection` and edits to the shared `RailNoteList.svelte` (question 5).

## Owner questions

1. **T1:** non-markdown rows in a folder lens keep the kind word (`Canvas`, `Kanban`, `PDF`). Recommended: yes. The alternative, a modified time, would show the time from the last scan, so a board you edited today can read "3d ago".
2. **T2:** system folders are the configured System folder (Settings > Files & Folders, default `_system`) and the templates folder, not every `_` folder. Recommended: yes, no new setting.
3. **T2:** only the vault root level is reordered, and any `folder-order.json` entry for `.` or any `_order` on a top-level folder switches the reorder off (muting stays). Recommended: yes to both.
4. **T2 counts:** do you want them? Recommended: yes, the direct file count, which equals the note list header when you pick the folder, shown on every folder row except the root, nothing for zero. Downside: `_notes` and any folder whose files sit only in subfolders shows no number. The alternative is a recursive count of all files below, which is cheap but differs from the list header. Say "no counts" to drop that part before launch.
5. **T3:** with nobody tracked, show the "Set up 1:1 tracking" button (the prototype) or hide My people and its header? Recommended: the button. Hide fits better if you never use 1:1s, but it touches the shared Today list and the rail registry.
6. **T3:** a 1:1 held today reads `today`, not `0d ago`. Recommended: yes.

## Not checked

- No app run and no tests run, so the e2e reorder effect on `focus-ring.spec.ts` is inferred from its selectors, not observed.
- How often a custom file-icon rule hides a canvas or kanban kind icon (it matters less now that the kind word stays).
- Whether `settingsPanelStore.open` from the rail opens the panel above the Today list in every layout; `SearchPanel` uses the same call.
