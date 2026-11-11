# Errors and Debugging

Every error message the mod host produces, where each kind of failure shows up, how `ctx.log` and the session log file behave, and a workflow for finding out why a mod misbehaves.

> [!NOTE]
> In the templates below, `<dir>` is `_system/mods/<folder>`, `<id>` is the manifest `id` (equal to the folder name), `<name>` is the manifest `name`, and `<message>` is the text of the thrown value: `err.message` for an `Error`, `String(err)` for anything else. Text outside angle brackets is verbatim.

## Where errors surface

| What failed | Labs row | Toast | Run view | Session log (`MOD:<id>`) | Devtools console | Sentry |
|-------------|----------|-------|----------|--------------------------|------------------|--------|
| Loading: `manifest.json`, `main.js`, top-level code, `onload` | **Error** with the message, and **Stack trace** when an `Error` was thrown | The message, once (see [dedupe](#load-errors-are-toasted-once)) | | The message only, no stack | With Debug mode: the message and the raw error object | No |
| An action's `run` throws or rejects (signal not aborted) | | `<name>: <title> failed: <message>` | **Failed** with the message and a **Details** stack, when the view is open | `<title> failed: <message>` plus the stack | With Debug mode | No |
| A rejection after **Stop** or unload | | | **Cancelled** | Nothing | Nothing | No |
| `onunload` throws or its promise rejects | | `_system/mods/<id>: onunload failed: <message>` | | `onunload failed: <message>` plus the stack | With Debug mode | No |
| A cleanup (from `ctx.register` or a disposer) throws | | `_system/mods/<id>: cleanup failed: <message>` | | `cleanup failed: <message>` plus the stack | With Debug mode | No |
| `ctx.watch` read throws | | | | `watch read failed: ...` | With Debug mode | No |
| `ctx.watch` callback throws or rejects | **Last callback error** with the message, and **Stack trace** when an `Error` was thrown | `<name>: watch callback failed: <message>`, once per load (see [below](#callback-errors-are-toasted-once-per-load)) | | `watch callback failed: ...` | With Debug mode | No |
| `ctx.theme.onChange` callback throws or rejects | **Last callback error**, as above | `<name>: theme.onChange callback failed: <message>`, once per load | | `theme.onChange callback failed: ...` | With Debug mode | No |
| `ctx.onNoteSaved` callback throws or rejects | **Last callback error**, as above | `<name>: onNoteSaved callback failed: <message>`, once per load | | `onNoteSaved callback failed: ...` | With Debug mode | No |
| A `ctx.vault`, `ctx.workspace`, `loadData` or `saveData` call rejects | (reaches your code) | | (if uncaught in an action: **Failed**) | `vault.<op> "<path>" failed: ...`, `workspace.openNote "<path>" failed: ...`, `loadData failed: ...`, `saveData failed: ...` | With Debug mode | No |
| A timer, DOM listener or un-awaited promise the mod started | | | | | Uncaught error | Can be |
| An app service reached through `ctx.app`, or the filesystem services behind `ctx.vault.rename`, `move`, `delete` | | The app's own toast, if any (for example `Failed to open file.`) | | Under the app's own tag, when the service logs | Usually (`console.error`) | Can be |
| The host itself (mods folder unreadable, a reload that failed) | | | | `ERROR:FRONT-END:MODS`, `ERROR:FRONT-END:LABS`, `ERROR:FRONT-END:LIFECYCLE` | Always | Can be |

- **Session log** lines are written only while **Settings → Troubleshooting → Save debug log to file** is on. **Devtools console** lines from the debug logger need **Debug mode** on, and a build where you can open devtools (see [Devtools and the console](#devtools-and-the-console)).
- **Sentry** receives anything only when the vault's settings enable Sentry with a valid DSN. "Can be" means the error reaches the app's global handlers or an app service that reports through Sentry. Every failure the mod host catches stays out of Sentry.
- **A quiet run** (started from the palette, a note or folder menu, or a command row, by an action without `input`) has no visible run view until it logs or shows progress. If it fails first, you get only the toast.
- **Rejections after Stop are dropped.** Once `run.signal` aborted, whatever the action throws, including a real bug, produces no toast, no log line and no run error. The run already ended **Cancelled**. See [Runs](03-runs.md#errors-after-stop-are-dropped).

### Load errors are toasted once

The host remembers the last load error toasted for each vault and folder, and does not toast the same message again. The Labs row is still updated every time. The memory is cleared only by a successful load of that folder or by deleting its `manifest.json`. It survives switching **Vault mods** off and on, switching the one mod off and on, and reopening the vault in the same app session. When a fix "did nothing", look at the Labs row, not for a toast. Unload, cleanup and action-failure toasts are never deduped.

### Callback errors are toasted once per load

A failing `ctx.onNoteSaved`, `ctx.watch` or `ctx.theme.onChange` callback toasts once per loaded instance of the mod: the first failure toasts, later ones of that instance do not. The Labs row of a loaded mod always shows the latest one, with the callback's name and the time, under **Last callback error**. A reload, switching the mod off and on, or reopening the vault loads a new instance, which clears the row and toasts again on its first failure. A rejection from the old instance that settles after the reload goes only to the session log. To show every failure, catch in the callback and call `ctx.notify`.

## Error message catalog

### Loading

A load error is the Labs row message and the toast text. Every one starts with `_system/mods/<folder>:`.

| Message | When |
|---------|------|
| `<dir>: cannot read manifest.json: <message>` | `manifest.json` is missing or unreadable. The file system error is often a bare string |
| `<dir>: manifest.json <tail>` | The manifest is invalid; `<tail>` is one row of the next table |
| `<dir>: cannot read main.js: <message>` | `main.js` is missing or unreadable |
| `<dir>: <message>` | Evaluating `main.js` threw: one of the loader messages below, a syntax error from the engine, or an error thrown by the top-level code. There is no phase word |
| `<dir>: onload failed: <message>` | `onload` threw or its promise rejected, including argument errors from `ctx` calls inside it, for example `_system/mods/dup: onload failed: Mod "dup": duplicate action id "x"` |

### Manifest

Checked in this order; the first failing check is the only one reported.

| `<tail>` | When |
|----------|------|
| `is not valid JSON` | `JSON.parse` fails |
| `must be a JSON object` | An array, `null` or a primitive |
| `id must be a string` | |
| `id must be at most 64 characters` | |
| `id "<id>" must be lowercase letters and digits, joined by single hyphens` | Also for `""`, uppercase, `_`, dots, or a leading, trailing or double hyphen |
| `id "<id>" does not match the folder name` | Exact, case-sensitive comparison |
| `name must be a non-empty string` | |
| `version must be a non-empty string` | |
| `description must be a string` | Present and not a string (`null` counts as present) |
| `author must be a string` | Same rule |
| `minAppVersion must look like 1.2.3` | Not three dot-separated numbers (`1.2.3-beta` fails). The value is never compared with the app version |
| `color must be an object with light and dark` | |
| `color.light must be a hex color like #d946ef` | Only `#rgb` or `#rrggbb`, any case |
| `color.dark must be a hex color like #d946ef` | Same rule |

### `main.js` evaluation

Prefixed with `<dir>: ` in Labs and in the toast.

| Message | When |
|---------|------|
| `main.js: found no "export default"; a mod default-exports an object with onload` | No line starts with `export`, whitespace, `default`, whitespace. An indented `export default`, `export default{` (no space), or `const m = {}; export default m;` on one line all land here |
| `main.js: found <N> "export default" lines; use exactly one` | More than one line starts that way. A line inside a template literal or a block comment counts too |
| `main.js: use exactly one "export default" and no "import"; a mod is one file` | The engine reported a syntax error that mentions `import` or `export`: an `import` statement, `import.meta`, `export const`, `export { }`, or a second `export default` that is not at the start of a line |
| `main.js: the default export must be an object with an onload function` | The default export is a function, a class, a primitive, `null`, or an object without a function `onload`. Also after a top-level `return;` |
| The engine's own message | Any other syntax error (a top-level `await`, a missing brace) or an error thrown by the top-level code, for example `<dir>: x is not defined` |
| `Invalid regular expression: missing /` (V8, for example in a Node.js check of the file); in the app, WebKit's own wording for an unterminated regular expression literal (not verified) | A regular expression literal holds a **literal** line separator (U+2028) or paragraph separator (U+2029). JavaScript treats both as line breaks, so the literal ends there. They are invisible in most editors. The usual cause is a `\u2028` escape that a write tool turned into the real character. Write the class as `\p{Zl}\p{Zp}` with the `u` flag (`/[\p{Zl}\p{Zp}]/u`), which has no escape to expand. The same characters also end a `//` comment early, turning the rest of that line into code |

### The unloaded guard

| Message | When |
|---------|------|
| `Mod "<id>" is unloaded` | Any `ctx` function, or reading `ctx.app`, `ctx.kb` or `ctx.theme.current`, after the mod unloaded or once the open vault is no longer the one the mod loaded in. This includes calls made **inside `onunload`**, which runs after the mod is marked unloaded. A call already running when the unload happened: `loadData`, `saveData` and `ctx.kb()` reject with this message, even when their disk read or write failed; `ctx.vault` `create`, `write`, `rename`, `move` and `delete` reject with it once the file system call succeeds (the change may already be on disk), and with the file system error when it fails; `read`, `exists` and `list` resolve normally |

Only `ctx.signal`, `ctx.mod` and `ctx.apiVersion` keep working after unload. Objects already taken from `ctx.app` are not guarded.

### Argument validation

Every message starts with `Mod "<id>": `. The `ctx.ui`, `run.ui`, `ctx.vault` and `ctx.workspace` methods and `saveData` are async, so their errors are rejected promises; everything else throws synchronously.

| API | Message after the prefix |
|-----|--------------------------|
| `addAction` | `addAction needs a non-empty string id` · `addAction needs a non-empty string title` · `addAction needs a run function` · `addAction needs a string description` · `addAction needs input to be an object with an optional string placeholder` · `duplicate action id "<actionId>"` |
| `addRailButton` | `addRailButton needs a non-empty string id` · `addRailButton needs a non-empty string title` · `addRailButton needs a string icon` · `addRailButton needs actions to be a list of action ids` · `duplicate rail button id "<buttonId>"` |
| `labs.place` | `unknown action id "<actionId>"` · `labs.place needs palette: true or menu` · `labs.place needs palette: true` · `labs.place needs menu.on to list note or folder` · `labs.place needs menu.files to be markdown or all` |
| A menu item or a `modCommandsStore` row whose action was removed or replaced | `unknown action id "<actionId>"` |
| `watch` | `watch needs a read function` · `watch needs a callback function` |
| `onNoteSaved` | `onNoteSaved needs a callback function` · `onNoteSaved needs options to be an object` · `onNoteSaved needs options.ignoreOwnWrites to be a boolean` |
| `theme.onChange` | `theme.onChange needs a callback function` |
| `run.progress` | `run.progress needs numbers done and total` (any non-finite value: a string, `NaN`, `Infinity`, `undefined`) · `run.progress needs a string label`. Checked even after the run ended |
| `ui.alert`, `ui.confirm`, `ui.prompt`, `ui.pick` | `ui.<method> needs a non-empty string title` · `ui.<method> needs a string <field>`, where `<field>` is `message`, plus `confirmLabel` and `cancelLabel` (confirm), `label`, `placeholder` and `value` (prompt), `placeholder` (pick). `null` is not accepted for these fields |
| `ui.pick` | `ui.pick needs an items array` · `ui.pick needs items with non-empty string ids and titles` · `ui.pick needs a string item description` · `ui.pick duplicate item id "<itemId>"` |
| `ui.loading` | `ui.loading needs a non-empty string label` · `ui.loading needs a task function` |
| `vault.rename` | `vault.rename needs a single name` (the name contains `/`) |
| `vault.create`, `vault.write` | `vault.create needs string content` · `vault.write needs string content` |
| `saveData` | `saveData needs a value JSON can represent: <reason>` and `saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again` (see [Mod data](#ctxloaddata-and-ctxsavedata)) |

Not validated at all: the `message` of `ctx.notify` (it is put in a template string, so `undefined` toasts `<name>: undefined`), and the argument of `ctx.register` (a non-function is accepted and fails at unload as `cleanup failed: ...`).

### Runs and dialogs

| Error | When |
|-------|------|
| `DOMException` with `name` `AbortError` and message `The run was stopped` | A `run.ui` call made after `run.signal` aborted (checked before anything else, even before argument validation), and every open or waiting `run.ui` dialog when **Stop** is pressed or the mod unloads |
| Whatever the task rejects with | `ui.loading` passes on its task's rejection |

`ctx.ui` dialogs never reject on Stop or unload: on unload they resolve with their cancel value (`alert` resolves, `confirm` resolves `false`, `prompt` and `pick` resolve `null`). An `AbortError` you raise yourself while `run.signal` is not aborted (for example from your own `AbortController`) is an ordinary failure: **Failed** and a toast.

### `ctx.vault`

| Message | When |
|---------|------|
| `Invalid vault path "<path>"` | Not a string, empty, a leading `/`, a trailing or double `/`, or a `.` or `..` segment. Applies to every path argument, the `newName` of `rename`, a non-empty `targetFolder` of `move` and a non-empty folder of `list`. Non-strings print as `String(value)`, so `Invalid vault path "undefined"` |
| `"<path>" already exists; use write` | `create` on a path where a file or folder exists |
| `"<path>" does not exist; use create` | `write` on a missing path |
| `"<path>" has unsaved changes in an open tab` | `write` to a file whose open tab, active or not, has unsaved changes. Nothing is written |
| `"<name>" already exists in this folder` | `rename` or `move` would land on a taken name; `<name>` is the `newName` of `rename`, or the moved item's own name for `move`. A case-only rename (`a.md` to `A.md`) fails this way on a case-insensitive disk |
| `Could not save "<absolute path>" before moving it to the Trash` | `delete` could not save a dirty tab under the path first; its `name` is `PreDeleteSaveError` |
| `File already exists: <absolute path>`, `mkdir failed for <dir>: <io error>`, `write failed for ...`, `rename failed for ...` | `create` raced another writer, could not make the parent folders, or could not write the file |
| The file system's own error | Any other failure of `read`, `exists`, `list`, `write`, `delete` (missing path), `rename`, `move` (missing target folder). **Usually a bare string, not an `Error`** |

> [!WARNING]
> `ctx.vault` passes the lower layer's rejection through unchanged, and the app's file system bridge rejects with plain strings. In a `catch`, `err.message` can be `undefined`. Use `err instanceof Error ? err.message : String(err)`. Only `loadData` and `saveData` always reject with an `Error`.

### `ctx.workspace`

| Message | When |
|---------|------|
| `Invalid vault path "<path>"` | Bad path |
| `"<path>" does not exist` | Nothing at the path |
| The file system's own error | The existence check itself failed |

`openNote` resolves, without an error, for a folder, a binary file (the app toasts `Cannot open binary file in the editor: <name>`) and a file it cannot read (the app toasts `Failed to open file.`).

### `ctx.loadData` and `ctx.saveData`

| Message | When |
|---------|------|
| `Mod "<id>": data.json is not valid JSON; its content was kept in .kokobrain/mods/<id>/data.corrupt-<ms>.json` | `data.json` is not valid UTF-8 JSON (an empty file counts). The error has `name === 'ModDataCorruptError'` and `corruptPath` (vault-relative). The file was renamed; the next `loadData` resolves `null` |
| `Mod "<id>": saveData needs a value JSON can represent: <reason>` | `<reason>` is `function`, `symbol`, `NaN`, `Infinity`, `-Infinity`, `undefined` (top level or in an array), or `a <ClassName>` (`a Map`, `a Set`, a class instance), followed by ` at "<key>"` when nested, where `<key>` is only the nearest property name or array index. A cycle or a `BigInt` gives the engine's own `JSON.stringify` message |
| `Mod "<id>": saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again` | A `saveData` after a `loadData` that could not read or move the file |
| `Invalid mod id: <id>`, `read failed for <path>: <io error>`, `mkdir failed for <dir>: <io error>`, `write failed for <path>.tmp-<pid>-<n>: <io error>` (the temporary file of the atomic write), `write failed for <path>: target is read-only`, `rename failed for <path>: <io error>` | Disk failures, wrapped in an `Error` |

Check for the corrupt case with `err.name === 'ModDataCorruptError'`: there is no class to test with `instanceof`.

### `ctx.kb()`

Rejects with `Mod "<id>" is unloaded` when the mod unloaded or the vault changed before or after reading the snapshot, or with the app's error when reading the vault entries fails.

### App services reached through `ctx.app`

These come from the app, not the mod host, and have no `Mod "<id>"` prefix. A selection a mod is likely to meet:

| Function | Error |
|----------|-------|
| `updateNoteFrontmatter` | `Frontmatter write <reason>: <absolute path>`, with `name === 'FrontmatterWriteError'`, `reason` and `path`. Reasons: `unparseable`, `nested`, `comments`, `duplicate-keys`, `alias-collision`, `anchors` (nothing written), `save-failed` (the editor already toasted `Failed to save file.`: do not toast again), `vault-changed`, `missing`. A missing file rejects with the raw file system error instead |
| `createTypedNote` | `no-vault`, `create-failed`, or whatever `buildContent` throws |
| `dailyNotePath` | `No vault is open` |
| `openOrCreateNote` | Rejects with the underlying error, without a toast |
| `openFileInEditor` | Never rejects: toasts `Failed to open file.` or `Cannot open binary file in the editor: <name>` and resolves |
| `saveFileByPath` | Never rejects: resolves `false` and toasts `Failed to save file.` |
| `modCommandsStore.list[i].run()` | `Mod "<other id>" is unloaded`, `Mod "<other id>": unknown action id "<actionId>"` |
| `modCommandsStore.place(id)` | `Unknown mod action "<id>"` (`id` is the full `mod:<mod>:action:<action>` key) |

See [Raw app](09-raw-app.md) for each member.

### Labs toasts

| Toast | When |
|-------|------|
| `Could not save the Vault mods setting` | Saving the **Vault mods** switch failed |
| `Could not save the setting for <name>` | Saving one mod's switch failed |

### Failures that throw nothing

| Call | What happens instead |
|------|----------------------|
| `ctx.notify(message, { kind: 'oops' })` and `ui.alert({ kind: 'oops' })` | Falls back to `info` |
| Unknown manifest keys | Dropped |
| `run.log`, `run.progress` (valid arguments) after the run ended | Ignored |
| `addRailButton({ actions: ['missing'] })` | Unknown ids are skipped; `actions: []` lists nothing and the click shows `No actions.` |
| `addRailButton({ icon: '' })` or an unknown icon | The rail shows the Lucide puzzle icon; a failing icon pack load is logged as `cannot load icon pack <pack>:` |
| `labs.place(id, { menu: { on: [] } })` | Accepted; the item appears nowhere |
| `ctx.watch` read that throws | Keeps the last good value; logged |
| `ctx.vault.list` on a folder | Unsorted; dot entries silently removed |
| `ctx.app.createTypedNote` with an unknown or wrongly cased type | Creates a note in the types base folder (the vault root when none is set) with only `_type` set |

## `ctx.log`

`ctx.log(...args)` hands its arguments to the app's debug logger under the tag `MOD:<id>`. It never reaches Sentry.

| Setting (**Settings → Troubleshooting**) | Effect on `ctx.log` |
|------------------------------------------|---------------------|
| Both **Debug mode** and **Save debug log to file** off | Nothing at all. It does not fall back to the console |
| **Save debug log to file** on | One line in the session log file: `[HH:mm:ss.SSS] [FRONT-END:MOD:<id>] <args>` |
| **Debug mode** on | `console.log('[HH:mm:ss.SSS] [FRONT-END:MOD:<id>]', ...args)` in devtools, with the arguments as live objects |

What the file line contains:

- Strings are written as they are. Every other argument goes through `JSON.stringify`, and the parts are joined with one space.
- **An `Error` becomes `{}`**, because its `message` and `stack` are not enumerable. Log `err.message` and `err.stack` explicitly.
- `undefined`, functions and symbols become an empty part. A `Map` becomes `{}`.
- A circular object or a `BigInt` makes `JSON.stringify` throw, and so makes `ctx.log` throw, but only while file logging is on with an active session (read from the code, not tested).
- **Timestamps are UTC**, in the file and in the console prefix. The file name (`YYYY-MM-DD_HH-mm-ss.log`) uses local time.
- Lines are buffered and flushed every 250 ms or 50 lines. A crash can lose the last ones.
- After unload, `ctx.log` throws `Mod "<id>" is unloaded`. A timer that logs after a reload needs an `if (ctx.signal.aborted) return;` first.

A helper that logs any thrown value in full:

```javascript
function errorText(err) {
	if (!(err instanceof Error)) return String(err);
	// A WebKit stack does not repeat the message, so write both.
	return err.stack ? `${err.message}\n${err.stack}` : err.message;
}

// Inside an action:
try {
	await ctx.vault.write(path, text);
} catch (err) {
	ctx.log('write failed:', path, errorText(err));
	throw err;
}
```

> [!WARNING]
> Log lines are plain text on disk. Never log tokens, passwords, API keys or note content you would not share. `ctx.app.settingsStore` holds secrets such as the Todoist API token: do not log the settings object.

### Tags in the log file

| Tag (as written in the file) | Written by |
|------------------------------|------------|
| `[FRONT-END:MOD:<id>]` | `ctx.log`, and the host's reports about this mod: `<title> failed: ...`, `onunload failed: ...`, `cleanup failed: ...`, load errors (tagged with the folder name when the manifest could not be read), `watch read failed: ...`, `watch callback failed: ...`, `theme.onChange callback failed: ...`, `onNoteSaved callback failed: ...`, `vault.<op> "<path>" failed: ...`, `workspace.openNote "<path>" failed: ...`, `loadData failed: ...`, `saveData failed: ...`, `data.json is not valid JSON; moved to <name>`, `cannot load icon pack <pack>: ...`, `disabled mod listed by folder name: ...` |
| `[FRONT-END:MOD-HOST]` | The host execution trace and saved run messages, one JSON object per line |
| `[FRONT-END:MOD-UI]` | Dialog and notification records, one JSON object per line, without any text the mod passed |
| `[ERROR:FRONT-END:MODS]`, `[ERROR:FRONT-END:LABS]`, `[ERROR:FRONT-END:LIFECYCLE]` | Host failures: a reload that failed, listing the mods folder again, starting mods, saving a Labs switch, loading a mod switched on in Labs |
| `[SESSION]` | The first line of a session: `build dev=true` or `build dev=false` says whether the app is a development build |

A load error is logged as its message followed by the raw error, which the file writes as `{}` when it is an `Error`. **The stack of a load error is not in the log file**: expand **Stack trace** on the Labs row, or read the console with Debug mode on.

## Host execution trace and run messages

With **Save debug log to file** on, the host writes JSON records under `[FRONT-END:MOD-HOST]` even when the mod logs nothing:

| Event | Fields |
|-------|--------|
| `load-attempt` | `modId` (the folder name) |
| `load-result` | `modId`, `outcome` (`loaded`, `failed`, `superseded`), `elapsedMs` |
| `unload` | `modId` |
| `reload-wait` | `modId`: a reload is waiting for live runs |
| `action-start` | `modId`, `actionId`, `runId`, `origin` (`rail`, `note-menu`, `folder-menu`, `command`), `outcome: "running"`, `elapsedMs: 0` |
| `action-end` | The same, with `outcome` `done`, `failed` or `cancelled` and `elapsedMs` |
| `run-message` | One per accepted `run.log` line, only when **Save mod run messages to file** is also on: identity fields, ISO `timestamp`, `sequence`, `text` |

- `load-result` `elapsedMs` includes reading the files; the **Loaded · N ms** in Labs does not. An `onload` that never settles has no `load-result`.
- Starting an action that is already running writes no `action-start`: it only reveals the live run.
- `done` means the action's promise resolved, nothing more. `cancelled` means the host ended the run; the mod's code may still be running.
- `[FRONT-END:MOD-UI]` records trace dialogs: `dialog-queued`, `dialog-opened`, `dialog-closed` (with a `reason`), `loading-task-settled`, `dialog-rejected` (with a validation `reason`) and `notification-request`.

The full field lists, privacy rules and limits are in the user guide: [Automatic host execution trace](../28-mods.md#automatic-host-execution-trace), [Saving run messages](../28-mods.md#saving-run-messages) and [Local dialog diagnostics](../28-mods.md#local-dialog-diagnostics).

> [!WARNING]
> Saved run messages are the raw text the mod passed to `run.log`. They can contain note text, paths, prompts, API responses or secrets. Inspect the file before sharing it.

## Devtools and the console

- **Development builds** (`pnpm tauri dev`, `tauri build --debug`): right-click in the window and choose **Inspect** to open the Web Inspector. Uncaught errors from timers, listeners and promises, CSP violations from a blocked `fetch`, and Debug mode lines appear there.
- **Release builds**: the app is built without Tauri's `devtools` feature, and per the [Tauri documentation](https://v2.tauri.app/develop/debug/) the inspector is then available only in development and debug builds. Expect **Inspect** to be missing in a released app. This has not been checked on a shipped build.
- Without devtools, the session log file, the Labs row, toasts and the run view are the whole picture. Uncaught errors from code the mod started are not in the log file; catch them yourself and `ctx.log` them:

```javascript
const timer = setInterval(() => {
	try {
		tick();
	} catch (err) {
		if (!ctx.signal.aborted) ctx.log('tick failed:', errorText(err));
	}
}, 60_000);
ctx.register(() => clearInterval(timer));
```

## Stack traces

- `err.stack` is a string only for thrown `Error` objects. `throw 'text'` or a thrown plain object has no stack: Labs and the run view show the message alone. Throw `new Error('...')`.
- In the app's web view (WebKit), stack frames name functions only, for example `onload@`, one per line, with no file or line for mod code, and the stack does not start with the message. Give helper functions names so frames are readable.
- A bundled mod's frames carry the bundle's function names: keep names (do not minify) while debugging.
- In Chromium (the end-to-end tests, not the shipped app), frames read `kokobrain-mods/<id>/main.js:<line>:<column>`, close to the file's own line numbers.

## Debugging workflow

1. **Turn on logging.** **Settings → Troubleshooting → Save debug log to file**. Add **Debug mode** for console output in a development build, and **Save mod run messages to file** to keep `run.log` text. Logging that starts later does not replay earlier events.
2. **Tail the log.** The folder is `~/Library/Logs/com.diegorv.kokobrain/` (**Settings → Troubleshooting → Open log folder → Show in Finder**). In a terminal:

   ```bash
   tail -f "$(ls -t ~/Library/Logs/com.diegorv.kokobrain/*.log | head -n 1)" | grep --line-buffered 'FRONT-END:MOD'
   ```

3. **Reproduce once.** Save `main.js` to reload, then trigger the action.
4. **Read the trace.**
   - `load-attempt` without `load-result`: `onload` never settled (an `await` that hangs).
   - `load-result` `failed`: read the Labs row for the message and stack.
   - No `action-start` after a click: the action was already running (the click only revealed it), the click opened the picker or an input field and nothing was chosen yet, the button's `actions` list resolved to nothing, or the mod is not loaded.
   - `action-end` `cancelled` followed by nothing: Stop or unload. Errors after that point are not reported.
   - `action-end` `done` but the result is wrong: add `ctx.log` or `run.log` lines around each step.
   - `MOD:<id>` lines `vault.<op> ... failed`: the exact path and the file system error.
5. **Check registrations from code** when an action or palette entry is missing: `ctx.app.modCommandsStore.list` holds every registered action as `{ id, label, run, palette }`, with `palette` true while any palette placement exists.
6. **Fix and save.** The save reloads the mod; a new `load-result` `loaded` confirms it.

> [!TIP]
> If a mod freezes the app as soon as the vault opens (a synchronous infinite loop), quit Kokobrain, rename the mod's folder in Finder, and reopen. **Stop** cannot interrupt running JavaScript.

## Throw or notify

- **Throw** from an action for any failure the user should see: the run ends **Failed**, the toast reads `<name>: <title> failed: <message>`, and the stack is logged. Write the message for the user (`Open a note first`), not for yourself.
- **`ctx.notify`** for information, warnings and partial results that are not failures. After **Stop**, use it for any report: `run.log` and `run.progress` are ignored and `run.ui` rejects.
- **Never swallow** an error silently. If you catch to continue a batch, count the failures, `run.log` each one, and report the total at the end.

See [Runs](03-runs.md#cancellation-patterns) for Stop patterns and [Pitfalls and checklist](16-pitfalls-checklist.md#pitfalls) for symptoms and their causes.
