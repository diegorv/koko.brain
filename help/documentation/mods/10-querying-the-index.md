# Querying the Index (`ctx.kb()`)

`ctx.kb()` gives a mod the same `kb` object a [QueryJS](../13-queryjs.md) block gets: every note's frontmatter, tags, tasks and links, already parsed. This page covers what matters when a mod uses it: how fresh the data is, what it costs, how to scope a query, the page fields, and the subset of the QueryJS API mods use most. The full API (render helpers, `kb.ui`, dates, aggregation) is in [QueryJS](../13-queryjs.md); it is not repeated here.

Stability: **raw**. `ctx.kb()` exposes the QueryJS `kb` object, which has its own versioned contract (`kb.version === 1`, see [API version and compatibility](../13-queryjs.md#api-version-and-compatibility)), but the way a mod reaches it has no compatibility promise.

## What `ctx.kb()` returns

```ts
ctx.kb(): Promise<KB>   // a function call: `await ctx.kb()`, not `ctx.kb`
```

- Each call resolves to a **new** `kb` object over the app's current index snapshot.
- It rejects with `Mod "<id>" is unloaded` when the mod unloaded or the vault changed before or during the call, and with the IPC error when the snapshot cannot be read.
- `kb.current()` is the page of the note that was the active tab **when `ctx.kb()` was called**, or `null` (no tab, a virtual or non-note tab, a note not indexed yet). A mod has no "calling note" the way a QueryJS block does.
- `kb.container` is a detached `<div>`. The render helpers (`kb.paragraph`, `kb.table`, `kb.ui.*`, ...) append to it; it shows nothing until you insert `kb.container` into the page yourself (see [Custom UI](08-custom-ui.md#mounting-into-app-regions)). Most mods only read data and write notes.

The members a mod uses most:

```ts
interface KB {
	pages(source?: string): DataArray<Page>;     // listed notes, optionally filtered by a source
	pagePaths(source?: string): DataArray<string>; // their absolute paths
	page(absolutePath: string): Page | undefined;  // any indexed file, listed or not
	current(): Page | null;
	date(input?: string | number | Date): KBDateTime;
	tryDate(value: unknown): KBDateTime | null;
	number(value: unknown): number;                // Number(value), 0 when not numeric ("3" -> 3, "x" -> 0)
	array(raw: unknown): DataArray<unknown>;
	fileLink(path: string, embed?: boolean, display?: string): { path: string; display: string };
	readonly container: HTMLElement;
}
```

## Freshness and lag

`ctx.kb()` does **not** take a fresh snapshot. A page is built from two app caches that the sidebar and QueryJS blocks share, and they refresh on different schedules:

| Page data | Source | After a write by the app or a mod |
|-----------|--------|------------------------------------|
| Which notes exist, `file.path`/`name`/`folder`, frontmatter keys, `_type`, `organized`/`archived`/`favorite`, root `tags` | The property index | Current at once: the next `ctx.kb()` call sees it |
| `file.tasks`, `file.tags`, `file.outlinks`, `file.inlinks` | The index snapshot | Throttled: refreshed about **2 s** after a change, at most once per **10 s** during a burst |

- `file.size`, `file.ctime` and `file.mtime` also come from the snapshot side: a note created a moment ago shows `0` for them until it refreshes.
- A `kb` object keeps the page set it read first for its whole life. Call `ctx.kb()` again to see later changes.

So right after `ctx.vault.create`, `ctx.vault.write`, `createTypedNote` or `updateNoteFrontmatter`, a new `ctx.kb()` lists the note with its new frontmatter, but its tasks, tags and links can be 2 to 10 s old (a new note has none yet). The index also follows the editor: the active note's text, saved or not, reaches the property index about 1 s after typing stops. For the exact current text read `ctx.app.editorStore.activeTab.content`.

At startup, before the vault's first index build, the index can be empty. A mod that queries in `onload` should check `ctx.app.vaultStore.indexReady` first and wait for it:

```javascript
function whenIndexReady(ctx, callback) {
	if (ctx.app.vaultStore.indexReady) return callback();
	const stop = ctx.watch(() => ctx.app.vaultStore.indexReady, (ready) => {
		if (!ready) return;
		stop();
		callback();
	});
}
```

### Seeing your own write

Frontmatter you just wrote is in the next `ctx.kb()` already (see the table above). For the snapshot side (tasks, `file.tags`, links), the simplest fix is not to read your own write back from the index: keep what you wrote in memory, or read the file with `ctx.vault.read`. When you do need the index:

1. Call `ctx.app.vaultStore.requestPromptIndexRefresh()` **right before** the write. The next index update then refreshes the snapshot at once instead of after the throttle. It is a one-shot flag consumed by the next index event, whatever caused it.
2. After the write, poll `ctx.kb()` until the page shows what you expect, with a timeout.

```javascript
/** Calls ctx.kb() until `ready(kb)` is true or the timeout passes; resolves to the last kb either way. */
async function kbUntil(ctx, ready, signal, timeoutMs = 12000) {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const kb = await ctx.kb();
		if (ready(kb) || Date.now() >= deadline || signal.aborted) return kb;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
}

// Inside an action: append a task with ctx.vault.write, then wait until the index lists it.
const rel = 'Inbox/Todo.md';
const abs = `${ctx.app.vaultStore.path}/${rel}`;
const text = await ctx.vault.read(rel);
ctx.app.vaultStore.requestPromptIndexRefresh();
await ctx.vault.write(rel, `${text.replace(/\n*$/, '\n')}- [ ] Call Ada\n`);
const kb = await kbUntil(ctx, (k) => !!k.page(abs)?.file.tasks.some((t) => t.text === 'Call Ada'), run.signal);
```

Repeated `ctx.kb()` calls at the same index state reuse the same pages, so polling is cheap until the snapshot changes. `ctx.app.vaultStore.vaultIndexVersion` grows on every snapshot refresh if you prefer to watch for it.

## Cost

- The first `pages()`, `page()` or `current()` call after the index changed (any save, create or snapshot refresh, and about 1 s after the user stops typing) builds a page object for **every** note in the vault (frontmatter, tags, tasks, resolved links, backlinks). This takes time proportional to the vault: noticeable on thousands of notes. The app's session log, when one is being written, records each build as `QJS-PROFILE ensureCache N=<pages> <ms>`.
- The built set is shared by every `kb` at the same index state (QueryJS blocks and all mods). If a block already built it, your call is nearly free.
- A source (`'"Projects"'`) filters the returned list; it does not make the build cheaper. What scoping saves is everything after: fewer rows to sort, map, render, write into a report, or show in a picker, and no private notes leaking into a result.
- Do not call `ctx.kb()` on every keystroke or every `ctx.onNoteSaved` event. Debounce it (see [Events and reactivity](07-events-and-reactivity.md#debouncing-and-performance-on-the-main-thread)).
- **Pages are shared objects.** Never assign to a page or call `DataArray.mutate`: the change shows up in every QueryJS block and every mod until the index changes. Treat pages as read-only; copy what you need (`.array()` gives a plain array of the same objects, `{ ...page }` a shallow copy).

## Scoping

A real vault holds the user's private notes. Every query in a mod should read only the folder it is about, or cap its rows:

- A non-empty folder source: `kb.pages('"Projects"')`.
- Or an explicit `.limit(n)` in the same chain.
- Or a `file.folder` / `file.path` predicate in the same chain.

Traps (all of these read **every** page):

| Query | Why |
|-------|-----|
| `kb.pages()`, `kb.pages('')` | No source |
| `kb.pages('""')` | Empty folder is not a folder source. Watch template strings: `` kb.pages(`"${folder}"`) `` with `folder === ''` is this case. A folder-menu `run.target.path` is `''` for the vault root |
| `kb.pages('"/"')` | The vault root, i.e. everything |
| `kb.pages('Projects')` | Unquoted: not parsed, no filter |
| `kb.pages('"Projects" and #todo')` | Compound sources are not supported and read everything. Use the folder source and narrow with `.where` |
| `const all = kb.pages(); ... all.where(...)` | Narrowed in a later statement: the read is still the whole vault |
| `kb.pages('#project')` | A tag source filters, but across the whole vault; it is not a scope. Add `.limit(n)` or a folder predicate |

Some malformed sources match **nothing** instead: `'"A" or "B"'` reads as one folder named `A" or "B`, and `'#a and #b'` as one tag named `a and #b`. Both silently return an empty list.

See also [help/examples/SCOPING.md](../../examples/SCOPING.md), the rule the bundled examples follow.

## Sources for `kb.pages(source)`

| Source | Matches |
|--------|---------|
| `'"Projects"'` or `"'Projects'"` | That folder and all its subfolders, by whole path segments (`"Pro"` does not match `Projects/`), ignoring case. Matching quotes are required |
| `'"Work/Clients"'` | A nested folder, vault-relative |
| `'"/Projects"'` | Same as `"Projects"`: a leading `/` is anchored at the vault root |
| `` `"${absFolder}"` `` | An absolute folder inside the vault works too, e.g. `` kb.pages(`"${page.file.folder}"`) `` |
| `'#tag'` | Pages with that tag or a nested tag (`#tag/sub`), ignoring case |
| anything else | No filter: every page |

## What is a page

`kb.pages()` lists **notes**. It leaves out:

- `.view` files;
- type definition notes (`_type: Type`);
- every file under the system folder (Settings, Files & Folders, System folder; `_system` by default), which includes templates and every mod's folder `_system/mods/`.

Archived notes **are** included: filter with `.where((p) => !p.archived)`. `kb.page(absolutePath)` still finds `.view` files, type definitions and system-folder files.

## Page fields

```ts
interface Page {
	file: {
		path: string;       // absolute path
		name: string;       // file name with extension, 'Idea.md'
		basename: string;   // without extension, 'Idea'
		folder: string;     // absolute parent folder
		link: { path: string; display: string };
		tags: string[];     // frontmatter + inline tags, without '#'
		inlinks: { path: string; display: string }[];  // notes linking here
		outlinks: { path: string; display: string }[]; // resolved targets this note links to
		size: number;       // bytes
		ctime: number;      // creation time, ms
		mtime: number;      // modification time, ms
		tasks: Task[];
	};
	// Always present:
	tags: string[];       // frontmatter + inline tags like file.tags, but current at once (file.tags lags); overrides a frontmatter key `tags`
	organized: boolean;   // `_organized` flag, default true
	archived: boolean;    // `_archived` flag, default false
	favorite: boolean;    // `_favorite` flag, default false
	// Present when set:
	_type?: string;       // the note's type, first letter uppercased ('Project')
	_belongs_to?: string[]; _related_to?: string[]; _has_many?: string[]; // wikilink targets as written; the raw value when it holds no wikilink
	// Every other frontmatter key, as is:
	[key: string]: unknown;
}

interface Task {
	text: string;       // without the '- [ ] ' prefix
	completed: boolean; // true for ANY checkbox character but a space: [x], [/], [>], [-] all count
	line: number;       // 1-based line in the file
	path: string;       // absolute path of the note
}
```

Details that bite:

- **Paths are absolute** everywhere in `kb`: `file.path`, `file.folder`, link paths, `task.path`. Convert before passing them to `ctx.vault` (see [below](#from-kb-paths-to-ctxvault-paths)).
- Frontmatter keys sit on the page root (`p.status`, `p.rating`), not under `p.frontmatter`. A key named `file` is dropped.
- A frontmatter string that starts like a date (`2026-11-08...`) becomes a `KBDateTime` object, not a string. Use `p.created.toISODate()`, `p.created.ts`, or compare with `<` and `>`. Check `typeof value.toISODate === 'function'` before relying on it: a hand-typed value may be anything.
- Values keep their YAML type, and YAML may give a string where you expect a number (`"3"`). Use `kb.number(value)`.
- The relationship keys hold wikilink **targets as written** (`'work/Hub'`, `'Hub'`), with alias and heading removed. They are not resolved paths. To resolve one, match against `file.outlinks` (resolved, absolute) or against basenames yourself.
- `completed` is not "done": `[/]` (in progress) and `[>]` (forwarded) are `true` too. To find open tasks precisely, read the line from the file (`task.line`) and check its checkbox character.
- `inlinks` are matched by the target's file name, so two notes with the same name share backlinks. `outlinks` are resolved the way the app resolves wikilinks; `display` is the link's alias, or its target text.
- Tags have no `#` and keep their case as written; compare case-insensitively.

## DataArray: the subset that matters

`pages()` returns a `DataArray`, a chainable wrapper. The members mods use most:

| Member | Notes |
|--------|-------|
| `where(fn)` / `filter(fn)` | Keep items where `fn(item)` is truthy |
| `whereTag(...prefixes)` | Items with a tag equal to, or nested under, any prefix (no `#`) |
| `sort(keyFn?, 'asc' \| 'desc')`, `sortBy` | Compares keys with `<` and `>`. Strings sort by code unit (case-sensitive); `undefined` keys compare equal to everything, so give missing values a default: `sort((p) => p.priority ?? 99)` |
| `limit(n)` | The first `n` items |
| `groupBy(keyFn)` | `DataArray<{ key, rows }>` in first-seen order. Keys are compared by identity: group dates by `d?.toISODate()` and lists by a joined string, never by the object |
| `distinct(keyFn?)` | Drops duplicates by key |
| `map(fn)`, `flatMap(fn)` | `flatMap` expects `fn` to return an array |
| `first()`, `last()`, `find(fn)`, `some(fn)`, `every(fn)` | |
| `length` | Count |
| `array()` | A plain array copy (use before `run.ui.pick`, JSON, spread) |
| `countBy(keyFn?)`, `sum`, `avg`, `min`, `max` | Aggregates |

Property shorthand: reading a name that is not a DataArray member maps it across the items and flattens arrays, at any depth: `kb.pages('"Projects"').file.tasks` is every task of those pages. A frontmatter key with the same name as a member (`length`, `limit`, `first`, ...) cannot be mapped this way; use `.map((p) => p.length)`.

The rest (`whereDate`, `byDate`, `stats`, `reduce`, `join`, dates, render helpers, `kb.ui`) is in [QueryJS](../13-queryjs.md#dataarray--chainable-functional-api).

## From `kb` paths to `ctx.vault` paths

`kb` paths are absolute; `ctx.vault`, `ctx.workspace` and `run.target` are vault-relative; `ctx.app` functions take absolute paths.

```javascript
/** Vault-relative path of an absolute index path; throws outside the vault. */
function toVaultPath(ctx, abs) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = abs.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`Not inside the vault: ${abs}`);
	return path.slice(root.length + 1);
}

/** Folder source for a vault-relative folder; refuses the root, which would read every page. */
function folderSource(folder) {
	const clean = folder.replace(/^\/+|\/+$/g, '');
	if (!clean) throw new Error('Choose a folder, not the vault root');
	return `"${clean}"`;
}
```

A page's path passes straight to `ctx.app.openFileInEditor(page.file.path)` and `ctx.app.updateNoteFrontmatter(page.file.path, ...)`, and needs `toVaultPath` for `ctx.vault.read(...)` and `ctx.workspace.openNote(...)`.

## Examples

All examples are action fragments for `onload(ctx)`. They use the two helpers above.

### Pick a note from a folder and open it

```javascript
ctx.addAction({
	id: 'open-project',
	title: 'Open a project',
	run: async (_input, run) => {
		const kb = await ctx.kb();
		const items = kb.pages('"Projects"')
			.where((p) => p._type === 'Project' && !p.archived)
			.sort((p) => p.file.mtime, 'desc')
			.map((p) => ({
				id: p.file.path,
				title: p.file.basename,
				description: `${toVaultPath(ctx, p.file.folder)} · ${String(p.status ?? 'no status')}`,
			}))
			.array();
		if (items.length === 0) throw new Error('No active projects in Projects');
		const picked = await run.ui.pick({ title: 'Open a project', items });
		if (!picked || run.signal.aborted) return;
		await ctx.app.openFileInEditor(picked.id);
	},
});
```

### Open tasks of a folder into a report note

```javascript
ctx.addAction({
	id: 'task-report',
	title: 'Report open tasks in Work',
	run: async (_input, run) => {
		const kb = await ctx.kb();
		const groups = kb.pages('"Work"')
			.where((p) => !p.archived && p.file.tasks.some((t) => !t.completed))
			.sort((p) => p.file.path)
			.limit(200)
			.array();
		const lines = ['# Open tasks in Work', ''];
		for (const page of groups) {
			lines.push(`## [[${toVaultPath(ctx, page.file.path).replace(/\.md$/i, '')}]]`, '');
			for (const task of page.file.tasks.filter((t) => !t.completed)) lines.push(`- ${task.text} (line ${task.line})`);
			lines.push('');
		}
		if (run.signal.aborted) return;
		const report = 'Reports/Open tasks.md';
		const text = lines.join('\n');
		if (await ctx.vault.exists(report)) await ctx.vault.write(report, text);
		else await ctx.vault.create(report, text);
		await ctx.workspace.openNote(report);
	},
});
```

`completed` counts `[/]` and `[>]` as done (see [Page fields](#page-fields)), so tasks in progress are left out of this report. Index text can be seconds old; see [Freshness and lag](#freshness-and-lag).

### Count notes by status

```javascript
ctx.addAction({
	id: 'status-count',
	title: 'Count projects by status',
	run: async (_input, run) => {
		const kb = await ctx.kb();
		const groups = kb.pages('"Projects"')
			.where((p) => p._type === 'Project')
			.groupBy((p) => String(p.status ?? 'none'))
			.sort((g) => g.rows.length, 'desc')
			.array();
		await run.ui.alert({
			title: 'Projects by status',
			message: groups.map((g) => `${g.key}: ${g.rows.length}`).join('\n') || 'No projects',
		});
	},
});
```

### Notes changed in the last 7 days under a clicked folder

```javascript
ctx.addAction({
	id: 'recent-in-folder',
	title: 'Recently changed notes here',
	run: async (_input, run) => {
		if (!run.target || run.target.on !== 'folder') throw new Error('Use this from a folder menu');
		const source = folderSource(run.target.path); // refuses the vault root
		const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
		const kb = await ctx.kb();
		const items = kb.pages(source)
			.where((p) => p.file.mtime >= since)
			.sort((p) => p.file.mtime, 'desc')
			.limit(100)
			.map((p) => ({ id: p.file.path, title: p.file.basename, description: new Date(p.file.mtime).toLocaleString() }))
			.array();
		if (items.length === 0) return ctx.notify('Nothing changed here in the last 7 days');
		const picked = await run.ui.pick({ title: 'Changed in the last 7 days', items });
		if (picked && !run.signal.aborted) await ctx.app.openFileInEditor(picked.id);
	},
});
// Place it in the folder menu: ctx.labs.place('recent-in-folder', { menu: { on: ['folder'] } });
```

### Backlinks of the active note

`kb.current()` reads one page, not a list, so it needs no scope.

```javascript
ctx.addAction({
	id: 'backlinks',
	title: 'Pick a backlink of this note',
	run: async (_input, run) => {
		const kb = await ctx.kb();
		const page = kb.current();
		if (!page) throw new Error('Open an indexed note first');
		const items = page.file.inlinks
			.slice(0, 100)
			.map((link) => ({ id: link.path, title: link.display, description: toVaultPath(ctx, link.path) }));
		if (items.length === 0) return ctx.notify('No backlinks');
		const picked = await run.ui.pick({ title: `Links to ${page.file.basename}`, items });
		if (picked && !run.signal.aborted) await ctx.app.openFileInEditor(picked.id);
	},
});
```

### Tagged notes, capped

```javascript
const kb = await ctx.kb();
const reading = kb.pages('#reading')
	.where((p) => !p.archived)
	.sort((p) => p.file.ctime, 'desc')
	.limit(20)
	.map((p) => p.file.basename)
	.array();
```

### Next inbox note after organizing this one

```javascript
ctx.addAction({
	id: 'organize-next',
	title: 'Mark organized and open the next inbox note',
	run: async (_input, run) => {
		const abs = ctx.app.editorStore.activeTabPath; // captured before any await
		if (!abs || !abs.toLowerCase().endsWith('.md')) throw new Error('Open a note first');
		// Makes the sidebar's inbox list follow at once; the kb below needs no wait.
		ctx.app.vaultStore.requestPromptIndexRefresh();
		await ctx.app.updateNoteFrontmatter(abs, (props) => {
			// `organized:` arrives as `_organized`, so one filter removes either spelling.
			const rest = props.filter((p) => p.key !== '_organized');
			return [...rest, { key: '_organized', value: true, type: 'boolean' }];
		});
		if (run.signal.aborted) return;
		// Frontmatter reaches the index at the write, so this kb already sees the flag.
		const kb = await ctx.kb();
		const next = kb.pages('"Inbox"')
			.where((p) => !p.organized && !p.archived && p.file.path !== abs)
			.sort((p) => p.file.ctime)
			.first();
		if (!next) return ctx.notify('Inbox is empty');
		await ctx.app.openFileInEditor(next.file.path);
	},
});
```

The frontmatter write and its error handling are covered in [Raw app access](09-raw-app.md#updatenotefrontmatter).

## Related

- [QueryJS](../13-queryjs.md): the full `kb` API
- [Raw app access](09-raw-app.md): `vaultStore`, `updateNoteFrontmatter`, opening notes
- [Vault files](04-vault-files.md): `ctx.vault`, index lag after writes
- [Events and reactivity](07-events-and-reactivity.md): debouncing work on saves
- [Mods user guide](../28-mods.md)
