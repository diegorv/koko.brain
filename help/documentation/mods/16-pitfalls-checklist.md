# Pitfalls and Pre-flight Checklist

Two tools for getting a mod right the first time: a checklist to run over a finished mod before handing it over, and a table of known pitfalls, each with its symptom, its cause and the fix.

> [!TIP]
> If you are an LLM writing a mod: go through every item of the checklist against the final `main.js` and `manifest.json`, fix what fails, and only then hand the mod over. Most items are a single search through the file.

## Pre-flight checklist

> [!NOTE]
> **Skip a section that does not apply, as a whole.** A mod with no actions skips "Actions, runs and dialogs"; one that makes no `fetch`, no `ctx.kb()` query or no note edit skips those sections. Check the section's first line against the mod (does it register an action? call `fetch`?), and if the answer is no, write "not applicable" for the section in the handover instead of ticking each item.

### Loader and files

- [ ] The mod is one folder holding `manifest.json` and `main.js`, named exactly like the manifest `id`. Installed, it lives at `<vault>/_system/mods/<id>/`; while you write it, it may sit anywhere (a scratch folder, a repo) and is copied there to install. Other files in the folder are ignored, and saving them does not reload the mod.
- [ ] `main.js` has exactly one line that starts with `export default` in column 0, followed by a space and then an object literal or an identifier (`export default {` or `export default mod;`). No indentation, no `export default{`.
- [ ] No other line in the file starts with `export default`, including lines inside template literals and block comments.
- [ ] No `import` statement, no `import.meta`, no other `export`. Packages are bundled into the file (see [Types, build and test](12-types-build-and-test.md)).
- [ ] No top-level `await` and no top-level `return`. `await` lives inside `async` functions such as `onload` or `run`.
- [ ] The default export is an object (or an instance) with an `onload` function, not a function or a class.
- [ ] Top-level code does nothing that can throw: it runs once at load, and a throw fails the whole load.

### Manifest

- [ ] `id` equals the folder name exactly, uses lowercase letters and digits joined by single hyphens, and is at most 64 characters.
- [ ] `name` and `version` are non-empty strings.
- [ ] `description` and `author`, if present, are strings (not `null`). `minAppVersion`, if present, looks like `1.2.3`.
- [ ] `color`, if present, has both `light` and `dark`, each `#rgb` or `#rrggbb`.
- [ ] `ruleActions`, if present, is an array of non-empty action ids, each one an `addAction` id of this mod. Each listed action is rule-safe: no `run.ui` or `ctx.ui` dialog, and no write to the matched note without a marker or a no-change check that stops the next round (see [Cookbook](14-cookbook.md#21-an-action-an-auto-organize-rule-runs)).

### Registration

- [ ] Every `addAction` id and every `addRailButton` id is a unique non-empty string within the mod. Registration inside a loop cannot produce duplicates.
- [ ] Every id in a rail button's `actions` names an action this mod registers (unknown ids are skipped without an error). `actions` is omitted (all actions) or non-empty, never `[]`.
- [ ] `ctx.labs.place(id, ...)` comes after `ctx.addAction` for that id, and `menu.on` lists at least one of `'note'`, `'folder'`.
- [ ] An action with `input` handles `''`: **Enter** on an empty field runs it with the empty string. Validate `text.trim()` and throw a readable error.

### Actions, runs and dialogs

- [ ] Inside an action, dialogs use `run.ui`, not `ctx.ui`, and long work checks `run.signal`, not `ctx.signal`.
- [ ] `run.signal.aborted` is checked after every `await` and before every write, so **Stop** never lets a later step run.
- [ ] A failure the user must see is thrown (the run ends **Failed** with a toast). Information and partial results use `ctx.notify`. Nothing is caught and silently dropped.
- [ ] A state with nothing to do (already running, nothing selected, nothing found, every note already done) calls `ctx.notify(...)` and returns. It does not throw: a throw ends the run **Failed** with a red toast. Invalid input (an empty field, the wrong kind of target) does throw.
- [ ] An action that ends by opening a note (`ctx.workspace.openNote`, `openFileInEditor`, `createTypedNote` then open) or a dialog of its own calls no `run.log` and no `run.progress` on its success path, before or after the open: a run with output stays on **Done** on top of what it opened. Use `run.ui.loading` for a long step, and a toast for a result. See [Runs: Ending an action](03-runs.md#ending-an-action).
- [ ] An event the user must not miss (a timer that ended, a failed background job) is shown with `ctx.ui.alert` or kept on screen, not with `ctx.notify` alone, whose toast is gone after about 4 seconds.
- [ ] After **Stop**, any report of partial work goes through `ctx.notify` (skipped when `ctx.signal.aborted`): `run.log` and `run.progress` are ignored and `run.ui` rejects by then.
- [ ] A cancelled `prompt` or `pick` is tested with `=== null`. An empty submitted prompt is `''`, not a cancel.
- [ ] Every `run.ui` call is awaited, or has a `.catch`, so **Stop** does not leave an unhandled `AbortError`.
- [ ] `run.progress` gets finite numbers (no `NaN` from `0 / 0`) and a string or no label.
- [ ] A destructive `confirm` is safe to accept by accident: its confirm button has focus, so **Enter** confirms at once.

### Cleanup

- [ ] Every listener (`window`, `document`, DOM nodes, CodeMirror), `setTimeout`, `setInterval`, `MutationObserver`, inserted DOM node and raw `ctx.app.railRegistryStore` registration that outlives a run is undone at unload: by a `ctx.register(() => ...)` registered as soon as it exists, or by `{ signal: ctx.signal }` on a listener. One `ctx.register` set up front that clears a variable timer (`let timer = null; ctx.register(() => clearTimeout(timer))`) covers every timer stored in that variable. A timer inside a run that ends with the run (a `sleep(ms, run.signal)`, the timeout of `fetchText`) is covered by `run.signal` and its own `finally`, and needs no `ctx.register`.
- [ ] Every value passed to `ctx.register` is a function.
- [ ] `onunload`, if present, does not call `ctx`: by the time it runs the mod is already unloaded and every `ctx` call throws. Data is saved when it changes, not at unload.
- [ ] Callbacks that can run after unload (timers, `fetch` continuations, DOM events) return early when `ctx.signal.aborted`.

### Paths and files

- [ ] `ctx.vault`, `ctx.workspace`, `ctx.onNoteSaved` and `run.target` use vault-relative paths (`Notes/Idea.md`, no leading `/`). `ctx.app` members and every `ctx.kb()` path are absolute. Every conversion between the two is explicit.
- [ ] Absolute paths from the app are normalized before reaching `ctx.vault` (collapse `//`, strip the vault root and the `/` after it).
- [ ] New files are given their extension explicitly: the host never adds `.md`.
- [ ] Every file name built from user text or fetched text goes through `safeName` ([Vault files](04-vault-files.md#note-names-safename)), and an empty result is refused with a throw. A raw title can hold `/` (another folder), `# | ^ [ ]` (an unlinkable name) or a leading `.` (a hidden dotfile the explorer and index never show).
- [ ] A "person note", "meeting note" or any "X note" is checked against the vault's types (`typeDefinitionsStore.getTypeMetadata('X')`); when X is a type, the note is made with `createTypedNote` plus `ensureTypeLine` ([Raw app](09-raw-app.md#createtypednote)), not `ctx.vault.create`.
- [ ] Every wikilink the mod writes follows [Writing a wikilink](04-vault-files.md#writing-a-wikilink): `[[Name]]` by default, `[[Folder/Name.md|Name]]` when the link must pin one file. Never `[[Folder/Name]]` in the belief that the folder pins it: it resolves by name only.
- [ ] `catch` blocks read the text with `err instanceof Error ? err.message : String(err)`, or the `errorMessage` helper of [Vault files](04-vault-files.md#errors-are-not-always-error-objects) (either is fine): rejections from `ctx.vault`, `ctx.workspace` and `ctx.app` are often bare strings. `loadData` and `saveData` always reject with an `Error`.
- [ ] `create` versus `write` is decided with `exists`, or both rejections are handled.
- [ ] `ctx.vault.rename` of a Markdown note is meant to rewrite links in other notes, or the mod copies and deletes instead.
- [ ] A folder `move` target exists: `move` does not create folders.

### Editing notes that may be open

- [ ] A note that may be open in a tab is edited through the editor when it is the active, clean tab, or through `ctx.vault.write`, which rejects when the tab has unsaved changes. That rejection is handled (skip the note, or ask the user to save).
- [ ] The active note is captured at the top of `run`, before any `await`, and `run.target` (menu runs) wins over it.
- [ ] `ctx.app.editorStore.editorView` is re-read at each use, checked for `null`, and checked to show the note expected, with the tab's line breaks normalized: `view.state.doc.toString() === activeTab.content.replace(/\r\n?/g, '\n')`. A plain `=== activeTab.content` is false forever on a CRLF note, so the editor route is never taken. The canonical `editNote` ([Vault files](04-vault-files.md#editnote)) does this.
- [ ] `ctx.app.updateNoteFrontmatter` is called only on `.md` notes, and its `mutate` is pure (it can run twice).
- [ ] No background trigger (`ctx.onNoteSaved`, a timer, a `ctx.watch` callback) calls `updateNoteFrontmatter`, `ctx.vault.write` or `syncExternalContentToEditor` on the **active** tab: they put the caret back at its old offset, so the user's next keystroke lands in the wrong place. Remember the path and act once the user has switched away ([Cookbook: Stamp a property on save](14-cookbook.md#20-stamp-a-property-on-save-safely)). From an action on the open note, use `updateFrontmatterKeepCaret` ([Raw app: Known problems](09-raw-app.md#known-problems-caret-and-empty-block)).
- [ ] A `FrontmatterWriteError` with `reason === 'save-failed'` is not toasted a second time.
- [ ] A generated block the mod owns (between marker comments) passes every piece of copied note text through a neutralizer that turns `<!--` into `&lt;!--`: a copied task that quotes a marker would otherwise break every later run. The handover says that copied `#tags` and `[[links]]` become tags and links of the report note, or the mod writes copied text that must stay plain (note names in headings and list items) through `markdownText` ([Cookbook: owned block](14-cookbook.md#8-generated-report-with-an-owned-block)).
- [ ] Every change to user data beyond the request is disclosed in the handover: frontmatter rewritten in canonical form (`[a, b]` lists, `_type:`, quotes dropped), CRLF line breaks of the frontmatter turned into LF, files moved or renamed.

### Events and loops

- [ ] A `ctx.onNoteSaved` callback that writes compares old and new content and writes only on a change, so it cannot trigger itself forever.
- [ ] `ctx.onNoteSaved` callbacks filter by extension: they also fire for `.canvas`, `.view`, `.js` and other files saved in the app.
- [ ] `ctx.watch` reads return a primitive or a stable object, read narrow state (`activeTabPath`, not `activeTab.content`), and async handlers catch their own errors.
- [ ] No synchronous loop can run unbounded. Long synchronous work is split with `await` points.

### Index queries

- [ ] Every `ctx.kb()` query is scoped with a quoted folder source (`kb.pages('"Projects"')`), a `file.folder` predicate in the same chain (for the vault root: `.where((p) => p.file.folder === ctx.app.vaultStore.path)`) or a `.limit(n)`. The scope filters the result; the whole-vault build happens anyway. A whole-vault read that the task really needs carries a comment saying why.
- [ ] Archived notes are kept unless the request excludes them, and the output says when they were left out.
- [ ] Nothing relies on `ctx.kb()` showing the tasks, tags or links of a note the mod has just written: those follow a snapshot that refreshes about 2 s after a change, up to about 10 s during a burst (existence and frontmatter are current at once). Read the file instead, or call `ctx.app.vaultStore.requestPromptIndexRefresh()` before the write.
- [ ] A mod that chooses notes by `file.mtime` or `file.ctime` **to change, move or delete them** (archive old notes) leaves out `0` (a note too new for the snapshot) and skips notes open in a tab: a note saved a moment ago shows its previous mtime for about 2 s after the change, up to about 10 s during a burst. A mod that only **shows** notes by mtime (a recent list) keeps open tabs and `0` values (as "just now") instead, so the note just edited is not hidden ([Freshness and lag](10-querying-the-index.md#freshness-and-lag)).
- [ ] "Open task" means what the request means, stated in the output: `!t.completed` is exactly `[ ]` (the Tasks view's open); `[/]`, `[?]`, `[!]` and `[>]` are `completed` too. See [Querying the index: Tasks](10-querying-the-index.md#tasks).
- [ ] Pages returned by `ctx.kb()` are treated as read-only.

### Network, data and settings

- [ ] Every `fetch` goes to a host in the app's `connect-src`: `https://api.todoist.com`, `https://huggingface.co`, `https://github.com`, `https://objects.githubusercontent.com` (and Sentry ingest hosts). It passes `run.signal` and has a timeout (use `fetchText` from [Network and platform](11-network-and-platform.md#timeouts)).
- [ ] Every regular expression that matches line or paragraph separators uses `\p{Zl}\p{Zp}` with the `u` flag, never a `\u` escape of them: a write tool that expands the escape leaves a literal separator in the regex, and the file fails to load.
- [ ] `loadData` is called before the first `saveData`, and a `ModDataCorruptError` is handled.
- [ ] No secret (token, password, API key) is written to `ctx.log`, `run.log`, a note, `data.json` or the source.
- [ ] Any write to `ctx.app.settingsStore` is intended to change the user's settings permanently: it is saved to `.kokobrain/settings.json` about half a second later.
- [ ] `localStorage` keys carry a mod prefix (`mod:<id>:...`): the app shares that storage.

## Pitfalls

### Loading

| Symptom | Cause | Fix |
|---------|-------|-----|
| `main.js: found no "export default"; ...` although the file has one | The `export default` line is indented, has no space before `{`, or follows another statement on the same line | Put `export default {` (or `export default mod;`) at column 0 on its own line |
| `main.js: found 2 "export default" lines; use exactly one` with one real export | A template literal or block comment has a line starting with `export default` | Reword or indent that line |
| `main.js: use exactly one "export default" and no "import"; a mod is one file` | An `import`, `import.meta`, `export const` or a second `export default` mid-line | Remove it; bundle packages with a build |
| `main.js: the default export must be an object with an onload function` | `export default function`, `export default class`, a misspelled `onload`, or a top-level `return` | Export an object or an instance |
| A load error quoting the engine (for example about `await`) | A top-level `await` | Move it into `onload` or `run` |
| `Invalid regular expression: missing /` (Node.js) or an unterminated regular expression error, at a regex that looks fine | The regex holds a literal, invisible line or paragraph separator, usually a `\u` escape a write tool expanded | Use `\p{Zl}\p{Zp}` with the `u` flag ([Errors and debugging](15-errors-and-debugging.md#mainjs-evaluation)) |
| `_system/mods/foo: manifest.json id "bar" does not match the folder name` | `id` and folder differ | Rename one of them |
| The mod is gone after a save, with an **Error** row | A reload unloads the old code before loading the new one; there is no rollback | Fix the error and save again |
| A save that did not fix the load error shows no toast | The same load error is not toasted twice in a row for a folder; only a successful load or deleting `manifest.json` clears that memory | Read the Labs row |
| Saving `helper.js` or `README.md` in the mod folder does nothing | Only `main.js` and `manifest.json` trigger a reload | Save `main.js`, or bundle into it |
| `onload failed: Mod "<id>": duplicate action id "<actionId>"` | The same id registered twice | Unique ids; register once |
| A load error in the log file shows `{}` and no stack | The log file stringifies the raw `Error` | Expand **Stack trace** in Labs |
| Load order between mods differs between launches | Mods load concurrently; completion order decides | Never depend on another mod's `onload` having run |

### Lifecycle and cleanup

| Symptom | Cause | Fix |
|---------|-------|-----|
| `_system/mods/<id>: onunload failed: Mod "<id>" is unloaded` | `ctx` used inside `onunload`, which runs after the mod is marked unloaded | Save state when it changes; clean up with `ctx.register` callbacks that do not use `ctx` |
| `onunload` never ran after a failed load | `onunload` is skipped when `onload` failed; registered cleanups still run | Register each cleanup as soon as its resource exists |
| `_system/mods/<id>: cleanup failed: ...` | A cleanup threw, or `ctx.register` got a non-function | Pass a function; make cleanups safe to run once |
| A listener or timer fires twice after each save, or keeps running after switching the mod off | Not undone in `ctx.register` | `ctx.register(() => window.removeEventListener(...))`, `clearInterval(...)` |
| `Mod "<id>" is unloaded` thrown from a timer or a late `fetch` callback | The old instance's code still runs after a reload | Clear it in `ctx.register`; return early when `ctx.signal.aborted` |

### Actions and runs

| Symptom | Cause | Fix |
|---------|-------|-----|
| The rail button opens a picker that says `No actions.` | `actions: []`, or ids that do not match an action (skipped silently) | Omit `actions` or list real ids |
| A placed menu item never shows | `menu.on: []`; a non-Markdown file with the default `files: 'markdown'`; or looking in the Files navigator's file rows (`'note'` items appear in the rail note list's row menu, `'folder'` items in Files folder rows and the vault-root menu) | Fix `on` and `files`; look in the right menu |
| The action runs with `''` | **Enter** on an empty input field | Check `text.trim()` and throw |
| After **Stop**, starting the action again runs it twice in parallel, and the old run still writes | **Stop** cannot interrupt JavaScript; the action is free again at once | Check `run.signal.aborted` after every `await` and before every write; pass the signal to `fetch` |
| An error after **Stop** appears nowhere | Rejections after the signal aborted are dropped | Check the signal before risky steps; `ctx.log` before rethrowing if you need a trace |
| The partial-work summary after **Stop** never shows | `run.log` and `run.progress` are ignored after the run ended, and `run.ui` rejects | Report with `ctx.notify(..., { kind: 'warning' })` |
| An unhandled `AbortError` in the console on **Stop** | A `run.ui` call that is not awaited | `await` it or add `.catch` |
| `ctx.ui` dialog stays open after **Stop** | `ctx.ui` belongs to the mod, not the run | Use `run.ui` inside actions |
| A palette or menu action shows no run view and gives no feedback | Runs without `input` from those entry points stay hidden until they log or show progress | `run.log` a line, or `ctx.notify` the result |
| The run view stays on **Done** on top of the note the action just opened | The action called `run.log` or `run.progress` before (or after) opening it | No run output on a path that ends by opening a note; report in a toast, use `run.ui.loading` for a long step |
| A run that found nothing to do ends **Failed** with a red toast | The "nothing to do" case throws | `ctx.notify('Nothing to do: ...'); return;` |
| The user missed that a timer ended | `ctx.notify` toasts for about 4 seconds | `ctx.ui.alert` from the callback, or a chip left in a "done" state |
| The run view says **Reload pending** for a long time | A run of the mod is still live (a quiet run counts too) | Press **Stop**; make long work respect `run.signal` |
| The run fails with `run.progress needs numbers done and total` | `NaN`, `undefined` or a string reached `run.progress` | Pass finite numbers |
| `run.log` shows `[object Object]` | `run.log` applies `String()` to its argument | `run.log(JSON.stringify(value))` |
| Clicking an action again only shows its view | One live run per action; a second start reveals the first | Wait for the run to end, or press **Stop** |
| A cancelled prompt is handled as "empty text", or the reverse | `prompt` resolves `''` for an empty submit and `null` for cancel | Test `=== null` |

### Files and paths

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Invalid vault path "/Users/..."` | An absolute app path passed to `ctx.vault` | Strip `ctx.app.vaultStore.path + '/'` |
| `Invalid vault path "Notes//Idea.md"` | A path joined from a setting with a trailing slash | Collapse repeated `/` |
| `err.message` is `undefined` in a `catch` | File system rejections from `ctx.vault`, `ctx.workspace` and `ctx.app` are bare strings | `err instanceof Error ? err.message : String(err)`, or `errorMessage(err)` |
| A note the mod created never shows in the explorer or in `ctx.kb()` | Its name starts with `.` (from a title such as `.plan` or an empty title), so it is a dotfile | Build names with `safeName`, refuse `''` |
| A link the mod wrote opens another note of the same name | `[[Folder/Name]]` resolves by name only; the folder pins nothing | `[[Folder/Name.md\|Name]]` pins one file ([Writing a wikilink](04-vault-files.md#writing-a-wikilink)) |
| A generated report refuses every run after one refresh, saying its markers were edited | Copied note text contained `<!--` (a task quoting a marker) | Pass copied text through a neutralizer (`<!--` to `&lt;!--`) |
| `"<path>" has unsaved changes in an open tab` | `ctx.vault.write` on a file whose tab (active or in the background) has unsaved edits | Edit the active clean note through the editor; skip or ask the user to save otherwise |
| `"<path>" already exists; use write` or `"<path>" does not exist; use create` | `create` and `write` each refuse the other case | Check `exists` first, or catch and switch |
| Renaming a note rewrote links in other notes | `rename` with a new stem updates wikilinks across the vault, saving those notes | Intended for renames; to move a file without touching links, `create` the copy and `delete` the original |
| `move` rejects with a file system error | The target folder does not exist | Create a file inside it first (there is no `mkdir`) |
| A file named `Idea` without extension appears | The host does not add `.md` | Pass `Idea.md` |
| `ctx.vault.list` order changes between calls | `list` returns the disk's order | Sort the result |
| Writing a `.json` file in the vault adds file history rows and fires `onNoteSaved` | `write` runs the after-save pipeline for every file except a non-note file under `_system/mods/` | Keep mod state in `ctx.saveData` |
| Writing the mod's own `main.js` reloads the mod | The watcher reloads a mod whose `main.js` or `manifest.json` changed | Do not write into your own folder |

### Editor and frontmatter

| Symptom | Cause | Fix |
|---------|-------|-----|
| `editorView` is `null`, or edits go nowhere | The active tab is a canvas, kanban, collection or virtual tab, or the stored view was destroyed when such a tab was shown | Re-read `ctx.app.editorStore.editorView` each time; check `view.dom.isConnected` |
| An edit lands in the previous note right after opening another | The editor swaps documents after `openFileInEditor` resolves | Compare `view.state.doc.toString()` with `activeTab.content.replace(/\r\n?/g, '\n')` before dispatching, or wait a frame |
| Edits to one particular open note always go to disk (and fail with `has unsaved changes` once the user typed) | The note has CRLF line breaks: the editor's text uses `\n`, the tab keeps `\r\n` until the first edit, so an unnormalized comparison never matches | Normalize the tab's text before comparing, as `editNote` does |
| After a mod changes the open note's frontmatter, the next keystroke lands in the `---` block | `updateNoteFrontmatter`, `ctx.vault.write` and `syncExternalContentToEditor` put the caret back at its old offset on the active tab | From a background trigger, leave the active note until the user switches away; from an action, `updateFrontmatterKeepCaret` |
| A note gets a second frontmatter block | Its first lines are an empty `---`/`---` pair, which the app does not read as frontmatter | `updateFrontmatterSafely` ([Raw app: Known problems](09-raw-app.md#known-problems-caret-and-empty-block)) |
| The action edits a different note than the one the user started from | The active tab was read after an `await` | Capture the path at the top of `run` |
| A frontmatter block appeared in a `.canvas` or `.js` file | `updateNoteFrontmatter` does not check the extension | Check `.md` first |
| A side effect in `mutate` happened twice | `updateNoteFrontmatter` may run `mutate` again | Keep `mutate` pure |
| Two "Failed to save file." toasts | The mod toasted a `FrontmatterWriteError` with `reason === 'save-failed'`, which the editor already reported | Skip the toast for that reason |

### Events and reactivity

| Symptom | Cause | Fix |
|---------|-------|-----|
| An endless stream of saves | A `ctx.onNoteSaved` callback writes the note it was told about | Write only when the content differs; skip paths the mod just wrote |
| `onNoteSaved` gets `.canvas`, `.view` or `main.js` paths | It fires for every file saved through the app's pipeline | Filter with `path.endsWith('.md')` |
| `ctx.watch` fires on every change of anything, or never | `read` returns a fresh object each time, or reads plain (non-reactive) values | Return a primitive; read app store getters |
| A watch handler runs on every keystroke | `read` touches `activeTab.content` | Read `activeTabPath` |
| An unhandled rejection from a watch or theme handler | Async `ctx.watch` and `ctx.theme.onChange` callbacks are not caught by the host | Wrap the body in `try`/`catch` |
| `ctx.theme.onChange` fires many times while the user edits a custom theme | Every live-preview color edit applies the theme | Debounce expensive repaints |

### Index queries

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ctx.kb()` shows old `file.tasks`, `file.tags`, links, size or times of a note just written (existence and frontmatter are current at once) | Those fields come from the app's cached snapshot, refreshed about 2 s after a change, up to about 10 s during a burst | Call `ctx.app.vaultStore.requestPromptIndexRefresh()` before the write, read the file directly, or wait for `vaultIndexVersion` to change |
| `kb.pages('Projects')` returns the whole vault | An unquoted source is not parsed and filters nothing | `kb.pages('"Projects"')` |
| A mod archives a note the user edited seconds ago as untouched | `file.mtime` lags a save by about 2 s, up to about 10 s during a burst, and is `0` for a brand-new note | Leave out `0`, skip notes open in a tab |
| A "recently edited" list hides the note the user just edited | The list left out `0` mtimes or notes open in a tab, advice meant for destructive selection | Keep them; show `0` and open tabs as "just now" |
| A task report misses tasks marked `[/]` or `[!]`, or counts them as done | `task.completed` is `true` for every status but `[ ]` | Decide which statuses count; read them from the text with the app's grammar ([Tasks](10-querying-the-index.md#tasks)) |
| `kb` paths never match `ctx.vault` paths | `kb` paths are absolute | Convert with the vault root |
| `kb.current()` is `null` | It is the active tab when `ctx.kb()` was called, and only if that tab is an indexed page | Use `run.target` or pass the path |
| Notes under `_system/` are missing from `kb.pages()` | The system folder (Settings, `_system` by default) is excluded from pages; `kb.page(path)` still finds them | Use `ctx.vault` for those files |
| QueryJS blocks show values a mod changed | Page objects are shared until the index changes | Never assign to page fields |

### Network, data, settings and logs

| Symptom | Cause | Fix |
|---------|-------|-----|
| `fetch` rejects with a generic `TypeError` | The host is not in the CSP `connect-src` (`api.github.com`, `raw.githubusercontent.com`, LLM APIs and `localhost` are all blocked) | Use an allowed host; a new host needs an app release |
| `JSON.parse` fails on a 200 response | A captive portal or error page returned HTML | Read `res.text()` and parse inside `try` |
| `saveData refused: ...` | The previous `loadData` failed | Call `loadData` again and handle its error |
| `saveData needs a value JSON can represent: a Map at "tags"` | A `Map`, `Set`, class instance, `NaN` or `undefined` in an array | Convert to plain objects and arrays |
| `loadData` resolves `null` after saving | `null` was saved, and it reads back the same as no file | Save an object |
| The mod's data is empty after renaming the mod | Data is kept per manifest `id` | Move `.kokobrain/mods/<old>/` to the new id |
| The user's settings changed permanently | Writes through `ctx.app.settingsStore` are saved to disk after a short debounce | Write settings only on purpose |
| `ctx.log` writes nothing | Neither **Debug mode** nor **Save debug log to file** is on | Turn on **Save debug log to file** |
| `ctx.log(err)` writes `{}` | An `Error` has no enumerable fields | Log `err.message` and `err.stack` |
| Log times are hours off | Log timestamps are UTC | Convert when reading |
| **Inspect** is missing from the right-click menu | Devtools are only in development and debug builds | Use the session log file |
| The app freezes and **Stop** does nothing | A synchronous infinite loop on the main thread | Quit, rename the mod folder in Finder, reopen |
| No macOS notification appears | `ctx.notify` is an in-app toast only | Use a toast, or an in-app dialog |
| Another part of the app loses a `localStorage` value | The mod used an unprefixed key | Prefix keys with `mod:<id>:` |

See [Errors and debugging](15-errors-and-debugging.md#error-message-catalog) for every message and [where it shows up](15-errors-and-debugging.md#where-errors-surface).
