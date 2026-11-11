# Runs

Starting an action creates a **run**: a host-side record with a status, a log and a progress bar, plus the `run` object the action receives as its second argument. The host shows the run in the **run view** (inside the action picker), gives it a **Stop** button, and keeps at most one live run per action. This page covers the run object, the run view's open and close rules for each entry point, Stop and cancellation, and how to report work that a Stop left half done.

How an action is registered and started is in [Actions and entry points](02-actions-and-entry-points.md). Dialogs (`run.ui`) are in [Dialogs](06-dialogs.md). The user-facing overview is [Vault Mods](../28-mods.md).

## The run object

**Stable** (`ModRunV1`). Built fresh for every run: `{ target?, signal, log, progress, ui }`.

| Member | Type | Description |
|--------|------|-------------|
| `run.target` | `{ on: 'note' \| 'folder', path: string }`, optional | The clicked menu target, or the note an [Auto Organize rule](02-actions-and-entry-points.md#actions-a-rule-can-run) matched. The key is absent for rail, palette and `modCommandsStore` runs. See [run.target](02-actions-and-entry-points.md#runtarget) |
| `run.signal` | `AbortSignal` | Aborted by **Stop**, and when the mod unloads (switched off, deleted, mods turned off for the vault, vault closed or switched). **Not** aborted by a reload after you save the mod: the reload waits for the run. Not aborted when the run ends normally |
| `run.log(text)` | `(text: string) => void` | Adds one entry to the run's log. See [Log](#log) |
| `run.progress(done, total, label?)` | `(done: number, total: number, label?: string) => void` | Sets the progress bar. Throws on bad arguments. See [Progress](#progress) |
| `run.ui` | `ModUiV1` | The run's own dialogs: `alert`, `confirm`, `prompt`, `pick`, `loading`. Closed by **Stop**. See [run.ui and ctx.ui](#runui-and-ctxui) |

The run id, the entry point (`rail`, `command`, `note-menu`, `folder-menu`) and the status are not exposed to the mod. `run.signal.aborted` is the only state you can read.

## States

| Status | Shown as | Reached when |
|--------|----------|--------------|
| `running` | **Running** | The run starts |
| `done` | **Done** | `run` returned, or its promise resolved |
| `failed` | **Failed** | `run` threw or rejected **while `run.signal` was not aborted** |
| `cancelled` | **Cancelled** | `run.signal` aborted (Stop or unload). Set at the moment of the abort, before your code reacts |

- `running` is the only state that changes. **Done**, **Failed** and **Cancelled** are final: nothing moves a run out of them. A run cancelled by Stop stays **Cancelled** even if your `run` later resolves or throws.
- **Done** means only that the function settled without an error. It says nothing about whether the notes ended up as intended.
- The host keeps the **newest** run of each action, live or ended. Starting the action again replaces the ended one; a run view that showed it now shows the new run.

## When the run view opens

The run view sits inside the action picker modal. It shows the action title, the status, the progress bar (only after the first `run.progress`), the label under it, **Reload pending** while a reload of the mod waits for its runs, the log (only when it has entries), and on **Failed** the error message with a **Details** expander holding the stack. **Stop** shows while the run is running; **Close** always.

| Started from | Action without `input` | Action with `input` |
|--------------|------------------------|---------------------|
| Rail button (single action or picked from the list) | Opens when the run starts | Opens when **Enter** is pressed in the text field |
| Command palette | **Quiet**: opens on the first `run.log` or `run.progress` | Opens when **Enter** is pressed in the text field |
| Note row menu | **Quiet** | Opens at **Enter** |
| Folder or vault-root menu | **Quiet** | Opens at **Enter** |
| `ctx.app.modCommandsStore` row `run()` | **Quiet** | Opens at **Enter** |
| Any entry point, while the action is already running | Shows the live run's view at once (even a quiet one) | Same: no text field |

When a run view opens, it replaces whatever the picker was showing: an action list, a text field (of any mod) or another run's view. The replaced run keeps running.

### Quiet runs

A quiet run starts without a view, so it never interrupts the user. Then:

- The first **valid** `run.log` or `run.progress` call opens the view, once. It opens even when another picker is open, replacing it, including another mod's text field the user is typing in. Prefer to log only when there is something to read.
- Invoking the action again while it runs (palette, menu, rail, row) opens the view.
- After the user presses **Close**, later output does **not** reopen it.
- After **Stop**, output is ignored, so the view does not open either.
- A quiet run that ends **Done** without any output leaves nothing on screen. This is the right shape for an action that only opens a note, shows a toast or opens a dialog.
- A quiet run that **fails** before any output stays hidden: the user sees only the toast `<Mod name>: <title> failed: <message>`. The stack is then only in the debug log (see [Failures](#failures)).
- While hidden, the run has no visible **Stop**. The busy dot on a rail button that lists the action is often the only visible sign that it is running. A hidden run also holds a reload of the mod, with no visible **Reload pending** until its view opens.

### When the run view closes

- **Automatically**, when the run ends **Done** with no log entry and no `run.progress` call. A rail run of a quick action therefore flashes its view and closes it, leaving no "Done" window behind. To keep the view on **Done**, log a line or show progress.
- A run that logged or showed progress stays on **Done** until the user closes it. **Failed** and **Cancelled** never close by themselves.
- **Close**, **Escape** or a click outside hides the view. The run goes on; invoking the action again shows it.
- Focus is on **Stop** while running and on **Close** once ended, and **Enter** presses the focused button. A user who presses **Enter** in a running view stops the run.
- When the mod is switched off in Labs, deleted or reloaded, an open run view stays to show how the run ended (usually **Cancelled**). Turning mods off for the vault, or closing the vault, closes it.

## Ending an action

How the action ends decides what the user is left looking at. The run view is a modal: while it shows, the note behind it cannot be typed in.

| The action ends by | Do | Because |
|--------------------|----|---------|
| Opening a note (`ctx.workspace.openNote`, `openFileInEditor`, `createTypedNote` then open) | No `run.log` and no `run.progress` anywhere on the success path. Report in a toast if at all | A run that logged or showed progress stays on **Done** on top of the note it just opened, until the user closes it. One without output closes its view by itself |
| Opening your own panel or form | The same, and open it from a timer after `run` returns (see [Custom UI](08-custom-ui.md#a-themed-modal-dialog)) | The run view is still open while `run` runs |
| A report the user should read (counts, skipped notes) | `run.log` the lines; the view stays on **Done** | That is what the log is for |
| A long batch | `run.progress` while it runs; a summary line at the end | Shows **Stop** and the bar; the user closes the view |
| Nothing to do: already running elsewhere, nothing selected, everything already done | `ctx.notify('Nothing to tag: every note already has it'); return;` | A throw is a failure: **Failed**, a red toast and, from the rail, a view that stays open. "Nothing to do" is not an error |
| A real refusal: the wrong kind of target, invalid input, a missing note | `throw new Error('Choose a Markdown note')` | The user has to change something; **Failed** says so |

For a long walk before opening a note, use `run.ui.loading` (a dialog that closes with the task, with an optional Cancel) instead of `run.progress`, so a quiet run (palette, menus, `modCommandsStore`) never opens its view. A rail start opens the view when the run starts whatever the action does; it closes by itself on **Done** only when nothing was logged and no progress was shown. The [folder-report example](../../examples/mods/folder-report/) does this.

## Log

`run.log(text)`:

- Accepts any value and converts it with `String(text)`: `undefined` logs `undefined`, an object logs `[object Object]`. Format objects yourself (`JSON.stringify(value)`).
- `''` is a real entry: it counts as output (it opens a quiet view and keeps the view open on **Done**).
- One call is one entry. Newlines inside the text are shown as line breaks within that entry. Text is shown as plain monospace text: no Markdown, no HTML.
- The view keeps the **last 500 entries**. Older ones are dropped; there is no way to read them back.
- The log box follows new entries unless the user has scrolled up.
- Ignored silently unless this run is still running and is still the action's newest run. A late `log` from an old, stopped run can never write into a newer run of the same action.
- Saved to the session log file only when both **Save debug log to file** and **Save mod run messages to file** are on (Settings → Troubleshooting). The file is not capped at 500. See [Errors and debugging](15-errors-and-debugging.md#host-execution-trace-and-run-messages).

`run.log` is the run's visible log. `ctx.log(...)` is the mod's debug log, written to the log file only when debug logging is on, and never shown in the run view.

## Progress

`run.progress(done, total, label?)`:

| Call | Result |
|------|--------|
| `done` or `total` not a finite number (a string, `NaN`, `Infinity`, `undefined`) | Throws `Mod "<id>": run.progress needs numbers done and total` |
| `label` set but not a string | Throws `Mod "<id>": run.progress needs a string label` |
| Any finite numbers | Accepted as given: negatives, `done > total` and `total` 0 all pass |

- The bar width is `done / total`, clamped to 0 to 100%. With `total <= 0` the bar is empty.
- Each call replaces the previous bar and label. There is no "indeterminate" mode: use a label (`run.progress(0, 1, 'Fetching...')`) or `run.ui.loading` (see [Dialogs](06-dialogs.md#loading)).
- The label shows under the bar only when it is a non-empty string. `label` omitted or `''` shows no label.
- Validation runs **before** the "is the run still live" check: a malformed call throws even after the run ended or was stopped. A valid call after the run ended is ignored.
- A throw from `run.progress` is an ordinary exception in your action: uncaught, it fails the run with that message.
- The first valid call opens a quiet run's view, like `run.log`.

## One live run per action

An action has at most one live run, whatever starts it. Starting an action that is already running (from a rail button, the palette, a menu, a `modCommandsStore` row, a picker row, or **Enter** in a text field that was opened before the action started elsewhere) shows the live run's view and starts nothing: no second run, no toast, `run` is not called.

- The rule is per action (`mod:<mod-id>:action:<action-id>`), not per rail button: two buttons listing the same action share it.
- A menu click on another note while the action runs shows the live run, which keeps its own `run.target`. The new target is discarded. A mod that must process several targets queues them itself.
- Different actions of the same mod run side by side, and so do actions of different mods.
- When a run ends (**Done**, **Failed** or **Cancelled**) the action can start again at once.
- In an action list, a running action shows **Running** after its title.

## Stop

**Stop** (in the run view) aborts `run.signal`. The host then, synchronously:

1. marks the run **Cancelled**;
2. closes the run's `run.ui` dialogs, open and queued: their promises reject with a `DOMException` named `AbortError` (message `The run was stopped`), and any later `run.ui` call rejects the same way at once. The mod's `ctx.ui` dialogs stay open;
3. ends the run in the host: the busy mark clears, the action is free to start again, and a reload of the mod that was waiting for this run proceeds.

Unload does the same to every live run of the mod, before it calls `onunload()` and before its cleanups.

### What Stop cannot do

Stop cannot interrupt JavaScript. Your `run` keeps executing until it reaches a check of `run.signal`, an `await` on something that honors the signal (`fetch(url, { signal: run.signal })`, a `run.ui` dialog), or its end. Consequences:

- **The old body can overlap a new run.** Because the action is free the moment Stop is pressed, the user can start it again while the stopped body is still running, for example blocked on an `await` that ignores the signal. Two bodies of the same action then run at once. The old body's `run.log` and `run.progress` are ignored, but its vault writes, `ctx.notify` toasts and `ctx.app` calls still happen. Check `run.signal.aborted` before every write, not only at the top of a loop.
- **A reload can overtake it.** If the mod reloads after Stop while the old body still runs, the old `ctx` is unloaded: its `ctx.vault`, `ctx.notify`, `ctx.app` and other calls throw `Mod "<id>" is unloaded`. Those throws are swallowed (see below), but objects you took from `ctx.app` earlier stay usable and are not protected.
- **A synchronous loop cannot be stopped at all.** Mods run on the app's main thread: a long loop with no `await` freezes the whole app, the Stop button included. See [yield in CPU-bound loops](#yield-in-cpu-bound-loops).

### Errors after Stop are dropped

Once `run.signal` is aborted, any throw or rejection from `run` (an `AbortError`, an `unloaded` error, or a real bug) is swallowed: no toast, no **Failed** status, no line in the debug log. The run stays **Cancelled**.

This is what makes cancellation clean, and it also hides genuine errors that happen while stopping. If cleanup after a Stop can fail in ways you need to see, catch and log them yourself:

```javascript
try {
	await cleanUp();
} catch (err) {
	ctx.log('cleanup after stop failed:', err instanceof Error ? `${err.message}\n${err.stack}` : String(err));
	throw err;
}
```

`ctx.log` writes to the file only when **Save debug log to file** is on. Pass `err.message` and `err.stack`, not the `Error`, which the log file records as `{}`.

### AbortError

- `run.ui.*` rejects with `AbortError` once the run is stopped; `fetch(url, { signal: run.signal })` rejects with an `AbortError` when Stop is pressed mid-request. **Let these propagate.** The host treats any rejection after the abort as cancellation, so you do not need to catch them.
- If you catch errors for cleanup, rethrow, or `return`. Do not catch an `AbortError` and continue the work: the run is already **Cancelled**, its log is ignored, and its dialogs reject.
- An `AbortError` while `run.signal` is **not** aborted is an ordinary failure: **Failed** plus a toast. This happens with your own `AbortController` (a timeout, for example), or with a cancellable `run.ui.loading` whose **Cancel** aborted only the task's signal (see [Dialogs](06-dialogs.md#loading)). Handle the cases you intend:

```javascript
/** fetch that aborts on Stop or after `ms`, whichever comes first. */
async function fetchWithTimeout(url, signal, ms) {
	const timeout = new AbortController();
	const timer = setTimeout(() => timeout.abort(), ms);
	const onStop = () => timeout.abort();
	signal.addEventListener('abort', onStop, { once: true });
	try {
		return await fetch(url, { signal: timeout.signal });
	} finally {
		clearTimeout(timer);
		signal.removeEventListener('abort', onStop);
	}
}

try {
	await fetchWithTimeout(url, run.signal, 10_000);
} catch (err) {
	if (run.signal.aborted) throw err;                       // Stop: let it end Cancelled
	if (err instanceof DOMException && err.name === 'AbortError') throw new Error('The request timed out');
	throw err;
}
```

## Cancellation patterns

### Check between steps

Check `run.signal.aborted` after every `await` that can take time and before every write. `return` on abort, so the code after the loop (success toasts, summaries) does not run. A loop whose stopped work must be reported breaks to one aborted exit instead (see [Reporting partial work](#reporting-partial-work)):

```javascript
for (const [i, entry] of files.entries()) {
	if (run.signal.aborted) return;
	run.progress(i, files.length, entry.path);
	const text = await ctx.vault.read(entry.path);
	if (run.signal.aborted) return;                 // the read may have taken a while
	if (!text.includes('#reviewed')) await ctx.vault.write(entry.path, `${text.replace(/\n*$/, '\n')}\n#reviewed\n`);
}
```

### Pass the signal on

`fetch` takes `run.signal` directly, and so does anything else that accepts an `AbortSignal`. The request is cancelled on Stop and the `await` rejects with `AbortError`, which you let propagate. Only hosts in the app's Content Security Policy are reachable: see [Network and platform](11-network-and-platform.md#fetch-and-the-csp).

```javascript
const res = await fetch('https://huggingface.co/api/models?search=bert&limit=5', { signal: run.signal });
if (!res.ok) throw new Error(`Hugging Face answered ${res.status}`);
const models = await res.json();
```

### Abortable sleep

`setTimeout` ignores the signal. Wrap it, and clear the timer on abort:

```javascript
/** Resolves after `ms`, or at once when `signal` aborts. */
function sleep(ms, signal) {
	return new Promise((resolve) => {
		if (signal.aborted) return resolve();
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener('abort', done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener('abort', done, { once: true });
	});
}

await sleep(500, run.signal);
if (run.signal.aborted) return;
```

### Yield in CPU-bound loops

A loop that does pure computation over thousands of items never gives the app a chance to process the Stop click (or anything else). Yield every few hundred items:

```javascript
for (let i = 0; i < items.length; i++) {
	if (i % 200 === 0) {
		await new Promise((resolve) => setTimeout(resolve, 0)); // lets the UI, and Stop, run
		if (run.signal.aborted) return;
		run.progress(i, items.length);
	}
	results.push(expensive(items[i]));
}
```

### Guard the last moment

When your own edit helper takes a callback that produces the new text (for example the edit-through-the-editor recipe in [Vault files](04-vault-files.md#editing-a-note-that-may-be-open)), check the signal inside the callback too, so a Stop between the read and the write changes nothing. Returning the text unchanged should write nothing:

```javascript
/** Reads a note, applies `edit`, writes only when the text changed. */
async function editFile(path, edit) {
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next !== text) await ctx.vault.write(path, next);
}

await editFile(path, (text) => (run.signal.aborted ? text : `${text.replace(/\n*$/, '\n')}\n${line}\n`));
```

### Work outside an action

Timers, watchers and save callbacks are not runs: they have no `run.signal` and no Stop. Use `ctx.signal`, which aborts at unload. Code that runs both inside and outside actions can use one predicate: `const stopped = () => run.signal.aborted || ctx.signal.aborted;`. See [Events and reactivity](07-events-and-reactivity.md#ctxsignal).

## Reporting partial work

After Stop, the run view says **Cancelled**, `run.log` is ignored and `run.ui` rejects. If the action already changed something, the only way left to tell the user is a toast. Use a `warning` that says what was done and what was not.

Give the loop **one aborted exit**: inside the loop, `break` on abort (never `return`, which skips the report), and right after the loop, one check that always reports and returns:

```javascript
let changed = 0;
for (const path of paths) {
	if (run.signal.aborted) break;
	const text = await ctx.vault.read(path);
	if (run.signal.aborted) break;
	if (text.includes(TAG)) continue;
	await ctx.vault.write(path, `${text.replace(/\n*$/, '\n')}\n${TAG}\n`);
	changed++;
}
if (run.signal.aborted) {
	// Every break above lands here, so a stopped run always reports.
	if (changed > 0 && !ctx.signal.aborted) {
		ctx.notify(`Stopped: ${changed} of ${paths.length} notes tagged; the rest were not touched`, { kind: 'warning' });
	}
	return;
}
```

- **A loop that awaits `run.ui` needs a `try`/`finally` (or `catch`) for this report.** Stop while a dialog is open rejects that `await` with `AbortError`, so control never reaches the `if (run.signal.aborted)` check after it, and the report is skipped. "Check `run.signal.aborted` after every `await`" covers the other awaits; a `run.ui` call needs no check of its own (it rejects instead of resolving), but code that must run after a Stop has to sit in a `finally`:

```javascript
let moved = 0;
try {
	for (const note of notes) {
		const picked = await run.ui.pick({ title: note.name, items }); // rejects with AbortError on Stop
		if (picked === null || run.signal.aborted) return;
		await ctx.vault.move(note.path, picked.id);
		moved++;
	}
} finally {
	// Runs on Stop during the pick too; the AbortError still propagates after it.
	if (run.signal.aborted && moved > 0 && !ctx.signal.aborted) {
		ctx.notify(`Stopped: ${moved} of ${notes.length} notes moved; the rest stay where they were`, { kind: 'warning' });
	}
}
```

- Guard with `!ctx.signal.aborted`: when the abort came from an unload, `ctx.notify` throws `Mod "<id>" is unloaded` (harmless, since it is swallowed, but it skips whatever follows).
- Say nothing when nothing changed: **Cancelled** is already the right message.
- Order writes so that a Stop at any point leaves a consistent state: one write per note, the destination before the source (copy, then mark the original), and a rerun that skips what is already done. Then the warning can simply say "run it again to finish".

### Why there is no final 100% on a stopped run

A common shape is a loop that ends with `run.progress(total, total, 'Done')` and a success toast. After Stop, the progress call is ignored, so the bar keeps the last value it had before Stop: that is the honest number. The toast is not ignored. If the loop uses `break` on abort and falls through to `ctx.notify('All notes tagged', { kind: 'success' })`, the user is told the batch finished when it did not. Use `return` (or check `run.signal.aborted` after the loop) so a stopped run never reaches the success path.

## Failures

When `run` throws or rejects while `run.signal` is not aborted:

- The run ends **Failed**. If the view is open it shows the message and, for an `Error`, a **Details** expander with the stack.
- A toast shows `<Mod name>: <Action title> failed: <message>`.
- The mod's debug log gets `<Action title> failed: <message>` followed by the stack (in the file when **Save debug log to file** is on).
- It is never sent to Sentry.
- `<message>` is `err.message` for an `Error`, else `String(err)`. Throwing a string gives that string and no stack. `ctx.vault`, `ctx.workspace` and `ctx.app` calls can reject with bare strings (file system errors passed through), so `err.message` can be `undefined` in your own `catch`: use `err instanceof Error ? err.message : String(err)`. `ctx.loadData` and `ctx.saveData` always reject with an `Error`.

A quiet run that fails before any output never opens its view; the toast is all the user sees. To read the stack, use the debug log. WebKit stacks list function names without file and line numbers; see [Errors and debugging](15-errors-and-debugging.md#stack-traces).

To fail on purpose, throw an `Error` with a message written for the user: `throw new Error('Choose a Markdown note')`.

## run.ui and ctx.ui

Inside an action, use **`run.ui`** for every dialog. Its dialogs belong to the run: Stop closes them and rejects them with `AbortError`, so an action waiting on a dialog stops there without a signal check. **`ctx.ui`** belongs to the mod: Stop leaves its dialogs open and the action keeps waiting on them. Use `ctx.ui` only outside actions (watchers, save callbacks, your own UI). User cancellation is not an error for either: `confirm` resolves `false`, `prompt` and `pick` resolve `null`. Methods, options, validation and queueing are in [Dialogs](06-dialogs.md).

## Reloads and unloads during a run

| Event | Effect on a live run |
|-------|----------------------|
| You save the mod's `main.js` or `manifest.json` | The reload **waits** for every live run of the mod, quiet ones included. The run view shows **Reload pending**. Stop the run to reload sooner |
| The mod is switched off in Labs, its folder is deleted, mods are turned off for the vault, the vault closes or switches | The run is aborted at once (**Cancelled**), before `onunload()` runs. Its `run.ui` dialogs reject with `AbortError`; every `ctx` call then throws `Mod "<id>" is unloaded` |

Removing an action with its disposer does not stop its live run.

## A complete mod: batch with confirm, progress and Stop

Tags every Markdown note directly inside a folder (from the folder menu, or the folder typed into the picker), after a confirmation, with progress, a log, Stop handling and a partial-work warning. Copy it with a `manifest.json` whose `id` is `batch-tag` into `_system/mods/batch-tag/`.

```javascript
const TAG = '#batch-tagged';

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'tag-folder',
			title: 'Tag notes in a folder',
			description: `Appends ${TAG} to every note directly in the folder`,
			input: { placeholder: 'Folder to tag (empty for the vault root)' },
			run: async (text, run) => {
				// Captured before any await: the menu target, else the typed folder.
				const folder = run.target?.on === 'folder' ? run.target.path : text.trim().replace(/^\/+|\/+$/g, '');

				const entries = await ctx.vault.list(folder);
				const notes = entries.filter((e) => !e.isFolder && /\.md$/i.test(e.name));
				// Nothing to do is not a failure: a toast, no Failed run.
				if (notes.length === 0) return ctx.notify(`No notes in ${folder || 'the vault root'}`);

				// Rejects with AbortError on Stop; resolves false on Cancel.
				const ok = await run.ui.confirm({
					title: `Tag ${notes.length} notes?`,
					message: `Appends ${TAG} to each note in ${folder || 'the vault root'} that does not have it.`,
					confirmLabel: 'Tag',
				});
				if (!ok) return;

				let changed = 0;
				let skipped = 0;
				for (const [i, note] of notes.entries()) {
					if (run.signal.aborted) break;
					run.progress(i, notes.length, note.name);
					try {
						const body = await ctx.vault.read(note.path);
						if (run.signal.aborted) break;
						if (body.includes(TAG)) continue;
						await ctx.vault.write(note.path, `${body.replace(/\n*$/, '\n')}\n${TAG}\n`);
						changed++;
					} catch (err) {
						if (run.signal.aborted) break;
						// A note with unsaved changes in a tab refuses the write: skip it, keep going.
						skipped++;
						run.log(`Skipped ${note.path}: ${err instanceof Error ? err.message : String(err)}`);
					}
				}

				if (run.signal.aborted) {
					if (changed > 0 && !ctx.signal.aborted) {
						ctx.notify(`Stopped: ${changed} of ${notes.length} notes tagged. Run it again to finish.`, { kind: 'warning' });
					}
					return; // no final 100%, no success toast
				}
				run.progress(notes.length, notes.length, 'Done');
				run.log(`${changed} tagged, ${notes.length - changed - skipped} already tagged, ${skipped} skipped`);
				ctx.notify(`${changed} notes tagged`, { kind: skipped > 0 ? 'warning' : 'success' });
			},
		});
		ctx.labs.place('tag-folder', { palette: true, menu: { on: ['folder'] } });
		ctx.addRailButton({ id: 'main', title: 'Batch tag', icon: 'lucide:tags', actions: ['tag-folder'] });
	},
};
```

Here `break` is safe because the code after the loop checks `run.signal.aborted` first. Each note is one write, so a Stop between notes leaves every note either tagged or untouched, and a rerun skips the ones already tagged.

> [!NOTE]
> Because the action has `input`, the text field opens even from the folder menu, and the clicked folder wins over whatever is typed. An action that needs no text should omit `input`: from a menu it then runs at once, quietly, and its view opens on the first `run.progress`.
