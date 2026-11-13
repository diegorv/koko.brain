# file card src/lib/core/frontmatter/properties.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/frontmatter/properties.types.ts ' codemap/files
file src/lib/core/frontmatter/properties.types.ts types L12 module src/lib/core/frontmatter in18 t0
## imported-by
imp src/lib/core/frontmatter/frontmatter-write.service.ts:16 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/core/frontmatter/properties.logic.ts:17 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:12 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:9 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/auto-organize/auto-organize.logic.ts:2 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
imp src/lib/features/collection/toolbar/filter.logic.ts:5 -> src/lib/core/frontmatter/properties.types.ts type:PropertyType
imp src/lib/features/collection/toolbar/sort.logic.ts:2 -> src/lib/core/frontmatter/properties.types.ts type:PropertyType
imp src/lib/features/deep-link/deep-link.logic.ts:6 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:14 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/file-icons/frontmatter-icon.service.ts:14 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/properties/PropertiesView.svelte:23 -> src/lib/core/frontmatter/properties.types.ts type:PropertyType
imp src/lib/features/properties/PropertyField.svelte:11 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
imp src/lib/features/properties/lifecycle.logic.ts:1 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/properties/lifecycle.service.ts:10 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/properties/properties.service.ts:17 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
imp src/lib/features/properties/properties.store.svelte.ts:1 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/rail-shell/list-prefs.service.ts:3 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/todoist-sync/sync-now.service.ts:23 -> src/lib/core/frontmatter/properties.types.ts type:Property
## reach
in2 src/lib/core/frontmatter/properties.types.ts 53 files in 17 modules: src/lib/features/event-calendar(10) src/lib/core/markdown-editor(8) src/lib/app(5) src/lib/features/collection(5) src/lib/features/auto-organize(4) +12 modules: q impact src/lib/core/frontmatter/properties.types.ts --depth 2
out2 src/lib/core/frontmatter/properties.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
test src/tests/lib/features/auto-organize/auto-organize.logic.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
test src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
test src/tests/lib/features/properties/PropertyField.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
test src/tests/lib/features/properties/frontmatter-parity.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
test src/tests/lib/features/properties/lifecycle.logic.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
test src/tests/lib/features/rail-shell/list-prefs.service.test.ts imports-type src/lib/core/frontmatter/properties.types.ts
## symbols
sym src/lib/core/frontmatter/properties.types.ts:2 type PropertyType L1 | Supported property value types for auto-detection
by src/lib/core/frontmatter/properties.types.ts:PropertyType <- src/lib/core/frontmatter/properties.logic.ts:17 in (module) import
by src/lib/core/frontmatter/properties.types.ts:PropertyType <- src/lib/features/auto-organize/auto-organize.logic.ts:2 in (module) import
by src/lib/core/frontmatter/properties.types.ts:PropertyType <- src/lib/features/collection/toolbar/filter.logic.ts:5 in (module) import
by src/lib/core/frontmatter/properties.types.ts:PropertyType <- src/lib/features/collection/toolbar/sort.logic.ts:2 in (module) import
by src/lib/core/frontmatter/properties.types.ts:PropertyType <- src/lib/features/properties/PropertiesView.svelte:23 in (script) import
by src/lib/core/frontmatter/properties.types.ts:PropertyType <- src/lib/features/properties/PropertyField.svelte:11 in (script) import
by src/lib/core/frontmatter/properties.types.ts:PropertyType <- src/lib/features/properties/properties.service.ts:17 in (module) import
sym src/lib/core/frontmatter/properties.types.ts:5 interface Property L8 | A single frontmatter property with its detected type
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/core/frontmatter/frontmatter-write.service.ts:16 in (module) import
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/core/frontmatter/properties.logic.ts:17 in (module) import
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:12 in (module) import
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:9 in (module) import
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/features/auto-organize/auto-organize.logic.ts:2 in (module) import
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/features/deep-link/deep-link.logic.ts:6 in (module) import
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/features/event-calendar/event-calendar-event.logic.ts:14 in (module) import
by src/lib/core/frontmatter/properties.types.ts:Property <- src/lib/features/file-icons/frontmatter-icon.service.ts:14 in (module) import
more by 7 not shown: src/lib/features/properties(5) src/lib/features/rail-shell(1) src/lib/features/todoist-sync(1): q importers src/lib/core/frontmatter/properties.types.ts:Property
