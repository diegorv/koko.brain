# Mods Reference

The complete reference for writing Kokobrain vault mods. It goes deeper than the user guide, [Vault Mods](../28-mods.md): every rule, signature, error message and edge case, so a mod works on the first try. Start with this page, then open the file for your task.

> [!WARNING]
> Mods run inside the app with its full access: your files, the app's state, and every command the app can call. There is no sandbox. Only enable mods you wrote or have read.

## What a mod is

A mod is a folder `_system/mods/<id>/` in a vault with two files: `manifest.json` (id, name, version) and `main.js` (plain JavaScript, one file, no `import`, exactly one `export default` of an object with `onload`). When **Settings > Labs > Vault mods** is on, Kokobrain evaluates `main.js` after the vault opens and calls `onload(ctx)`. Through `ctx` the mod adds **actions** (units of work with a run view, progress, log and **Stop**), puts them on the rail, in the command palette or in right-click menus, reads and writes vault files, shows dialogs and toasts, stores its own JSON data, and, when needed, reaches into the app's live state. Saving `main.js` reloads the mod; switching it off or closing the vault unloads it and undoes everything it registered.

## Start here: a minimal complete mod

Create the folder `_system/mods/hello-world/` with these two files.

`manifest.json`:

```json
{
	"id": "hello-world",
	"name": "Hello world",
	"version": "1.0.0"
}
```

`main.js`:

```js
/** Notes this mod creates go here, so it never touches your own folders */
const FOLDER = 'Hello world';

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'new-note',
			title: 'New greeting note',
			description: `Asks for a name, creates a note in "${FOLDER}" and opens it`,
			run: async (input, run) => {
				const name = await run.ui.prompt({ title: 'Who should we greet?', placeholder: 'A name' });
				if (name === null || run.signal.aborted) return;
				const clean = name.trim();
				if (!clean) throw new Error('Type a name');

				const path = `${FOLDER}/Hello ${clean.replace(/[/\\:]/g, '-')}.md`;
				if (await ctx.vault.exists(path)) throw new Error(`"${path}" already exists`);
				if (run.signal.aborted) return;

				await ctx.vault.create(path, `# Hello, ${clean}\n`);
				if (run.signal.aborted) return;

				// The last step, with no run.log or run.progress before it: the run view closes and the note shows.
				await ctx.workspace.openNote(path);
			},
		});

		ctx.addRailButton({ id: 'main', title: 'Hello world', icon: 'lucide:sparkles', actions: ['new-note'] });
	},
};
```

Then open **Settings > Labs**, turn on **Vault mods**, and check that the row says **Loaded**. A sparkles button appears in the rail; clicking it runs the action (a button with one action runs it directly). If the row says **Error**, its message names the file and the problem: see [Anatomy and loading](01-anatomy-and-loading.md#load-errors-and-toasts).

What this shows:

- `export default` starts at column 0, once, and exports an object with `onload`.
- The action asks with `run.ui` (closed by **Stop**), checks `run.signal.aborted` after every `await`, and **throws** on a user error: the host marks the run Failed and shows a toast `Hello world: New greeting note failed: Type a name`.
- Paths given to `ctx.vault` and `ctx.workspace` are vault-relative.
- The action ends by opening the note and writes no `run.log` or `run.progress`, so its run view closes by itself instead of staying on top of the note (see [Runs: Ending an action](03-runs.md#ending-an-action)).
- The file name only loses path characters here. A real mod builds names from user text with [`safeName`](04-vault-files.md#note-names-safename), which also removes wikilink characters and leading dots.
- No cleanup code: the host removes actions and rail buttons on unload by itself.

A larger, commented example is [hello](../../examples/mods/hello/). A standalone type file for editor checking is [kokobrain-mod.d.ts](../../examples/mods/kokobrain-mod.d.ts) (see [Types, build and test](12-types-build-and-test.md)).

## Golden rules

Break any of these and the mod fails to load, misbehaves, or damages notes.

1. **One `export default`, at column 0, followed by whitespace (a space, tab or newline).** Not indented, not `export default{`, not after other code on the same line, and no line inside a comment or template literal may start with `export default`. See [the export default rule](01-anatomy-and-loading.md#the-export-default-rule).
2. **No `import` and no other `export`.** A mod is one file. Paste helpers in, or bundle with your own build ([Types, build and test](12-types-build-and-test.md)).
3. **Export an object (or a class instance) with an `onload` function.** A function, a class or an object without `onload` is rejected.
4. **Inside an action, ask with `run.ui`, never `ctx.ui`.** `run.ui` dialogs close when the user presses **Stop**; `ctx.ui` dialogs stay open and keep the action waiting. See [Dialogs](06-dialogs.md#which-set-to-use).
5. **Check `run.signal.aborted` after every `await` and between steps, and pass `run.signal` to `fetch`.** Stop cannot interrupt running code; it only aborts the signal. A synchronous loop freezes the whole app. See [Runs](03-runs.md#cancellation-patterns).
6. **Throw to fail an action; notify and return when there is nothing to do.** A throw or rejection marks the run Failed and shows a toast with the action title: use it for errors and invalid input (an empty field, the wrong kind of target). A state with nothing to do (already running, nothing selected, nothing found, already done) is not a failure: `ctx.notify('...')` and `return`. Do not catch an error and return quietly, and do not toast an error and then return as if it worked. See [Runs: Ending an action](03-runs.md#ending-an-action).
7. **Register a cleanup for everything the host does not track**: timers, DOM listeners, DOM nodes, observers, `window` properties, raw registrations through `ctx.app`. Use `ctx.register(fn)` inside `onload`. See [Events and reactivity](07-events-and-reactivity.md#ctxregister-and-ctxsignal-cleanup-and-order).
8. **Never call `ctx` from `onunload` or a cleanup.** The mod is already marked unloaded, so every `ctx` function throws. `onunload` is also skipped when `onload` failed. Save state when it changes. See [onunload runs with a dead ctx](01-anatomy-and-loading.md#onunload-runs-with-a-dead-ctx).
9. **`ctx.vault`, `ctx.workspace`, `ctx.onNoteSaved`, `ctx.onNoteMoved`, `ctx.onNoteCreated` and `run.target` use vault-relative paths** (`Projects/Plan.md`: no leading `/`, no `.` or `..`, no empty segment). **`ctx.app` and `ctx.kb()` use absolute paths.** Convert with `toAbsolute(ctx, path)` and `toVaultPath(ctx, absolute)` from [Vault files](04-vault-files.md#absolute-paths-and-ctxapp) (the second also collapses the `//` some app paths carry).
10. **Never edit an open note's file behind the editor.** When the note is open, edit it through the editor (`ctx.app.editorStore.editorView`), which keeps unsaved typing and arms autosave. `ctx.vault.write` rejects a note with unsaved changes in an open tab. See [Vault files](04-vault-files.md#editing-a-note-that-may-be-open).
11. **Capture the active note before the first `await`.** The user can switch tabs while your action waits on a dialog or a file. Prefer `run.target` when the action was started from a menu.
12. **Scope every `ctx.kb()` query** to a folder (`kb.pages('"Projects"')`), a `file.folder` predicate in the same chain (the vault root: `.where((p) => p.file.folder === ctx.app.vaultStore.path)`) or a `.limit(n)`. The index builds every page either way; the scope filters what the query returns, so private notes outside the task stay out of reports and pickers. A whole-vault read the task really needs is fine, with a comment saying why. Tasks, tags, links, size and mtime in the index lag writes by about 2 s after a change, up to about 10 s during a burst (existence and frontmatter do not). See [Querying the index](10-querying-the-index.md#scoping).
13. **`fetch` only reaches the allowed hosts:** `https://api.todoist.com`, `https://huggingface.co`, `https://github.com`, `https://objects.githubusercontent.com` and the Sentry ingest hosts. Everything else (`api.github.com`, `raw.githubusercontent.com`, any LLM API, `localhost`) is blocked by the app's content security policy. WebSockets and `EventSource` follow the same list: they are blocked only for hosts not on it. See [Network and platform](11-network-and-platform.md#fetch-and-the-csp).
14. **Read errors with `err instanceof Error ? err.message : String(err)`** (or the `errorMessage` helper of [Vault files](04-vault-files.md#errors-are-not-always-error-objects)). File system errors from `ctx.vault`, `ctx.workspace` and `ctx.app` calls, and a failed index read in `ctx.kb()`, often reach the mod as plain strings, so `err.message` is `undefined`. `ctx.loadData` and `ctx.saveData` always reject with an `Error`, and so does every other `ctx` member.
15. **Store data with `ctx.saveData` / `ctx.loadData`**, not in notes or `localStorage`, and never write the same note again from `ctx.onNoteSaved` without a guard (it loops; `{ ignoreOwnWrites: true }` skips the mod's own `ctx.vault` writes, but compare before writing anyway). See [Mod data](05-mod-data.md) and [Events and reactivity](07-events-and-reactivity.md).

## Stability tiers

Every member of `ctx` belongs to one tier. The files of this reference tag each member.

| Tier | What | Promise |
|------|------|---------|
| **stable** | Contract v1: `ctx.apiVersion`, `ctx.mod`, `ctx.signal`, `ctx.register`, `ctx.notify`, `ctx.log`, `ctx.addAction`, `ctx.addRailButton`, `ctx.watch`, `ctx.onNoteSaved`, `ctx.onNoteMoved`, `ctx.onNoteCreated`, `ctx.vault.*`, `ctx.workspace.openNote`, `ctx.ui.*`, `ctx.theme.*`, `ctx.loadData`, `ctx.saveData`, and the run object (`run.target`, `run.signal`, `run.log`, `run.progress`, `run.ui`) | Members are only added. Removing or changing one bumps `ctx.apiVersion` (today `1`) |
| **unstable** | `ctx.labs` (today only `ctx.labs.place`, which puts an action in the palette and the note and folder menus) | Experimental. May change or disappear in any release, with no version bump |
| **raw** | `ctx.app` (the app's live stores and services), `ctx.kb()` (the QueryJS API over the index), and the app's DOM (class names, element structure, CSS selectors) | None. These are the app's internals. They can change in any release, and they are wider and looser than any type file describes. Calling a destructive member (for example a store's `reset()`) breaks the app |

Use the most stable tier that does the job. When you must use raw access, keep it in one small function per need, so a change in the app breaks one place.

## Which API do I use

| I want to | Use | Tier | Not |
|-----------|-----|------|-----|
| Show a short message | `ctx.notify(message, { kind })` | stable | It is an in-app toast of about 4 s, never an OS notification. For an event the user must not miss, `ctx.ui.alert` or a chip that stays |
| Ask the user something inside an action | `run.ui.prompt` / `confirm` / `pick` / `alert` / `loading` | stable | `ctx.ui` (does not close on Stop) |
| Ask the user something outside an action (a timer, a listener) | `ctx.ui.*` | stable | |
| Report progress of a long action | `run.progress(done, total, label)` and `run.log(text)` | stable | Toasts per step |
| Read, create, overwrite, rename, move or trash a file | `ctx.vault.*` | stable | `ctx.app` services |
| Change text of a note that may be open in the editor | `ctx.app.editorStore.editorView` when it shows the note, else `ctx.vault.read` + `ctx.vault.write` | raw / stable | `ctx.vault.write` alone (rejects a dirty tab, overwrites what the user sees) |
| Change frontmatter properties | `ctx.app.updateNoteFrontmatter(absolutePath, mutate)` | raw | Rewriting the YAML by hand |
| Open a note | `ctx.workspace.openNote(relativePath)` | stable | |
| Open a note at a line, or by absolute path | `ctx.app.openNoteAt(...)`, `ctx.app.openFileInEditor(absolutePath)` | raw | |
| Find today's daily note, or create it from its template | `ctx.app.dailyNotePath(date?)`, `ctx.app.openOrCreateDailyNote()` | raw | Building the path by hand |
| Create a note of a type, with its template | `ctx.app.createTypedNote({ typeName, title, buildContent: ensureTypeLine(typeName) })` | raw | `ctx.vault.create` (skips the template, the type folder and `_organized: false`) |
| Query notes, tags, tasks, links, properties | `await ctx.kb()`, then `kb.pages('"Folder"')...` | raw | `ctx.vault.list` over the whole vault |
| React to a note being saved | `ctx.onNoteSaved(callback)` | stable | Polling files |
| React to a note being renamed or moved | `ctx.onNoteMoved(callback)` | stable | Polling files |
| React to a note the app just created | `ctx.onNoteCreated(callback)` | stable | Polling files |
| React to app state (active tab, settings) | `ctx.watch(read, onChange)` | stable (the values read are raw) | `setInterval` polling |
| Store settings, state or caches | `ctx.loadData` / `ctx.saveData` | stable | Notes, `localStorage` (per machine only) |
| Put an action in the command palette or a right-click menu | `ctx.labs.place(actionId, { palette: true, menu })` | unstable | |
| Build my own panel, chip or modal | DOM APIs plus `ctx.theme.current` and `ctx.theme.onChange`, every node removed in `ctx.register` | stable theme, raw DOM | Hard-coded colors |
| Call a web API | `fetch(url, { signal: run.signal })` to an allowed host | browser | Hosts outside the policy |
| Run another mod's action | `ctx.app.modCommandsStore.list`, looked up at call time | raw | Caching the row in `onload` |

## Task guide

| I want to | Read |
|-----------|------|
| Write my first mod, or fix a mod that does not load | [Anatomy and loading](01-anatomy-and-loading.md), [Load errors](01-anatomy-and-loading.md#load-errors-and-toasts) |
| Add a button to the rail | [Actions: addRailButton](02-actions-and-entry-points.md#ctxaddrailbutton) |
| Add an action to the command palette or a note or folder menu | [Actions: labs.place](02-actions-and-entry-points.md#ctxlabsplace) |
| Act on the note or folder the user right-clicked | [Actions: run.target](02-actions-and-entry-points.md#runtarget) |
| Act on the active note | [Actions: active-note fallback](02-actions-and-entry-points.md#active-note-fallback) |
| Run another mod's action | [Actions: invoking another mod's action](02-actions-and-entry-points.md#invoking-another-mods-action) |
| Show progress, a log, support Stop, report partial work | [Runs](03-runs.md) |
| Read, create or change files | [Vault files](04-vault-files.md) |
| Edit the open note | [Vault files: editing a note that may be open](04-vault-files.md#editing-a-note-that-may-be-open), [Raw app: `editorView`](09-raw-app.md#editorstoreeditorview) |
| Store settings, state or caches | [Mod data](05-mod-data.md) |
| Ask the user for text, a choice or a confirmation | [Dialogs](06-dialogs.md) |
| React to saves, the active tab, the theme | [Events and reactivity](07-events-and-reactivity.md) |
| Add a keyboard shortcut | [Events and reactivity: keyboard shortcuts](07-events-and-reactivity.md#keyboard-shortcuts), [Cookbook: keyboard shortcuts](14-cookbook.md#11-keyboard-shortcuts) |
| Build a panel, a status bar chip or my own modal | [Custom UI](08-custom-ui.md) ([status-bar chip](08-custom-ui.md#a-status-bar-chip), [themed modal](08-custom-ui.md#a-themed-modal-dialog)) |
| Put something on a built-in screen (Today, the note list, Files, the sidebar) | Possible from plain JS: a rail button, a note or folder menu item ([Rail registries](08-custom-ui.md#rail-registries)), DOM mounted into an app region (raw selectors, [Mounting into app regions](08-custom-ui.md#mounting-into-app-regions)), a generated note the user opens. **Not possible:** a Today section, a navigator, a lens or a folder creator, which need a Svelte component the app renders ([Rail registries](08-custom-ui.md#rail-registries)). Say so before building a substitute |
| Use daily notes, typed notes, frontmatter, the editor | [Raw app](09-raw-app.md) |
| Create a typed note ("a person note", "a meeting note") | [Raw app: `createTypedNote`](09-raw-app.md#createtypednote), [Cookbook: typed note](14-cookbook.md#17-create-a-typed-note-from-an-input-action) |
| Turn a typed title into a safe file name | [Vault files: `safeName`](04-vault-files.md#note-names-safename) |
| Write a wikilink | [Vault files: Writing a wikilink](04-vault-files.md#writing-a-wikilink) |
| Ask the user for a folder | [Cookbook: folder picker](14-cookbook.md#7-pick-a-note-from-the-index-and-a-folder-with-manual-entry) (`pickFolder`, raw only for the system folder setting; the recipe gives the stable-only variant and its cost), or `run.target` from a folder menu ([Actions: run.target](02-actions-and-entry-points.md#runtarget)) |
| Change or move many notes, with a confirm, progress and **Stop** | [Cookbook: batch over a folder](14-cookbook.md#9-batch-over-a-folder), [bulk move](14-cookbook.md#10-move-notes-in-bulk-with-collision-handling), [Runs: Stop](03-runs.md#stop) |
| Generate a report note the user can also write in | [Cookbook: owned block](14-cookbook.md#8-generated-report-with-an-owned-block) |
| Keep a timer or other state across reloads and restarts | [Cookbook: a timer that survives reloads](14-cookbook.md#13-a-timer-that-survives-reloads), [Mod data](05-mod-data.md) |
| Stamp a property when a note is saved | [Cookbook: stamp on save](14-cookbook.md#20-stamp-a-property-on-save-safely), [Events: avoiding save loops](07-events-and-reactivity.md#avoiding-save-loops) |
| Show a live value derived from the active note | [Cookbook: a live stat of the active note](14-cookbook.md#18-a-live-stat-of-the-active-note) |
| Copy text to the clipboard | [Cookbook: copy to the clipboard](14-cookbook.md#19-copy-to-the-clipboard) |
| Read tasks and their statuses | [Querying the index: Tasks](10-querying-the-index.md#tasks) |
| Query notes, tasks and properties | [Querying the index](10-querying-the-index.md) |
| Call an external API | [Network and platform](11-network-and-platform.md) (`fetchText`) |
| Type-check `main.js`, use TypeScript or packages | [Types, build and test](12-types-build-and-test.md#type-checking-a-plain-mainjs), [building from TypeScript](12-types-build-and-test.md#building-a-mod-from-typescript) |
| Test a mod | [Types, build and test: testing in vitest](12-types-build-and-test.md#testing-in-vitest) |
| Look up one member's signature or error | [API reference](13-api-reference.md) |
| Copy a proven recipe | [Cookbook](14-cookbook.md) |
| Understand an error message or find a log | [Errors and debugging](15-errors-and-debugging.md) ([message catalog](15-errors-and-debugging.md#error-message-catalog)) |
| Check a mod before handing it over | [Pitfalls checklist](16-pitfalls-checklist.md) |

## Files in this reference

| File | Contents |
|------|----------|
| [README.md](README.md) | This page: what a mod is, a minimal mod, the golden rules, the tiers, which API to use |
| [01-anatomy-and-loading.md](01-anatomy-and-loading.md) | Folder layout, every manifest rule, the exact `main.js` rewrite, lifecycle, unload order, reload on save, enable flags, Labs rows |
| [02-actions-and-entry-points.md](02-actions-and-entry-points.md) | `addAction`, `addRailButton`, icons, the picker, `labs.place` (palette and menus), `run.target`, `modCommandsStore` |
| [03-runs.md](03-runs.md) | The run object and run view: states, log and progress, one live run per action, Stop and cancellation, partial work |
| [04-vault-files.md](04-vault-files.md) | `ctx.vault` and `ctx.workspace`, path rules, editing a note that may be open, index lag, rename and delete side effects, error shapes |
| [05-mod-data.md](05-mod-data.md) | `loadData` / `saveData`, corrupt files, the refusal state, settings and cache patterns, migrations |
| [06-dialogs.md](06-dialogs.md) | `run.ui` and `ctx.ui`: every method, validation, keys, queueing, abort, wizard patterns |
| [07-events-and-reactivity.md](07-events-and-reactivity.md) | `ctx.watch`, `ctx.onNoteSaved`, `ctx.onNoteMoved`, `ctx.onNoteCreated`, `ctx.theme.onChange`, `ctx.register`, `ctx.signal`, timers, shortcuts, save loops |
| [08-custom-ui.md](08-custom-ui.md) | Building DOM UI: theme colors and CSS variables, modals, mounting into the app, status chips, rail registries, cleanup |
| [09-raw-app.md](09-raw-app.md) | `ctx.app` member by member: signatures, side effects, failures, the CodeMirror view, frontmatter, daily and typed notes |
| [10-querying-the-index.md](10-querying-the-index.md) | `ctx.kb()`: snapshot and lag, the QueryJS subset for mods, page fields, absolute paths, scoping and cost |
| [11-network-and-platform.md](11-network-and-platform.md) | `fetch` and the exact allowed hosts, browser APIs, clipboard, timers, main-thread limits |
| [12-types-build-and-test.md](12-types-build-and-test.md) | JSDoc type checking with the `.d.ts`, a standalone esbuild setup, the bundle guard, testing with a fake `ctx` |
| [13-api-reference.md](13-api-reference.md) | Every `ctx` and run member in one place: signature, return, rejections, tier |
| [14-cookbook.md](14-cookbook.md) | Complete plain-JS recipes: daily-note append, carry tasks, reports, batches with confirm and Stop, frontmatter, pickers, shortcuts, fetch |
| [15-errors-and-debugging.md](15-errors-and-debugging.md) | Every error message, where errors surface, log tags and trace records, devtools, a debugging workflow |
| [16-pitfalls-checklist.md](16-pitfalls-checklist.md) | A pre-flight checklist and the pitfalls list (symptom, cause, fix) |

## Example mods

Each folder is a complete mod. Copy it to `<vault>/_system/mods/<id>/` (the folder name must stay the same) and turn on **Vault mods**.

| Example | Shows |
|---------|-------|
| [hello](../../examples/mods/hello/) | A toast action; an input action that creates a note and opens it, with no run output so its run view closes |
| [daily-journal](../../examples/mods/daily-journal/) | An input action that appends a timestamped line to today's daily note, through the editor when the note is open, else read and write; palette placement |
| [note-tools](../../examples/mods/note-tools/) | Note-menu and palette actions using `run.target` with an active-note fallback captured before awaits; a frontmatter toggle with `updateNoteFrontmatter`; rename through `run.ui.prompt` |
| [folder-report](../../examples/mods/folder-report/) | A folder-menu action: recursive `vault.list` walk, progress, Stop, confirm, a generated report note with an owned block that keeps user text, then opens it |
| [dialogs-tour](../../examples/mods/dialogs-tour/) | Every `run.ui` method in one wizard, with cancellation handling |
| [click-counter](../../examples/mods/click-counter/) | `loadData` / `saveData` with corrupt-file handling and a settings picker |
| [status-chip](../../examples/mods/status-chip/) | Custom DOM UI with theme CSS variables, `ctx.watch` on the active tab, `ctx.theme.onChange`, a timer, full cleanup |

## Related

- [Vault Mods](../28-mods.md): the user guide, including how to turn mods on
- [QueryJS](../13-queryjs.md): the full API behind `ctx.kb()`
