# file card src/lib/core/note-creator/explicit-organization.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/note-creator/explicit-organization.logic.ts ' codemap/files
file src/lib/core/note-creator/explicit-organization.logic.ts logic L45 module src/lib/core/note-creator in12 t1
## imported-by
imp src/lib/app/commands.ts:13 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/app/deep-link-actions.ts:11 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/app/editor-host.ts:22 -> src/lib/core/note-creator/explicit-organization.logic.ts withUnorganizedFlag
imp src/lib/features/deep-link/deep-link.service.ts:10 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization,withUnorganizedFlag
imp src/lib/features/note-action-bar/note-action-bar.service.ts:10 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:9 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/rail-shell/FilesNavigator.svelte:42 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/rail-shell/new-note.service.ts:5 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/type-definitions/type-definitions.service.ts:11 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization,withUnorganizedFlag
imp src/lib/plugins/one-on-one/one-on-one.service.ts:7 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/plugins/quick-capture/note-composer.service.ts:5 -> src/lib/core/note-creator/explicit-organization.logic.ts withUnorganizedFlag
imp src/lib/plugins/templates/templates.service.ts:6 -> src/lib/core/note-creator/explicit-organization.logic.ts withUnorganizedFlag
## reach
in2 src/lib/core/note-creator/explicit-organization.logic.ts 20 files in 11 modules: src/lib/app(7) src/lib/features/event-calendar(2) src/lib/features/rail-shell(2) src/lib/plugins/one-on-one(2) src/lib/features/note-action-bar(1) +6 modules: q impact src/lib/core/note-creator/explicit-organization.logic.ts --depth 2
out2 src/lib/core/note-creator/explicit-organization.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/note-creator/explicit-organization.logic.test.ts imports src/lib/core/note-creator/explicit-organization.logic.ts mirror
## symbols
sym src/lib/core/note-creator/explicit-organization.logic.ts:29 fn withUnorganizedFlag(content: string): string L9 | Returns `content` with `_organized: false` in its frontmatter, unless a top-level `_organized:` / `organized:` line is already there (whatever its value).
by src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag <- src/lib/app/editor-host.ts:164 in appEditorHost.createNote ref
by src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag <- src/lib/features/deep-link/deep-link.service.ts:344 in executeNewAction ref
by src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag <- src/lib/features/type-definitions/type-definitions.service.ts:93 in createNoteOfType ref
by src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag <- src/lib/plugins/quick-capture/note-composer.service.ts:52 in createNoteComposer ref
by src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag <- src/lib/plugins/templates/templates.service.ts:67 in createFileFromTemplate ref
sym src/lib/core/note-creator/explicit-organization.logic.ts:43 fn applyExplicitOrganization(content: string, enabled: boolean): string L3 | The switch: withUnorganizedFlag of `content` when `enabled` (`settingsStore.explicitOrganization`), `content` unchanged otherwise.
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/app/commands.ts:155 in getBuiltInCommands call
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/app/deep-link-actions.ts:210 in executeCaptureAction call
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/features/deep-link/deep-link.service.ts:334 in executeNewAction call
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/features/note-action-bar/note-action-bar.service.ts:79 in createLinkedNote call
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/features/quick-switcher/QuickSwitcher.svelte:50 in createAndOpenNote call
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/features/rail-shell/FilesNavigator.svelte:86 in fileCreators=$derived call
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/features/rail-shell/new-note.service.ts:37 in createNoteHere call
by src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization <- src/lib/features/type-definitions/type-definitions.service.ts:148 in createTypedNote call
more by 1 not shown: src/lib/plugins/one-on-one(1): q importers src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization
## calls
call src/lib/core/note-creator/explicit-organization.logic.ts:44 in applyExplicitOrganization -> src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag call
