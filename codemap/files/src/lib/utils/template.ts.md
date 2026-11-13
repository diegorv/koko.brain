# file card src/lib/utils/template.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/template.ts ' codemap/files
file src/lib/utils/template.ts other L216 module src/lib/utils in2 t4
## imports
imp src/lib/utils/template.ts:2 -> src/lib/utils/date.ts formatDateWithOffset,formatNow,formatNowOnDate
## imported-by
imp src/lib/core/note-creator/note-creator.service.ts:10 -> src/lib/utils/template.ts processTemplate
imp src/lib/plugins/quick-capture/note-composer.logic.ts:5 -> src/lib/utils/template.ts processTemplate
## reach
in2 src/lib/utils/template.ts 10 files in 9 modules: src/lib/app(2) src/lib/features/auto-organize(1) src/lib/features/deep-link(1) src/lib/features/type-definitions(1) src/lib/plugins/mods(1) +4 modules: q impact src/lib/utils/template.ts --depth 2
out2 src/lib/utils/template.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/template.test.ts imports src/lib/utils/template.ts mirror
test src/tests/help/queryjs-contract.test.ts imports src/lib/utils/template.ts
test src/tests/help/templates-script-paths.test.ts imports src/lib/utils/template.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts mocks src/lib/utils/template.ts
## symbols
sym src/lib/utils/template.ts:22 fn processTemplate(template: string, fileTitle: string, customVariables?: Record<string, string>, contextDate?: Dayjs): string L10 | Processes a Templater-compatible template string.
by src/lib/utils/template.ts:processTemplate <- src/lib/core/note-creator/note-creator.service.ts:63 in loadNoteTemplate call
by src/lib/utils/template.ts:processTemplate <- src/lib/plugins/quick-capture/note-composer.logic.ts:124 in processCaptureTemplate call +1
sym src/lib/utils/template.ts:38 fn evaluateExpression(expr: string, fileTitle: string, customVariables?: Record<string, string>, contextDate?: Dayjs): string L9 | Evaluates a single Templater expression (the content between `<%` and `%>`).
## locals
local src/lib/utils/template.ts:52 fn evaluateDateNow(argsStr: string, fileTitle: string, contextDate?: Dayjs): string L69
local src/lib/utils/template.ts:123 fn stripQuotes(s: string): string L6
local src/lib/utils/template.ts:131 fn splitOnPlus(expr: string): string[] L55
local src/lib/utils/template.ts:188 fn evaluatePart(part: string, fileTitle: string, customVariables?: Record<string, string>, contextDate?: Dayjs): string L29
## calls
call src/lib/utils/template.ts:29 in processTemplate -> src/lib/utils/template.ts:evaluateExpression call
call src/lib/utils/template.ts:44 in evaluateExpression -> src/lib/utils/template.ts:splitOnPlus call
call src/lib/utils/template.ts:45 in evaluateExpression -> src/lib/utils/template.ts:evaluatePart call
call src/lib/utils/template.ts:105 in evaluateDateNow -> src/lib/utils/template.ts:stripQuotes call +1
call src/lib/utils/template.ts:114 in evaluateDateNow -> src/lib/utils/date.ts:formatNowOnDate call
call src/lib/utils/template.ts:115 in evaluateDateNow -> src/lib/utils/date.ts:formatNow call
call src/lib/utils/template.ts:119 in evaluateDateNow -> src/lib/utils/date.ts:formatDateWithOffset call
call src/lib/utils/template.ts:205 in evaluatePart -> src/lib/utils/template.ts:evaluateDateNow call
call src/lib/utils/template.ts:209 in evaluatePart -> src/lib/utils/template.ts:stripQuotes call
