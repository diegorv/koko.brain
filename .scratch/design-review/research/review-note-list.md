# Design review: Note list and files navigator

Scope: src/lib/features/note-list, file-icons, rail-shell (Files navigator, Types navigator, list toolbar). Screens: files-note-list, landing-today, rail-types, rail-inbox, rail-favorites, note-row-context-menu, narrow-1024x700-today, landing-default-pane-sizes (all light).

## Clear

1. List header drops the Daily-note and "+" buttons at narrow widths (RailNoteList.svelte:716-820; AppShell.svelte:238-250 minSize 3). Every header button is shrink-0 in an overflow-hidden pane; narrow-1024x700-today-light.png shows only sort, search and properties. Proposal: fold Sort, Properties and Archive into one "Display" popover (same pattern as the Tasks view), keep Search, Filter and "+" visible, move the rest into an overflow menu when the pane is narrow.
2. Creating a folder, canvas or table is only reachable by right-click (FilesNavigator.svelte:304-310 header has only the title; menu at :346-403). Proposal: a "+" menu in the Files header (New note, Canvas, table, folder) that acts on the picked folder, same shape as Types' "New type".
3. No keyboard navigation or semantics in the Files tree, Types list or note list (FilesNavigator.svelte:340; RailNoteList.svelte:834, 899; no role=tree/listbox). Every row is its own Tab stop, so a long list is a long Tab trail. Proposal: roving tabindex, Up/Down, Left/Right collapse/expand, Enter opens, existing F2 rename, proper roles.
4. Header triggers lack focus rings and a name: Sort (RailSortMenu.svelte:106-109), Properties (RailPropertiesPicker.svelte:105-108), Filter (RailNoteList.svelte:774-778, title only); the same class string is pasted 7 times. Proposal: one shared HeaderIconButton with ring, aria-label and a real tooltip with shortcut.
5. Inbox triage needs a note opened per item. Organized/Archive toggles exist only for the active note (NoteActionBar.svelte:30-32), and the row menu (NoteRowMenu.svelte:221-287; note-row-context-menu-light.png) has no Mark organized, Archive or Move to. Proposal: add those three to the menu, plus an inline "organized" check on Inbox rows.

## Moderate

6. Active filters are color-only (RailNoteList.svelte:774-777; same for archive filter, RailArchivedMenu.svelte:34-37). A hidden filter silently shortens the list. Proposal: count badge on Filter, "Archived: shown" marker, and a one-click clear in the rule line.
7. Row second line differs per lens. Types shows "just now · Projects" plus type chip; Files shows only "Note"/"View"/"Canvas" and non-markdown files never show a modified time (lens.logic.ts:924-933, 958-975); the folder name repeats on every row of a list already titled by that folder (:258-260). Proposal: always time first; folder only for cross-folder lists; kind via icon only.
8. Empty states are bare and inconsistent (RailNoteList.svelte:851, 892, 896; rail-favorites-light.png): "Nothing here", "No notes here", "No matching notes". Loading is plain text (:862). Proposal: per-lens copy with next action (Favorites: how to star; Inbox: "All organized"; empty folder: New note button), skeleton rows for loading.
9. The rule line reads as a query (RailNoteList.svelte:826-829; lens.logic.ts:307-312; "_type == 'Project', not archived" in rail-types-light.png), at raw 11px. Proposal: plain-language caption or hide for built-in lenses; show view filters as chips.
10. Today "My people" empty state is raw text with an underscored property (MyPeopleSection.svelte:37; landing-today-light.png) and wraps one word per line when narrow (narrow-1024x700-today-light.png). Proposal: formatted code chip, shorter copy, hide when the feature has no people.
11. Fresh vault opens with a 40px note list: defaults noteListSize/navigatorSize 3 (settings.store.svelte.ts:70-74) and minSize 3 (AppShell.svelte:207-212, 238-243); landing-default-pane-sizes-light.png. The comment says this is deliberate, but a drag can park a pane at an unusable sliver with no way to see that it is collapsed. Proposal: min width in px (about 160), drag below it collapses the pane and the rail toggle restores it; default 18%.
12. Italic title means "unorganized" with no legend (lens.logic.ts:291; NoteRow.svelte:89; rail-types-light.png where one Active row is italic). Proposal: small dot or "Inbox" chip instead, italics only in the Inbox lens.
13. Wikilink pills are role=link, tabindex -1 inside a row button (NoteRow.svelte:67, 113-116): invalid nesting, unreachable by keyboard. Proposal: pill buttons outside the row button, or open the first link via a row action.
14. Files tree lists "_system" and "_templates" like user folders and shows no counts (files-note-list-light.png; lens.logic.ts:937-940 hides only dot-names). Proposal: dim underscore folders and sort them last, optional file count.
15. Header icons are ambiguous: sort collapses to a bare arrow below 16.5rem (RailSortMenu.svelte:119-125), Properties (sliders) sits beside Filter, and the Archive icon is the rail's Archive item icon but means "filter". Native title only. Proposal: tooltips that state the current value ("Sort: Modified, newest"), distinct icons.
16. Same `.view` file is "New table" in Files (FilesNavigator.svelte:89) and "New view" next to it (:357); "New Canvas" vs "New table" capitalization. Proposal: one entry named "New view", consistent casing.

## Polish

17. IconPicker color swatches have only title, no aria-label or focus ring (IconPicker.svelte:260-308); custom color input is invisible with no focus indication.
18. text-[11px] bypasses the text-label token (NoteRow.svelte:93, 103, 114, 124; RailNoteList.svelte:827); header dividers are inline box-shadow in four places; note rows use primary tokens while navigator rows use file-explorer-primary.
19. No prefers-reduced-motion handling for spin/pulse/transition-transform (RailListSearch.svelte:103; Rail.svelte:377; FilesNavigator.svelte:463).

Not checked: runtime behavior (screenshots are from a mocked harness: all mtimes "just now"), hover and drag states, dark-mode contrast.
