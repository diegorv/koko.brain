# file card src/lib/core/settings/sentry.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sentry.logic.ts ' codemap/files
file src/lib/core/settings/sentry.logic.ts logic L28 module src/lib/core/settings in1 t1
## imported-by
imp src/lib/core/settings/sentry.service.ts:4 -> src/lib/core/settings/sentry.logic.ts isValidSentryDsn
## reach
in2 src/lib/core/settings/sentry.logic.ts 3 files in 3 modules: src/lib/app(1) src/lib/core/settings(1) src/lib/utils(1)
out2 src/lib/core/settings/sentry.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/sentry.logic.test.ts imports src/lib/core/settings/sentry.logic.ts mirror
## symbols
sym src/lib/core/settings/sentry.logic.ts:13 fn isValidSentryDsn(value: string): boolean L16 | Returns whether `value` is a Sentry Cloud project DSN that the app can send to under its content-security policy.
by src/lib/core/settings/sentry.logic.ts:isValidSentryDsn <- src/lib/core/settings/sentry.service.ts:41 in applySentryConfiguration call
