# file card src/lib/core/frontmatter/yaml-quoting.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/frontmatter/yaml-quoting.logic.ts ' codemap/files
file src/lib/core/frontmatter/yaml-quoting.logic.ts logic L178 module src/lib/core/frontmatter in1 t1 | YAML scalar quoting predicate matching yaml@2.9.1 behavior for the options Kokobrain uses ({ lineWidth: 0, flowCollectionPadding: false }).
## imported-by
imp src/lib/features/todoist-sync/pull.logic.ts:10 -> src/lib/core/frontmatter/yaml-quoting.logic.ts canonicalizeScalar
## reach
in2 src/lib/core/frontmatter/yaml-quoting.logic.ts 11 files in 1 modules: src/lib/features/todoist-sync(11)
out2 src/lib/core/frontmatter/yaml-quoting.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/frontmatter/yaml-quoting.logic.test.ts imports src/lib/core/frontmatter/yaml-quoting.logic.ts mirror
## symbols
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:23 const RESERVED_LITERALS: ReadonlySet<string> L12 | YAML 1.2 core-schema reserved literals that must always be quoted when written as a string scalar to avoid being re-parsed as boolean / null.
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:40 const MUST_QUOTE_LEADING_CHARS: ReadonlySet<string> L18 | Leading characters that force quoting when they appear at index 0 of a scalar.
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:64 const SCALAR_MUST_QUOTE_SUBSTRINGS: readonly string[] L6 | Substrings that, when present anywhere in the scalar, force quoting in mapping-value context.
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:78 const FLOW_ITEM_MUST_QUOTE_SUBSTRINGS: readonly string[] L1 | Additional substrings that quote inside a flow-sequence item.
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:107 type ScalarContext L1 | The two contexts in which a YAML scalar can appear in our frontmatter: - `mapping-value`: the right side of `key: …` at top level. - `flow-item`: an element in…
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:116 fn shouldQuoteScalar(value: string, context: ScalarContext = 'mapping-value'): boolean L41 | Returns true when the given string scalar must be double-quoted to round-trip through yaml@2.9.1 with our options.
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:174 fn canonicalizeScalar(value: string, context: ScalarContext = 'mapping-value'): string L5 | Returns the canonical emission for a string scalar — either the bare value or its double-quoted form.
by src/lib/core/frontmatter/yaml-quoting.logic.ts:canonicalizeScalar <- src/lib/features/todoist-sync/pull.logic.ts:607 in projectTargets call
## calls
call src/lib/core/frontmatter/yaml-quoting.logic.ts:175 in canonicalizeScalar -> src/lib/core/frontmatter/yaml-quoting.logic.ts:shouldQuoteScalar call
