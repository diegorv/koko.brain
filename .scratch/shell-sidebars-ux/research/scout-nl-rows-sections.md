# Scout: Note list rows and rail sections cluster (P117, P119, P120)

Checked against HEAD `ab143a411` (main). Read-only. Haiku raw evidence (`research/raw/P117.md`, `P119.md`, `P120.md`) was re-checked line by line; where it differs the difference is stated. Prototype: `.scratch/design-review/prototypes/note-list-rail.html` (sections `#p117` ~439, `#p119` ~454, `#p120` ~467; scripts ~1099-1168). Screens opened: `screens/files-note-list-light.png`, `screens/landing-today-light.png`.

## Code map (what runs today)

| File | Role | Read by |
|---|---|---|
| `src/lib/features/rail-shell/lens.logic.ts` | Pure lens resolver. `noteSubtitle` (:258-260), `vaultFolder` (:272-279), `toLensNote` (:281-296, subtitle at :290), `FILE_KIND_LABELS` (:925-933), `navigatorFolders` (:941-943), `fileToLensNote` (:960-976), `resolveFolderLens` (:986-1009) | `RailNoteList.svelte:184` (`resolveLens`), `FilesNavigator.svelte:55,77,430` (`navigatorFolders`) |
| `src/lib/features/rail-shell/rail-shell.types.ts` | `LensNote` (:36-50; `subtitle` doc at :40 says "time and folder"; `kind` doc says only the folder lens lists non-markdown), `RailTodaySection` (:191-198: `id`, `label`, `component`, nothing else) | rail registry, `RailNoteList` |
| `src/lib/features/rail-shell/RailNoteList.svelte` | Renders rows through `noteRow` snippet (:892-906: `subtitle={note.subtitle}`, `fallbackIcon={KIND_ICONS[note.kind]}`); Today groups: `groupedItems` (:664-681) pushes a header plus the section component for every registered Today section (:671-674), section body at :836-838 | rail |
| `src/lib/features/note-list/NoteRow.svelte` | Row. Subtitle `{#if subtitle}` div with `data-note-row-subtitle` (:92-93), icon branch with `data-note-row-fallback-icon` (:68-72). No folder logic | `RailNoteList` |
| `src/lib/features/rail-shell/kind-icons.ts:16` | `KIND_ICONS: Record<FileKind, Component>`, the kind glyph of a non-markdown row | `RailNoteList` |
| `src/lib/features/type-definitions/type-sidebar.logic.ts:269-280` | `formatRelativeTime(epochSeconds)`: `''` for 0, `just now`, `Nm/Nh/Nd ago`, then a date at 30 days | `lens.logic.ts` |
| `src/lib/features/rail-shell/FilesNavigator.svelte` | Files tree column. `topFolders = navigatorFolders(fsStore.fileTree)` (:77), `rowClass` (:293-299), vault root row + `topFolders` loop (:328-342), recursive `folderRow` snippet (:429-505; name span at :493, icon branch :482-492, subfolders `navigatorFolders(node.children)` :430) | rail |
| `src/lib/core/filesystem/fs.logic.ts` | `applyFolderOrder`/`orderLevel` (:408-496; falls to `reorderedFolders = folders` at :478), `compareTreeNodes` (:551-554), `sortLevel` (:571-573), `insertTreeNode` (:584+), `countFiles` (:187-199, no UI caller) | `fs.service.ts`, `fs.watcher.ts` |
| `src/lib/core/filesystem/fs.service.ts:111-115`, `fs.watcher.ts:229-232` | Both skip `applyFolderOrder` when there is no `folder-order.json` entry and no `_order` | tree load, watcher rescans |
| `src-tauri/src/commands/vault.rs:1784-1809` | `sort_nodes` + `natural_cmp`: directories first, lowercase code-point compare, so `_` (95) sorts before letters (97+). Pinned by `src/tests/fixtures/natural-sort-parity.fixture.json` | `scan_vault` |
| `src/lib/core/settings/settings.store.svelte.ts:97-100`, `settings.types.ts:175-183` | `templates.folder` default `_system/templates`, `templates.systemFolder` default `_system` (vault-relative). Used by `excludeSystemFolder` (`type-sidebar.logic.ts:65-75`); the Files navigator does not read it | many |
| `src/lib/plugins/one-on-one/MyPeopleSection.svelte` (73 lines) | The My people body: derived `rows` via `buildMyPeople` over `typeDefinitionsStore.entries`; empty div (:35-38), per-row open button (:47-53), days span (:56-64), New 1:1 button (:65-71) | Today section registry |
| `src/lib/plugins/one-on-one/one-on-one.logic.ts` | `ONE_ON_ONE_EVERY_PROPERTY` (:140), `buildMyPeople` (:200), `myPeopleDaysLabel` (:239: `Nd` or `never`) | section, tests |
| `src/lib/plugins/one-on-one/one-on-one-today.service.ts:12-18` | `registerOneOnOneTodaySection()` registers `{id, label: 'My people', component}`; called from `app-lifecycle.service.ts:273` | lifecycle |
| `src/lib/core/settings/settings-panel.store.svelte.ts:11-14` | `open(section?)`; the 1:1 section id is `'one-on-one'` (`settings.types.ts:360`), heading "1:1 Notes" | settings |

Which lenses list non-markdown rows: only the folder lens (`LensNote.kind` doc, `rail-shell.types.ts`; every other lens maps entries through `toLensNote`, `lens.logic.ts:330,373,405,411,413,854`). This settles a haiku "unconfirmed": the Today lens never shows canvas or kanban rows, so the prototype's Today-lens canvas/kanban rows are a mock.

## P117. Note row second line across lenses

**Still real: yes, for the folder lens; the prototype is wider than the code.**

Current behaviour:
- `noteSubtitle` (`lens.logic.ts:258-260`) joins `formatRelativeTime(modifiedAt)` and `vaultFolder`. Nothing knows the lens, so a folder lens row (direct children only, `resolveFolderLens` :1004-1006) always repeats the lens folder ("2h ago · Work" under a list headed "in Work/").
- A non-markdown row, and a markdown file the entries snapshot has not indexed, takes `FILE_KIND_LABELS[kind]` (`fileToLensNote` :973), so a canvas/kanban/view/pdf/image/other row shows "Canvas", "Kanban", ... and no time, even though `modifiedAt` is already set from the tree node two lines above (:967-969, ms to seconds).
- The screenshot "Note" under Kokobrain Launch Plan is that unindexed branch (`markdown: 'Note'`, :926): the harness vault had not indexed the rows. In the real app an indexed note shows a time, so the review's "Note is a mock artifact" holds. The fix still repairs the unindexed-markdown case (it gets a time from the tree node).
- The icon already carries the kind: `RailNoteList.svelte:904` passes `KIND_ICONS[note.kind]` as the fallback glyph. A custom file-icon rule (`resolveNoteIcon`, :644-654, `resolveIconForPath(note.path)` first) replaces it, so for a canvas with a user icon the kind would no longer show at all. Not measured how common that is.
- Line drift in the review Evidence: `:291` is `:290` at HEAD; the other cited lines hold.

What the prototype wants (`#p117`, `sub()` helper): folder lens, notes show time only; non-notes show time only (icon carries the kind); a lens where folders vary (Today) keeps "time · folder". The Before column is the same lists with the kind word and no time.

Design points a ticket must settle:
1. Where the rule lives. Smallest: `fileToLensNote` builds the time-only subtitle for every row in a folder lens (the folder is always the lens folder, because rows are direct children only, so dropping it is always right and needs no lens argument). Add an optional "leave the folder out" argument to `noteSubtitle`/`toLensNote` instead of passing `null` as the vault path (that works because `vaultFolder` returns `''` without a vault, but it hides intent).
2. Time unknown (`node.modifiedAt` absent gives 0, and `formatRelativeTime(0)` returns `''`, which would leave the row without a second line and shorter than its neighbours). Recommended: fall back to the kind label only then, so `FILE_KIND_LABELS` stays but only as the no-time fallback.
3. Update the now-wrong docs: `noteSubtitle` comment (:252-257), `FILE_KIND_LABELS` comment (:924), `LensNote.subtitle` doc (`rail-shell.types.ts:40`).
4. Do not touch `NoteRow.svelte`: it renders the string as is.
5. The 30-day rule of `formatRelativeTime` means an old pdf reads "Sep 27" or "Mar 4, 2025": fine, same as notes.

Tests and seams (real stores; mock only Tauri/side-effect services; never mock `.logic.ts`):
- `src/tests/lib/features/rail-shell/lens.logic.test.ts`, `describe('resolveFolderLens through resolveLens')` (:1943+, `pinClock()`): the assertions that pin today's output and must change: :1978 (`plan.subtitle` `'2h ago · Work'` becomes `'2h ago'`), :1979 (`board` `modifiedAt: 3` ... `subtitle: 'Canvas'`: the fixture node needs a realistic time, the current `3` renders as a 1970 date), :2004-2007 (`'4d ago · Work'`, `'10m ago · Work'` lose the folder). `noteSubtitle` tests (:742-771) stay for the non-folder lenses.
- `src/tests/lib/features/rail-shell/RailNoteList.test.ts:1035-1036` (folder-lens mount: `alpha` subtitle `'Work'`, `Board` `'Canvas'`) must change to the time-only strings. Lines :302-304 are the non-folder (Today/Inbox) case and stay.
- New failing tests first: a canvas node with a time gives `'2h ago'`; an unindexed `.md` node gives its time, not `'Note'`; a node without a time gives the kind label; a Today/type lens row still reads `'2h ago · Work'`.
- No e2e spec asserts `data-note-row-subtitle` (grep of `e2e/` found none).

## P119. System folders in the Files tree, with counts

**Still real: yes, but the proposal's rule (underscore prefix) is wrong for default vaults. Needs a different predicate.**

Current behaviour:
- `scan_vault` orders directories first, then `natural_cmp` (`vault.rs:1784-1809`); `_` (95) sorts before every letter, so `_system` and `_templates` sit above `Areas`, `Daily`. With no custom order nothing re-sorts them (`fs.logic.ts:478` keeps the incoming order; `fs.service.ts:111-115` does not even call `applyFolderOrder`).
- `FilesNavigator.svelte:77,430` use `navigatorFolders` (`lens.logic.ts:941`): a filter only, hidden (dot) folders out, tree order kept. The folder row (`:429-505`) has no muted variant: the icon is `text-file-explorer-muted-fg` when inactive (:489-491) but the name span (:493) is not muted.
- Counts: nothing shows a count in the navigator. `countFiles` (`fs.logic.ts:187-199`) is recursive over all files and has no UI caller.
- Review's other citation: `folder-notes.logic.ts:16-48` is the `_order` map (`buildContentOrderMap`), not system-folder logic.

What the prototype wants (`#p119`): user folders first in name order, `_system` and `_templates` after them, muted by `n[0] === '_'`; a "Custom order set" toggle where the fixed `folder-order.json` order still wins and only the muting stays; a "Show note counts" toggle adding a right-aligned number (mock values, e.g. Daily 31). Copy: "no new hide setting".

The finding that changes the design: **the default vault has underscore-prefixed USER folders.** `periodicNotes.folder` defaults to `_notes` (`settings.store.svelte.ts:8`: daily notes live in `_notes/YYYY/...`), the people folders default to `Work/_people` and `Personal/_people` (:45-46). An `_`-prefix rule would mute and sink the user's journal folder in a default vault. The configured notion of "system" already exists: `templates.systemFolder` (default `_system`) and `templates.folder` (default `_system/templates`, so `_templates` appears only in the E2E fixture `e2e/fixtures/test-vault.ts:65` and for users who set it; the review's `_templates` example is not a default). Recommended predicate: a folder is "system" when its vault-relative path equals `systemFolder` or `templates.folder`, or lies under one of them; a blank value disables it (as `excludeSystemFolder` does).

Design points:
1. Predicate (above). Owner question 1.
2. Where to order. Option A (recommended): navigator layer only. A pure `systemFoldersLast(folders, isSystem)` stable partition in `lens.logic.ts`, used for the top level (system folders are vault-relative paths, normally top level) and skipped when a custom order exists: `fsStore.folderOrder['.']` is set, or any top-level folder is in `fsStore.contentOrder` (keys are folder paths, `fs.logic.ts:457-476`). Cheap, no hot path, does not touch the Rust sort or its parity fixture. Option B: partition inside `orderLevel` (`fs.logic.ts`): then `sortLevel` and `insertTreeNode` stay in step for free, but `fs.service.ts:111-115` and `fs.watcher.ts:229-232` must call `applyFolderOrder` unconditionally (watcher is a hot path, see `docs/agents/indexing-watcher-rules.md`) and every other `fileTree` consumer (quick switcher, canvas file picker, relationship search, move dialogs) changes order too. Not recommended for an S ticket.
3. Muting: name span `text-file-explorer-muted-fg` when not picked, applied to a system folder and its descendants; a user `titleColor` from a file-icon rule must still win (it is an inline `style:color` today, :493).
4. Counts (optional in the review, own ticket below): the cheapest honest number is the direct, non-hidden file count of the node's `children`, the same filter `resolveFolderLens` uses (`:1004-1005`), so the count equals the list header count (`data-note-list-count`) when the folder is picked. Export that filter as a small pure helper next to `navigatorFolders` so both read one rule. Recursive or note-only counts would disagree with the list and cost a walk per entries change.

Tests and seams:
- `src/tests/lib/features/rail-shell/FilesNavigator.test.ts` (:92-98 "shows the vault root, then the top-level folders only, in tree order"; mount helper :43; fixture TREE :28-40): add `_system` and `_notes` folders, set `settingsStore` templates, real `fsStore.setFolderOrder` / `setContentOrder`; assert order, the muted class on `_system` and not on `_notes`, and that a custom order wins.
- `src/tests/lib/features/rail-shell/lens.logic.test.ts` `describe('navigatorFolders')` (:2036-2046): the partition helper.
- Option B only: `src/tests/lib/core/filesystem/fs.logic.test.ts` (:782+ `applyFolderOrder`, :467+ `countFiles`), `fs.service.test.ts`, `fs.watcher` tests, and the natural-sort parity fixture.
- E2E: `e2e/specs/file-explorer.spec.ts:57-75` asserts the DOM order `[root, _system, _templates, Daily, Projects]` and its comment says both are created at vault open. With the settings-based rule and the fixture's `templates.folder = '_templates'` both are system, so the expected order becomes `[root, Daily, Projects, _system, _templates]`. Must change in the same ticket; run only through `bash scripts/e2e.sh`.
- Docs: `help/documentation/02-file-explorer.md` (~:90-104, ordering rules) gets one sentence.

## P120. My people section

**Still real: yes, all four parts.** One nuance for the "3d has no context" part: the row already has a `title` tooltip (`Last 1:1 on <date>` / `No 1:1 yet`, :59), so the gap is visual only. The MANIFEST quotes the empty text as `_one_one_every`; the code and screenshot say `_one_on_one_every` (manifest typo).

Current behaviour (`MyPeopleSection.svelte`):
- Empty (:35-39): prints `Add _one_on_one_every to a person in Work/_people to track 1:1s` (raw constant and folder).
- Label (:56-64): `myPeopleDaysLabel` (`one-on-one.logic.ts:239`) gives `Nd` or `never`, no "ago".
- Overdue (:58): `text-warning` colour only; the component imports only `Plus` and `UserRound` (:3-4). `data-overdue` exists on the span.
- Focus: the open button (:47-53) and New 1:1 button (:65-71) have `cursor-default`, hover classes, no `focus-visible:`; there is no global button focus rule in `app.css`. Precedent to copy: `NoteRow.svelte:~71` (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset`) and the Files row pattern `has-[button:focus-visible]:ring-2 ...` on a wrapper whose buttons carry `focus-visible:outline-none` (`FilesNavigator.svelte:437`, `:~509`).
- Hide option is not free: `RailNoteList.svelte:671-674` pushes the "My people" header for every registered section, and `RailTodaySection` (`rail-shell.types.ts:191`) has no visibility field. A component that renders nothing would leave a header-only group.
- The empty-state hook `data-my-people-empty` is asserted by `RailNoteList.test.ts:464-475` (Today shows Loading, then the empty node after entries land); keep the hook if the setup line is chosen.

What the prototype wants (`#p120`): empty mode shows one muted button "Set up 1:1 tracking" (settings icon, chevron) that opens settings (the prototype only toasts "Opens Settings > 1:1 notes"; the app's label is "1:1 Notes", `OneOnOneSection.svelte:20`); configured mode shows "3d ago", "12d ago", "never", an alert icon beside the warning colour on overdue rows, and a visible focus ring (class `fx`). The "hide the section" alternative is not drawn.

Design points:
1. Setup line (prototype) versus hide. Owner question 2.
2. Link target: `settingsPanelStore.open('one-on-one')` (`settings-panel.store.svelte.ts:11-14`). A plugin importing the core settings store is allowed. The People/Folder settings there already name the folder; but the settings page does not explain `_one_on_one_every` (only the due-days description does, `OneOnOneSection.svelte:90`), so a user who lands there still needs the property name. Optional: one muted sentence on that page, or leave to the help page (`help/documentation/09-quick-notes-and-templates.md:112`).
3. Label copy lives in `myPeopleDaysLabel` (pure): `0` should not read "0d ago"; recommended `today`, `1d ago`, `Nd ago`, `never`. Update the help page sentence that quotes `5d`.
4. Overdue icon: `TriangleAlert` exists in `@lucide/svelte` (already imported by `ModDialogHost.svelte:7`); give it the `text-warning` token class (tests forbid hard-coded colours, `MyPeopleSection.test.ts` "uses only theme tokens") and an accessible name ("Overdue") or extend the tooltip; keep `data-overdue`.
5. Focus: wrapper `has-[button:focus-visible]` ring for the row plus its own ring on the small New 1:1 button, or per-button rings. jsdom has no `:focus-visible`, so assert the class names (the file already asserts class lists: `rounded-md`, token classes).

Tests and seams (`src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts`, 206 lines, mocks only Tauri, editor open, tree refresh, toast; real stores):
- Pinned today and must change: day label asserts `'5d'` (:109), `'14d'` (:118), `'31d'` (:155), `'0d'` (:~170), `'never'` (:110, :~183); empty text assertion (:~190-193); registration `toEqual([{id,label,component}])` (:~200) breaks if a visibility field is added.
- `src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts:517-523` (`myPeopleDaysLabel`).
- New: click the setup line, then real `settingsPanelStore.isOpen === true` and `activeSection === 'one-on-one'` (reset with `_reset()`); overdue row renders the icon and a non-overdue row does not; the two buttons carry `focus-visible:ring-*`.
- If hide is chosen: `RailNoteList.test.ts` (:464 loading case, which expects the empty node) and `RailNoteList.search.test.ts:332-347` (stub section "My people", asserts header present/absent), `rail-registry.store.test.ts:65-77`.
- E2E: no spec references My people (grep of `e2e/`); component tests are enough.
- Related: the Today header count comes from the dated group only, so a taller/shorter My people block moves no count.

## Candidate tickets

### T1. Folder-lens rows end with a time, not the folder or a kind word (P117). Size S

- Files: `src/lib/features/rail-shell/lens.logic.ts` (`noteSubtitle`, `toLensNote`, `fileToLensNote`, `FILE_KIND_LABELS` comment), `src/lib/features/rail-shell/rail-shell.types.ts` (`LensNote.subtitle` doc), tests `lens.logic.test.ts` and `RailNoteList.test.ts`.
- Blockers: none inside this cluster. Same file as open-itens 094/131/137/141/142 (all abandoned; see overlaps), so a rebase is textual only. `RailNoteList.svelte` is NOT touched, so no clash with nl-header-creation (P33/P38/P84), nl-actions-keyboard (P39/P24), nl-empty-states (P29), which edit that component.
- Acceptance criteria:
  1. Failing test first: `resolveLens(folder(WORK))` gives a markdown row with an entry the subtitle `'2h ago'` (no folder); same ticket updates the pinned `'4d ago · Work'`/`'10m ago · Work'` expectations.
  2. Failing test first: a canvas, kanban, view, pdf and image node with `modifiedAt` render the relative time as subtitle, and an unindexed `.md` node renders its time, never `'Note'`.
  3. A node without a time renders the kind label (the row keeps a second line).
  4. Non-folder lenses are unchanged: Today, Favorites, Type and view lenses still read `'<time> · <folder>'` (existing tests :235, :275, :417, :429, :742-771 stay green).
  5. `RailNoteList.test.ts:1035-1036` updated: the mounted folder lens shows `alpha` and `Board` with time-only subtitles, and the kind icons test (:1045-1051) stays green.
  6. Doc comments on `noteSubtitle`, `FILE_KIND_LABELS` and `LensNote.subtitle` describe the new rule.
- Gate: frontend only (`pnpm check` + `pnpm vitest run`).

### T2. Files tree shows system folders muted and after user folders (P119, order and muting). Size S to M

- Files: `src/lib/features/rail-shell/lens.logic.ts` (pure predicate + `systemFoldersLast` partition beside `navigatorFolders`), `src/lib/features/rail-shell/FilesNavigator.svelte` (:77 top folders, name span :493), tests `FilesNavigator.test.ts` and `lens.logic.test.ts`, `e2e/specs/file-explorer.spec.ts:57-75`, `help/documentation/02-file-explorer.md`.
- Blockers: `FilesNavigator.svelte` is shared with open-itens 169 (icon resolution in folder rows; sequence it, no semantic clash) and possibly with nl-header-creation tickets that touch the navigator's New menu (check P33/P38/P84 before launching; `lens.logic.ts` is shared with T1, so run T1 and T2 one after the other, not in parallel). Before the ticket agent starts: owner questions 1 and 3.
- Acceptance criteria:
  1. Failing test first: with `systemFolder: '_system'` and tree order `_system, Areas, Daily`, the navigator lists `Areas, Daily, _system`.
  2. Failing test first: a user folder that starts with an underscore (`_notes`, the default periodic-notes folder) keeps its place and is not muted; the folder named by `templates.systemFolder`, and the one named by `templates.folder`, are muted and last.
  3. With a custom order (`fsStore.setFolderOrder({'.': [...]})` or a top-level folder in `fsStore.setContentOrder`), the list keeps the incoming order; the system folders are still muted.
  4. Descendants of a system folder render muted; a `titleColor` from a file-icon rule still wins over the muted colour; the picked row keeps the primary colour.
  5. A blank `systemFolder` and a vault without a configured templates folder mute and move nothing.
  6. The e2e expectation in `file-explorer.spec.ts` becomes `[root, Daily, Projects, _system, _templates]` and passes through `bash scripts/e2e.sh`.
  7. `scan_vault` order, `compareTreeNodes` and the natural-sort parity fixture are untouched.
- Gate: frontend plus e2e. Not Rust.

### T3. Files tree rows show a file count (P119, optional counts). Size S

- Files: `src/lib/features/rail-shell/lens.logic.ts` (export the direct-files filter that `resolveFolderLens` uses, so list and count share one rule), `FilesNavigator.svelte` (right-aligned `tabular-nums` count in the folder row and the root row), tests `FilesNavigator.test.ts`, `lens.logic.test.ts`.
- Blockers: T2 (same component, same snippet); owner question 4 (whether counts exist at all, and always-on or a Layout setting). Do not start without that answer.
- Acceptance criteria:
  1. Failing test first: a folder with two notes, one canvas, a hidden file and a subfolder shows `3` (direct, non-hidden files; the subfolder and the dotfile do not count).
  2. The count equals the note list header count (`data-note-list-count`) when that folder is picked (test mounts both or compares against `resolveLens` rows length).
  3. A folder with no files shows no number (not `0`), or `0` muted, per the owner answer.
  4. The count updates when `fsStore.setFileTree` changes, with no extra IPC and no walk of the entries snapshot.
  5. The vault root row shows its direct file count only if the owner asks for it.
- Gate: frontend only.

### T4. My people reads as a feature, not a bug (P120). Size M

- Files: `src/lib/plugins/one-on-one/MyPeopleSection.svelte`, `src/lib/plugins/one-on-one/one-on-one.logic.ts` (`myPeopleDaysLabel`), tests `MyPeopleSection.test.ts` and `one-on-one.logic.test.ts`, `help/documentation/09-quick-notes-and-templates.md` (:112 and the empty-state sentence at :121). Extra files only if the owner chooses hide: `rail-shell.types.ts` (`RailTodaySection`), `rail-registry.store.svelte.ts`, `RailNoteList.svelte:671-674`, `one-on-one-today.service.ts`, plus `RailNoteList*.test.ts` and `rail-registry.store.test.ts`.
- Blockers: none in this batch. With the setup-line default no shared file with other clusters; `MyPeopleSection` has no neighbour in `.scratch` besides resolved vault-organization-v2 02. Choosing hide makes it share `RailNoteList.svelte` with the nl-header/actions/empty-states clusters (rebase and possibly sequence behind them).
- Acceptance criteria:
  1. Failing test first: with nobody tracked the section does not contain `_one_on_one_every` or a folder path; it shows a muted "Set up 1:1 tracking" button (keeps `data-my-people-empty`).
  2. Failing test first: clicking it leaves the real `settingsPanelStore` open on `'one-on-one'`.
  3. Failing test first: day labels read `today`, `1d ago`, `5d ago`, `never` (`myPeopleDaysLabel` unit test and the section test), and the hover title still carries the last 1:1 date.
  4. An overdue row renders a warning icon with an accessible name, in the `text-warning` token class; a non-overdue row has none; the "theme tokens only" test stays green and `data-overdue` is unchanged.
  5. Both row buttons show a ring on keyboard focus (class assertions for `focus-visible:ring-*`, wrapper `has-[button:focus-visible]` or per-button).
  6. `RailNoteList.test.ts:464-475` still passes (Loading first, then the empty node after the entries land).
  7. Help page quotes the new labels and the setup line.
- Gate: frontend only.

Grouping rationale: P117 (one resolver), P119 (one navigator) and P120 (one plugin section) share no component or state, so they stay three tickets; within each proposal everything touches the same files and tests and stays one ticket, except P119 counts (T3), which is optional, needs an owner decision and is the only part with a product question. P117 plus P119 must not run in parallel (same `lens.logic.ts`).

## Overlapping Issues

None of these must be replaced (no open-itens Issue targets the subtitle, the Files tree order or My people).

| Issue | Status | Overlap | Decision |
|---|---|---|---|
| `.scratch/open-itens/issues/094-non-utf-8-files-open-read-only.md` | ready-for-agent (ledger todo) | Reads the folder lens `'File'` label path (its line refs `lens.logic.ts:689-717`, `:621-631` are stale; now `:986-1009`, `fileKind`). Its fix is editor read-only behaviour, not the label | Depend (textual rebase on `lens.logic.ts`); not replaced |
| `.scratch/open-itens/issues/169-file-icons-read-frontmatter-only-through-rust.md` | ready-for-agent (todo) | Icon resolution used by `FilesNavigator` folder rows (T2 mutes the name next to that icon) and by `resolveNoteIcon` | Depend: sequence 169 before T2, or accept a trivial conflict; not replaced |
| `.scratch/open-itens/issues/214-hovering-open-note-keeps-fill-kanban-lane.md` | ready-for-agent (todo) | `NoteRow.svelte` hover class; T1 does not edit `NoteRow` | Exclude |
| `.scratch/open-itens/issues/163-vault-open-creates-every-missing-placeholder-template.md` | ready-for-agent (todo) | Adds `_system/templates/periodic-note/`, `quick-capture/` at vault open: changes what sits under `_system`, not its order or style | Exclude |
| `.scratch/open-itens/issues/131`, `137`, `141`, `142`, `136`, `132` | todo/needs-info | Same files (`lens.logic.ts`, `RailNoteList.svelte`), different behaviours (sections, rule line, filters) | Exclude; textual rebase only |
| `.scratch/open-itens/issues/154-inline-title.md` | ready-for-agent | `FilesNavigator.svelte` new-note focus | Exclude |
| `.scratch/vault-organization-v2/issues/02-my-people-counts-only-1on1s.md` | resolved | Changed `buildMyPeople`; its tests sit in the files T4 edits | Dependency already satisfied |
| `.scratch/tasks-view-ux/issues/113-keyboard-and-a11y.md`, `109-row-chips.md` | resolved | Focus ring convention (`NoteRow` ring tokens) and an overdue flag on chips | Precedent only; T4 reuses the ring tokens |
| `.scratch/tasks-view-ux/issues/116-sources-panel-and-excludes.md` | resolved | Treats `templates.folder` / `systemFolder` as the system sources | Precedent for T2's predicate |
| `.scratch/finders-ux/issues/03-search-result-cards-name-folder-plain-snippets.md` | resolved | Search card subtitle names the folder; different component | Exclude |
| `.scratch/finders-ux/issues/07-quick-switcher-rows-type-icon-folder-highlight.md` | resolved | Moved `KIND_ICONS` to `kind-icons.ts` | Satisfied; T1 relies on it |
| `.scratch/frontmatter-rules/issues/*` | resolved | `_system` and templates folder as write gates | Exclude |

Cross-cluster: the other note-list-rail clusters (nl-header-creation, nl-actions-keyboard, nl-empty-states) edit `RailNoteList.svelte`; none of T1, T2, T3 does. T4 only if hide is chosen.

## Owner questions (code cannot answer)

1. **What counts as a system folder (T2)?** The review says underscore-prefixed, but the default periodic notes folder is `_notes` and the people folders are `_people`, which are user content. Recommended: the configured `templates.systemFolder` (default `_system`) and `templates.folder`, not a name prefix. Do you also want an extra user-set list (for example a hidden-in-the-order list in settings)? Recommended: no new setting.
2. **My people with nobody tracked (T4): one muted "Set up 1:1 tracking" line that opens Settings > 1:1 Notes (the prototype), or hide the section and its header?** Hide removes the block entirely for people who never use 1:1s but touches the shared Today list and the registry, and drops discoverability. Recommended: the setup line (matches the prototype you reviewed, one component). Say hide if you do not use 1:1s and want the Today list clean.
3. **Custom order (T2):** should the system-last rule apply only to the vault root level, and should any `folder-order.json` entry or folder `_order` at that level switch it off entirely? Recommended: yes to both (the prototype's "custom order wins").
4. **Counts (T3):** do you want them at all, and for every folder or only when a Layout setting is on? And a direct file count (equals the list header) rather than recursive notes? Recommended: direct visible-file count on every folder row, no setting; skip the vault root. If unsure, leave T3 out of this batch.
5. **Non-markdown row second line (T1):** time only, with the kind label as fallback when the time is unknown (recommended), or time plus the kind word for a pdf or image so a user icon rule cannot hide the kind?

## Not checked

- No app run, no tests run (read-only). jsdom cannot show `:focus-visible` or layout, so the focus-ring and alignment criteria are class assertions.
- How often a custom file-icon rule replaces the kind icon of canvas/kanban rows (affects question 5).
- Whether any `fileTree` consumer other than the Files navigator depends on the scan folder order (relevant only if Option B for T2 is chosen).
- Whether nl-header-creation tickets (P33, P38, P84) edit `FilesNavigator.svelte`; their scouts own that call.
- The prototype icon keys (`alert`, `settings`, `chevr`) against its `ICONS` object were not checked.
