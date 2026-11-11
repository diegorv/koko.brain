# API Reference

Every member a mod receives, on one page: signature, what it returns, how it fails (with the exact messages), and its stability tier. Grouped as in the contract. The behavior behind each line is explained in the topic pages linked from each section.

Types for all of it: [`help/examples/mods/kokobrain-mod.d.ts`](../../examples/mods/kokobrain-mod.d.ts) (see [Types, build and test](12-types-build-and-test.md)).

## Conventions

| Notation | Meaning |
|----------|---------|
| **stable** | Contract v1. Removing or changing a member bumps `ctx.apiVersion` |
| **unstable** | `ctx.labs`. Experimental, can change in any release |
| **raw** | `ctx.app`, `ctx.kb()`. The app's internals, no promise at all |
| `<id>` | The manifest `id` (equal to the folder name) |
| `<name>` | The manifest `name` |
| throws | Throws synchronously |
| rejects | Returns a rejected promise (never throws synchronously) |

Rules that apply to every member, and are not repeated below:

- **Unloaded.** Every `ctx` function, and reading `ctx.app`, `ctx.kb` or `ctx.theme.current`, throws (or rejects) `Mod "<id>" is unloaded` once the mod is unloaded or the open vault changed. That includes calls made inside `onunload`. Only `ctx.apiVersion`, `ctx.mod` and `ctx.signal` keep working. `run.log` and `run.progress` check the run instead (see [The run](#the-run)).
- **Argument errors** start with `Mod "<id>": `.
- **Paths.** `ctx.vault`, `ctx.workspace`, `ctx.onNoteSaved` and `run.target` use vault-relative paths (`Ideas/Idea.md`, no leading `/`). `ctx.app` and `ctx.kb()` use absolute paths (`${ctx.app.vaultStore.path}/Ideas/Idea.md`).
- **Error shapes.** File system errors from `ctx.vault`, `ctx.workspace` and `ctx.app` calls, and a failed index read in `ctx.kb()`, reach the mod as the lower layer sent them, often a **plain string**, not an `Error`: `err.message` can be `undefined`. Use `err instanceof Error ? err.message : String(err)`, or the `errorMessage` helper of [Vault files](04-vault-files.md#errors-are-not-always-error-objects). The host's own checks (paths, arguments, unloaded) throw an `Error`. `ctx.loadData` and `ctx.saveData` always reject with an `Error`. Everything else on `ctx` throws an `Error`.

## The mod object

The default export of `main.js` (type `ModV1`, or `Mod` with the full context). **stable**.

| Member | Signature | Behavior and errors |
|--------|-----------|---------------------|
| `onload` | `(ctx) => unknown` | Required. Called once after `main.js` evaluates; may be async and is awaited. A throw or rejection fails the load: `_system/mods/<id>: onload failed: <message>` (Labs row and toast), and everything registered so far is removed. `onunload` is then never called |
| `onunload` | `() => unknown` (optional) | Called once at unload, after `ctx.signal` aborted, the mod's runs were cancelled and its dialogs closed, and before the cleanups. Not awaited. Every `ctx` function already throws inside it. A throw or rejection: toast `_system/mods/<id>: onunload failed: <message>`; the cleanups still run |

Details: [Anatomy and loading](01-anatomy-and-loading.md).

## ctx: identity and lifecycle

| Member | Signature | Returns | Errors | Tier |
|--------|-----------|---------|--------|------|
| `ctx.apiVersion` | property | `1` | none | stable |
| `ctx.mod` | property | `{ id, name, version, dir }`; `dir` is `_system/mods/<id>`. The manifest's `description`, `author`, `minAppVersion` and `ruleActions` are not exposed | none | stable |
| `ctx.signal` | property | `AbortSignal`, aborted at unload, before `onunload`. One signal for the whole mod (inside an action prefer `run.signal`) | none | stable |
| `ctx.register` | `(dispose: () => void) => void` | nothing; cannot be undone | throws unloaded. Not validated: a non-function fails at unload as a cleanup failure | stable |

Cleanups (from `register`, and the disposers of `addAction`, `addRailButton`, `watch`, `onNoteSaved`, `theme.onChange`, `labs.place`) share one list and run at unload in reverse order of registration, each in its own try/catch. A throwing cleanup: toast `_system/mods/<id>: cleanup failed: <message>`; the rest still run. A disposer returned by the API is safe to call yourself: it runs at most once and leaves the list.

Timers, DOM listeners and anything registered through `ctx.app` are not tracked: clear them in a `ctx.register` cleanup. See [Events and reactivity](07-events-and-reactivity.md).

## ctx: messages and logging

| Member | Signature | Returns | Errors | Tier |
|--------|-----------|---------|--------|------|
| `ctx.notify` | `(message: string, options?: { kind?: 'info' \| 'success' \| 'warning' \| 'error' }) => void` | nothing. An in-app toast `<name>: <message>`, about 4 seconds, never an OS notification. Easy to miss: for an event the user must not miss, use `ctx.ui.alert` or keep it on screen ([Network and platform](11-network-and-platform.md#ctxnotify-is-an-in-app-toast)) | throws unloaded. `message` is not validated (`undefined` shows as `undefined`); an unknown `kind` silently becomes `'info'` | stable |
| `ctx.log` | `(...args: unknown[]) => void` | nothing. Writes under the tag `MOD:<id>` only when Settings > Troubleshooting has Debug mode (devtools console) or Save debug log to file on; otherwise does nothing | throws unloaded. In the file, non-strings are `JSON.stringify`ed: an `Error` becomes `{}` (log `err.message` and `err.stack`). A cyclic object or a BigInt makes it throw while file logging is on (the file writer calls `JSON.stringify` uncaught) | stable |

Log file timestamps are UTC. Details: [Errors and debugging](15-errors-and-debugging.md).

## ctx: actions and rail buttons

### ctx.addAction

`(action: ModActionV1) => () => void`. **stable**. Throws.

| Field | Type | Rule |
|-------|------|------|
| `id` | `string` | Non-empty, unique among the mod's live actions. Any characters |
| `title` | `string` | Non-empty. Picker row title; named in the failure toast |
| `description` | `string` (optional) | Picker row subtitle; `''` allowed |
| `input` | `{ placeholder?: string }` (optional) | Picking the action shows a text field first. `{}` is valid |
| `run` | `(input: string, run: ModRunV1) => unknown` | Called with the typed text (`''` without `input`; never trimmed) and [the run](#the-run). May be async |

Errors, in check order: `Mod "<id>": addAction needs a non-empty string id`, `... addAction needs a non-empty string title`, `... addAction needs a run function`, `... addAction needs a string description`, `... addAction needs input to be an object with an optional string placeholder`, `... duplicate action id "<actionId>"`. A throw inside `onload` fails the whole load.

Returns a disposer (idempotent) that removes the action, its `labs.place` placements and its command row; the id can then be added again. The host keeps a copy: changing the object later has no effect.

When `run` throws or rejects while the run's signal is not aborted: the run ends Failed, toast `<name>: <title> failed: <message>`. After Stop or unload any rejection is dropped silently. One live run per action: starting it again while it runs reveals the live run instead. Details: [Actions and entry points](02-actions-and-entry-points.md), [Runs](03-runs.md).

An id listed in the manifest's `ruleActions` is also offered to Auto Organize rules. A rule calls `run(text, run)` with `run.target = { on: 'note', path }`, the matched note at the end of the save, and `text` the rule's text for an action with `input` (`''` otherwise). It does not wait for the run, and while the action runs a rule's call starts nothing and reveals nothing. Such an action must not open dialogs: nobody clicked. Details: [Actions a rule can run](02-actions-and-entry-points.md#actions-a-rule-can-run).

### ctx.addRailButton

`(button: ModRailButtonV1) => () => void`. **stable**. Throws.

| Field | Type | Rule |
|-------|------|------|
| `id` | `string` | Non-empty, unique among the mod's live buttons |
| `title` | `string` | Non-empty. The button's tooltip and `aria-label`, and the accessible title of the picker it opens (screen readers; not visible text) |
| `icon` | `string` | `pack:name` (`lucide:sparkles`) or a bare lucide name. Any string is accepted (`''` too); an unknown or still-loading icon shows a puzzle glyph |
| `actions` | `string[]` (optional) | Action ids listed, in order, resolved at click time. Omitted: every action of the mod (including ones added later). Unknown ids are skipped; `[]` lists nothing |

Errors: `Mod "<id>": addRailButton needs a non-empty string id`, `... addRailButton needs a non-empty string title`, `... addRailButton needs a string icon`, `... addRailButton needs actions to be a list of action ids`, `... duplicate rail button id "<buttonId>"`.

A click with one resolved action runs it (or opens its text field); with several, opens the picker; a running action reveals its run. Returns an idempotent disposer.

## ctx: reacting to the app

| Member | Signature | Returns | Errors | Tier |
|--------|-----------|---------|--------|------|
| `ctx.watch` | `<T>(read: () => T, onChange: (value: T) => void) => () => void` | disposer | throws `Mod "<id>": watch needs a read function`, `... watch needs a callback function`, unloaded | stable |
| `ctx.onNoteSaved` | `(callback: (path: string) => void) => () => void` | disposer | throws `Mod "<id>": onNoteSaved needs a callback function`, unloaded | stable |
| `ctx.theme.current` | getter | `{ mode: 'light' \| 'dark', colors: ModThemeColorsV1 }`, read fresh at each access | throws unloaded | stable |
| `ctx.theme.onChange` | `(callback: (theme) => void) => () => void` | disposer | throws `Mod "<id>": theme.onChange needs a callback function`, unloaded | stable |

- `watch`: `read` runs at subscription (more than once, so keep it free of side effects) and again whenever app state it read (Svelte reactive state only) changes; `onChange` runs only when the value changes by `Object.is`, never at subscription. A throw in `read` keeps the last good value; throws in either go to the debug log (`watch read failed:`, `watch callback failed:`). A throw or rejection from `onChange` also goes to the Labs row and one toast per load.
- `onNoteSaved`: one call per save, in a later timer, with the vault-relative path only. Fires for editor saves of any file, `ctx.vault.write` (except non-note files under `_system/mods/`) and frontmatter writes; not for `create`, `rename`, `move`, `delete`, `saveData` or outside edits. Sync throws and rejections go to the debug log (`onNoteSaved callback failed:`), the Labs row and one toast per load. Writing again from it can loop.
- `theme.onChange`: fires after every theme application (also re-selecting the same theme, and each live-preview edit in the theme editor), never at subscription. Sync throws and rejections go to the debug log (`theme.onChange callback failed:`), the Labs row and one toast per load.
- Theme colors (20 keys, each a CSS variable): `background`, `foreground`, `card`, `cardForeground`, `popover`, `popoverForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground`, `border`, `input`, `ring`, `divider` (`cardForeground` is `--card-foreground`). Values are the theme's text, trimmed (`#rrggbb`, `oklch(...)`).

Details: [Events and reactivity](07-events-and-reactivity.md), [Custom UI](08-custom-ui.md).

## ctx.vault

**stable**. Every method is async: every failure, including a bad path or unload, rejects. Every path argument is checked first: not a string, `''`, a leading or trailing `/`, `//`, or a `.` or `..` segment rejects `Invalid vault path "<path>"` (`list('')` and `move(path, '')` are the only ways to name the vault root). Other failures from the file system reject with the raw error (often a bare string) and are written to the debug log as `vault.<op> "<path>" failed: ...`.

| Member | Signature | Resolves to | Rejects with (besides the path rule and raw file system errors) |
|--------|-----------|-------------|------------------------------------------------------------------|
| `read` | `(path: string) => Promise<string>` | the text, decoded as UTF-8 (invalid bytes become U+FFFD). Any file type; no binary API | a missing file or a folder: raw error |
| `exists` | `(path: string) => Promise<boolean>` | `true` for a file or a folder | none of its own |
| `list` | `(folder: string) => Promise<{ name, path, isFolder }[]>` | direct children, unsorted, names starting with `.` left out; `''` is the root; `path` is `folder + '/' + name` | a missing folder or a file: raw error |
| `create` | `(path: string, content: string) => Promise<string>` | `path` as passed. Creates missing parent folders; adds no extension | `Mod "<id>": vault.create needs string content`; `"<path>" already exists; use write` (file or folder there) |
| `write` | `(path: string, content: string) => Promise<void>` | nothing. Overwrites in place (not atomic); a clean open tab shows the new text | `Mod "<id>": vault.write needs string content`; `"<path>" does not exist; use create`; `"<path>" has unsaved changes in an open tab` |
| `updateFrontmatter` | `(path: string, mutate: (props: ModPropertyV1[]) => ModPropertyV1[]) => Promise<void>` | nothing. A Markdown note only (`.md`, `.markdown`); body left as it is. An open tab keeps its unsaved body edits and is saved at once. Nothing is written when the rebuilt note equals the file | `Mod "<id>": vault.updateFrontmatter needs a Markdown note`; a missing note: raw read error; name `FrontmatterWriteError` with a `reason`: lossy frontmatter (`unparseable`, `nested`, `comments`, `duplicate-keys`, `alias-collision`, `anchors`; nothing written), `save-failed`, `vault-changed`, `missing` |
| `rename` | `(path: string, newName: string) => Promise<string>` | the new vault-relative path; unchanged name: no disk access | `Invalid vault path "<newName>"`; `Mod "<id>": vault.rename needs a single name` (a `/` in `newName`); `"<newName>" already exists in this folder` |
| `move` | `(path: string, targetFolder: string) => Promise<string>` | the new vault-relative path; already there: unchanged, no disk access | `"<fileName>" already exists in this folder`; a missing target folder: raw error (no folder is created) |
| `delete` | `(path: string) => Promise<void>` | nothing. Moves to the app's Trash (`.kokobrain/trash/`), saving dirty tabs under the path first and closing them | a missing path: raw error; `Could not save "<absolute path>" before moving it to the Trash` (name `PreDeleteSaveError`) |

Side effects worth knowing: renaming a Markdown file to a new name rewrites wikilinks in other notes; `create` and `write` reach the index at once (note existence and frontmatter are current in the next `ctx.kb()`), but `file.tasks`, `file.tags`, links, size and times follow a snapshot that refreshes about 2 s after a change, up to about 10 s during a burst (until then a note saved a moment ago shows its previous size and mtime); a write to `_system/mods/<id>/main.js` or `manifest.json` reloads that mod. Details: [Vault files](04-vault-files.md).

## ctx.workspace

**stable**.

| Member | Signature | Resolves | Rejects with |
|--------|-----------|----------|--------------|
| `openNote` | `(path: string) => Promise<void>` | when the tab is added or switched to. An open tab is not reloaded. A folder, a binary file (images, PDF, audio, video, archives) or an unreadable file resolves too, with an app error toast and nothing opened | `Invalid vault path "<path>"`; `"<path>" does not exist`; a raw error when the existence check itself fails |

No caret placement: use `ctx.app.openNoteAt`. Details: [Vault files](04-vault-files.md).

## ctx.ui and run.ui

**stable**. Same five methods on both. `run.ui` belongs to the run: on Stop or unload its open and queued dialogs reject with `DOMException` named `AbortError` (message `The run was stopped`), and later calls reject with it at once. `ctx.ui` belongs to the mod: Stop does not touch it; at unload its dialogs resolve with the cancel value. Inside an action use `run.ui`.

One dialog shows at a time across all mods; later calls queue. Every method is async: argument errors reject, checked in this order: `AbortError` (run.ui after Stop), then unloaded, then the arguments. Text options must be strings when given (`null` is rejected).

| Method | Signature | Resolves to | Cancel (Esc, Cancel, X, outside click, unload) | Argument errors (`Mod "<id>": ` prefix) |
|--------|-----------|-------------|------------------------------------------------|------------------------------------------|
| `alert` | `({ title, message?, kind? }) => Promise<void>` | `undefined` on OK | `undefined` | `ui.alert needs a non-empty string title`, `ui.alert needs a string message`. Unknown `kind` becomes `'info'` |
| `confirm` | `({ title, message?, confirmLabel?, cancelLabel?, destructive? }) => Promise<boolean>` | `true`; the confirm button has focus, so Enter confirms | `false` | `ui.confirm needs a non-empty string title`, `ui.confirm needs a string <message\|confirmLabel\|cancelLabel>`. `''` labels fall back to `OK` / `Cancel`; `destructive` must be `true` |
| `prompt` | `({ title, message?, label?, placeholder?, value?, multiline? }) => Promise<string \| null>` | the text, not trimmed; an empty submit is `''` | `null` (test `=== null`) | `ui.prompt needs a non-empty string title`, `ui.prompt needs a string <message\|label\|placeholder\|value>`. Multiline submits with Cmd+Enter or Ctrl+Enter |
| `pick` | `<T extends { id, title, description? }>({ title, placeholder?, items: T[] }) => Promise<T \| null>` | the original item object | `null` | `ui.pick needs a non-empty string title`, `ui.pick needs a string <message\|placeholder>`, `ui.pick needs an items array`, `ui.pick needs items with non-empty string ids and titles`, `ui.pick needs a string item description`, `ui.pick duplicate item id "<itemId>"` |
| `loading` | `<T>(label: string, task: (signal: AbortSignal) => T \| Promise<T>, options?: { cancellable?: boolean }) => Promise<T>` | the task's result; rejects with the task's error | Cancel (with `cancellable: true`) and unload abort the task's signal and close the dialog, but the promise still waits for the task. Esc and outside click do nothing. On `run.ui`, Stop and unload reject at once with `AbortError` | `ui.loading needs a non-empty string label`, `ui.loading needs a task function` |

`pick` shows the first 100 items with an empty query; typing searches all items (fuzzy, over title and description). The task of `loading` starts at the call, even while its dialog waits in the queue. Details: [Dialogs](06-dialogs.md).

## ctx.loadData and ctx.saveData

**stable**. The mod's JSON data at `<vault>/.kokobrain/mods/<id>/data.json`, out of the index, search, file history and Auto Organize. Both go through one queue per mod, in call order; a call that reaches the head after unload rejects `Mod "<id>" is unloaded` without touching the disk.

| Member | Signature | Resolves to | Rejects with |
|--------|-----------|-------------|--------------|
| `loadData` | `() => Promise<unknown>` | the last saved value, or `null` when there is no file (a saved `null` also reads as `null`) | Corrupt file (invalid JSON or UTF-8, an empty file included): `Mod "<id>": data.json is not valid JSON; its content was kept in .kokobrain/mods/<id>/data.corrupt-<ms>.json`, an `Error` with `name === 'ModDataCorruptError'` and `corruptPath` (vault-relative); the next `loadData` resolves `null`. Unreadable file: an `Error` such as `read failed for <path>: <reason>`, and `saveData` refuses until a later `loadData` resolves or reports the file corrupt, or the mod reloads |
| `saveData` | `(data: unknown) => Promise<void>` | nothing; written atomically, tab-indented. `data` is serialized at the call | `Mod "<id>": saveData needs a value JSON can represent: <reason>` (reasons: `function`, `symbol`, `NaN`, `Infinity`, `undefined`, `a <ClassName>` such as `a Map`, with ` at "<key>"` when nested, or the engine's message for a cycle or BigInt); `Mod "<id>": saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again`; an `Error` when the write fails |

Data errors are always `Error` objects, unlike `ctx.vault`. Test a corrupt file with `err.name === 'ModDataCorruptError'` (there is no class to `instanceof`). Details: [Mod data](05-mod-data.md).

## The run

The second argument of `action.run`. **stable**.

| Member | Signature | Behavior and errors |
|--------|-----------|---------------------|
| `run.target` | `{ on: 'note' \| 'folder', path: string }` or absent | For menu invocations (`ctx.labs.place` with `menu`): the clicked note or folder, vault-relative, `''` for the vault root. For an Auto Organize rule: `{ on: 'note', path }`, the matched note, the same shape as a note menu click. The key is absent (not `undefined`) for rail, palette and command-row runs |
| `run.signal` | `AbortSignal` | Aborted on Stop, mod unload and vault close; not on a reload after save (which waits for the run) and not when the run ends. Check `run.signal.aborted` between steps: Stop cannot interrupt running code |
| `run.log` | `(text: string) => void` | Adds a line (`String(text)`) to the run view, which keeps the last 500. Ignored once the run ended or was stopped. Never throws. For a palette, menu or `modCommandsStore` command-row run without `input`, the first line opens the run view |
| `run.progress` | `(done: number, total: number, label?: string) => void` | Sets the bar (`done / total`, clamped for display; `total <= 0` shows 0%). Throws `Mod "<id>": run.progress needs numbers done and total` (any non-finite value) or `Mod "<id>": run.progress needs a string label`, even after the run ended; an uncaught throw fails the run. A valid call after the end is ignored |
| `run.ui` | `ModUiV1` | [The dialogs](#ctxui-and-runui), bound to this run |

A run that ends Done with no log line and no progress closes its view by itself. After Stop the run is Cancelled at once, and the action can be started again while the old body still runs. Details: [Runs](03-runs.md).

## ctx.labs

**unstable**. Experimental, outside contract v1.

### ctx.labs.place

`(actionId: string, options: { palette?: true, menu?: { on: ('note' | 'folder')[], files?: 'markdown' | 'all' } }) => () => void`. Throws.

| Option | Effect |
|--------|--------|
| `palette: true` | The action appears in the command palette (Cmd+P) as `<name>: <title>` |
| `menu.on: ['note']` | In the row menu of the rail note list (not other note surfaces) |
| `menu.on: ['folder']` | In the Files navigator's folder menu and vault-root menu |
| `menu.files` | Note rows that show it: `'markdown'` (default: `.md`, `.markdown`) or `'all'`. Ignored for folders |

At least one of `palette: true` or `menu` is required; either alone is valid. A menu-only placement (`{ menu: { on: ['note'] } }`, no `palette` key) shows the action in the menu and not in the palette.

Errors, in check order: unloaded; `Mod "<id>": unknown action id "<actionId>"` (add the action first); `... labs.place needs palette: true or menu` (neither given); `... labs.place needs palette: true` (a `palette` key present with a value other than `true`, such as `{ palette: false, menu: ... }`; omitting the key is fine); `... labs.place needs menu.on to list note or folder`; `... labs.place needs menu.files to be markdown or all`.

Returns an idempotent disposer for this placement. Removing the action or unloading removes every placement. A second placement with `menu` replaces the action's menu entry. Palette and menu starts run quietly (the run view opens on the first output) unless the action has `input`. Details: [Actions and entry points](02-actions-and-entry-points.md).

## ctx.kb()

**raw**. `() => Promise<KBAPI>`: a QueryJS `kb` over the app's current index snapshot. Reading `ctx.kb` after unload throws `Mod "<id>" is unloaded`; the call rejects with it when the mod unloads during the snapshot read, or with the read's error.

| Member | Use |
|--------|-----|
| `kb.pages(source?)` | DataArray of notes: `'"Folder"'` (quotes required, subfolders included), `'#tag'`; no source, or one it cannot parse, means every note. For the notes directly in the vault root, `.where((p) => p.file.folder === ctx.app.vaultStore.path)`. Leaves out `.view` files, type definitions and the system folder (a setting, `_system` by default); keeps archived notes |
| `kb.page(absolutePath)` | One page, or `undefined` |
| `kb.current()` | The page of the tab that was active when `ctx.kb()` was called, or `null` |
| `kb.date(...)`, `kb.ui`, `kb.container` | As in QueryJS; render helpers append to a detached `container` |

Paths are absolute; frontmatter keys sit on the page (`p.status`); pages are shared with the app's QueryJS blocks (treat them as read-only). Note existence and frontmatter (`_type`, organized/archived/favorite, root tags) are current at once after a write; `file.tasks`, `file.tags`, links, size, ctime and mtime follow a snapshot that refreshes about 2 s after a change, up to about 10 s during a burst, so until then a note saved a moment ago shows its previous size and mtime (a new one `0`) (`ctx.app.vaultStore.requestPromptIndexRefresh()` before the write shortens it). `task.completed` is `false` only for `[ ]`. Scope every read with a folder source, a `file.folder` predicate or `.limit(n)`: the whole vault is built either way, and the scope filters what the mod gets back:

```javascript
const kb = await ctx.kb();
const open = kb.pages('"Projects"').where((p) => !p.archived).limit(20).array();
```

Details: [Querying the index](10-querying-the-index.md), [QueryJS](../13-queryjs.md).

## ctx.app

**raw**. The app's live objects, the same for every mod, not copies. Reading `ctx.app` throws once unloaded; objects already taken stay usable (and then belong to whatever vault is open). Nothing is wrapped or validated. Every path is absolute. Member by member: [Raw app access](09-raw-app.md).

| Member | Shape | Look up |
|--------|-------|---------|
| `editorStore` | `tabs`, `activeTab`, `activeTabPath`, `activeTabContent`, `activeIndex`, `isLivePreview`, `editorView` (CodeMirror, or `null`) | [09](09-raw-app.md) |
| `vaultStore` | `path` (absolute root), `name`, `vaultIndexVersion`, `indexReady`, `requestPromptIndexRefresh()` | [09](09-raw-app.md) |
| `openFileInEditor` | `(absolutePath) => Promise<void>`; never rejects (toasts on failure) | [09](09-raw-app.md) |
| `openNoteAt` | `(absolutePath, { kind: 'line', line } \| { kind: 'offset', offset }) => Promise<void>`; the caret moves after it resolves | [09](09-raw-app.md) |
| `createTypedNote` | `({ typeName, title, buildContent? }) => Promise<string>` (absolute path); rejects `no-vault` or `create-failed` | [09](09-raw-app.md) |
| `createOneOnOneNote` | `(personName) => Promise<void>` | [09](09-raw-app.md) |
| `openOneOnOnePicker` | `(onSelect?) => Promise<void>`; resolves when the picker opens | [09](09-raw-app.md) |
| `dailyNotePath` | `(date?: Date) => string`; the note may not exist | [09](09-raw-app.md) |
| `openOrCreateDailyNote` | `() => Promise<void>`; today only | [09](09-raw-app.md) |
| `updateNoteFrontmatter` | `(absolutePath, mutate) => Promise<string>`; `mutate` must be pure; rejects `FrontmatterWriteError` with a `reason` | [09](09-raw-app.md) |
| `typeDefinitionsStore` | `getTypeMetadata(name)`, `typeMetadataMap`, `sortedTypes` | [09](09-raw-app.md) |
| `modCommandsStore` | `list` of `{ id, label, run, palette }` for every mod action; fresh objects on each read | [02](02-actions-and-entry-points.md), [09](09-raw-app.md) |
| `railRegistryStore` | `registerAction`, `registerMenuItem`, navigators, lens providers, Today sections, folder creators; register cleanups with `ctx.register` | [08](08-custom-ui.md), [09](09-raw-app.md) |
| `settingsStore` | the live settings; changes are saved to the vault's settings file | [09](09-raw-app.md) |
| `openOrCreateNote` | `(options) => Promise<void>`; opens, or creates from a template and opens | [09](09-raw-app.md) |
| `saveFileByPath` | `(absolutePath) => Promise<boolean>`; saves a dirty open tab | [09](09-raw-app.md) |
| `syncExternalContentToEditor` | `(absolutePath, content, markSaved, schedule) => void` | [09](09-raw-app.md) |

> [!WARNING]
> `ctx.app.settingsStore` changes persist: the app writes every settings change to the vault's settings file after a short delay. It also holds secrets such as API tokens.

## Error message index

Messages the mod itself can catch, by prefix. Load, unload and toast messages are in [Errors and debugging](15-errors-and-debugging.md).

| Message | From |
|---------|------|
| `Mod "<id>" is unloaded` | any `ctx` member after unload or a vault change |
| `Mod "<id>": addAction needs ...`, `duplicate action id "<x>"` | `addAction` |
| `Mod "<id>": addRailButton needs ...`, `duplicate rail button id "<x>"` | `addRailButton` |
| `Mod "<id>": watch needs a read function` / `... a callback function` | `watch` |
| `Mod "<id>": onNoteSaved needs a callback function` | `onNoteSaved` |
| `Mod "<id>": theme.onChange needs a callback function` | `theme.onChange` |
| `Mod "<id>": ui.<method> needs ...`, `ui.pick duplicate item id "<x>"` | `ctx.ui`, `run.ui` |
| `The run was stopped` (`DOMException`, name `AbortError`) | `run.ui` after Stop or unload |
| `Mod "<id>": run.progress needs numbers done and total` / `... a string label` | `run.progress` |
| `Invalid vault path "<path>"` | `ctx.vault`, `ctx.workspace` |
| `Mod "<id>": vault.create needs string content` / `vault.write needs string content` | `vault.create`, `vault.write` |
| `"<path>" already exists; use write` | `vault.create` |
| `"<path>" does not exist; use create` | `vault.write` |
| `"<path>" has unsaved changes in an open tab` | `vault.write` |
| `Mod "<id>": vault.updateFrontmatter needs a Markdown note` | `vault.updateFrontmatter` |
| `Frontmatter write <reason>: <absolute path>` (name `FrontmatterWriteError`) | `vault.updateFrontmatter`, `app.updateNoteFrontmatter` |
| `Mod "<id>": vault.rename needs a single name` | `vault.rename` |
| `"<name>" already exists in this folder` | `vault.rename`, `vault.move` |
| `Could not save "<absolute path>" before moving it to the Trash` | `vault.delete` |
| `"<path>" does not exist` | `workspace.openNote` |
| `Mod "<id>": data.json is not valid JSON; its content was kept in <corruptPath>` | `loadData` |
| `Mod "<id>": saveData needs a value JSON can represent: <reason>` | `saveData` |
| `Mod "<id>": saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again` | `saveData` |
| `Mod "<id>": unknown action id "<x>"` | `labs.place`, a stale menu item or command row |
| `Mod "<id>": labs.place needs ...` | `labs.place` |
