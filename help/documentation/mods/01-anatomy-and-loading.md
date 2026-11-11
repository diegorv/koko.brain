# Mod Anatomy and Loading

What a mod folder contains, how Kokobrain validates `manifest.json`, exactly how it turns `main.js` into a running mod, and what happens at load, unload, reload, and when mods are switched on or off. For the user-facing overview, see [Vault Mods](../28-mods.md). For the index of this reference, see [README](README.md).

## Folder layout

```
<vault>/
  _system/
    mods/
      <mod-id>/
        manifest.json     required
        main.js           required
        README.md         optional, ignored by the loader
        anything-else.js  optional, ignored by the loader
  .kokobrain/
    mods/
      <mod-id>/
        data.json         written by ctx.saveData (see 05-mod-data.md)
```

- The mods folder is always `_system/mods/`, relative to the vault root. It does not follow the templates "system folder" setting.
- Every **directory** directly under `_system/mods/` is treated as a mod. Files directly in `_system/mods/` are ignored.
- The folder name must equal the manifest `id`. A folder whose name can never be a valid id (uppercase, `_`, a dot such as `.git` or `my.mod`, spaces) still gets a row in Labs, as an **Error**.
- A folder whose name contains a `.` is never reloaded by the file watcher. Its Error row stays until the next start of the mods host (Vault mods off and on, or reopening the vault) or a change to `_system/mods/` itself, even after you delete the folder.
- Only `manifest.json` and `main.js` are read. The loader never reads other files in the folder, and changing them does not reload the mod. Code in other files cannot be loaded at run time (there is no `import`): paste it into `main.js`, or bundle it with your own build (see [Types, build and test](12-types-build-and-test.md)).
- The mod's data lives outside the mod folder, in `.kokobrain/mods/<id>/data.json`, a dot-folder the watcher and the index skip. Deleting the mod folder does not delete its data. See [Mod data](05-mod-data.md).
- With the default system folder setting (`_system`), nothing under `_system/` is a page for `ctx.kb()` and QueryJS: `kb.pages()` leaves the system folder out.
- Mod code (any file under `_system/mods/` that is not `.md`, `.markdown` or `.view`) is left out of index rebuilds, and a `ctx.vault.write` to such a file skips the after-save steps, so `onNoteSaved` does not fire for it.

## The manifest

```json
{
	"id": "daily-log",
	"name": "Daily log",
	"version": "0.1.0",
	"description": "Appends a timestamped line to today's daily note",
	"author": "Me",
	"minAppVersion": "1.2.3",
	"color": { "light": "#2563eb", "dark": "#60a5fa" },
	"ruleActions": ["append"]
}
```

### Fields

| Field | Required | Type and rule | Used for |
|-------|----------|---------------|----------|
| `id` | yes | String, at most 64 characters, matching `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase letters and digits joined by single hyphens), exactly equal to the folder name (case-sensitive) | `ctx.mod.id`, the data folder, command ids `mod:<id>:action:<actionId>`, the `MOD:<id>` log tag |
| `name` | yes | Non-empty string (a string of spaces passes) | Labs row, the prefix of every `ctx.notify` toast and action failure toast, the palette and menu labels, the caption of `ctx.ui` dialogs, `ctx.mod.name` |
| `version` | yes | Non-empty string, free form | Labs row, `ctx.mod.version` |
| `description` | no | String (empty allowed) | Validated only |
| `author` | no | String (empty allowed) | Validated only |
| `minAppVersion` | no | String matching `^\d+\.\d+\.\d+$` (`1.2.3-beta` and `1.2` fail) | Validated only. Never compared with the app version |
| `color` | no | Object with both `light` and `dark`, each `#rgb` or `#rrggbb` (case-insensitive) | Icon color of every rail button of the mod: `light` on light themes, `dark` on dark ones, following theme changes at once |
| `ruleActions` | no | Array of non-empty strings, the local ids of the mod's actions (empty array allowed) | The actions an [Auto Organize rule](../22-auto-organize.md#running-a-mod-action) can run. An id the mod never registers is ignored. See [Actions a rule can run](02-actions-and-entry-points.md#actions-a-rule-can-run) |

- Unknown top-level keys are dropped silently, and so are unknown keys inside `color`.
- "Present" means the key exists with any value other than `undefined`. `null` is a value: `"author": null` fails with `author must be a string`.
- Colors are stored as written (not normalized). `#rgba`, `#rrggbbaa`, color names, `rgb()` and `oklch()` are rejected.
- `description`, `author`, `minAppVersion` and `ruleActions` are not visible to the mod: `ctx.mod` is only `{ id, name, version, dir }`, with `dir` = `_system/mods/<id>`.

### Validation order and messages

Checks run in this order and the first failure wins. Every message is `_system/mods/<folder>: manifest.json ` followed by the text in the table.

| # | Check | Message tail (verbatim) |
|---|-------|-------------------------|
| 1 | The text is not valid JSON | `is not valid JSON` |
| 2 | The value is not an object (or is `null` or an array) | `must be a JSON object` |
| 3 | `id` is not a string | `id must be a string` |
| 4 | `id` is longer than 64 characters | `id must be at most 64 characters` |
| 5 | `id` fails the pattern (also `""`, uppercase, `_`, dots, spaces, leading, trailing or double hyphens) | `id "<id>" must be lowercase letters and digits, joined by single hyphens` |
| 6 | `id` differs from the folder name | `id "<id>" does not match the folder name` |
| 7 | `name` is not a string or is `""` | `name must be a non-empty string` |
| 8 | `version` is not a string or is `""` | `version must be a non-empty string` |
| 9 | `description` is present and not a string | `description must be a string` |
| 10 | `author` is present and not a string | `author must be a string` |
| 11 | `minAppVersion` is present and not a string matching `1.2.3` | `minAppVersion must look like 1.2.3` |
| 12 | `color` is present and not an object (or is `null` or an array) | `color must be an object with light and dark` |
| 13 | `color.light` is not a string matching the hex pattern | `color.light must be a hex color like #d946ef` |
| 14 | `color.dark` is not a string matching the hex pattern | `color.dark must be a hex color like #d946ef` |
| 15 | `ruleActions` is present and not an array of non-empty strings | `ruleActions must be a list of action ids` |

Example:

```
_system/mods/foo: manifest.json id "bar" does not match the folder name
```

A mod whose manifest fails is listed in Labs as **Error** under its folder name, with an empty version and no stack trace.

## How the loader evaluates main.js

`main.js` looks like an ES module but is not loaded as one. The loader reads it as UTF-8 text, rewrites one line, and runs the result as the body of a function.

### The exact rewrite

1. It counts the lines that match `/^export\s+default\s+/m`: `export` at the very start of a line (column 0), whitespace, `default`, then at least one more whitespace character.
   - Zero matches throws `main.js: found no "export default"; a mod default-exports an object with onload`.
   - More than one throws `main.js: found <N> "export default" lines; use exactly one`.
2. It replaces the first match (the text `export`, the whitespace, `default` and all the whitespace after it) with `__kokobrainModExports.default = `. Nothing else in the file changes. The line count stays the same unless that whitespace spans a line break (`export default` alone on its line), in which case later lines shift up by one.
3. It compiles the result with `new Function('__kokobrainModExports', ...)`, prefixing `"use strict";` on the same line as your first line and appending `//# sourceURL=kokobrain-mods/<id>/main.js` on a new last line.
4. If compiling throws a `SyntaxError` whose message mentions `import` or `export`, it is replaced by a new `SyntaxError` with the message `main.js: use exactly one "export default" and no "import"; a mod is one file` (the engine's original message is lost). Any other compile error (for example `Unexpected token '}'`) passes through unchanged.
5. It calls the function once with an empty holder object. Your top-level code runs now, synchronously. Anything it throws propagates as the load error.
6. It reads `holder.default`. Unless it is a non-null object whose `onload` is a function, it throws `main.js: the default export must be an object with an onload function`.

So this file:

```js
const GREETING = 'Hello';

export default {
	onload(ctx) {
		ctx.notify(GREETING);
	},
};
```

runs as this function body:

```js
"use strict";const GREETING = 'Hello';

__kokobrainModExports.default = {
	onload(ctx) {
		ctx.notify(GREETING);
	},
};
//# sourceURL=kokobrain-mods/hello/main.js
```

### The export default rule

Detection is a line-start regular expression over the raw text, not a JavaScript parser. Consequences:

| Source | Result |
|--------|--------|
| `export default {` at column 0 | Accepted |
| `export default mod;` on its own line, after `const mod = { ... };` | Accepted |
| `export default` then a line break, then `{` on the next line | Accepted (the line break counts as the whitespace) |
| `export default /** @type {...} */ ({ ... });` | Accepted (a JSDoc cast after `export default` is fine) |
| `  export default {` or a tab before it (indented) | `found no "export default"` |
| `export default{` (no whitespace after `default`) | `found no "export default"` |
| `const mod = { ... }; export default mod;` on one line | `found no "export default"` (not at the start of a line) |
| An empty file | `found no "export default"` |
| `// export default is required` (a line comment) | Not counted: the line starts with `//` |
| `const s = "export default";` (in a string, mid-line) | Not counted |
| A line inside a `/* ... */` block comment or a template literal that starts with `export default` | **Counted.** With the real one also present you get `found 2 "export default" lines; use exactly one`. If it is the only match, the rewrite lands inside the comment or string and the load fails |
| `export default {...}; export default {};` on one line | Counted once, then the second `export` is a syntax error, reported as the one-file message |
| `export default function foo() {}`, `export default async function`, `export default class Foo {}`, an arrow function | Rewritten into an assignment, so it parses, then rejected with `the default export must be an object with an onload function` |
| `export default 42;`, `export default null;`, an object without `onload` | `the default export must be an object with an onload function` |

Because `export default` becomes an assignment, it declares no name: after `export default function foo() {}` there is no `foo` in scope.

> [!TIP]
> The safest shape for a long mod: declare the object, then put `export default mod;` alone on the last line, starting at column 0.

### import and other export statements

There is no separate `import` check: the loader relies on the engine's `SyntaxError`, then rewords it.

| Source | Result |
|--------|--------|
| `import x from 'y';` | `main.js: use exactly one "export default" and no "import"; a mod is one file` |
| `import.meta.url` anywhere | Same message |
| `export const a = 1;`, `export { a };`, `export function f() {}` | Same message |
| `import` or `export` inside a string or a comment | Fine |
| A dynamic `import('...')` expression inside a function | Passes the loader (it is valid syntax in a function body). The app's content security policy allows scripts only from the app itself, so it cannot load code from a URL, a `blob:` URL or the vault. Not verified in the shipped app; do not use it |

A mod is one file. To use packages or several source files, bundle them into one `main.js` that ends with a single column-0 `export default` (see [Types, build and test](12-types-build-and-test.md)).

### What is in scope

`main.js` is a function body, not a module:

- **Scope:** the global scope (`window`, `document`, `fetch`, `localStorage`, `setTimeout`, ...) plus one parameter named `__kokobrainModExports`. It closes over nothing from the app. Do not declare a name `__kokobrainModExports`.
- **Top-level declarations are private to the mod.** `const`, `let`, `var`, `function` and `class` at the top level stay local to that function and do not leak onto `window`. Closures over them live as long as the mod object does.
- **Strict mode, always.** Assigning an undeclared name throws `ReferenceError`. `this` at the top level is `undefined`.
- **No top-level `await`.** It is a `SyntaxError` that passes through unchanged (wording depends on the engine). Put async work inside `onload` or an action.
- **Top-level `return` is legal** (it is a function body). It stops the file before the assignment, so the load fails with `the default export must be an object with an onload function`.
- **Top-level code runs once per load, before `onload`, with no `ctx`.** It cannot register cleanups. Keep it to constants and pure functions; start timers, listeners and DOM work inside `onload` and register their cleanup there.
- **Each load evaluates the file again.** A reload creates new top-level variables; the old ones are gone. Anything you put on `window`, `document` or `localStorage` survives the reload unless your cleanup removes it.
- **Shared with the app.** Mod code runs in the app's web view on the main thread, with no sandbox. A long synchronous loop freezes the whole app.

### Encoding and line endings

- The file is decoded as UTF-8. A leading byte order mark is removed by the decoder.
- `\r\n` line endings work: `^` also matches after a `\r`.
- Stack traces: the `sourceURL` comment names the file `kokobrain-mods/<id>/main.js`. In the shipped macOS web view, stacks may show function names only, without file and line (see [Stack traces](15-errors-and-debugging.md#stack-traces)).

## The default export

The default export must be an object with an `onload` function. `onunload` is optional.

| Member | Type | Called |
|--------|------|--------|
| `onload(ctx)` | Function, may be `async` | Once per load, right after the file is evaluated, as a method: `this` is the exported object |
| `onunload()` | Optional function, may be `async` (not awaited) | Once per unload, with no arguments, as a method. Skipped when `onload` failed |

- Only `onload` is checked at load time. If `onunload` exists but is not a function, the unload throws a `TypeError`, reported as an `onunload failed` toast.
- `onload` may be a getter or an inherited method: the loader reads `mod.onload` and checks `typeof`.
- Use method syntax (`onload(ctx) { ... }`) if you want `this`. Arrow functions do not bind `this`.

A class works when you export an **instance**:

```js
class CounterMod {
	constructor() {
		this.count = 0;
	}

	onload(ctx) {
		ctx.addAction({
			id: 'count',
			title: 'Count',
			run: () => {
				this.count += 1;
				ctx.notify(`Count: ${this.count}`);
			},
		});
	}
}

export default new CounterMod();
```

`export default CounterMod;` (the class itself) and `export default class CounterMod {}` are rejected: their `typeof` is `function`.

To type-check `main.js` with JSDoc, see [Types, build and test](12-types-build-and-test.md).

## Lifecycle

| Moment | What happens |
|--------|--------------|
| Vault opens with mods on, Vault mods turned on in Labs, a mod switched on, a mod folder added | The mod is read, evaluated and `onload(ctx)` is called |
| `onload` resolves | Labs shows **Loaded** with the load time |
| A loaded mod's `onNoteSaved`, `watch` or `theme.onChange` callback throws or rejects | Labs shows **Last callback error** under **Loaded**; the first failure of the load also toasts. The next load clears it |
| `onload` throws or rejects | Registrations made so far are undone, `onunload` is **not** called, Labs shows **Error**, a toast shows the message |
| `main.js` or `manifest.json` saved | The mod waits for its live runs, unloads, then loads the new files |
| Mod switched off, mod folder or manifest deleted, Vault mods turned off, vault closed or switched | The mod unloads at once; its live runs are aborted |
| After unload | Every `ctx` function throws `Mod "<id>" is unloaded` |

### When mods load

- **At vault open**, mods start one macrotask after the vault's initialization returns. By then the main vault index and the file tree builds have finished and the index is marked ready (unless that build failed: mods still start then, with the index not ready). Secondary work is **not** guaranteed to be done: the tags, properties and icons builders, the full-text search build and semantic indexing may still be running. If you need index data in `onload`, read [Querying the index](10-querying-the-index.md#freshness-and-lag) first.
- If the vault initialization stopped early (for example the vault database could not open), mods do not start.
- Nothing starts unless **Vault mods** is on for this vault (see [Enabling mods](#enabling-mods)).
- A missing `_system/mods/` folder means zero mods. The host still listens to the watcher, so creating the folder and a mod in it later loads that mod.
- If `_system/mods/` exists but cannot be listed, no mod starts. The failure is reported as an app error (developer console, debug log, Sentry when enabled), not as a toast or a Labs row.

### Load order and concurrency

All mods load **at the same time**. Folder names are sorted only to decide the order in which loads are started; each load then waits on its own file reads, so the order in which top-level code runs and `onload` is called follows read completion and is **not** guaranteed. One broken mod never blocks another.

Never rely on another mod being loaded before yours, or on load order between mods. To call another mod's action, look it up when you need it, not in `onload` (see [Invoking another mod's action](02-actions-and-entry-points.md#invoking-another-mods-action)).

### onload

- `onload` receives `ctx` (see [API reference](13-api-reference.md)). It may be `async`.
- The mod is live as soon as `onload` is **called**, not when it settles. Actions, rail buttons and other registrations take effect at once, even while an async `onload` is still pending, and `ctx` is usable throughout.
- There is no timeout. An `onload` that never settles leaves a first-time load with **no Labs row** and no load time. It does not block reloads of the mod.
- Keep `onload` fast: register actions and UI, and start slow work (index queries, network) without awaiting it, with its own error handling. The Labs load time measures `onload` (see [Load time](#load-time)).

### When onload fails

If `onload` throws synchronously or its promise rejects:

1. The mod is removed from the live mods and unloaded **without calling `onunload`**: its `ctx.signal` aborts, and every cleanup registered so far runs in reverse order (actions, rail buttons, menu and palette placements, watchers, and functions passed to `ctx.register`).
2. Labs shows **Error** with `_system/mods/<id>: onload failed: <message>` and the stack, when the thrown value was an `Error`.
3. A toast shows the same message (subject to [toast dedupe](#toast-dedupe)).

Because `onunload` is skipped on a failed `onload`, put cleanup in `ctx.register(...)` (or rely on the disposers the host registers for you), not in `onunload`. Example: a duplicate action id inside `onload` fails the whole load with `_system/mods/dup: onload failed: Mod "dup": duplicate action id "x"`, and the buttons registered before it are removed.

### Unload order

An unload runs these steps synchronously, in this order:

1. **The mod is marked unloaded.** From here on every `ctx` function throws `Mod "<id>" is unloaded`.
2. **`ctx.signal` aborts.** Its `abort` listeners run now. Every live run of the mod is aborted with it: the run is marked **Cancelled**, and its open and queued `run.ui` dialogs reject with a `DOMException` named `AbortError`.
3. **The mod's picker closes** if it shows the action list or a text field. A run view stays open on its Cancelled result (a full stop of the mods host closes it too).
4. **The mod's `ctx.ui` dialogs close**, open and queued, resolving with their cancel value (`alert`: `undefined`, `confirm`: `false`, `prompt` and `pick`: `null`). See [Dialogs](06-dialogs.md#stop-unload-and-cancellation).
5. **`onunload()` is called**, unless `onload` failed. A synchronous throw, or a rejection of the promise it returns, toasts `_system/mods/<id>: onunload failed: <message>`. An async `onunload` is **not awaited**.
6. **Every cleanup runs, in reverse order of registration.** One list holds the functions passed to `ctx.register` and the disposers the host keeps for `addAction`, `addRailButton`, `watch`, `onNoteSaved`, `onNoteMoved`, `theme.onChange` and `labs.place`, so they interleave by when you registered them. A cleanup that throws toasts `_system/mods/<id>: cleanup failed: <message>`, and the loop continues with the next one.

Notes:

- A second unload of the same instance does nothing.
- `ctx.register(value)` does not check that `value` is a function. A non-function fails at step 6 with a `cleanup failed` toast.
- Disposers returned by `addAction`, `addRailButton` and the others run once, whether you call them or the unload does. A function passed to `ctx.register` is called once by the unload, even if you also call it yourself; make it idempotent.
- When the whole host stops (Vault mods off, vault closed or switched), mods unload in reverse of the order in which their `onload` was called (not the order it settled), then the picker and run view close and the Labs list empties.
- What the host does **not** undo: timers, DOM listeners, DOM nodes, `MutationObserver`s, keys in `localStorage`, properties on `window`, and changes made through `ctx.app`. Register a cleanup for each (see [Events and reactivity](07-events-and-reactivity.md#ctxregister-and-ctxsignal-cleanup-and-order)).

### onunload runs with a dead ctx

`onunload` (step 5) and the cleanups (step 6) run **after** the mod is marked unloaded (step 1). Inside them:

| Works | Throws `Mod "<id>" is unloaded` (the async ones reject with it) |
|-------|----------------------------------|
| `ctx.signal` (already aborted), `ctx.mod`, `ctx.apiVersion`, objects you took from `ctx.app` earlier | `ctx.notify`, `ctx.log`, `ctx.register`, `ctx.saveData`, `ctx.loadData`, every `ctx.vault.*`, `ctx.query.*`, `ctx.workspace.*`, `ctx.ui.*`, `ctx.theme.current`, `ctx.theme.onChange`, `ctx.addAction`, `ctx.addRailButton`, `ctx.watch`, `ctx.onNoteSaved`, `ctx.labs.place`, reading `ctx.app` or `ctx.kb`, calling `ctx.kb()` |

So a mod cannot save state, write a note, log or toast from `onunload`. Save state when it changes (see [Mod data](05-mod-data.md)). Use `onunload` and cleanups only for work that needs no `ctx`: removing DOM nodes, clearing timers, removing listeners.

```js
export default {
	onload(ctx) {
		const chip = document.createElement('div');
		chip.textContent = 'Hello';
		document.body.append(chip);
		const timer = setInterval(() => {
			chip.textContent = new Date().toLocaleTimeString();
		}, 1000);
		// No ctx calls in here: ctx is already dead when this runs.
		ctx.register(() => {
			clearInterval(timer);
			chip.remove();
		});
	},
};
```

An async `onunload` is worse: the cleanups run right after it starts, so anything after its first `await` runs after the cleanups, still with a dead `ctx`.

The same guard fires when the open vault changes: every `ctx` call made for vault A throws as soon as another vault is open, even before the unload finishes. A slow action started in vault A cannot write into vault B through `ctx`.

## Reload on save

While mods are on, the host listens to the vault file watcher. It sees saves from Kokobrain's editor, from other editors, from `git`, and from a mod's own `ctx.vault.write` (a mod can rewrite, and so reload, itself). The watcher batches changes and reports them about 500 ms after the last one.

### What triggers a reload

| Change | Effect |
|--------|--------|
| `_system/mods/<id>/main.js` created, changed or deleted | Reload of that mod. A deleted `main.js` gives an Error row: `_system/mods/<id>: cannot read main.js: <error>` |
| `_system/mods/<id>/manifest.json` created or changed | Reload of that mod |
| `_system/mods/<id>/manifest.json` deleted (folder kept) | The mod unloads at once (its runs are aborted, no waiting) and its row disappears |
| Folder `_system/mods/<id>/` added | The mod loads |
| Folder `_system/mods/<id>/` deleted | The mod unloads at once and its row disappears |
| Any other file in the mod folder (helper `.js`, `README.md`, subfolders) | Nothing |
| A file directly in `_system/mods/` whose name has a `.` | Nothing |
| `_system/mods/` itself, or `_system/`, created, deleted or renamed | **Every** mod reloads, changed or not: the host lists the folder again and reloads every folder on disk and every folder it knew |
| Anything inside a dot-folder (for example `.kokobrain/`) | Never reported by the watcher |
| `main.js` or `manifest.json` of a switched-off mod | The row is refreshed from the manifest; `main.js` is not run |

Typing in `main.js` inside Kokobrain triggers the editor's autosave (2 s after the last keystroke, at most 10 s into continuous typing), and each save reloads the mod. Half-typed code shows the same error repeatedly; see [Toast dedupe](#toast-dedupe).

### The reload sequence

1. The host checks that `manifest.json` exists. If that check itself fails (a file system error), the running mod is left as it is and the failure goes to the app log.
2. If the manifest exists, the host **waits for every live run of the mod to end**. The run view shows **Reload pending**. Press **Stop** to reload sooner. A run with no output that is still working also holds the reload, with nothing visible. A newer save during the wait restarts the wait, and the reload then reads the newest files once.
3. The old instance **unloads** (the full [unload order](#unload-order), with `onunload`).
4. If the manifest is gone, the row is removed and the reload ends.
5. If the mod is switched off, it is listed as **Disabled**.
6. Otherwise the files are read, evaluated, and `onload` is called. The reload does not wait for the new `onload` to settle, so a hanging `onload` never blocks the next reload.

Reloads of one mod never overlap. Saves that arrive during a reload collapse into one more reload that reads the newest files. Reloads of different mods are independent.

### No rollback

The old instance is unloaded **before** the new files are read. If the new manifest or code fails, the mod stays unloaded: its rail buttons, actions, palette entries and menu items are gone, Labs shows **Error**, and a toast shows the message. Fix the file and save again. Other mods keep running.

During a reload, the Labs row keeps its previous state and load time until the new result replaces it.

### State across reloads

Each reload evaluates `main.js` again, so top-level variables and closures start fresh. Keep state that must survive in `ctx.saveData` (see [Mod data](05-mod-data.md)), and read it back in `onload` with `ctx.loadData`.

## Enabling mods

### Installing a mod

1. Copy the mod folder (named as its `id`, holding `manifest.json` and `main.js`) so the files sit at `<vault>/_system/mods/<id>/`. From a terminal: `mkdir -p "<vault>/_system/mods" && cp -R <mod-folder> "<vault>/_system/mods/"`. The path is fixed: the app reads mods from `_system/mods/` even when the system folder setting names another folder.
2. Turn on **Settings > Labs > Vault mods** for that vault, if it is off ([The Vault mods flag](#the-vault-mods-flag)).
3. In the mod's row under **Settings > Labs**, leave its switch on (a new mod is on by default: [The per-mod switch](#the-per-mod-switch)).
4. The row shows **Loaded** ([Labs status rows](#labs-status-rows)). An **Error** row names the cause; fix the file in the vault and save, and the mod reloads.

To update an installed mod, copy the new `main.js` over the old one: the save reloads it ([Reload on save](#reload-on-save)).

### The Vault mods flag

**Settings > Labs > Vault mods** turns mods on for the open vault. Turning it on loads every mod; turning it off unloads every mod (runs are aborted). No restart is needed.

Both switches live in the app's local storage on this machine, never in the vault (not in `.kokobrain/settings.json`):

| Key | Value | Default |
|-----|-------|---------|
| `kokobrain:mods-enabled-vaults` | JSON array of absolute vault paths with mods on, for example `["/Users/me/kokobrain-vaults/Notes"]` | Missing, not valid JSON or not an array: `[]`, mods off everywhere (non-string entries are dropped) |
| `kokobrain:mods-disabled` | JSON object mapping an absolute vault path to the folder names of switched-off mods, for example `{"/Users/me/kokobrain-vaults/Notes": ["noisy-mod"]}` | Missing, not valid JSON or not an object: `{}`, every mod on (a vault whose value is not an array, and non-string names, are dropped) |

- The vault is matched by the exact path string, with no normalization. A moved or renamed vault, a different symlink path, or a trailing slash counts as a different vault, so its mods start off. A vault copied or cloned from elsewhere always arrives with mods off.
- If saving the flag fails, the toast `Could not save the Vault mods setting` appears and nothing else changes.
- Turning the flag off keeps the per-mod switches.

### The per-mod switch

Each row in Labs has its own switch.

- It is keyed by **folder name**, per vault. A folder not listed is on, so a new mod is on by default.
- **Off** unloads only that mod, at once: runs are aborted without waiting, `onunload` is called, and the row becomes **Disabled** (keeping its name and version). A load still in flight for that folder drops its result.
- **On** loads only that mod. It does nothing if the mod is already live, or if Vault mods is off.
- A switched-off mod's `main.js` is never read or run. Its `manifest.json` is read only to show its name; an invalid manifest lists it under the folder name, without an error.
- A mod in the **Error** state shows its switch on. Turning it off replaces the error row with **Disabled**.
- Switch entries are never cleaned up: deleting a switched-off mod and later creating a folder with the same name starts it switched off.
- If saving the switch fails, the toast `Could not save the setting for <name>` appears and nothing else changes.

## Labs status rows

The list under **Vault mods** appears only while the flag is on. With no mod folders it reads `No mods in _system/mods/`. Rows are sorted by folder name.

| State | Shows |
|-------|-------|
| **Loaded** | Name, version and load time, for example `Loaded · 42 ms` |
| **Error** | The load error message and, when the thrown value was an `Error`, an expandable **Stack trace** |
| **Disabled** | Name and version from the manifest (or the folder name) |

- On a first load, the row appears only when `onload` settles. A load overtaken by a newer one (a save, a switch, a stop) does not touch the row.
- An Error row uses the manifest's id, name and version when the manifest was valid, else the folder name and an empty version.
- Manifest errors and thrown non-`Error` values (`throw 'x'`) have no stack.

### Load time

The load time is wall time from just before `main.js` is evaluated (its top-level code) until `onload` settles, rounded to whole milliseconds. File reads are excluded. It shows as `Loaded · 42 ms`, or `Loaded · < 1 ms` when it rounds to zero.

- At vault open all mods load together, so a mod whose `onload` awaits something includes time spent while other mods ran.
- A reload or a switch off and on replaces the time.
- The `load-result` record in the debug log (`MOD-HOST` tag) has a different `elapsedMs`, which includes the file reads. See [Host execution trace](15-errors-and-debugging.md#host-execution-trace-and-run-messages).

## Load errors and toasts

Load errors, in the order a load can hit them. `<dir>` is `_system/mods/<folder>`.

| Phase | Message |
|-------|---------|
| Reading the manifest | `<dir>: cannot read manifest.json: <error>` |
| Validating the manifest | `<dir>: manifest.json <tail>` (see [Validation order and messages](#validation-order-and-messages)) |
| Reading the code | `<dir>: cannot read main.js: <error>` |
| Evaluating the code | `<dir>: <message>`: a loader message (`main.js: found no "export default"; ...`), an engine syntax error (`Unexpected token '}'`), or whatever the top-level code threw. There is no phase word |
| Running `onload` | `<dir>: onload failed: <message>` |

- `<error>` and `<message>` are `err.message` for an `Error`, else `String(err)`. File system errors are plain strings, passed as they come.
- Each load error updates the Labs row, is written to the debug log under `MOD:<id>` (or `MOD:<folder>` when the manifest could not be read or was invalid), and is toasted.
- In the debug log file the error object is serialized as `{}`, so the stack is only in the Labs row (and in the developer console when Debug mode is on). See [Errors and debugging](15-errors-and-debugging.md).
- Load errors never go to Sentry.

### Toast dedupe

A load error is toasted only when its message differs from the last one toasted for the same vault and folder. The Labs row and the debug log update every time.

- The memory for a folder is cleared only by a successful load of that folder, or by its manifest disappearing on a reload.
- It survives turning Vault mods off and on, switching the mod off and on, and closing and reopening the vault in the same app session. So fixing nothing and toggling does not show the toast again; quitting the app clears it.
- Not deduped: `onunload failed` and `cleanup failed` toasts, action failure toasts (`<name>: <title> failed: <message>`), and `ctx.notify`.

## Related

- [README](README.md): the fast path and the golden rules
- [Actions and entry points](02-actions-and-entry-points.md): what to register in `onload`
- [Runs](03-runs.md): what happens to live runs on Stop, unload and reload
- [Mod data](05-mod-data.md): state that survives reloads
- [Events and reactivity](07-events-and-reactivity.md): cleanup of listeners and timers
- [Errors and debugging](15-errors-and-debugging.md): every message and where it appears
- [Vault Mods](../28-mods.md): the user guide
