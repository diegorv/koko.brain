# Raw App Access (`ctx.app`)

`ctx.app` hands a mod the app's own stores and services. This page covers every member: its real signature, the shapes it takes and returns, side effects, failure modes, and a short example. For the index (`ctx.kb()`), see [Querying the index](10-querying-the-index.md).

Stability: everything on this page is **raw**. It is the app's internals as they are today, with no compatibility promise. Prefer the stable APIs ([vault files](04-vault-files.md), [runs](03-runs.md), [dialogs](06-dialogs.md)) when they can do the job, and reach for `ctx.app` for what they cannot: the editor, templates, typed notes, frontmatter, daily and 1:1 notes.

## How `ctx.app` behaves

- `ctx.app` is a getter. It returns the **live** object every mod shares: not a copy, not frozen, not a proxy. Its members are the app's real stores and functions, with no wrapper, no argument validation and no `try`/`catch` added by the host.
- Reading `ctx.app` throws `Mod "<id>" is unloaded` once the mod is unloaded or the vault changed. Objects you already took from it (`const store = ctx.app.editorStore`) are not guarded and stay usable; after a vault switch they point at the new vault's state.
- Errors thrown inside these functions are the app's own. Several of them log through the app's error reporter (which reaches Sentry when it is enabled) and show the app's own toast, without your mod's name in it. The host prefixes only failures of your action (`<mod name>: <title> failed: <message>`).
- Nothing stops a mod from calling destructive members. Never call `editorStore.reset()`, `vaultStore.close()`, `vaultStore.open()`, `vaultStore._reset()`, `settingsStore.setSettings()`, `railRegistryStore.reset()`, `modCommandsStore.reset()`, or the store setters this page marks as internal.
- Anything you subscribe to through `ctx.app` (a CodeMirror DOM listener, a rail registration, a `MutationObserver`, an interval) must be undone with `ctx.register(...)`. See [Events and reactivity](07-events-and-reactivity.md#ctxregisterdispose).

> [!WARNING]
> `ctx.app` paths are **absolute**. `ctx.vault`, `ctx.workspace`, `ctx.onNoteSaved` and `run.target` use **vault-relative** paths. Convert at every boundary with the canonical `toAbsolute(ctx, path)` and `toVaultPath(ctx, absolute)` from [Vault files: Absolute paths](04-vault-files.md#absolute-paths-and-ctxapp). The samples on this page use those two, [`safeName`](04-vault-files.md#note-names-safename) for file names built from titles, and [`editNote`](04-vault-files.md#editnote) for edits; paste them from there.

## Members at a glance

| Member | Kind | Returns | Section |
|--------|------|---------|---------|
| `editorStore` | store | | [editorStore](#editorstore) |
| `editorStore.editorView` | CodeMirror view | `EditorView \| null` | [editorView](#editorstoreeditorview) |
| `openFileInEditor(absolutePath)` | function | `Promise<void>`, never rejects | [openFileInEditor](#openfileineditor) |
| `openNoteAt(absolutePath, target)` | function | `Promise<void>` | [openNoteAt](#opennoteat) |
| `vaultStore` | store | | [vaultStore](#vaultstore) |
| `createTypedNote(options)` | function | `Promise<string>` (absolute path) | [createTypedNote](#createtypednote) |
| `createOneOnOneNote(personName)` | function | `Promise<void>` | [createOneOnOneNote](#createoneononenote) |
| `openOneOnOnePicker(onSelect?)` | function | `Promise<void>` | [openOneOnOnePicker](#openoneononepicker) |
| `dailyNotePath(date?)` | function | `string` (absolute path) | [dailyNotePath](#dailynotepath) |
| `openOrCreateDailyNote()` | function | `Promise<void>` | [openOrCreateDailyNote](#openorcreatedailynote) |
| `updateNoteFrontmatter(absolutePath, mutate)` | function | `Promise<string>` (written text) | [updateNoteFrontmatter](#updatenotefrontmatter) |
| `typeDefinitionsStore` | store | | [typeDefinitionsStore](#typedefinitionsstore) |
| `modCommandsStore` | store | | [modCommandsStore](#modcommandsstore) |
| `railRegistryStore` | store | | [railRegistryStore](#railregistrystore) |
| `settingsStore` | store | | [settingsStore](#settingsstore) |
| `openOrCreateNote(options)` | function | `Promise<void>` | [openOrCreateNote](#openorcreatenote) |
| `saveFileByPath(absolutePath)` | function | `Promise<boolean>`, never rejects | [saveFileByPath](#savefilebypath) |
| `syncExternalContentToEditor(absolutePath, content, markSaved, schedule)` | function | `void` | [syncExternalContentToEditor](#syncexternalcontenttoeditor) |

All stores are reactive: reading a getter inside `ctx.watch(read, onChange)` subscribes to it.

## `editorStore`

**Raw.** The editor's tabs and its CodeMirror view.

```ts
interface EditorTab {
	path: string;          // absolute path on disk
	name: string;          // display name (the file name)
	content: string;       // current text, may hold unsaved edits
	savedContent: string;  // last saved text; the tab is dirty when content !== savedContent
	fileType?: 'markdown' | 'collection' | 'tasks' | 'graph' | 'tags' | 'canvas' | 'kanban' | 'event-calendar';
	pinned?: boolean;
}

interface EditorStore {
	readonly tabs: EditorTab[];               // display order, pinned first
	readonly activeIndex: number;             // -1 when no tab is active
	readonly activeTab: EditorTab | null;
	readonly activeTabPath: string | null;    // absolute
	readonly activeTabContent: string | null; // changes on every keystroke
	readonly isLivePreview: boolean;          // live preview (true) or source mode
	readonly editorView: EditorView | null;   // see the next section
	readonly pendingScrollPosition: number | null; // internal: consumed by the editor
	readonly externalContentSignal: number;         // internal: bumped by syncExternalContentToEditor
	setActiveIndex(index: number): void;      // switches tabs; ignores an out-of-range index
}
```

`fileType` values:

| `fileType` | Tab | `path` |
|------------|-----|--------|
| `undefined` | A note, or any other text file (a mod's `main.js`, a `.json`) | Real file |
| `'markdown'` | A note (the app does not set it today; treat like `undefined`) | Real file |
| `'collection'` | A `.view` file | Real file |
| `'canvas'` | A `.canvas` file | Real file |
| `'kanban'` | A `.kanban` file | Real file |
| `'tasks'`, `'graph'`, `'tags'`, `'event-calendar'` | Virtual tabs | Starts with `__virtual__/`, no file on disk |

The app's own "is this a Markdown note" test, as plain JavaScript:

```javascript
function isMarkdownNoteTab(tab) {
	return !!tab
		&& !tab.path.startsWith('__virtual__/')
		&& (tab.fileType === undefined || tab.fileType === 'markdown')
		&& tab.path.toLowerCase().endsWith('.md');
}
```

Notes:

- `tabs` is a deep reactive proxy. A tab object keeps its identity while it is open (pinning or unpinning replaces it), so `ctx.watch(() => ctx.app.editorStore.activeTab, ...)` fires on tab switches, not on typing. Watch `activeTabPath` when you only care which note is active; watch `activeTabContent` only if you really need every keystroke.
- Paths match exactly and case-sensitively. A tab path can contain `//` when a folder setting has an edge slash; compare with `toVaultPath` from above when it matters.
- Do not use the store's other mutators (`addTab`, `removeTab`, `updateContent`, `updateTabContentOnly`, `updateTabContentByPath`, `updateTabPath`, `markSavedByPath`, `setEditorView`, `setPendingScrollPosition`, `bumpExternalContentSignal`, `togglePin`, `setPinned`, `setLivePreview`, `reset`). They skip the editor service: `removeTab` closes a tab without saving it, `updateContent` changes text without arming autosave or updating CodeMirror. Open with [`openFileInEditor`](#openfileineditor), edit with [`editorView.dispatch`](#editorstoreeditorview) or [`syncExternalContentToEditor`](#syncexternalcontenttoeditor), save with [`saveFileByPath`](#savefilebypath). Closing tabs is not exposed.

Example: list open notes with unsaved edits.

```javascript
ctx.addAction({
	id: 'dirty-tabs',
	title: 'List unsaved notes',
	run: async (_input, run) => {
		const dirty = ctx.app.editorStore.tabs.filter((tab) => tab.content !== tab.savedContent);
		if (dirty.length === 0) return ctx.notify('Everything is saved');
		await run.ui.alert({ title: `${dirty.length} unsaved`, message: dirty.map((tab) => tab.name).join('\n') });
	},
});
```

## `editorStore.editorView`

**Raw.** The CodeMirror 6 `EditorView` instance, or `null`.

What you need to know before touching it:

1. **One view for all text tabs.** The editor keeps a single `EditorView` and swaps each tab's state (document, selection, undo history) into it on tab switch. The view object stays the same across switches between notes, but `view.state` belongs to whichever tab is active. Read `view.state` at the moment you use it; never cache `state` or `doc`.
2. **`null` when the active tab is not rendered as text.** It is `null` with no tabs, on the virtual tabs, on a Kanban or Canvas tab in board mode, and on a `.view` tab in table mode. It is non-null for notes, other text files (including a mod's own `main.js`), and Kanban, Canvas or `.view` tabs switched to source mode.
3. **It goes stale.** Going from a board, table or virtual tab back to a note mounts a **new** view and destroys the old one. A view you stored earlier is then dead (`view.dom.isConnected === false`). Read `ctx.app.editorStore.editorView` fresh every time, and again after every `await`.
4. **Right after an open it can still show the previous document.** `openFileInEditor` and `openNoteAt` resolve as soon as the tab is added; CodeMirror swaps the document in a moment later. Until then `view.state.doc` is the previous tab's text, and a dispatch would edit the wrong note. Check `view.state.doc.toString() === activeTab.content.replace(/\r\n?/g, '\n')` before dispatching (see [Wait for the editor](#wait-for-the-editor-after-opening)). The `replace` is required: the document always uses `\n`, while `content` keeps a CRLF file's raw `\r\n` until the user's first edit, so an unnormalized comparison fails for as long as such a note is open.
5. **A dispatch behaves like typing.** A document change you dispatch updates `activeTab.content` synchronously, marks the tab dirty, and arms autosave (about 500 ms when the change touches the frontmatter block, about 2 s otherwise, saved within 10 s at most). It adds an undo step, so Cmd+Z undoes it. Call `await ctx.app.saveFileByPath(path)` after the dispatch to save at once.
6. **No CodeMirror imports.** A mod has no `import`, so it cannot construct CodeMirror effects, annotations, facets or extensions. Use only what the instance offers, with plain-object transaction specs.

Usable surface:

```ts
interface EditorViewSubset {
	readonly dom: HTMLElement;        // the editor root; dom.isConnected is false once destroyed
	readonly contentDOM: HTMLElement; // the contenteditable element
	readonly scrollDOM: HTMLElement;  // the scroller
	readonly state: {
		doc: {
			toString(): string;
			readonly length: number;            // in UTF-16 code units
			readonly lines: number;             // line count
			line(n: number): Line;              // 1-based; throws when out of range
			lineAt(pos: number): Line;          // line containing a position
			sliceString(from: number, to?: number): string;
		};
		selection: { main: { from: number; to: number; anchor: number; head: number; empty: boolean } };
		replaceSelection(text: string): TransactionSpec; // replaces every selection range
	};
	readonly hasFocus: boolean;  // true only while the editable text itself has focus (not a widget input inside it)
	readonly composing: boolean; // true while an input method (IME) composition is in progress
	dispatch(spec: TransactionSpec): void;
	focus(): void;
}
interface Line { number: number; from: number; to: number; text: string }
interface TransactionSpec {
	changes?: { from: number; to?: number; insert?: string } | { from: number; to?: number; insert?: string }[];
	selection?: { anchor: number; head?: number };
	scrollIntoView?: boolean;
	userEvent?: string; // e.g. 'input', groups undo steps
}
```

Positions are offsets into the raw Markdown text, frontmatter included. Live preview hides syntax and draws widgets (tables, QueryJS blocks, the frontmatter panel) but never changes the document, so `doc.toString()` is the same in both modes. Several `changes` in one dispatch refer to positions in the document **before** the dispatch.

### Safe edit patterns

```javascript
/** The live view showing the active note, or an Error explaining why there is none. */
function activeNoteView(ctx) {
	const tab = ctx.app.editorStore.activeTab;
	const view = ctx.app.editorStore.editorView;
	if (!tab || !tab.path.toLowerCase().endsWith('.md')) throw new Error('Open a note first');
	if (!view || !view.dom.isConnected) throw new Error('The note is not shown as text');
	// The doc uses "\n"; a CRLF note's tab content keeps "\r\n" until the first edit.
	if (view.state.doc.toString() !== tab.content.replace(/\r\n?/g, '\n')) throw new Error('The editor is still switching notes; try again');
	return { tab, view };
}

ctx.addAction({
	id: 'stamp',
	title: 'Insert timestamp at the caret',
	run: () => {
		const { view } = activeNoteView(ctx);
		view.dispatch(view.state.replaceSelection(new Date().toLocaleString()));
		view.focus();
	},
});

ctx.addAction({
	id: 'wrap-bold',
	title: 'Bold the selection',
	run: () => {
		const { view } = activeNoteView(ctx);
		const { from, to } = view.state.selection.main;
		if (from === to) throw new Error('Select some text first');
		const text = view.state.doc.sliceString(from, to);
		view.dispatch({
			changes: { from, to, insert: `**${text}**` },
			selection: { anchor: from + 2, head: to + 2 },
		});
		view.focus();
	},
});

ctx.addAction({
	id: 'append-line',
	title: 'Append a line to the note',
	input: { placeholder: 'Text' },
	run: async (input, run) => {
		const text = input.trim();
		if (!text) throw new Error('Type some text');
		const { tab, view } = activeNoteView(ctx);
		const doc = view.state.doc;
		const prefix = doc.length === 0 || doc.sliceString(doc.length - 1) === '\n' ? '' : '\n';
		view.dispatch({ changes: { from: doc.length, insert: `${prefix}${text}\n` }, scrollIntoView: true });
		// Optional: save now instead of waiting for autosave.
		if (!(await ctx.app.saveFileByPath(tab.path))) run.log('Save failed; the editor showed a toast');
	},
});
```

Reading the current line:

```javascript
const { view } = activeNoteView(ctx);
const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos); // { number, from, to, text }
```

### Edit a note whether or not it is open

This is the pattern for "change note X": through the editor when X is the active note shown as text (unsaved edits survive, the caret stays with the user's text, autosave runs), otherwise through `ctx.vault` (which refuses a background tab with unsaved edits, so nothing is lost). `edit` is a pure function from old text to new text.

Use the one canonical helper, [`editNote(ctx, absolutePath, edit)` in Vault files](04-vault-files.md#editnote), with its `changedRange`. It resolves to whether the text changed. It compares the view with the tab's content with line breaks normalized (CRLF notes), matches `//` paths by hand, and never awaits between the editor check and the dispatch, so the active note cannot change in between. Why each step is there is explained on that page.

### Wait for the editor after opening

```javascript
/** Opens a note and resolves to its live view once CodeMirror shows it, or null. */
async function openAndGetView(ctx, absPath) {
	await ctx.app.openFileInEditor(absPath);
	for (let i = 0; i < 50; i++) {
		const tab = ctx.app.editorStore.activeTab;
		if (!tab || tab.path !== absPath) return null; // the open failed, or the user switched away
		const view = ctx.app.editorStore.editorView;
		if (view && view.dom.isConnected && view.state.doc.toString() === tab.content.replace(/\r\n?/g, '\n')) return view;
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	return null;
}
```

## `openFileInEditor`

**Raw.**

```ts
openFileInEditor(absolutePath: string): Promise<void>
```

- Already open (exact path match): switches to that tab. No disk read.
- Otherwise reads the file as text, adds a tab and makes it active. `fileType` is set from the extension (`.view`, `.canvas`, `.kanban`).
- Binary files (images, audio, video, PDF, archives): shows the toast `Cannot open binary file in the editor: <name>` and resolves.
- **Never rejects.** A missing file, a folder or unreadable bytes show the toast `Failed to open file.`, log the error, and resolve. Check the result yourself.
- Resolves before CodeMirror shows the document ([why](#editorstoreeditorview)).
- No path validation: any absolute path, inside the vault or not.

```javascript
await ctx.app.openFileInEditor(abs);
if (ctx.app.editorStore.activeTabPath !== abs) throw new Error(`Could not open ${abs}`);
```

For a vault-relative path that must exist, `ctx.workspace.openNote(rel)` is the stable route and rejects when the note is missing.

## `openNoteAt`

**Raw.**

```ts
type NoteTarget = { kind: 'line'; line: number } | { kind: 'offset'; offset: number };
openNoteAt(absolutePath: string | null, target: NoteTarget): Promise<void>
```

- `line` is 1-based; `offset` is a character offset into the note's text (frontmatter included).
- A `null` or empty path is a no-op. If the note is not active it calls `openFileInEditor` first; if the open fails it returns silently (no throw).
- The position is clamped to the document: a line past the end lands at the start of the last line, a line below 1 at the start of the note, and an offset is clamped to `0` through the text length. `kind` is not validated: anything but `'line'` is read as an offset.
- The promise resolves **before** the caret moves. The editor places the caret, scrolls it to the middle of the view and focuses the editor a couple of animation frames later. Do not dispatch your own edit right after the promise; [wait for the editor](#wait-for-the-editor-after-opening) first.

```javascript
// Jump to the first open task of a note found in the index.
const kb = await ctx.kb();
const page = kb.pages('"Projects"').where((p) => p.file.tasks.some((t) => !t.completed)).first();
if (!page) throw new Error('No open tasks in Projects');
const task = page.file.tasks.find((t) => !t.completed);
await ctx.app.openNoteAt(page.file.path, { kind: 'line', line: task.line });
```

## `vaultStore`

**Raw.** The open vault.

```ts
interface VaultStore {
	readonly path: string | null;        // absolute vault root, no trailing slash; never null while your mod is live
	readonly name: string | null;        // last path segment
	readonly isOpen: boolean;
	readonly vaultIndexVersion: number;  // grows each time the app refreshes its index snapshot
	readonly indexReady: boolean;        // false until the vault's first index build finished
	requestPromptIndexRefresh(): void;   // the next index update refreshes at once
}
```

- `path` equals the vault your mod was loaded in; the host checks that on every `ctx.app` read.
- `vaultIndexVersion` changes when the app refreshes its index snapshot (throttled: about 2 s after a change, up to about 10 s during a burst). Watching it tells you the snapshot moved; see [Querying the index](10-querying-the-index.md#freshness-and-lag).
- `indexReady` is false while the vault is still being indexed at startup. A mod that queries the index in `onload` can wait for it with `ctx.watch(() => ctx.app.vaultStore.indexReady, ...)` (the callback does not fire at subscription, so check the current value first).
- `requestPromptIndexRefresh()` sets a one-shot flag: the **next** `vault-index-updated` event refreshes at once instead of after the throttle, then the flag clears. Call it right before a write whose effect should show quickly in the sidebar, or in the `ctx.kb()` fields that follow the throttled snapshot (tasks, `file.tags`, links; frontmatter is current at once, see [Freshness and lag](10-querying-the-index.md#freshness-and-lag)). Any index event consumes it, not necessarily yours.
- Internal, never call: `open`, `close`, `removeRecent`, `_reset`, `takePromptIndexRefresh`, `bumpVaultIndexVersion`, `markIndexReady`, `resetIndexReady`. `recentVaults` is readable but is the app's list, not the vault's.

```javascript
ctx.app.vaultStore.requestPromptIndexRefresh();
await ctx.app.updateNoteFrontmatter(abs, (props) => setProp(props, '_organized', true, 'boolean'));
```

## `createTypedNote`

**Raw.** Creates a note of a [type](../25-types-and-relationships.md) the way the app does, without opening it.

```ts
createTypedNote(options: {
	typeName: string;  // selects the type's folder and template; written as `_type` only without a template (see below)
	title: string;     // file name without `.md`, deduplicated in the target folder; pass it through safeName
	contextDate?: Dayjs; // what `tp.date.now()` in the template resolves to
	buildContent?: (base: string, target: { fileName: string; title: string; path: string }) => string;
}): Promise<string>  // the absolute path actually created
```

Pipeline:

1. Target folder: `<vault>/<Settings typesBaseFolder>/<type folder>` (each part optional; both empty means the vault root). The folder is created if missing.
2. File name: `<title>.md`, deduplicated case-insensitively against the folder: a second `Idea` becomes `Idea 1.md`, then `Idea 2.md`. The resolved path is what the promise returns.
3. Content: the type's template (`_template`, vault-relative) rendered with `<% %>` expressions; when there is no template or it cannot be read, `---\n_type: <typeName>\n---\n`.
4. `buildContent(base, target)` runs on the rendered text, if given. `target.path` is the planned absolute path. A throw propagates and no file is created.
5. While **Settings, Explicit organization** is on (the default), the final text gets `_organized: false` (unless it already has an `_organized` or `organized` key).
6. The file is created and indexed. It is **not** opened: call `openFileInEditor(path)`.

> [!WARNING]
> **`_type` comes from the template when there is one.** Only the fallback content (no template, or an unreadable one) writes `_type: <typeName>`. A type whose template does not set `_type` produces an **untyped** note in the type's folder. Add it in `buildContent` when it is missing, as `ensureTypeLine` below does: it inserts the line right after the opening `---`, so the template's own frontmatter is kept byte for byte, which is how the app adds `_organized: false`.

```javascript
/** buildContent for createTypedNote: adds `_type: <typeName>` when the rendered template lacks a type key. */
function ensureTypeLine(typeName) {
	return (base) => {
		const block = base.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		if (block && block[1].split(/\r?\n/).some((line) => /^_?type\s*:/.test(line))) return base;
		// Also covers an empty "---"/"---" block, which the match above does not see.
		if (/^---\r?\n/.test(base)) return base.replace(/^---(\r?\n)/, (open, eol) => `${open}_type: ${typeName}${eol}`);
		return `---\n_type: ${typeName}\n---\n${base}`;
	};
}
```

`ctx.vault.create` is not a substitute: a note created with it is untyped unless your text sets `_type`, lands where you put it rather than in the type's folder, renders no template, and never gets `_organized: false`, so it skips the Inbox. Before creating "a person note", "a meeting note" or any "X note", check whether X is a type of this vault (`typeDefinitionsStore.getTypeMetadata('X')`, first letter uppercased) and use `createTypedNote` when it is.

Failure modes:

| Case | Result |
|------|--------|
| No vault | rejects `Error('no-vault')` |
| Folder creation or file creation fails | rejects `Error('create-failed')` (the cause is logged) |
| `buildContent` throws | rejects with that error, nothing written |
| **Unknown `typeName`** | **not an error**: the note lands in the types base folder (the vault root when none is set) with only `_type: <typeName>` frontmatter |
| Empty title, or a title starting with `.` | not rejected: creates a dotfile (`.md`, `.plan.md`), which the explorer and the index never show. Pass the title through [`safeName`](04-vault-files.md#note-names-safename) and refuse `''` |

Type lookup is exact. Type names are stored with the first letter uppercased (`Task`, not `task`), and only types that have a type definition note are known. Check before creating:

```javascript
ctx.addAction({
	id: 'new-task',
	title: 'New Task',
	input: { placeholder: 'Task title' },
	run: async (input) => {
		const title = safeName(input);
		if (!title) throw new Error('Type a title');
		const typeName = 'Task';
		if (!ctx.app.typeDefinitionsStore.getTypeMetadata(typeName)) {
			throw new Error(`No type definition for ${typeName}`);
		}
		const withType = ensureTypeLine(typeName);
		const path = await ctx.app.createTypedNote({
			typeName,
			title,
			buildContent: (base) => `${withType(base).replace(/\n*$/, '\n')}\nCreated by a mod.\n`,
		});
		// Opening the note is the last step: no run.log or run.progress, so the run view closes by itself.
		await ctx.app.openFileInEditor(path);
	},
});
```

`contextDate` must be a **dayjs** object. A plain-JavaScript mod has none unless it bundles dayjs (see [Types, build and test](12-types-build-and-test.md#building-a-mod-from-typescript)). A JS `Date` is not a dayjs object: a template that calls `tp.date.now()` without a reference date would then throw. Leave it out to render "now".

## `createOneOnOneNote`

**Raw.**

```ts
createOneOnOneNote(personName: string): Promise<void>
```

- Opens today's 1:1 note with `personName`, creating it first when missing. Folder, file name and template come from **Settings, 1:1 Notes** (defaults: folder `<periodic notes folder>/YYYY/MM-MMM`, file name `-1on1-<person>-DD-MM-YYYY`, template `_system/templates/periodic-note/One-On-One.md`).
- Always today. There is no date parameter.
- A created note always gets `_related_to: [[<personName>]]` (even if the template lacks it) and `_organized: false` while Explicit organization is on. An existing note is only opened.
- The person is a name, not a path. Nothing checks that a person note exists, and two people with the same name share the same 1:1 file.
- No vault: resolves without doing anything. A creation failure rejects (no toast).
- Resolves to nothing. To learn the path, read `ctx.app.editorStore.activeTabPath` afterwards and check it.

```javascript
await ctx.app.createOneOnOneNote('Ada Lovelace');
const tab = ctx.app.editorStore.activeTab;
if (!tab || !tab.name.includes('Ada Lovelace')) throw new Error('Could not open the 1:1 with Ada Lovelace');
```

## `openOneOnOnePicker`

**Raw.**

```ts
interface PersonEntry {
	name: string;                    // the person note's name
	path: string;                    // absolute path of the person note (.md)
	context: 'work' | 'personal';    // which configured people folder it came from
}
openOneOnOnePicker(onSelect?: (person: PersonEntry) => void | Promise<void>): Promise<void>
```

- Loads the people from **Settings, 1:1 Notes** (personal and work people folders), then opens the app's person picker. If loading fails the picker opens empty.
- **Resolves when the picker opens, not when a person is picked.**
- Without `onSelect`: picking a person runs `createOneOnOneNote(person.name)`.
- With `onSelect`: the picker closes, then `onSelect(person)` runs. A throw or rejection shows a toast with the raw error message.
- `onSelect` runs **outside any run**: there is no `run.signal`, no Stop, no `run.ui`, and a reload of your mod does not wait for it. If the mod unloaded meanwhile, every `ctx` call in it throws. Use `ctx.ui` and `ctx.notify` there.
- Opening the picker again replaces the pending callback; closing it drops the callback.

```javascript
ctx.addAction({
	id: 'person-note',
	title: 'Open a person note',
	run: async () => {
		await ctx.app.openOneOnOnePicker(async (person) => {
			await ctx.app.openFileInEditor(person.path);
			ctx.notify(`${person.name} (${person.context})`);
		});
		// The run ends here, while the picker is still open.
	},
});
```

For a picker that lives inside your run (Stop, cancellation, extra fields), build one with `run.ui.pick` over `ctx.vault.list(settingsStore.oneOnOne.peopleFolder)` instead. See [Dialogs](06-dialogs.md#pick).

## `dailyNotePath`

**Raw.**

```ts
dailyNotePath(date?: Date): string  // default: now
```

- Returns the absolute path of that day's daily note from **Settings, Periodic Notes** (folder default `_notes`, daily format default `YYYY/MM-MMM/_[journal]-[day]-DD-MM-YYYY`, `.md` appended). It only computes: the note may not exist.
- Throws `Error('No vault is open')` without a vault (cannot happen in a live mod).
- Uses the local calendar day of `date`. Read `new Date()` once, after the run's last dialog, and use it for both the path and any timestamp, so they name the same day. A date read before a dialog can be yesterday's by the time the user answers.

```javascript
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const abs = ctx.app.dailyNotePath(yesterday);
if (!(await ctx.vault.exists(toVaultPath(ctx, abs)))) throw new Error('No daily note for yesterday');
await ctx.app.openFileInEditor(abs);
```

## `openOrCreateDailyNote`

**Raw.**

```ts
openOrCreateDailyNote(): Promise<void>
```

- Opens **today's** daily note, creating it from the daily template (with the navigation variables the template expects) when missing. No date parameter: "today" is the day at the moment of the call.
- No vault: resolves without doing anything. A creation failure rejects.
- Other days: compute `dailyNotePath(date)` and open it with `openFileInEditor` when it exists. Creating another day's note through `openOrCreateNote` is possible, but without a dayjs `contextDate` its template's dates render as today and the navigation variables are missing. Weekly, monthly and other periodic notes are not exposed.

A run that computed `dailyNotePath(now)` and then crosses midnight before this call creates the **next** day's note, and the path it holds still does not exist. `ensureDailyNote` checks for that after creating; the [Cookbook](14-cookbook.md) copies it:

```javascript
/**
 * Absolute path of the daily note of `date`, created from the daily template when missing.
 * openOrCreateDailyNote creates the note of the day it runs on: when midnight passed since
 * `date` was read, the note it made is another day's, and this rejects instead of going on.
 */
async function ensureDailyNote(ctx, date) {
	const path = ctx.app.dailyNotePath(date);
	if (await ctx.vault.exists(toVaultPath(ctx, path))) return path;
	await ctx.app.openOrCreateDailyNote();
	if (!(await ctx.vault.exists(toVaultPath(ctx, path)))) {
		throw new Error('The day changed while the daily note was being created; run it again');
	}
	return path;
}
```

```javascript
ctx.addAction({
	id: 'log',
	title: 'Log to today',
	input: { placeholder: 'What happened?' },
	run: async (input, run) => {
		const text = input.trim();
		if (!text) throw new Error('Type some text');
		const now = new Date();
		const today = await ensureDailyNote(ctx, now);
		if (run.signal.aborted) return;
		const time = now.toTimeString().slice(0, 5);
		await editNote(ctx, today, (doc) => `${doc.replace(/\n*$/, '\n')}- ${time} ${text}\n`);
		ctx.notify('Logged');
	},
});
```

Creating the note through the app (not `ctx.vault.create`) is what applies the daily template.

## `updateNoteFrontmatter`

**Raw.** Rewrites a note's frontmatter through a list of properties, without losing data (with the two exceptions under [Known problems](#known-problems-caret-and-empty-block)).

```ts
interface Property {
	key: string;
	value: string | number | boolean | string[];
	type: 'text' | 'list' | 'number' | 'date' | 'boolean';
}
updateNoteFrontmatter(absolutePath: string, mutate: (props: Property[]) => Property[]): Promise<string>
```

- `mutate` receives the current properties in file order (an empty array when the note has no frontmatter, and also for an empty `---`/`---` block) and returns the **new full list**. Add, remove, reorder or replace by returning a different array. Returning an empty list removes the block. On a note whose block is an empty `---`/`---` pair, properties you return go into a **new** block in front of it, and the empty pair stays as the first lines of the body: see [Known problems](#known-problems-caret-and-empty-block).
- Values arrive as the YAML parser reads them: `2026-01-02` as the string `'2026-01-02'` with `type: 'date'`, `3` as the number `3`, `true` as a boolean, `[a, b]` and block lists as string arrays with `type: 'list'`, an empty key as `''`. For tags, see [Frontmatter tags](#frontmatter-tags).
- The written YAML follows the JavaScript type of `value`, not `type`. `type: 'list'` writes a flow sequence (`[a, b]`). Strings are quoted when they need it (a wikilink `'[[Project X]]'` is quoted for you). Unchanged numbers and booleans keep their original spelling.
- For a value the user typed, convert it first, because the string is written as a string: `'3'` is written `"3"` and `'true'` is written `"true"` (both stay text), even with `type: 'number'` or `type: 'boolean'`. A string shaped like a date, `'2026-01-02'`, is written unquoted with either type and reads back as a date. So turn `'3'` into the number `3` and `'true'` into `true` when you want a number or a boolean, and keep a date as its `YYYY-MM-DD` string:

```javascript
/**
 * A typed value as a Property: true/false, YYYY-MM-DD dates and numbers get their type; anything else is text.
 * A number only when it reads back with the same spelling (String(Number(v)) === v), as the app's own
 * select options do: `007`, `1.50` and `1e3` stay text, so nothing is written with another spelling.
 */
function typedProperty(key, text) {
	const value = text.trim();
	const n = Number(value);
	if (value !== '' && Number.isFinite(n) && String(n) === value && (!Number.isInteger(n) || Number.isSafeInteger(n))) {
		return { key, value: n, type: 'number' };
	}
	if (value === 'true' || value === 'false') return { key, value: value === 'true', type: 'boolean' };
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { key, value, type: 'date' };
	return { key, value, type: 'text' };
}
```

- There is no read-only twin of `updateNoteFrontmatter` and no frontmatter parser in `ctx`, so a "how many notes will change" preview before a batch reads the values another way: from the index (`p[key]` on a `ctx.kb()` page, which [lags behind saves](10-querying-the-index.md#freshness-and-lag)), or by matching `^key:` lines in what `ctx.vault.read` returns. Count a note the write would refuse as "left alone", with `mayRefuseFrontmatter` below, so the confirm does not promise more changes than the batch makes. The write itself is the only judge of a refusal; report its `reason` per note.

```javascript
/**
 * Whether updateNoteFrontmatter may refuse this note's frontmatter as lossy, read from the raw text
 * for a "how many notes will change" preview. Conservative: any block line with a comment, a YAML
 * anchor or alias, or an indented mapping, or a top-level key written twice, counts as a refusal.
 */
function mayRefuseFrontmatter(text) {
	const block = /^---\r?\n([\s\S]*?)\r?\n---\r?(?:\n|$)/.exec(text);
	if (!block) return false;
	const keys = new Set();
	for (const line of block[1].split(/\r?\n/)) {
		if (/(^|\s)#/.test(line)) return true; // a comment
		if (/(^|[\s:[,-])[&*][^\s,\]]/.test(line)) return true; // an anchor or alias
		if (/^\s*-\s+[^\s'"][^:]*:(\s|$)/.test(line) || /^\s+[^\s'"-][^:]*:(\s|$)/.test(line)) return true; // a nested mapping
		const top = /^([^\s#'"-][^:]*):(\s|$)/.exec(line);
		if (top) {
			if (keys.has(top[1])) return true; // a repeated key
			keys.add(top[1]);
		}
	}
	return false;
}
```
- Alias keys are canonical both ways: `mutate` receives `type:` from the file as `_type`, and a key you return is written in canonical form. The aliases: `type`, `organized`, `archived`, `favorite`, `order`, `favorite_index`, `sort`, `icon`, `sidebar_label` (and `sidebar label`), `color`, `title_color`, `template`, `view`, `visible`, `list_properties_display`, each written with a leading `_`. Look keys up by the underscored name.
- One key twice in the returned list (either spelling) is merged, not an error: the first non-empty entry wins and the later one is dropped. Appending `{ key: '_archived', value: true }` to a list that already holds `_archived: false` keeps `false`. Replace the existing entry instead (see `setProp` below).
- Resolves to the full written text of the note, or to the unchanged text when the rebuilt text equals the file byte for byte (then nothing is written or saved). That holds only for frontmatter already in the app's canonical form: returning the same properties for a note with block lists, `type:` or needless quotes still rewrites it (`[a, b]`, `_type:`, quotes dropped). To skip the write, throw a sentinel from `mutate` and catch it (see the [cookbook](14-cookbook.md#5-set-toggle-and-remove-frontmatter-properties)).
- **`mutate` must be pure.** It runs a second time when a tab for the note opens during the read. Do not count, log or set flags you latch inside it; if you need a flag, overwrite it on every call.
- Open note: patches the tab (unsaved body edits are kept) and saves the whole tab at once, flushing pending body edits too. On the **active** tab this moves the caret (see [Known problems](#known-problems-caret-and-empty-block)). Closed note: reads the file, writes it, then runs the full after-save pipeline (file history, Auto Organize, indexing, `ctx.onNoteSaved`). It never re-creates a note deleted during the call.
- The frontmatter block is always written back with `\n` line breaks, also in a CRLF note (the body keeps its own). Tell the user when a mod rewrites frontmatter beyond the keys it was asked to change: canonical form (`[a, b]` lists, `_type:`, quotes dropped) and line breaks count.
- Concurrent calls on one closed note race; the last write wins. Serialize calls per path.
- **Markdown only.** It does not check the extension: on a `.canvas`, `.view` or `.js` file it would add a frontmatter block.

Errors:

| Error | When |
|-------|------|
| The file system error, as is (often a bare string) | A closed note cannot be read (missing, permissions), or its write fails while the file still exists |
| `FrontmatterWriteError` with `reason` below | Everything else |

`FrontmatterWriteError` is not exported to mods. Recognize it by `err.name === 'FrontmatterWriteError'`; it has `reason`, `path` (absolute) and `message` (`Frontmatter write <reason>: <path>`).

| `reason` | Meaning | App's message (reuse it) |
|----------|---------|---------------------------|
| `unparseable` | YAML errors, a root that is not a mapping, an integer beyond the safe range | The note's frontmatter could not be parsed; fix it in the note |
| `nested` | A nested mapping, a collection in a list, or a collection key | The note's frontmatter has nested values; it cannot be rewritten without losing them |
| `comments` | Any YAML comment | The note's frontmatter has comments; it cannot be rewritten without losing them |
| `duplicate-keys` | A key twice in the block | The note's frontmatter repeats a key; it cannot be rewritten without losing one |
| `alias-collision` | Two spellings of one key, both non-empty (`type` and `_type`) | The note's frontmatter has two keys for one property; it cannot be rewritten without losing one |
| `anchors` | YAML anchors or aliases | The note's frontmatter uses YAML anchors; it cannot be rewritten without expanding them |
| `save-failed` | Saving the open tab failed. The editor **already showed** `Failed to save file.`; do not toast again. The tab was restored unless edited meanwhile | |
| `vault-changed` | The vault switched during the call; new bytes may already be on disk | The vault changed before the note was saved |
| `missing` | The note vanished between the read and the write | The note was moved or deleted |

The lossy reasons are checked in that order and nothing is written.

```javascript
const FRONTMATTER_MESSAGES = {
	unparseable: "The note's frontmatter could not be parsed; fix it in the note",
	nested: "The note's frontmatter has nested values; it cannot be rewritten without losing them",
	comments: "The note's frontmatter has comments; it cannot be rewritten without losing them",
	'duplicate-keys': "The note's frontmatter repeats a key; it cannot be rewritten without losing one",
	'alias-collision': "The note's frontmatter has two keys for one property; it cannot be rewritten without losing one",
	anchors: "The note's frontmatter uses YAML anchors; it cannot be rewritten without expanding them",
	'vault-changed': 'The vault changed before the note was saved',
	missing: 'The note was moved or deleted',
};

/** Pure: a copy of `props` with `key` (underscored form for aliases) set; an existing key keeps its position. */
function setProp(props, key, value, type) {
	const index = props.findIndex((p) => p.key === key);
	if (index === -1) return [...props, { key, value, type }];
	const next = props.slice();
	next[index] = { key, value, type };
	return next;
}

/** Writes frontmatter; resolves true when written or unchanged, false when the editor already reported a failed save. */
async function writeFrontmatter(ctx, abs, mutate) {
	if (!abs.toLowerCase().endsWith('.md')) throw new Error('Choose a Markdown note');
	try {
		ctx.app.vaultStore.requestPromptIndexRefresh();
		// On the active note this moves the caret: updateFrontmatterKeepCaret (Known problems, below) puts it back.
		await ctx.app.updateNoteFrontmatter(abs, mutate);
		return true;
	} catch (err) {
		if (err && err.name === 'FrontmatterWriteError') {
			if (err.reason === 'save-failed') return false;
			throw new Error(`${abs.split('/').pop()}: ${FRONTMATTER_MESSAGES[err.reason] ?? err.message}`);
		}
		throw new Error(String(err && err.message ? err.message : err));
	}
}

ctx.addAction({
	id: 'archive',
	title: 'Archive this note',
	run: async (_input, run) => {
		// Capture the target before any await: the active note can change.
		const abs = run.target ? toAbsolute(ctx, run.target.path) : ctx.app.editorStore.activeTabPath;
		if (!abs) throw new Error('Open a note first');
		let changed = false;
		const saved = await writeFrontmatter(ctx, abs, (props) => {
			// Overwritten on every call, never latched: mutate may run twice.
			changed = !props.some((p) => p.key === '_archived' && p.value === true);
			return setProp(props, '_archived', true, 'boolean');
		});
		if (!saved) return; // the editor already showed "Failed to save file."
		ctx.notify(changed ? 'Archived' : 'Already archived');
	},
});
```

### Known problems: caret and empty block

Two behaviors of the current app that a mod has to work around. Both are app bugs, so a later version may fix them; the workarounds stay harmless.

**The caret moves on the active note.** When the note is the active tab, `updateNoteFrontmatter` (like `syncExternalContentToEditor` and `ctx.vault.write`) replaces the editor's document and then puts the caret back at its **old character offset**, without mapping it through the change. A selection collapses to that point. Frontmatter sits above the caret, so adding 12 characters there leaves the caret 12 characters earlier relative to the user's text: the next keystroke can land inside the `---` block. A background tab gets the same old offset back when the user returns to it.

- **From a background trigger** (`ctx.onNoteSaved`, a timer, a watch), do not change the active note's frontmatter. Remember its path and do it once the user has switched to another note; [Events: avoiding save loops](07-events-and-reactivity.md#avoiding-save-loops) shows the pattern.
- **From an action the user started on the open note**, put the caret back yourself. This helper measures the caret from the end of the document, which a change above the caret does not move. It is built from how the editor applies the change, not tested in a running app; check it once in yours.

```javascript
/** updateNoteFrontmatter, then the caret back where it was relative to the text after it. */
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
```

It assumes the caret was below the frontmatter (in the body), which is where it is while the user writes.

**An empty block gets a second block.** The app does not recognize `---` directly followed by `---` (no line between) as frontmatter: `mutate` receives `[]`, and returned properties go into a new block **in front of** the empty pair, which stays at the top of the body:

```
---
status: done
---
---
---
Body
```

`---`, an empty line, `---` is recognized and works. Some templates produce the empty pair. Remove it first, through `editNote` so an open note is handled too, then update:

```javascript
const EMPTY_BLOCK = /^---\r?\n---(?:\r?\n|$)/;

/** updateNoteFrontmatter that first drops an empty "---"/"---" block, so no second block is added. */
async function updateFrontmatterSafely(ctx, absolutePath, mutate) {
	await editNote(ctx, absolutePath, (text) => text.replace(EMPTY_BLOCK, ''));
	return ctx.app.updateNoteFrontmatter(absolutePath, mutate);
}
```

`editNote` writes nothing when there is no empty block, so the extra call is free on ordinary notes. On the active note it goes through the editor, and its change is saved by the `updateNoteFrontmatter` call right after.

## Frontmatter tags

The `tags` key is read by two different parsers, and they disagree on some spellings. What the index sees decides `file.tags`, the `#tag` source of `ctx.kb()` (`kb.pages('#project')`), the Tags view and tag search. What `updateNoteFrontmatter` sees decides what `mutate` gets.

**The index** reads the frontmatter line by line, not as YAML. It looks for a top-level `tags:` key (exactly that spelling, lowercase) and then:

| Frontmatter | Index tags |
|-------------|------------|
| `tags: [a, b]` | `a`, `b` (split on commas, each trimmed) |
| `tags:` then `  - a` and `  - b` lines | `a`, `b` |
| `tags: a` | `a` |
| `tags: a, b` | **one** tag, `a, b`: a value on the same line is never split |
| `tags: "#a"` or `- "#a"` | `a`: outer quotes, then one leading `#`, are stripped |
| `tags: #a` | `a`, though YAML reads `#a` as a comment (see below) |

Casing is kept as written. A `#tag` source in `ctx.kb()` matches ignoring case, and a note that has one tag in two casings keeps the first spelling. `/` nests tags: `kb.pages('#project')` also matches `project/alpha`. Tags written in the body (`#tag` after a space or at a line start, outside code) are merged in after the frontmatter ones.

**`updateNoteFrontmatter`** parses real YAML:

| Frontmatter | `mutate` receives |
|-------------|-------------------|
| `tags: [a, b]` or a block list | `{ key: 'tags', value: ['a', 'b'], type: 'list' }` |
| `tags: a` | `{ key: 'tags', value: 'a', type: 'text' }` |
| `tags: a, b` | `{ value: 'a, b', type: 'text' }`, one string |
| `- "#b"` (quoted) | the item `'#b'`, with the `#` |
| `tags: #a` or `tags: a #b` (unquoted `#` after a space) | nothing: it is a YAML comment, and the whole call rejects with reason `comments` before `mutate` runs |
| `tags:` | `{ value: '', type: 'text' }` |

To write tags, return a list without `#`: `{ key: 'tags', value: ['project', 'project/alpha'], type: 'list' }` writes `tags: [project, project/alpha]`, which both parsers read the same way. A tag that keeps its `#` is written quoted (`"#b"`), which the index also reads as `b`. Normalize what you read before comparing:

```javascript
/** The tags of a note as updateNoteFrontmatter hands them over, as the index would read them. */
function readTags(props) {
	const entry = props.find((p) => p.key === 'tags');
	if (!entry || entry.value === '') return [];
	const values = Array.isArray(entry.value) ? entry.value : [String(entry.value)];
	return values.map((v) => String(v).trim().replace(/^#/, '')).filter(Boolean);
}
```

`readTags` returns `tags: a, b` as the single tag `a, b`, as the index does. Ask the user before splitting it into two: that changes what their tag searches match.

## `typeDefinitionsStore`

**Raw.** The vault's type definitions (notes with `_type: Type`).

```ts
interface TypeMetadata {
	name: string;                 // "Project": first letter uppercased
	path: string | null;          // absolute path of the definition note
	icon: string;                 // lucide icon name
	color: string;
	order: number;                // sidebar order, lower first
	sidebarLabel: string;
	template: string | null;      // vault-relative template path
	folder: string | null;        // vault-relative folder for new notes; null = root
	sort: string;                 // default 'title'
	view: string;                 // default 'all'
	visible: boolean;
	listPropertiesDisplay: string[];
	archiveTo: string | null;     // e.g. "{folder}/_archive"
	hub: boolean;
}
interface TypeDefinitionsStore {
	readonly typeMetadataMap: Map<string, TypeMetadata>; // key = name
	getTypeMetadata(name: string): TypeMetadata | undefined; // exact, case-sensitive
	readonly sortedTypes: TypeMetadata[];                  // by order; a new array on every read
	getTypeDefinitionPath(name: string): string | undefined; // absolute
}
```

- Only types with a definition note are in the map. Built-in names (Project, Person, Event, Topic, Task, Note) only supply default icons and colors to defined types; they are not in the map by themselves.
- Normalize user input before looking up: `name.charAt(0).toUpperCase() + name.slice(1)`.
- `typeMetadataMap` is replaced as a whole when definitions change and kept when nothing changed, so `ctx.watch(() => ctx.app.typeDefinitionsStore.typeMetadataMap, ...)` is quiet on ordinary saves. Do not watch `sortedTypes` (always a new array); watch `sortedTypes.map((t) => t.name).join('\n')` instead.
- The store also holds the sidebar's whole-vault entry list (`entries`, `entriesByPath`, `getEntryByPath`). That is an internal data shape; query the index with `ctx.kb()` instead. Setters (`setTypeMetadataMap`, `setEntries`, `patchEntries`, `setSelection`, `reset`) are internal.

```javascript
const items = ctx.app.typeDefinitionsStore.sortedTypes.map((t) => ({ id: t.name, title: t.name, description: t.folder ?? 'vault root' }));
const picked = await run.ui.pick({ title: 'Type', items });
if (!picked) return;
```

## `modCommandsStore`

**Raw.** Every action of every loaded mod, placed in the palette or not.

```ts
interface ModCommand {
	id: string;        // 'mod:<mod-id>:action:<action-id>'
	label: string;     // '<mod name>: <action title>'
	run(): void;       // invokes the action through the host
	palette: boolean;  // placed in the command palette
}
interface ModCommandsStore { readonly list: readonly ModCommand[] }
```

- `list` builds a **new array of new objects on every read**. Never return it from a `ctx.watch` read or compare rows by identity; watch `list.map((c) => c.id).join('\n')`.
- Look rows up at call time: a reload replaces the callbacks.
- `run()` goes through the host as if picked from the palette (origin `command`): it asks for the action's input when it has one, or reveals the live run when it is already running. It returns nothing; you cannot await the other action's completion or result.
- `run()` throws `Mod "<id>" is unloaded` when the owning mod is gone, and `Mod "<id>": unknown action id "<action-id>"` when the row is stale (the action was replaced since you read the list).
- `register`, `place` and `reset` are host internals.

```javascript
ctx.addAction({
	id: 'run-other',
	title: 'Run the journal action',
	run: () => {
		// The daily-journal example registers its action as 'add-entry' (help/examples/mods/daily-journal/main.js).
		const row = ctx.app.modCommandsStore.list.find((c) => c.id === 'mod:daily-journal:action:add-entry');
		if (!row) throw new Error('The daily-journal mod is not loaded');
		row.run();
	},
});
```

See [Actions and entry points](02-actions-and-entry-points.md#invoking-another-mods-action) for invoking other mods' actions.

## `railRegistryStore`

**Raw.** The rail shell's live registration point. Six registries; each `register*` call returns an unregister function.

| Method | Unique by | Registration | Read back with |
|--------|-----------|--------------|----------------|
| `registerAction(entry)` | `key` | `RailAction` | `actions` |
| `registerMenuItem(entry)` | `id` | `RailMenuItem` | `menuItems` |
| `registerNavigator(entry)` | `id` | `RailNavigator` | `navigators` |
| `registerLensProvider(entry)` | `kind` | `RailLensProvider` | `lensProviders` |
| `registerTodaySection(entry)` | `id` | `RailTodaySection` | `todaySections` |
| `registerFolderCreator(entry)` | `id` | `RailFolderCreator` | `folderCreators` |

```ts
interface RailAction {            // a rail button that runs something
	key: string;                    // also the button's data-rail-item
	label: string;                  // tooltip and accessible name
	icon: string;                   // 'pack:name' or a bare lucide name; unknown shows a fallback glyph
	color?: { light: string; dark: string };
	busy?: () => boolean;           // called while rendering; shows a pulsing dot
	run: () => void;                // called on click
}
interface RailMenuItem {          // an item in note-row and folder context menus
	id: string;
	label: string;
	on: readonly ('note' | 'folder')[];
	files?: 'markdown' | 'all';     // note rows only; default 'markdown'
	run: (target: { on: 'note' | 'folder'; path: string /* vault-relative, root = '' */ }) => void;
}
interface RailNavigator { id: string; label: string; icon: SvelteComponent; component: SvelteComponent; lens: () => { kind: string; target?: string } }
interface RailTodaySection { id: string; label: string; component: SvelteComponent }
interface RailFolderCreator { id: string; label: string; icon: SvelteComponent; fileName: string; create: (dir: string) => Promise<string> }
interface RailLensProvider {
	kind: string;
	resolve: (lens, ctx) => ResolvedLens | null;   // app-internal note row shapes
	newNote?: (lens, ctx) => NewNoteRule | null;
	headerAction?: { label: string; title: string; icon: SvelteComponent; failureMessage: string; run: (lens) => Promise<void> };
}
```

Semantics:

- Lists change only by replacement. Registering an entry whose key already exists **replaces** the earlier entry, and the replaced entry does **not** come back when yours unregisters. Built-in registrations you could clobber: navigator `calendar`, lens kind `day`, Today section `my-people`, folder creator `kanban`. Mod rail buttons and menu placements use keys starting `mod:<mod-id>:`. Use your own prefix outside that namespace, such as `mod-raw:<mod-id>:<name>`.
- Unregister removes exactly your entry (by identity). Calling it twice is harmless.
- **Your mod's unload does not remove raw registrations.** Wrap every unregister in `ctx.register(...)`.
- **Consumers do not guard providers.** A `busy`, `resolve` or `newNote` that throws breaks the render of the rail or note list; a `run` that throws surfaces as an uncaught error. Wrap your callbacks in `try`/`catch`.
- Navigators, Today sections, folder creators and header actions take Svelte 5 components. A plain-JavaScript mod cannot compile `.svelte`, and a component compiled into a bundled mod runs on a second copy of the Svelte runtime; whether the app can render it is not verified, so do not build on these. Built-in lens kinds are resolved before providers, so a provider can only add kinds.
- `registerAction` and `registerMenuItem` take plain data, but the stable wrappers already cover them: `ctx.addRailButton` (with the run picker, busy state and cleanup) and `ctx.labs.place(id, { menu })` (with `run.target`). Use the raw registries only for behavior those cannot express, such as a button that toggles a panel without opening a run.
- `reset()` drops every registration in the app. Never call it.

```javascript
// A rail button that toggles a mod's own panel, outside the run machinery.
let open = false;
const unregister = ctx.app.railRegistryStore.registerAction({
	key: `mod-raw:${ctx.mod.id}:panel`,
	label: 'Toggle my panel',
	icon: 'lucide:panel-right',
	busy: () => open,
	run: () => {
		try {
			open = !open;
			togglePanel(open); // your DOM code; see Custom UI
		} catch (err) {
			ctx.log('panel toggle failed', err);
		}
	},
});
ctx.register(unregister);
```

The rail calls `busy` while rendering and re-renders when app state it read changes. A plain variable in your mod is not reactive app state, so the dot above only updates on the rail's next re-render. See [Custom UI](08-custom-ui.md#rail-registries).

## `settingsStore`

**Raw.** The vault's live settings.

> [!WARNING]
> **Settings changes persist to disk.** Every change to `settingsStore.settings`, through a setter or by direct assignment, is written to `<vault>/.kokobrain/settings.json` about 500 ms later (out-of-range values are clamped first). The change is permanent and applies to the user's whole app, not only to your mod.
>
> Settings also hold **secrets**: `settingsStore.todoist.apiToken` and `settingsStore.sentry.dsn` are readable by any mod, and writable. Treat the store as **read-only**. Never send settings values off the device, and never log them.

Getters (each returns the live sub-object of `settingsStore.settings`):

`periodicNotes`, `quickCapture`, `oneOnOne`, `layout`, `folderNotes`, `editor`, `templates`, `appearance`, `history`, `search`, `autoOrganize`, `eventCalendar`, `todoist`, `sentry`, `debugMode`, `debugModeTauri`, `debugLogToFile`, `debugModRunMessages`, `debugTauriLogToFile`, `debugHeartbeat`, `livePreviewProfiling`, `disabledDecorators`, `tagColors`, `queryjs`, `updates`, `explicitOrganization`, `showUntypedNotes`, `typesBaseFolder`, `dockBadgeInboxCount`, and `settings` (the whole object).

Useful reads (defaults in parentheses; paths vault-relative unless noted):

| Read | Meaning |
|------|---------|
| `templates.folder` | Templates folder (`_system/templates`) |
| `templates.systemFolder` | System folder (`_system`); its files are not index pages |
| `periodicNotes.folder` | Periodic notes base folder (`_notes`) |
| `periodicNotes.daily.templatePath` | Daily note template path |
| `oneOnOne.peopleFolder`, `oneOnOne.workPeopleFolder` | People folders (`Personal/_people`, `Work/_people`) |
| `oneOnOne.folderFormat`, `oneOnOne.filenameFormat`, `oneOnOne.templatePath` | 1:1 note naming and template |
| `typesBaseFolder` | Base folder for typed notes (`''`) |
| `explicitOrganization` | New notes get `_organized: false` (`true`) |
| `editor.fontFamily`, `editor.fontSize` (19), `editor.lineHeight` (1.6) | Editor typography |
| `layout.railFolder`, `layout.railExpandedFolders` | Files navigator state (absolute paths) |
| `layout.rightSidebarVisible`, `layout.railCollapsed` | Layout state |

Setters, for completeness: `updateLayout(partial)` (merges into `layout` in place, no validation), `updatePeriodicNotes`, `updateQuickCapture`, `updateOneOnOne`, `updateFolderNotes`, `updateEditor`, `updateTemplates`, `updateAppearance`, `updateHistory`, `updateSearch`, `updateAutoOrganize`, and the other `update*` methods (shallow merges); `setSettings(all)` replaces everything. Several `layout` fields are loaded without validation, so a wrong shape can corrupt the sidebar state until the user fixes the settings file. If you must write (for example `updateLayout({ rightSidebarVisible: true })`), write only documented fields with the exact type they have today, and tell the user in your mod's description.

```javascript
// Read-only use: list the person notes of the configured people folders for a custom picker.
const { peopleFolder, workPeopleFolder } = ctx.app.settingsStore.oneOnOne;
const people = [
	...(await ctx.vault.list(peopleFolder).catch(() => [])),
	...(await ctx.vault.list(workPeopleFolder).catch(() => [])),
].filter((e) => !e.isFolder && e.name.endsWith('.md'));
```

Keep your mod's own settings in [`ctx.saveData`](05-mod-data.md), never in the app's settings.

## `openOrCreateNote`

**Raw.** The app's "open this note, creating it from a template when missing" pipeline.

```ts
openOrCreateNote(options: {
	filePath: string;                         // absolute, required
	title: string;                            // required; feeds `tp.file.title` in the template
	templatePath?: string;                    // ABSOLUTE template path
	inlineTemplate?: string;                  // used when templatePath is unset or unreadable
	customVariables?: Record<string, string>; // extra template variables
	contextDate?: Dayjs;                      // what `tp.date.now()` resolves to (dayjs only)
	buildContent?: (content: string) => string; // rewrites the rendered text; only on creation
}): Promise<void>
```

- Existing file: only opens it. Template and `buildContent` are ignored, and the name is **not** deduplicated.
- Missing file: creates the parent folders, renders the template (`<% %>` expressions), applies `buildContent`, creates the file, indexes it at once, adds it to the file tree, and opens it.
- No template and no inline template: creates an empty file.
- Failures are logged and **rethrown**: it rejects, with no toast. A `buildContent` throw rejects with nothing written.
- No path validation: it will create files outside the vault or with any extension. Build `filePath` from `ctx.app.vaultStore.path` and check it yourself.
- Explicit organization is **not** applied here (unlike `createTypedNote`); add `_organized: false` in `buildContent` if you want it.

```javascript
const root = ctx.app.vaultStore.path;
const d = new Date();
// The local day, as everywhere in the app: toISOString() is the UTC day, which differs late in the evening.
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
await ctx.app.openOrCreateNote({
	filePath: `${root}/Meetings/${date} Standup.md`,
	title: `${date} Standup`,
	templatePath: `${root}/${ctx.app.settingsStore.templates.folder}/Standup.md`,
	inlineTemplate: '# <% tp.file.title %>\n\n## Notes\n',
});
```

## `saveFileByPath`

**Raw.**

```ts
saveFileByPath(absolutePath: string): Promise<boolean>
```

- Saves an **open** tab's current content when it is dirty. Saves of one path are queued, never parallel; a queued save writes the tab's content as it is when its turn comes.
- Resolves `true` when written, or when there is nothing to do (no tab for that path, a virtual tab, not dirty). It cannot save a closed file: use `ctx.vault.write` or `updateNoteFrontmatter`.
- Resolves `false` on a write failure (never rejects): the app logs it and shows the toast `Failed to save file.`. Do not toast again.
- After a successful write: marks the tab saved and runs the after-save pipeline (file history, Auto Organize, indexing, `ctx.onNoteSaved`).

```javascript
const path = ctx.app.editorStore.activeTabPath;
if (path && !(await ctx.app.saveFileByPath(path))) run.log('Save failed');
```

## `syncExternalContentToEditor`

**Raw.** Puts text into an open tab as if it came from outside (a write the app did not make through the editor).

```ts
type AutoSaveSchedule = 'frontmatter' | 'body' | 'none';
syncExternalContentToEditor(absolutePath: string, content: string, markSaved: boolean, schedule: AutoSaveSchedule): void
```

All four arguments are required.

- No tab with that exact path: does nothing.
- `markSaved: true`: sets both `content` and `savedContent`. Use it **after** you wrote these bytes to disk yourself: it does not write them.
- `markSaved: false`: sets only `content`; the tab becomes dirty.
- `schedule`: `'frontmatter'` arms the 500 ms autosave, `'body'` the 2 s one, `'none'` arms nothing. With `markSaved: false` and `'none'` the tab stays dirty with no timer: follow with `await saveFileByPath(path)`, or pass `'body'`.
- Active tab: CodeMirror replaces its document by a minimal diff, adds **no** undo step, and does not fire the typing pipeline. The caret is put back at its **old character offset** (clamped to the new length), not mapped through the change, and a selection collapses: text inserted above the caret moves it backwards relative to the user's text (see [Known problems](#known-problems-caret-and-empty-block)). Background tab: only the store changes; CodeMirror picks it up on switch, with the same old caret offset.
- Synchronous; returns nothing.

```javascript
// Replace a whole open note's text and let autosave write it.
const abs = ctx.app.editorStore.activeTabPath;
const tab = ctx.app.editorStore.activeTab;
if (!abs || !tab) throw new Error('Open a note first');
ctx.app.syncExternalContentToEditor(abs, tab.content.replace(/\bTODO\b/g, 'DONE'), false, 'body');
```

Prefer [`editorView.dispatch`](#safe-edit-patterns) for user-facing edits (undoable, precise, the caret stays with the text) and [`editNote`](#edit-a-note-whether-or-not-it-is-open) when the note may be closed.

## Choosing a route

| Goal | Route |
|------|-------|
| Edit the active note (keep unsaved edits, undoable) | `editorView.dispatch(...)` after the checks in [Safe edit patterns](#safe-edit-patterns) |
| Edit a note that may be open or closed | [`editNote`](#edit-a-note-whether-or-not-it-is-open) |
| Change frontmatter | [`updateNoteFrontmatter`](#updatenotefrontmatter); on the active note, mind the [caret](#known-problems-caret-and-empty-block) |
| Read or write tags | [Frontmatter tags](#frontmatter-tags) |
| Create a note from a type | [`createTypedNote`](#createtypednote) with `ensureTypeLine`, then `openFileInEditor` |
| Link to a note | [Writing a wikilink](04-vault-files.md#writing-a-wikilink) |
| Create today's daily or 1:1 note | [`openOrCreateDailyNote`](#openorcreatedailynote), [`createOneOnOneNote`](#createoneononenote) |
| Create a note from any template | [`openOrCreateNote`](#openorcreatenote) |
| Create a plain file with exact content | `ctx.vault.create` ([Vault files](04-vault-files.md#createpath-content)) |
| Open a note at a line | [`openNoteAt`](#opennoteat) |
| Query notes | [`ctx.kb()`](10-querying-the-index.md) |

## Related

- [Querying the index](10-querying-the-index.md)
- [Vault files](04-vault-files.md): `ctx.vault`, index lag, editing notes that may be open
- [Events and reactivity](07-events-and-reactivity.md): `ctx.watch`, `ctx.register`
- [Custom UI](08-custom-ui.md): rail registries in context
- [API reference](13-api-reference.md)
- [Mods user guide](../28-mods.md)
