# Vault Mods

Write small JavaScript programs that live in your vault and extend Kokobrain: add buttons to the rail, run actions that read and write notes, and reach into the app's own state when you need to.

> [!WARNING]
> Mods run inside the app with its full access: your files, the app's state, and every command the app itself can call. There is no sandbox, like [QueryJS](13-queryjs.md). Only enable mods you wrote or have read.

## What is a mod?

A mod is a folder under `_system/mods/` with two files:

```
_system/mods/<mod-id>/manifest.json
_system/mods/<mod-id>/main.js
```

When mods are on for the vault, Kokobrain loads every mod folder after the vault opens, calls the mod's `onload(ctx)`, and lists it in **Settings → Labs**. A mod uses `ctx` to add actions, rail buttons, toasts and file changes. When the mod is switched off, edited, or the vault closes, Kokobrain calls `onunload()` and undoes everything the mod registered.

A minimal mod:

```javascript
export default {
	onload(ctx) {
		ctx.addAction({
			id: 'hello',
			title: 'Say hello',
			run: () => ctx.notify('Hello'),
		});
		ctx.addRailButton({ id: 'main', title: 'Hello', icon: 'lucide:sparkles' });
	},
};
```

A button with a sparkles icon appears in the rail. Clicking it runs **Say hello**, which shows a toast "Hello" prefixed with the mod's `name` from its manifest. A button with one action runs it at once (or, if the action asks for text, opens straight on its text field); with several, it opens a picker to choose one.

The repository's `help/examples/mods/hello/` is a complete example. It has a toast action and an action that asks for a title, reports progress, creates a note and opens it. Copy the folder to `_system/mods/hello/` in your vault to try it.

## Turning mods on

Open **Settings → Labs** and turn on **Vault mods**.

- The flag is **per vault and per machine**. It is stored in this computer's app storage, keyed by the vault's path, not in `.kokobrain/settings.json`. A vault copied from somewhere else, or opened at a new path, always starts with mods off.
- Turning it on loads the mods at once; turning it off unloads them. No restart needed.
- With mods on, Labs lists every folder under `_system/mods/` with its state: **Loaded**, **Error** (with the message and a **Stack trace** you can expand), or **Disabled**.

### Switching one mod off

Each row in the Labs list has its own switch. A new mod is **on** by default; turning its switch off unloads only that mod, and turning it back on loads only that mod. The others are untouched.

A mod that is switched off is still listed (with its manifest name) but its `main.js` is never read or run. Like the main flag, the per-mod switches are saved on this machine, per vault.

## The manifest

`manifest.json` describes the mod:

```json
{
	"id": "daily-log",
	"name": "Daily log",
	"version": "0.1.0",
	"description": "Appends a timestamped line to today's daily note",
	"author": "Me",
	"minAppVersion": "1.2.3",
	"color": { "light": "#7c3aed", "dark": "#c4b5fd" }
}
```

| Field | Required | Rule |
|-------|----------|------|
| `id` | yes | Lowercase letters and digits joined by single hyphens (`daily-log`), at most 64 characters, **equal to the folder name** |
| `name` | yes | Non-empty string; shown in Labs and prefixed to the mod's toasts |
| `version` | yes | Non-empty string, free form |
| `description` | no | String |
| `author` | no | String |
| `minAppVersion` | no | Looks like `1.2.3`; checked for shape, not enforced |
| `color` | no | The icon color of all the mod's rail buttons: an object with both `light` and `dark`, each `#rgb` or `#rrggbb`. `light` applies on light themes and `dark` on dark ones, and it follows a theme change at once. Without `color`, a button uses the default color |

Unknown keys are ignored. A broken manifest shows the mod as **Error** in Labs with a message that names the folder and the field, for example:

```
_system/mods/foo: manifest.json id "bar" does not match the folder name
```

## Writing `main.js`

`main.js` looks like an ES module but is one file, evaluated as a function:

- Exactly **one** `export default`, at the start of a line. Zero or several is an error.
- **No `import`** and no other `export`. Anything a mod needs comes from `ctx`, from browser APIs (`fetch`, timers, `localStorage`, the DOM), or from code in the file itself, pasted or [bundled by your own build](#your-own-ui-and-packages).
- The code runs in strict mode.
- The default export is an object with an `onload` function and, optionally, `onunload`.

A class works if you export an instance:

```javascript
class MyMod {
	onload(ctx) { /* ... */ }
	onunload() { /* ... */ }
}
export default new MyMod();
```

> [!NOTE]
> A function or a class as the default export (`export default function foo() {}`, `export default class Foo {}`) is rejected with `main.js: the default export must be an object with an onload function`. Export an object, or an instance as above.

### Lifecycle

| Moment | What happens |
|--------|--------------|
| Vault opens, mods on | Each mod loads on its own: one broken mod never blocks another. `onload(ctx)` runs; it may be `async`. |
| `onload` throws or rejects | The mod is shown as **Error**, a toast names it, and the cleanups it already registered run. |
| Mod switched off, reloaded, mods turned off, or vault closed | `ctx.signal` and the signal of every live [run](#runs-runsignal-runlog-runprogress) of the mod are aborted (a reload first waits for the runs to end, see below), `onunload()` runs (errors are caught and toasted), then every cleanup registered with `ctx.register`, or returned by `addAction` / `addRailButton`, runs **in reverse order**, even if `onunload` threw. An async `onunload` is not awaited: the cleanups run right after it starts. |
| After unload | Every `ctx` function throws `Mod "<id>" is unloaded`. The same happens if the open vault changed, so a slow action started in vault A cannot write into vault B through `ctx.vault`. Objects a mod already took from `ctx.app` are not guarded. |

### Reload on save

With mods on, saving a mod's `main.js` or `manifest.json` (in Kokobrain or in another editor) reloads that mod: its old buttons and actions go away and the new code's take their place. Adding a mod folder loads it; deleting one unloads it. If the new code fails, the mod shows its error and the other mods keep working. A mod switched off in Labs is not loaded by a file change.

**A reload waits for the mod's live runs.** Saving a mod while one of its actions runs does not stop the run: the run view shows **Reload pending**, and once every run of the mod has ended the mod reloads once, with the newest code. Press **Stop** to reload sooner. Deleting the mod folder, switching the mod off, turning mods off and closing the vault do not wait: they abort the runs at once.

While you edit `main.js` inside Kokobrain, autosave reloads the mod every couple of seconds; the same load error is toasted only once, so half-typed code does not flood you with toasts.

## The `ctx` reference

`ctx` has three parts:

- The **v1 contract**: stable. A new member is added without breaking existing mods; removing or changing one would bump `ctx.apiVersion`.
- **Experiments** (`ctx.labs`): host-provided entry points outside contract v1, with no compatibility promise.
- **Raw access** (`ctx.app`, `ctx.kb`): the app's own objects, unstable. See [Raw access](#raw-access-ctxapp-and-ctxkb).

### Basics

| Member | Description |
|--------|-------------|
| `ctx.apiVersion` | `1` |
| `ctx.mod` | `{ id, name, version, dir }`; `dir` is vault-relative, e.g. `_system/mods/hello` |
| `ctx.signal` | An `AbortSignal` aborted when the mod unloads. Pass it to `fetch` or check `ctx.signal.aborted` in long loops. Inside an action, use the run's `run.signal` instead: it also aborts on **Stop** |
| `ctx.register(fn)` | Adds a cleanup that runs at unload, after `onunload`, in reverse order |
| `ctx.notify(message, { kind? })` | Shows a toast "`<mod name>`: message". `kind` is `'info'` (default), `'success'`, `'warning'` or `'error'` |
| `ctx.log(...args)` | Writes to the debug log under the tag `MOD:<id>` (see [Errors and logs](#errors-and-logs)) |

### `ctx.watch`: reacting to state

`ctx.watch(read, onChange)` tracks the reactive state read synchronously by `read` and calls `onChange(value)` only when `Object.is` says the result changed. It does not call the handler at subscription. It returns a disposer, and unload also removes it; you do not need `ctx.register` for this watch.

```javascript
ctx.watch(
	() => ctx.app.editorStore.activeTabPath,
	(path) => ctx.log('Active note:', path),
);
```

The baseline is read at subscription, so a change before the first effect flush is still reported. Reads in `onChange` do not become dependencies. Several writes before a flush may produce one callback for the final value, not one per write. Return a primitive or a stable object identity: returning a fresh object looks like a change even if its fields are equal.

A synchronous throw in either function goes to the mod's debug log, not Sentry. A failed read keeps the last good value; if the initial read failed, the first successful read establishes the baseline without notifying. Recovery needs a reactive dependency read before the throw. A read that always throws before touching reactive state cannot wake up again by itself.

**Keep the read narrow.** Reading `activeTab.content` re-runs per keystroke; `activeTabPath` does not. A handler that calls `ctx.kb()` and reads pages after each `vaultIndexVersion` bump rebuilds every page for the changed snapshot. Coalesce that work or refresh only while its result is on screen.

### `ctx.onNoteSaved`: reacting to saves

`ctx.onNoteSaved(callback)` calls `callback(path)` with the **vault-relative** path of a note saved through the app's after-save pipeline, including `ctx.vault.write`. It does not subscribe to external filesystem edits or to note creation. The callback runs through `setTimeout(0)`, after all synchronous save observers, including observers registered later, so slow mod code cannot delay that save's observer loop. It still runs on the UI thread.

```javascript
ctx.onNoteSaved((path) => ctx.log('Saved:', path));
```

The returned disposer unsubscribes and cancels pending callbacks; unload does the same automatically. A callback that throws or returns a rejected promise goes to the mod's debug log, not Sentry. Already-running asynchronous callbacks are not cancelled: check `ctx.signal.aborted` after awaiting work.

**Avoid save loops.** `ctx.vault.write` has no equality guard, so a save callback that writes the same note can trigger itself indefinitely. Compare the old and new content before writing. An idempotent `ctx.app.updateNoteFrontmatter` mutation writes nothing when unchanged. Switch off the mod in **Settings → Labs** to stop an asynchronous save loop.

### Actions and rail buttons

```javascript
const remove = ctx.addAction({
	id: 'idea',                       // unique within the mod
	title: 'New idea note',           // picker row title
	description: 'Asks for text',     // optional picker subtitle
	input: { placeholder: 'Idea' },   // optional: ask for one line of text first
	run: async (text, run) => { /* ... */ },
});

ctx.addRailButton({
	id: 'main',                       // unique within the mod
	title: 'Ideas',                   // tooltip and picker title
	icon: 'lucide:lightbulb',         // icon ref
	actions: ['idea'],                // optional: which actions, in order; all of them when omitted
});
```

- **`addAction(action)`** registers an action and returns a function that removes it. A duplicate `id` throws.
  - Without `input`, picking the action calls `run` with the text `''`.
  - With `input`, the picker shows a text field: **Enter** calls `run` with the text, **Esc** cancels without running.
  - The second argument is the [run](#runs-runsignal-runlog-runprogress): its signal, log and progress bar.
  - `run` may be async. If it throws or rejects, the run ends **Failed** and a toast shows "`<mod name>`: `<title>` failed: `<message>`"; the error also goes to the debug log, never to Sentry. A rejection after **Stop** is not a failure.
- **`addRailButton(button)`** adds a button to the rail and returns a function that removes it. Clicking it opens a picker with the button's actions (resolved at click time, so actions added later are listed). When the button resolves to **a single action**, the click skips the list: an action without `input` runs at once, and one with `input` opens straight on its text field. A mod can add several buttons, each with its own `actions` list.
- **Icons** are `pack:name` or a bare Lucide name. Packs: `lucide`, `feather`, `fa-solid`, `fa-regular`, `fa-brands`, `octicons`, `boxicons`, `coolicons`, `simple-icons`, `tabler`, `remix`, `emoji`. An unknown icon falls back to a default.

### `ctx.labs.place`: palette and right-click menus

`ctx.labs` is **unstable**, outside `ModContextV1`. Its members may change without an API version bump. Register an action first, then place it:

```javascript
ctx.addAction({ id: 'hello', title: 'Say hello', run: () => ctx.notify('Hello') });
const unplace = ctx.labs.place('hello', { palette: true });
```

**Cmd+P** now lists `<Mod name>: Say hello` in category **Mod**. Actions are absent from the palette by default; adding a rail button does not add a palette command. An unknown action id throws.

Calling `unplace()` removes this placement, not the action. Removing the action or unloading the mod removes its command and placements automatically; no `ctx.register` is needed. If an action has multiple placements, it remains in the palette until all are disposed.

Every registered action, marked or not, is available in `ctx.app.modCommandsStore.list` as `{ id, label, run, palette }`. Its id is `mod:<mod-id>:action:<action-id>`. Calling a row's `run()` invokes the action through the host, asking for input when needed.

To show an action in right-click menus, use `menu`. Both placements can be set in one call:

```javascript
ctx.addAction({
	id: 'inspect',
	title: 'Inspect this target',
	run: (_input, run) => {
		if (run.target) ctx.notify(`${run.target.on}: ${run.target.path || '(vault root)'}`);
	},
});
ctx.labs.place('inspect', {
	palette: true,
	menu: { on: ['note', 'folder'], files: 'markdown' },
});
```

- `on: ['note']` places a flat item in the rail note list's row menu. `on: ['folder']` places it in the Files navigator's folder and vault-root menus. Use both to show it on both surfaces.
- `files` defaults to `'markdown'`: `.canvas`, `.view`, PDF and other non-markdown rows hide it. Set `'all'` only when the action supports those files. The filter never applies to folders.
- Items use `<Mod name>: <Action title>`, alongside the built-ins. The app does not call mod code while rendering menus; there is no `when` callback.
- A repeated menu placement for the same action replaces its previous menu entry. Disposing an older placement does not remove the replacement. Unloading or removing the action clears its menu entries.
- Menu runs receive `run.target: { on: 'note' | 'folder', path: string }`. The path is vault-relative and the vault root is `''`. It is captured from the clicked item, not the active editor, and stays the same while entering action input. Rail and palette runs have no `target`; use your own active-note fallback there if needed.
- Menu and palette invocations share one live run per action. Invoking it again while busy reveals that run, rather than starting another for a different clicked target.

### Runs: `run.target`, `run.signal`, `run.log`, `run.progress`

Running an action starts a **run**. Its view shows the action's title, its state (**Running**, **Done**, **Failed** or **Cancelled**), a progress bar, the run's log, the error with its stack when it failed, and **Stop** and **Close** buttons.

- **From the rail, or with `input`:** the run view opens when the action starts, after any input is submitted.
- **From a menu, the palette or a raw command row, without `input`:** the view opens only on the first `run.log` or `run.progress`. A quiet run does not interrupt typing. Invoking the same action again while it runs opens its existing view rather than starting another run. After **Close**, later output does not reopen it.
- **Delayed output can take focus:** the first log or progress opens the modal view even if another picker is open, replacing that picker's input. A quiet run has no visible **Stop** until invoked again. It also holds a mod reload without a visible **Reload pending** indicator until its view is opened. Switching the mod off in Labs aborts it.
- Rail and non-rail invocations use separate run keys, so the same action can run through both at once.

```javascript
ctx.addAction({
	id: 'tag-pass',
	title: 'Check every note in Projects',
	run: async (_text, run) => {
		const notes = (await ctx.vault.list('Projects')).filter((e) => !e.isFolder);
		for (const [i, note] of notes.entries()) {
			if (run.signal.aborted) return;   // Stop was pressed or the mod unloaded
			run.progress(i, notes.length, note.name);
			const text = await ctx.vault.read(note.path);
			if (!text.includes('#project')) run.log(`No #project tag: ${note.path}`);
		}
		run.progress(notes.length, notes.length, 'Done');
	},
});
```

| Member | Description |
|--------|-------------|
| `run.target` | Optional clicked menu target: `{ on: 'note' \| 'folder', path: string }`. Vault-relative path; `''` is the root. Absent from rail and palette runs |
| `run.signal` | An `AbortSignal` aborted on **Stop**, when the mod unloads (mods turned off, the mod switched off or deleted) and when the vault closes. Not aborted by a reload after a save, which waits for the run. Pass it to `fetch` or check `run.signal.aborted` between steps |
| `run.log(text)` | Adds a line to the run's log. The run view keeps the last 500 lines |
| `run.progress(done, total, label?)` | Sets the progress bar to `done` of `total`, with an optional label under it. Throws `Mod "<id>": run.progress needs numbers done and total` (or `needs a string label`) on other values |

- **A quiet run closes the view by itself.** When a run ends **Done** without having called `run.log` or `run.progress`, there is nothing to read, so the picker closes: an action that only shows a toast, opens a note or opens a dialog leaves no window behind. An open view that logged or showed progress stays on **Done** until you press **Close** or **Escape**, and so does an open **Failed** or **Cancelled** view. A non-rail run that fails before any output stays hidden and reports its failure through a toast. To keep the view open on a quick action, log a line.
- **Close** hides the view; the run goes on. While it runs, the mod's rail button shows a busy mark, and clicking it opens the run view again instead of the picker. A button has one live run at a time; two buttons of a mod can run side by side.
- **Stop** aborts `run.signal` and marks the run **Cancelled** at once. It cannot interrupt code that is running: the mod has to check `run.signal.aborted` or pass the signal on. Valid calls to `run.log` and `run.progress` after the run ended are ignored.

### `ctx.vault`: reading and writing files

Every path is **vault-relative** (`Ideas/Idea.md`). A path that is empty, starts with `/`, or has an empty, `.` or `..` segment rejects with `Invalid vault path "<path>"`. The only empty-path exceptions are the folder in `list('')` and the destination folder in `move(path, '')`, both meaning the vault root.

| Method | Resolves to | Notes |
|--------|-------------|-------|
| `read(path)` | the file's text | |
| `exists(path)` | `true` / `false` | files and folders |
| `list(folder)` | `{ name, path, isFolder }[]` | direct children only, dot entries left out; `list('')` lists the vault root |
| `create(path, content)` | `path` | Creates a new file at exactly that path, creating missing folders. Rejects with `"<path>" already exists; use write`; never renames |
| `write(path, content)` | nothing | Overwrites an existing file; an open tab shows the new content. Rejects with `"<path>" does not exist; use create`, and with `"<path>" has unsaved changes in an open tab` rather than lose your edits |
| `rename(path, newName)` | new vault-relative path | Renames a file or folder within its parent. `newName` must be one name, including any extension, not a path. Rejects if the destination is taken |
| `move(path, targetFolder)` | new vault-relative path | Moves a file or folder into an existing folder; `''` is the vault root. If already there, resolves to the unchanged path, never `null`. Rejects if the destination is taken |
| `delete(path)` | nothing | Moves the file or folder to Trash. The host detects folders and cleans up child paths in tabs, the file tree and indexes |

These path methods use the app's existing rename, move and delete services, including tab updates, link updates and index cleanup. Calls after unload reject; an operation already running inside a filesystem service cannot be cancelled and may finish even if the mod unloads before it resolves.

Notes created or written this way reach search, backlinks and tags at once. `write` also runs the after-save steps of a note saved in the editor (file history, Auto Move); `create` does not. A file of a mod that is not a note skips those steps when written with `write`. For a mod's own state, use [`ctx.saveData`](#ctxloaddata-and-ctxsavedata-the-mods-own-data) instead.

### `ctx.loadData` and `ctx.saveData`: the mod's own data

Each mod has one JSON value of its own, kept at `<vault>/.kokobrain/mods/<mod-id>/data.json`. Use it for state a mod updates often: a save reaches neither the index, search, file history, Auto Move, the file tree nor the caches, so it costs one small file write.

```javascript
ctx.addAction({
	id: 'count',
	title: 'Count this click',
	run: async () => {
		const data = (await ctx.loadData()) ?? { clicks: 0 };
		data.clicks += 1;
		await ctx.saveData(data);
		ctx.notify(`${data.clicks} clicks`);
	},
});
```

| Method | Resolves to | Rejects |
|--------|-------------|---------|
| `loadData()` | the saved value, or `null` when the file is not there | see below |
| `saveData(value)` | nothing, once the value is on disk | `Mod "<id>": saveData needs a value JSON can represent: <what and where>`, or `Mod "<id>": saveData refused: ...` after a load that could not read or move the file, with nothing written; or with an `Error` when the write fails |

- **What `saveData` takes.** Anything JSON represents: objects, arrays, strings, finite numbers, booleans, `null`. It refuses `undefined` at the top level or in an array, functions, symbols, `BigInt`, cycles, `NaN`, `Infinity`, and objects such as a `Map`, a `Set` or a class instance, which `JSON.stringify` would otherwise change without a word. A property set to `undefined` or keyed by a symbol is left out, a `Date` is saved as its ISO string (`null` when invalid), and `-0` as `0`. Since `null` is also what `loadData` resolves to with no file, a saved `null` reads as nothing saved.
- **Crash safety.** A write goes to a temp file next to `data.json` and is renamed over it, so if the app crashes mid-write the file keeps its previous content. A crash can leave a stray `data.json.tmp-*`; it is never read. The write does not force the bytes to the physical disk, so a power cut right after a save can still lose or damage that file.
- **Order.** Calls of one mod run one at a time, in call order, so the last `saveData` wins, and a `loadData` sees every save called before it. The value is read at the call: changing the object afterwards does not change what is saved. A mod that saves on every click does not need its own queue.
- **Unload.** After the mod unloads or the vault changes, both reject with `Mod "<id>" is unloaded`, also when that happens while they wait. A save still queued at that moment is not written, and rejects once the call ahead of it ends. One already sent to disk may land even though it rejects.

**Data that cannot be parsed is never lost.** When `data.json` is not valid UTF-8 JSON (an empty file counts), `loadData` renames it to `data.corrupt-<timestamp>.json` in the same folder, which keeps its exact bytes, and rejects with an error whose `name` is `ModDataCorruptError` and whose `corruptPath` is the vault-relative path of the copy. The next `loadData` resolves to `null`.

Any other rejection means the file could not be read or moved, and may still be in place: `saveData` refuses with `Mod "<id>": saveData refused: ...` until a later `loadData` resolves or reports the file as corrupt, or the mod reloads. (`Mod "<id>" is unloaded` is the exception: the mod is gone. If a move landed, the next load resolves to `null` and the copy stays in the folder as `data.corrupt-*`, with no report; if not, the next load starts over.)

```javascript
async function load(ctx) {
	try {
		return (await ctx.loadData()) ?? { clicks: 0 };
	} catch (err) {
		if (err.name !== 'ModDataCorruptError') throw err;
		ctx.notify(`Saved data was unreadable and is kept in ${err.corruptPath}`, { kind: 'warning' });
		return { clicks: 0 };
	}
}
```

A mod that calls `saveData` without ever calling `loadData` replaces whatever the file held, unparseable or not.

`.kokobrain/` is the app's own folder: dot-folders are hidden from the file tree and from `ctx.vault.list`. Kokobrain does not write a `.gitignore`; if yours lists `.kokobrain/`, **this data is not in git**. Deleting a mod folder leaves its data in place; delete `.kokobrain/mods/<mod-id>/` to remove it. The data folder is named after the manifest `id`, so renaming the mod starts it empty.

### `ctx.workspace`

| Method | Description |
|--------|-------------|
| `openNote(path)` | Opens the note at a vault-relative path in the editor, or switches to its tab. Rejects when the note does not exist. Pass a file: for a folder it resolves anyway and the app shows its own "Failed to open file." toast (reported like any app error) |

### `ctx.ui`: dialogs

Dialogs in the app's own look: they follow the theme, take focus, and close on **Esc** like the app's dialogs. Each shows the mod's `name` as a small caption above its title, so you always know which mod is asking.

```javascript
ctx.addAction({
	id: 'archive',
	title: 'Archive old notes',
	run: async () => {
		if (!(await ctx.ui.confirm({ title: 'Archive 12 notes?', confirmLabel: 'Archive', destructive: true }))) return;
		const reason = await ctx.ui.prompt({ title: 'Why?', placeholder: 'Reason' }); // null when cancelled
		if (reason === null) return;
		await ctx.ui.loading('Archiving...', async (signal) => {
			/* work; check signal.aborted between steps */
		});
		await ctx.ui.alert({ title: 'Done', message: '12 notes archived', kind: 'success' });
	},
});
```

| Method | Resolves to | Keys |
|--------|-------------|------|
| `alert({ title, message?, kind? })` | nothing, once dismissed | **Enter** (OK), **Esc**. `kind`: `'info'` (default), `'success'`, `'warning'` or `'error'` sets the icon |
| `confirm({ title, message?, confirmLabel?, cancelLabel?, destructive? })` | `true` or `false` | **Enter** confirms, **Esc** cancels. Labels default to **OK** and **Cancel**; `destructive: true` styles the confirm button as destructive |
| `prompt({ title, message?, label?, placeholder?, value?, multiline? })` | the text, or `null` when cancelled | **Enter** submits, **Esc** cancels. With `multiline: true` the field is a text area: **Enter** adds a line and **Cmd+Enter** submits. Enter while an input method is composing (Japanese, Chinese, ...) never submits |
| `pick({ title, placeholder?, items })` | the original selected item object, or `null` when cancelled | Type to fuzzy-search titles and descriptions; **Up/Down** selects, **Enter** accepts, **Esc** or **Cancel** cancels. Clicking a row accepts it. The search placeholder defaults to `Search items...` |
| `loading(label, task, { cancellable? })` | what `task` resolves to; rejects when it rejects | Calls `task(signal)` at once and shows `label` with a spinner until it settles. The dialog cannot be dismissed; `cancellable: true` adds **Cancel**, which aborts `signal` and closes the dialog. The promise still follows the task, so stop when `signal.aborted` |

- **One dialog at a time.** A second call, from this mod or another, waits until the first is closed. A dialog opened from an action shows above its run view; closing it returns to the run view while the run goes on (a quiet run that then ends closes it, see above).
- **Unload.** When the mod unloads, its open and waiting dialogs close as cancelled: `alert` resolves, `confirm` resolves `false`, `prompt` and `pick` resolve `null`, and `loading` aborts its signal. The loading promise still follows its task, which must cooperate with cancellation. A call after unload rejects with `Mod "<id>" is unloaded`.
- **Bad arguments** reject with `Mod "<id>": ...`, for example `Mod "<id>": ui.confirm needs a non-empty string title` or `ui.loading needs a task function`.

For `pick`, each item needs a non-empty string `id` and `title`, and may have a string `description`. Duplicate ids reject before opening a dialog. Extra fields stay on the original object you receive back:

```javascript
const folder = await ctx.ui.pick({
	title: 'Choose a folder',
	items: [
		{ id: 'projects', title: 'Projects', description: 'Active work', path: 'Projects/' },
		{ id: 'archive', title: 'Archive', path: 'Archive/' },
	],
});
if (folder !== null) ctx.log(folder.path);
```

The host searches **all items**, then renders at most **100 matches**. An empty search keeps the supplied order; a search ranks fuzzy matches. An empty list or a search with no matches shows `No items found.` and can still be cancelled. Display fields are captured when `pick` is called: filtering does not invoke mod code or read item getters on each keystroke. `pick` is part of contract v1, including its generic `Promise<T | null>` return type.

A custom modal, a form or a layout is the mod's own UI: build it in the DOM with the [theme colors](#ctxtheme-colors), or with a package you bundle (see [Your own UI and packages](#your-own-ui-and-packages)).

#### Local dialog diagnostics

With **Settings > Troubleshooting > Save debug log to file** enabled and a log session active, the host writes JSON records under `[FRONT-END:MOD-UI]` in the local session log. These records use the existing debug logger, not Sentry. Debug mode can also show them in the local developer console; file logging off writes none of these records to disk.

| Event | What the host observed |
|-------|------------------------|
| `dialog-queued` | An alert, confirm, prompt, pick or loading request entered the queue |
| `dialog-opened` | The host component opened that dialog; a request cancelled or completed before display has no opened event |
| `dialog-closed` | Exactly one terminal transition, with reason `acknowledged` (alert OK), `submitted` (confirm, prompt or pick), `cancel-button`, `escape`, `dismissed` (ordinary close/outside dismissal), `mod-unload`, `reset` or `task-settled` (loading) |
| `loading-task-settled` | The task returned/resolved (`success`) or threw/rejected (`failure`), independently of whether its dialog was already closed |
| `dialog-rejected` | Host argument validation rejected a request, with reason `invalid-title`, `invalid-text`, `invalid-items`, `invalid-item`, `invalid-description`, `duplicate-item`, `invalid-label` or `invalid-task`; the public rejection is unchanged |
| `notification-request` | `ctx.notify` requested a notification with validated kind `info`, `success`, `warning` or `error`; this is **not** evidence it was displayed, read, dismissed or acknowledged |

Dialog lifecycle and loading-task records contain `modId`, a session-local `dialogId`, `kind` and `elapsedMs`. Dialog elapsed time starts at queue insertion (zero for `dialog-queued`); task elapsed time starts immediately before invoking the task. The normal log timestamp records when each event was emitted. Rejection and notification records have mod identity and kind but no dialog ID or elapsed time, because no dialog was created.

A loading close also records `cancellationRequested`: `true` for cancellation transitions, `false` for task settlement. Closure is **not proof of task termination**. The task starts immediately even while its dialog is queued; Cancel, unload or reset can close the dialog while JavaScript continues. Its promise still follows the task, and a later task settlement gets its own event without another dialog-close event. An empty submitted prompt is `submitted`, not cancellation. Empty or unmatched pickers remain open until an actual terminal action.

These automatic records exclude mod display names, dialog titles/messages/labels/placeholders, prompt values and results, picker queries and item IDs/titles/descriptions/extra fields, notification text, task return values, and thrown error messages/stacks. Mod identity is JSON-encoded data, not text interpolated into the tag. There is **no run or action linkage**: `ctx.ui` is shared by the mod, and the host does not guess from the latest active run. Stopping a run does not close its mod's shared dialogs. Mod-owned forms and modals are not instrumented.

This content exclusion applies only to these automatic records. Explicit `ctx.log`, existing mod error logs and other logging facilities have their own behavior; enabling this feature does not certify those logs as content-free.

### `ctx.theme`: colors

The theme's **Global** colors are a stable contract for mods: the names below stay, and each one is a CSS variable on the document that follows the theme in Settings, a custom theme, and light or dark.

| Key | CSS variable | Key | CSS variable |
|-----|--------------|-----|--------------|
| `background` | `--background` | `muted` | `--muted` |
| `foreground` | `--foreground` | `mutedForeground` | `--muted-foreground` |
| `card` | `--card` | `accent` | `--accent` |
| `cardForeground` | `--card-foreground` | `accentForeground` | `--accent-foreground` |
| `popover` | `--popover` | `destructive` | `--destructive` |
| `popoverForeground` | `--popover-foreground` | `destructiveForeground` | `--destructive-foreground` |
| `primary` | `--primary` | `border` | `--border` |
| `primaryForeground` | `--primary-foreground` | `input` | `--input` |
| `secondary` | `--secondary` | `ring` | `--ring` |
| `secondaryForeground` | `--secondary-foreground` | `divider` | `--divider` |

| Member | Description |
|--------|-------------|
| `ctx.theme.current` | `{ mode, colors }`, read when you access it: `mode` is `'light'` or `'dark'`, and `colors` has one key per row above with its resolved value, in the syntax the theme uses (`'#21222e'`, `'oklch(0.22 0.025 273)'`) |
| `ctx.theme.onChange(callback)` | Calls `callback({ mode, colors })` after every theme change. Returns a function that removes it; it is also removed at unload. A callback that throws goes to the debug log and does not stop the others |

In the DOM, use the variables directly; they inherit into shadow DOM too, so a repaint is not needed. Use `current` and `onChange` where a CSS variable cannot reach, such as a `<canvas>` or a chart library that takes colors as strings.

A dialog the mod builds itself:

```javascript
function askColor(ctx) {
	const dialog = document.createElement('dialog');
	dialog.style.cssText = `
		background: var(--popover); color: var(--popover-foreground);
		border: 1px solid var(--border); border-radius: 12px; padding: 16px;`;
	dialog.innerHTML = `
		<p style="color: var(--muted-foreground); font-size: 12px"></p>
		<form method="dialog" style="display: flex; gap: 8px">
			<button value="red" style="background: var(--primary); color: var(--primary-foreground)">Red</button>
			<button value="" style="background: var(--secondary); color: var(--secondary-foreground)">Cancel</button>
		</form>`;
	dialog.querySelector('p').textContent = ctx.mod.name;
	document.body.append(dialog);
	ctx.register(() => dialog.remove());
	return new Promise((resolve) => {
		dialog.addEventListener('close', () => {
			resolve(dialog.returnValue || null);
			dialog.remove();
		});
		dialog.showModal();
	});
}
```

For a canvas:

```javascript
const paint = ({ colors }) => {
	chart.setColors({ line: colors.primary, grid: colors.border, text: colors.mutedForeground });
};
paint(ctx.theme.current);
ctx.theme.onChange(paint); // removed at unload
```

## Your own UI and packages

A mod is one `main.js` without `import`, but the file does not have to be written by hand. A mod can use any npm package (a chart library, a date picker, a UI framework) by bundling it into `main.js` with its own build:

- Keep the mod's source, its `package.json` and `node_modules` **outside the vault**, so the vault holds only the built `main.js` and `manifest.json` and syncing or indexing the vault does not walk `node_modules`.
- Build an IIFE and end it with the one `export default` the loader accepts. With [esbuild](https://esbuild.github.io):

  ```bash
  esbuild src/main.js --bundle --format=iife --global-name=__mod \
    --footer:js='export default __mod.default;' \
    --outfile="$VAULT/_system/mods/my-mod/main.js"
  ```

  `src/main.js` is a normal ES module: it can `import` packages and `export default { onload(ctx) { ... } }`. The bundle has no `import` left, and the footer puts the single top-level `export default` on its own line. The code runs in strict mode.
- Writing the bundle into the mod folder is a save of `main.js`, so the mod [reloads](#reload-on-save) on every build.

**Kokobrain never builds or installs anything for a mod.** It reads `manifest.json` and `main.js` and runs them; the build, the packages and their updates are yours. What the app guarantees for UI you build this way is the [theme color contract](#ctxtheme-colors).

## Raw access: `ctx.app` and `ctx.kb`

These two members hand a mod the app's own objects. They exist so you can experiment without waiting for a stable API, and they come with no compatibility promise: they change whenever the app's internals do. Reading `ctx.app` or calling `ctx.kb` throws after the mod unloads; objects you already took from them stay usable.

> [!WARNING]
> Anything a mod subscribes to through `ctx.app` (a CodeMirror listener, a DOM listener, a store watch, an interval) must be undone in `ctx.register(...)`. Otherwise it keeps running after the mod is switched off or reloaded.

### `ctx.app`

| Member | What it is |
|--------|------------|
| `editorStore` | The tabs. `activeTab` is the open tab: `{ path, name, content, savedContent, ... }` (`path` is absolute). `editorView` is the CodeMirror 6 `EditorView` of the open note |
| `openFileInEditor(absolutePath)` | Opens a file in the editor, or switches to its tab |
| `openNoteAt(absolutePath, target)` | Opens a note and moves the caret to a line, `{ kind: 'line', line }` (1-based), or an offset, `{ kind: 'offset', offset }` |
| `vaultStore` | The open vault; `path` is its absolute path |
| `createTypedNote({ typeName, title })` | Creates a note of a [type](25-types-and-relationships.md) the way the app does: the type's folder, its template, a unique name, and `_organized: false` while Explicit organization is on. Resolves to the new absolute path |
| `createOneOnOneNote(personName)` | Opens or creates today's 1:1 note with a person, the way the app's own 1:1 picker does: the folder, file name and template from **Settings → 1:1 Notes** |
| `openOneOnOnePicker(onSelect?)` | Opens the app's 1:1 person picker. Without `onSelect`, picking a person creates the note. With it, picking calls `onSelect({ name, path, context })` instead: `path` is absolute, `context` is `'work'` or `'personal'`, and a rejection shows as a toast. Resolves when the picker opens, not when a person is picked, so `onSelect` runs after the action's run has ended: no `run.signal`, no Stop, and a reload does not wait for it |
| `dailyNotePath(date?)` | The absolute path of the daily note of a `Date`, today by default, from **Settings → Periodic Notes**. It only computes the path: the note may not exist |
| `openOrCreateDailyNote()` | Opens today's daily note, creating it from its template when missing |
| `updateNoteFrontmatter(absolutePath, mutate)` | Rewrites a note's frontmatter. `mutate` receives the properties (`{ key, value, type }[]`, `type` one of `text`, `list`, `number`, `date`, `boolean`) and returns the new list. On an open tab it keeps unsaved body edits and saves the whole tab at once. It refuses frontmatter it cannot rewrite safely (YAML comments, nested maps, anchors, duplicate keys) with an error. Only call it on a Markdown note: on a `.canvas`, `.view` or `.js` tab it would add a frontmatter block to the file |
| `typeDefinitionsStore` | The vault's types: `getTypeMetadata(name)` and `typeMetadataMap` (folder, template, icon, color, archive rule per type) |
| `modCommandsStore` | `list` contains every mod action as `{ id, label, run, palette }`, including actions not placed in the palette. Call a row's `run()` to invoke it through the host |
| `railRegistryStore` | Live rail registrations: navigators, lens providers, folder creators, Today sections and actions. Wrap returned unregister functions in `ctx.register(...)`. A raw provider that throws can break its consumer; guard experimental providers yourself |
| `settingsStore` | Live app settings, including `layout` and `updateLayout(...)`. Raw setters change memory; they do not save settings to disk automatically |
| `openOrCreateNote(options)` | Opens an existing note or creates it and opens it. Takes absolute `filePath`, `title`, optional `templatePath`, `inlineTemplate`, `customVariables`, `contextDate` and `buildContent(content)`. A mod validates its own raw paths; resolves with no value |
| `saveFileByPath(absolutePath)` | Saves a dirty open tab through the editor save pipeline. Resolves `true` for success or no-op (including no matching tab), `false` on a write failure |
| `syncExternalContentToEditor(absolutePath, content, markSaved, schedule)` | Updates an open tab and signals CodeMirror. `markSaved: true` treats the bytes as already on disk; it does not write them. `schedule` is `'frontmatter'` (500 ms), `'body'` (2000 ms), or `'none'`. No matching tab is a no-op |

### `ctx.kb()`

Resolves to a new [QueryJS](13-queryjs.md) `kb` object over a fresh snapshot of the index, so everything in the QueryJS API works: pages, tags, links, tasks and frontmatter. Call it again to see later changes.

```javascript
const kb = await ctx.kb();
const projects = kb.pages().where((p) => p._type === 'Project' && !p.archived);
ctx.notify(`${projects.length} open projects`);
```

`kb.ui` renders into a detached element; append `kb.container` where you want it if you use it.

## Recipes

### Insert text at the caret

```javascript
ctx.addAction({
	id: 'stamp',
	title: 'Insert timestamp',
	run: () => {
		const view = ctx.app.editorStore.editorView;
		if (!view) throw new Error('No editor open');
		view.dispatch(view.state.replaceSelection(new Date().toLocaleString()));
		view.focus();
	},
});
```

### Create a typed note from a title

```javascript
ctx.addAction({
	id: 'new-task',
	title: 'New Task',
	input: { placeholder: 'Task title' },
	run: async (title) => {
		// Enter on an empty field runs the action with '', which would create a hidden ".md".
		if (!title.trim()) throw new Error('Type a title');
		const path = await ctx.app.createTypedNote({ typeName: 'Task', title });
		await ctx.app.openFileInEditor(path);
	},
});
```

### Set a frontmatter property on the open note

```javascript
ctx.addAction({
	id: 'archive',
	title: 'Archive this note',
	run: async () => {
		const tab = ctx.app.editorStore.activeTab;
		// The active tab can be a canvas, a .view or a mod's main.js: only touch Markdown.
		if (!tab || !tab.path.endsWith('.md')) throw new Error('Open a note first');
		await ctx.app.updateNoteFrontmatter(tab.path, (props) => [
			...props.filter((p) => p.key !== '_archived'),
			{ key: '_archived', value: true, type: 'boolean' },
		]);
	},
});
```

### Write a report note

`await` only works inside an async function such as `run`: the loader does not wrap `main.js` in one.

```javascript
ctx.addAction({
	id: 'open-tasks',
	title: 'Report open tasks',
	run: async () => {
		const path = 'Reports/Open tasks.md';
		const self = `${ctx.app.vaultStore.path}/${path}`;
		const kb = await ctx.kb();
		const open = kb
			.pages()
			.where((p) => p.file.path !== self) // the report lists tasks, so leave it out
			.array()
			.flatMap((p) => p.file.tasks.filter((t) => !t.completed));
		const text = `# Open tasks\n\n${open.map((t) => `- [ ] ${t.text}`).join('\n')}\n`;
		if (await ctx.vault.exists(path)) await ctx.vault.write(path, text);
		else await ctx.vault.create(path, text);
		await ctx.workspace.openNote(path);
	},
});
```

### Clean up a listener

```javascript
onload(ctx) {
	const onKey = (e) => { if (e.key === 'F9') ctx.notify('F9'); };
	window.addEventListener('keydown', onKey);
	ctx.register(() => window.removeEventListener('keydown', onKey));
}
```

## Errors and logs

| Where the error happens | What you see |
|-------------------------|--------------|
| Loading (manifest, `main.js` syntax, top-level code, `onload`) | The mod shows **Error** in Labs with the message and stack trace, plus a toast. The same message is toasted once, not on every reload |
| An action's `run` | The run view shows **Failed** with the message and stack, and a toast "`<mod name>`: `<title>` failed: `<message>`" |
| `onunload` or a cleanup | A toast naming the mod and the phase |
| A timer, listener or promise the mod started itself | Not caught by Kokobrain: it appears in the developer console (right-click → **Inspect**) |

Every error Kokobrain catches, and everything a mod writes with `ctx.log`, goes to the debug log under `MOD:<id>`. To keep it in a file, turn on **Settings → Troubleshooting → Save debug log to file**; lines look like `[10:42:07.123] [FRONT-END:MOD:daily-log] ...` in `~/Library/Logs/com.diegorv.kokobrain/`.

Mod errors that the mod host catches (loading, actions, unload, `ctx.loadData`, `ctx.saveData`, `ctx.workspace`, `ctx.ui`, `ctx.theme.onChange`, synchronous `ctx.watch` functions and `ctx.onNoteSaved` callbacks) are never sent to Sentry. The vault adapters also log their rejections under the mod tag. Uncaught errors (the last row above) and failures inside app services can reach Sentry while it is on. That includes `ctx.app` functions and the existing filesystem services called by `ctx.vault.rename`, `move` and `delete`.

> [!NOTE]
> Stack traces show the mod's frames by function name only (for example `onload@`), without a file and line: the app's web view does not report locations for code evaluated this way.

### Automatic host execution trace

Turn on **Settings → Troubleshooting → Save debug log to file** before reproducing a problem. The host writes records even when a mod never calls `ctx.log`, `run.log` or `run.progress`. Console **Debug mode** alone does not enable file output. Without an active log session, nothing is written; enabling logging later does not replay earlier events.

Look for `[FRONT-END:MOD-HOST]` in the session file in `~/Library/Logs/com.diegorv.kokobrain/`. Each record is one JSON object after the timestamp and tag:

```text
[10:42:07.123] [FRONT-END:MOD-HOST] {"event":"action-start","modId":"daily-log","actionId":"stamp","runId":7,"origin":"rail","outcome":"running","elapsedMs":0}
[10:42:07.140] [FRONT-END:MOD-HOST] {"event":"action-end","modId":"daily-log","actionId":"stamp","runId":7,"origin":"rail","outcome":"done","elapsedMs":17}
```

| Event | Meaning and fields |
|-------|--------------------|
| `load-attempt` | The host starts reading a mod. `modId` is the folder name, also used before its manifest can be validated. |
| `load-result` | That load settles as `loaded`, `failed` or `superseded`, with `modId` and `elapsedMs`. Superseded code is not reported as successfully loaded. An `onload` that never settles has no result yet. |
| `unload` | The host begins unloading `modId`: disabling, deletion, reload, vault teardown or cleanup after a failed load. It does not promise that asynchronous cleanup has finished. |
| `reload-wait` | A reload of `modId` is waiting for live host runs. The replacement gets its own load attempt and result when it actually loads. |
| `action-start` | A host-managed run starts: `modId`, `actionId`, `runId`, `origin`, `outcome: "running"`, `elapsedMs: 0`. |
| `action-end` | That host run ends once, with the same identifiers and origin, `outcome: "done"`, `"failed"` or `"cancelled"`, and elapsed milliseconds since start. |

`runId` identifies a run **within this app session**, not across restarts or as a globally durable ID. Concurrent runs have different IDs, and a later run on the same button or command gets a new ID. Invoking a busy key reveals the existing run without recording another start. Durations use a monotonic clock, rounded to milliseconds.

`origin` is `rail`, `note-menu`, `folder-menu` or `command`. Palette selection and programmatic invocation of a command row are both `command`: the host cannot distinguish them. Opening a picker without starting an action produces no action event.

**Cancelled describes host state.** Stop or unload ends the host run immediately; it does not prove arbitrary JavaScript has stopped. A late resolution or rejection neither changes cancellation nor writes another terminal event. `done` means the action resolved, not that its note contents or business outcome are correct.

Automatic records contain only the selected identifiers, host event/outcome codes and timing. Identifiers are JSON-escaped so embedded newlines cannot create extra records. They do not include action input, titles, target paths, note content, progress labels or raw errors. Existing `MOD:<id>` messages, mod-authored logs and other app logs are separate and may contain those details; review the whole file before sharing it. These diagnostic records do not call the Sentry error reporter, and existing caught-mod-error routing and user-facing feedback are unchanged.

Coverage is limited to host-managed loads and actions. Direct raw-registry callbacks, mod-owned DOM listeners, timers, save/theme/watch callbacks and work detached from an action are not automatically separate runs. Uncaught errors and downstream app-service reporting retain the limits described above.

This uses the existing local buffered writer, normally flushing every 250 ms or 50 lines. It is not a crash-proof journal: a crash, write failure or disabling logging partway through a run can leave an incomplete trace. Browser tests verify rendered runs and buffered filesystem output; native WKWebView session-file delivery still requires a desktop check.

## Limits

- **A synchronous infinite loop freezes the whole app**, and **Stop** cannot end it. Mods run on the app's main thread. If a mod freezes the app as soon as the vault opens, quit Kokobrain and rename or delete the mod's folder in Finder, then reopen.
- **No `import`**, one file per mod; bundle packages with [your own build](#your-own-ui-and-packages).
- **`export default` declares no name.** The loader turns it into an assignment, so after `export default function foo() {}` or `export default class Foo {}` the rest of the file cannot refer to `foo` or `Foo` (and the loader rejects both, since the default export must be an object). Declare the object first and export it: `const mod = { onload(ctx) { /* ... */ } }; export default mod;`.
- **Long work** should check `run.signal.aborted` between steps in an action (it aborts on **Stop** and at unload), or `ctx.signal.aborted` in work the mod started outside an action.
- **`fetch` reaches only the hosts the app's Content Security Policy allows** (`connect-src` in `src-tauri/tauri.conf.json`: GitHub, Todoist, Hugging Face and Sentry). A request to any other host is blocked by the web view.
- **Raw access is unstable**: a mod that uses `ctx.app` or `ctx.kb` can break when the app changes.

## Next Steps

- [QueryJS](13-queryjs.md): the full `kb` API that `ctx.kb()` returns
- [Types & Relationships](25-types-and-relationships.md): what `createTypedNote` creates
- [Settings](19-settings.md#labs): the Labs section
