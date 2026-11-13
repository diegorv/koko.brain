# file card src/lib/core/settings/sentry.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sentry.service.ts ' codemap/files
file src/lib/core/settings/sentry.service.ts service L134 module src/lib/core/settings in3 t6
## imports
imp src/lib/core/settings/sentry.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/sentry.service.ts:3 -> src/lib/core/settings/settings.types.ts type:SentrySettings
imp src/lib/core/settings/sentry.service.ts:4 -> src/lib/core/settings/sentry.logic.ts isValidSentryDsn
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:41 -> src/lib/core/settings/sentry.service.ts configureSentry,disableSentry
imp src/lib/core/settings/sections/SentrySection.svelte:5 -> src/lib/core/settings/sentry.service.ts configureSentry,sendSentryTestEvent
imp src/lib/utils/debug.ts:5 -> src/lib/core/settings/sentry.service.ts captureSentryException
## reach
in2 src/lib/core/settings/sentry.service.ts 73 files in 33 modules: src/lib/app(8) src/lib/features/todoist-sync(7) src/lib/core/settings(6) src/lib/core/filesystem(5) src/lib/features/rail-shell(4) +28 modules: q impact src/lib/core/settings/sentry.service.ts --depth 2
out2 src/lib/core/settings/sentry.service.ts 4 files in 2 modules: src/lib/contracts(2) src/lib/core/settings(2)
## tests
test src/tests/lib/core/settings/sentry.service.test.ts imports src/lib/core/settings/sentry.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/settings/sentry.service.ts
test src/tests/lib/core/settings/theme-catalog.service.test.ts mocks src/lib/core/settings/sentry.service.ts
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts mocks src/lib/core/settings/sentry.service.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts mocks src/lib/core/settings/sentry.service.ts
test src/tests/lib/utils/debug.test.ts mocks src/lib/core/settings/sentry.service.ts
## symbols
sym src/lib/core/settings/sentry.service.ts:7 type SentryConfigurationResult L1 | Result of applying a vault's Sentry settings to the runtime client.
sym src/lib/core/settings/sentry.service.ts:10 type SentryTestEventResult L1 | Result of enqueuing and flushing the synthetic event used to verify a DSN.
sym src/lib/core/settings/sentry.service.ts:94 fn configureSentry(settings: SentrySettings): Promise<SentryConfigurationResult> L6 | Enables or disables error monitoring for one vault.
by src/lib/core/settings/sentry.service.ts:configureSentry <- src/lib/app/lifecycle/app-lifecycle.service.ts:215 in initializeVault call
by src/lib/core/settings/sentry.service.ts:configureSentry <- src/lib/core/settings/sections/SentrySection.svelte:16 in updateSentry call
sym src/lib/core/settings/sentry.service.ts:102 fn disableSentry(): Promise<SentryConfigurationResult> L3 | Disables the active Sentry client without changing persisted settings.
by src/lib/core/settings/sentry.service.ts:disableSentry <- src/lib/app/lifecycle/app-lifecycle.service.ts:157 in initializeVault call +1
sym src/lib/core/settings/sentry.service.ts:107 fn isSentryActive(): boolean L3 | Returns whether this process currently has a Sentry client allowed to send error events.
sym src/lib/core/settings/sentry.service.ts:112 fn captureSentryException(tag: string, exception: unknown): void L7 | Captures a handled application error only when the current vault opted in to Sentry.
by src/lib/core/settings/sentry.service.ts:captureSentryException <- src/lib/utils/debug.ts:31 in error call
sym src/lib/core/settings/sentry.service.ts:124 fn sendSentryTestEvent(): Promise<SentryTestEventResult> L11 | Sends one known synthetic exception without vault context so a user can verify their DSN and alert configuration from Settings.
by src/lib/core/settings/sentry.service.ts:sendSentryTestEvent <- src/lib/core/settings/sections/SentrySection.svelte:30 in sendTestEvent call
## locals
local src/lib/core/settings/sentry.service.ts:19 fn sentryRelease(): string L4
local src/lib/core/settings/sentry.service.ts:28 fn removeSensitiveEventData(event: Sentry.ErrorEvent): Sentry.ErrorEvent L9
local src/lib/core/settings/sentry.service.ts:39 fn applySentryConfiguration(settings: SentrySettings): Promise<SentryConfigurationResult> L50
## calls
call src/lib/core/settings/sentry.service.ts:41 in applySentryConfiguration -> src/lib/core/settings/sentry.logic.ts:isValidSentryDsn call
call src/lib/core/settings/sentry.service.ts:50 in applySentryConfiguration -> src/lib/contracts/ipc.ts:call call
call src/lib/core/settings/sentry.service.ts:53 in applySentryConfiguration -> src/lib/core/settings/sentry.service.ts:sentryRelease call +1
call src/lib/core/settings/sentry.service.ts:84 in applySentryConfiguration -> src/lib/core/settings/sentry.service.ts:removeSensitiveEventData ref
call src/lib/core/settings/sentry.service.ts:96 in configureSentry -> src/lib/core/settings/sentry.service.ts:applySentryConfiguration call
call src/lib/core/settings/sentry.service.ts:103 in disableSentry -> src/lib/core/settings/sentry.service.ts:configureSentry call
## effects
ipc-call src/lib/core/settings/sentry.service.ts:50 in applySentryConfiguration -> ipc:configure_sentry -> src-tauri/src/commands/sentry.rs:7
