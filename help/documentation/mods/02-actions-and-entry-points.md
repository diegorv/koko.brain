# Actions and Entry Points

An **action** is the unit of work a mod offers: an id, a title and a `run` function. A mod registers actions with `ctx.addAction`, then decides where the user can start them: a rail button (`ctx.addRailButton`), the command palette or a right-click menu (`ctx.labs.place`), or code (`ctx.app.modCommandsStore`). Every entry point goes through the same host wrapper, so the run view, **Stop**, the busy mark and the one-live-run rule behave the same wherever an action starts. What happens once it runs is in [Runs](03-runs.md).

All code below goes inside `onload(ctx) { ... }` unless it is a full `main.js`. For the folder layout and the loader rules, see [Anatomy and loading](01-anatomy-and-loading.md); for the user-facing overview, [Vault Mods](../28-mods.md).

Stability tags used here: **stable** (contract v1, `ModContextV1`), **unstable** (`ctx.labs`, may change without an API version bump), **raw** (`ctx.app`, the app's own objects, no compatibility promise).

## Entry points at a glance

| Entry point | Registered with | Stability | `run.target` | Run view opens (action without `input`) | Run view opens (action with `input`) |
|-------------|-----------------|-----------|--------------|------------------------------------------|---------------------------------------|
| Rail button | `ctx.addRailButton` | stable | absent | at start | at Enter in the text field |
| Command palette (**Cmd+P**) | `ctx.labs.place(id, { palette: true })` | unstable | absent | on the first `run.log` or `run.progress` | at Enter in the text field |
| Rail note list row menu | `ctx.labs.place(id, { menu: { on: ['note'] } })` | unstable | `{ on: 'note', path }` | on the first `run.log` or `run.progress` | at Enter in the text field |
| Files navigator folder and vault-root menu | `ctx.labs.place(id, { menu: { on: ['folder'] } })` | unstable | `{ on: 'folder', path }` | on the first `run.log` or `run.progress` | at Enter in the text field |
| Code (another mod, a shortcut) | `ctx.app.modCommandsStore.list[i].run()` | raw | absent | on the first `run.log` or `run.progress` | at Enter in the text field |
| Auto Organize rule | `ruleActions` in `manifest.json`, then a rule's **Run mod action** | manifest | `{ on: 'note', path }` | on the first `run.log` or `run.progress` | never: the action runs with `''` and no text field |

A registered action has no entry point until you give it one: it is not in the palette, not on the rail and not in any menu. It is only reachable through `ctx.app.modCommandsStore`. A rail button without `actions` counts as an entry point for every action of the mod, including ones added after it.

## `ctx.addAction`

**Stable.** `ctx.addAction(action) => () => void`

```javascript
const removeIdea = ctx.addAction({
	id: 'new-idea',                          // unique within this mod
	title: 'New idea note',                  // row title, run view title, toast and menu label
	description: 'Asks for a title',         // optional row subtitle
	input: { placeholder: 'Idea title' },    // optional: ask for one line of text first
	run: async (text, run) => {
		// text is what the user typed ('' without input); run is described in 03-runs.md
	},
});
```

### Fields

| Field | Type | Required | Default | Rules and effect |
|-------|------|----------|---------|------------------|
| `id` | `string` | yes | | Any non-empty string, no charset rule and no trimming (`' '` passes). Unique among this mod's live actions. Ids of different mods never collide |
| `title` | `string` | yes | | Any non-empty string. Shown as the picker row, the run view heading, the `<Mod name>: <title>` palette and menu label, and in the failure toast `<Mod name>: <title> failed: <message>` |
| `description` | `string` | no | none | Picker row subtitle; also searched by the picker filter. `''` is allowed and shows nothing |
| `input` | `{ placeholder?: string }` | no | none | When set (even `{}`), the action asks for one line of text before it runs. `placeholder` is the text field's placeholder (`''` when omitted) |
| `run` | `(input: string, run: ModRunV1) => unknown` | yes | | Called with the typed text (`''` for an action without `input`) and the [run object](03-runs.md#the-run-object). May be sync or async. The return value is ignored |

### Validation

The checks run in this order; the first failure throws synchronously. Every message starts with `Mod "<mod-id>": `.

| Check | Message after the prefix |
|-------|--------------------------|
| `action` is an object with a non-empty string `id` (also for `undefined` or `null` actions) | `addAction needs a non-empty string id` |
| `title` is a non-empty string | `addAction needs a non-empty string title` |
| `run` is a function | `addAction needs a run function` |
| `description` is `undefined` or a string | `addAction needs a string description` |
| `input` is `undefined`, or a non-null object whose `placeholder` is `undefined` or a string (`null`, `false`, `'text'` and `{ placeholder: 3 }` all fail) | `addAction needs input to be an object with an optional string placeholder` |
| `id` is not already used by a live action of this mod | `duplicate action id "<id>"` |

After the mod is unloaded (or the vault changed), every `ctx` call, `addAction` included, throws `Mod "<mod-id>" is unloaded` before any of these checks.

A throw inside `onload` that you do not catch fails the whole load. The Labs row and a toast then show, for example, `_system/mods/my-mod: onload failed: Mod "my-mod": duplicate action id "x"`, and what that `onload` registered before the throw is removed.

### What the host keeps

The host stores a copy: `{ id, title, description, input: input && { placeholder }, run }`. Changing your object later has no effect, extra keys are dropped, and `input` keeps only `placeholder`. To change a title, remove the action and add it again.

You can add actions at any time while the mod is loaded, not only in `onload`. Rail buttons resolve their actions at click time, so an action added later shows up on the next click.

### Removing an action

The returned function removes the action, every `ctx.labs.place` placement of it (palette mark and menu entries) and its `modCommandsStore` row. It runs once: calling it again, or the unload calling it, does nothing more. Afterwards the id is free and can be registered again. Unload calls it for you; you never need `ctx.register` for actions.

Removing an action does not stop a run of it that is already going. That run ends on its own or on **Stop**.

### The `run` function contract

- A sync throw and an async rejection are the same: the run ends **Failed** and a toast shows `<Mod name>: <title> failed: <message>`, unless the run was stopped first. See [Runs: failures](03-runs.md#failures).
- Throw an `Error` for anything the user should see. `throw 'text'` works but has no stack in the **Details** expander.
- Inside `run`, use `run.ui` for dialogs, check `run.signal.aborted` between steps, and pass `run.signal` to `fetch`. See [Runs](03-runs.md#cancellation-patterns).
- Never trim-and-ignore silently: the text field passes `''` when the user presses **Enter** on an empty field, so validate `text` and throw a clear error.
- A state with **nothing to do** (nothing selected, every note already done) is not an error: `ctx.notify(...)` and `return`. A throw would end the run **Failed**. See [Runs: ending an action](03-runs.md#ending-an-action).
- An action that ends by **opening a note or a dialog** must not call `run.log` or `run.progress` on its success path: the run view would stay on **Done** on top of what it opened.

## `ctx.addRailButton`

**Stable.** `ctx.addRailButton(button) => () => void`

```javascript
ctx.addRailButton({
	id: 'main',                          // unique among this mod's rail buttons
	title: 'Ideas',                      // tooltip, accessible name of the button and of the picker
	icon: 'lucide:lightbulb',            // icon ref, see Icons
	actions: ['new-idea', 'list-ideas'], // optional: which actions, in this order
});
```

### Fields

| Field | Type | Required | Default | Rules and effect |
|-------|------|----------|---------|------------------|
| `id` | `string` | yes | | Non-empty string, unique among this mod's live rail buttons. Separate from action ids: a button and an action can share an id |
| `title` | `string` | yes | | Non-empty string. The button's tooltip and `aria-label`, and the accessible title of the picker it opens |
| `icon` | `string` | yes | | Any string, `''` included. See [Icons](#icons). An icon that does not resolve shows the fallback glyph, never an error |
| `actions` | `string[]` | no | every action of the mod | Action ids the picker lists, in this order. See [How `actions` resolves](#how-actions-resolves) |

### Validation

Same `Mod "<mod-id>": ` prefix, same order.

| Check | Message after the prefix |
|-------|--------------------------|
| non-empty string `id` | `addRailButton needs a non-empty string id` |
| non-empty string `title` | `addRailButton needs a non-empty string title` |
| `icon` is a string (any value, `''` too) | `addRailButton needs a string icon` |
| `actions` is `undefined` or an array of strings | `addRailButton needs actions to be a list of action ids` |
| `id` not used by a live button of this mod | `duplicate rail button id "<id>"` |

The `actions` array is copied: changing it later has no effect. Unknown ids are **not** an error at registration.

### How `actions` resolves

The list is resolved **at click time**, against the mod's live actions:

| `actions` | The picker lists |
|-----------|------------------|
| omitted (`undefined`) | every live action of the mod, in registration order, including actions added after the button |
| `['a', 'b']` | `a` then `b`, in that order. Ids with no live action are **skipped silently** (no error, no log). Actions not named are never listed |
| `[]` | **nothing**. An empty array does not mean "all": the click opens an empty picker that says `No actions.` |

Do not repeat an id in `actions`: each copy becomes a row, and the rows share a key in the picker's list.

### Rendering, color and busy mark

- Mod buttons render in the rail's **Actions** group, after the pinned items and navigators and before the bottom items, in registration order across mods. The group title `Actions` shows only in the labeled rail style.
- A mod button is never highlighted as active, has no count badge, and is never remembered as the selected rail item. A click calls the picker; nothing else.
- Color comes from the manifest's `color` (`light` in light mode, `dark` in dark mode, following the theme live); without it the rail's default action color. See [Anatomy and loading](01-anatomy-and-loading.md#fields).
- **Busy mark:** while any action the button lists has a live run (a button without `actions` lists every action), the button shows a pulsing dot and `aria-busy`. A quiet run (see [Runs](03-runs.md#quiet-runs)) lights it too, which is often the only visible sign that it is running.

The returned function removes the button and frees its id. Unload calls it for you.

## Icons

An icon ref is `pack:name` or a bare name, which means `lucide:<name>`. Leading and trailing spaces are trimmed.

| Pack | Example |
|------|---------|
| `lucide` (default for bare names; also accepts Lucide's alias names) | `lucide:sparkles`, `sparkles` |
| `feather` | `feather:zap` |
| `fa-solid`, `fa-regular`, `fa-brands` | `fa-solid:bolt` |
| `octicons` | `octicons:rocket` |
| `boxicons`, `coolicons`, `simple-icons`, `tabler`, `remix` | `tabler:bolt` |
| `emoji` | `emoji:` followed by the emoji character itself, e.g. the rocket (U+1F680). A closed list of about 200 emojis; the variation selector (U+FE0F) must match the list's entry |

Names are matched exactly (case-sensitive) within the pack. Boxicons names carry their style prefix: `boxicons:bx-home`, `bxs-` for solid, `bxl-` for logos. The fallback glyph is Lucide's **Puzzle**. It shows for:

- an empty or whitespace-only icon,
- a ref with a colon whose prefix is not one of the packs above (`mdi:home`),
- a name the pack does not have, or an emoji outside the `emoji` list,
- a valid icon whose pack is not loaded yet. Packs load lazily: the host starts loading the button's pack when the button is added, so a button can show **Puzzle** for a moment and then switch to its icon. A pack that fails to load leaves **Puzzle** and writes `cannot load icon pack <pack>:` to the mod's debug log.

> [!TIP]
> To pick a name, open any note's **Change icon** dialog: it lists the same packs, and hovering an icon shows its name and pack.

## The action picker

The picker is one modal for every mod. It has three views: an **action list**, a **text field** (the input step) and the **run view**. Only rail buttons can show the list; every other entry point names a single action.

> [!NOTE]
> The picker's title is an accessible name only (screen readers), not visible text. In the input step the user sees only the field, its placeholder and the hint "Press Enter to run, Esc to cancel". Write a placeholder that says what to type.

### What a click does

The decision is made when the entry point fires, on the resolved list:

| Resolved actions | The action | Result |
|------------------|------------|--------|
| 0 | | Picker opens on an empty list: `No actions.` |
| 1 | no `input` | Runs at once with `''`; no list. From the rail the run view opens at start; from a menu, the palette or code the run is quiet until it logs or shows progress |
| 1 | `input`, idle | Picker opens straight on the text field |
| 1 | `input` or not, **running** | Shows the live run's view. Nothing new starts |
| 2 or more | | The action list |

"Resolves to one" counts after unknown ids are skipped: `actions: ['missing', 'real']` behaves as a single-action button.

### List view

- A search field, `Pick an action...`, filters the rows as you type. Each row's value is the action id and its keywords are the title and the description.
- Each row shows the title and, under it, the description. A row whose action has a live run shows a muted **Running** after the title. That mark is display text only: typing `running` does not match it.
- Picking a row: an idle action with `input` moves to the text field. Any other row calls the action with `''`, which either starts it (the run view replaces the list) or, when it is running, shows its live run.
- `No actions.` shows for an empty list and for a search with no match.
- **Esc** or a click outside closes the picker. Nothing runs.

### Input step

- A single-line text field with autofocus and the action's `placeholder`.
- **Enter** runs the action with the text exactly as typed: not trimmed, not validated. **Enter** on an empty field runs it with `''`; whitespace is passed through. Validate in `run`.
- **Enter** while an input method is composing (`isComposing` is true, for example Japanese or Chinese input) does not submit; it confirms the composed characters. That is the only IME check.
- **Esc** closes the picker. Nothing runs.
- The field is cleared whenever the picker moves to another action's text field, so typed text never carries over to the next action.
- Submitting re-checks the one-live-run rule: if the action started elsewhere while the field was open, **Enter** shows that run instead of starting a second one.
- After **Enter** the run view replaces the field at once, whatever the entry point.

### Run view

Shows the run's title, status, progress bar, log, error and **Stop** and **Close**. Its open and close rules depend on the entry point; they are in [Runs: when the run view opens](03-runs.md#when-the-run-view-opens). Any later picker open (another rail click, another run's first output) replaces whatever the picker showed, including another mod's text field or run view; the replaced run keeps running.

## `ctx.labs.place`

**Unstable.** `ctx.labs.place(actionId, options) => () => void`

Places a registered action in the command palette, in right-click menus, or both. Register the action first.

```javascript
ctx.addAction({ id: 'word-count', title: 'Count words', run: async (_text, run) => { /* ... */ } });
const unplace = ctx.labs.place('word-count', {
	palette: true,
	menu: { on: ['note'], files: 'markdown' },
});
```

### Options

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `palette` | `true` | not in the palette | Lists the action in **Cmd+P**. Only the literal `true` is accepted |
| `menu` | `{ on, files? }` | no menu entry | Adds a flat item to right-click menus |
| `menu.on` | `('note' \| 'folder')[]` | required with `menu` | Which menus show the item. `[]` is accepted and shows it nowhere |
| `menu.files` | `'markdown' \| 'all'` | `'markdown'` | Note menus only: which file rows show the item. Ignored for folders |

At least one of `palette: true` or `menu` is required. A menu-only placement, `{ menu: { on: ['note'] } }` with no `palette` key, is valid: the action shows in the menu and not in the palette.

### Validation

In this order. Messages start with `Mod "<mod-id>": `, except the first.

| Check | Message |
|-------|---------|
| the mod is live | `Mod "<mod-id>" is unloaded` |
| `actionId` is a live action of **this** mod (you cannot place another mod's action) | `unknown action id "<actionId>"` |
| `palette` is `true` or `menu` is set (`{}`, `null`, `undefined`, `{ palette: false }` and `{ palette: 'yes' }` all fail here) | `labs.place needs palette: true or menu` |
| `palette`, when the key is present, is exactly `true`. Omitting it is fine (a menu-only placement); `{ palette: false, menu: ... }` fails here | `labs.place needs palette: true` |
| `menu` is an object whose `on` is an array of `'note'` and `'folder'` only (`menu: null`, `on: 'note'`, `on: ['file']` fail) | `labs.place needs menu.on to list note or folder` |
| `menu.files` is omitted, `'markdown'` or `'all'` | `labs.place needs menu.files to be markdown or all` |

Everything is validated before anything registers: a failing call leaves no palette mark and no menu item. `on` may repeat a value; `files` is not checked against `on`.

### Command palette

- The palette lists `<Mod name>: <Action title>` in the category **Mod**, with no shortcut. The palette updates live: placements added or removed while it is open appear and disappear.
- Selecting it is the `command` entry point: an action without `input` runs quietly, one with `input` opens the picker on its text field, a running one shows its run view.
- Adding a rail button never adds a palette entry, and a palette entry never adds a rail button.

### Note and folder menus

| `on` | Where the item shows | Where it does **not** show | `run.target.path` |
|------|---------------------|-----------------------------|-------------------|
| `'note'` | The right-click menu of a row in the **rail note list** (the list a rail navigator shows), for the right-clicked row. It sits after **Reveal in Finder**, before the separator that precedes **Rename** | The Files navigator (it lists folders only), editor tabs, search results, backlinks, the editor | The note's vault-relative path, extension included, e.g. `Projects/Plan.md` |
| `'folder'` | The **Files navigator** right-click menu of a folder row, and of the vault root (right-click on the root row or on empty space in the tree). It sits after **New folder** | Folder rows anywhere else | The folder's vault-relative path, e.g. `Projects/2026`; `''` for the vault root |

- The item label is `<Mod name>: <Action title>`, captured when `place` is called. It is a flat item (no submenu, no icon) among the built-in items.
- **The `files` filter** applies to note rows only. `'markdown'` shows the item for files whose last extension, case-insensitive, is `.md` or `.markdown`. `'all'` shows it for every row: `.canvas`, `.view`, PDFs, images, `.txt` and files without an extension. Folders ignore `files`.
- Menus only read data. The app never calls mod code while it builds a menu, so there is no "show when" callback: an item is either placed or not. To refuse a target, throw from `run` with a clear message.
- Selecting the item copies the target and starts the action with origin `note-menu` or `folder-menu`. Without `input` the run is quiet; with `input` the picker opens on the text field and the target stays the clicked one.

### Replacement and disposal

- An action has at most **one menu entry**. A second `place` with a `menu` for the same action **replaces** the first menu entry entirely (its `on` and `files`); it does not merge them. To show an action on both menus, pass `on: ['note', 'folder']` in one call.
- A `place` with only `palette: true` leaves the menu entry alone.
- Palette marks are independent: each `place` with `palette: true` adds one. The action stays in the palette until every placement that marked it is disposed.
- The returned function removes this placement's palette mark and its menu entry, once (later calls do nothing). Disposing an older placement whose menu entry was already replaced does not remove the replacement; disposing the replacement does not bring the older one back.
- Removing the action or unloading the mod disposes all its placements. A reload therefore leaves exactly one set of entries, from the new `onload`.
- `menu: { on: [] }` registers an entry that no menu shows. It still counts as the action's menu entry, so it replaces a visible one. You can use it to hide a menu entry while keeping the placement, but disposing is clearer.

## `run.target`

**Stable** (part of `ModRunV1`).

| Started from | `run.target` |
|--------------|--------------|
| Note row menu | `{ on: 'note', path: 'Folder/Note.md' }` |
| Folder menu | `{ on: 'folder', path: 'Folder' }`, or `{ on: 'folder', path: '' }` for the vault root |
| Auto Organize rule | `{ on: 'note', path: 'Folder/Note.md' }`, the note's path at the end of the save (after the rule's rename and move) |
| Rail button, palette, `modCommandsStore` row | the `target` key is **absent** (not `undefined`: `'target' in run` is false) |

- The path is vault-relative with no leading slash, ready for `ctx.vault` and `ctx.workspace` (see [Vault files](04-vault-files.md#vault-relative-paths)).
- The target is copied **at the menu click**, before any text field opens. It stays the clicked note or folder while the user types, while dialogs are open and for the whole run, whatever the user opens in the editor meanwhile.
- Selecting a menu item for an action that is already running shows the live run, which keeps **its** target. The new click's target is discarded.
- The entry point itself (`rail`, `command`, `note-menu`, `folder-menu`, `rule`) is not exposed to mods; it appears only in the host's debug trace. `run.target` is the only signal you get, and a rule's target looks exactly like a note menu click's.

### Active-note fallback

An action placed in a note menu and in the palette gets a target from the menu but none from the palette. The usual fallback is the active editor tab. Resolve the note **synchronously, as the first statement of `run`**, before any `await` or dialog: once you await, the user can switch tabs and you would edit the wrong note.

```javascript
// Inside onload(ctx). Returns the vault-relative path of the clicked note, or the active note.
function targetNote(run) {
	if (run.target) {
		if (run.target.on !== 'note') throw new Error('Choose a note');
		return run.target.path;
	}
	const tab = ctx.app.editorStore.activeTab;          // raw: no compatibility promise
	// Virtual tabs (Tasks, Graph) have no file in the vault.
	if (!tab || !tab.path.startsWith(`${ctx.app.vaultStore.path}/`)) throw new Error('Open a note first');
	const path = toVaultPath(ctx, tab.path);
	if (!/\.(md|markdown)$/i.test(path)) throw new Error('The active tab is not a Markdown note');
	return path;
}
// toVaultPath, toAbsolute and editNote: the canonical helpers from 04-vault-files.md.

ctx.addAction({
	id: 'stamp',
	title: 'Add a timestamp line',
	run: async (_text, run) => {
		const path = targetNote(run);                    // before any await
		const stamp = new Date().toLocaleString();
		// Through the editor when the note is the active one, else on disk.
		await editNote(ctx, toAbsolute(ctx, path), (text) =>
			run.signal.aborted ? text : `${text.replace(/\n*$/, '\n')}\n${stamp}\n`);
	},
});
ctx.labs.place('stamp', { palette: true, menu: { on: ['note'] } });
```

A plain `ctx.vault.read` and `write` would refuse a note with unsaved changes in an open tab, and on the clean active note it would move the user's caret. [`editNote`](04-vault-files.md#editnote) goes through the editor for the active note: see [Vault files](04-vault-files.md#editing-a-note-that-may-be-open). For `editorStore` and `vaultStore`, see [The raw app](09-raw-app.md#editorstore) and [vaultStore](09-raw-app.md#vaultstore).

## Actions a rule can run

An [Auto Organize rule](../22-auto-organize.md#running-a-mod-action) can run a mod action on the note it matched, a few seconds after the note is saved. A mod offers an action to rules by listing its id in `manifest.json`:

```json
{ "id": "ai-tools", "name": "AI tools", "version": "1.0.0", "ruleActions": ["summarize"] }
```

- **Opt-in per action.** Only the ids in `ruleActions` are offered, and only while the mod is loaded and the action registered (`ctx.addAction`). Removing the action or unloading the mod takes it out of the rules' list. A rule that names any other action skips it and logs it once.
- **The call:** the host wrapper with input `''` and `run.target = { on: 'note', path }`, the note's vault-relative path at the end of the save. The run view opens only on the first `run.log` or `run.progress`, as from the palette. An action with `input` gets `''`: no text field opens.
- **Busy:** while the action has a live run, a rule's call starts nothing and shows nothing.
- **No contract change.** It is the same `run(input, run)` and the same `run.target` as a note menu click, so you cannot tell the two apart. Write a listed action to be **rule-safe** for every target: nobody clicked, so it must not open `run.ui` or `ctx.ui` dialogs. The rule does not wait for the run, so a dialog nobody answers only leaves the run open until **Stop**.
- **Its writes are saves.** A write to the note it was run on runs the rules again, and the action again while the note matches. Set a marker property the rule's filter excludes, or skip a write that changes nothing (see [Auto Organize](../22-auto-organize.md#running-a-mod-action)).
- **Failures** end the run **Failed** with the usual toast.

## `ctx.app.modCommandsStore`

**Raw.** Every registered action of every loaded mod, whether it is placed anywhere or not.

```javascript
const rows = ctx.app.modCommandsStore.list;
// [{ id: 'mod:hello:action:new-note', label: 'Hello: New note', run: [Function], palette: false }, ...]
```

| Row field | Type | Value |
|-----------|------|-------|
| `id` | `string` | `mod:<mod-id>:action:<action-id>` |
| `label` | `string` | `<Mod name>: <Action title>`, the palette and menu label |
| `run` | `() => void` | Starts the action through the host, as the palette does |
| `palette` | `boolean` | `true` while at least one `ctx.labs.place(..., { palette: true })` placement of the action exists |

- `list` returns new row objects on every read, in registration order. Do not keep rows or compare them by identity; look the row up by `id` right before you call it.
- A row disappears when its action is removed or its mod unloads. After a reload the same `id` comes back with a new `run`.
- Reading `ctx.app` throws `Mod "<mod-id>" is unloaded` once your own mod is unloaded.

### `row.run()`

- Synchronous. It returns `undefined`, not a promise: you cannot await the action or learn how it ended.
- Takes no argument: you cannot pass input. An action with `input` opens the picker on its text field and the user types the text.
- Behaves like the palette entry point (`command`): an action without `input` runs quietly until it logs or shows progress; a running action shows its live run and starts nothing.
- Throws synchronously when the row is stale: `Mod "<other-mod-id>" is unloaded` when the action's mod has unloaded (the message names the mod that owns the action), or `Mod "<other-mod-id>": unknown action id "<action-id>"` when the action was removed or replaced.
- The started run is a separate run of the other action. Your own run, if you call it from an action, does not wait for it, and **Stop** on yours does not stop it.
- When the other action opens the picker (a text field, or a run view on its first output), that view replaces whatever the picker was showing, your own run view included. Your run keeps going.

### Invoking another mod's action

```javascript
// Inside onload(ctx). Starts the hello example's "New note" action, which asks for a title.
const HELLO_NEW_NOTE = 'mod:hello:action:new-note';

ctx.addAction({
	id: 'start-hello',
	title: 'Start Hello: New note',
	run: () => {
		// Look the row up at call time: a reload of the other mod replaces it.
		const row = ctx.app.modCommandsStore.list.find((r) => r.id === HELLO_NEW_NOTE);
		if (!row) throw new Error('The hello mod is not loaded');
		row.run(); // returns at once; may throw if the hello mod unloaded in between
	},
});
ctx.labs.place('start-hello', { palette: true });
```

To list every action of a mod, filter by prefix: `list.filter((r) => r.id.startsWith('mod:hello:action:'))`. If you show the user a choice first (`run.ui.pick`), look the row up again after the pick: the other mod can reload while your dialog is open.

The same call starts **your own** action from code, for example from a keyboard shortcut, with the full run machinery (run view, **Stop**, busy mark): `ctx.app.modCommandsStore.list.find((r) => r.id === 'mod:<your-id>:action:<action-id>')?.run()`. See [Events and reactivity](07-events-and-reactivity.md#keyboard-shortcuts) for registering shortcuts.

## A complete mod

A `main.js` with a rail button over two actions, a palette entry, a note menu entry and a folder menu entry. Copy it with a `manifest.json` whose `id` is `entry-points-demo` into `_system/mods/entry-points-demo/`.

```javascript
const REPORT_FOLDER = 'Entry points demo';

/** The canonical helper from 04-vault-files.md: absolute app path to vault-relative, "//" collapsed. */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

export default {
	onload(ctx) {
		/** Vault-relative path of the clicked note, else the active Markdown note; call it before any await. */
		function targetNote(run) {
			if (run.target) {
				if (run.target.on !== 'note') throw new Error('Choose a note');
				return run.target.path;
			}
			const tab = ctx.app.editorStore.activeTab;
			if (!tab || !tab.path.startsWith(`${ctx.app.vaultStore.path}/`)) throw new Error('Open a note first');
			const path = toVaultPath(ctx, tab.path);
			if (!/\.(md|markdown)$/i.test(path)) throw new Error('The active tab is not a Markdown note');
			return path;
		}

		ctx.addAction({
			id: 'word-count',
			title: 'Count words',
			description: 'In the clicked or active note',
			run: async (_text, run) => {
				const path = targetNote(run);
				const text = await ctx.vault.read(path);
				const words = text.split(/\s+/).filter(Boolean).length;
				ctx.notify(`${path}: ${words} words`);
			},
		});
		ctx.labs.place('word-count', { palette: true, menu: { on: ['note'] } });

		ctx.addAction({
			id: 'list-folder',
			title: 'List notes in a folder',
			description: 'Writes a note with links to every Markdown file in it',
			input: { placeholder: 'Folder (empty for the vault root)' },
			run: async (text, run) => {
				// A folder menu click supplies the folder; the text field still opens because of input.
				const folder = run.target?.on === 'folder' ? run.target.path : text.trim().replace(/^\/+|\/+$/g, '');
				const entries = await ctx.vault.list(folder);
				if (run.signal.aborted) return;
				const notes = entries.filter((e) => !e.isFolder && /\.md$/i.test(e.name));
				if (notes.length === 0) return ctx.notify(`No notes in ${folder || 'the vault root'}`);
				const name = (folder || 'vault root').replace(/\//g, ' - ');
				const path = `${REPORT_FOLDER}/${name}.md`;
				// Pinned links ([[Folder/Name.md|Name]]): a note of the same name elsewhere cannot capture them.
				const links = notes.map((n) => `- [[${n.path}|${n.name.replace(/\.md$/i, '')}]]`);
				const body = `# ${folder || 'Vault root'}\n\n${links.join('\n')}\n`;
				if (await ctx.vault.exists(path)) await ctx.vault.write(path, body);
				else await ctx.vault.create(path, body);
				if (run.signal.aborted) return;
				// Last step, with no run.log or run.progress before it: the run view closes and the note shows.
				await ctx.workspace.openNote(path);
			},
		});
		ctx.labs.place('list-folder', { palette: true, menu: { on: ['folder'] } });

		ctx.addRailButton({
			id: 'main',
			title: 'Entry points demo',
			icon: 'lucide:mouse-pointer-click',
			actions: ['word-count', 'list-folder'],
		});
	},
};
```

`ctx.vault.create` creates missing parent folders and refuses an existing path; `write` refuses a missing one. Both are covered in [Vault files](04-vault-files.md#writing).

## Errors

| Message | Thrown by |
|---------|-----------|
| `Mod "<id>" is unloaded` | any `ctx` call or `ctx.app` read after unload or a vault change; a stale `modCommandsStore` row's `run()` (naming the row's mod) |
| `Mod "<id>": addAction needs a non-empty string id` | `addAction` |
| `Mod "<id>": addAction needs a non-empty string title` | `addAction` |
| `Mod "<id>": addAction needs a run function` | `addAction` |
| `Mod "<id>": addAction needs a string description` | `addAction` |
| `Mod "<id>": addAction needs input to be an object with an optional string placeholder` | `addAction` |
| `Mod "<id>": duplicate action id "<action-id>"` | `addAction` |
| `Mod "<id>": addRailButton needs a non-empty string id` | `addRailButton` |
| `Mod "<id>": addRailButton needs a non-empty string title` | `addRailButton` |
| `Mod "<id>": addRailButton needs a string icon` | `addRailButton` |
| `Mod "<id>": addRailButton needs actions to be a list of action ids` | `addRailButton` |
| `Mod "<id>": duplicate rail button id "<button-id>"` | `addRailButton` |
| `Mod "<id>": unknown action id "<action-id>"` | `labs.place` with an id this mod has not registered; a `modCommandsStore` row or menu item whose action was removed or replaced |
| `Mod "<id>": labs.place needs palette: true or menu` | `labs.place` |
| `Mod "<id>": labs.place needs palette: true` | `labs.place` |
| `Mod "<id>": labs.place needs menu.on to list note or folder` | `labs.place` |
| `Mod "<id>": labs.place needs menu.files to be markdown or all` | `labs.place` |

For errors raised while an action runs, see [Runs](03-runs.md#failures) and [Errors and debugging](15-errors-and-debugging.md#error-message-catalog).
