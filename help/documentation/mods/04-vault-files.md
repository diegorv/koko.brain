# Vault Files: `ctx.vault` and `ctx.workspace`

How a mod reads, creates, writes, renames, moves and deletes files in the vault, and opens them in the editor. It covers the path rules, what each call does to the index, search, backlinks, open tabs and the after-save steps, and how to edit a note the user may have open without losing their typing.

| Member | Stability |
|--------|-----------|
| `ctx.vault.*`, `ctx.workspace.openNote` | **stable** (contract v1) |
| `ctx.app.editorStore`, `ctx.app.vaultStore` used by the helpers below | **raw** (no compatibility promise) |

For the mod's own state (settings, counters, caches) use [`ctx.loadData` / `ctx.saveData`](05-mod-data.md), not files in the vault.

## At a glance

Every method is `async`: every failure, a bad path or an unloaded mod included, is a rejected promise, never a synchronous throw.

| Method | Resolves to | Rejects with (host messages, verbatim) |
|--------|-------------|----------------------------------------|
| `read(path)` | the file's text | file system error (bare string) |
| `exists(path)` | `true` / `false` (files and folders) | file system error (bare string) |
| `list(folder)` | `{ name, path, isFolder }[]`, direct children, unsorted | file system error (bare string) |
| `create(path, content)` | `path`, exactly as passed | `"<path>" already exists; use write`, `Mod "<id>": vault.create needs string content`, Rust error (bare string) |
| `write(path, content)` | `undefined` | `"<path>" does not exist; use create`, `"<path>" has unsaved changes in an open tab`, `Mod "<id>": vault.write needs string content`, file system error (bare string) |
| `rename(path, newName)` | the new vault-relative path | `"<newName>" already exists in this folder`, `Mod "<id>": vault.rename needs a single name`, file system error (bare string) |
| `move(path, targetFolder)` | the new vault-relative path (unchanged if already there) | `"<name>" already exists in this folder`, file system error (bare string) |
| `delete(path)` | `undefined` | `Could not save "<absolute path>" before moving it to the Trash`, file system error (bare string) |
| `ctx.workspace.openNote(path)` | `undefined` | `"<path>" does not exist`, file system error (bare string) |

Every method also rejects with `Invalid vault path "<path>"` for a bad path (see [Paths](#paths)) and with `Mod "<id>" is unloaded` once the mod has unloaded or another vault is open. The unload check runs first, so an unloaded mod gets the unload error even for a bad path.

There is nothing else: no `append`, `stat`, `copy`, `mkdir`, binary read or write, recursive list, watch, or Trash restore.

## Paths

### Vault-relative paths

`ctx.vault`, `ctx.workspace`, `run.target.path`, the `ctx.onNoteSaved` callback and `ctx.mod.dir` all use **vault-relative** paths: `/`-separated, no leading slash, for example `Projects/Launch.md`.

The host checks every path before touching the disk. It rejects with `Invalid vault path "<String(path)>"` when the path:

- is not a string (`undefined` gives `Invalid vault path "undefined"`, an object `Invalid vault path "[object Object]"`),
- is empty,
- starts or ends with `/`, or contains `//` (an empty segment),
- has a `.` or `..` segment.

Two calls take `''` to mean the vault root: `list('')` and the target folder of `move(path, '')`. Nothing else can address the root (`exists('')` rejects).

The check is hygiene against typos, not a sandbox. It does **not** reject backslashes, `~`, leading or trailing spaces, names starting with `.` (`.obsidian/app.json`), or `...`. It does not normalize, resolve symlinks or add an extension: `create('Idea', 'x')` creates a file literally named `Idea`, not `Idea.md`. Pass the full file name.

> [!WARNING]
> Case is whatever the filesystem does. On a default macOS volume (case-insensitive) `exists('ideas/idea.md')` is `true` for `Ideas/Idea.md`, but the host's open-tab checks compare paths exactly. Always use the path exactly as the file has it (take it from `list`, `run.target` or the active tab), or `write` can miss a dirty tab and the editor can miss your change.

### Absolute paths and `ctx.app`

Everything under `ctx.app` (tab paths, `openNoteAt`, `updateNoteFrontmatter`, `dailyNotePath`, ...) and every path in `ctx.kb()` is **absolute**. The root is `ctx.app.vaultStore.path` (raw, no trailing slash), and the host builds absolute paths as `` `${root}/${path}` ``. These two helpers are the canonical conversion: every page of this reference and the [Cookbook](14-cookbook.md) copies them as they are, with the signature `(ctx, path)`.

```javascript
/** Vault-relative path (ctx.vault, run.target, onNoteSaved) to the absolute form ctx.app and ctx.kb() use. */
function toAbsolute(ctx, path) {
	return `${ctx.app.vaultStore.path}/${path}`;
}

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
```

Typical use: `toVaultPath(ctx, ctx.app.editorStore.activeTab.path)` for the open note, `toAbsolute(ctx, run.target.path)` before calling a `ctx.app` function. Two absolute paths are the same note when they are equal after `.replace(/\/{2,}/g, '/')`; compare them that way, since a tab keeps the `//` spelling it was opened with.

### Note names: `safeName`

A title the user typed or a mod built (a meeting subject, a fetched headline) is not a safe file name as it is. The canonical helper below turns it into one name, without extension; the [Cookbook](14-cookbook.md) copies it. It replaces:

- path separators `/` and `\`, which would put the note in another folder or fail the path check, and `:`, which Finder shows as a slash;
- `#`, `|`, `^`, `[` and `]`, which end a wikilink target early (`[[A#B]]` links to heading `B` of note `A`), so a note named with them cannot be linked;
- control characters (newlines from a paste).

It also drops leading dots: a name starting with `.` is a dotfile, which `ctx.vault.list` hides, the file explorer never shows and the index never reads, so the note seems lost. It caps the name at 200 UTF-8 bytes, under the 255-byte limit of a macOS file name, with room for `.md` and a ` 1` the app may add to deduplicate.

```javascript
/** A title as one safe file name without extension; '' when nothing is left (the caller refuses it). */
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

// const name = safeName(input);
// if (!name) throw new Error('Type a title with at least one letter or digit');
// await ctx.vault.create(`Meetings/${name}.md`, text);
```

`safeName` does not check for an existing note: `ctx.vault.create` rejects a taken path, and `createTypedNote` deduplicates by itself.

### Writing a wikilink

The app resolves a wikilink target in this order:

1. A target whose last segment has an extension (`[[Folder/Name.md]]`, `[[image.png]]`) names a file: the one at that vault-relative path first, else the first file whose path ends with it.
2. Otherwise, and when step 1 finds nothing, **by note name**: the file name without its extension, case-insensitive. On a name shared by several notes, the first one in the index wins, and that order is not something a mod can predict.
3. A target with a folder but no extension (`[[Folder/Name]]`) matches no note name (names have no `/`), so it falls back to its last segment: it resolves **by name only**, exactly like `[[Name]]`. The folder part pins nothing.

So:

| You write | Resolves to |
|-----------|-------------|
| `[[Name]]` | The note named `Name`, wherever it is. **The app's own style**: the 1:1 notes and relationships write this form. A rename keeps each link's written form (`[[Old]]` becomes `[[New]]`, `[[Folder/Old.md]]` becomes `[[Folder/New.md]]`), and writes the vault-relative path with extension (`[[A/New.md]]`) when another note already owns the new name |
| `[[Folder/Name]]` | The same as `[[Name]]`: the folder is ignored when another `Name` exists elsewhere |
| `[[Folder/Name.md\|Name]]` | Exactly `Folder/Name.md`, shown as `Name`. The only form that pins one file |

Write `[[Name]]` by default. Use the pinned form only when two notes may share a name and the link must reach one of them (a generated report that lists the notes of one folder, for example). Build the name with `safeName` when you create the note, so the target holds none of `# | ^ [ ]`. In a pinned link, the alias after `|` is display text; it can hold any character but `]` and `|`.

A path the mod did not name itself (a listed or picked note) can hold those characters. Check it with `isSafeWikilinkTarget` before linking, and write a note that fails as plain text instead (`Folder/Odd #1.md (not linked: unsafe name)`): the app reads `#` as a heading anchor, `^` as a block reference and `|` as an alias, so such a link reaches another note or none.

```javascript
/**
 * Whether `target` can sit between [[ and ]] as one link to itself: none of the characters that end
 * a target ([ ] | # ^), no backslash or angle brackets, no control or line/paragraph separator
 * characters, no edge spaces. \p{...} classes, not \u escapes: some write tools turn those into
 * literal separators, which break the regex literal.
 */
function isSafeWikilinkTarget(target) {
	return !/[[\]|#^\\<>\p{Cc}\p{Zl}\p{Zp}]/u.test(target) && target.trim() === target;
}
/** [[Name]] for a vault-relative note path. */
const wikilink = (path) => `[[${path.split('/').pop().replace(/\.(md|markdown)$/i, '')}]]`;
/** [[Folder/Name.md|Name]]: pins this exact file, shows its name. */
const pinnedWikilink = (path) => `[[${path}|${path.split('/').pop().replace(/\.(md|markdown)$/i, '')}]]`;
```

## Errors are not always `Error` objects

The host's own checks reject with an `Error`. File system failures from `read`, `exists`, `list`, `write`, `delete`, `rename`, `move` and `openNote`, and the Rust failures inside `create`, reject with a **bare string** passed through unchanged (Tauri sends plugin errors across IPC as strings). For those, `err.message` is `undefined`.

Bare strings come from `ctx.vault`, `ctx.workspace` and `ctx.app` calls (the app's functions pass file system errors through as they are). `ctx.loadData` and `ctx.saveData` are the exception: they wrap every failure, so they **always reject with an `Error`** (see [Mod data](05-mod-data.md)). `ctx.kb()` can also reject with a bare string, when the index snapshot read fails in Rust. Everything else on `ctx` throws an `Error`.

| Source | Shape |
|--------|-------|
| Path, content and existence checks, `Mod "<id>" is unloaded`, `"<path>" has unsaved changes in an open tab`, `vault.rename needs a single name` | `Error` |
| `rename` / `move` name collision: `"<name>" already exists in this folder` | `Error` |
| `delete` failing to save a dirty tab first | `Error` named `PreDeleteSaveError`, with `.path` (absolute) |
| Missing file, permission, folder-instead-of-file, and other OS errors | bare string (text from the file system plugin or the OS) |
| `create` failures in Rust, such as `File already exists: <absolute path>` (a race with the existence check) or `mkdir failed for <dir>: ...` | bare string |

So read error text through a helper, never `err.message`:

```javascript
/** The text of anything thrown. A Tauri rejection is a string, not an Error. */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}
```

Inside an action, just let the rejection propagate: the host shows `<mod name>: <action title> failed: <message>` and handles strings itself. Use `errorMessage` when you build your own text, for example in a timer or a `catch` that adds context:

```javascript
async function writeReport(ctx, path, text) {
	try {
		await ctx.vault.write(path, text);
	} catch (err) {
		throw new Error(`Could not update ${path}: ${errorMessage(err)}`);
	}
}
```

Every failure of a file system call inside `ctx.vault` (the OS errors, and the app service errors of `rename`, `move` and `delete`, such as `already exists in this folder` and `PreDeleteSaveError`) is also written to the mod's debug log under the tag `MOD:<id>` as `vault.<op> "<path>" failed: <message>`. The host's own checks (path, content, `already exists; use write`, `does not exist; use create`, unsaved tab, single name, unloaded) reject without a log line. `openNote` logs only a failed existence check, as `workspace.openNote "<path>" failed: <message>`. See [Errors and debugging](15-errors-and-debugging.md#ctxvault).

## Reading

### `read(path)`

Resolves to the file's text, for **any** file type: there is no extension filter. The bytes are decoded as UTF-8 without a fatal check, so a binary file or invalid UTF-8 does not reject; it decodes lossily with U+FFFD replacement characters. There is no binary read API, and reading then writing back a binary file corrupts it.

`read` returns what is **on disk**. If the note is open with unsaved edits, those edits are not in the result (they are in `ctx.app.editorStore.tabs[i].content`). A missing file or a folder path rejects with a bare string.

### `exists(path)`

`true` for a file **or** a folder, `false` when nothing is there. It cannot test the vault root. On a case-insensitive volume a differently cased path also returns `true`.

### `list(folder)`

Resolves to the folder's **direct children**, files and folders, as `{ name, path, isFolder }`:

- `path` is `folder + '/' + name` (just `name` for `list('')`), built from your argument, so it echoes whatever spelling you passed.
- **No order.** Entries come in whatever order the OS returns. Sort them yourself when order matters.
- **Every name starting with `.` is left out**, files and folders alike (`.DS_Store`, `.kokobrain`, `.git`).
- No filter otherwise: images, `.canvas`, `.view`, `.pdf` and `main.js` files are listed. `list('')` includes the system folder (templates, mods; see [Special folders](#special-folders)).
- No size, dates, extension or symlink flag. How a symlinked folder reports `isFolder` is unverified.
- A missing folder or a file path rejects with a bare string.

A recursive walk, iterative so deep trees cannot overflow the stack, with Stop support. One unreadable subfolder (permissions, a folder deleted during the walk) must not lose the rest, so failures are collected per folder; only a failure of the starting folder rejects:

```javascript
/**
 * Every file under `folder` ('' = vault root): `{ files, failed }`, files sorted.
 * `failed` lists the subfolders that could not be read, as `{ path, message }`.
 * `skip(path)` returning true leaves out a folder and everything in it.
 * Rejects when `folder` itself cannot be read, and with AbortError once `signal` aborts.
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

// Inside an action: every Markdown note in Projects, leaving out its Archive folder.
// const { files, failed } = await listFilesDeep(ctx, 'Projects', { signal: run.signal, skip: (p) => p === 'Projects/Archive' });
// const notes = files.filter((p) => p.toLowerCase().endsWith('.md'));
// for (const f of failed) run.log(`Could not read ${f.path}: ${f.message}`);
```

Tell the user about `failed` folders: a report or batch that silently skipped a folder looks complete when it is not.

Walking with `list` reads the disk and costs one call per folder. To find notes by tag, type or frontmatter, [`ctx.kb()`](10-querying-the-index.md) reads the index instead (raw; tasks, tags and links can lag a few seconds behind writes). The [folder-report example](../../examples/mods/folder-report/) walks a folder the same way, one `list` per folder, under a cancellable `run.ui.loading` dialog.

## Writing

### `create(path, content)`

Creates a **new** file at exactly `path` and resolves to `path` as you passed it. Order of checks: path, then content (non-string rejects `Mod "<id>": vault.create needs string content`), then existence.

- Rejects with `"<path>" already exists; use write` if anything (a file or a folder) is at the path. It never renames or adds a suffix.
- Creates every missing parent folder. New folders appear in the file explorer.
- Writes `content` verbatim as UTF-8 through a temp file renamed into place. No template, no frontmatter, no trailing newline added.
- Works for any extension. A `.md` / `.markdown` file is added to the vault index, full-text search and the semantic index at once; other files only go into the explorer.

What `create` does **not** do: it runs none of the after-save steps. No file history snapshot, no Auto Move evaluation, no `ctx.onNoteSaved` callbacks (in this mod or any other), and no vault-wide cache invalidation, so a QueryJS block may show the old result until the next index refresh or save. It does not open the file.

> [!TIP]
> To create a note **from the user's template** (a daily note, a typed note) use the raw app functions (`ctx.app.openOrCreateDailyNote()`, `ctx.app.createTypedNote(...)`, `ctx.app.openOrCreateNote(...)`), described in [Raw app](09-raw-app.md). `create` writes exactly your text.

> [!WARNING]
> **A "person note", "project note" or "meeting note" is usually a typed note.** When the vault has a type definition for it (check `ctx.app.typeDefinitionsStore.getTypeMetadata('Person')`), create it with [`createTypedNote`](09-raw-app.md#createtypednote). `create` of the same file makes an **untyped** note: it lands where you put it, not in the type's folder, gets no template, and lacks the `_organized: false` that new notes get while Explicit organization is on, so it skips the Inbox and the type's views and features.

A file created inside a dot-folder (`.kokobrain/x.md`) lands on disk but never enters the file explorer. Do not do it.

### `write(path, content)`

Overwrites an **existing** file and resolves to `undefined`. Order: path, content (`Mod "<id>": vault.write needs string content`), existence, open tab.

1. If nothing exists at the path: rejects `"<path>" does not exist; use create`. (A folder passes this check, then the write fails with a bare string.)
2. If an open tab holds this file with **unsaved changes**: rejects `"<path>" has unsaved changes in an open tab`, nothing written.
3. Writes the text in place (not atomic, unlike `create` and `saveData`). A file deleted since the check is not recreated; the write rejects.
4. If a **clean** tab holds the file, it now shows the new text and stays clean (its saved copy is updated too). If that tab is the active one, the editor replaces its document by a minimal diff with no undo entry, and puts the caret back at its **old character offset**, not mapped through the change (a range selection collapses to that point). Text inserted before the caret therefore moves the caret backwards relative to the user's text: after a write that adds 30 characters of frontmatter, the next keystroke lands 30 characters earlier, often inside the `---` block. A background tab gets the same offset back when the user returns to it. No autosave is armed. To change the **active** note, edit through the editor instead ([below](#editing-a-note-that-may-be-open)), which keeps the caret with the user's text.
5. Runs the after-save steps, as if the user had saved the file in the editor (see below), unless the file is mod code.

There is **no equality guard**: writing identical text runs the whole pipeline again (index update, QueryJS invalidation, Auto Move check, `onNoteSaved`). Only file history skips it: a snapshot identical to the file's latest one is not stored. Use [`upsertNote`](#generated-notes-upsertnote) to skip identical writes.

> [!WARNING]
> A save callback that writes the note it was told about calls itself again. `ctx.onNoteSaved` fires for `ctx.vault.write`, including the mod's own. Compare old and new text before writing. See [Events](07-events-and-reactivity.md#avoiding-save-loops).

There is a small window between the dirty-tab check and the disk write. Keystrokes typed in it are replaced by the written text. The host does not guard it; editing through the editor (below) avoids it for the active note.

### What each write updates

| | `create` | `write` (any file outside `_system/mods/`) | `write` to mod code under `_system/mods/` | `saveData` |
|---|---|---|---|---|
| Vault index (backlinks, tags, outgoing links) | yes, `.md`/`.markdown` | yes, `.md`/`.markdown` | no | no |
| Full-text and semantic search | yes, `.md`/`.markdown` | yes, names ending `.md`/`.markdown` (case-sensitive) | no | no |
| File explorer | yes (new entry) | already there | already there | no (dot-folder) |
| Clean open tab updated | n/a | yes | yes | n/a |
| File history snapshot | no | **yes, for any file type** (skipped when identical to the latest snapshot) | no | no |
| Auto Move evaluation | no | yes (any file but `.view`), when Auto Move is on and has rules or type definitions | no | no |
| `ctx.onNoteSaved` of every mod | no | **yes, for any file type** | no | no |
| Vault-wide caches dropped (QueryJS results, unlinked mentions, kanban) | no | yes | no | no |
| Reloads the mod when the file is its `main.js` or `manifest.json` | yes | n/a | **yes** | n/a |

"Mod code" means a file under `<vault>/_system/mods/` whose name does not end in `.md`, `.markdown` or `.view`. Everything else gets the full after-save pipeline, so writing `Data/state.json` or `board.canvas` adds a file history snapshot, may trigger an Auto Move rule and fires `onNoteSaved` with that path. Filter by extension in save callbacks.

> [!NOTE]
> **Auto Move can move the note you just wrote.** When Auto Move is on and has rules (its own, or the lifecycle rules of type definitions), `write` schedules a rule check after its debounce. A note that matches a rule moves to another folder, so a path you hold may stop existing a moment later. Re-check with `exists` before a later write, or catch the `does not exist; use create` rejection.

### Index lag

The vault index and full-text search are updated at the call (the update itself is fire-and-forget, so it finishes a moment later). [`ctx.kb()`](10-querying-the-index.md) sees a new note and its frontmatter (`_type`, organized/archived/favorite, root tags) at once. Only `file.tasks`, `file.tags`, links, size, ctime and mtime follow a throttled snapshot that refreshes about 2 s after a change, up to about 10 s during a burst. A mod that writes and immediately reads those from `ctx.kb()` may not see its own change: keep what you wrote in memory instead of re-querying, or see [Querying the index](10-querying-the-index.md#seeing-your-own-write) for `vaultStore.requestPromptIndexRefresh()` (raw).

## Editing a note that may be open

`write` refuses a note with unsaved edits, and on a clean active tab it replaces the whole document. When the user may have the note open, edit it through one of two routes:

1. **Through the editor**, when the **active** tab is exactly this note and the editor is really showing it: apply one minimal change with the CodeMirror view's `dispatch`. The user's unsaved edits stay, the caret and undo history behave as if they had typed it, and autosave writes the result (500 ms for a frontmatter change, 2 s for the body). Nothing is on disk until then.
2. **Through the disk** in every other case: `read`, change, `write` only if the text changed. A **background** tab with unsaved edits makes `write` reject with `"<path>" has unsaved changes in an open tab`. That rejection is correct: the user sees it, nothing is lost, and they can save and retry.

The check "the editor is really showing this note" matters. The app has one CodeMirror view shared by all tabs, and right after a tab switch (or `openNote`) the active tab can already be the new note while the view still holds the previous document. Dispatching then would put the edit into the wrong note. Comparing the view's text with the tab's `content` catches it; the helper then falls back to the disk route, which is safe: a clean tab takes the written text, and a tab with unsaved edits (one that was already open) makes the write reject.

> [!WARNING]
> **Compare with line breaks normalized.** CodeMirror's document always uses `\n`, but a tab's `content` keeps the file's raw text (`\r\n` for a note written on Windows or by some sync tools) until the user's first edit. A plain `view.state.doc.toString() === tab.content` is then false for as long as the note is open, and the editor route is never taken. Compare with `tab.content.replace(/\r\n?/g, '\n')`, as `editNote` does. The editor route then hands `edit` the `\n` text, and the note is saved with `\n` line breaks, as it would be after any edit by the user.

Only the editor route keeps the caret with the user's text. `ctx.vault.write`, `updateNoteFrontmatter` and `syncExternalContentToEditor` on the active tab put the caret back at its old offset (see [`write`](#writepath-content)). The disk route of `editNote` reaches the active tab only in the moment while the editor is still switching to it. A mod that changes notes from a background trigger (a save callback, a timer, a watch) and cannot use the editor route, for example to set frontmatter, should leave the active note alone and change it once the user has switched away (see [Events](07-events-and-reactivity.md#avoiding-save-loops)).

### `editNote`

The canonical helper for "change note X, which the user may have open"; the [Cookbook](14-cookbook.md) and the examples copy it. Paste it with `toVaultPath` from [Paths](#absolute-paths-and-ctxapp).

```javascript
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
```

Why it is built this way:

- **Read the view and tab right before the change, with no `await` in between.** Both are re-read on every call; never keep `editorView` across an `await` (switching to a canvas, kanban or collection tab and back mounts a new view, and the old one reports `dom.isConnected === false`).
- **One minimal change, not a whole-document replace.** CodeMirror maps the caret through a dispatched change, so it stays with the user's text. A full replace would move the caret, put the whole note in undo history and rebuild every Live Preview widget.
- **Line breaks are normalized before the comparison.** Without it a CRLF note never takes the editor route (see the warning above).
- **`edit` runs once and sees the freshest text.** Put last-moment checks inside it: return `text` unchanged to cancel (for example when `run.signal.aborted`, or when the line you would add is already there).
- **Unchanged text writes nothing**, so a rerun is cheap and does not fire `onNoteSaved`.
- **`edit` sees the note's own line breaks on the disk route.** There it gets the file's raw text, `\r\n` throughout for a CRLF note, while the editor route hands it `\n` text. An `edit` that adds lines with a hard-coded `\n` leaves a CRLF file with mixed line endings; build added text with the note's line ending, as `appendLines` below does. (After the user's first edit in the app the note is saved with `\n` anyway.)
- **Paths with `//` are matched by hand.** The app builds some paths from folder settings (`dailyNotePath` with a folder set to `Journal/` gives `.../Journal//<date>.md`), and the tab then carries that spelling. `ctx.vault.write` compares tab paths exactly, so on its own it would miss that tab's unsaved edits and leave a clean one showing the old text.

The editor route and the `//` handling go through `ctx.app.editorStore` and `ctx.app.syncExternalContentToEditor`, which are **raw**. The rest of the disk route uses only stable APIs.

### Using it

The open note, appended with a timestamped line. The path is captured **before** any `await`, so a tab switch during the dialog cannot redirect the edit:

```javascript
export default {
	onload(ctx) {
		ctx.addAction({
			id: 'stamp',
			title: 'Add a line to the open note',
			input: { placeholder: 'Line to add' },
			run: async (input, run) => {
				const line = input.trim();
				if (!line) throw new Error('Type a line');
				const tab = ctx.app.editorStore.activeTab;
				if (!tab || !tab.path.toLowerCase().endsWith('.md')) throw new Error('Open a note first');
				const target = tab.path;
				const ok = await run.ui.confirm({ title: 'Add the line?', message: line });
				if (!ok || run.signal.aborted) return;
				await editNote(ctx, target, (text) => {
					if (run.signal.aborted || text.includes(line)) return text;
					return appendLines(text, [line]);
				});
				ctx.notify('Added', { kind: 'success' });
			},
		});
	},
};

/** `text` with `lines` added at the end, each on its own line, in the note's line ending: a CRLF note stays CRLF. */
function appendLines(text, lines) {
	if (lines.length === 0) return text;
	const eol = text.includes('\r\n') ? '\r\n' : '\n';
	const gap = text === '' || text.endsWith('\n') ? '' : eol;
	return `${text}${gap}${lines.join(eol)}${eol}`;
}

// changedRange, editNote and toVaultPath from above go here, in the same file.
```

For a vault-relative path (from `run.target`, `list`, `onNoteSaved`) call `editNote(ctx, toAbsolute(ctx, path), edit)`. The [daily-journal example](../../examples/mods/daily-journal/) uses this pattern on today's daily note, and [note-tools](../../examples/mods/note-tools/) uses `run.target` with an active-note fallback.

> [!TIP]
> To change only frontmatter properties, `ctx.app.updateNoteFrontmatter(absolutePath, mutate)` (raw) handles both open and closed notes, and keeps unsaved body edits. It writes nothing only when the rebuilt text equals the file byte for byte, which holds only for frontmatter already in the app's canonical form; to skip the write, throw a sentinel from `mutate` and catch it (see [the cookbook](14-cookbook.md#5-set-toggle-and-remove-frontmatter-properties)). On the **active** note it moves the caret (old offset kept, not mapped), and on a note that starts with an empty `---`/`---` block it adds a second block. Both, with their workarounds, are in [Raw app](09-raw-app.md#updatenotefrontmatter).

### Checking for unsaved edits before a multi-note change

When a run changes several notes, check every background tab **before** the first write, so a refusal cannot leave half the change done:

```javascript
/** Whether an open tab holds unsaved edits of the note at vault-relative `path`. */
function hasUnsavedTab(ctx, path) {
	const root = ctx.app.vaultStore.path;
	return ctx.app.editorStore.tabs.some((tab) =>
		tab.path.startsWith(`${root}/`) && toVaultPath(ctx, tab.path) === path && tab.content !== tab.savedContent);
}
```

Also order the writes so the one that would lose data if it failed alone comes last (for example: add tasks to today first, then mark them forwarded in yesterday; a failure in between leaves a task in both notes, never in neither).

## Generated notes: `upsertNote`

For a note the mod fully owns (a report it regenerates), create or overwrite it and skip an identical write. Skipping matters: every `write` bumps the index (file history alone skips a snapshot identical to the latest one), invalidates every QueryJS block and fires `onNoteSaved`.

```javascript
/** Creates or overwrites a generated note; resolves whether it wrote. Not a merge: replaces the whole file. */
async function upsertNote(ctx, path, text) {
	if (!(await ctx.vault.exists(path))) await ctx.vault.create(path, text);
	else if ((await ctx.vault.read(path)) !== text) await ctx.vault.write(path, text);
	else return false;
	return true;
}
```

`create` and `write` are separate because `create` refuses an existing path and `write` refuses a missing one or a dirty tab. If the user may also type into the note, keep their text and replace only a marked block through `editNote`: see the owned-block recipe in the [Cookbook](14-cookbook.md#8-generated-report-with-an-owned-block) and the [folder-report example](../../examples/mods/folder-report/).

## Rename, move, delete

These three go through the app's own file services, the same ones the file explorer uses: open tabs follow the file, the explorer and indexes are updated, and links are rewritten where the app would rewrite them. Once one of them has started, an unload cannot cancel it; the operation can finish after the mod is gone. Their failures are also logged by the app and can reach Sentry while it is on.

### `rename(path, newName)`

Renames a file or folder **within its parent folder** and resolves to the new vault-relative path.

- `newName` is one name **including the extension** (`'Plan.md'`, not `'Plan'`); the host adds nothing. It is checked like a path first, so `''`, `'.'`, `'..'`, `'a/'` reject with `Invalid vault path "<newName>"`, and a valid path with a slash (`'a/b.md'`) rejects with `Mod "<id>": vault.rename needs a single name`.
- The same name resolves to the unchanged path with no disk access.
- A taken name rejects with `"<newName>" already exists in this folder`.
- Open tabs of the file (or of files inside a renamed folder) move to the new path.

> [!WARNING]
> **Renaming a Markdown note rewrites wikilinks in other notes.** When the note name (the file name without extension) changes, every note whose links resolve to the old note is rewritten to point at the new name, written to disk, synced into open tabs and re-indexed. If one of those notes has unsaved edits in a tab, the tab's text (unsaved edits included) is what gets written, so those edits are saved too. These rewrites do not fire `ctx.onNoteSaved`. Folder renames, pure moves and renames that change only case or the extension do not rewrite links.
>
> If you need a file under a new name **without** retargeting the links that point at it (for example a migration where the old path is the one that should keep the links), copy and delete instead: `create(newPath, await read(oldPath))` then `delete(oldPath)`, after checking the old note has no unsaved tab.

**Case-only renames fail on macOS default volumes.** `rename('note.md', 'Note.md')` checks whether `Note.md` exists, which a case-insensitive volume answers `true`, so it rejects with `"Note.md" already exists in this folder`. The workaround is two renames through a temporary name:

```javascript
/** Changes only the case of a file name, through a temporary name that is not a note. */
async function renameCase(ctx, path, newName) {
	const temp = `${newName}.renaming-${Date.now()}`;
	const between = await ctx.vault.rename(path, temp);
	return ctx.vault.rename(between, newName);
}
```

The temporary name ends in `.renaming-<ms>`, so for that moment the file is not a Markdown note, and neither step rewrites links in other notes: they keep their old spelling (`[[note]]`) and still resolve, because link resolution ignores case. Do not use a temporary name ending in `.md`: the first step would then rewrite every link to the temporary name, and the second step finds those links only if the index has caught up, so a link can be left pointing at a name that no longer exists. If the second rename fails, the file stays under the temporary name.

### `move(path, targetFolder)`

Moves a file or folder into `targetFolder` (`''` for the vault root) and resolves to the new vault-relative path, or to the unchanged path when it is already there (never `null`).

- The target folder **must exist**: there is no `mkdir`, and a missing folder fails with a bare string. A folder is created only as a side effect of `create` of a file inside it; `ctx.vault` cannot create an empty folder. When a mod needs a folder that may not exist yet (an archive folder, say), settle with the user how it comes to exist: they create it, or the mod creates a note inside it, such as a short index note.
- A taken name rejects with `"<name>" already exists in this folder`.
- Open tabs of the file (or of files inside a moved folder) follow it to the new path, **unsaved edits included**: the tab keeps its text and its dirty state, and its next save writes to the new path. Nothing is saved by the move itself.
- Links are not rewritten (the note name is unchanged), and the app's link resolution follows the note by name. A pinned link (`[[Old/Name.md|Name]]`, see [Writing a wikilink](#writing-a-wikilink)) stops resolving to that exact path, and falls back to the name.
- Moving a folder into itself fails at the OS level.

### `delete(path)`

Moves a file or folder to the **Trash** and resolves to `undefined`. It is not a permanent delete.

1. A missing path rejects (bare string) before anything happens.
2. Every tab at or under the path with unsaved edits is **saved first**, so the Trash receives what the user typed. If one of those saves fails, `delete` rejects with `Could not save "<absolute path>" before moving it to the Trash` (an `Error` named `PreDeleteSaveError` with `.path`), and nothing is closed or moved.
3. Tabs at or under the path close.
4. The item moves to `<vault>/.kokobrain/trash/items/<uuid>/<name>` and gets an entry in the Trash list. If the move fails, the closed tabs reopen.
5. The explorer entry disappears and the path (and every child path) leaves the vault index, search and semantic index.

The user restores from the app's Trash view; `ctx.vault` has no restore. `delete` of a folder takes everything inside it.

## `ctx.workspace.openNote(path)`

Opens a file in the editor, or switches to its tab when it is already open. Resolves once the tab is added or activated.

1. Checks the path and that the mod is live.
2. Rejects with `"<path>" does not exist` when nothing is at the path (or with a bare string if the existence check itself fails).
3. Opens it the way a click in the explorer would.

Then the app decides, and the promise **resolves in every case**:

| What is at the path | Result |
|---------------------|--------|
| A note or text file not open | New active tab with its content. `.canvas`, `.kanban` and `.view` open in their own views; `.js`, `.json` and other text files open as plain text |
| A file already open | Switches to that tab. The tab is **not** reloaded from disk |
| An image, audio, video, PDF or archive | Nothing opens; the app shows "Cannot open binary file in the editor: <name>" |
| A folder, or a file that cannot be read | Nothing opens; the app shows "Failed to open file." (reported like an app error) |

There is no caret placement, no split or new-tab option, and no creation of a missing note. For a caret position use `ctx.app.openNoteAt(absolutePath, { kind: 'line', line })` (raw, [Raw app](09-raw-app.md#opennoteat)). After `openNote` resolves, the editor view may still show the previous document for a moment; `editNote` handles that by falling back to the disk route.

To confirm the open worked: `ctx.app.editorStore.activeTabPath === toAbsolute(ctx, path)` (raw).

Opening a mod's own `main.js` and editing it there autosaves and reloads that mod.

## Special folders

| Folder | What `ctx.vault` does there |
|--------|-----------------------------|
| `_system/mods/<id>/` | Allowed. This path is **fixed**: the mods folder ignores the system folder setting. `write` of a non-note file skips the after-save steps and is seen by the watcher. **Writing, creating, renaming or deleting `main.js` or `manifest.json` reloads that mod** (deleting the folder or the manifest unloads it). A mod can rewrite or trash its own code; the reload waits for its running actions to end. See [Anatomy and loading](01-anatomy-and-loading.md#reload-on-save). |
| The system folder (templates and the rest) | A setting, not a fixed name: `ctx.app.settingsStore.templates.systemFolder` (raw), `_system` by default, vault-relative. Allowed, and listed by `list('')`. Notes under it are not pages in `ctx.kb()`. The templates folder is another setting, `settingsStore.templates.folder` (`_system/templates` by default). Read both instead of hard-coding them, for example to leave the system folder out of a walk. |
| `.kokobrain/` | The app's own folder: settings, Trash, mod data. `list` hides its dot entries, the explorer never shows it. Do not write here. `.kokobrain/mods/<id>/data.json` is your data file: use `saveData`, because a `write` to it bypasses the atomic write and runs the full after-save pipeline, adding file history rows. Editing `.kokobrain/trash/trash-manifest.json` can break the Trash view. |
| Other dot-folders (`.git`, `.obsidian`) | Valid paths, but the app's file permissions only list `.kokobrain` among dot-folders, so reads and writes there may be refused with a bare string (unverified). |

## Filesystem scope and limits

- `ctx.vault` reaches only the open vault: every path is joined to its root, and `..` is rejected. Vaults themselves live only in `~/kokobrain-vaults/` or `~/Documents/kokobrain-vaults/`, the locations the app's file permissions cover.
- Text only, UTF-8 only. No binary API, no encoding option.
- No size limit, no streaming. A whole file is read into memory.
- Every call runs on the app's main thread and waits for the disk. Batch work in an action with `run.progress` and Stop checks ([Runs](03-runs.md#stop)); do not walk thousands of files in `onload`.
- The mod has full trust: `ctx.app` and the raw filesystem services can do more than `ctx.vault`. The path rules exist to catch mistakes, not to contain a mod.

## See also

- [Mod data](05-mod-data.md): `loadData` and `saveData`
- [Runs](03-runs.md): progress, Stop and partial-work reporting for batch edits
- [Events and reactivity](07-events-and-reactivity.md): `ctx.onNoteSaved` and save loops
- [Raw app](09-raw-app.md): `editorStore`, `editorView`, `updateNoteFrontmatter`, daily and typed notes
- [Cookbook](14-cookbook.md): daily-note append, owned report blocks, batch edits
- [Vault Mods](../28-mods.md): the user guide
