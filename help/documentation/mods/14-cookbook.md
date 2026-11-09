# Mods Cookbook

Proven recipes for vault mods. Each one is a complete `main.js`: paste it into `<vault>/_system/mods/<id>/main.js` next to a `manifest.json` whose `id` equals the folder name (for example `{ "id": "daily-log", "name": "Daily log", "version": "0.1.0" }`), and the app loads it on save. The techniques come from mods in daily use; every API they call was checked against the host.

Each recipe gives the goal, the stability of what it uses, the code, and the reasons it is written that way. Read [Anatomy and loading](01-anatomy-and-loading.md) for the loader rules and [Runs](03-runs.md) for Stop and run views if a recipe surprises you.

> [!NOTE]
> Every recipe repeats the helpers it needs, so each snippet works alone. When you combine recipes in one mod, keep one copy of each helper: two `const` declarations with the same name make the whole file fail to load.

## Conventions used by every recipe

- **Paths.** `ctx.vault`, `ctx.workspace`, `ctx.onNoteSaved` and `run.target` use vault-relative paths (`Projects/Plan.md`). `ctx.app.*` and every `ctx.kb()` path are absolute. Convert with `` `${ctx.app.vaultStore.path}/${relative}` `` one way and the `toVaultPath` helper the other way. See [Vault files](04-vault-files.md).
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

## 1. Append a timestamped line to the daily note

Goal: an input action that appends `- HH:mm <text>` to today's daily note, creating the note from its template when missing.

Uses: raw `ctx.app.dailyNotePath`, `openOrCreateDailyNote`, `editorStore`; stable `ctx.vault`; unstable `ctx.labs.place`.

```javascript
const pad2 = (n) => String(n).padStart(2, '0');
/** HH:mm in local time */
const localTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** An absolute app path as the vault-relative path ctx.vault takes */
function toVaultPath(root, absolute) {
	const prefix = `${root}/`;
	if (!absolute.startsWith(prefix)) throw new Error(`"${absolute}" is outside the vault`);
	// A folder setting with an edge slash leaves "//" in app paths, which ctx.vault rejects.
	return absolute.slice(prefix.length).replace(/\/{2,}/g, '/').replace(/^\//, '');
}

/** The one range that turns `before` into `after` */
function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

/**
 * Edits a note that may be open. When the editor shows exactly this note, one minimal change goes
 * through CodeMirror (unsaved edits, caret and undo survive; autosave writes it). Otherwise the file
 * is read and written, which rejects when a background tab has unsaved edits. `edit` runs once.
 */
async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const same = (a, b) => a.replace(/\/{2,}/g, '/') === b.replace(/\/{2,}/g, '/');
	if (tab && same(tab.path, absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		// Right after a tab switch the view can still hold the previous note.
		if (text === tab.content) {
			const next = edit(text);
			if (next !== text) view.dispatch({ changes: changedRange(text, next) });
			return;
		}
	}
	const path = toVaultPath(ctx.app.vaultStore.path, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => same(t.path, absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
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
				// Enter on an empty field runs the action with ''.
				if (!text) return;
				const now = new Date();
				const today = ctx.app.dailyNotePath(now);
				if (!(await ctx.vault.exists(toVaultPath(ctx.app.vaultStore.path, today)))) {
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
- The `text === tab.content` check matters right after `openOrCreateDailyNote`: the new tab is active, but the editor may still show the previous note for a frame. The edit then goes to disk, and the clean tab picks up the new text.
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

function toVaultPath(root, absolute) {
	const prefix = `${root}/`;
	if (!absolute.startsWith(prefix)) throw new Error(`"${absolute}" is outside the vault`);
	return absolute.slice(prefix.length).replace(/\/{2,}/g, '/').replace(/^\//, '');
}

function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const same = (a, b) => a.replace(/\/{2,}/g, '/') === b.replace(/\/{2,}/g, '/');
	if (tab && same(tab.path, absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		if (text === tab.content) {
			const next = edit(text);
			if (next !== text) view.dispatch({ changes: changedRange(text, next) });
			return;
		}
	}
	const path = toVaultPath(ctx.app.vaultStore.path, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => same(t.path, absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
}

function appendLines(text, lines) {
	if (lines.length === 0) return text;
	return `${text}${text === '' || text.endsWith('\n') ? '' : '\n'}${lines.join('\n')}\n`;
}

/** An open task: "- [ ] text" or "- [/] text" (in progress), any indentation, "-", "*" or "+" */
const OPEN_TASK = /^(\s*)([-*+]) \[([ /])\] (.*\S)\s*$/;
/** How a carried task reads in today's note: top level and not started */
const todayForm = (match) => `- [ ] ${match[4]}`;

/** Today's form of every open task in `text`, each once */
function openTasks(text) {
	const found = [];
	for (const line of text.split('\n')) {
		const match = OPEN_TASK.exec(line);
		if (match && !found.includes(todayForm(match))) found.push(todayForm(match));
	}
	return found;
}

/** `text` with the tasks whose today form is in `carried` marked [>] forwarded */
function markForwarded(text, carried) {
	const wanted = new Set(carried);
	return text
		.split('\n')
		.map((line) => {
			const match = OPEN_TASK.exec(line);
			return match && wanted.has(todayForm(match)) ? line.replace(/\[[ /]\]/, '[>]') : line;
		})
		.join('\n');
}

/** Whether an open tab holds unsaved edits of the note at a vault-relative path */
function hasUnsavedTab(ctx, vaultPath) {
	const root = ctx.app.vaultStore.path;
	return ctx.app.editorStore.tabs.some((tab) =>
		tab.path.startsWith(`${root}/`) && toVaultPath(root, tab.path) === vaultPath && tab.content !== tab.savedContent);
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'carry',
			title: "Carry over yesterday's open tasks",
			description: 'Copies them to today, then marks them [>] in yesterday',
			run: async (_input, run) => {
				const now = new Date();
				const root = ctx.app.vaultStore.path;
				const yesterday = ctx.app.dailyNotePath(addDays(now, -1));
				const today = ctx.app.dailyNotePath(now);
				const yesterdayPath = toVaultPath(root, yesterday);
				if (!(await ctx.vault.exists(yesterdayPath))) throw new Error('There is no daily note for yesterday');
				// Before any write: the write to yesterday would refuse these edits only after today changed.
				if (hasUnsavedTab(ctx, yesterdayPath)) throw new Error("Yesterday's note has unsaved changes; save it and run again");
				const open = openTasks(await ctx.vault.read(yesterdayPath));
				if (open.length === 0) {
					ctx.notify('No open tasks yesterday');
					return;
				}
				if (run.signal.aborted) return;

				if (!(await ctx.vault.exists(toVaultPath(root, today)))) await ctx.app.openOrCreateDailyNote();
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
- `todayForm` normalizes indentation and `[/]` so the same task is recognized in both notes; `markForwarded` only marks lines whose today form was carried, so a task added to yesterday during the run stays open.
- Open tasks are parsed from the file text, not from `ctx.kb()`: the index lags behind recent edits and reports `[/]` and `[>]` as completed.
- After Stop, the warning toast says exactly what was done and what was not, and it is skipped when the mod itself was unloaded (every `ctx` call then throws).

## 4. Insert a line under a heading

Goal: add a line at the end of the `## Ideas` section of the clicked or active note, creating the section when it is missing.

Uses: raw `ctx.app.editorStore`, `vaultStore`; stable `ctx.vault`, `run.target`; unstable `ctx.labs.place`.

```javascript
const HEADING = '## Ideas';
const HEADING_LINE = /^##\s+Ideas\s*$/;

function toVaultPath(root, absolute) {
	const prefix = `${root}/`;
	if (!absolute.startsWith(prefix)) throw new Error(`"${absolute}" is outside the vault`);
	return absolute.slice(prefix.length).replace(/\/{2,}/g, '/').replace(/^\//, '');
}

function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const same = (a, b) => a.replace(/\/{2,}/g, '/') === b.replace(/\/{2,}/g, '/');
	if (tab && same(tab.path, absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		if (text === tab.content) {
			const next = edit(text);
			if (next !== text) view.dispatch({ changes: changedRange(text, next) });
			return;
		}
	}
	const path = toVaultPath(ctx.app.vaultStore.path, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => same(t.path, absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
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
				if (!text) return;
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

/** Applies a pure `mutate` and tells the user what happened */
async function updateNote(ctx, run, absolutePath, mutate, doneText) {
	let changed = true;
	try {
		await ctx.app.updateNoteFrontmatter(absolutePath, (props) => {
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

function toVaultPath(root, absolute) {
	const prefix = `${root}/`;
	if (!absolute.startsWith(prefix)) throw new Error(`"${absolute}" is outside the vault`);
	return absolute.slice(prefix.length).replace(/\/{2,}/g, '/').replace(/^\//, '');
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

/** Whether `target` can sit between [[ and ]] as one link to itself */
function isSafeWikilinkTarget(target) {
	return !/[[\]|#\\<>\u0000-\u001f\u2028\u2029]/.test(target) && target.trim() === target;
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
				const root = ctx.app.vaultStore.path;
				const kb = await ctx.kb();
				if (run.signal.aborted) return;
				const items = kb.pages(`"${CANDIDATES}"`)
					.where((p) => !p.archived && p.file.path !== note)
					.sort((p) => p.file.path)
					.array()
					.map((p) => {
						const path = toVaultPath(root, p.file.path);
						return { id: path, title: p.file.basename, description: path, path, name: p.file.basename };
					});
				if (items.length === 0) throw new Error(`No indexed notes in ${CANDIDATES}`);
				const picked = await run.ui.pick({ title: `Relate ${note.split('/').pop()} to`, items });
				if (picked === null || run.signal.aborted) return;
				if (!isSafeWikilinkTarget(picked.path) || !isSafeWikilinkTarget(picked.name)) {
					throw new Error(`"${picked.path}" has characters a wikilink cannot hold; rename it first`);
				}
				const link = `[[${picked.path}|${picked.name}]]`;

				let changed = true;
				try {
					await ctx.app.updateNoteFrontmatter(note, (props) => {
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
- `isSafeWikilinkTarget` refuses `[`, `]`, `|`, `#`, `\`, `<`, `>`, control characters and edge spaces: the app reads `#` as a heading anchor and `|` as an alias, so such a name would link somewhere else or nowhere.
- The link carries the full vault path with `.md`, which the app resolves to that exact file; a bare `[[Name]]` goes to whichever same-name note the index lists first.
- `addLink` is additive and keeps any existing links, turns a scalar into a list, and returns the same array when the target is already linked; the mutate then throws `UNCHANGED`, so nothing is written (returning the same list would still reformat the YAML, see recipe 5) and the user is told.
- The index query is scoped to one folder and excludes archived notes and the note itself. `kb.pages()` includes archived notes unless you filter `p.archived`.

> [!NOTE]
> A root-level target (no folder in its path) can still be ambiguous when another folder has a file with the same name; telling for sure needs the whole index. The duplicate check by last segment can also treat two different same-name notes as one, which errs toward not adding a link. Both are limits of this recipe, not of the app.

## 7. Pick a note from the index and a folder with manual entry

Goal: pick a folder (listed under a cancellable loading dialog, with an "Enter a folder path" row), then pick one of its notes from the index, newest first, and open it.

Uses: stable `ctx.vault.list`, `ctx.workspace.openNote`, `run.ui.loading`, `pick`, `prompt`; raw `ctx.kb()`, `vaultStore`.

```javascript
/** Folders never offered: mods, templates and type definitions live here */
const SKIP = new Set(['_system']);
const LIST_CHUNK = 32;

function toVaultPath(root, absolute) {
	const prefix = `${root}/`;
	if (!absolute.startsWith(prefix)) throw new Error(`"${absolute}" is outside the vault`);
	return absolute.slice(prefix.length).replace(/\/{2,}/g, '/').replace(/^\//, '');
}

/** A typed folder path made vault-relative; null when it is empty or names "." or ".." */
function cleanFolder(text) {
	const segments = text.trim().split('/').map((s) => s.trim()).filter((s) => s !== '');
	if (segments.length === 0 || segments.some((s) => s === '.' || s === '..')) return null;
	return segments.join('/');
}

/** Every folder below the vault root, breadth first; null once `signal` aborts */
async function listFolders(ctx, signal) {
	const found = [];
	let level = [''];
	while (level.length > 0) {
		const next = [];
		// Chunks keep a level with thousands of folders from flooding the IPC bridge and delaying Cancel.
		for (let i = 0; i < level.length; i += LIST_CHUNK) {
			if (signal.aborted) return null;
			const lists = await Promise.all(level.slice(i, i + LIST_CHUNK).map((folder) => ctx.vault.list(folder)));
			for (const entry of lists.flat()) {
				if (entry.isFolder && !SKIP.has(entry.path)) next.push(entry.path);
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
				const root = ctx.app.vaultStore.path;
				const kb = await ctx.kb();
				const items = kb.pages(`"${folder}"`)
					.sort((p) => p.file.mtime, 'desc')
					.array()
					.map((p) => {
						const path = toVaultPath(root, p.file.path);
						return { id: path, title: p.file.basename, description: p.archived ? `${path} (archived)` : path, path };
					});
				if (items.length === 0) throw new Error(`No indexed notes in ${folder}`);
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
- `ctx.vault.list` returns direct children only, unsorted, without dot entries; the walk sorts at the end. `list('')` is the only way to list the root, and it includes `_system`.
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

function toVaultPath(root, absolute) {
	const prefix = `${root}/`;
	if (!absolute.startsWith(prefix)) throw new Error(`"${absolute}" is outside the vault`);
	return absolute.slice(prefix.length).replace(/\/{2,}/g, '/').replace(/^\//, '');
}

function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const same = (a, b) => a.replace(/\/{2,}/g, '/') === b.replace(/\/{2,}/g, '/');
	if (tab && same(tab.path, absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		if (text === tab.content) {
			const next = edit(text);
			if (next !== text) view.dispatch({ changes: changedRange(text, next) });
			return;
		}
	}
	const path = toVaultPath(ctx.app.vaultStore.path, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => same(t.path, absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
}

function isSafeWikilinkTarget(target) {
	return !/[[\]|#\\<>\u0000-\u001f\u2028\u2029]/.test(target) && target.trim() === target;
}

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

function renderBlock(markers, pages, root) {
	const lines = [markers.start, `## Changed in the last ${DAYS} days`, ''];
	if (pages.length === 0) lines.push('Nothing changed.');
	for (const page of pages) {
		const path = toVaultPath(root, page.file.path);
		const name = page.file.basename;
		lines.push(isSafeWikilinkTarget(path) && isSafeWikilinkTarget(name)
			? `- [[${path}|${name}]]`
			: `- ${path.replace(/[\\[\]<>#|]/g, '\\$&')} (not linked: unsafe name)`);
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
					.where((p) => !p.archived && p.file.mtime >= since)
					.sort((p) => p.file.mtime, 'desc')
					.limit(LIMIT)
					.array();
				const markers = ownedMarkers(ctx.mod.id, `v1 ${SOURCE}`);
				const block = renderBlock(markers, pages, ctx.app.vaultStore.path);
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
- The tasks, tags and links come from the index snapshot, which can lag a few seconds behind the last saves. Links use the vault path with `.md` so they resolve to the exact file.

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

/** Every Markdown file under `folder`, sorted; stops early when `signal` aborts */
async function markdownFiles(ctx, folder, signal) {
	const found = [];
	const queue = [folder];
	while (queue.length > 0 && !signal.aborted) {
		for (const entry of await ctx.vault.list(queue.shift())) {
			if (entry.isFolder) queue.push(entry.path);
			else if (/\.(md|markdown)$/i.test(entry.name)) found.push(entry.path);
		}
	}
	return found.sort((a, b) => a.localeCompare(b));
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
				const notes = await markdownFiles(ctx, folder, run.signal);
				if (run.signal.aborted) return;
				if (notes.length === 0) {
					await run.ui.alert({ title: `No notes in ${folder}`, kind: 'warning' });
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
						await ctx.app.updateNoteFrontmatter(`${root}/${path}`, (props) => {
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

- The files are collected from disk with `ctx.vault.list`, not from the index, so a note created a second ago is included. `run.target.path` is `''` for the vault root, and the action refuses it.
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
- Renaming a Markdown note whose name changes rewrites the wikilinks in other notes that point to it (and flushes unsaved edits of those notes to disk), so links keep working. A pure move keeps the name and rewrites nothing: bare `[[Name]]` links still resolve, and so do links written with the old folder path (`[[Old/Folder/Name]]`), because the resolver falls back to the note name when no file sits at that path. They keep pointing at the note as long as its name is unique in the vault.
- Rename then move is two steps: when the move fails, the note stays renamed in the source folder, and the run log says so.
- `ctx.vault.list` returns direct children only, unsorted; the recipe sorts by name so progress is predictable. Open tabs follow the moved files.
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

		/** `code` is the physical key, so the chord works with every keyboard layout */
		const CHORDS = [
			{ code: 'KeyJ', label: 'Cmd+Shift+J', command: `mod:${ctx.mod.id}:action:today` },
			// An action of another mod: the command id is mod:<mod id>:action:<action id>.
			{ code: 'KeyY', label: 'Cmd+Shift+Y', command: 'mod:hello:action:say-hello' },
		];

		const onKeyDown = (e) => {
			// Only Cmd+Shift: Cmd+Option and Ctrl combinations stay the app's.
			if (e.defaultPrevented || !e.metaKey || !e.shiftKey || e.altKey || e.ctrlKey) return;
			const chord = CHORDS.find((c) => c.code === e.code);
			if (!chord) return;
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
		window.addEventListener('keydown', onKeyDown);
		ctx.register(() => window.removeEventListener('keydown', onKeyDown));
	},
};
```

Why it is written this way:

- Going through the `modCommandsStore` row (instead of calling a function directly) gives the shortcut the same run as the palette: a run view on output, Stop, the error toast, and the one-live-run rule. `row.run()` returns nothing and cannot pass input; an action with `input` opens its text field.
- Rows are looked up at keypress time because `list` returns fresh objects on every read and a reloaded mod has new callbacks; a stale row throws `Mod "<id>" is unloaded`.
- The listener is removed through `ctx.register`; the host does not track DOM listeners, so without it the old listener would keep firing after a reload.
- A shortcut runs outside any action, so its errors are caught and toasted here; the host never sees them. Cmd+Shift+J and Cmd+Shift+Y are not used by the app's global shortcuts today, but the mod does no conflict detection.

> [!NOTE]
> `modCommandsStore` is raw access. The shortcut works only while the app window has focus. Inside an action that needs a dialog, use `run.ui`; a shortcut handler that asks the user something uses `ctx.ui`.

## 12. Status bar chip for the active note

Goal: a chip in the status bar that shows the active note's name and whether it has unsaved edits, updates through `ctx.watch`, and copies the note's path when clicked.

Uses: raw `ctx.app.editorStore`, `vaultStore`; app DOM (`.status-bar-group`); stable `ctx.watch`, `ctx.register`.

```javascript
// The app's markup (StatusBar.svelte), not an API: it can change with any app release.
const STATUS_BAR_GROUP = '.status-bar-group';

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/** A chip prepended to the last status bar group, put back whenever the app re-renders the bar */
function createChip(onClick) {
	const chip = document.createElement('button');
	chip.type = 'button';
	chip.style.cssText = 'cursor: pointer; font-variant-numeric: tabular-nums;';
	chip.addEventListener('click', onClick);
	let observer = null;
	const attach = () => {
		if (chip.isConnected) return;
		const groups = document.querySelectorAll(STATUS_BAR_GROUP);
		// No bar yet (or the markup changed): the observer tries again on the next DOM change.
		groups[groups.length - 1]?.prepend(chip);
	};
	const hide = () => {
		observer?.disconnect();
		observer = null;
		// Removed, not display:none: a hidden first child makes the bar draw a divider before the next item.
		chip.remove();
	};
	return {
		show(text, title) {
			if (!observer) {
				observer = new MutationObserver(attach);
				observer.observe(document.body, { childList: true, subtree: true });
			}
			chip.textContent = text;
			chip.title = title;
			attach();
		},
		hide,
		dispose() {
			hide();
			chip.removeEventListener('click', onClick);
		},
	};
}

export default {
	onload(ctx) {
		let current = '';
		const chip = createChip(() => {
			const root = ctx.app.vaultStore.path;
			const relative = current.startsWith(`${root}/`) ? current.slice(root.length + 1) : current;
			navigator.clipboard.writeText(relative).then(
				() => ctx.notify(`Copied ${relative}`),
				(err) => ctx.notify(`Could not copy: ${errorMessage(err)}`, { kind: 'warning' }),
			);
		});
		ctx.register(() => chip.dispose());

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
			chip.show(state === 'unsaved' ? `${name} (unsaved)` : name, 'Click to copy the vault path');
		};

		// watch does not call back at subscription: render the starting state once.
		render(read());
		ctx.watch(read, render);
	},
};
```

Why it is written this way:

- `read` returns a primitive string: `ctx.watch` compares with `Object.is`, so returning a tab object or a fresh array would count as a change on every run. Reading `tab.content` re-runs `read` on every keystroke, so it does one comparison and nothing else; a chip that only needs the name would read `activeTabPath`.
- The selector lives in one constant with a comment saying what it depends on, and `attach` does nothing when the bar is missing: a markup change makes the chip disappear instead of throwing.
- The `MutationObserver` puts the chip back when the app re-renders the status bar; it runs only while the chip is shown, and `attach` is a cheap `isConnected` check because the observer fires on every DOM change, typing included.
- One `ctx.register` disposer removes the node, the observer and the click listener; the watch's own disposer is removed by the host at unload.
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
			if (live()) ctx.notify(`Focus block done${done.topic ? `: ${done.topic}` : ''}`, { kind: 'success' });
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
- To show the countdown, drive the chip from recipe 12 with a `render()` call in the interval.

## 14. Fetch from an allowed host

Goal: search the public Hugging Face model API, write the top results to `Research/HF <query>.md`, and open it, with progress, Stop and clear error text.

Uses: stable `ctx.vault`, `ctx.workspace`, `run.*`; the web view's `fetch`.

```javascript
const FOLDER = 'Research';
const LIMIT = 20;
const STEPS = 3;

function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

const pad2 = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** A file name from user text: no path, link or tag characters, at most 80 code points */
function safeName(text) {
	const name = text.replace(/[\\/:*?"<>|#^[\]]/g, '-').replace(/\s+/g, ' ').trim();
	// By code points: a cut inside an emoji would leave a lone surrogate in the path.
	return [...name].slice(0, 80).join('').trim();
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
				if (!query) return;
				const name = safeName(query);
				if (!name) throw new Error('Type a query with letters or digits');
				const path = `${FOLDER}/HF ${name}.md`;
				const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${LIMIT}`;

				run.progress(0, STEPS, 'Calling huggingface.co');
				let res;
				try {
					// Stop aborts the request.
					res = await fetch(url, { signal: run.signal });
				} catch (err) {
					if (run.signal.aborted) return;
					throw new Error(`Could not reach huggingface.co: ${errorMessage(err)}`);
				}
				if (!res.ok) throw new Error(`huggingface.co answered ${res.status}`);
				const models = parseModels(await res.text());
				if (run.signal.aborted) return;
				run.log(`${models.length} model(s) found`);

				run.progress(1, STEPS, 'Writing the note');
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

				run.progress(2, STEPS, 'Opening it');
				await ctx.workspace.openNote(path);
				run.progress(3, STEPS, 'Done');
			},
		});
		ctx.labs.place('search', { palette: true });
	},
};
```

Why it is written this way:

- The web view's CSP decides which hosts `fetch` reaches: `https://huggingface.co`, `https://github.com`, `https://objects.githubusercontent.com` and `https://api.todoist.com` (plus Sentry ingest hosts). Any other host, including `api.github.com` and `raw.githubusercontent.com`, fails with a generic network `TypeError`, and a mod cannot change the CSP. See [Network and platform](11-network-and-platform.md).
- `fetch(url, { signal: run.signal })` makes Stop cancel the request. A rejection after Stop is returned from quietly; any other rejection becomes a message that names the host, since WebKit's own text ("Load failed") says nothing.
- `res.ok` is checked first (the API reports bad parameters as a 4xx), then the body is parsed as text inside a `try`, and every field is read defensively.
- User text never becomes a path segment, a link or a tag: `safeName` strips path and wikilink characters, and the query in frontmatter is JSON-quoted with `[[` escaped, because the index finds wikilinks everywhere, frontmatter included.
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

function isSafeWikilinkTarget(target) {
	return !/[[\]|#\\<>\u0000-\u001f\u2028\u2029]/.test(target) && target.trim() === target;
}

/** Creates or overwrites a generated note; skips an identical write. Resolves whether it wrote. */
async function upsertNote(ctx, path, text) {
	if (!(await ctx.vault.exists(path))) await ctx.vault.create(path, text);
	else if ((await ctx.vault.read(path)) !== text) await ctx.vault.write(path, text);
	else return false;
	return true;
}

async function markdownFiles(ctx, folder, signal) {
	const found = [];
	const queue = [folder];
	while (queue.length > 0 && !signal.aborted) {
		for (const entry of await ctx.vault.list(queue.shift())) {
			if (entry.isFolder) queue.push(entry.path);
			else if (/\.(md|markdown)$/i.test(entry.name)) found.push(entry.path);
		}
	}
	return found.sort((a, b) => a.localeCompare(b));
}

async function rebuildIndex(ctx) {
	const notes = (await markdownFiles(ctx, WATCHED, ctx.signal)).filter((path) => path !== INDEX);
	if (ctx.signal.aborted) return false;
	const lines = notes.map((path) => {
		const name = path.split('/').pop().replace(/\.(md|markdown)$/i, '');
		return isSafeWikilinkTarget(path) && isSafeWikilinkTarget(name) ? `- [[${path}|${name}]]` : `- ${name} (not linked: unsafe name)`;
	});
	const text = `# ${WATCHED}\n\nGenerated by the ${ctx.mod.name} mod: edits here are replaced.\n\n${lines.join('\n')}\n`;
	return upsertNote(ctx, INDEX, text);
}

export default {
	onload(ctx) {
		// One rebuild at a time: two overlapping ones could both try to create the index.
		let queue = Promise.resolve();
		const enqueue = (task) => {
			const result = queue.then(task);
			queue = result.catch(() => {});
			return result;
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
				enqueue(() => rebuildIndex(ctx)).catch((err) => {
					if (ctx.signal.aborted) return;
					ctx.log('index rebuild failed:', errorMessage(err));
					ctx.notify(`Could not update ${INDEX}: ${errorMessage(err)}`, { kind: 'warning' });
				});
			}, DELAY_MS);
		});

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
- `create`, `rename`, `move`, `delete` and edits made outside the app do not count as saves, so the action covers them. The note list is read from disk, not the index, so it never lags.

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

/** Validates and migrates stored data; throws for anything else, so it is never saved over */
function parseSettings(data) {
	if (data === null) return { ...DEFAULTS };
	if (typeof data !== 'object' || Array.isArray(data)) throw new Error('data.json is not in the expected shape; fix or remove it');
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
				const title = input.trim().replace(/[\\/:]/g, '-');
				if (!title) return;
				const settings = await loadSettings(ctx);
				const stem = `${settings.folder}/${settings.datePrefix ? `${localDate(new Date())} ` : ''}${title}`;
				let path = `${stem}.md`;
				for (let n = 2; await ctx.vault.exists(path); n++) path = `${stem}-${n}.md`;
				if (run.signal.aborted) return;
				await ctx.vault.create(path, `# ${title}\n\n`);
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
- The stored object carries a `version`, and `parseSettings` is the one place that migrates old shapes forward.
- Each change is saved immediately, in call order. `saveData` writes `.kokobrain/mods/<id>/data.json` atomically and outside the index, search, file history and Auto Move, so frequent saves are cheap. It is not a secret store.
- In the picker, the current value is the row's description, and Escape (`null`) ends the loop. A prompt submitted empty resolves `''`, not `null`, which `cleanFolder` turns into the "Not a folder path" alert.

## 17. Create a typed note from an input action

Goal: type a title, pick one of the vault's note types, and create the note through the app's type folder and template, then open it.

Uses: raw `ctx.app.createTypedNote`, `typeDefinitionsStore`, `openFileInEditor`, `editorStore`; stable `run.ui.pick`.

```javascript
export default {
	onload(ctx) {
		ctx.addAction({
			id: 'new',
			title: 'New typed note',
			input: { placeholder: 'Title' },
			run: async (input, run) => {
				// createTypedNote does not clean titles: a "/" would become a subfolder.
				const title = input.trim().replace(/[\\/:]/g, '-');
				if (!title) return;
				const types = ctx.app.typeDefinitionsStore.sortedTypes;
				if (types.length === 0) throw new Error('This vault has no type definitions');
				const picked = await run.ui.pick({
					title: `Type of "${title}"`,
					items: types.map((t) => ({ id: t.name, title: t.name, description: t.folder ?? 'vault root' })),
				});
				if (picked === null || run.signal.aborted) return;

				let path;
				try {
					path = await ctx.app.createTypedNote({
						typeName: picked.id,
						title,
						// Runs on the rendered template; whatever it throws cancels the creation.
						buildContent: (base) => `${base.replace(/\n*$/, '\n')}\n## Next steps\n\n- [ ] \n`,
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

- `createTypedNote` applies the type's folder and template, writes `_type`, dedupes the file name in the target folder (a second "Idea" gets a new name), and adds `_organized: false` when Explicit organization is on. It resolves to the absolute path it created and does not open the note.
- An unknown or wrongly cased type name is not an error: the note lands in the types base folder (the vault root when none is set) with only `_type`. Offering `sortedTypes` (the vault's defined types, by their order) avoids typos; with a fixed name, check `typeDefinitionsStore.getTypeMetadata(name)` first, which matches exactly.
- The failure messages are bare words: `create-failed` (folder or file creation failed, cause in the log) and `no-vault`; the recipe turns the first into text a user can act on.
- `buildContent` receives the rendered template, so the body is appended after it; `contextDate`, the other option, takes a dayjs object, which a plain-JS mod does not have.
- `openFileInEditor` takes an absolute path and never rejects, so the action checks `activeTabPath` afterwards. `ctx.workspace.openNote` is the stable alternative once the path is made vault-relative.

## See also

- [Vault Mods](../28-mods.md#recipes) for the user guide and its shorter recipes
- [Actions and entry points](02-actions-and-entry-points.md), [Runs](03-runs.md), [Dialogs](06-dialogs.md)
- [Mod data](05-mod-data.md), [Events and reactivity](07-events-and-reactivity.md), [Querying the index](10-querying-the-index.md)
- [Errors and debugging](15-errors-and-debugging.md), [Pitfalls checklist](16-pitfalls-checklist.md)
