# file card src/lib/features/note-action-bar/note-action-bar.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-action-bar/note-action-bar.logic.ts ' codemap/files
file src/lib/features/note-action-bar/note-action-bar.logic.ts logic L121 module src/lib/features/note-action-bar in2 t2
## imports
imp src/lib/features/note-action-bar/note-action-bar.logic.ts:1 -> src/lib/utils/path.ts basename
imp src/lib/features/note-action-bar/note-action-bar.logic.ts:2 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing,parseFrontmatterProperties
imp src/lib/features/note-action-bar/note-action-bar.logic.ts:3 -> src/lib/features/properties/lifecycle.logic.ts getLifecycleState,isFavorite,isOrganized
## imported-by
imp src/lib/features/note-action-bar/NoteActionBar.svelte:37 -> src/lib/features/note-action-bar/note-action-bar.logic.ts HUB_ACTION_WIDTH,foldActions,getActionBarState,resolveHubAction,type:FoldableAction
imp src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:8 -> src/lib/features/note-action-bar/note-action-bar.logic.ts type:NoteHubAction
## reach
in2 src/lib/features/note-action-bar/note-action-bar.logic.ts 2 files in 2 modules: src/lib/app(1) src/lib/plugins/one-on-one(1)
out2 src/lib/features/note-action-bar/note-action-bar.logic.ts 2 files in 2 modules: src/lib/core/frontmatter(1) src/lib/utils(1)
## tests
test src/tests/lib/features/note-action-bar/note-action-bar.logic.test.ts imports src/lib/features/note-action-bar/note-action-bar.logic.ts mirror
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/note-action-bar/note-action-bar.logic.ts
test src/tests/lib/features/note-action-bar/note-action-bar-actions.store.test.ts imports-type src/lib/features/note-action-bar/note-action-bar.logic.ts
## symbols
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:6 interface ActionBarState L14 | What the note action bar shows for one note.
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:27 fn getActionBarState(path: string, content: string): ActionBarState L14 | Reads the action bar's state from a note's own content (never the Properties panel's store, which is empty while the right sidebar is hidden).
by src/lib/features/note-action-bar/note-action-bar.logic.ts:getActionBarState <- src/lib/features/note-action-bar/NoteActionBar.svelte:56 in bar=$derived call
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:43 interface NoteHubAction L10 | A note-creating action a plugin registers into the bar for notes of one type.
by src/lib/features/note-action-bar/note-action-bar.logic.ts:NoteHubAction <- src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:8 in (module) import
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:55 type HubAction L1 | The note-creating button the bar shows: a registered action, or the bar's own New linked note.
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:65 fn resolveHubAction(typeName: string | null, isHub: boolean, registered: readonly NoteHubAction[]): HubAction | null L10 | Picks the bar's note-creating button for a note: an action registered for its type wins (Person gets New 1:1, hub or not); otherwise a hub type gets New linked…
by src/lib/features/note-action-bar/note-action-bar.logic.ts:resolveHubAction <- src/lib/features/note-action-bar/NoteActionBar.svelte:67 in hubButton=$derived call
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:77 type FoldableAction L1 | A bar action that moves into More when the bar runs out of width.
by src/lib/features/note-action-bar/note-action-bar.logic.ts:FoldableAction <- src/lib/features/note-action-bar/NoteActionBar.svelte:37 in (script) import
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:84 const FOLDABLE_ACTIONS: readonly FoldableAction[] L1 | The foldable actions in the order the bar shows them.
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:87 const FOLD_ORDER: readonly FoldableAction[] L1 | The order the foldable actions move into More, first to fold first: the rightmost go first.
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:90 const ACTION_SLOT_WIDTH L1 | Width one icon button takes in the bar (28 px button + 4 px gap).
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:98 const BAR_RESERVED_WIDTH L1 | Width the bar keeps before any foldable action comes back inline.
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:105 const HUB_ACTION_WIDTH L1 | Width the New 1:1 / New linked note button takes from the foldable actions when it shows (label, icon, padding and margin).
by src/lib/features/note-action-bar/note-action-bar.logic.ts:HUB_ACTION_WIDTH <- src/lib/features/note-action-bar/NoteActionBar.svelte:79 in fold=$derived ref
sym src/lib/features/note-action-bar/note-action-bar.logic.ts:112 fn foldActions(barWidth: number): { inline: FoldableAction[]; folded: FoldableAction[] } L10 | Splits the foldable actions between the bar and the More menu for a bar of `barWidth` px.
by src/lib/features/note-action-bar/note-action-bar.logic.ts:foldActions <- src/lib/features/note-action-bar/NoteActionBar.svelte:79 in fold=$derived call
## calls
call src/lib/features/note-action-bar/note-action-bar.logic.ts:28 in getActionBarState -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/note-action-bar/note-action-bar.logic.ts:31 in getActionBarState -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call
call src/lib/features/note-action-bar/note-action-bar.logic.ts:35 in getActionBarState -> src/lib/utils/path.ts:basename call
call src/lib/features/note-action-bar/note-action-bar.logic.ts:36 in getActionBarState -> src/lib/features/properties/lifecycle.logic.ts:isFavorite call
call src/lib/features/note-action-bar/note-action-bar.logic.ts:37 in getActionBarState -> src/lib/features/properties/lifecycle.logic.ts:isOrganized call
call src/lib/features/note-action-bar/note-action-bar.logic.ts:38 in getActionBarState -> src/lib/features/properties/lifecycle.logic.ts:getLifecycleState call
