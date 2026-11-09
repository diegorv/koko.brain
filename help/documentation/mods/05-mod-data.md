# Mod Data: `loadData` and `saveData`

Each mod has one JSON value of its own, stored in the vault and read back with `ctx.loadData()`. Use it for settings, counters, caches and any state the mod changes often. This page gives the exact rules (format, ordering, corrupt files, the refusal state, unload) and the patterns that build on them: defaults, schema migration, debounced saves and per-note state. It ends with when `localStorage` is an acceptable alternative.

| Member | Stability |
|--------|-----------|
| `ctx.loadData()`, `ctx.saveData(value)` | **stable** (contract v1) |

## At a glance

| Method | Resolves to | Rejects with |
|--------|-------------|--------------|
| `loadData()` | the saved value, or `null` when there is no file | an `Error` named `ModDataCorruptError` for unparseable data (the file was moved aside first); an `Error` when the file cannot be read or moved; `Mod "<id>" is unloaded` |
| `saveData(value)` | `undefined`, once the value is on disk | `Mod "<id>": saveData needs a value JSON can represent: <problem>`; `Mod "<id>": saveData refused: ...`; an `Error` when the write fails; `Mod "<id>" is unloaded` |

Unlike `ctx.vault`, these two **always reject with a real `Error`**: file system strings are wrapped, so `err.message` is safe here.

## Where the data lives

- **File:** `<vault>/.kokobrain/mods/<mod-id>/data.json`, where `<mod-id>` is the manifest `id` (which equals the mod's folder name). Renaming the mod starts it with no data; the old folder stays.
- **Per vault.** The same mod in two vaults has two separate files. The data travels with the vault folder.
- **Format on disk:** `JSON.stringify(value, ..., '\t')` plus a final newline. Readable and hand-editable.
- **Invisible to the rest of the app.** `.kokobrain/` is a dot-folder: a save reaches neither the vault index, search, file history, Auto Move, the file explorer, `ctx.onNoteSaved` nor the watcher. A save costs one small file write and cannot trigger anything.
- **Not cleaned up.** Deleting a mod folder leaves its data; delete `.kokobrain/mods/<mod-id>/` to remove it. Corrupt copies (below) pile up in the same folder until you delete them.
- **Not in git** if your `.gitignore` lists `.kokobrain/`. Kokobrain does not write a `.gitignore`.
- **Plain text, not a secret store.** Anyone with the vault folder can read it. Do not put API tokens or passwords in it.
- **No size limit**, but the whole value is serialized and the whole file rewritten on every save. Keep it small; recompute large caches instead of storing them.

Edits to `data.json` made by hand while the mod is loaded are not noticed (the watcher ignores the folder). The mod's next `saveData` replaces them with its in-memory value. Edit the file with the mod switched off, or have the mod re-read it in an action.

> [!WARNING]
> Do not read or write `data.json` with `ctx.vault`. A `ctx.vault.write` to it skips the atomic write, the queue and the corrupt-file protection, and, because the file is not under `_system/mods/`, runs the full after-save pipeline (a file history row per write that changes the content).

## `saveData(value)`

### What it accepts

Anything JSON represents without change: plain objects (prototype `Object.prototype` or `null`), arrays, strings, finite numbers, booleans and `null`.

The value is checked and serialized **synchronously at the call**, before the call waits in the queue. Changing the object afterwards does not change what is saved. An unusable value rejects at once with:

```
Mod "<id>": saveData needs a value JSON can represent: <problem>
```

| `<problem>` | Cause |
|-------------|-------|
| `function`, `symbol` | a function or symbol value |
| `NaN`, `Infinity`, `-Infinity` | a non-finite number |
| `undefined` | `undefined` as the whole value or as an array item |
| `a Map`, `a Set`, `a Uint8Array`, `a <ClassName>` | an object whose prototype is not `Object.prototype` or `null` |
| the engine's `TypeError` text | a `BigInt` or a cycle (thrown by `JSON.stringify` itself) |

Each problem below the top level gets ` at "<key>"`, where `<key>` is only the **immediate** property name or array index, not a full path: `{ a: { tags: new Set() } }` gives `a Set at "tags"`, `[1, NaN]` gives `NaN at "1"`.

Accepted and changed by JSON, as usual: an object property set to `undefined` is left out, symbol keys are ignored, `-0` becomes `0`, and a `Date` (or anything with `toJSON`) is saved as what `toJSON` returns (a `Date` becomes its ISO string, or `null` when invalid). It is a string when you load it back.

Top-level `null` is accepted and saved as `null`, but `loadData` then resolves `null`, the same as "nothing saved". Save an object instead.

### Atomic write

The value goes to a temp file next to `data.json` (`data.json.tmp-<pid>-<n>`), which is then renamed over it. If the app crashes mid-write, `data.json` keeps its previous content; a stray temp file may remain and is never read. The write is not forced to the physical disk, so a power cut right after a save can still lose that save. A read-only `data.json` makes the save reject with `write failed for <path>: target is read-only`. Missing folders are created.

### Order: one queue per mod

`loadData` and `saveData` calls of one mod run **one at a time, in call order**:

- The last `saveData` called wins. A mod that saves on every click needs no queue or lock of its own.
- A `loadData` called after a `saveData` waits for it and sees that value.
- A failed call does not stop the ones after it.
- Each loaded instance of the mod has its own queue. A reload starts a fresh one.

So you can fire saves without awaiting each one (`void ctx.saveData(state)`), as long as something reports failures. Awaiting is still the simplest way to know the value is on disk before telling the user "Saved".

## `loadData()`

1. Reads `data.json`.
2. No file: resolves `null`.
3. Valid UTF-8 JSON: resolves the parsed value, a new object on every call. A UTF-8 byte order mark is accepted.
4. Not valid UTF-8, or not valid JSON (an **empty file counts as invalid**): the corrupt-file path below.
5. The file exists but cannot be read (permissions, `data.json` is a folder, a disk error): rejects with an `Error` whose message is the Rust text, for example `read failed for <path>: <OS error>`. The file stays where it is.

`loadData` does not check the **shape** of the value. Valid JSON that is not what your mod expects is returned as is; checking it is your job (see [Safe load](#safe-load)).

### Corrupt files and `ModDataCorruptError`

When `data.json` cannot be parsed, the host never loses it and never lets a save overwrite it:

1. It renames the file, bytes untouched, to `data.corrupt-<epoch milliseconds>.json` in the same folder.
2. It rejects with an `Error` whose message is

   ```
   Mod "<id>": data.json is not valid JSON; its content was kept in .kokobrain/mods/<id>/data.corrupt-<ms>.json
   ```

   with `err.name === 'ModDataCorruptError'` and `err.corruptPath` set to that vault-relative path.
3. The next `loadData` finds no `data.json` and resolves `null`. A later `saveData` writes a fresh file and leaves the corrupt copy alone.

There is no exported class: test `err.name === 'ModDataCorruptError'`, not `instanceof`. (The name is set on the error after it is created, so a stack trace header may still read `Error:`.)

### The refusal state

A load that fails for any other reason leaves `data.json` in place, holding data the mod has not seen. To keep a save from replacing that only copy, `saveData` **refuses** after such a load:

```
Mod "<id>": saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again
```

Nothing is written. Exactly:

| What happened | `saveData` afterwards |
|---------------|-----------------------|
| The mod never called `loadData` | allowed (replaces whatever the file held, parseable or not) |
| `loadData` resolved (a value or `null`) | allowed |
| `loadData` rejected with `ModDataCorruptError` (file moved aside) | allowed |
| `loadData` failed to read the file | **refused** |
| `loadData` found it corrupt but could not move it aside | **refused** (the error is the rename failure, not `ModDataCorruptError`) |
| A later `loadData` succeeds or reports corruption | allowed again |
| The mod reloads | allowed (new instance) |

The refusal is decided when the save reaches the head of the queue, so `loadData()` immediately followed by `saveData()` is judged after that load has settled. `saveData` itself never changes this state.

## Unload and vault change

Once the mod unloads (switched off, reloaded after an edit, deleted, mods turned off, vault closed) or another vault is opened, both calls reject with `Mod "<id>" is unloaded`:

- A `saveData` made after unload rejects at once. A `loadData` made after unload joins the queue and rejects when it reaches the head, without touching the disk.
- A call still **waiting in the queue** rejects when it reaches the head, without touching the disk. A queued save is therefore lost.
- A call already **on disk** may complete even though its promise rejects with the unload error.
- An I/O error that happens after the unload is reported as the unload error.

`onunload()` runs **after** the mod is marked unloaded, so `saveData` already rejects there, and so does it inside a `ctx.signal` abort listener. A mod cannot flush state on the way out. Save when the state changes; see [Debounced saves](#debounced-saves) for what that means for batching.

## Error reference

| Message | When |
|---------|------|
| `Mod "<id>": saveData needs a value JSON can represent: <problem>` | unusable value (rejects at once, never queued) |
| `Mod "<id>": saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again` | after a failed load |
| `Mod "<id>": data.json is not valid JSON; its content was kept in <corruptPath>` | `loadData`, name `ModDataCorruptError` |
| `read failed for <path>: <OS error>` | `loadData` cannot read the file |
| `mkdir failed for <dir>: <OS error>`, `write failed for <temp path>: <OS error>` (the `data.json.tmp-...` file), `write failed for <path>: target is read-only`, `rename failed for <path>: <OS error>` | `saveData` cannot write |
| the file system's text for a failed rename, wrapped in an `Error` | `loadData` found the file corrupt but could not move it aside (the refusal state follows) |
| `Mod "<id>" is unloaded` | after unload or a vault change |

Every I/O failure is also written to the mod's debug log under `MOD:<id>` as `loadData failed: ...` / `saveData failed: ...`. These errors are not sent to Sentry. See [Errors and debugging](15-errors-and-debugging.md#ctxloaddata-and-ctxsavedata).

## Patterns

The snippets are plain JavaScript to paste into `main.js`. They share `errorMessage` from [Vault files](04-vault-files.md#errors-are-not-always-error-objects).

### Safe load

Three outcomes, three answers: nothing saved gives defaults; a corrupt file (already kept aside by the host) gives defaults plus a warning; **any other failure rejects**, because `data.json` is still there and must not be replaced by an empty state. Valid JSON of an unexpected shape also rejects, because `loadData` does not move it aside and the first save would overwrite it.

```javascript
const DATA_VERSION = 2;
const DEFAULTS = { version: DATA_VERSION, settings: { folder: 'Inbox', compact: false }, notes: {} };

/** The mod's state. Rejects, leaving data.json untouched, when it cannot be read or is not this mod's shape. */
async function loadState(ctx) {
	let data;
	try {
		data = await ctx.loadData();
	} catch (err) {
		if (err?.name !== 'ModDataCorruptError') throw err;
		ctx.notify(`Saved data was unreadable and is kept in ${err.corruptPath}; starting fresh`, { kind: 'warning' });
		return structuredClone(DEFAULTS);
	}
	if (data === null) return structuredClone(DEFAULTS);
	if (typeof data !== 'object' || Array.isArray(data)) {
		throw new Error('data.json is not in the expected shape; fix or remove it');
	}
	return withDefaults(migrate(data));
}
```

`structuredClone(DEFAULTS)` gives a fresh copy, so mutating the state never changes the defaults.

### Defaults merge

A shallow spread (`{ ...DEFAULTS, ...data }`) replaces nested objects whole: a `settings` object saved before you added `compact` comes back without it. Merge per field and check each type:

```javascript
/** Stored data with every missing or wrongly typed field set to its default. */
function withDefaults(data) {
	const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
	const notes = data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes) ? data.notes : {};
	return {
		version: DATA_VERSION,
		settings: {
			folder: typeof settings.folder === 'string' && settings.folder !== '' ? settings.folder : DEFAULTS.settings.folder,
			compact: typeof settings.compact === 'boolean' ? settings.compact : DEFAULTS.settings.compact,
		},
		notes,
	};
}
```

This is lenient: a bad value falls back to its default and the next save drops it. That suits settings. For data the user would miss (history, records), be strict instead: throw on an unexpected field so nothing saves over it, as `loadState` does for the top-level shape.

### Schema version and migration

Store a `version` number in the value from the first release. On load, upgrade old versions step by step, and **refuse a version newer than the code knows** (data written by a newer copy of the mod, for example from another machine sharing the vault): saving would downgrade it.

```javascript
/** Upgrades stored data to DATA_VERSION one step at a time. Throws for a version this code does not know. */
function migrate(data) {
	let current = data;
	// Version 1 kept the folder at the top level and had no per-note state.
	if (current.version === 1) {
		current = { version: 2, settings: { folder: current.folder, compact: false }, notes: {} };
	}
	if (current.version !== DATA_VERSION) {
		throw new Error(`data.json has version ${String(current.version)}, which this version of the mod cannot read`);
	}
	return current;
}
```

A migrated value is only in memory until the next save. Save it right after loading if the old format must not linger, or simply let the first ordinary save write the new format.

### Load once, retry on failure

Load lazily on first use and keep the state in memory. A failed load is forgotten so the next action retries, which also clears the refusal state when the retry succeeds:

```javascript
export default {
	onload(ctx) {
		let loading = null;
		const getState = () => {
			loading ??= loadState(ctx).catch((err) => {
				loading = null;
				throw err;
			});
			return loading;
		};

		ctx.addAction({
			id: 'compact',
			title: 'Toggle compact mode',
			run: async () => {
				const state = await getState();
				state.settings.compact = !state.settings.compact;
				await ctx.saveData(state);
				ctx.notify(`Compact mode ${state.settings.compact ? 'on' : 'off'}`);
			},
		});
	},
};

// DATA_VERSION, DEFAULTS, loadState, withDefaults and migrate from above go here.
```

Every caller gets the same state object, so changes made by one action are seen by the next. Inside an action, let a load failure propagate: the host shows it as the action's error.

### Debounced saves

Save immediately when a change matters and happens rarely (a settings toggle). For state that changes many times a second (a drag position, a typing counter), batch the saves:

```javascript
/**
 * save(value) writes the latest value after `delayMs` without further calls; flush() writes it now.
 * A change still waiting when the mod unloads is lost: onunload cannot save.
 */
function createSaver(ctx, delayMs = 500) {
	let timer = null;
	let latest;
	const write = () => {
		timer = null;
		return ctx.saveData(latest);
	};
	const save = (value) => {
		latest = value;
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(() => {
			write().catch((err) => {
				if (!ctx.signal.aborted) ctx.notify(`Could not save: ${errorMessage(err)}`, { kind: 'warning' });
			});
		}, delayMs);
	};
	const flush = () => {
		if (timer === null) return Promise.resolve();
		clearTimeout(timer);
		return write();
	};
	ctx.register(() => {
		if (timer !== null) clearTimeout(timer);
	});
	return { save, flush };
}
```

- The delay is a **loss window**: a reload (editing `main.js`), switching the mod off, closing the vault or quitting the app inside it drops the pending change. Keep it short.
- `latest` is serialized when the timer fires, so it captures every change made to the same object until then.
- Call `await saver.flush()` at the end of an action before reporting success, so "done" means "on disk".
- No extra queue is needed: the host already orders the saves.

### Per-note state keyed by path

A common shape is `notes: { "<vault-relative path>": { ... } }`. Use the paths the host gives you (`run.target.path`, `ctx.onNoteSaved`, `ctx.vault.list`, or `toVaultPath` on a tab path), so keys match exactly; keys are case-sensitive even where the filesystem is not.

Paths change, and **a mod is not told**: the user renames or moves a note, Auto Move moves it after a save, or it is deleted. There is no rename event in `ctx`. Handle it explicitly:

- **When the mod itself renames or moves a note**, re-key with the path `ctx.vault.rename` / `move` resolves to:

  ```javascript
  async function renameTracked(ctx, state, path, newName) {
  	const next = await ctx.vault.rename(path, newName);
  	if (path in state.notes) {
  		state.notes[next] = state.notes[path];
  		delete state.notes[path];
  		await ctx.saveData(state);
  	}
  	return next;
  }
  ```

- **Prune entries for notes that are gone** at a convenient time (in an action, not on every load). An entry for a note renamed by the user is lost this way; the renamed note starts fresh.

  ```javascript
  /** Drops entries whose note no longer exists; resolves how many were dropped. */
  async function pruneMissing(ctx, state, signal) {
  	let dropped = 0;
  	for (const path of Object.keys(state.notes)) {
  		signal?.throwIfAborted();
  		if (!(await ctx.vault.exists(path))) {
  			delete state.notes[path];
  			dropped++;
  		}
  	}
  	if (dropped > 0) await ctx.saveData(state);
  	return dropped;
  }
  ```

- **When the state must follow the note** through any rename, keep it in the note itself (a frontmatter property, written with `ctx.app.updateNoteFrontmatter`, raw; see [Raw app](09-raw-app.md#updatenotefrontmatter)), or write a stable id into the frontmatter and key `data.json` by that id.

### Optimistic UI with a visible failure

For a panel the user clicks (a checklist, a counter), update the screen first, then save. Show a failure where the user is looking, and clear it on the next successful save: every save writes the whole state, and the host lands saves in call order, so a later success means the earlier change is on disk too.

```javascript
async function commit(ctx, state, render) {
	render({ error: null });
	try {
		await ctx.saveData(state);
	} catch (err) {
		if (!ctx.signal.aborted) render({ error: `Could not save, so this change is lost on close: ${errorMessage(err)}` });
	}
}
```

The [click-counter example](../../examples/mods/click-counter/) puts the corrupt-file handling and a settings picker together.

## When `localStorage` is acceptable

Mod code runs in the app's web view, so `localStorage` is available. It differs from `saveData` in ways that matter:

| | `saveData` | `localStorage` |
|---|---|---|
| Scope | this mod, this vault | **one store shared by the app, every mod and every vault** |
| Where | inside the vault folder | the app's web view data on this machine |
| Travels with the vault (copy, sync, backup) | yes | no |
| Values | any JSON value | strings only |
| API | async, ordered, corruption-safe | synchronous; `getItem` / `setItem` can throw |

Acceptable: per-machine conveniences that may be lost without harm, such as the last option picked in a dialog, a panel's position or a collapsed state, or a cache that can be rebuilt. Not acceptable: anything the user would miss on another machine, after moving the vault, or after the app's data is reset.

Because the store is shared, **key every entry by mod id and vault path**, or two vaults (and two mods with similar names) read each other's values. The app uses its own `kokobrain:` keys; never write those.

```javascript
/** A localStorage key private to this mod in this vault. */
function localKey(ctx, name) {
	return `mod:${ctx.mod.id}:${ctx.app.vaultStore.path}:${name}`;
}

/** The stored value, or `fallback` when missing, unreadable or blocked. */
function readLocal(ctx, name, fallback) {
	try {
		const raw = localStorage.getItem(localKey(ctx, name));
		return raw === null ? fallback : JSON.parse(raw);
	} catch {
		return fallback;
	}
}

/** Stores `value` as JSON; returns whether it was stored (setItem throws when storage is full or blocked). */
function writeLocal(ctx, name, value) {
	try {
		localStorage.setItem(localKey(ctx, name), JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}
```

Pitfalls:

- The vault path is part of the key, so **moving or renaming the vault folder orphans every entry**; nothing cleans them up. The app's own per-vault flags behave the same way (moving a vault turns its mods off).
- `ctx.app.vaultStore.path` is **raw**. Leave it out of the key only for values that should be shared by every vault on the machine.
- Nothing is removed when the mod is deleted. Remove your keys yourself if the mod offers a reset.
- The storage quota is the web view's (not documented by the app) and shared with everything else; do not store large data.

## See also

- [Vault files](04-vault-files.md): `ctx.vault`, `errorMessage`, path helpers
- [Events and reactivity](07-events-and-reactivity.md): `ctx.register`, `ctx.signal`, timers
- [Anatomy and loading](01-anatomy-and-loading.md): when a mod unloads and reloads
- [Types, build and test](12-types-build-and-test.md): faking `loadData` / `saveData` in tests
- [Vault Mods](../28-mods.md): the user guide
