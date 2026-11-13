# file card src/lib/utils/frontmatter-aliases.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/frontmatter-aliases.ts ' codemap/files
file src/lib/utils/frontmatter-aliases.ts other L31 module src/lib/utils in5 t6
## imported-by
imp src/lib/core/frontmatter/properties.logic.ts:16 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:20 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:19 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/features/auto-organize/auto-organize.logic.ts:22 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/features/properties/properties.service.ts:18 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
## reach
in2 src/lib/utils/frontmatter-aliases.ts 33 files in 16 modules: src/lib/core/markdown-editor(8) src/lib/features/auto-organize(3) src/lib/features/event-calendar(3) src/lib/app(2) src/lib/features/file-icons(2) +11 modules: q impact src/lib/utils/frontmatter-aliases.ts --depth 2
out2 src/lib/utils/frontmatter-aliases.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/frontmatter-aliases.test.ts imports src/lib/utils/frontmatter-aliases.ts mirror
test src/tests/fixtures/event-notes.fixture.ts imports src/lib/utils/frontmatter-aliases.ts
test src/tests/help/type-definitions-views.test.ts imports src/lib/utils/frontmatter-aliases.ts
test src/tests/lib/core/frontmatter/properties.logic.test.ts imports src/lib/utils/frontmatter-aliases.ts
test src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts imports src/lib/utils/frontmatter-aliases.ts
test src/tests/lib/features/properties/frontmatter-parity.test.ts imports src/lib/utils/frontmatter-aliases.ts
## symbols
sym src/lib/utils/frontmatter-aliases.ts:29 fn canonicalizeKey(key: string): string L3 | Returns the canonical key name if the input matches a known alias, otherwise returns the input unchanged.
by src/lib/utils/frontmatter-aliases.ts:canonicalizeKey <- src/lib/core/frontmatter/properties.logic.ts:297 in computeAndCache call +6
by src/lib/utils/frontmatter-aliases.ts:canonicalizeKey <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:748 in boundValue call +1
by src/lib/utils/frontmatter-aliases.ts:canonicalizeKey <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:198 in setColor call +2
by src/lib/utils/frontmatter-aliases.ts:canonicalizeKey <- src/lib/features/auto-organize/auto-organize.logic.ts:183 in isRefusedKey call +11
by src/lib/utils/frontmatter-aliases.ts:canonicalizeKey <- src/lib/features/properties/properties.service.ts:116 in findCanonicalTwin call +5
