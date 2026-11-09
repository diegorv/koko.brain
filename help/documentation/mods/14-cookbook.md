# Mods Cookbook

Proven recipes for vault mods. Each one is a complete `main.js`: paste it into `<vault>/_system/mods/<id>/main.js` next to a `manifest.json` whose `id` equals the folder name (for example `{ "id": "daily-log", "name": "Daily log", "version": "0.1.0" }`), and the app loads it on save. The techniques come from mods in daily use; every API they call was checked against the host.

Each recipe gives the goal, the stability of what it uses, the code, and the reasons it is written that way. Read [Anatomy and loading](01-anatomy-and-loading.md) for the loader rules and [Runs](03-runs.md) for Stop and run views if a recipe surprises you.

> [!NOTE]
> Every recipe repeats the helpers it needs, so each snippet works alone. When you combine recipes in one mod, keep one copy of each helper: two `const` declarations with the same name make the whole file fail to load.

## Conventions used by every recipe

- **Paths.** `ctx.vault`, `ctx.workspace`, `ctx.onNoteSaved` and `run.target` use vault-relative paths (`Projects/Plan.md`). `ctx.app.*` and every `ctx.kb()` path are absolute. Convert with `` `${ctx.app.vaultStore.path}/${relative}` `` one way and `toVaultPath(ctx, absolute)` the other way. See [Vault files](04-vault-files.md#absolute-paths-and-ctxapp).
- **Shared helpers are copies of the canonical ones.** `toVaultPath`, `editNote`, `safeName`, `listFilesDeep`, `upsertNote` and the wikilink helpers come from [Vault files](04-vault-files.md), `createStatusChip` from [Custom UI](08-custom-ui.md#a-status-bar-chip), `ensureTypeLine` and `updateFrontmatterKeepCaret` from [Raw app](09-raw-app.md), `fetchText` from [Network and platform](11-network-and-platform.md#timeouts), and `openTasks` is defined in recipe 3. Each recipe says where its copy comes from; copy them unchanged.
- **Ending a run.** A run that ends by opening a note writes no `run.log` or `run.progress` (the run view would stay on top of the note). A state with nothing to do (nothing selected, nothing found, already done) is `ctx.notify(...)` and `return`, not a throw. Invalid input (an empty field) is a throw. See [Runs: Ending an action](03-runs.md#ending-an-action).
- **Errors.** Inside an action, throw: the host marks the run Failed and toasts `<Mod name>: <action title> failed: <message>`. Outside an action (timers, key listeners, save callbacks) catch, skip when `ctx.signal.aborted`, and `ctx.notify(..., { kind: 'warning' })`. Text from a caught value goes through `errorMessage`, because a Tauri rejection is a bare string with no `.message`.
- **Stop.** Check `run.signal.aborted` between steps and before every write. After Stop, `run.log` and `run.progress` are dropped and `run.ui` rejects, so a toast is the only way to tell the user what was kept.
- **Dialogs.** Actions use `run.ui`. `ctx.ui` is for code outside an action, such as a keyboard shortcut.
- **Stability.** **stable** = contract v1 (`ctx.vault`, `ctx.workspace`, `ctx.ui`, `run.*`, `loadData`/`saveData`, `onNoteSaved`, `watch`), **unstable** = `ctx.labs`, **raw** = `ctx.app`, `ctx.kb()` and the app's DOM, with no compatibility promise. Raw members are described in [Raw app access](09-raw-app.md).

## Recipes

| # | Recipe | Uses |
|---|--------|------|
| 1 | [Append a timestamped line to the daily note](#1-append-a-timestamped-line-to-the-daily-note) | raw daily note + editor |
| 2 | [Insert at the caret and wrap the selection](#2-insert-at-the-caret-and-wrap-the-selection) | raw `editorView` |
| 3 | [Carry open tasks forward](#3-carry-open-tasks-forward) | raw daily note + editor |
| 4 | [Insert a line under a heading](#4-insert-a-line-under-a-heading) | raw editor |
| 5 | [Set, toggle and remove frontmatter properties](#5-set-toggle-and-remove-frontmatter-properties) | raw `updateNoteFrontmatter`, unstable menu |
| 6 | [Add a relationship link](#6-add-a-relationship-link) | raw frontmatter + `ctx.kb()` |
| 7 | [Pick a note from the index and a folder with manual entry](#7-pick-a-note-from-the-index-and-a-folder-with-manual-entry) | stable dialogs, raw `ctx.kb()` |
| 8 | [Generated report with an owned block](#8-generated-report-with-an-owned-block) | raw `ctx.kb()` + editor |
| 9 | [Batch over a folder](#9-batch-over-a-folder) | stable runs, raw frontmatter |
| 10 | [Move notes in bulk with collision handling](#10-move-notes-in-bulk-with-collision-handling) | stable vault |
| 11 | [Keyboard shortcuts](#11-keyboard-shortcuts) | raw `modCommandsStore`, `window` |
| 12 | [Status bar chip for the active note](#12-status-bar-chip-for-the-active-note) | raw editor, app DOM |
| 13 | [A timer that survives reloads](#13-a-timer-that-survives-reloads) | stable data |
| 14 | [Fetch from an allowed host](#14-fetch-from-an-allowed-host) | stable vault, `fetch` |
| 15 | [React to saves without a save loop](#15-react-to-saves-without-a-save-loop) | stable `onNoteSaved` |
| 16 | [Settings in mod data, edited through dialogs](#16-settings-in-mod-data-edited-through-dialogs) | stable data + dialogs |
| 17 | [Create a typed note from an input action](#17-create-a-typed-note-from-an-input-action) | raw `createTypedNote` |
| 18 | [A live stat of the active note](#18-a-live-stat-of-the-active-note) | stable `watch`, raw editor, app DOM |
| 19 | [Copy to the clipboard](#19-copy-to-the-clipboard) | browser clipboard, unstable menu |
| 20 | [Stamp a property on save, safely](#20-stamp-a-property-on-save-safely) | stable `onNoteSaved`, raw frontmatter |

## 1. Append a timestamped line to the daily note

Goal: an input action that appends `- HH:mm <text>` to today's daily note, creating the note from its template when missing.

Uses: raw `ctx.app.dailyNotePath`, `openOrCreateDailyNote`, `editorStore`; stable `ctx.vault`; unstable `ctx.labs.place`.

```javascript
const pad2 = (n) => String(n).padStart(2, '0');
/** HH:mm in local time */
const localTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// toVaultPath, changedRange and editNote: copied from 04 § Absolute paths and § editNote.

/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first: app paths built from a folder setting with an edge slash
 * (a daily-note folder set to "Journal/") carry it, and ctx.vault rejects it.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** The one range that turns `before` into `after`, for a minimal editor change. */
function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

/**
 * Applies `edit(text) => newText` to a note that may be open in the editor.
 * `absolutePath` is an app path (`${ctx.app.vaultStore.path}/Folder/Note.md`).
 * `edit` must be synchronous and return a string; it runs exactly once.
 * Resolves to whether the text changed. Rejects when the note is missing,
 * when `edit` throws, and when a background tab holds unsaved edits of this note.
 */
async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const normalized = (path) => path.replace(/\/{2,}/g, '/');
	if (tab && normalized(tab.path) === normalized(absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		// An editor not yet showing this note must not take the edit: it would land in another note.
		// The view's doc uses "\n"; the tab keeps a CRLF file's raw text until the first edit.
		if (text === tab.content.replace(/\r\n?/g, '\n')) {
			const next = edit(text);
			if (next === text) return false;
			view.dispatch({ changes: changedRange(text, next) });
			return true;
		}
	}
	const path = toVaultPath(ctx, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return false;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => normalized(t.path) === normalized(absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
	return true;
}

/** `text` with `lines` added at the end, each on its own line */
function appendLines(text, lines) {
	if (lines.length === 0) return text;
	return `${text}${text === '' || text.endsWith('\n') ? '' : '\n'}${lines.join('\n')}\n`;
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'log',
			title: 'Log to today',
			description: 'Appends "- HH:mm text" to today\'s daily note',
			input: { placeholder: 'What happened?' },
			run: async (input, run) => {
				const text = input.trim();
				// Enter on an empty field runs the action with '': a refusal the user must see.
				if (!text) throw new Error('Type what happened');
				const now = new Date();
				const today = ctx.app.dailyNotePath(now);
				if (!(await ctx.vault.exists(toVaultPath(ctx, today)))) {
					// The app applies the daily template; ctx.vault.create would write a bare file.
					await ctx.app.openOrCreateDailyNote();
				}
				if (run.signal.aborted) return;
				await editNote(ctx, today, (note) => appendLines(note, [`- ${localTime(now)} ${text}`]));
				ctx.notify('Logged');
			},
		});
		ctx.labs.place('log', { palette: true });
		ctx.addRailButton({ id: 'main', title: 'Daily log', icon: 'lucide:notebook-pen', actions: ['log'] });
	},
};
```

Why it is written this way:

- `now` is read once, before any await, so the timestamp and the note's date come from the same instant. `dailyNotePath` only computes a path from Settings > Periodic Notes; the note may not exist.
- `openOrCreateDailyNote` is today only and takes no date. It creates the note from the user's daily template and opens it; `ctx.vault.create` would skip the template.
- `editNote` is the safe way to change a note the user may be typing in: `ctx.vault.write` refuses a tab with unsaved edits (`"<path>" has unsaved changes in an open tab`), while a CodeMirror dispatch keeps them and arms autosave.
- The check that the editor shows the tab's text (line breaks normalized, so a CRLF note still takes the editor route) matters right after `openOrCreateDailyNote`: the new tab is active, but the editor may still show the previous note for a frame. The edit then goes to disk, and the clean tab picks up the new text.
- A Stop after the note was created leaves it without the line. That is harmless here; recipe 3 shows how to report partial work.

## 2. Insert at the caret and wrap the selection

Goal: palette actions that insert a timestamp at the caret and wrap the selection in `==highlight==`.

Uses: raw `ctx.app.editorStore.activeTab` and `editorView` (CodeMirror 6); unstable `ctx.labs.place`.

```javascript
export default {
	onload(ctx) {
		/** The editor view of the active Markdown note, read at use time */
		const noteView = () => {
			const tab = ctx.app.editorStore.activeTab;
			const view = ctx.app.editorStore.editorView;
			// A canvas or kanban in source mode, a .view file or a mod's main.js also has an editor view.
			if (!tab || !/\.(md|markdown)$/i.test(tab.path) || !view?.dom.isConnected) {
				throw new Error('Open a note in the editor first');
			}
			return view;
		};

		ctx.addAction({
			id: 'stamp',
			title: 'Insert timestamp',
			run: () => {
				const view = noteView();
				view.dispatch(view.state.replaceSelection(new Date().toLocaleString()));
				view.focus();
			},
		});

		ctx.addAction({
			id: 'highlight',
			title: 'Highlight selection',
			description: 'Wraps the selection in ==',
			run: () => {
				const view = noteView();
				const { from, to } = view.state.selection.main;
				const selected = view.state.doc.sliceString(from, to);
				view.dispatch({
					changes: { from, to, insert: `==${selected}==` },
					// Keep the original text selected inside the markers.
					selection: { anchor: from + 2, head: from + 2 + selected.length },
				});
				view.focus();
			},
		});

		ctx.labs.place('stamp', { palette: true });
		ctx.labs.place('highlight', { palette: true });
	},
};
```

Why it is written this way:

- The view is read inside the action, never cached at `onload`: the app shares one `EditorView` between Markdown tabs and mounts a new one after a canvas, kanban, collection or virtual tab, so a stored view can be a destroyed one (`view.dom.isConnected === false`).
- There is no `await` between reading the selection and dispatching, so the user cannot switch tabs in between.
- A dispatch behaves like typing: it updates the tab, marks it dirty, schedules autosave and adds an undo step. No file write is needed.
- Only plain transaction specs are used (`changes`, `selection: { anchor, head }`). A mod has no `import`, so CodeMirror constructors such as `EditorSelection` are out of reach, which is why only the main selection is wrapped.

> [!NOTE]
> `editorView` is raw access to the app's CodeMirror instance. Selection offsets refer to the raw Markdown text, also in Live Preview.

## 3. Carry open tasks forward

Goal: copy yesterday's open tasks (`- [ ]` and `- [/]`) to today's daily note, then mark them `[>]` in yesterday, in an order where a failure never loses a task.

Uses: raw `ctx.app.dailyNotePath`, `openOrCreateDailyNote`, `editorStore`; stable `ctx.vault`, `run.*`.

```javascript
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/** `d` plus `n` calendar days; safe across daylight saving changes, unlike adding n * 86400000 */
function addDays(d, n) {
	const next = new Date(d);
	next.setDate(next.getDate() + n);
	return next;
}

// toVaultPath, changedRange, editNote and hasUnsavedTab: copied from 04 § Absolute paths, § editNote
// and § Checking for unsaved edits. openTasks: the task grammar of 10 § Tasks.

/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first: app paths built from a folder setting with an edge slash
 * (a daily-note folder set to "Journal/") carry it, and ctx.vault rejects it.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** The one range that turns `before` into `after`, for a minimal editor change. */
function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

/**
 * Applies `edit(text) => newText` to a note that may be open in the editor.
 * `absolutePath` is an app path (`${ctx.app.vaultStore.path}/Folder/Note.md`).
 * `edit` must be synchronous and return a string; it runs exactly once.
 * Resolves to whether the text changed. Rejects when the note is missing,
 * when `edit` throws, and when a background tab holds unsaved edits of this note.
 */
async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const normalized = (path) => path.replace(/\/{2,}/g, '/');
	if (tab && normalized(tab.path) === normalized(absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		// An editor not yet showing this note must not take the edit: it would land in another note.
		// The view's doc uses "\n"; the tab keeps a CRLF file's raw text until the first edit.
		if (text === tab.content.replace(/\r\n?/g, '\n')) {
			const next = edit(text);
			if (next === text) return false;
			view.dispatch({ changes: changedRange(text, next) });
			return true;
		}
	}
	const path = toVaultPath(ctx, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return false;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => normalized(t.path) === normalized(absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
	return true;
}

/** Whether an open tab holds unsaved edits of the note at vault-relative `path`. */
function hasUnsavedTab(ctx, path) {
	const root = ctx.app.vaultStore.path;
	return ctx.app.editorStore.tabs.some((tab) =>
		tab.path.startsWith(`${root}/`) && toVaultPath(ctx, tab.path) === path && tab.content !== tab.savedContent);
}

function appendLines(text, lines) {
	if (lines.length === 0) return text;
	return `${text}${text === '' || text.endsWith('\n') ? '' : '\n'}${lines.join('\n')}\n`;
}

/** Task status by checkbox character, as the app maps it. */
const TASK_STATUS = { ' ': 'todo', x: 'done', X: 'done', '-': 'cancelled', '/': 'in-progress', '?': 'question', '>': 'forwarded', '!': 'important' };
/** A task line as the index reads it: "-", "*", "+" or "1." and one whitespace, [status], one whitespace, text. */
const TASK_LINE = /^(\s*)(?:[-*+]|\d+\.)\s\[([ xX\-/?!>])\]\s(.*)$/s;
/** A fence line: optional spaces or tabs, then three backticks or three tildes. */
const FENCE = /^[ \t]*(`{3}|~{3})/;

/**
 * The tasks of a note's text whose status is in `statuses`, as `{ line, status, text }` (line 1-based,
 * text trimmed). The default, only 'todo' (`[ ]`), is what the Tasks view treats as open. Lines in
 * fenced code are skipped; a fence closes only at a fence of the same kind.
 */
function openTasks(text, statuses = ['todo']) {
	const found = [];
	let fence = null;
	text.split('\n').forEach((raw, i) => {
		const line = raw.replace(/\r$/, '');
		const marker = FENCE.exec(line)?.[1];
		if (marker) {
			if (fence === null) fence = marker;
			else if (marker === fence) fence = null;
			return;
		}
		if (fence !== null) return;
		const match = TASK_LINE.exec(line);
		if (!match || match[3].trim() === '') return;
		const status = TASK_STATUS[match[2]];
		if (statuses.includes(status)) found.push({ line: i + 1, status, text: match[3].trim() });
	});
	return found;
}

/** What this recipe carries: not started and in progress */
const CARRIED = ['todo', 'in-progress'];
/** How a carried task reads in today's note: top level and not started */
const todayForm = (task) => `- [ ] ${task.text}`;

/** `text` with the carried tasks whose today form is in `carried` marked [>] forwarded */
function markForwarded(text, carried) {
	const wanted = new Set(carried);
	const lines = text.split('\n');
	for (const task of openTasks(text, CARRIED)) {
		if (!wanted.has(todayForm(task))) continue;
		// The first bracket pair on a task line is its checkbox.
		lines[task.line - 1] = lines[task.line - 1].replace(/\[[ /]\]/, '[>]');
	}
	return lines.join('\n');
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'carry',
			title: "Carry over yesterday's open tasks",
			description: 'Copies them to today, then marks them [>] in yesterday',
			run: async (_input, run) => {
				const now = new Date();
				const yesterday = ctx.app.dailyNotePath(addDays(now, -1));
				const today = ctx.app.dailyNotePath(now);
				const yesterdayPath = toVaultPath(ctx, yesterday);
				if (!(await ctx.vault.exists(yesterdayPath))) throw new Error('There is no daily note for yesterday');
				// Before any write: the write to yesterday would refuse these edits only after today changed.
				if (hasUnsavedTab(ctx, yesterdayPath)) throw new Error("Yesterday's note has unsaved changes; save it and run again");
				// Each task once, in today's form.
				const open = [...new Set(openTasks(await ctx.vault.read(yesterdayPath), CARRIED).map(todayForm))];
				if (open.length === 0) {
					ctx.notify('No open tasks yesterday');
					return;
				}
				if (run.signal.aborted) return;

				if (!(await ctx.vault.exists(toVaultPath(ctx, today)))) await ctx.app.openOrCreateDailyNote();
				if (run.signal.aborted) return;
				let added = 0;
				await editNote(ctx, today, (text) => {
					// Skips lines already in today, so a rerun after a failure copies nothing twice.
					const present = new Set(text.split('\n').map((line) => line.trim()));
					const fresh = open.filter((line) => !present.has(line));
					added = fresh.length;
					return appendLines(text, fresh);
				});
				if (run.signal.aborted) {
					if (!ctx.signal.aborted) {
						ctx.notify(`Stopped: ${added} task(s) added to today, not yet marked forwarded in yesterday`, { kind: 'warning' });
					}
					return;
				}

				// Yesterday as it is now: it may have changed while today was edited.
				try {
					await editNote(ctx, yesterday, (text) => markForwarded(text, open));
				} catch (err) {
					throw new Error(`Tasks are in today, but yesterday was not marked: ${errorMessage(err)}`);
				}
				ctx.notify(`${added} task(s) carried to today`, { kind: 'success' });
			},
		});
		ctx.labs.place('carry', { palette: true });
	},
};
```

Why it is written this way:

- The destination is written first and the source last: a failure in between leaves a task in both notes, never in neither, and a rerun does not copy it twice because lines already in today are skipped.
- The unsaved-tab check runs before any write. Without it, the second write could be refused by `ctx.vault.write` after today already changed.
- `openTasks` reads tasks with the app's own grammar: `-`, `*`, `+` or a numbered `1.` marker, one whitespace character (a space or a tab) on each side of the `[ ]`, any indentation, and no lines inside fenced code. A fence opened with three backticks closes only at three backticks, one opened with `~~~` only at `~~~`. The statuses are the app's: `[ ]` todo, `[x]`/`[X]` done, `[-]` cancelled, `[/]` in progress, `[?]` question, `[>]` forwarded, `[!]` important. Its default (`['todo']`) is what the Tasks view shows as open; this recipe also carries `in-progress`, which is its own choice.
- `todayForm` normalizes indentation, the marker and `[/]` so the same task is recognized in both notes; `markForwarded` only marks lines whose today form was carried, so a task added to yesterday during the run stays open.
- Open tasks are parsed from the file text, not from `ctx.kb()`: the index lags behind recent edits, and its `completed` is true for every status but `[ ]`, so it cannot tell `[/]` from `[x]`.
- After Stop, the warning toast says exactly what was done and what was not, and it is skipped when the mod itself was unloaded (every `ctx` call then throws).

## 4. Insert a line under a heading

Goal: add a line at the end of the `## Ideas` section of the clicked or active note, creating the section when it is missing.

Uses: raw `ctx.app.editorStore`, `vaultStore`; stable `ctx.vault`, `run.target`; unstable `ctx.labs.place`.

```javascript
const HEADING = '## Ideas';
const HEADING_LINE = /^##\s+Ideas\s*$/;

// toVaultPath, changedRange and editNote: copied from 04 § Absolute paths and § editNote.

/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first: app paths built from a folder setting with an edge slash
 * (a daily-note folder set to "Journal/") carry it, and ctx.vault rejects it.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** The one range that turns `before` into `after`, for a minimal editor change. */
function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

/**
 * Applies `edit(text) => newText` to a note that may be open in the editor.
 * `absolutePath` is an app path (`${ctx.app.vaultStore.path}/Folder/Note.md`).
 * `edit` must be synchronous and return a string; it runs exactly once.
 * Resolves to whether the text changed. Rejects when the note is missing,
 * when `edit` throws, and when a background tab holds unsaved edits of this note.
 */
async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const normalized = (path) => path.replace(/\/{2,}/g, '/');
	if (tab && normalized(tab.path) === normalized(absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		// An editor not yet showing this note must not take the edit: it would land in another note.
		// The view's doc uses "\n"; the tab keeps a CRLF file's raw text until the first edit.
		if (text === tab.content.replace(/\r\n?/g, '\n')) {
			const next = edit(text);
			if (next === text) return false;
			view.dispatch({ changes: changedRange(text, next) });
			return true;
		}
	}
	const path = toVaultPath(ctx, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return false;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => normalized(t.path) === normalized(absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
	return true;
}

/** The clicked note (menu) or the active note (palette, rail), absolute. Call it before any await. */
function targetNote(ctx, run) {
	if (run.target) {
		if (run.target.on !== 'note' || !/\.(md|markdown)$/i.test(run.target.path)) throw new Error('Choose a Markdown note');
		return `${ctx.app.vaultStore.path}/${run.target.path}`;
	}
	const tab = ctx.app.editorStore.activeTab;
	if (!tab || !/\.(md|markdown)$/i.test(tab.path)) throw new Error('Open a note first');
	return tab.path;
}

/** First section whose heading matches; it ends at the next heading of any level or a --- line */
function findSection(lines, heading) {
	const start = lines.findIndex((line) => heading.test(line));
	if (start < 0) return null;
	const next = lines.findIndex((line, i) => i > start && /^(#{1,6}\s|---\s*$)/.test(line));
	return { start, end: next < 0 ? lines.length : next };
}

/** `lines` with `add` after the section's last non-blank line, and one blank line before what follows */
function insertInSection(lines, section, add) {
	let at = section.end;
	while (at > section.start + 1 && lines[at - 1].trim() === '') at--;
	return [...lines.slice(0, at), ...add, '', ...lines.slice(section.end)];
}

function addUnderHeading(text, line) {
	const lines = text.split('\n');
	const section = findSection(lines, HEADING_LINE);
	if (section) return insertInSection(lines, section, [line]).join('\n');
	const body = text.replace(/\n*$/, '');
	return `${body}${body ? '\n\n' : ''}${HEADING}\n\n${line}\n`;
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'idea',
			title: 'Add an idea',
			description: `Adds a line under ${HEADING}`,
			input: { placeholder: 'The idea' },
			run: async (input, run) => {
				const note = targetNote(ctx, run);
				const text = input.trim();
				if (!text) throw new Error('Type the idea');
				if (run.signal.aborted) return;
				await editNote(ctx, note, (content) => addUnderHeading(content, `- ${text}`));
			},
		});
		ctx.labs.place('idea', { palette: true, menu: { on: ['note'], files: 'markdown' } });
	},
};
```

Why it is written this way:

- The target is resolved in the first statement of the action: a menu click gives `run.target` (vault-relative), the palette and rail use the active tab (absolute). Resolving it later would let a tab switch redirect the edit.
- `findSection` ends a section at the next heading of any level, so a `### Sub` heading inside `## Ideas` ends it there. Use a `^#{1,2}\s` stop pattern if subsections belong to the section.
- The new line goes after the section's last non-blank line, so blank-line spacing before the next heading is kept, and the whole edit is one minimal change in the editor.
- The heading test is a plain line match: a matching line inside a fenced code block also counts. Skip fences first if your notes contain such examples.

## 5. Set, toggle and remove frontmatter properties

Goal: actions on the clicked or active note that set `status` from a list, toggle a boolean `pinned`, and remove `status`, reporting failures without a double toast.

Uses: raw `ctx.app.updateNoteFrontmatter`, `editorStore`, `vaultStore`; stable `run.ui`, `run.target`; unstable `ctx.labs.place`.

```javascript
const STATUSES = ['todo', 'doing', 'done'];

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

const WRITE_FAILURES = {
	unparseable: "The note's frontmatter could not be parsed; fix it in the note",
	nested: "The note's frontmatter has nested values; it cannot be rewritten without losing them",
	comments: "The note's frontmatter has comments; it cannot be rewritten without losing them",
	'duplicate-keys': "The note's frontmatter repeats a key; it cannot be rewritten without losing one",
	'alias-collision': "The note's frontmatter has two keys for one property; it cannot be rewritten without losing one",
	anchors: "The note's frontmatter uses YAML anchors; it cannot be rewritten without expanding them",
	'vault-changed': 'The vault changed before the note was saved',
	missing: 'The note was moved or deleted',
};

/** Text for a failed updateNoteFrontmatter; null for 'save-failed', which the editor already toasted */
function writeFailureText(err) {
	const reason = err?.reason;
	if (reason === 'save-failed') return null;
	return (typeof reason === 'string' && WRITE_FAILURES[reason]) || errorMessage(err);
}

/** `props` with `key` set; an existing key keeps its position; the same array when nothing changes */
function setProp(props, key, value, type) {
	const index = props.findIndex((p) => p.key === key);
	if (index < 0) return [...props, { key, value, type }];
	if (props[index].value === value && props[index].type === type) return props;
	return props.map((p, i) => (i === index ? { key, value, type } : p));
}

function removeProp(props, key) {
	return props.some((p) => p.key === key) ? props.filter((p) => p.key !== key) : props;
}

function targetNote(ctx, run) {
	if (run.target) {
		if (run.target.on !== 'note' || !/\.(md|markdown)$/i.test(run.target.path)) throw new Error('Choose a Markdown note');
		return `${ctx.app.vaultStore.path}/${run.target.path}`;
	}
	const tab = ctx.app.editorStore.activeTab;
	if (!tab || !/\.(md|markdown)$/i.test(tab.path)) throw new Error('Open a note first');
	return tab.path;
}

/** Thrown by a mutate that changes nothing: returning the same list would still rewrite the YAML in canonical form */
const UNCHANGED = new Error('unchanged');

/** updateNoteFrontmatter, then the caret back where it was relative to the text after it. Copied from 09 § Known problems. */
async function updateFrontmatterKeepCaret(ctx, absolutePath, mutate) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const shown = tab && tab.path === absolutePath && view?.dom.isConnected ? view : null;
	const fromEnd = shown ? shown.state.doc.length - shown.state.selection.main.head : null;
	const written = await ctx.app.updateNoteFrontmatter(absolutePath, mutate);
	const now = ctx.app.editorStore.editorView;
	if (shown && now === shown && now.dom.isConnected && ctx.app.editorStore.activeTabPath === absolutePath) {
		now.dispatch({ selection: { anchor: Math.max(0, now.state.doc.length - fromEnd) } });
	}
	return written;
}

/** Applies a pure `mutate` and tells the user what happened */
async function updateNote(ctx, run, absolutePath, mutate, doneText) {
	let changed = true;
	try {
		// The action usually runs on the open note: updateNoteFrontmatter alone would move its caret.
		await updateFrontmatterKeepCaret(ctx, absolutePath, (props) => {
			const next = mutate(props);
			if (next === props) throw UNCHANGED;
			return next;
		});
	} catch (err) {
		if (err !== UNCHANGED) {
			const text = writeFailureText(err);
			if (text === null) return;
			throw new Error(text);
		}
		changed = false;
	}
	const name = absolutePath.split('/').pop();
	if (run.signal.aborted) {
		if (changed && !ctx.signal.aborted) ctx.notify(`${name}: ${doneText}, but the run stopped`, { kind: 'warning' });
		return;
	}
	ctx.notify(changed ? `${name}: ${doneText}` : `${name}: already so`, { kind: changed ? 'success' : 'info' });
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'status',
			title: 'Set status',
			run: async (_input, run) => {
				const note = targetNote(ctx, run);
				const picked = await run.ui.pick({ title: 'Status', items: STATUSES.map((s) => ({ id: s, title: s })) });
				if (picked === null || run.signal.aborted) return;
				await updateNote(ctx, run, note, (props) => setProp(props, 'status', picked.id, 'text'), `status is ${picked.id}`);
			},
		});

		ctx.addAction({
			id: 'pin',
			title: 'Toggle pinned',
			run: async (_input, run) => {
				const note = targetNote(ctx, run);
				await updateNote(ctx, run, note, (props) => {
					const pinned = props.find((p) => p.key === 'pinned')?.value === true;
					return setProp(props, 'pinned', !pinned, 'boolean');
				}, 'pinned toggled');
			},
		});

		ctx.addAction({
			id: 'clear-status',
			title: 'Remove status',
			run: async (_input, run) => {
				const note = targetNote(ctx, run);
				await updateNote(ctx, run, note, (props) => removeProp(props, 'status'), 'status removed');
			},
		});

		for (const id of ['status', 'pin', 'clear-status']) {
			ctx.labs.place(id, { palette: true, menu: { on: ['note'], files: 'markdown' } });
		}
	},
};
```

Why it is written this way:

- `mutate` is pure: `updateNoteFrontmatter` runs it a second time when a tab opens during its read, and only the last run counts. Throwing is pure too, which is how "nothing to change" is reported.
- Returning the unchanged list is not a no-op: the writer serializes the list again and writes whenever the text differs from the note's, so block lists become `[a, b]`, `type:` becomes `_type:` and needless quotes go. The helpers return the same array when nothing changes, and `UNCHANGED` is thrown before any write, so "already so" really leaves the file alone.
- A rejection with `reason: 'save-failed'` means the note was open and its save failed; the editor already toasted `Failed to save file.`, so the action returns quietly instead of failing with a second toast.
- The other reasons (`nested`, `comments`, `anchors`, ...) mean nothing was written; they become readable text and fail the run. A missing note rejects with the raw file system error, which `errorMessage` turns into text.
- `updateNoteFrontmatter` takes an absolute path and does not check the extension, so the `.md` check in `targetNote` is what keeps it off canvases and `.view` files. On an open note it keeps unsaved body edits and saves the whole tab.
- Some keys are aliases and arrive in their canonical form: `type`, `organized`, `archived`, `favorite`, `order`, `icon`, `color` and others are read and written as `_type`, `_organized`, `_archived`, and so on. Look them up by the underscored name.
- On the active note, `updateNoteFrontmatter` puts the caret back at its old character offset, so text added above it shifts the user's next keystroke (see [Raw app: Known problems](09-raw-app.md#known-problems-caret-and-empty-block)). `updateFrontmatterKeepCaret` restores it relative to the end of the document. A note that starts with an empty `---`/`---` block would get a second block; `updateFrontmatterSafely` in the same section handles that case.

## 6. Add a relationship link

Goal: add a `[[wikilink]]` to a list property (`_related_to`) of the clicked or active note, picking the target from a folder of the index, without duplicates or unsafe links.

Uses: raw `ctx.kb()`, `ctx.app.updateNoteFrontmatter`, `editorStore`, `vaultStore`; stable `run.ui.pick`; unstable `ctx.labs.place`.

```javascript
const KEY = '_related_to';
/** Where link targets come from; a folder source keeps the index query small */
const CANDIDATES = 'Projects';
/** Thrown by the mutate when the link is already there, so nothing is written */
const UNCHANGED = new Error('unchanged');

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

function writeFailureText(err) {
	if (err?.reason === 'save-failed') return null;
	return typeof err?.reason === 'string' ? `The frontmatter was not changed (${err.reason})` : errorMessage(err);
}

/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first. Copied from 04 § Absolute paths.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** [[Folder/Name.md|Name]]: pins this exact file, shows its name. Copied from 04 § Writing a wikilink. */
const pinnedWikilink = (path) => `[[${path}|${path.split('/').pop().replace(/\.(md|markdown)$/i, '')}]]`;

/**
 * Whether `target` can sit between [[ and ]] as one link to itself: none of the characters that end
 * a target ([ ] | # ^), no backslash or angle brackets, no control or line/paragraph separator
 * characters, no edge spaces. \p{...} classes, not \u escapes: some write tools turn those into
 * literal separators, which break the regex literal.
 */
function isSafeWikilinkTarget(target) {
	return !/[[\]|#^\\<>\p{Cc}\p{Zl}\p{Zp}]/u.test(target) && target.trim() === target;
}

function targetNote(ctx, run) {
	if (run.target) {
		if (run.target.on !== 'note' || !/\.(md|markdown)$/i.test(run.target.path)) throw new Error('Choose a Markdown note');
		return `${ctx.app.vaultStore.path}/${run.target.path}`;
	}
	const tab = ctx.app.editorStore.activeTab;
	if (!tab || !/\.(md|markdown)$/i.test(tab.path)) throw new Error('Open a note first');
	return tab.path;
}

/** updateNoteFrontmatter, then the caret back where it was relative to the text after it. Copied from 09 § Known problems. */
async function updateFrontmatterKeepCaret(ctx, absolutePath, mutate) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const shown = tab && tab.path === absolutePath && view?.dom.isConnected ? view : null;
	const fromEnd = shown ? shown.state.doc.length - shown.state.selection.main.head : null;
	const written = await ctx.app.updateNoteFrontmatter(absolutePath, mutate);
	const now = ctx.app.editorStore.editorView;
	if (shown && now === shown && now.dom.isConnected && ctx.app.editorStore.activeTabPath === absolutePath) {
		now.dispatch({ selection: { anchor: Math.max(0, now.state.doc.length - fromEnd) } });
	}
	return written;
}

/** "[[Projects/A.md|A]]" -> "projects/a" */
function linkTarget(raw) {
	return String(raw).trim().replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].replace(/\.md$/i, '').toLowerCase();
}

/** Same note: equal targets, or a bare name equal to the other target's last segment */
function sameTarget(a, b) {
	if (a === b) return true;
	const last = (t) => t.split('/').pop();
	return (!a.includes('/') && a === last(b)) || (!b.includes('/') && b === last(a));
}

function setProp(props, key, value, type) {
	const index = props.findIndex((p) => p.key === key);
	if (index < 0) return [...props, { key, value, type }];
	return props.map((p, i) => (i === index ? { key, value, type } : p));
}

/** `props` with `link` added to the list at `key`; a scalar becomes a list; the same array when already linked */
function addLink(props, key, link) {
	const current = props.find((p) => p.key === key);
	const values = current === undefined || current.value === '' ? [] : Array.isArray(current.value) ? current.value : [String(current.value)];
	if (values.some((value) => sameTarget(linkTarget(value), linkTarget(link)))) return props;
	return setProp(props, key, [...values, link], 'list');
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'relate',
			title: 'Add related note',
			description: `Links a note from ${CANDIDATES} in ${KEY}`,
			run: async (_input, run) => {
				const note = targetNote(ctx, run);
				const kb = await ctx.kb();
				if (run.signal.aborted) return;
				const items = kb.pages(`"${CANDIDATES}"`)
					.where((p) => !p.archived && p.file.path !== note)
					.sort((p) => p.file.path)
					.array()
					.map((p) => {
						const path = toVaultPath(ctx, p.file.path);
						return { id: path, title: p.file.basename, description: path, path, name: p.file.basename };
					});
				if (items.length === 0) return ctx.notify(`No indexed notes in ${CANDIDATES}`);
				const picked = await run.ui.pick({ title: `Relate ${note.split('/').pop()} to`, items });
				if (picked === null || run.signal.aborted) return;
				if (!isSafeWikilinkTarget(picked.path) || !isSafeWikilinkTarget(picked.name)) {
					throw new Error(`"${picked.path}" has characters a wikilink cannot hold; rename it first`);
				}
				const link = pinnedWikilink(picked.path);

				let changed = true;
				try {
					await updateFrontmatterKeepCaret(ctx, note, (props) => {
						const next = addLink(props, KEY, link);
						// Returning `props` would still rewrite the YAML in canonical form.
						if (next === props) throw UNCHANGED;
						return next;
					});
				} catch (err) {
					if (err !== UNCHANGED) {
						const text = writeFailureText(err);
						if (text === null) return;
						throw new Error(text);
					}
					changed = false;
				}
				ctx.notify(changed ? `Linked ${picked.name}` : `${picked.name} was already linked`);
			},
		});
		ctx.labs.place('relate', { palette: true, menu: { on: ['note'], files: 'markdown' } });
	},
};
```

Why it is written this way:

- The picker returns the original item object, so extra fields (`path`, `name`) travel through it and nothing is parsed back out of the id.
- `isSafeWikilinkTarget` refuses `[`, `]`, `|`, `#`, `^`, `\`, `<`, `>`, control characters, line and paragraph separators, and edge spaces: the app reads `#` as a heading anchor, `^` as a block reference and `|` as an alias, so such a name would link somewhere else or nowhere. The separators are matched with `\p{Zl}\p{Zp}` and the `u` flag, never with `\u2028`-style escapes: a write tool that turns those escapes into the literal characters breaks the regex literal, and the whole file fails to load (see [Errors and debugging](15-errors-and-debugging.md#mainjs-evaluation)).
- The link is the pinned form `[[Folder/Name.md|Name]]`, the only one that resolves to that exact file (see [Vault files: Writing a wikilink](04-vault-files.md#writing-a-wikilink)). `[[Name]]` and `[[Folder/Name]]` both resolve by name, to whichever same-name note the index lists first.
- The write goes through `updateFrontmatterKeepCaret`, because the action usually runs on the open note (see recipe 5).
- `addLink` is additive and keeps any existing links, turns a scalar into a list, and returns the same array when the target is already linked; the mutate then throws `UNCHANGED`, so nothing is written (returning the same list would still reformat the YAML, see recipe 5) and the user is told.
- The index query is scoped to one folder and excludes archived notes and the note itself. `kb.pages()` includes archived notes unless you filter `p.archived`.

> [!NOTE]
> A root-level target (no folder in its path) can still be ambiguous when another folder has a file with the same name; telling for sure needs the whole index. The duplicate check by last segment can also treat two different same-name notes as one, which errs toward not adding a link. Both are limits of this recipe, not of the app.

## 7. Pick a note from the index and a folder with manual entry

Goal: pick a folder (listed under a cancellable loading dialog, with an "Enter a folder path" row), then pick one of its notes from the index, newest first, and open it.

Uses: stable `ctx.vault.list`, `ctx.workspace.openNote`, `run.ui.loading`, `pick`, `prompt`; raw `ctx.kb()`, `vaultStore`, `settingsStore`.

`pickFolder` is the folder picker to copy whenever a mod asks the user for a folder.

```javascript
const LIST_CHUNK = 32;

/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first. Copied from 04 § Absolute paths.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** A typed folder path made vault-relative; null when it is empty or names "." or ".." */
function cleanFolder(text) {
	const segments = text.trim().split('/').map((s) => s.trim()).filter((s) => s !== '');
	if (segments.length === 0 || segments.some((s) => s === '.' || s === '..')) return null;
	return segments.join('/');
}

/** Every folder below the vault root, breadth first; null once `signal` aborts */
async function listFolders(ctx, signal) {
	// Never offered: the system folder (a setting, `_system` by default) holds mods, templates and type definitions.
	const system = ctx.app.settingsStore.templates.systemFolder.replace(/^\/+|\/+$/g, '');
	const found = [];
	let level = [''];
	while (level.length > 0) {
		const next = [];
		// Chunks keep a level with thousands of folders from flooding the IPC bridge and delaying Cancel.
		for (let i = 0; i < level.length; i += LIST_CHUNK) {
			if (signal.aborted) return null;
			const lists = await Promise.all(level.slice(i, i + LIST_CHUNK).map((folder) => ctx.vault.list(folder)));
			for (const entry of lists.flat()) {
				if (entry.isFolder && entry.path !== system) next.push(entry.path);
			}
		}
		found.push(...next);
		level = next;
	}
	return found.sort((a, b) => a.localeCompare(b));
}

async function pickFolder(ctx, run) {
	const folders = await run.ui.loading('Listing folders...', (signal) => listFolders(ctx, signal), { cancellable: true });
	if (folders === null) return null;
	const items = [
		{ id: 'manual', title: 'Enter a folder path', path: null },
		...folders.map((path) => ({ id: `folder:${path}`, title: path, path })),
	];
	const picked = await run.ui.pick({ title: 'Folder', placeholder: 'Search folders...', items });
	if (picked === null) return null;
	if (picked.path !== null) return picked.path;
	const typed = await run.ui.prompt({ title: 'Folder path', placeholder: 'e.g. Projects/Active' });
	if (typed === null) return null;
	const folder = cleanFolder(typed);
	if (folder === null || !(await ctx.vault.exists(folder))) throw new Error(`"${typed}" is not a folder of this vault`);
	return folder;
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'open',
			title: 'Open a note from a folder',
			run: async (_input, run) => {
				const folder = await pickFolder(ctx, run);
				if (folder === null || run.signal.aborted) return;
				const kb = await ctx.kb();
				const items = kb.pages(`"${folder}"`)
					.sort((p) => p.file.mtime, 'desc')
					.array()
					.map((p) => {
						const path = toVaultPath(ctx, p.file.path);
						// Archived notes stay in the list, marked: the user did not ask to leave them out.
						return { id: path, title: p.file.basename, description: p.archived ? `${path} (archived)` : path, path };
					});
				// Nothing to pick is not a failure: a toast, and the run ends Done.
				if (items.length === 0) return ctx.notify(`No indexed notes in ${folder}`);
				const picked = await run.ui.pick({ title: `Notes in ${folder}`, items });
				if (picked === null || run.signal.aborted) return;
				await ctx.workspace.openNote(picked.path);
			},
		});
		ctx.labs.place('open', { palette: true });
	},
};
```

Why it is written this way:

- `run.ui.loading` runs the task at once under a spinner. Cancel only aborts the task's signal and the call still waits for the task, so `listFolders` checks the signal per chunk and resolves `null`. A run Stop rejects the call at once with an `AbortError`, which the host treats as a cancelled run.
- The manual row has `path: null`, so `picked.path` tells the two kinds of row apart. `cleanFolder` makes typed text vault-relative, and `exists` confirms it (it is also true for a file; a file path then simply yields no notes).
- `ctx.vault.list` returns direct children only, unsorted, without dot entries; the walk sorts at the end. `list('')` is the only way to list the root, and it includes the system folder, whose name is read from `settingsStore.templates.systemFolder` rather than hard-coded.
- **That read is the picker's only raw member**, and it puts a mod that is otherwise stable into the raw tier. For a stable-only picker, replace it with the literal `const system = '_system';`: the cost is that a vault whose system folder was renamed in Settings lists that folder among the choices (the walk then also descends into it), and the default `_system` is never offered either way.
- One unreadable folder fails the whole listing here (`Promise.all`). For a walk that keeps going and reports the folders it could not read, use `listFilesDeep` from [Vault files](04-vault-files.md#listfolder), as recipe 9 does.
- The source string needs matching quotes (`'"Projects"'`) and is never empty here: `'""'` and unparsed strings mean every page of the vault.
- The pick shows the first 100 items in supplied order until the user types; all items stay searchable, which is why the newest notes come first.

## 8. Generated report with an owned block

Goal: write a report of the notes in `Projects` changed in the last seven days into a note that the user can also write in, replacing only a marked block, skipping identical writes, then open it.

Uses: raw `ctx.kb()`, `editorStore`, `vaultStore`; stable `ctx.vault`, `ctx.workspace`, `run.*`.

```javascript
const SOURCE = 'Projects';
const REPORT = 'Reports/Recent in Projects.md';
const DAYS = 7;
const LIMIT = 50;

// toVaultPath, changedRange, editNote and pinnedWikilink: copied from 04 § Absolute paths,
// § editNote and § Writing a wikilink.

/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first: app paths built from a folder setting with an edge slash
 * (a daily-note folder set to "Journal/") carry it, and ctx.vault rejects it.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** The one range that turns `before` into `after`, for a minimal editor change. */
function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

/**
 * Applies `edit(text) => newText` to a note that may be open in the editor.
 * `absolutePath` is an app path (`${ctx.app.vaultStore.path}/Folder/Note.md`).
 * `edit` must be synchronous and return a string; it runs exactly once.
 * Resolves to whether the text changed. Rejects when the note is missing,
 * when `edit` throws, and when a background tab holds unsaved edits of this note.
 */
async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const normalized = (path) => path.replace(/\/{2,}/g, '/');
	if (tab && normalized(tab.path) === normalized(absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		// An editor not yet showing this note must not take the edit: it would land in another note.
		// The view's doc uses "\n"; the tab keeps a CRLF file's raw text until the first edit.
		if (text === tab.content.replace(/\r\n?/g, '\n')) {
			const next = edit(text);
			if (next === text) return false;
			view.dispatch({ changes: changedRange(text, next) });
			return true;
		}
	}
	const path = toVaultPath(ctx, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return false;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => normalized(t.path) === normalized(absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
	return true;
}

/** [[Folder/Name.md|Name]]: pins this exact file, shows its name. */
const pinnedWikilink = (path) => `[[${path}|${path.split('/').pop().replace(/\.(md|markdown)$/i, '')}]]`;

/** Whether `target` can sit between [[ and ]] as one link to itself. Copied from 04 § Writing a wikilink. */
function isSafeWikilinkTarget(target) {
	return !/[[\]|#^\\<>\p{Cc}\p{Zl}\p{Zp}]/u.test(target) && target.trim() === target;
}

/**
 * Text copied into the block, made unable to open an HTML comment: a copied "<!--" (a task that
 * quotes a marker, say) would otherwise count as a marker mention and refuse every later run.
 */
const inert = (text) => String(text).replace(/<!--/g, '&lt;!--');

function ownedMarkers(owner, key) {
	return { owner, start: `<!-- ${owner}:generated:start ${key} -->`, end: `<!-- ${owner}:generated:end -->` };
}

/**
 * `text` with the block between the markers replaced by `block`, every byte outside kept, in the
 * note's own line endings. Throws `refusal` unless the note holds exactly one start and one end
 * marker of this owner, each alone on its line, in that order.
 */
function replaceOwnedBlock(text, markers, block, refusal) {
	const owner = markers.owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const found = [...text.matchAll(new RegExp(`^<!-- ${owner}:generated:[^\\r\\n]* -->\\r?$`, 'gm'))];
	const mentions = text.match(new RegExp(`<!--\\s*${owner}:generated:`, 'g'))?.length ?? 0;
	if (mentions !== 2 || found.length !== 2 ||
		found[0][0].replace(/\r$/, '') !== markers.start || found[1][0].replace(/\r$/, '') !== markers.end) {
		throw new Error(refusal);
	}
	const eol = text.match(/\r?\n/)?.[0] ?? '\n';
	return text.slice(0, found[0].index) + block.replace(/\n/g, eol) + text.slice(found[1].index + markers.end.length);
}

/** Creates the report with `initial`, else merges through editNote; starts no write once stopped. Resolves whether it changed. */
async function upsertOwnedReport(ctx, path, initial, merge, stopped) {
	const exists = await ctx.vault.exists(path);
	if (stopped()) return false;
	if (!exists) {
		await ctx.vault.create(path, initial);
		return true;
	}
	let changed = false;
	await editNote(ctx, `${ctx.app.vaultStore.path}/${path}`, (text) => {
		if (stopped()) return text;
		const next = merge(text);
		changed = next !== text;
		return next;
	});
	return changed;
}

function renderBlock(ctx, markers, pages) {
	const lines = [markers.start, `## Changed in the last ${DAYS} days`, ''];
	if (pages.length === 0) lines.push('Nothing changed.');
	for (const page of pages) {
		const path = toVaultPath(ctx, page.file.path);
		// Archived notes stay in the report, marked, unless the request says to leave them out.
		const note = page.archived ? ' (archived)' : '';
		lines.push(isSafeWikilinkTarget(path)
			? `- ${pinnedWikilink(path)}${note}`
			: `- ${inert(path).replace(/[\\[\]<>#|^]/g, '\\$&')} (not linked: unsafe name)${note}`);
	}
	lines.push('', markers.end);
	return lines.join('\n');
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'report',
			title: 'Recent changes report',
			description: `Refreshes ${REPORT} and opens it`,
			run: async (_input, run) => {
				const stopped = () => run.signal.aborted || ctx.signal.aborted;
				const since = Date.now() - DAYS * 86_400_000;
				const kb = await ctx.kb();
				if (stopped()) return;
				const pages = kb.pages(`"${SOURCE}"`)
					// mtime 0: a note so new the index has no times for it yet; a report only shows it, so it is kept, first.
					.where((p) => p.file.mtime === 0 || p.file.mtime >= since)
					.sort((p) => p.file.mtime || Number.MAX_SAFE_INTEGER, 'desc')
					.limit(LIMIT)
					.array();
				const markers = ownedMarkers(ctx.mod.id, `v1 ${SOURCE}`);
				const block = renderBlock(ctx, markers, pages);
				const initial = `# Recent in ${SOURCE}\n\nWrite your notes here; only the block below is regenerated.\n\n${block}\n`;
				const changed = await upsertOwnedReport(ctx, REPORT, initial,
					(text) => replaceOwnedBlock(text, markers, block, `${REPORT}: its generated markers are missing or were edited; restore one start and one end marker, then run again`),
					stopped);
				if (stopped()) {
					if (changed && !ctx.signal.aborted) ctx.notify(`${REPORT} was updated, but the run stopped. The result was kept.`, { kind: 'warning' });
					return;
				}
				await ctx.workspace.openNote(REPORT);
				ctx.notify(changed ? 'Report updated' : 'Report already up to date', { kind: 'success' });
			},
		});
		ctx.labs.place('report', { palette: true });
	},
};
```

Why it is written this way:

- The block holds no timestamp: identical data gives identical text, and then nothing is written. A needless write bumps the index and invalidates every QueryJS block's page set (file history alone skips a snapshot identical to the latest one).
- `replaceOwnedBlock` refuses rather than guesses when markers are missing, duplicated or edited, and the marker key (`v1 Projects`) names the version and subject, so a report of another subject is never overwritten. An ordinary note at that path is refused too.
- `create` and the merge are split on purpose: `create` refuses an existing path, `write` refuses a missing one. When the report is the active tab, the merge goes through the editor and keeps the user's unsaved text.
- `stopped` also checks `ctx.signal` (mod unload) and is consulted inside the merge callback, so no write starts after Stop; the warning toast says the result was kept.
- `file.mtime` comes from the index snapshot, which refreshes about 2 s after a change and at most once per 10 s: a note saved a moment ago can still show its previous mtime (and a brand-new one `0`) for up to about 12 s. The report only shows notes, so it keeps the `0` ones (sorted first) rather than hide the newest note; a recipe that changes or moves notes by mtime leaves them out instead ([Freshness and lag](10-querying-the-index.md#freshness-and-lag)). Links use the pinned form (`[[Folder/Name.md|Name]]`) so they resolve to the exact file even when two notes share a name.
- **Text copied into the block goes through `inert`.** A block that quotes note text (task lines, titles, excerpts) can carry `<!--`, for example a task that mentions the end marker; `replaceOwnedBlock` then sees a third marker mention and refuses every later run. `inert` turns `<!--` into `&lt;!--`, which opens no comment and no longer counts as a marker.
- **Copied text also brings its tags and links.** A `#tag` or `[[link]]` inside quoted text becomes a tag or link of the report note: it shows in tag search, the Tags view and the backlinks of the linked note. That is often what the user wants from a report; when it is not, leave the text out or say so in the handover.
- **Copied text that must stay plain text** (a note name in a heading or a list item, a task quoted as a sample) goes through `markdownText` instead of `inert`. It escapes the Markdown punctuation with a backslash, so `Odd #1` gives no tag and `[[x]]` no link (the index needs `#` after a space and two adjacent `[`; Live Preview hides the backslash), puts line breaks as spaces so the text stays on its line, and turns `<` into `&lt;`, which covers what `inert` does:

```javascript
/** Copied text for one line of generated Markdown: no tag, link, emphasis, table cell, HTML comment or line break of its own. */
function markdownText(text) {
	return String(text)
		.replace(/[\r\n\p{Zl}\p{Zp}]+/gu, ' ')
		.replace(/[\\`*_[\]#|~=]/g, '\\$&')
		.replace(/</g, '&lt;');
}
```
- Archived notes stay in the report, marked `(archived)`: drop them only when the request says to.

## 9. Batch over a folder

Goal: remove a frontmatter property from every Markdown note under a folder: collect, preview the count, confirm as destructive, show progress, stop between notes, warn about partial work, and summarize.

Uses: stable `ctx.vault.list`, `run.*`, `run.target`; raw `ctx.app.updateNoteFrontmatter`, `vaultStore`; unstable `ctx.labs.place`.

```javascript
/** One index refresh window re-reads the whole vault past 200 changed paths; see the note below */
const BATCH = 150;
const PAUSE_MS = 10_000;
/** Thrown by the mutate for a note without the property, so that note is not rewritten */
const UNCHANGED = new Error('unchanged');

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

function writeFailureText(err) {
	if (err?.reason === 'save-failed') return null;
	return typeof err?.reason === 'string' ? `frontmatter not changed (${err.reason})` : errorMessage(err);
}

function cleanFolder(text) {
	const segments = text.trim().split('/').map((s) => s.trim()).filter((s) => s !== '');
	if (segments.length === 0 || segments.some((s) => s === '.' || s === '..')) return null;
	return segments.join('/');
}

/** Resolves after `ms`, or at once when `signal` aborts */
function pause(ms, signal) {
	return new Promise((resolve) => {
		if (signal.aborted) return resolve();
		const timer = setTimeout(resolve, ms);
		signal.addEventListener('abort', () => {
			clearTimeout(timer);
			resolve();
		}, { once: true });
	});
}

/**
 * Every file under `folder` ('' = vault root): `{ files, failed }`, files sorted.
 * `failed` lists the subfolders that could not be read, as `{ path, message }`.
 * `skip(path)` returning true leaves out a folder and everything in it.
 * Rejects when `folder` itself cannot be read, and with AbortError once `signal` aborts.
 * Copied from 04 § list(folder).
 */
async function listFilesDeep(ctx, folder, { signal, skip = () => false } = {}) {
	const files = [];
	const failed = [];
	const pending = [folder];
	while (pending.length > 0) {
		signal?.throwIfAborted();
		const current = pending.pop();
		let entries;
		try {
			entries = await ctx.vault.list(current);
		} catch (err) {
			if (current === folder) throw err;
			// A Tauri rejection is a bare string, not an Error.
			failed.push({ path: current, message: typeof err?.message === 'string' ? err.message : String(err) });
			continue;
		}
		for (const entry of entries) {
			if (entry.isFolder) {
				if (!skip(entry.path)) pending.push(entry.path);
			} else {
				files.push(entry.path);
			}
		}
	}
	return { files: files.sort((a, b) => a.localeCompare(b)), failed };
}

/** updateNoteFrontmatter, then the caret back where it was relative to the text after it. Copied from 09 § Known problems. */
async function updateFrontmatterKeepCaret(ctx, absolutePath, mutate) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const shown = tab && tab.path === absolutePath && view?.dom.isConnected ? view : null;
	const fromEnd = shown ? shown.state.doc.length - shown.state.selection.main.head : null;
	const written = await ctx.app.updateNoteFrontmatter(absolutePath, mutate);
	const now = ctx.app.editorStore.editorView;
	if (shown && now === shown && now.dom.isConnected && ctx.app.editorStore.activeTabPath === absolutePath) {
		now.dispatch({ selection: { anchor: Math.max(0, now.state.doc.length - fromEnd) } });
	}
	return written;
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'remove-property',
			title: 'Remove a property from a folder',
			run: async (_input, run) => {
				let folder;
				if (run.target?.on === 'folder') {
					folder = run.target.path;
				} else {
					const typed = await run.ui.prompt({ title: 'Folder', placeholder: 'e.g. Projects/Old' });
					if (typed === null) return;
					folder = cleanFolder(typed) ?? '';
				}
				// An empty prefix would select the whole vault.
				if (folder === '') throw new Error('Choose a folder below the vault root');
				const answer = await run.ui.prompt({ title: 'Property to remove', placeholder: 'e.g. status' });
				const key = answer?.trim();
				if (!key || run.signal.aborted) return;

				run.progress(0, 1, `Scanning ${folder}`);
				const { files, failed: unread } = await listFilesDeep(ctx, folder, { signal: run.signal });
				if (run.signal.aborted) return;
				const notes = files.filter((p) => /\.(md|markdown)$/i.test(p));
				// The folders the walk could not read: the user must know the batch did not cover them.
				for (const f of unread) run.log(`! Could not read ${f.path}: ${f.message}`);
				if (notes.length === 0) {
					ctx.notify(`No notes in ${folder}`);
					return;
				}
				const preview = notes.slice(0, 10).join('\n') + (notes.length > 10 ? `\n... and ${notes.length - 10} more` : '');
				const go = await run.ui.confirm({
					title: `Remove "${key}" from ${notes.length} note(s)?`,
					message: `${preview}\n\nNotes without it are left alone. Stop keeps what is done; it is not an undo.`,
					confirmLabel: 'Remove',
					destructive: true,
				});
				if (!go || run.signal.aborted) return;

				const root = ctx.app.vaultStore.path;
				let changed = 0;
				let failed = 0;
				let visited = 0;
				for (const path of notes) {
					if (run.signal.aborted) break;
					run.progress(visited, notes.length, path);
					let didChange = false;
					try {
						// The active note may be in the folder: keep the user's caret with their text.
						await updateFrontmatterKeepCaret(ctx, `${root}/${path}`, (props) => {
							// Returning `props` unchanged would still rewrite the YAML of every note in canonical form.
							if (!props.some((p) => p.key === key)) throw UNCHANGED;
							return props.filter((p) => p.key !== key);
						});
						didChange = true;
					} catch (err) {
						if (err !== UNCHANGED) {
							failed++;
							// The run log is no toast, so a save failure the editor already toasted still names its note.
							run.log(`! ${path}: ${writeFailureText(err) ?? 'save failed'}`);
						}
					}
					visited++;
					if (didChange) {
						changed++;
						if (changed % BATCH === 0 && visited < notes.length) {
							run.log(`Waiting ${PAUSE_MS / 1000} s for the index to catch up`);
							await pause(PAUSE_MS, run.signal);
						}
					}
				}

				if (run.signal.aborted) {
					if (!ctx.signal.aborted) {
						ctx.notify(`Stopped: ${changed} changed, ${failed} failed, ${notes.length - visited} not visited`, { kind: 'warning' });
					}
					return;
				}
				run.progress(notes.length, notes.length, 'Done');
				ctx.notify(`${changed} changed, ${failed} failed (see the run log)`, { kind: failed > 0 ? 'warning' : 'success' });
			},
		});
		ctx.labs.place('remove-property', { palette: true, menu: { on: ['folder'] } });
	},
};
```

Why it is written this way:

- The files are collected from disk with `listFilesDeep`, not from the index, so a note created a second ago is included. A subfolder that cannot be read does not stop the walk; it is named in the run log, so a batch that missed a folder does not look complete. `run.target.path` is `''` for the vault root, and the action refuses it.
- "No notes" is not a failure: a toast, and the run ends **Done** (a throw would end it **Failed**).
- One write per note means Stop between notes leaves every note either done or untouched. After Stop the summary is a toast, because `run.log` and `run.progress` are dropped once the run is cancelled; on success the final `run.progress(n, n)` and the toast come only at the end.
- A note without the property makes the mutate throw `UNCHANGED`, so it is neither rewritten nor counted: returning the same list would rewrite its frontmatter in canonical form (see recipe 5), touching every note of the folder.
- A failing note is counted and logged, and the loop goes on. The confirm uses `destructive: true`, and its confirm button has the initial focus, so Enter confirms at once: the preview of paths in `message` is what protects the user.
- The pause keeps the app responsive on large folders: one index refresh window lasts up to 10 seconds, and a window with more than 200 changed paths makes the app re-read the whole vault. `pause` resolves at once on Stop.

## 10. Move notes in bulk with collision handling

Goal: move every note of a folder into its `Archive` subfolder, renaming a note first when the name is taken.

Uses: stable `ctx.vault.list`, `exists`, `rename`, `move`, `run.*`, `run.target`; unstable `ctx.labs.place`.

```javascript
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

function cleanFolder(text) {
	const segments = text.trim().split('/').map((s) => s.trim()).filter((s) => s !== '');
	if (segments.length === 0 || segments.some((s) => s === '.' || s === '..')) return null;
	return segments.join('/');
}

/** "Name-2.md", "Name-3.md", ... : the first name free in every one of `folders` */
async function freeName(ctx, folders, name) {
	const dot = name.lastIndexOf('.');
	const stem = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : '';
	for (let n = 2; ; n++) {
		const candidate = `${stem}-${n}${ext}`;
		const taken = await Promise.all(folders.map((folder) => ctx.vault.exists(`${folder}/${candidate}`)));
		if (!taken.some(Boolean)) return candidate;
	}
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'archive',
			title: 'Archive the notes of a folder',
			run: async (_input, run) => {
				let source;
				if (run.target?.on === 'folder') {
					source = run.target.path;
				} else {
					const typed = await run.ui.prompt({ title: 'Folder to archive', placeholder: 'e.g. Inbox' });
					if (typed === null) return;
					source = cleanFolder(typed) ?? '';
				}
				if (source === '') throw new Error('Choose a folder below the vault root');
				const target = `${source}/Archive`;
				// ctx.vault has no mkdir, and move needs an existing folder.
				if (!(await ctx.vault.exists(target))) throw new Error(`Create the folder "${target}" first`);

				const notes = (await ctx.vault.list(source))
					.filter((entry) => !entry.isFolder && /\.(md|markdown)$/i.test(entry.name))
					.sort((a, b) => a.name.localeCompare(b.name));
				if (notes.length === 0) {
					ctx.notify(`No notes directly in ${source}`);
					return;
				}
				const go = await run.ui.confirm({
					title: `Move ${notes.length} note(s) to ${target}?`,
					message: 'A note whose name is taken there gets a -2, -3 ... suffix first.',
					confirmLabel: 'Move',
				});
				if (!go || run.signal.aborted) return;

				let moved = 0;
				let renamed = 0;
				let failed = 0;
				for (const [i, entry] of notes.entries()) {
					if (run.signal.aborted) break;
					run.progress(i, notes.length, entry.name);
					let path = entry.path;
					try {
						if (await ctx.vault.exists(`${target}/${entry.name}`)) {
							path = await ctx.vault.rename(path, await freeName(ctx, [source, target], entry.name));
							renamed++;
							run.log(`${entry.name} renamed to ${path.split('/').pop()}`);
						}
						await ctx.vault.move(path, target);
						moved++;
					} catch (err) {
						failed++;
						run.log(`! ${path}: ${errorMessage(err)}`);
					}
				}

				const summary = `${moved} moved (${renamed} renamed), ${failed} failed`;
				if (run.signal.aborted) {
					if (!ctx.signal.aborted) ctx.notify(`Stopped: ${summary}, ${notes.length - moved - failed} not visited`, { kind: 'warning' });
					return;
				}
				run.progress(notes.length, notes.length, 'Done');
				ctx.notify(summary, { kind: failed > 0 ? 'warning' : 'success' });
			},
		});
		ctx.labs.place('archive', { palette: true, menu: { on: ['folder'] } });
	},
};
```

Why it is written this way:

- `move` and `rename` never overwrite: they reject with `"<name>" already exists in this folder`. Checking first and renaming to a name free in both folders keeps the run going instead of failing per note.
- Renaming a Markdown note whose name changes rewrites the wikilinks in other notes that point to it (and flushes unsaved edits of those notes to disk), so links keep working. A pure move keeps the name and rewrites nothing. `[[Name]]` links still resolve, and so do links with a folder but no extension (`[[Old/Folder/Name]]`): those resolve by name only, wherever the note is. Both keep pointing at the note as long as its name is unique in the vault. Only a pinned link (`[[Old/Folder/Name.md|Name]]`) stops matching its exact path and falls back to the name (see [Vault files: Writing a wikilink](04-vault-files.md#writing-a-wikilink)).
- Rename then move is two steps: when the move fails, the note stays renamed in the source folder, and the run log says so.
- `ctx.vault.list` returns direct children only, unsorted; the recipe sorts by name so progress is predictable. Open tabs follow the moved files, unsaved edits included: the tab keeps its text and dirty state and saves to the new path.
- The only way to create a folder through `ctx.vault` is to create a file inside it (`create` makes missing parents), which is why the recipe asks the user to create `Archive` rather than leaving a placeholder file behind.

## 11. Keyboard shortcuts

Goal: Cmd+Shift+J runs one of this mod's actions and Cmd+Shift+Y runs an action of another mod, both looked up at keypress time.

Uses: raw `ctx.app.modCommandsStore`, `openOrCreateDailyNote`; `window` keydown; unstable `ctx.labs.place`.

```javascript
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'today',
			title: "Open today's note",
			description: 'Cmd+Shift+J',
			run: () => ctx.app.openOrCreateDailyNote(),
		});
		ctx.labs.place('today', { palette: true });

		/** Letters by e.key, lowercased, as the app matches its own shortcuts (07 § e.key vs e.code) */
		const CHORDS = [
			{ key: 'j', label: 'Cmd+Shift+J', command: `mod:${ctx.mod.id}:action:today` },
			// An action of another mod: the command id is mod:<mod id>:action:<action id>.
			{ key: 'y', label: 'Cmd+Shift+Y', command: 'mod:hello:action:say-hello' },
		];
		const inDialog = (target) => target instanceof Element && target.closest('[role="dialog"]') !== null;

		const onKeyDown = (e) => {
			// Only Cmd+Shift: Cmd+Option and Ctrl combinations stay the app's. Never act mid-composition (IME).
			if (e.defaultPrevented || e.isComposing || !e.metaKey || !e.shiftKey || e.altKey || e.ctrlKey) return;
			const chord = CHORDS.find((c) => c.key === e.key.toLowerCase());
			// Both chords open something and insert no text, so a focused text field is no reason to skip them.
			if (!chord || inDialog(e.target)) return;
			e.preventDefault();
			// Holding the chord repeats it about 30 times a second.
			if (e.repeat) return;
			try {
				// Looked up now: a reload of either mod replaces its rows.
				const row = ctx.app.modCommandsStore.list.find((c) => c.id === chord.command);
				if (!row) throw new Error(`${chord.label}: ${chord.command} is not loaded`);
				row.run();
			} catch (err) {
				if (ctx.signal.aborted) return;
				ctx.notify(errorMessage(err), { kind: 'warning' });
			}
		};
		// Bubble phase: the editor and the app's own shortcuts handle a key first and mark it defaultPrevented.
		window.addEventListener('keydown', onKeyDown, { signal: ctx.signal });
	},
};
```

Why it is written this way:

- Going through the `modCommandsStore` row (instead of calling a function directly) gives the shortcut the same run as the palette: a run view on output, Stop, the error toast, and the one-live-run rule. `row.run()` returns nothing and cannot pass input; an action with `input` opens its text field.
- Rows are looked up at keypress time because `list` returns fresh objects on every read and a reloaded mod has new callbacks; a stale row throws `Mod "<id>" is unloaded`.
- The listener is removed by `{ signal: ctx.signal }`, which aborts at unload; the host does not track DOM listeners, so without it the old listener would keep firing after a reload.
- A shortcut runs outside any action, so its errors are caught and toasted here; the host never sees them. Cmd+Shift+J and Cmd+Shift+Y are not used by the app's global shortcuts today, but the mod does no conflict detection.
- Letters are matched by `e.key.toLowerCase()`, like the app's own shortcuts, so the chord follows the letter printed on the key. A chord that **inserts text** into the note must also require `view.hasFocus` on the current editor view, or a key pressed in a Live Preview widget's input would write into the note (see [Events: Ignore typing targets](07-events-and-reactivity.md#ignore-typing-targets)).

> [!NOTE]
> `modCommandsStore` is raw access. The shortcut works only while the app window has focus. Inside an action that needs a dialog, use `run.ui`; a shortcut handler that asks the user something uses `ctx.ui`.

## 12. Status bar chip for the active note

Goal: a chip in the status bar that shows the active note's name and whether it has unsaved edits, updates through `ctx.watch`, and copies the note's path when clicked.

Uses: raw `ctx.app.editorStore`, `vaultStore`; app DOM (`[data-status-bar]`); stable `ctx.watch`, `ctx.register`.

```javascript
// App markup (the status bar component), not an API: it can change in any release.
const STATUS_GROUP_SELECTOR = '[data-status-bar] > .status-bar-group:last-child';

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/**
 * A chip at the start of the right status-bar group, put back when the app
 * rebuilds the bar. A `<button>` when it has a click handler, else a `<span>`
 * (display only). Fill `node` yourself; `show()` mounts it, `hide()` removes it.
 * Copied from 08 § A status-bar chip.
 */
function createStatusChip(onClick) {
	const node = document.createElement(onClick ? 'button' : 'span');
	if (onClick) {
		node.type = 'button';
		node.style.cursor = 'pointer';
		node.addEventListener('click', onClick);
	}
	let observer = null;
	let queued = false;
	const attach = () => {
		queued = false;
		// A frame queued before hide() still runs: without the observer check it would re-add a hidden chip.
		if (observer && !node.isConnected) document.querySelector(STATUS_GROUP_SELECTOR)?.prepend(node);
	};
	// Runs on every DOM change in the app: stay cheap, and attach at most once per frame.
	const onMutation = () => {
		if (queued || node.isConnected) return;
		queued = true;
		requestAnimationFrame(attach);
	};
	return {
		node,
		show() {
			if (!observer) {
				observer = new MutationObserver(onMutation);
				observer.observe(document.body, { childList: true, subtree: true });
			}
			attach();
		},
		hide() {
			observer?.disconnect();
			observer = null;
			// Removed, not display:none: a hidden first child would leave the bar's divider before the next item.
			node.remove();
		},
	};
}

export default {
	onload(ctx) {
		let current = '';
		// A click is a user gesture, which the clipboard needs.
		const chip = createStatusChip(() => {
			const root = ctx.app.vaultStore.path;
			const relative = current.startsWith(`${root}/`) ? current.slice(root.length + 1) : current;
			navigator.clipboard.writeText(relative).then(
				() => {
					if (!ctx.signal.aborted) ctx.notify(`Copied ${relative}`);
				},
				(err) => {
					if (!ctx.signal.aborted) ctx.notify(`Could not copy: ${errorMessage(err)}`, { kind: 'warning' });
				},
			);
		});
		chip.node.title = 'Click to copy the vault path';
		ctx.register(() => chip.hide());

		/** A string, so Object.is sees a change only when the text would change */
		const read = () => {
			const tab = ctx.app.editorStore.activeTab;
			if (!tab || !/\.(md|markdown)$/i.test(tab.path)) return '';
			return `${tab.path}\n${tab.content !== tab.savedContent ? 'unsaved' : 'saved'}`;
		};
		const render = (value) => {
			if (value === '') {
				current = '';
				chip.hide();
				return;
			}
			const [path, state] = value.split('\n');
			current = path;
			const name = path.split('/').pop().replace(/\.(md|markdown)$/i, '');
			chip.node.textContent = state === 'unsaved' ? `${name} (unsaved)` : name;
			chip.show();
		};

		// watch does not call back at subscription: render the starting state once.
		render(read());
		ctx.watch(read, render);
	},
};
```

Why it is written this way:

- `read` returns a primitive string: `ctx.watch` compares with `Object.is`, so returning a tab object or a fresh array would count as a change on every run. Reading `tab.content` re-runs `read` on every keystroke, so it does one comparison and nothing else; a chip that only needs the name would read `activeTabPath`.
- `createStatusChip` is the canonical chip of [Custom UI](08-custom-ui.md#a-status-bar-chip), with the same selector and observer as the [status-chip example](../../examples/mods/status-chip/). It makes a `<button>` because this chip has a click handler; a display-only chip is a `<span>` (call `createStatusChip()` without a handler).
- The selector lives in one constant with a comment saying what it depends on, and `attach` does nothing when the bar is missing: a markup change makes the chip disappear instead of throwing.
- The `MutationObserver` puts the chip back when the app re-renders the status bar; it runs only while the chip is shown, its callback is a cheap `isConnected` check (it fires on every DOM change, typing included), and the real attach waits for one animation frame.
- One `ctx.register` disposer removes the node and the observer; the watch's own disposer is removed by the host at unload.
- The click handler writes to the clipboard directly: a click is the user gesture that `navigator.clipboard.writeText` needs. See recipe 19 for copying from an action.
- The chip inherits the bar's font and color, so it follows every theme. For custom colors use the theme's CSS variables (`var(--muted-foreground)`) rather than reading `ctx.theme`. See [Custom UI](08-custom-ui.md).

> [!WARNING]
> This recipe depends on the app's DOM, which is not part of any contract. Test it after each app update.

## 13. A timer that survives reloads

Goal: a focus timer that keeps its deadline in mod data, resumes after a reload or restart, finishes even when no run is open, and leaves no interval behind at unload.

Uses: stable `ctx.loadData`, `saveData`, `ctx.register`, `ctx.signal`, `ctx.notify`.

```javascript
const TICK_MS = 1000;
const MINUTES = 25;

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/** Strict, so data of another shape is reported and left alone instead of overwritten */
function isTimerData(data) {
	if (typeof data !== 'object' || data === null || Array.isArray(data) || data.version !== 1) return false;
	const s = data.session;
	if (s === null) return true;
	return typeof s === 'object' && !Array.isArray(s) && Number.isSafeInteger(s.deadlineMs) && s.deadlineMs > 0 &&
		typeof s.topic === 'string';
}

export default {
	onload(ctx) {
		let session = null;
		let interval = null;
		let disposed = false;
		let blocked = false;
		const live = () => !disposed && !ctx.signal.aborted;
		const stopTicking = () => {
			if (interval !== null) clearInterval(interval);
			interval = null;
		};
		// The host does not clear timers: an interval would outlive the mod.
		ctx.register(() => {
			disposed = true;
			stopTicking();
		});

		const save = (next) => ctx.saveData({ version: 1, session: next });
		const finish = () => {
			const done = session;
			stopTicking();
			session = null;
			save(null).catch((err) => {
				if (live()) ctx.notify(`Could not clear the timer: ${errorMessage(err)}`, { kind: 'warning' });
			});
			if (!live()) return;
			// The user must not miss this: a toast is gone after a few seconds, an alert waits for OK.
			// ctx.ui, not run.ui: the timer runs outside any action. At unload the alert just closes.
			ctx.ui.alert({ title: 'Focus block done', message: done.topic || undefined, kind: 'success' }).catch(() => {});
		};
		const schedule = () => {
			stopTicking();
			if (session === null) return;
			interval = setInterval(() => {
				// Against the clock, not a tick count: a throttled interval cannot drift the deadline.
				if (live() && session !== null && Date.now() >= session.deadlineMs) finish();
			}, TICK_MS);
		};

		// Every action waits for this, so nothing is saved before the stored state is known.
		const ready = (async () => {
			try {
				const data = await ctx.loadData();
				if (!live() || data === null) return;
				if (!isTimerData(data)) throw new Error('data.json is not in the expected shape; fix or remove it');
				if (data.session === null) return;
				if (data.session.deadlineMs <= Date.now()) {
					ctx.notify('A focus block ended while the app was closed', { kind: 'warning' });
					save(null).catch(() => {});
					return;
				}
				session = data.session;
				schedule();
			} catch (err) {
				if (!live()) return;
				if (err?.name === 'ModDataCorruptError') {
					// The host already moved the bad file aside, so starting empty loses nothing.
					ctx.notify(`Timer data was not valid JSON; a copy is kept in ${err.corruptPath}`, { kind: 'warning' });
					return;
				}
				blocked = true;
				ctx.notify(`The timer is off: ${errorMessage(err)}. Stored data was left unchanged.`, { kind: 'warning' });
			}
		})();
		const usable = async () => {
			await ready;
			if (blocked) throw new Error('The timer is off because its stored data could not be read');
		};

		ctx.addAction({
			id: 'start',
			title: `Focus ${MINUTES} min`,
			input: { placeholder: 'What are you focusing on? (optional)' },
			run: async (input, run) => {
				await usable();
				if (run.signal.aborted) return;
				const next = { deadlineMs: Date.now() + MINUTES * 60_000, topic: input.trim() };
				await save(next);
				// An unload during the save already ran the cleanup: a new interval would leak.
				if (!live()) return;
				session = next;
				schedule();
				ctx.notify(`Focus until ${new Date(next.deadlineMs).toLocaleTimeString()}`);
			},
		});
		ctx.addAction({
			id: 'stop',
			title: 'Stop timer',
			run: async () => {
				await usable();
				if (session === null) return ctx.notify('No focus block running');
				stopTicking();
				session = null;
				await save(null);
				ctx.notify('Timer stopped');
			},
		});
		ctx.addAction({
			id: 'status',
			title: 'Time left',
			run: async () => {
				await usable();
				if (session === null) return ctx.notify('No focus block running');
				const minutes = Math.max(1, Math.ceil((session.deadlineMs - Date.now()) / 60_000));
				ctx.notify(`${minutes} min left${session.topic ? ` on ${session.topic}` : ''}`);
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Focus timer', icon: 'lucide:timer', actions: ['start', 'stop', 'status'] });
	},
};
```

Why it is written this way:

- The timer lives in the mod, not in a run: `start` returns at once, so the run ends Done and Stop has nothing to cancel. Unload (switch off, edit of `main.js`, vault close) runs the `ctx.register` cleanup, and every late continuation checks `live()` before touching `ctx`, which throws once the mod is unloaded.
- The deadline is an absolute `Date.now()` value saved with `saveData`, so a reload after editing `main.js`, or an app restart, resumes the same block; an expired block is reported, not silently finished.
- Load before act: actions wait for `ready`. A corrupt file was already moved aside by the host (`err.corruptPath`), so starting empty is safe; any other load failure, or valid JSON of another shape, blocks every save so the mod never overwrites data it could not read. The host itself refuses `saveData` after a failed `loadData`.
- `saveData` calls land in call order and the last one wins, so a `finish` save and a `stop` save never interleave into a stale state.
- The end of a block is announced with `ctx.ui.alert`, not `ctx.notify`: a toast lasts about 4 seconds and is easy to miss when the user looks away. A chip left in a visible "done" state until clicked is the other option.
- To show the countdown, drive the chip from recipe 12 with a `render()` call in the interval.

## 14. Fetch from an allowed host

Goal: search the public Hugging Face model API, write the top results to `Research/HF <query>.md`, and open it, with Stop, a timeout and clear error text.

Uses: stable `ctx.vault`, `ctx.workspace`, `run.*`; the web view's `fetch`.

```javascript
const FOLDER = 'Research';
const LIMIT = 20;
const TIMEOUT_MS = 15000;

const pad2 = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * GETs url as text. Aborts with `signal` (pass run.signal) and after timeoutMs.
 * Rejects with an Error whose message is fit for the run view and the failure toast.
 * Copied from 11 § Timeouts.
 */
async function fetchText(url, signal, timeoutMs) {
	const host = new URL(url).host;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = () => controller.abort();
	signal.addEventListener('abort', onAbort, { once: true });
	if (signal.aborted) controller.abort();
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`${host} answered ${res.status}`);
		// Read inside the try: the timeout and Stop also cover a body that arrives slowly.
		return await res.text();
	} catch (err) {
		if (signal.aborted) throw err; // Stop or unload: the host ignores this rejection
		if (controller.signal.aborted) throw new Error(`No answer from ${host} after ${Math.round(timeoutMs / 1000)} s`);
		if (err instanceof TypeError) throw new Error(`Could not reach ${host}: offline, or not allowed by the app's network policy`);
		throw err;
	} finally {
		clearTimeout(timer);
		signal.removeEventListener('abort', onAbort);
	}
}

/** A title as one safe file name without extension; '' when nothing is left (the caller refuses it). Copied from 04 § Note names. */
function safeName(title) {
	const MAX_BYTES = 200;
	const cleaned = String(title)
		.replace(/[\\/:#|^[\]]/g, ' ')
		.replace(/\p{Cc}/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^[.\s]+/, '');
	const encoder = new TextEncoder();
	let name = '';
	let bytes = 0;
	for (const char of cleaned) {
		bytes += encoder.encode(char).length;
		if (bytes > MAX_BYTES) break;
		name += char;
	}
	return name.trim();
}

/** A YAML double-quoted scalar (JSON is one) in which the index cannot find a wikilink */
const yamlText = (text) => JSON.stringify(text).replaceAll('[[', '[\\u005B');

/** A 200 is not always the API: a captive portal answers with HTML */
function parseModels(body) {
	let data;
	try {
		data = JSON.parse(body);
	} catch {
		throw new Error('huggingface.co did not answer with JSON (a captive portal or proxy page?)');
	}
	if (!Array.isArray(data)) throw new Error('Unexpected answer from huggingface.co');
	return data.map((m) => ({
		id: typeof m?.id === 'string' ? m.id : '?',
		task: typeof m?.pipeline_tag === 'string' ? m.pipeline_tag : '',
		downloads: Number.isFinite(m?.downloads) ? m.downloads : 0,
		likes: Number.isFinite(m?.likes) ? m.likes : 0,
	}));
}

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');

function renderNote(query, models, date) {
	const rows = models.map((m) => `| [${cell(m.id)}](https://huggingface.co/${encodeURI(m.id)}) | ${cell(m.task)} | ${m.downloads} | ${m.likes} |`);
	return [
		'---',
		'source: huggingface',
		`query: ${yamlText(query)}`,
		`fetched: ${date}`,
		'---',
		'',
		`# Models for ${safeName(query)}`,
		'',
		'| Model | Task | Downloads | Likes |',
		'| --- | --- | --- | --- |',
		...rows,
		'',
	].join('\n');
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'search',
			title: 'Search Hugging Face models',
			description: `Top ${LIMIT} by downloads, written to ${FOLDER}/HF <query>.md`,
			input: { placeholder: 'e.g. embedding, whisper' },
			run: async (input, run) => {
				const query = input.trim();
				if (!query) throw new Error('Type a search, e.g. embedding');
				const name = safeName(query);
				if (!name) throw new Error('Type a query with letters or digits');
				const path = `${FOLDER}/HF ${name}.md`;
				const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${LIMIT}`;

				// No run.progress or run.log: the run ends by opening the note, and output would keep
				// the run view open on top of it. The input action's view already shows Stop while this waits.
				const models = parseModels(await fetchText(url, run.signal, TIMEOUT_MS));
				if (run.signal.aborted) return;
				if (models.length === 0) return ctx.notify(`No models match "${query}"`);

				const exists = await ctx.vault.exists(path);
				if (exists) {
					const replace = await run.ui.confirm({
						title: `Replace ${path}?`,
						message: 'Edits you made in that note will be lost.',
						confirmLabel: 'Replace',
						destructive: true,
					});
					if (!replace) return;
				}
				if (run.signal.aborted) return;
				const text = renderNote(query, models, localDate(new Date()));
				if (exists) await ctx.vault.write(path, text);
				else await ctx.vault.create(path, text);
				if (run.signal.aborted) {
					if (!ctx.signal.aborted) ctx.notify(`${path} was ${exists ? 'replaced' : 'created'}, but the run stopped.`, { kind: 'warning' });
					return;
				}

				// The last step: with no output, the run view closes by itself and the note shows.
				await ctx.workspace.openNote(path);
			},
		});
		ctx.labs.place('search', { palette: true });
	},
};
```

Why it is written this way:

- The web view's CSP decides which hosts `fetch` reaches: `https://huggingface.co`, `https://github.com`, `https://objects.githubusercontent.com` and `https://api.todoist.com` (plus Sentry ingest hosts). Any other host, including `api.github.com` and `raw.githubusercontent.com`, fails with a generic network `TypeError`, and a mod cannot change the CSP. See [Network and platform](11-network-and-platform.md).
- huggingface.co answers the API with `access-control-allow-origin: tauri://localhost`, so the web view may read the response (CORS), on top of the CSP allowing the host.
- `fetchText` is the preferred fetch helper of [Network and platform](11-network-and-platform.md#timeouts): Stop and unload cancel the request through `run.signal`, a stalled server fails after the timeout, and every failure becomes a message that names the host, since WebKit's own text ("Load failed") says nothing. A rejection after Stop is ignored by the host.
- `res.ok` is checked first (the API reports bad parameters as a 4xx), then the body is parsed as text inside a `try`, and every field is read defensively.
- The run writes no `run.progress` or `run.log`: it ends by opening the note, and a run with output stays on **Done** on top of it (see [Runs: Ending an action](03-runs.md#ending-an-action)). No results is not a failure: a toast.
- User text never becomes a path segment, a link or a tag unchecked: `safeName` (from [Vault files](04-vault-files.md#note-names-safename)) strips path and wikilink characters and leading dots, and the query in frontmatter is JSON-quoted with `[[` escaped, because the index finds wikilinks everywhere, frontmatter included.
- `create` refuses an existing path and `write` a missing one, so the code picks one after `exists`, and the confirm protects a note the user may have edited. A dirty open tab still makes `write` reject, which fails the run visibly.

## 15. React to saves without a save loop

Goal: keep `Meetings/Index.md` listing every note of `Meetings`, refreshed shortly after any note there is saved, without the index's own write triggering another refresh.

Uses: stable `ctx.onNoteSaved`, `ctx.vault`, `ctx.register`, `ctx.signal`.

```javascript
const WATCHED = 'Meetings';
const INDEX = `${WATCHED}/Index.md`;
const DELAY_MS = 1500;

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/** Whether `target` can sit between [[ and ]] as one link to itself. Copied from 04 § Writing a wikilink. */
function isSafeWikilinkTarget(target) {
	return !/[[\]|#^\\<>\p{Cc}\p{Zl}\p{Zp}]/u.test(target) && target.trim() === target;
}

/** [[Folder/Name.md|Name]]: pins this exact file, shows its name. Copied from 04 § Writing a wikilink. */
const pinnedWikilink = (path) => `[[${path}|${path.split('/').pop().replace(/\.(md|markdown)$/i, '')}]]`;

/** Creates or overwrites a generated note; resolves whether it wrote. Not a merge: replaces the whole file. Copied from 04 § upsertNote. */
async function upsertNote(ctx, path, text) {
	if (!(await ctx.vault.exists(path))) await ctx.vault.create(path, text);
	else if ((await ctx.vault.read(path)) !== text) await ctx.vault.write(path, text);
	else return false;
	return true;
}

/**
 * Every file under `folder` ('' = vault root): `{ files, failed }`, files sorted.
 * `failed` lists the subfolders that could not be read, as `{ path, message }`.
 * `skip(path)` returning true leaves out a folder and everything in it.
 * Rejects when `folder` itself cannot be read, and with AbortError once `signal` aborts.
 * Copied from 04 § list(folder).
 */
async function listFilesDeep(ctx, folder, { signal, skip = () => false } = {}) {
	const files = [];
	const failed = [];
	const pending = [folder];
	while (pending.length > 0) {
		signal?.throwIfAborted();
		const current = pending.pop();
		let entries;
		try {
			entries = await ctx.vault.list(current);
		} catch (err) {
			if (current === folder) throw err;
			// A Tauri rejection is a bare string, not an Error.
			failed.push({ path: current, message: typeof err?.message === 'string' ? err.message : String(err) });
			continue;
		}
		for (const entry of entries) {
			if (entry.isFolder) {
				if (!skip(entry.path)) pending.push(entry.path);
			} else {
				files.push(entry.path);
			}
		}
	}
	return { files: files.sort((a, b) => a.localeCompare(b)), failed };
}

async function rebuildIndex(ctx) {
	const { files, failed } = await listFilesDeep(ctx, WATCHED, { signal: ctx.signal });
	const notes = files.filter((path) => path !== INDEX && /\.(md|markdown)$/i.test(path));
	const lines = notes.map((path) => {
		const name = path.split('/').pop().replace(/\.(md|markdown)$/i, '');
		return isSafeWikilinkTarget(path) ? `- ${pinnedWikilink(path)}` : `- ${name.replace(/<!--/g, '&lt;!--')} (not linked: unsafe name)`;
	});
	// A folder the walk could not read is named in the note, so the list does not look complete.
	const missing = failed.map((f) => `- Could not read ${f.path}: ${f.message}`);
	const text = `# ${WATCHED}\n\nGenerated by the ${ctx.mod.name} mod: edits here are replaced.\n\n${[...lines, ...missing].join('\n')}\n`;
	return upsertNote(ctx, INDEX, text);
}

export default {
	onload(ctx) {
		const isIndexActive = () =>
			ctx.app.editorStore.activeTabPath?.replace(/\/{2,}/g, '/') === `${ctx.app.vaultStore.path}/${INDEX}`;
		// One rebuild at a time: two overlapping ones could both try to create the index.
		let queue = Promise.resolve();
		const enqueue = (task) => {
			const result = queue.then(task);
			queue = result.catch(() => {});
			return result;
		};

		/** A rebuild waiting for the user to leave the index note */
		let pending = false;
		const rebuildInBackground = () => {
			// A write into the active note would put the caret back at its old offset: wait until the user leaves it.
			if (isIndexActive()) {
				pending = true;
				return;
			}
			pending = false;
			enqueue(() => rebuildIndex(ctx)).catch((err) => {
				if (ctx.signal.aborted) return;
				ctx.log('index rebuild failed:', errorMessage(err));
				ctx.notify(`Could not update ${INDEX}: ${errorMessage(err)}`, { kind: 'warning' });
			});
		};

		let timer = null;
		ctx.register(() => {
			if (timer !== null) clearTimeout(timer);
		});
		ctx.onNoteSaved((path) => {
			// Our own write is a save too: ignoring it is the first loop guard.
			if (path === INDEX || !path.startsWith(`${WATCHED}/`) || !/\.(md|markdown)$/i.test(path)) return;
			// Autosave fires every couple of seconds while the user types: wait for a quiet moment.
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => {
				timer = null;
				rebuildInBackground();
			}, DELAY_MS);
		});
		ctx.watch(
			() => ctx.app.editorStore.activeTabPath,
			() => {
				if (pending) rebuildInBackground();
			},
		);

		// Creating, renaming, moving or deleting a note is not a save: rebuild by hand after those.
		ctx.addAction({
			id: 'rebuild',
			title: `Rebuild ${INDEX}`,
			run: async () => {
				const wrote = await enqueue(() => rebuildIndex(ctx));
				ctx.notify(wrote ? `${INDEX} updated` : `${INDEX} was up to date`);
			},
		});
		ctx.labs.place('rebuild', { palette: true });
	},
};
```

Why it is written this way:

- `ctx.vault.write` runs the full after-save path, so the mod's own write calls `onNoteSaved` again. Two guards break the loop: the callback ignores the index path, and `upsertNote` skips an identical write, so even a missed path check settles after one round.
- The callback receives only the vault-relative path, once per save, with no debounce. The timer coalesces bursts (autosave while typing) and is cleared at unload through `ctx.register`; the queue keeps two rebuilds from racing on `create`.
- The callback filters by folder and extension: `onNoteSaved` also fires for canvases, `.view` files and other files saved in the editor.
- Errors in a save callback never reach the user on their own (the host logs them to the debug log), so the timer path catches, skips when the mod is unloaded, and toasts.
- A background rebuild skips the index note while it is the active tab: `ctx.vault.write` into the clean active note replaces the editor's text and puts the caret back at its old offset (see [Vault files: write](04-vault-files.md#writepath-content)). The rebuild runs once the user switches to another tab. The manual action writes at once: the user asked for it.
- `create`, `rename`, `move`, `delete` and edits made outside the app do not count as saves, so the action covers them. The note list is read from disk with `listFilesDeep`, not the index, so it never lags, and a subfolder that could not be read is named in the note.

> [!TIP]
> When a reaction must write to the note that was just saved, write only when the computed text differs from what is there, and never undo the user's own change; otherwise the user's next save and yours keep replacing each other.

## 16. Settings in mod data, edited through dialogs

Goal: keep the mod's settings in its `data.json`, edit them through a picker of fields, and use them in another action.

Uses: stable `ctx.loadData`, `saveData`, `run.ui.pick`, `prompt`, `alert`, `ctx.vault`, `ctx.workspace`.

```javascript
const DEFAULTS = { version: 2, folder: 'Inbox', datePrefix: true };

const pad2 = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function cleanFolder(text) {
	const segments = text.trim().split('/').map((s) => s.trim()).filter((s) => s !== '');
	if (segments.length === 0 || segments.some((s) => s === '.' || s === '..')) return null;
	return segments.join('/');
}

/** A title as one safe file name without extension; '' when nothing is left (the caller refuses it). Copied from 04 § Note names. */
function safeName(title) {
	const MAX_BYTES = 200;
	const cleaned = String(title)
		.replace(/[\\/:#|^[\]]/g, ' ')
		.replace(/\p{Cc}/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^[.\s]+/, '');
	const encoder = new TextEncoder();
	let name = '';
	let bytes = 0;
	for (const char of cleaned) {
		bytes += encoder.encode(char).length;
		if (bytes > MAX_BYTES) break;
		name += char;
	}
	return name.trim();
}

/** Validates and migrates stored data; throws for anything else, so it is never saved over */
function parseSettings(data) {
	if (data === null) return { ...DEFAULTS };
	if (typeof data !== 'object' || Array.isArray(data)) throw new Error('data.json is not in the expected shape; fix or remove it');
	// Data from a newer copy of the mod: a save would downgrade it.
	if (typeof data.version === 'number' && data.version > DEFAULTS.version) {
		throw new Error(`data.json has version ${data.version}, which this version of the mod cannot read`);
	}
	// Version 1 had only `folder`.
	if (data.version === 1 && typeof data.folder === 'string') return { ...DEFAULTS, folder: data.folder };
	if (data.version === 2 && typeof data.folder === 'string' && typeof data.datePrefix === 'boolean') {
		return { version: 2, folder: data.folder, datePrefix: data.datePrefix };
	}
	throw new Error('data.json is not in the expected shape; fix or remove it');
}

async function loadSettings(ctx) {
	try {
		return parseSettings(await ctx.loadData());
	} catch (err) {
		// Only a corrupt file is safe to replace: the host moved it aside byte for byte.
		if (err?.name !== 'ModDataCorruptError') throw err;
		ctx.notify(`Settings were not valid JSON and were reset; the old file is kept in ${err.corruptPath}`, { kind: 'warning' });
		return { ...DEFAULTS };
	}
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'settings',
			title: 'Settings',
			description: 'Folder and file names for quick notes',
			run: async (_input, run) => {
				const settings = await loadSettings(ctx);
				for (;;) {
					const choice = await run.ui.pick({
						title: 'Quick note settings',
						placeholder: 'Pick a setting, Escape when done',
						items: [
							{ id: 'folder', title: 'Folder', description: settings.folder },
							{ id: 'datePrefix', title: 'Start file names with the date', description: settings.datePrefix ? 'On' : 'Off' },
						],
					});
					if (choice === null) return;
					if (choice.id === 'folder') {
						const typed = await run.ui.prompt({ title: 'Folder for quick notes', message: 'Vault-relative, e.g. Inbox or Notes/Quick', value: settings.folder });
						if (typed === null) continue;
						const folder = cleanFolder(typed);
						if (folder === null) {
							await run.ui.alert({ title: 'Not a folder path', message: typed, kind: 'warning' });
							continue;
						}
						settings.folder = folder;
					} else {
						settings.datePrefix = !settings.datePrefix;
					}
					await ctx.saveData(settings);
				}
			},
		});

		ctx.addAction({
			id: 'quick-note',
			title: 'Quick note',
			input: { placeholder: 'Title' },
			run: async (input, run) => {
				const title = safeName(input);
				if (!title) throw new Error('Type a title with at least one letter or digit');
				const settings = await loadSettings(ctx);
				// The date prefix fits in the 55 bytes safeName leaves free under the 255-byte file name limit.
				const stem = `${settings.folder}/${settings.datePrefix ? `${localDate(new Date())} ` : ''}${title}`;
				let path = `${stem}.md`;
				for (let n = 2; await ctx.vault.exists(path); n++) path = `${stem}-${n}.md`;
				if (run.signal.aborted) return;
				await ctx.vault.create(path, `# ${input.trim()}\n\n`);
				if (run.signal.aborted) return;
				await ctx.workspace.openNote(path);
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Quick notes', icon: 'lucide:sticky-note', actions: ['quick-note', 'settings'] });
	},
};
```

Why it is written this way:

- Settings are read at the start of each action instead of cached at `onload`, so an edit is seen at once and there is no load-order question. `loadData` and `saveData` share one queue per mod, so a load after a save sees the saved value.
- Only `null` means "nothing stored". A corrupt file (`err.name === 'ModDataCorruptError'`) was moved aside by the host, so defaults are safe; any other read failure is rethrown, and the host would refuse `saveData` anyway until a later load succeeds. Valid JSON of an unknown shape throws, because `loadData` does not move it aside and the first save would replace it.
- The stored object carries a `version`, and `parseSettings` is the one place that migrates old shapes forward and refuses a newer one. It is the [Mod data](05-mod-data.md#which-pattern-to-use) pattern folded into one function, which suits a few flat fields; for nested state or several versions, split it into `migrate` and `withDefaults` as there.
- Each change is saved immediately, in call order. `saveData` writes `.kokobrain/mods/<id>/data.json` atomically and outside the index, search, file history and Auto Move, so frequent saves are cheap. It is not a secret store.
- In the picker, the current value is the row's description, and Escape (`null`) ends the loop. A prompt submitted empty resolves `''`, not `null`, which `cleanFolder` turns into the "Not a folder path" alert.
- The file name goes through `safeName` (path and wikilink characters, leading dots, a byte cap), and an empty result is refused with a throw, like any other invalid input. The heading keeps the title as typed.

## 17. Create a typed note from an input action

Goal: type a title, pick one of the vault's note types, and create the note through the app's type folder and template, then open it.

Uses: raw `ctx.app.createTypedNote`, `typeDefinitionsStore`, `openFileInEditor`, `editorStore`; stable `run.ui.pick`.

```javascript
/** A title as one safe file name without extension; '' when nothing is left (the caller refuses it). Copied from 04 § Note names. */
function safeName(title) {
	const MAX_BYTES = 200;
	const cleaned = String(title)
		.replace(/[\\/:#|^[\]]/g, ' ')
		.replace(/\p{Cc}/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^[.\s]+/, '');
	const encoder = new TextEncoder();
	let name = '';
	let bytes = 0;
	for (const char of cleaned) {
		bytes += encoder.encode(char).length;
		if (bytes > MAX_BYTES) break;
		name += char;
	}
	return name.trim();
}

/** buildContent for createTypedNote: adds `_type: <typeName>` when the rendered template lacks a type key. Copied from 09 § createTypedNote. */
function ensureTypeLine(typeName) {
	return (base) => {
		const block = base.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		if (block && block[1].split(/\r?\n/).some((line) => /^_?type\s*:/.test(line))) return base;
		// Also covers an empty "---"/"---" block, which the match above does not see.
		if (/^---\r?\n/.test(base)) return base.replace(/^---(\r?\n)/, (open, eol) => `${open}_type: ${typeName}${eol}`);
		return `---\n_type: ${typeName}\n---\n${base}`;
	};
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'new',
			title: 'New typed note',
			input: { placeholder: 'Title' },
			run: async (input, run) => {
				// createTypedNote does not clean titles: a "/" would become a subfolder, a leading "." a hidden dotfile.
				const title = safeName(input);
				if (!title) throw new Error('Type a title with at least one letter or digit');
				const types = ctx.app.typeDefinitionsStore.sortedTypes;
				if (types.length === 0) throw new Error('This vault has no type definitions');
				const picked = await run.ui.pick({
					title: `Type of "${title}"`,
					items: types.map((t) => ({ id: t.name, title: t.name, description: t.folder ?? 'vault root' })),
				});
				if (picked === null || run.signal.aborted) return;

				const withType = ensureTypeLine(picked.id);
				let path;
				try {
					path = await ctx.app.createTypedNote({
						typeName: picked.id,
						title,
						// Runs on the rendered template; whatever it throws cancels the creation.
						// A template without `_type` would give an untyped note: ensureTypeLine adds it.
						buildContent: (base) => `${withType(base).replace(/\n*$/, '\n')}\n## Next steps\n\n`,
					});
				} catch (err) {
					if (err?.message === 'create-failed') throw new Error(`Could not create "${title}"; the debug log has the cause`);
					throw err;
				}
				if (run.signal.aborted) {
					if (!ctx.signal.aborted) ctx.notify(`${path.split('/').pop()} was created, but the run stopped`, { kind: 'warning' });
					return;
				}
				await ctx.app.openFileInEditor(path);
				// openFileInEditor never rejects: it toasts and resolves when the note cannot be opened.
				if (ctx.app.editorStore.activeTabPath !== path) throw new Error(`Created ${path}, but could not open it`);
			},
		});
		ctx.labs.place('new', { palette: true });
	},
};
```

Why it is written this way:

- `createTypedNote` applies the type's folder and template, dedupes the file name in the target folder (a second "Idea" becomes "Idea 1"), and adds `_organized: false` when Explicit organization is on. It writes `_type` only when the type has no template (or an unreadable one): a template without `_type` would produce an untyped note in the type's folder, which is why `buildContent` runs `ensureTypeLine` first. It resolves to the absolute path it created and does not open the note.
- An empty title (or one that `safeName` empties, such as `...`) is refused with a throw: `createTypedNote` would otherwise create a dotfile (`.md`) that the explorer and the index never show.
- Opening the note is the last step, with no `run.log` or `run.progress` before it, so the run view closes by itself.
- An unknown or wrongly cased type name is not an error: the note lands in the types base folder (the vault root when none is set) with only `_type`. Offering `sortedTypes` (the vault's defined types, by their order) avoids typos; with a fixed name, check `typeDefinitionsStore.getTypeMetadata(name)` first, which matches exactly.
- The failure messages are bare words: `create-failed` (folder or file creation failed, cause in the log) and `no-vault`; the recipe turns the first into text a user can act on.
- `buildContent` receives the rendered template, so the body is appended after it; `contextDate`, the other option, takes a dayjs object, which a plain-JS mod does not have.
- `openFileInEditor` takes an absolute path and never rejects, so the action checks `activeTabPath` afterwards. `ctx.workspace.openNote` is the stable alternative once the path is made vault-relative.

## 18. A live stat of the active note

Goal: a display-only status-bar chip with the number of open tasks in the active note, current while the user types, hidden when there are none.

Uses: stable `ctx.watch`, `ctx.register`; raw `ctx.app.editorStore`; app DOM (`[data-status-bar]`).

```javascript
// App markup (the status bar component), not an API: it can change in any release.
const STATUS_GROUP_SELECTOR = '[data-status-bar] > .status-bar-group:last-child';
const DEBOUNCE_MS = 400;

/**
 * A chip at the start of the right status-bar group, put back when the app
 * rebuilds the bar. A `<button>` when it has a click handler, else a `<span>`
 * (display only). Fill `node` yourself; `show()` mounts it, `hide()` removes it.
 * Copied from 08 § A status-bar chip.
 */
function createStatusChip(onClick) {
	const node = document.createElement(onClick ? 'button' : 'span');
	if (onClick) {
		node.type = 'button';
		node.style.cursor = 'pointer';
		node.addEventListener('click', onClick);
	}
	let observer = null;
	let queued = false;
	const attach = () => {
		queued = false;
		// A frame queued before hide() still runs: without the observer check it would re-add a hidden chip.
		if (observer && !node.isConnected) document.querySelector(STATUS_GROUP_SELECTOR)?.prepend(node);
	};
	// Runs on every DOM change in the app: stay cheap, and attach at most once per frame.
	const onMutation = () => {
		if (queued || node.isConnected) return;
		queued = true;
		requestAnimationFrame(attach);
	};
	return {
		node,
		show() {
			if (!observer) {
				observer = new MutationObserver(onMutation);
				observer.observe(document.body, { childList: true, subtree: true });
			}
			attach();
		},
		hide() {
			observer?.disconnect();
			observer = null;
			// Removed, not display:none: a hidden first child would leave the bar's divider before the next item.
			node.remove();
		},
	};
}

/** Task status by checkbox character, as the app maps it. */
const TASK_STATUS = { ' ': 'todo', x: 'done', X: 'done', '-': 'cancelled', '/': 'in-progress', '?': 'question', '>': 'forwarded', '!': 'important' };
/** A task line as the index reads it: "-", "*", "+" or "1." and one whitespace, [status], one whitespace, text. */
const TASK_LINE = /^(\s*)(?:[-*+]|\d+\.)\s\[([ xX\-/?!>])\]\s(.*)$/s;
/** A fence line: optional spaces or tabs, then three backticks or three tildes. */
const FENCE = /^[ \t]*(`{3}|~{3})/;

/** The tasks of `text` whose status is in `statuses` (default: the Tasks view's open, `[ ]`). Copied from recipe 3. */
function openTasks(text, statuses = ['todo']) {
	const found = [];
	let fence = null;
	text.split('\n').forEach((raw, i) => {
		const line = raw.replace(/\r$/, '');
		const marker = FENCE.exec(line)?.[1];
		if (marker) {
			if (fence === null) fence = marker;
			else if (marker === fence) fence = null;
			return;
		}
		if (fence !== null) return;
		const match = TASK_LINE.exec(line);
		if (!match || match[3].trim() === '') return;
		const status = TASK_STATUS[match[2]];
		if (statuses.includes(status)) found.push({ line: i + 1, status, text: match[3].trim() });
	});
	return found;
}

export default {
	onload(ctx) {
		const chip = createStatusChip(); // no handler: a <span>, it only shows something
		chip.node.style.fontVariantNumeric = 'tabular-nums';
		let timer = null;
		const cancel = () => {
			if (timer !== null) clearTimeout(timer);
			timer = null;
		};
		// The timer, the observer and the node would all outlive the mod.
		ctx.register(() => {
			cancel();
			chip.hide();
		});

		const render = () => {
			timer = null;
			if (ctx.signal.aborted) return;
			const tab = ctx.app.editorStore.activeTab;
			if (!tab || !/\.(md|markdown)$/i.test(tab.path)) return chip.hide();
			const count = openTasks(tab.content).length;
			if (count === 0) return chip.hide();
			chip.node.textContent = `${count} open task${count === 1 ? '' : 's'}`;
			chip.node.title = 'Open tasks ([ ]) in this note';
			chip.show();
		};

		render();
		// A tab switch shows the new note's count at once.
		ctx.watch(() => ctx.app.editorStore.activeTabPath, () => {
			cancel();
			render();
		});
		// Typing changes the text on every keystroke: count once the user pauses.
		ctx.watch(() => ctx.app.editorStore.activeTabContent, () => {
			cancel();
			timer = setTimeout(render, DEBOUNCE_MS);
		});
	},
};
```

Why it is written this way:

- `activeTabContent` is the active tab's text, unsaved edits included, and it changes with every keystroke and with every change that reaches the open tab without the user: a reload from disk after an outside edit, a link rewrite after a rename. `ctx.onNoteSaved` would miss those, and would lag typing by the autosave delay.
- The watch callback only re-arms a timer; the count runs once the user pauses for 400 ms. A watch callback runs on the main thread with the editor, so work per keystroke must stay tiny (see [Events and reactivity](07-events-and-reactivity.md#debouncing-and-performance-on-the-main-thread)).
- The read returns a string, which `ctx.watch` compares by value: no callback when the text did not change.
- The chip is a `<span>` (no handler): a button that does nothing is a trap for keyboard and screen reader users. Do not show a second word count: the right group already holds the app's own, and a count with another definition would disagree with it. Show something the bar does not.
- `openTasks` counts what the Tasks view treats as open (`[ ]`); pass more statuses, such as `['todo', 'in-progress']`, for a wider count.

## 19. Copy to the clipboard

Goal: copy a wikilink to the clicked or active note, from the note menu and the palette, with a fallback when the clipboard refuses.

Uses: the web view's `navigator.clipboard`; raw `ctx.app.editorStore`, `vaultStore`; stable `run.ui`, `run.target`; unstable `ctx.labs.place`.

```javascript
/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first. Copied from 04 § Absolute paths.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** [[Name]] for a vault-relative note path. Copied from 04 § Writing a wikilink. */
const wikilink = (path) => `[[${path.split('/').pop().replace(/\.(md|markdown)$/i, '')}]]`;

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'copy-link',
			title: 'Copy link to note',
			run: async (_input, run) => {
				let path;
				if (run.target) {
					if (run.target.on !== 'note' || !/\.md$/i.test(run.target.path)) throw new Error('Choose a Markdown note');
					path = run.target.path;
				} else {
					const tab = ctx.app.editorStore.activeTab;
					// Virtual tabs (Tasks, Graph) have no file in the vault.
					if (!tab || !tab.path.startsWith(`${ctx.app.vaultStore.path}/`) || !/\.md$/i.test(tab.path)) {
						throw new Error('Open a note first');
					}
					path = toVaultPath(ctx, tab.path);
				}
				const link = wikilink(path);
				try {
					// First await of the run: the clipboard wants the click or key press to be recent.
					await navigator.clipboard.writeText(link);
				} catch {
					if (run.signal.aborted) return;
					// Refused: show the text so the user can copy it by hand.
					await run.ui.prompt({ title: 'Copy this link', message: 'The clipboard refused the write. Select the text and press Cmd+C.', value: link });
					return;
				}
				ctx.notify(`Copied ${link}`, { kind: 'success' });
			},
		});
		ctx.labs.place('copy-link', { palette: true, menu: { on: ['note'] } });
	},
};
```

Why it is written this way:

- `navigator.clipboard.writeText` is what the app itself uses, from clicks, menu items and shortcuts. A browser may refuse it without a recent user gesture or while the window is not focused. Whether a run started from a menu, the palette or the rail still counts as one is not verified, so the write comes before anything else that waits, and a refusal falls back to a prompt holding the text.
- Reading the clipboard (`readText`) is not verified in the web view; to take text from the user, ask them to paste into `run.ui.prompt`.
- The link is `[[Name]]`, the app's own style (see [Vault files: Writing a wikilink](04-vault-files.md#writing-a-wikilink)). When two notes may share the name, copy `[[Folder/Name.md|Name]]` instead, the only form that pins one file.
- The run writes no `run.log`: a toast is enough, and the run view closes by itself.

## 20. Stamp a property on save, safely

Goal: keep an `updated` date in the frontmatter of every note in `Projects`, set when the note is saved, without a save loop and without moving the user's caret.

Uses: stable `ctx.onNoteSaved`, `ctx.watch`; raw `ctx.app.updateNoteFrontmatter`, `editorStore`, `vaultStore`.

```javascript
const FOLDER = 'Projects/';

/** Thrown by the mutate when there is nothing to change, so nothing is written */
const UNCHANGED = new Error('unchanged');

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/** Today in local time, YYYY-MM-DD */
const today = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default {
	onload(ctx) {
		/** Notes being stamped now: two quick saves of one note must not write at once */
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
					// The loop guard: the save this write fires finds the date already set.
					// Returning `props` would still rewrite YAML that is not in canonical form: throw instead.
					if (current && String(current.value) === date) throw UNCHANGED;
					return [...props.filter((p) => p.key !== 'updated'), { key: 'updated', value: date, type: 'date' }];
				});
			} catch (err) {
				// Unparseable, nested or commented frontmatter is left alone; a failed save was already toasted.
				if (err !== UNCHANGED && !ctx.signal.aborted && err?.reason !== 'save-failed') {
					ctx.log(`could not stamp ${path}:`, errorMessage(err));
				}
			} finally {
				busy.delete(path);
			}
		};

		ctx.onNoteSaved(async (path) => {
			if (!path.startsWith(FOLDER) || !path.toLowerCase().endsWith('.md')) return;
			// The note the user is typing in: a frontmatter write would move their caret.
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

Why it is written this way:

- **The value comparison ends the loop.** `updateNoteFrontmatter` fires `ctx.onNoteSaved` again when it writes; that second call finds today's date already set and throws `UNCHANGED`, so nothing is written. The `busy` set is not a loop guard (the save callback runs from a timer the app schedules, after `finally` cleared the path); it only keeps two overlapping stamps of one note apart. See [Events: Avoiding save loops](07-events-and-reactivity.md#avoiding-save-loops).
- `String(current.value)` compares a date read back from YAML (`'2026-11-09'`, type `date`) and a hand-typed value the same way.
- **The active note is skipped and stamped once the user switches away.** On the active tab, `updateNoteFrontmatter` puts the caret back at its old character offset, so the new line above it would shift the next keystroke, often into the `---` block (see [Raw app: Known problems](09-raw-app.md#known-problems-caret-and-empty-block)). A note stamped in a **background** tab gets its old caret offset back when the user returns, a few characters off; only the active one is under the user's fingers.
- `stamp` catches everything, so `void stamp(path)` cannot leave an unhandled rejection. Lossy frontmatter (comments, nested values, anchors) is refused by the app with nothing written, and logged here.
- The first stamp rewrites the note's frontmatter in the app's canonical form (`[a, b]` lists, `_type:`, needless quotes dropped, `\n` line breaks). Tell the user, since it changes more than the `updated` line.
- A note renamed or moved while pending is stamped at its old path, which fails quietly in the log.

## See also

- [Vault Mods](../28-mods.md#recipes) for the user guide and its shorter recipes
- [Actions and entry points](02-actions-and-entry-points.md), [Runs](03-runs.md), [Dialogs](06-dialogs.md)
- [Mod data](05-mod-data.md), [Events and reactivity](07-events-and-reactivity.md), [Querying the index](10-querying-the-index.md)
- [Errors and debugging](15-errors-and-debugging.md), [Pitfalls checklist](16-pitfalls-checklist.md)
