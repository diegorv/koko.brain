# Dialogs

A mod asks the user something through the app's own dialogs: `alert`, `confirm`, `prompt`, `pick` and `loading`. They follow the theme, take focus, show the mod's name as a caption, and queue so only one is on screen at a time. This page covers every method, its options, its keys, how it validates, how it queues, and what happens on **Stop** and unload.

All of it is **stable** (contract v1): `ctx.ui` and `run.ui` have the same five methods.

For the run view these dialogs sit on, see [Runs](03-runs.md#when-the-run-view-opens). For a form, a layout or any UI these five do not cover, build your own (see [Custom UI](08-custom-ui.md#a-themed-modal-dialog)).

## Which set to use

| Set | Owner | Use it | On **Stop** | On unload |
|-----|-------|--------|-------------|-----------|
| `run.ui` | One action run | Inside an action's `run(input, run)` | Open and queued dialogs of that run close and **reject** with an `AbortError` | Same as **Stop** for a live run (the unload aborts it first) |
| `ctx.ui` | The mod | Outside actions: `ctx.watch`, `ctx.onNoteSaved`, a keyboard shortcut, your own UI | Nothing: **Stop** never touches them | Open and queued dialogs close with their **cancel value** |

**Rule: inside an action, always use `run.ui`.** A `ctx.ui` dialog opened from an action outlives a **Stop**, so the user presses Stop and the dialog stays up.

## What every dialog has

- A small caption above the title with the manifest `name` (not the id).
- A title (`title`, or the `label` for `loading`). It must be a non-empty string.
- An optional `message` under the title (not for `pick` or `loading`). Line breaks (`\n`) in `message` show as line breaks. An empty `message` shows nothing.
- A close (X) button in the top-right corner, except on `loading`.
- Plain text everywhere: titles, messages, labels and item text are never parsed as HTML or Markdown.
- Every method is `async`: a bad argument is a **rejected promise**, never a synchronous throw. A call you do not `await` needs a `.catch` (see [Un-awaited calls](#un-awaited-calls-need-a-catch)).

## `alert`

```javascript
await run.ui.alert({ title: 'Done', message: '12 notes archived', kind: 'success' });
```

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `title` | string | required | Non-empty |
| `message` | string | none | Must be a string when present (`null` rejects) |
| `kind` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Sets the icon left of the title (info, check, triangle, cross, in the primary, success, warning and destructive colors). Any other value, including a typo, silently becomes `'info'` |

- **Resolves** `undefined` once dismissed, whichever way (OK, Esc, X, outside click, unload of a `ctx.ui` alert).
- **Keys:** the OK button has focus, so **Enter** (or Space) presses it. **Esc** dismisses.
- The button label is always `OK`; there is no option to change it.

## `confirm`

```javascript
const ok = await run.ui.confirm({
	title: 'Delete 3 notes?',
	message: 'They go to the trash.',
	confirmLabel: 'Delete',
	destructive: true,
});
if (!ok) return;
```

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `title` | string | required | Non-empty |
| `message` | string | none | Must be a string when present |
| `confirmLabel` | string | `'OK'` | An empty string also gives `'OK'` |
| `cancelLabel` | string | `'Cancel'` | An empty string also gives `'Cancel'` |
| `destructive` | boolean | `false` | Styles the confirm button as destructive. Only the value `true` counts: `1` or `'yes'` does not |

- **Resolves** `true` on confirm, `false` on every kind of cancel (Cancel button, Esc, X, outside click, unload of a `ctx.ui` confirm).
- Buttons: cancel (outline) on the left, confirm on the right.
- **Keys:** the **confirm button has focus when the dialog opens, also when `destructive: true`**. **Enter** anywhere in the dialog confirms, except when focus is on another button (Cancel or X), which Enter then presses instead. **Esc** cancels. Enter during IME composition does nothing.

> [!WARNING]
> Because the confirm button is focused at once, a user who presses Enter right as a destructive confirm appears confirms it. Make the title state the consequence and the count ("Delete 3 notes?"), and do not chain two destructive confirms back to back expecting the second to catch a stray Enter.

## `prompt`

```javascript
const name = await run.ui.prompt({ title: 'Rename note', label: 'New name', value: 'Draft' });
if (name === null) return; // cancelled
if (!name.trim()) throw new Error('Type a name');
```

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `title` | string | required | Non-empty |
| `message` | string | none | Must be a string when present |
| `label` | string | none | Shown above the field when non-empty |
| `placeholder` | string | `''` | Field hint |
| `value` | string | `''` | Initial text. `null` rejects; omit it instead |
| `multiline` | boolean | `false` | A text area instead of a one-line field. Only the value `true` counts |

- **Resolves** the text exactly as typed: **not trimmed, and `''` when the user submits an empty field**. **Resolves `null`** on cancel (Cancel button, Esc, X, outside click, unload of a `ctx.ui` prompt).
- **Test cancel with `=== null`.** `if (!answer) return` treats an empty submit as a cancel, which is a bug when an empty answer means something (clear a value).
- **Keys:** the field has focus when the dialog opens.
  - One-line field: **Enter** submits.
  - `multiline: true`: **Enter** inserts a newline; **Cmd+Enter or Ctrl+Enter** submits.
  - Never submits during IME composition (Japanese, Chinese, ...).
  - **Esc** cancels. Tab moves to the Cancel and OK buttons; Enter on a focused button presses it.
- The buttons are always `Cancel` and `OK`.
- Each prompt starts from its own `value`: a queued prompt never inherits the text of the one before it.

## `pick`

```javascript
const choice = await run.ui.pick({
	title: 'Choose a template',
	placeholder: 'Search templates...',
	items: [
		{ id: 'meeting', title: 'Meeting', description: 'Agenda and notes', file: 'Templates/Meeting.md' },
		{ id: 'review', title: 'Weekly review', file: 'Templates/Review.md' },
	],
});
if (choice === null) return;
run.log(`Using ${choice.file}`); // extra fields survive
```

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `title` | string | required | Non-empty. Also the accessible name of the search field |
| `placeholder` | string | `'Search items...'` | Search field hint. `''` shows no hint |
| `items` | array | required | May be empty |
| `message` | string | none | Validated as a string when present, but **never shown** |

Each item:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Non-empty, unique within `items` (case-sensitive). A number id rejects: use `String(n)` |
| `title` | string | Non-empty. The row's main text |
| `description` | string | Optional. Small muted text under the title. `null` **rejects**: omit the field or pass `undefined`. `''` shows nothing |
| anything else | any | Ignored by the dialog, kept on the object you get back |

**Return value.** Resolves the **original item object** you passed (same identity, every extra field intact), or `null` on cancel (Cancel button, Esc, X, outside click, unload of a `ctx.ui` pick). The generic type is `Promise<T | null>`.

**Snapshot.** `id`, `title` and `description` are read once, when you call `pick`. Changing the items afterwards does not change the list, and no mod code (getters included) runs while the user types.

**What shows.**

- Empty search (or only spaces): the **first 100 items in the order you supplied**. Items 101 and later are reachable only by typing.
- With a search: the query is trimmed, every item is tested, matches are ranked, and the **best 100** show.
- No rows (empty `items`, or nothing matches): the list shows `No items found.`. Enter does nothing and the dialog stays open; Esc, Cancel and X still close it.

**Search algorithm.** Each item is matched against one string, `"<title> <description>"` (with no description, the title plus a trailing space).

1. Case-insensitive **subsequence** match: every query character must appear in order, not necessarily adjacent. `prj` matches `Project`; it is not word-based. Spaces inside the query are characters too, so `my note` needs a space between the matched letters.
2. Score (lower ranks first): the sum of the gaps between consecutive matched characters (the first match is found greedily, leftmost), minus `2 x query length` when the string starts with the query, plus `string length - query length` (shorter strings win).
3. Ties keep your supplied order.

So: put what users type in `title`, keep `description` short (a long description makes every item a longer string and ranks it lower), and order `items` by relevance yourself, since an empty search shows them as given.

**Keys and pointer.** The search field has focus; the **first row is highlighted** when the dialog opens, so **Enter** accepts it at once. **Up/Down** move the highlight, **Enter** accepts the highlighted row, a click accepts a row. Enter during IME composition does not accept. **Esc** cancels. The search text starts empty for each new pick.

## `loading`

```javascript
const pages = await run.ui.loading('Reading notes...', async (signal) => {
	const entries = await ctx.vault.list('Projects');
	if (signal.aborted) return null;
	return entries.filter((e) => !e.isFolder);
}, { cancellable: true });
if (pages === null || run.signal.aborted) return;
```

Signature: `loading(label, task, options?)`. Note the shape: `label` is the first argument, not an option.

| Argument | Type | Default | Notes |
|----------|------|---------|-------|
| `label` | string | required | Non-empty. Shown as the title next to a spinner |
| `task` | `(signal) => T \| Promise<T>` | required | Called **at once**, with an `AbortSignal` of its own |
| `options.cancellable` | boolean | `false` | Adds a Cancel button. Only the value `true` counts |

- **Resolves** with what `task` returns or resolves to. **Rejects** with what `task` throws or rejects with (a synchronous throw becomes a rejection).
- The dialog **cannot be dismissed**: no X button, Esc and outside clicks are ignored. It closes when the task settles, or on Cancel, **Stop** or unload.
- With `cancellable: true` the Cancel button has focus, so **Enter or Space presses Cancel**.
- **The task starts at call time, even while its dialog is still queued** behind other dialogs. A task that finishes before its turn never shows a dialog at all.

**The task's signal** aborts on:

| Event | `ctx.ui.loading` | `run.ui.loading` |
|-------|------------------|------------------|
| Cancel button (`cancellable: true`) | aborts; dialog closes; **promise still follows the task** | same |
| Mod unload | aborts; dialog closes; **promise still follows the task** | aborts; **promise rejects at once** with `AbortError` |
| **Stop** of the run | not affected | aborts; **promise rejects at once** with `AbortError` |

> [!IMPORTANT]
> Cancel closes the dialog and aborts the signal, nothing more. The `loading` promise keeps waiting for your task. A task that ignores `signal` keeps running and resolves normally, so the caller cannot tell the user cancelled. Check `signal.aborted` inside the task between steps, pass `signal` to `fetch`, and return a sentinel (`null`) when aborted, as in the example above. After **Stop**, a `run.ui.loading` rejects without waiting, but the task's JavaScript still runs until it notices the signal.

## Results at a glance

| Method | Submit | Cancel (Esc, Cancel, X, outside click) | `run.ui` after **Stop** or unload of its live run | `ctx.ui` on unload |
|--------|--------|----------------------------------------|-----------------------------------------------|--------------------|
| `alert` | `undefined` | `undefined` | rejects `AbortError` | `undefined` |
| `confirm` | `true` | `false` | rejects `AbortError` | `false` |
| `prompt` | the text (may be `''`) | `null` | rejects `AbortError` | `null` |
| `pick` | the original item | `null` | rejects `AbortError` | `null` |
| `loading` | task's value | (Cancel button only) task's value, signal aborted | rejects `AbortError` at once | task's value, signal aborted |

The `AbortError` is `new DOMException('The run was stopped', 'AbortError')`: test it with `err.name === 'AbortError'`.

## Keyboard summary

| Kind | Initial focus | Enter | Cmd/Ctrl+Enter | Esc | X and outside click |
|------|---------------|-------|----------------|-----|---------------------|
| `alert` | OK | OK | | dismiss | dismiss |
| `confirm` | confirm button (also destructive) | confirm (a focused Cancel or X gets pressed instead) | | cancel | cancel |
| `prompt` | field | submit (one line) / newline (multiline) | submit (multiline) | cancel | cancel |
| `pick` | search field, first row highlighted | accept highlighted row (nothing with no rows) | | cancel | cancel |
| `loading` | Cancel when `cancellable` | presses Cancel when `cancellable` | | ignored | ignored (no X) |

## Validation

### Check order

Every method checks, in this order, and stops at the first failure:

1. **`run.ui` only:** the run's signal is aborted (Stop or unload) -> rejects `AbortError`. This comes before everything, so after **Stop** even `run.ui.alert(null)` rejects with `AbortError`, not a validation error.
2. The mod is unloaded or the vault changed -> rejects `Mod "<id>" is unloaded`.
3. Arguments, in this order:
   - `alert`, `confirm`, `prompt`, `pick`: `title`, then `message`, then the method's other text fields in the order listed below, then (pick) `items`, then each item in array order (`id` and `title`, then `description`, then duplicate id).
   - `loading`: `label`, then `task`.

### Messages, verbatim

`<id>` is the manifest id. `<fn>` is `alert`, `confirm`, `prompt` or `pick`.

| Message | When |
|---------|------|
| `Mod "<id>": ui.<fn> needs a non-empty string title` | `title` missing, `''`, not a string, or the options object itself missing or not an object |
| `Mod "<id>": ui.<fn> needs a string <field>` | a text field is present but not a string (`null` included). Fields: `message` for all four; then `confirmLabel`, `cancelLabel` (confirm); `label`, `placeholder`, `value` (prompt); `placeholder` (pick) |
| `Mod "<id>": ui.pick needs an items array` | `items` is not an array |
| `Mod "<id>": ui.pick needs items with non-empty string ids and titles` | an item is `null`, a string, a number, or lacks a non-empty string `id` or `title` |
| `Mod "<id>": ui.pick needs a string item description` | an item's `description` is present and not a string (`null` included) |
| `Mod "<id>": ui.pick duplicate item id "<itemId>"` | two items share an `id` |
| `Mod "<id>": ui.loading needs a non-empty string label` | first argument missing, `''` or not a string |
| `Mod "<id>": ui.loading needs a task function` | second argument is not a function |
| `Mod "<id>" is unloaded` | any call after unload or a vault switch |
| `The run was stopped` (`DOMException`, name `AbortError`) | any `run.ui` call after its run's signal aborted |

A common mistake is passing a string: `ctx.ui.alert('Saved')` and `run.ui.confirm('Sure?')` both reject with `ui.<fn> needs a non-empty string title`. Always pass an options object.

### Silent coercions (no error)

| Input | Becomes |
|-------|---------|
| `alert` `kind` not one of the four | `'info'` |
| `confirmLabel: ''` / `cancelLabel: ''` | `'OK'` / `'Cancel'` |
| `destructive`, `multiline`, `cancellable` anything but `true` | `false` |
| `prompt` `value` omitted | `''` |
| `prompt` `label: ''` | no label |
| `pick` `message`, any unknown option, any extra item field | ignored (extra item fields come back on the result) |
| a title of only spaces | accepted as is (only `''` rejects) |

## The queue

- **One queue for the whole app, across all mods.** Only the first dialog shows; the rest wait in call order (first in, first out, no priorities, no size limit). Your dialog can wait behind another mod's.
- A dialog opened from an action shows above that action's run view; when it closes, the run view is back.
- When a dialog closes, the next one shows at once.
- `run.ui` dialogs that are waiting when their run is stopped never show: they reject with `AbortError` and leave the queue.
- `loading` tasks run while queued (see [`loading`](#loading)).

Because the queue has no limit, code that opens a dialog per event (each save, each watch change, each key press) stacks them up. Keep at most one pending per purpose:

```javascript
let asking = false;
ctx.onNoteSaved(async (path) => {
	if (!path.endsWith('.md') || asking) return;
	asking = true;
	try {
		const ok = await ctx.ui.confirm({ title: `Tag ${path}?`, confirmLabel: 'Tag' });
		if (!ok || ctx.signal.aborted) return;
		// ... work
	} finally {
		asking = false;
	}
});
```

## Stop, unload and cancellation

### `run.ui`

- **Stop** (or the unload of the mod, which aborts every live run first) closes every open and queued dialog of that run. Their promises **reject** with `DOMException` `AbortError` (`The run was stopped`). Dialogs of other runs, of this mod or others, and the mod's `ctx.ui` dialogs stay.
- Any later `run.ui` call on that run rejects with the same error at once and opens nothing.
- A rejection after the run's signal aborted is not a failure: the run already ended **Cancelled**, and the host neither toasts nor logs it. **Let the `AbortError` propagate.** Catch it only to clean up, then rethrow or return.
- User cancel is not an abort: Esc or Cancel on a `run.ui` dialog still resolves the cancel value (`undefined`, `false`, `null`). Handle both:

```javascript
const name = await run.ui.prompt({ title: 'Name' }); // rejects AbortError on Stop
if (name === null) return;                            // user cancelled
```

- A run that ended **Done** or **Failed** is not aborted, so `run.ui` still works after the action returned (for example a dialog you did not await). Such a dialog closes with its cancel value at unload, like a `ctx.ui` one.

### `ctx.ui`

- **Stop** has no effect on it.
- At unload, its open and queued dialogs close with their **cancel value** (`alert` resolves, `confirm` `false`, `prompt` and `pick` `null`, `loading` aborts its signal and follows its task). Code after the `await` then runs with a dead `ctx`: check `ctx.signal.aborted` before calling anything else.
- A call after unload rejects `Mod "<id>" is unloaded`.

### Unload order

The unload aborts `ctx.signal` and every live run (closing their `run.ui` dialogs with `AbortError`), closes the mod's picker, closes the remaining dialogs of the mod with cancel values, then calls `onunload` and the registered cleanups. See [Anatomy and loading](01-anatomy-and-loading.md#unload-order).

## Patterns

### Multi-step wizard

Each step awaits one dialog, tests its cancel value, and checks `run.signal.aborted` before touching files. **Stop** needs no code: the next `await run.ui.*` rejects and the run ends **Cancelled**.

```javascript
export default {
	onload(ctx) {
		ctx.addAction({
			id: 'new-project',
			title: 'New project note',
			run: async (_input, run) => {
				const name = await run.ui.prompt({ title: 'Project name', placeholder: 'Website redesign' });
				if (name === null || !name.trim()) return;

				const status = await run.ui.pick({
					title: 'Status',
					items: [
						{ id: 'active', title: 'Active' },
						{ id: 'planned', title: 'Planned' },
						{ id: 'paused', title: 'Paused' },
					],
				});
				if (status === null) return;

				const summary = await run.ui.prompt({
					title: 'Summary',
					message: 'Optional. Cmd+Enter or Ctrl+Enter to finish.',
					multiline: true,
				});
				if (summary === null) return;

				const path = `Projects/${name.trim().replace(/[\\/:*?"<>|]/g, '-')}.md`;
				if (await ctx.vault.exists(path)) {
					const replace = await run.ui.confirm({
						title: `Replace ${path}?`,
						message: 'A note with this name already exists.',
						confirmLabel: 'Replace',
						destructive: true,
					});
					if (!replace) return;
				}
				if (run.signal.aborted) return;

				const text = `---\nstatus: ${status.id}\n---\n\n# ${name.trim()}\n\n${summary}\n`;
				if (await ctx.vault.exists(path)) await ctx.vault.write(path, text);
				else await ctx.vault.create(path, text);
				if (run.signal.aborted) return;
				await ctx.workspace.openNote(path);
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Projects', icon: 'lucide:folder-kanban', actions: ['new-project'] });
	},
};
```

### Confirm before a batch

Collect first, confirm with the count, then work with progress and a **Stop** check per item. Report partial work with a toast, because `run.log` and `run.progress` are dropped once the run is cancelled (see [Runs](03-runs.md#reporting-partial-work)). `ctx.vault.move` does not create the target folder, so check it first.

```javascript
export default {
	onload(ctx) {
		ctx.addAction({
			id: 'archive-done',
			title: 'Archive finished notes in Inbox',
			run: async (_input, run) => {
				const notes = await run.ui.loading('Looking for notes...', async (signal) => {
					const entries = await ctx.vault.list('Inbox');
					const found = [];
					for (const entry of entries) {
						if (signal.aborted) return null;
						if (entry.isFolder || !entry.name.endsWith('.md')) continue;
						const text = await ctx.vault.read(entry.path);
						if (/^status:\s*done\s*$/m.test(text)) found.push(entry);
					}
					return found;
				}, { cancellable: true });
				if (notes === null) return;
				if (notes.length === 0) {
					await run.ui.alert({ title: 'Nothing to archive', message: 'No note in Inbox has status: done.' });
					return;
				}

				const ok = await run.ui.confirm({
					title: `Move ${notes.length} note(s) to Archive?`,
					message: notes.slice(0, 10).map((n) => n.name).join('\n') + (notes.length > 10 ? `\n... and ${notes.length - 10} more` : ''),
					confirmLabel: 'Move',
				});
				if (!ok) return;
				if (!(await ctx.vault.exists('Archive'))) throw new Error('Create an Archive folder first');

				let moved = 0;
				for (const note of notes) {
					if (run.signal.aborted) break;
					run.progress(moved, notes.length, note.name);
					try {
						await ctx.vault.move(note.path, 'Archive');
						moved++;
					} catch (err) {
						run.log(`! ${note.name}: ${err instanceof Error ? err.message : String(err)}`);
					}
				}
				if (run.signal.aborted) {
					if (!ctx.signal.aborted) ctx.notify(`Stopped: ${moved} of ${notes.length} moved`, { kind: 'warning' });
					return;
				}
				run.progress(notes.length, notes.length, 'done');
				ctx.notify(`${moved} note(s) moved`, { kind: 'success' });
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Archive', icon: 'lucide:archive', actions: ['archive-done'] });
	},
};
```

`ctx.vault` rejections can be bare strings, not `Error` objects, hence the `String(err)` fallback (see [Vault files](04-vault-files.md#errors-are-not-always-error-objects)).

### Pick with extra fields

Carry what you need on each item; the result is your own object. A special first row can offer an escape hatch.

```javascript
ctx.addAction({
	id: 'open-recent',
	title: 'Open a note from Journal',
	run: async (_input, run) => {
		const entries = await ctx.vault.list('Journal');
		if (run.signal.aborted) return;
		const notes = entries
			.filter((e) => !e.isFolder && e.name.endsWith('.md'))
			.sort((a, b) => b.name.localeCompare(a.name)); // newest first, by file name

		const choice = await run.ui.pick({
			title: 'Journal',
			placeholder: 'Search by date or title...',
			items: [
				{ id: 'type-path', title: 'Type a path instead', path: null },
				...notes.map((e) => ({ id: e.path, title: e.name.replace(/\.md$/, ''), path: e.path })),
			],
		});
		if (choice === null) return;

		let path = choice.path;
		if (path === null) {
			const typed = await run.ui.prompt({ title: 'Note path', placeholder: 'Journal/2026-01-01.md' });
			if (typed === null || !typed.trim()) return;
			path = typed.trim();
		}
		await ctx.workspace.openNote(path);
	},
});
```

Item ids must be unique strings: a vault path is a natural id. Remember only the first 100 rows show before the user types, so sort the most likely choices first.

### Un-awaited calls need a `.catch`

A dialog you fire and forget still rejects: on **Stop** (`run.ui`), on unload, or on a bad argument. Without a `.catch` that rejection is unhandled, and unhandled rejections from mod code can reach the app's error reporting.

```javascript
// Inside an action: show a note but let the run finish now.
run.ui
	.alert({ title: 'Export started', message: 'You can keep working.' })
	.catch((err) => {
		if (err?.name !== 'AbortError' && !ctx.signal.aborted) ctx.log('alert failed:', String(err));
	});
```

The same applies to `ctx.ui` calls from timers, DOM listeners and `ctx.watch` handlers: either `await` them inside a `try`, or attach a `.catch`.

### Dialogs and your own modal

A modal `<dialog>` you open with `showModal()` makes the rest of the page inert, and the app's dialogs render outside it. A `ctx.ui.confirm` opened while your modal is up cannot be clicked. Confirm inside your own UI, or close your modal first (see [Custom UI](08-custom-ui.md#a-themed-modal-dialog)).

## Local diagnostics records

With **Settings > Troubleshooting > Save debug log to file** on, the host writes content-free JSON records under the `MOD-UI` tag: `dialog-queued`, `dialog-opened`, `dialog-closed` (with a `reason`: `acknowledged`, `submitted`, `task-settled`, `cancel-button`, `escape`, `dismissed`, `mod-unload`, `run-stopped`), `loading-task-settled` (`success` or `failure`), and `dialog-rejected` (with the validation reason). `run.ui` records carry the run's `runId`; `ctx.ui` records do not. No titles, messages, answers or item text are recorded. An empty submitted prompt is `submitted`, not a cancel. Details and how to read the log: [Errors and debugging](15-errors-and-debugging.md#host-execution-trace-and-run-messages).

## See also

- [Runs](03-runs.md): Stop, `run.signal`, `AbortError`, partial-work reporting
- [Events and reactivity](07-events-and-reactivity.md): where `ctx.ui` is called from outside actions
- [Custom UI](08-custom-ui.md): your own dialogs and forms
- [`help/examples/mods/dialogs-tour/`](../../examples/mods/dialogs-tour/): every `run.ui` method in one wizard
- [Vault Mods](../28-mods.md): the user guide
