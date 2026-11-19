# 24: Clickable breadcrumb with type and folder crumbs and no .md, plus Reveal in note list

**Origin:** design review 2026-11-17, proposal P102, prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (section `#P102`), research `.scratch/shell-sidebars-ux/research/verdict-sh-history-breadcrumb.md` (tickets A and B) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old tickets 20, 33). Replaces the breadcrumb half of `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` (the tab label half is ticket 22, the overflow half ticket 21).

**What to build:** build the crumbs first, then Reveal on the same service.

1. **Breadcrumb shape.** The note action bar reads `Type › Folder › Folder › Name`, with the name without `.md` (`stem(path)`, `utils/path.ts:79`; `v1.2 notes.md` reads "v1.2 notes"). A vault-root note, or a tab outside the vault, shows no folder crumbs (`vaultRelativeKey`, `utils/path.ts:120-123`, is null outside the vault; `relativePath` would return the whole disk path).
2. **Crumb targets.** Clicking the type crumb opens the Types lens on that type. Clicking a folder crumb opens the Files lens on that folder, shows the panels and expands its ancestors in the navigator. An untyped note's "Note" crumb opens the Untyped lens when that row is enabled (`settingsStore.showUntypedNotes`). A crumb whose target cannot show (a type with `_visible: false`, Untyped off, its rail item in `layout.railHidden`) is plain text, because `restoreRailItem` would otherwise show Today and the click would look dead. Crumbs are buttons with a `title` and accessible names ("Show all Project notes", "Show Areas/Health in Files"); the name is a `span` with `truncate`.
3. **Long paths.** Keep the first and last folder and fold the middle into one ellipsis with a tooltip (at most two folder crumbs shown).
4. **Reveal in note list.** A More menu item (above Copy deeplink, not foldable) and a palette command (category Navigation, listed only with an active markdown note) open the Files lens on the note's folder (vault root for a root note), show the panels, expand the ancestors, clear a list search that would hide the note, scroll the row to the middle and flash it for about 1.5 s. Archived notes are revealed too (the Files lens lists them). With Files hidden in the rail it toasts and changes nothing; a note the lens does not list toasts "Not shown in the note list".

Code:

- `note-action-bar.logic.ts`: `getActionBarState(path, content, vaultPath)` (`:27`, called at `NoteActionBar.svelte:56`) adds `name` and `folders: { label, path }[]`; pure `collapseFolderCrumbs(folders, max = 2)`. The type crumb asks `getTypeMetadataFallback(typeName, typeDefinitionsStore.typeMetadataMap).visible` (`features/type-definitions/type-definitions.logic.ts:264`, O(1); the bar re-derives on every keystroke, so no walk of `typeNavigatorRows`).
- New `features/rail-shell/lens-open.service.ts`: `openTypeLens`, `openUntypedLens`, `openFolderLens` and `revealInNoteList(path)` (one service for crumbs and Reveal; `revealInNoteList` is `openFolderLens` plus the request below). It is not in `app/`: `layer-rules.test.ts:166-183` forbids files outside `app/` from importing `#lib/app/`, and `note-action-bar -> rail-shell` is already a recorded pair (`feature-cycle-baseline.json:14`). Pure `withExpandedAncestors` goes in `lens.logic.ts`.
- A getter-based reveal store `{ path, nonce } | null` in `features/rail-shell/`. `RailNoteList.svelte`: `bind:this` on the flat `VList` (`:881`; the Files lens is flat, only Today and Neighbourhood resolve groups), and an `$effect` with `untrack` that consumes the request once `notes` holds the path. `NoteRow.svelte` gets a `flash` prop (`data-note-row-flash`), never a store read (`note-list -> rail-shell` would close a feature cycle).
- `NoteActionBar.svelte:126-132` (the breadcrumb `div`; spacing utilities only inside it, never on the `.pane-toolbar` row), `:201` (Copy deeplink), `app/commands.ts` (palette entry). `foldActions` and `BAR_RESERVED_WIDTH = 960` (`note-action-bar.logic.ts:98`) do not change.
- Help `help/documentation/03-editor.md` (Note Action Bar, `:34-36`).

Not in this ticket: a Neighbourhood, Escape or organized-label item (dropped by the review), a link-window or other new lens, the tab label `.md` (ticket 22), and any "Reveal" that targets a lens other than Files.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/note-action-bar.spec.ts` and `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts`

- [ ] Failing test first, `src/tests/lib/features/note-action-bar/note-action-bar.logic.test.ts`: `getActionBarState('/v/Areas/Health/Sleep.md', '', '/v')` gives name "Sleep" and folders Areas (`/v/Areas`) and Health (`/v/Areas/Health`); `/v/Root.md` and `/elsewhere/x.md` give none; `v1.2 notes.md` gives "v1.2 notes"; `collapseFolderCrumbs` keeps 1 and 2 folders and folds 4 to first, ellipsis, last.
- [ ] Failing test first, new `lens-open.service.test.ts` (real `settingsStore`): `openFolderLens('/v/Areas/Health')` with panels hidden and `railExpandedFolders: ['/v/Other']` gives `railItem: 'files'`, that `railFolder`, `railPanelsVisible: true` and the ancestors added without duplicates; `openTypeLens('Project')` gives the Types pick; `revealInNoteList('/v/Areas/Health/Sleep.md')` with panels hidden sets the Files lens, folder, ancestors and panels; a root note sets `railFolder: null`; with `railHidden: ['files']` the layout is unchanged and a toast shows.
- [ ] Failing test first, `NoteActionBar.test.ts` (real stores): clicking "Project" and "Areas" changes `settingsStore.layout` as above. A `_visible: false` type, an untyped note with `showUntypedNotes` off, and a crumb whose rail item is hidden are plain text; with `showUntypedNotes` on, "Note" opens `UNTYPED_LENS`.
- [ ] Failing test first, `RailNoteList.test.ts` (virtua shims, real stores): a 100-note Files lens with the target off screen; a reveal request mounts the row with `data-note-row-flash`, cleared after the timer (fake timers). Same folder already picked with a list search that hides the target: the reveal clears the query and the row flashes. An archived note is revealed.
- [ ] `NoteActionBar.test.ts`: the More menu shows "Reveal in note list" above Copy deeplink; `commands.test.ts`: the palette entry exists with an active markdown note and not without (count pin changes on purpose). `foldActions` tests unchanged; `feature-cycle` and `layer-rules` green.
- [ ] The name reads "Launch plan" (`NoteActionBar.test.ts:175` and `note-action-bar.logic.test.ts:22,40` change on purpose); `e2e/specs/note-action-bar.spec.ts:36` expects `Welcome`; new E2E steps click a folder crumb and see the Files lens on that folder, and reveal a note in a nested folder (`rail-shell.spec.ts`).
- [ ] `src/tests/lib/pane-toolbar.test.ts` stays green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P102.** Nothing in the open note leads back to where it lives. The breadcrumb is static text ("Project > file.md") and there is no "Reveal in note list". Make the breadcrumb clickable: the type opens the Types lens, a folder opens the Files lens, and the name drops ".md". Add "Reveal in note list" to the overflow menu and the palette, scrolling to and highlighting the row. (Review validation: revise, dropped the Neighbourhood, Escape and organized-label items.)
- **153 (absorbed, breadcrumb half).** Hide the `.md` extension in tab labels and the breadcrumb (other extensions stay). The tab label is ticket 22.

## Problem

The bar shows `Project > file.md` as two plain spans: the type is not a link, there is no folder at all, and the extension is noise. To find the note in the list the user has to guess a lens, then scroll. The only reveal is "Reveal in Finder".

## Evidence

Checked at `ab143a411`.

- `src/lib/features/note-action-bar/NoteActionBar.svelte:126-132` (two spans, `data-testid="note-action-bar-type"` and `-file`), `:99-103` (Reveal in Finder), `:201` (Copy deeplink), `:56` (`getActionBarState` re-derived from the tab content).
- `src/lib/features/note-action-bar/note-action-bar.logic.ts:27-37`: `fileName: basename(path)` keeps `.md`; no folder segments and no vault path in the signature.
- `src/lib/features/rail-shell/RailNoteList.svelte:816` and `:881`: no `bind:this` on either `VList`, no `scrollToIndex` call anywhere. virtua 0.54.2 exports `scrollToIndex` from `node_modules/virtua/lib/svelte/VList.svelte:48-51`.
- `src/lib/features/rail-shell/RailNoteList.svelte:511-514`: `closeSearch`, run only on a list identity change, so a same-folder reveal must clear a hiding query itself. The Files lens has no property or archived filter, so the search is the only state to clear.
- `src/lib/features/rail-shell/lens.logic.ts:100` (`UNTYPED_LENS`), `:127,130` (`TYPES_RAIL_ITEM`, `FILES_RAIL_ITEM`). `src/lib/core/settings/settings.types.ts:61,66,71` (`railTypesLens`, `railFolder`, `railExpandedFolders`), `:442` (`showUntypedNotes`).
- `src/lib/features/rail-shell/rail-items.logic.ts:108`: `parseRailHidden`.

## Sequence with

- `NoteActionBar.svelte`: 15 (the More menu group below Copy deeplink), 32 (Back and Forward at the start of the bar).
- `RailNoteList.svelte`: 12, 16, 17, 19 (the same flat `VList`: whichever lands second reuses the ref), 20, 34 (band class `:699`).
- `NoteRow.svelte`: 15, 19, 31 (flash prop here, click there).
- `lens.logic.ts`: 14 (`toLensNote` and the folder-lens rows) and 15 (`organized` and `archived` on `toLensNote`); different functions, so a rebase only.
- `commands.ts` and the count pin `commands.test.ts:151`: 01, 08, 15, 20, 28, 29, 32. `help/documentation/03-editor.md`: 15, 21, 22, 23, 25, 26, 27, 31, 32, 33.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket split; `.md` is hidden in tab labels (old question 44.1, built in ticket 22), and this ticket applies the same rule to the breadcrumb. Defaults (not individually answered): 24.1 (old 20.1) the untyped "Note" crumb opens the Untyped lens when it is enabled; 24.2 (old 20.2) crumb order stays `Type › folders › name` as in the prototype, though it can read as if the folders sit inside the type; 24.3 (old 20.3) fold the middle folders by count, showing at most two; 24.4 (old 33.1) Reveal always targets the Files lens at the note's folder.
- 2026-11-18, from ux-quick-wins 34 review 1: 34 landed first on `src/lib/features/collection/toolbar/FilterPanel.svelte`. It added an `embedded` prop (embedded mode shows only the rows) and moved `addFilter` into `filter.logic.ts` as a pure `addFilter(groups, availableProperties, propertyIndex)`. Rebase onto both; do not reintroduce a component-local `addFilter`.
