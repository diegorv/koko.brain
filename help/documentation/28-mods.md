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

A button with a sparkles icon appears in the rail. Clicking it opens a picker with **Say hello**; picking it shows a toast "Hello" prefixed with the mod's `name` from its manifest.

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
	"minAppVersion": "1.2.3"
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

Unknown keys are ignored. A broken manifest shows the mod as **Error** in Labs with a message that names the folder and the field, for example:

```
_system/mods/foo: manifest.json id "bar" does not match the folder name
```

## Writing `main.js`

`main.js` looks like an ES module but is one file, evaluated as a function:

- Exactly **one** `export default`, at the start of a line. Zero or several is an error.
- **No `import`** and no other `export`. Anything a mod needs comes from `ctx`, from browser APIs (`fetch`, timers, `localStorage`, the DOM), or from code you paste into the file.
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

`ctx` has two parts:

- The **v1 contract**: stable. A new member is added without breaking existing mods; removing or changing one would bump `ctx.apiVersion`.
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
- **`addRailButton(button)`** adds a button to the rail and returns a function that removes it. Clicking it opens a picker with the button's actions (resolved at click time, so actions added later are listed). A mod can add several buttons, each with its own `actions` list.
- **Icons** are `pack:name` or a bare Lucide name. Packs: `lucide`, `feather`, `fa-solid`, `fa-regular`, `fa-brands`, `octicons`, `boxicons`, `coolicons`, `simple-icons`, `tabler`, `remix`, `emoji`. An unknown icon falls back to a default.

### Runs: `run.signal`, `run.log`, `run.progress`

Picking an action starts a **run**, and the picker turns into its run view: the action's title, its state (**Running**, **Done**, **Failed** or **Cancelled**), a progress bar, the run's log, the error with its stack when it failed, and **Stop** and **Close** buttons.

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
| `run.signal` | An `AbortSignal` aborted on **Stop**, when the mod unloads (mods turned off, the mod switched off or deleted) and when the vault closes. Not aborted by a reload after a save, which waits for the run. Pass it to `fetch` or check `run.signal.aborted` between steps |
| `run.log(text)` | Adds a line to the run's log. The run view keeps the last 500 lines |
| `run.progress(done, total, label?)` | Sets the progress bar to `done` of `total`, with an optional label under it. Throws `Mod "<id>": run.progress needs numbers done and total` (or `needs a string label`) on other values |

- **The run view stays open** until you press **Close** or **Escape**, even for an action that ends at once, such as one that only shows a toast or opens a note.
- **Close** hides the view; the run goes on. While it runs, the mod's rail button shows a busy mark, and clicking it opens the run view again instead of the picker. A button has one live run at a time; two buttons of a mod can run side by side.
- **Stop** aborts `run.signal` and marks the run **Cancelled** at once. It cannot interrupt code that is running: the mod has to check `run.signal.aborted` or pass the signal on. Valid calls to `run.log` and `run.progress` after the run ended are ignored.

### `ctx.vault`: reading and writing files

Every path is **vault-relative** (`Ideas/Idea.md`). A path that is empty, starts with `/`, or has an empty, `.` or `..` segment rejects with `Invalid vault path "<path>"`.

| Method | Resolves to | Notes |
|--------|-------------|-------|
| `read(path)` | the file's text | |
| `exists(path)` | `true` / `false` | files and folders |
| `list(folder)` | `{ name, path, isFolder }[]` | direct children only, dot entries left out; `list('')` lists the vault root |
| `create(path, content)` | `path` | Creates a new file at exactly that path, creating missing folders. Rejects with `"<path>" already exists; use write`; never renames |
| `write(path, content)` | nothing | Overwrites an existing file; an open tab shows the new content. Rejects with `"<path>" does not exist; use create`, and with `"<path>" has unsaved changes in an open tab` rather than lose your edits |

Notes created or written this way reach search, backlinks and tags at once. `write` also runs the after-save steps of a note saved in the editor (file history, Auto Move); `create` does not.

### `ctx.workspace`

| Method | Description |
|--------|-------------|
| `openNote(path)` | Opens the note at a vault-relative path in the editor, or switches to its tab. Rejects when the note does not exist. Pass a file: for a folder it resolves anyway and the app shows its own "Failed to open file." toast (reported like any app error) |

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
| `updateNoteFrontmatter(absolutePath, mutate)` | Rewrites a note's frontmatter. `mutate` receives the properties (`{ key, value, type }[]`, `type` one of `text`, `list`, `number`, `date`, `boolean`) and returns the new list. On an open tab it keeps unsaved body edits and saves the whole tab at once. It refuses frontmatter it cannot rewrite safely (YAML comments, nested maps, anchors, duplicate keys) with an error. Only call it on a Markdown note: on a `.canvas`, `.view` or `.js` tab it would add a frontmatter block to the file |
| `typeDefinitionsStore` | The vault's types: `getTypeMetadata(name)` and `typeMetadataMap` (folder, template, icon, color, archive rule per type) |

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

Mod errors that the mod host catches (loading, actions, unload, `ctx.vault`, `ctx.workspace`) are never sent to Sentry. Two kinds can reach it while Sentry is on: uncaught ones (the last row above), and failures inside `ctx.app` functions, which report like any app error.

> [!NOTE]
> Stack traces show the mod's frames by function name only (for example `onload@`), without a file and line: the app's web view does not report locations for code evaluated this way.

## Limits

- **A synchronous infinite loop freezes the whole app**, and **Stop** cannot end it. Mods run on the app's main thread. If a mod freezes the app as soon as the vault opens, quit Kokobrain and rename or delete the mod's folder in Finder, then reopen.
- **No `import`**, one file per mod.
- **`export default` declares no name.** The loader turns it into an assignment, so after `export default function foo() {}` or `export default class Foo {}` the rest of the file cannot refer to `foo` or `Foo` (and the loader rejects both, since the default export must be an object). Declare the object first and export it: `const mod = { onload(ctx) { /* ... */ } }; export default mod;`.
- **Long work** should check `run.signal.aborted` between steps in an action (it aborts on **Stop** and at unload), or `ctx.signal.aborted` in work the mod started outside an action.
- **`fetch` reaches only the hosts the app's Content Security Policy allows** (`connect-src` in `src-tauri/tauri.conf.json`: GitHub, Todoist, Hugging Face and Sentry). A request to any other host is blocked by the web view.
- **Raw access is unstable**: a mod that uses `ctx.app` or `ctx.kb` can break when the app changes.

## Next Steps

- [QueryJS](13-queryjs.md): the full `kb` API that `ctx.kb()` returns
- [Types & Relationships](25-types-and-relationships.md): what `createTypedNote` creates
- [Settings](19-settings.md#labs): the Labs section
