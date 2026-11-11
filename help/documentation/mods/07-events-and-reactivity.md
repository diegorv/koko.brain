# Events and reactivity

Actions run when the user asks. Everything else a mod does, it does in response to something: the active note changed, a note was saved or moved, the theme changed, a key was pressed, a timer fired. This page covers the host's four subscriptions (`ctx.watch`, `ctx.onNoteSaved`, `ctx.onNoteMoved`, `ctx.theme.onChange`), the cleanup tools (`ctx.register`, `ctx.signal`), and the browser's own events and timers, which the host does not track for you.

| Member | Stability | Use it for |
|--------|-----------|------------|
| `ctx.watch(read, onChange)` | **stable** (the state you read through `ctx.app` is **raw**) | Reacting to app state: active tab, index version, settings |
| `ctx.onNoteSaved(callback)` | **stable** | Reacting to a save through the app |
| `ctx.onNoteMoved(callback)` | **stable** | Following a file or folder the app renamed or moved |
| `ctx.theme.onChange(callback)` / `ctx.theme.current` | **stable** | Repainting UI that cannot use CSS variables |
| `ctx.register(dispose)` | **stable** | Undoing anything the host does not track |
| `ctx.signal` | **stable** | Knowing the mod is unloading, aborting work, auto-removing listeners |
| DOM listeners, `setTimeout`, `setInterval`, `MutationObserver` | browser | Keys, clicks, polling, DOM changes. **You** must clean them up |

All of it runs on the app's main thread, the same thread that renders the editor. See [Performance](#debouncing-and-performance-on-the-main-thread).

## `ctx.watch`: reacting to app state

```javascript
const stop = ctx.watch(
	() => ctx.app.editorStore.activeTabPath,
	(path) => ctx.log('Active tab:', path),
);
```

`ctx.watch(read, onChange)` calls `onChange(value)` each time the value returned by `read` changes. It returns a disposer; unload also disposes it, so you do not need `ctx.register` for it.

### How it works

The app's state is Svelte 5 reactive state (`$state` and `$derived`). `ctx.watch` wraps your `read` in a Svelte effect:

1. **Baseline.** At subscription, `read` is called once without tracking, and its result is stored as the baseline. `onChange` is **not** called.
2. **Effect.** Then `read` runs again inside an effect at the next flush (a microtask later), this time tracked: every reactive value `read` touches **synchronously** becomes a dependency. So `read` runs **at least twice** at subscription; keep side effects out of it.
3. **Re-runs.** Whenever a dependency changes, the effect re-runs `read`. If `!Object.is(next, previous)`, the new value is stored and `onChange(next)` is called. Otherwise nothing happens.
4. **First flush.** The first tracked run compares against the subscription baseline, so a change between subscribing and the first flush is still reported.
5. **Batching.** Several writes before a flush give one run of `read`, so one call for the final value. A value that changes and changes back before the flush gives no call.

What counts as a dependency:

| Tracked | Not tracked |
|---------|-------------|
| Getters of app stores backed by `$state` / `$derived` (`ctx.app.editorStore.activeTabPath`, `ctx.app.vaultStore.vaultIndexVersion`, `ctx.app.settingsStore....`) | Your own variables and plain objects |
| Fields of `$state` objects and arrays read inside `read` (a tab's `content`) | Anything read after an `await` (do not make `read` async) |
| | Reads inside `onChange` (it runs untracked) |
| | The DOM, `localStorage`, `ctx.vault`, `ctx.kb()` results |

> [!NOTE]
> `ctx.watch` sees only Svelte reactive state. The members of `ctx.app` are **raw**: their names and shapes can change between app versions. See [Raw app](09-raw-app.md#members-at-a-glance) for what each store exposes.

### Equality is `Object.is`

There is no deep comparison. Return a primitive (string, number, boolean, `null`) whenever you can:

| `read` returns | Result |
|----------------|--------|
| `editorStore.activeTabPath` (string or `null`) | Fires only when the path changes |
| `editorStore.activeTab` (the tab proxy) | Same object while that tab is active, so edits to it do **not** fire; switching tabs does |
| `{ path: tab.path }`, `[a, b]`, `list.map(...)` | A **new object every run**: fires on every dependency change, even when nothing you care about changed |
| `modCommandsStore.list` | Builds a new array on every read: fires every time. Map it to a string: `list.map((c) => c.id).join('\n')` |

To watch two values, combine them into a string key, or use two watches.

### Errors

- A **synchronous** throw in `read` logs `watch read failed: <message>` under the mod's `MOD:<id>` tag and keeps the last good value; `onChange` is not called.
- If the baseline read threw, the first later successful read sets the baseline **without** calling `onChange`.
- A `read` that throws **before reading any reactive value** registers no dependency and never runs again. Read your reactive input first, then do what can throw.
- A throw in `onChange`, or a rejected promise from an `async` `onChange`, logs `watch callback failed: <message>`. The watch stays active. It also shows as **Last callback error** in the mod's Labs row and in one toast per load (see [Errors and debugging](15-errors-and-debugging.md#callback-errors-are-toasted-once-per-load)). Never Sentry.
- A failed `read` goes to no toast and no Labs row. Turn on the debug log to see it (see [Errors and debugging](15-errors-and-debugging.md#ctxlog)).

### Keep reads narrow

`read` re-runs synchronously on the main thread on every change of everything it touches.

- `editorStore.activeTabPath` changes when the user switches tabs. Cheap.
- `editorStore.activeTab.content` or `activeTabContent` changes on **every keystroke**. A `read` that touches it re-runs per key press, and an `onChange` that does work per change runs per key press too.
- `vaultStore.vaultIndexVersion` changes after the app refreshes its view of the index (about 2 s after a change, up to about 10 s during a burst).

Do the expensive part in `onChange`, debounced, never in `read`.

### Example: the active tab's path

The app's active tab can be a Markdown note, a canvas, a kanban board, a `.view` file, any text file (a mod's own `main.js`), or a virtual tab (Tasks, Graph, Calendar) whose path starts with `__virtual__/`. Filter for what you want.

```javascript
/** Last 20 Markdown notes the user switched to, newest first; lost on reload */
const MAX = 20;

export default {
	onload(ctx) {
		const recent = [];
		const vaultRoot = () => ctx.app.vaultStore.path;

		ctx.watch(
			() => ctx.app.editorStore.activeTabPath,
			(path) => {
				const root = vaultRoot();
				if (!path || !root || !path.startsWith(`${root}/`) || !path.toLowerCase().endsWith('.md')) return;
				const relative = path.slice(root.length + 1);
				const at = recent.indexOf(relative);
				if (at !== -1) recent.splice(at, 1);
				recent.unshift(relative);
				recent.length = Math.min(recent.length, MAX);
			},
		);

		ctx.addAction({
			id: 'recent',
			title: 'Recently visited notes',
			run: async (_input, run) => {
				if (recent.length === 0) {
					await run.ui.alert({ title: 'No notes visited yet', message: 'Switch between a few notes first.' });
					return;
				}
				const choice = await run.ui.pick({
					title: 'Recently visited',
					items: recent.map((path) => ({ id: path, title: path.replace(/\.md$/i, '') })),
				});
				if (choice === null || run.signal.aborted) return;
				await ctx.workspace.openNote(choice.id);
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Recent notes', icon: 'lucide:history', actions: ['recent'] });
	},
};
```

`activeTabPath` is absolute; `ctx.vault` and `ctx.workspace` take vault-relative paths (see [Vault files](04-vault-files.md#absolute-paths-and-ctxapp)).

### Example: refresh on index changes

`vaultIndexVersion` grows each time the app refreshes its index view of the vault (saves, creates, renames, external edits). Watch it, debounce, then query `ctx.kb()`, which reads the same index (see [Querying the index](10-querying-the-index.md#freshness-and-lag)). `completed` is also true for `[/]` and `[>]` tasks, so this counts only unchecked `[ ]` ones (see [Page fields](10-querying-the-index.md#page-fields)).

```javascript
const FOLDER = 'Projects';
const DEBOUNCE_MS = 1500;

export default {
	onload(ctx) {
		let openTasks = null;
		let timer = null;
		ctx.register(() => clearTimeout(timer));

		const recount = async () => {
			try {
				const kb = await ctx.kb();
				if (ctx.signal.aborted) return;
				openTasks = kb.pages(`"${FOLDER}"`).file.tasks.where((t) => !t.completed).length;
			} catch (err) {
				if (!ctx.signal.aborted) ctx.log('recount failed:', err instanceof Error ? err.message : String(err));
			}
		};
		const schedule = () => {
			clearTimeout(timer);
			timer = setTimeout(recount, DEBOUNCE_MS);
		};

		ctx.watch(() => ctx.app.vaultStore.vaultIndexVersion, schedule);
		schedule(); // the watch does not fire at subscription

		ctx.addAction({
			id: 'count',
			title: `Open tasks in ${FOLDER}`,
			run: () => ctx.notify(openTasks === null ? 'Still counting' : `${openTasks} open task(s)`),
		});
		ctx.addRailButton({ id: 'main', title: 'Task count', icon: 'lucide:list-checks', actions: ['count'] });
	},
};
```

Note `schedule()` at load: a watch never reports the starting value, so compute it yourself. The async work is in a `try`, because a rejection from it would otherwise be unhandled.

## `ctx.onNoteSaved`: reacting to saves

```javascript
const stop = ctx.onNoteSaved((path, content) => ctx.log('Saved:', path, typeof content === 'string' ? content.length : 'unknown'));
```

`ctx.onNoteSaved(callback, options)` calls `callback(path, content)` after a file is saved through the app's after-save pipeline. `path` is **vault-relative**, with `/` separators. `content` is the text that was saved; there is no previous content. It returns a disposer; unload also disposes it.

- **`content` is a snapshot.** By the time your callback runs, a later save may have replaced it. Use it to decide whether to act; to write, read the note again with `ctx.vault.read` right before writing.
- **`options.ignoreOwnWrites`** (`true` or `false`, default `false`): with `true`, saves made by this mod's own `ctx.vault.write` and `ctx.vault.updateFrontmatter` are not reported to this subscription. See [Avoiding save loops](#avoiding-save-loops) for what it does not skip. `options` must be an object when given (`onNoteSaved needs options to be an object`), and `ignoreOwnWrites` a boolean (`onNoteSaved needs options.ignoreOwnWrites to be a boolean`).
- **Older apps.** On an app from before `content` and `ignoreOwnWrites`, `content` is `undefined` and the option is ignored. `minAppVersion` is not enforced, so a mod that may run there checks `typeof content === 'string'` and keeps its own loop guard.

### Which writes fire it

| Write | Fires |
|-------|-------|
| The editor saving a tab with unsaved changes: autosave (2 s after the last keystroke, at most 10 s into continuous typing; 500 ms after a frontmatter edit) and Cmd+S | yes |
| The save of every dirty tab before the vault switches or the app closes | not reliably: the call is scheduled for later and is dropped once the vault has switched, or never runs when the app quits first |
| ... for **any** file tab, not only Markdown: canvas, kanban, `.view`, `.txt`, a mod's own `main.js` or `manifest.json` | yes |
| Cmd+S on a tab with no unsaved changes | no (nothing is written) |
| `ctx.vault.write(path, text)` | yes, except for a file under `_system/mods/` whose name does not end in `.md`, `.markdown` or `.view` |
| `ctx.app.updateNoteFrontmatter(...)` when it changes something (open or closed note) | yes |
| `ctx.app.updateNoteFrontmatter(...)` when the rebuilt text equals the file byte for byte (frontmatter already in canonical form) | no (nothing is written) |
| `ctx.app.updateNoteFrontmatter(...)` when `mutate` returns the same properties but the frontmatter is not in canonical form (block lists, `type:`, needless quotes) | yes (the note is rewritten in canonical form) |
| `ctx.app.saveFileByPath(absolutePath)` on a tab with unsaved changes | yes |
| Deep links that write (`kokobrain://new` with content, the daily-note action with content, captures) | yes |
| `ctx.vault.create`, `rename`, `move`, `delete` | no |
| `ctx.saveData` | no |
| External edits (another app, sync tools, `git`), noticed by the file watcher | no |
| Typing in a tab, before it is saved | no |
| A save that failed | no |
| A file outside the vault | no |

Anything else the app writes is not covered by this list: do not rely on it firing.

`{ ignoreOwnWrites: true }` skips only the saves this mod makes through `ctx.vault.write` and `ctx.vault.updateFrontmatter`; every other row above still fires, including writes through `ctx.app`, the editor, other mods, and an Auto Organize rule that runs this mod's action.

**Filter the path.** You will see non-note files. Most mods want Markdown notes outside the system folder, which is a setting (`_system` by default; see [Vault files: Special folders](04-vault-files.md#special-folders)):

```javascript
const isNote = (path) => {
	const system = ctx.app.settingsStore.templates.systemFolder.replace(/^\/+|\/+$/g, '');
	return path.toLowerCase().endsWith('.md') && !(system && path.startsWith(`${system}/`));
};
```

### Scheduling

- Each save schedules **one** `setTimeout(0)` call of your callback. It runs after every synchronous save observer of the app and of other mods, so slow mod code never delays the save itself. It still runs on the main thread.
- **No debounce, no coalescing.** N saves give N calls, also for the same path. During a long typing session a note autosaves repeatedly, so your callback runs repeatedly.
- **No serialization.** An `async` callback is not awaited before the next call: two calls for the same path can overlap. Serialize per path yourself if your work must not overlap.
- At dispose or unload, pending (not yet started) calls are cancelled and the subscription is removed. A call already running is **not** cancelled: check `ctx.signal.aborted` after each `await`. A pending call that would run after unload or a vault switch is dropped.

### Errors

A synchronous throw **or** a rejected promise from the callback is caught and logged as `onNoteSaved callback failed: <message>` under `MOD:<id>`. It also shows as **Last callback error** in the mod's Labs row and in one toast per load. Never Sentry.

### Avoiding save loops

A callback that writes to the note it was told about fires itself again:

```
save -> onNoteSaved(path) -> ctx.vault.write(path) -> onNoteSaved(path) -> ctx.vault.write(path) -> ...
```

`ctx.vault.write` writes even when the content is identical. **Compute the new text, compare it with the current text, and write only when they differ.** The second round then finds nothing to change and the loop ends. `updateNoteFrontmatter` skips the write only when the rebuilt text equals the file byte for byte, so returning the same properties is a guard only for frontmatter already in canonical form; otherwise the note is rewritten (block lists become `[a, b]`, `type:` becomes `_type:`, quotes are dropped) and the save fires again. To skip the write for sure, throw a sentinel from `mutate` and catch it, as in the example below and in the [cookbook](14-cookbook.md#5-set-toggle-and-remove-frontmatter-properties). To stop a loop that is already running, switch the mod off in **Settings > Labs**.

`ctx.onNoteSaved(callback, { ignoreOwnWrites: true })` keeps the mod from hearing its own `ctx.vault.write` and `ctx.vault.updateFrontmatter` saves, which ends the simplest loop:

```javascript
ctx.onNoteSaved(async (path, content) => {
	if (!path.endsWith('.md') || typeof content !== 'string' || content.includes('#seen')) return;
	const current = await ctx.vault.read(path);
	if (!current.includes('#seen')) await ctx.vault.write(path, `${current}\n#seen`);
}, { ignoreOwnWrites: true });
```

It is not a full loop guard. It does not skip writes through `ctx.app` (such as `ctx.app.updateNoteFrontmatter`), `editNote` on an open tab (saved later by autosave), another mod's writes, or an Auto Organize rule that runs this mod's action: two writers can still answer each other forever. While a `ctx.vault.updateFrontmatter` call of this mod is in flight, an editor save of that same note is skipped too. Keep the comparison before writing; it is what ends every loop.

Example: keep an `updated` date in the frontmatter of notes in one folder. The date has day precision, so the save fired by the write itself finds the value already set and writes nothing. **That value comparison is what ends the loop.** The `busy` set is not a loop guard: the app calls save callbacks from a `setTimeout(0)` it schedules during the save, and by the time that timer fires, the `await` has resumed and the `finally` has already cleared the path. `busy` only keeps two overlapping calls for one note (two quick saves) from writing at once.

The example also leaves the **active** note alone. `updateNoteFrontmatter` on the note the user is typing in moves their caret (see [Raw app: Known problems](09-raw-app.md#known-problems-caret-and-empty-block)), so a save callback that stamps it would make the next keystroke land in the wrong place. The active note is stamped once the user switches away from it.

```javascript
const FOLDER = 'Journal/';

/** Thrown by the mutate when there is nothing to change, so nothing is written */
const UNCHANGED = new Error('unchanged');

const today = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default {
	onload(ctx) {
		const busy = new Set();
		/** Saved while active: stamped once the user leaves them */
		const pending = new Set();
		const absolute = (path) => `${ctx.app.vaultStore.path}/${path}`;
		const isActive = (path) => ctx.app.editorStore.activeTabPath?.replace(/\/{2,}/g, '/') === absolute(path);

		const stamp = async (path) => {
			if (busy.has(path)) return;
			busy.add(path);
			try {
				const date = today();
				await ctx.app.updateNoteFrontmatter(absolute(path), (props) => {
					const current = props.find((p) => p.key === 'updated');
					// The loop guard. Returning `props` would still rewrite a note whose YAML is not in canonical form: throw instead.
					if (current && current.value === date) throw UNCHANGED;
					const next = props.filter((p) => p.key !== 'updated');
					next.push({ key: 'updated', value: date, type: 'date' });
					return next;
				});
			} catch (err) {
				// Reasons include unparseable or nested frontmatter; a failed save was already toasted by the editor.
				if (err !== UNCHANGED && !ctx.signal.aborted && err?.reason !== 'save-failed') {
					ctx.log(`could not stamp ${path}:`, err instanceof Error ? err.message : String(err));
				}
			} finally {
				busy.delete(path);
			}
		};

		ctx.onNoteSaved(async (path) => {
			if (!path.startsWith(FOLDER) || !path.toLowerCase().endsWith('.md')) return;
			if (isActive(path)) {
				pending.add(path);
				return;
			}
			await stamp(path);
		});

		ctx.watch(
			() => ctx.app.editorStore.activeTabPath,
			() => {
				for (const path of [...pending]) {
					if (isActive(path)) continue;
					pending.delete(path);
					void stamp(path);
				}
			},
		);
	},
};
```

`stamp` catches everything, so the `void stamp(path)` in the watch callback cannot leave an unhandled rejection. A note stamped while it is open in a **background** tab gets its old caret offset back when the user returns to it, a few characters off; only a stamp of the active note lands under the user's fingers. A note renamed or moved while pending is stamped at its old path, which fails quietly in the log.

`updateNoteFrontmatter` is **raw** (`ctx.app`): it takes an absolute path, its `mutate` must be pure because it can run twice, and it saves an open tab at once. See [Raw app](09-raw-app.md#updatenotefrontmatter).

The same guard with `ctx.vault.write`:

```javascript
ctx.onNoteSaved(async (path) => {
	if (!path.startsWith('Inbox/') || !path.endsWith('.md')) return;
	// A write to the active note would move the user's caret: leave it for a later save.
	if (ctx.app.editorStore.activeTabPath?.replace(/\/{2,}/g, '/') === `${ctx.app.vaultStore.path}/${path}`) return;
	try {
		const text = await ctx.vault.read(path);
		const next = text.replace(/[ \t]+$/gm, ''); // strip trailing spaces
		if (next === text || ctx.signal.aborted) return; // the guard
		await ctx.vault.write(path, next);
	} catch (err) {
		// "has unsaved changes in an open tab": the user typed again since the save.
		if (!ctx.signal.aborted) ctx.log('cleanup skipped:', path, String(err?.message ?? err));
	}
});
```

`ctx.vault.write` refuses a note whose open tab has unsaved changes, which happens when the user keeps typing after the save. Writing into a clean active note replaces the editor's text and leaves the caret at its old offset, hence the skip: prefer to act on notes that are not active, or edit through the editor (see [Vault files](04-vault-files.md#editing-a-note-that-may-be-open)).

### Debouncing per path

To act once after the user stops saving a note, debounce per path:

```javascript
const QUIET_MS = 5000;
const timers = new Map();
ctx.register(() => {
	for (const t of timers.values()) clearTimeout(t);
	timers.clear();
});
ctx.onNoteSaved((path) => {
	if (!path.endsWith('.md')) return;
	clearTimeout(timers.get(path));
	timers.set(path, setTimeout(() => {
		timers.delete(path);
		if (ctx.signal.aborted) return;
		ctx.log('settled:', path); // the real work goes here, in a try/catch if async
	}, QUIET_MS));
});
```

## `ctx.onNoteMoved`: reacting to renames and moves

```javascript
const stop = ctx.onNoteMoved(({ from, to }) => ctx.log('Moved:', from, '->', to));
```

`ctx.onNoteMoved(callback)` calls `callback({ from, to })` after the app renamed or moved a file or folder. Both paths are **vault-relative**, with `/` separators; the event has no other field. A rename and a move are the same event: compare the folders yourself if you need to tell them apart. It returns a disposer; unload also disposes it.

- **When it runs.** Once the move is complete: links in other notes are already rewritten and the file tree already uses `to`, so the callback can read and write the moved note and the notes that link to it. `ctx.query` may not see the note at `to` until the app's index refreshes, a few seconds later.
- **Folders.** A folder is reported once, for the folder, not once per file: every path under `from + '/'` is now under `to + '/'`. Match stored paths by prefix (see the example below).
- **Any file type**, as `onNoteSaved`: notes, canvases, `.view` files, images.

### Which moves fire it

| Move | Fires |
|------|-------|
| Rename or drag and drop in the file explorer | yes |
| An Auto Organize rule moving a note | yes |
| `ctx.vault.rename` and `ctx.vault.move` of any mod, this one included | yes |
| A delete, to the Trash or not | no |
| A move to the folder the item is already in, or a rename to the same name | no (nothing moves) |
| A rename or move that failed on disk | no |
| A rename whose link rewrite failed (the app could not list the backlinks) | no |
| Moves made outside the app (Finder, `git`, sync tools), noticed by the file watcher | no |
| Restoring from the Trash | no |
| Duplicating a file or folder | no |

### Scheduling and errors

Each move schedules **one** `setTimeout(0)` call, with a fresh event object. Disposal, unload and a vault switch cancel pending calls as for [`onNoteSaved`](#scheduling); a call already running is not cancelled. A synchronous throw or a rejected promise is logged as `onNoteMoved callback failed: <message>` under `MOD:<id>`, shows as **Last callback error** in the mod's Labs row, and shares the one toast per load with the other callbacks. Never Sentry.

### Avoiding move loops

A callback that renames or moves again fires itself again. Auto Organize can also move a note a mod just wrote, and a mod that answers that move by writing can start a cycle with the rule. Compare before acting, and switch the mod off in **Settings > Labs** to stop a loop that is already running.

### Example: keep stored paths current

A mod that stores note paths in its data remaps them by prefix, so a folder move carries every stored path under it:

```javascript
ctx.onNoteMoved(async ({ from, to }) => {
	try {
		const data = (await ctx.loadData()) ?? { pinned: [] };
		const remap = (path) =>
			path === from ? to : path.startsWith(`${from}/`) ? to + path.slice(from.length) : path;
		const pinned = data.pinned.map(remap);
		if (pinned.some((path, i) => path !== data.pinned[i])) await ctx.saveData({ ...data, pinned });
	} catch (err) {
		ctx.log('could not remap pinned notes:', err);
	}
});
```

## `ctx.theme`: following theme changes

### Prefer CSS variables

UI styled with the theme's CSS variables (`background: var(--popover); color: var(--popover-foreground)`) follows every theme change with no code. Use `ctx.theme.onChange` only for what cannot read CSS: a `<canvas>`, an SVG built with literal colors, a chart library that takes color strings. Variables and color meanings: [Custom UI](08-custom-ui.md#the-theme-color-contract).

### `ctx.theme.current`

A getter. Each read returns a **new** `{ mode, colors }` object:

- `colors`: the 20 contract colors (`background`, `foreground`, `card`, `cardForeground`, `popover`, `popoverForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground`, `border`, `input`, `ring`, `divider`), each the CSS variable's value as written by the theme, trimmed (`#21222e`, `oklch(...)`), not converted to `rgb()`.
- `mode`: `'dark'` or `'light'`, decided by the theme's **editor background** (`--editor-bg`): dark when that color is dark (low luminance) **or cannot be parsed**. It is not decided by `background` and not by the OS appearance.

Reading it after unload throws `Mod "<id>" is unloaded`.

### `ctx.theme.onChange(callback)`

Calls `callback({ mode, colors })` after a theme is **applied**, and returns a disposer (unload also disposes it). It does not fire at subscription: read `ctx.theme.current` once to paint the first time.

It fires on every theme application, not only on a real change:

- choosing a theme in **Settings > Appearance**, also re-choosing the one already active;
- updating, uninstalling or deleting a theme (installing alone does not apply it);
- loading the vault's settings;
- **every color edit in the custom theme editor's live preview**, with the unsaved draft's colors, many times per second while the user drags a color picker;
- saving or cancelling the theme editor (cancel re-applies the active theme).

Several applications before one flush give one call. The callback receives the colors as they are at that moment. Keep it cheap: repaint, do not rebuild.

Errors: a synchronous throw or a rejected promise from an `async` callback is logged as `theme.onChange callback failed: <message>` under `MOD:<id>`, and shows as **Last callback error** in the mod's Labs row and in one toast per load. Never Sentry.

```javascript
export default {
	onload(ctx) {
		const canvas = document.createElement('canvas');
		canvas.width = 120;
		canvas.height = 24;
		canvas.style.cssText = 'position:fixed;right:12px;bottom:40px;z-index:50;border-radius:4px;';
		document.body.append(canvas);
		ctx.register(() => canvas.remove());

		const paint = ({ mode, colors }) => {
			const g = canvas.getContext('2d');
			if (!g) return;
			g.fillStyle = colors.card || (mode === 'dark' ? '#000' : '#fff');
			g.fillRect(0, 0, canvas.width, canvas.height);
			g.fillStyle = colors.primary || '#888';
			g.fillRect(4, 4, 40, 16);
			g.fillStyle = colors.foreground || '#888';
			g.font = '12px sans-serif';
			g.fillText(mode, 52, 16);
		};

		paint(ctx.theme.current);  // first paint
		ctx.theme.onChange(paint); // later changes
	},
};
```

## `ctx.register` and `ctx.signal`: cleanup and order

### What the host cleans up for you

Everything you create through `ctx` is undone at unload: actions, rail buttons, placements, watches, save subscriptions, theme subscriptions, and the mod's dialogs and picker. Everything you create through the browser is **not**: DOM nodes, event listeners, timers, observers, `fetch` requests, globals you set on `window`. Undo those with `ctx.register(dispose)` or `ctx.signal`.

### `ctx.register(dispose)`

- Adds `dispose` to the mod's cleanup list. Returns nothing, and cannot be undone. Calling it after unload throws `Mod "<id>" is unloaded`.
- The argument is **not checked**: a non-function is accepted, then fails at unload as a cleanup error.
- The cleanup list is **one list shared with** every registration that returns a disposer (`addAction`, `addRailButton`, `labs.place`, `watch`, `onNoteSaved`, `onNoteMoved`, `theme.onChange`). At unload it runs **in reverse order of registration** across all of them. A disposer you already called yourself is removed from the list and does not run again; a `ctx.register` callback is not wrapped this way, so make it safe to run after you already cleaned up.
- Each cleanup runs in its own `try`/`catch`. A throwing one is logged (`cleanup failed: <message>`) and toasted as `_system/mods/<id>: cleanup failed: <message>`, and the rest still run.

Register the cleanup **right after** creating the resource, so a throw later in `onload` cannot leak it.

### `ctx.signal`

The mod's lifetime `AbortSignal`: one per load, aborted when the mod unloads (switched off, edited and reloaded, deleted, mods turned off, vault closed or switched). Inside an action, prefer `run.signal`, which also aborts on **Stop** (see [Runs](03-runs.md#stop)).

Three uses:

1. **Check it after every `await`** in code that is not an action: `if (ctx.signal.aborted) return;`. After unload every `ctx` call throws.
2. **Pass it to APIs that take a signal:** `fetch(url, { signal: ctx.signal })`, and `addEventListener(type, fn, { signal: ctx.signal })`, which removes the listener when the signal aborts.
3. **Listen to it:** `ctx.signal.addEventListener('abort', dispose, { once: true })`.

### Unload order

1. The mod is marked unloaded: **from here every `ctx` call throws** `Mod "<id>" is unloaded`, including inside the steps below.
2. `ctx.signal` aborts. Its `abort` listeners run now, synchronously (and listeners added with `{ signal: ctx.signal }` are removed). Every live run's `run.signal` aborts: runs end **Cancelled** and their `run.ui` dialogs reject with `AbortError`.
3. The mod's action picker closes.
4. The mod's remaining dialogs close with their cancel values.
5. `onunload()` runs, if the mod has one and `onload` did not fail. It is not awaited.
6. The cleanup list runs in reverse order.

All six steps run synchronously. Code waiting on a promise (after `await run.ui.confirm(...)`, after `await ctx.kb()`) resumes only **after** step 6, with a dead `ctx`. That is why every continuation checks the signal.

A reload after saving `main.js` is an unload followed by a fresh load: the file is evaluated again, so module-level variables start over and `onload` gets a new `ctx` and a new `ctx.signal`. Keep state that must survive in `ctx.saveData` (see [Mod data](05-mod-data.md#savedatavalue)).

## DOM listeners

```javascript
const onFocus = () => {
	if (!ctx.signal.aborted) ctx.log('window focused');
};
window.addEventListener('focus', onFocus, { signal: ctx.signal });
```

- Pass `{ signal: ctx.signal }`: this is the preferred style, one argument on the same line, so it cannot be forgotten. Use `ctx.register(() => target.removeEventListener(...))` only when the listener must also go away before unload (then keep the remover and call it yourself too), or when the target's own `addEventListener` takes no options. A listener left behind keeps running after unload, and its `ctx` calls throw; after a reload there are two copies.
- Listen on `window` or `document`, not on app elements: the app re-renders its own markup, and its classes and structure are not an API (see [Custom UI](08-custom-ui.md#mounting-into-app-regions)).
- Errors thrown in a listener are uncaught errors: the host never sees them, no run fails, no toast shows. Catch them and report with `ctx.log` or `ctx.notify`.

## Timers

```javascript
const interval = setInterval(() => {
	if (ctx.signal.aborted) return;
	// periodic work
}, 60_000);
ctx.register(() => clearInterval(interval));
```

- `setTimeout`, `setInterval` and `requestAnimationFrame` are not tracked by the host. **Clear every one in `ctx.register`**, or they fire after unload.
- Measure time against `Date.now()`, not by counting ticks: the web view can throttle timers (for example while the window is hidden), so a tick count drifts.
- A sleep inside an action should end on **Stop**:

```javascript
const sleep = (ms, signal) => new Promise((resolve) => {
	if (signal.aborted) return resolve();
	const done = () => {
		clearTimeout(timer);
		signal.removeEventListener('abort', done);
		resolve();
	};
	const timer = setTimeout(done, ms);
	signal.addEventListener('abort', done, { once: true });
});
// await sleep(10_000, run.signal); if (run.signal.aborted) return;
```

## Keyboard shortcuts

The contract has no shortcut API. A mod listens to `keydown` itself. Shortcuts work only while the Kokobrain window has focus.

### Who sees a key first

A `keydown` travels: `window` (capture phase) -> `document` (capture) -> ... -> the focused element (the editor's content, an input) -> back up -> `document` (bubble) -> `window` (bubble).

- The **editor** (CodeMirror) handles its keymap on its own element: Cmd+Z, Cmd+F, Cmd+A, list and formatting keys, and so on. A key it handles is `defaultPrevented`.
- The **app's shortcuts** listen on `document` in the bubble phase and call `preventDefault()` on a match. They do **not** check `defaultPrevented`, and they work in inputs and in the editor.
- The app's own dialogs (and the mods' `ctx.ui` dialogs) handle Esc and Enter inside themselves.

So:

| Where the mod listens | Effect |
|-----------------------|--------|
| `window`, bubble phase (default) | Runs **last**. A key the editor or the app took arrives with `e.defaultPrevented === true`: return early and the app wins. **Recommended.** |
| `window`, capture phase (`{ capture: true }`) | Runs **first**, before the editor and the app. `preventDefault()` alone does not stop the app's shortcut (it ignores `defaultPrevented`); `stopPropagation()` does, and also hides the key from the editor. Use only to override a key on purpose, and never for plain keys |

### Chords already taken

The app binds these (macOS, Cmd is `metaKey`): Cmd+P, Cmd+O, Cmd+S, Cmd+W, Cmd+N, Cmd+B, Cmd+D, Cmd+E, Cmd+G, Cmd+1, Cmd+2, Cmd+, (comma), Cmd+\\, Cmd+= / Cmd++ / Cmd+- / Cmd+0, Cmd+Shift+[ and ], Cmd+Shift+B, Cmd+Shift+C, Cmd+Shift+F, Cmd+Shift+H, Cmd+Shift+N, Cmd+Shift+T, and `/` outside text fields. The editor adds its own while it has focus, among them Cmd+Z, Cmd+Shift+Z (redo; Cmd+Y is not bound on macOS), Cmd+U, Cmd+Shift+U, Cmd+A, Cmd+F, Cmd+G, Cmd+Shift+G, Cmd+Option+G, Cmd+I, Cmd+/, Cmd+[ and ], Cmd+Enter, Cmd+Shift+K (delete line), Cmd+Shift+L (copy block link), Cmd+Shift+\\, Cmd+Option+\\ and Cmd+Option+Up / Down. The macOS menu bar adds Cmd+Q (Quit) and the standard Edit and Window items. This list changes between versions and is not a contract; see [Keyboard Shortcuts](../20-keyboard-shortcuts.md) for the user-facing list. The app matches modifiers exactly (Cmd+B and Cmd+Shift+B are different bindings), so a free chord stays free only if you also require exact modifiers.

### `e.key` vs `e.code`

Match keys the way the app does, so a mod chord behaves like the app's own on every keyboard layout:

- **Letters and digits by `e.key`, lowercased**: `e.key.toLowerCase() === 'j'`. `e.key` is the character the key produces on the user's layout, so the chord follows the letter printed on the key (on an AZERTY keyboard Cmd+A is where the A is). With Shift it is uppercase (`'J'`), hence the `toLowerCase()`.
- **Brackets, comma and backslash by `e.code`**, the physical key: `BracketLeft`, `BracketRight`, `Comma`, `Backslash`. The character those keys produce changes with the layout and with Shift (Shift+[ gives `{`), so the app binds them by position. Other punctuation goes by `e.key`: the zoom chords match `=`, `+` and `-` (and `0`) as characters.
- **Option changes `e.key`** on macOS (Option+J gives `'∆'`). A chord with Option has to match `e.code` (`KeyJ`) instead; better, avoid Option chords.
- Keys named by their meaning (`'Escape'`, `'Enter'`, `'ArrowUp'`) by `e.key`.

### Input methods (IME)

While the user composes text with an input method (Japanese, Chinese, Korean, or the macOS accent popup), key presses belong to the composition. Ignore them: return early when `e.isComposing` is true, or when the editor reports `ctx.app.editorStore.editorView?.composing` (raw). The app's own text fields apply the same rule to Enter.

### Cmd vs Ctrl on macOS

On macOS, Cmd is `e.metaKey` and Control is `e.ctrlKey`. They are different chords: Ctrl+J is not Cmd+J. Application shortcuts on macOS use Cmd; Control combinations are used by the system and by text editing (Ctrl+A, Ctrl+E move the caret). Require the modifiers you want **and** the absence of the others: `e.metaKey && e.shiftKey && !e.altKey && !e.ctrlKey`.

### Ignore typing targets

What a shortcut must check depends on what it does:

| Shortcut | Run it when |
|----------|-------------|
| A Cmd chord that **opens** something (a dialog, a note, a toggle) | Anywhere, except inside an open dialog. A Cmd chord produces no text, so typing in a field is no reason to skip it |
| A chord that **inserts text into the editor** (a date, a template line) | Only when `view.hasFocus` is true for the current `editorView`. Not when the target is merely inside the editor |
| A key **without** a modifier (a single letter, `?`) | Only when the target is not a text field, editable content (which includes the editor) or inside a dialog |

The editor case needs `hasFocus` because the editor's DOM holds more than the text. Live Preview draws widgets inside `view.dom` that have inputs of their own (meta-bind text, select and toggle fields, task checkboxes): a key pressed in one of those has a target inside `view.dom`, and `view.dom.contains(e.target)` is true, but the caret is not in the note. Inserting at `view.state.selection` then writes into the note at a place the user is not looking at. `view.hasFocus` is true only while the editable text itself has focus.

```javascript
const isTyping = (target) =>
	target instanceof HTMLElement &&
	(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
const inDialog = (target) => target instanceof Element && target.closest('[role="dialog"]') !== null;

/** The editor view when the user's caret is in the note text, else null. */
function focusedEditor(ctx) {
	const view = ctx.app.editorStore.editorView;
	return view && view.dom.isConnected && view.hasFocus && !view.composing ? view : null;
}
```

Skip keys whose target is inside an open dialog too, as the app does: a shortcut behind a modal would act on the page the user cannot see.

An inserting chord, as a fragment for `onload`. Cmd+Shift+I is not bound by the app or the editor in this version; check the list above before you pick another:

```javascript
const onInsertDate = (e) => {
	if (e.defaultPrevented || e.isComposing || !e.metaKey || !e.shiftKey || e.altKey || e.ctrlKey) return;
	if (e.key.toLowerCase() !== 'i') return;
	const view = focusedEditor(ctx);
	if (!view) return; // the caret is not in a note: leave the key alone
	e.preventDefault();
	const d = new Date();
	const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	view.dispatch(view.state.replaceSelection(date));
};
window.addEventListener('keydown', onInsertDate, { signal: ctx.signal });
```

The dispatch behaves like typing: it replaces the selection, goes into undo history and arms autosave (see [Raw app: editorView](09-raw-app.md#editorstoreeditorview)).

### Complete example

```javascript
/** Cmd+Shift+J: append a timestamped line to an "Inbox log" note. Cmd+Shift+Y: browse the log. */
const LOG = 'Inbox log.md';
/** Letters by e.key, lowercased, as the app matches its own shortcuts */
const CHORDS = { j: 'append', y: 'show' };
const inDialog = (target) => target instanceof Element && target.closest('[role="dialog"]') !== null;

export default {
	onload(ctx) {
		let busy = false;

		/** `ui` is ctx.ui from the shortcut, run.ui from the action, so Stop closes the action's dialog */
		const append = async (ui) => {
			const text = await ui.prompt({ title: 'Log a line', placeholder: 'What happened?' });
			if (text === null || !text.trim() || ctx.signal.aborted) return;
			const line = `- ${new Date().toLocaleTimeString()} ${text.trim()}\n`;
			if (await ctx.vault.exists(LOG)) {
				const current = await ctx.vault.read(LOG);
				if (ctx.signal.aborted) return;
				await ctx.vault.write(LOG, current.endsWith('\n') || current === '' ? current + line : `${current}\n${line}`);
			} else {
				await ctx.vault.create(LOG, line);
			}
			if (!ctx.signal.aborted) ctx.notify('Logged', { kind: 'success' });
		};

		const show = async () => {
			if (!(await ctx.vault.exists(LOG))) return ctx.notify('No log yet');
			// A pick item needs a non-empty title, so skip bare "- " lines.
			const lines = (await ctx.vault.read(LOG)).split('\n').filter((l) => l.startsWith('- ') && l.length > 2).reverse();
			if (ctx.signal.aborted) return;
			await ctx.ui.pick({
				title: 'Inbox log',
				items: lines.map((l, i) => ({ id: String(i), title: l.slice(2) })),
			});
		};

		const onKeyDown = (e) => {
			// Exactly Cmd+Shift: the editor and the app keep everything else. Never act mid-composition (IME).
			if (e.defaultPrevented || e.isComposing || !e.metaKey || !e.shiftKey || e.altKey || e.ctrlKey) return;
			// Both chords open a dialog and insert nothing, so they may run while a text field has focus.
			const name = CHORDS[e.key.toLowerCase()];
			if (!name || inDialog(e.target)) return;
			e.preventDefault();
			if (e.repeat || busy) return; // holding the chord repeats at ~30 Hz
			busy = true;
			Promise.resolve()
				.then(() => (name === 'append' ? append(ctx.ui) : show()))
				.catch((err) => {
					if (ctx.signal.aborted) return;
					ctx.log('shortcut failed:', err instanceof Error ? err.message : String(err));
					ctx.notify(err instanceof Error ? err.message : String(err), { kind: 'warning' });
				})
				.finally(() => { busy = false; });
		};

		// Bubble phase: a key the editor or the app handled arrives defaultPrevented.
		window.addEventListener('keydown', onKeyDown, { signal: ctx.signal });

		ctx.addAction({ id: 'append', title: 'Log a line', description: 'Cmd+Shift+J', run: (_input, run) => append(run.ui) });
		ctx.addRailButton({ id: 'main', title: 'Inbox log', icon: 'lucide:keyboard', actions: ['append'] });
	},
};
```

Points the example shows:

- Letters matched by `e.key.toLowerCase()`, as the app matches its own, and nothing done while an input method composes.
- No `hasFocus` check: both chords open a dialog. A chord that inserts into the note needs one (see [Ignore typing targets](#ignore-typing-targets)).
- `preventDefault()` only after a match, so other keys keep their default.
- `e.repeat` ignored, and a `busy` flag so a second press does not queue a second dialog (dialogs queue without limit, see [Dialogs](06-dialogs.md#the-queue)).
- The handler runs the work through a promise so a synchronous throw and a rejection land in the same `catch`. The host never sees errors from a shortcut, unlike an action's, so the mod reports them itself.
- `ctx.ui` from the shortcut, because a shortcut is not a run; `run.ui` from the action, so **Stop** closes its dialog. The contract has no call to start your own action (with a run view and **Stop**) from code; `ctx.app.modCommandsStore` can, as a raw member (see [Actions and entry points](02-actions-and-entry-points.md#ctxappmodcommandsstore)).
- Chords checked against the app's and the editor's keymaps: Cmd+Shift+J and Cmd+Shift+Y are bound by neither in this version; Cmd+Shift+K would be taken by the editor's delete-line while it has focus.

## Debouncing and performance on the main thread

Mods run on the app's main thread, in the same web view as the editor. Every millisecond a callback takes is a millisecond the editor cannot respond to typing. **Stop** cannot interrupt synchronous code; a synchronous infinite loop freezes the app until it is quit.

- **Keep `read` functions trivial.** One or two getter reads, a comparison, return a primitive.
- **Debounce bursty sources.** `onNoteSaved` fires per save, `vaultIndexVersion` after each index refresh, `theme.onChange` per color-picker move. Collect with a timer (cleared in `ctx.register`) and work once things are quiet.
- **Coalesce, do not queue.** When work is already running, set a "dirty" flag and run once more at the end instead of starting a second copy.
- **Yield in long loops.** Split work over many items with `await new Promise((r) => setTimeout(r, 0))` every few dozen items so the UI can paint, and check the signal at each yield.
- **Query the index sparingly.** The first `pages()` or `page()` call at a new index state builds a page object for every note of the vault (noticeable on thousands of notes). Scope queries to a folder (`kb.pages('"Projects"')`) or `.limit(n)`, and refresh only while the result is on screen (see [Querying the index](10-querying-the-index.md#cost)).
- **Do not write on every save.** Each write goes through the save pipeline again: index refresh, search update, file history (which skips a snapshot identical to the latest one). Guard writes with an equality check and batch them.
- **Never block on the network in a callback.** `fetch` with a signal, in a `try`, after a debounce.

## See also

- [Dialogs](06-dialogs.md): `ctx.ui` from callbacks, the global queue
- [Runs](03-runs.md): `run.signal`, **Stop**
- [Custom UI](08-custom-ui.md): CSS variables, mounting UI, status bar chips
- [Raw app](09-raw-app.md): the stores worth watching
- [Errors and debugging](15-errors-and-debugging.md): reading the `MOD:<id>` log lines
- [`help/examples/mods/status-chip/`](../../examples/mods/status-chip/): `ctx.watch` on the active tab, `ctx.theme.onChange`, a timer and full cleanup
- [Vault Mods](../28-mods.md): the user guide
