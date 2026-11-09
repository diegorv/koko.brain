# Custom UI

A mod can build any UI the DOM allows: its own dialog, a chip in the status bar, a widget inside the editor, a chart. The app promises exactly one thing for that UI, the **theme color contract**. Everything else a custom UI touches (the app's markup, its CSS classes, the rail registry) is raw access and can change in any release.

Before building your own UI, check whether the app's dialogs already do the job: `run.ui` and `ctx.ui` give themed alert, confirm, prompt, pick and loading dialogs with keyboard handling and Stop semantics for free (see [Dialogs](06-dialogs.md)).

| Need | Route | Stability |
|------|-------|-----------|
| Ask the user something, show a result | `run.ui` / `ctx.ui` ([Dialogs](06-dialogs.md)) | **stable** |
| A button in the rail | `ctx.addRailButton` ([Actions](02-actions-and-entry-points.md#ctxaddrailbutton)) | **stable** |
| A palette entry, a note or folder menu item | `ctx.labs.place` ([Actions](02-actions-and-entry-points.md#ctxlabsplace)) | **unstable** |
| Colors for your own DOM, canvas or chart | `ctx.theme` and the CSS variables ([below](#the-theme-color-contract)) | **stable** |
| A panel or window of your own | a native `<dialog>` ([below](#a-themed-modal-dialog)) | your DOM, **stable** colors |
| Something always visible in the app's chrome | mount into an app region ([below](#mounting-into-app-regions)) | **raw** (selectors) |
| A navigator, lens, Today section, folder creator | `ctx.app.railRegistryStore` ([below](#rail-registries)) | **raw** |

## The theme color contract

### Keys and CSS variables

`ctx.theme` exposes the theme's **Global** colors. Each key is also a CSS custom property on `<html>`, so DOM you build can use `var(--name)` and follow every theme, custom themes and light/dark switches with no code. The 20 keys and their variable names are frozen by a host test: renaming one breaks mods, so they stay. **stable**

| Key | CSS variable | What the app paints with it |
|-----|--------------|-----------------------------|
| `background` | `--background` | Base app background, for surfaces without a variable of their own |
| `foreground` | `--foreground` | Default text on `background` |
| `card` | `--card` | Generic card surface background |
| `cardForeground` | `--card-foreground` | Text on `card`. A theme cannot set it: it is the stylesheet's light or dark default, following `mode` |
| `popover` | `--popover` | Dropdowns and dialogs |
| `popoverForeground` | `--popover-foreground` | Text on `popover` |
| `primary` | `--primary` | Links, focus accent, primary buttons |
| `primaryForeground` | `--primary-foreground` | Text on `primary` |
| `secondary` | `--secondary` | Secondary, muted surfaces and buttons |
| `secondaryForeground` | `--secondary-foreground` | Text on `secondary` |
| `muted` | `--muted` | Muted backgrounds |
| `mutedForeground` | `--muted-foreground` | Captions, hints, secondary text |
| `accent` | `--accent` | Hover and selected surfaces |
| `accentForeground` | `--accent-foreground` | Text on `accent` |
| `destructive` | `--destructive` | Errors, delete buttons |
| `destructiveForeground` | `--destructive-foreground` | Text on `destructive` |
| `border` | `--border` | Borders |
| `input` | `--input` | Input borders |
| `ring` | `--ring` | Focus ring |
| `divider` | `--divider` | Separators |

Pair each surface with its `-foreground` variable for text. Other variables exist on the document (`--editor-bg`, `--status-bar-fg`, the syntax and live preview colors), but they are not part of the contract: a mod that reads them is on raw ground. The full theme token list is in [Theming](../26-theming.md).

### Reading colors: `ctx.theme.current`

`ctx.theme.current` is a getter. Each access reads the document root again and returns a **new** object `{ mode, colors }`:

- `colors` has the 20 keys above. Each value is the custom property's text as the theme wrote it, trimmed: `'#21222e'`, `'oklch(0.734 0.16 300)'`. Values are **not** normalized to `rgb()` or hex, and the built-in themes mix hex and `oklch()`. A variable that is not defined reads as `''`.
- `mode` is `'light'` or `'dark'` (see [Light or dark](#light-or-dark-mode)).
- Reading it after unload throws `Mod "<id>" is unloaded`.

Use `current` only where a CSS variable cannot reach: a `<canvas>`, a chart library that takes color strings, a computed contrast. In the DOM, `var(--primary)` is always fresher than a copied value.

### Following changes: `ctx.theme.onChange`

`ctx.theme.onChange(callback)` calls `callback({ mode, colors })` after a theme is applied, and returns a disposer (idempotent; also run at unload). It does **not** fire at subscription, so paint once yourself first.

- It fires on every theme **application**, not only on a real change: loading the vault's settings, switching themes in Settings, updating, uninstalling or deleting one (installing alone does not apply it), saving or cancelling the custom theme editor, re-selecting the same theme, and **every color edit in the theme editor's live preview** (an unsaved draft, with the draft's colors). Keep the callback cheap.
- Several applications in the same tick give one call, with the colors as they are after the last one.
- A synchronous throw is caught and logged under `MOD:<id>`. A returned rejected promise is not caught: it becomes an unhandled rejection. Wrap async work in `try/catch`.
- `callback` must be a function, else it throws `Mod "<id>": theme.onChange needs a callback function`.

### Light or dark: `mode`

`mode` comes from the theme's **editor background** (`--editor-bg`), not from `--background` and not from the macOS appearance: a theme whose editor background is dark (WCAG relative luminance below 0.2) is `'dark'`. An editor background the app cannot parse (anything but hex, `rgb()` or `oklch()`, for example `hsl()`), or none at all, counts as **dark**.

The same step toggles the `dark` class on `<html>` and sets `color-scheme` there, so in DOM you own:

- native controls (scrollbars, `<input>`, `<select>`, checkboxes) already follow the mode;
- a stylesheet in the light DOM can use `html.dark .my-mod-x { ... }`. Inside a shadow root that selector cannot see `<html>`; use the variables, or copy `mode` onto your host element (see [Shadow DOM](#style-isolation-with-shadow-dom)).

## Building DOM safely

Note titles, note text, frontmatter values, file names and anything typed by the user or fetched from the network are **data**. Put them in the DOM as text, never as HTML:

- `node.textContent = value`, `node.append(value)` (a string becomes a text node), `node.setAttribute(name, value)` and `input.value = value` are safe.
- `innerHTML`, `insertAdjacentHTML` and `outerHTML` with such a value are not: a note titled `<img src=x>` becomes an element. The CSP blocks inline scripts and `on*=` attributes, so this is not code execution, but it still breaks layout, can forge UI and loads remote images (`img-src` allows any `https:` host).

A small element builder keeps code short without HTML strings:

```javascript
/** el('button', { type: 'button', onclick: fn }, 'Save'): string children become text nodes. */
function el(tag, props = {}, ...children) {
	const node = document.createElement(tag);
	for (const [key, value] of Object.entries(props)) {
		if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
		else if (key === 'style') node.style.cssText = value;
		else if (value === true) node.setAttribute(key, '');
		else if (value !== false && value != null) node.setAttribute(key, String(value));
	}
	node.append(...children.filter((child) => child != null && child !== false));
	return node;
}
```

When you do build HTML text (a static template, a library that wants a string), escape every interpolated value:

```javascript
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for HTML content and quoted attribute values. */
function escapeHtml(text) {
	return String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// list.innerHTML = notes.map((n) => `<li title="${escapeHtml(n.path)}">${escapeHtml(n.title)}</li>`).join('');
```

> [!WARNING]
> Do not render clickable `<a href="https://...">` links to external sites in your UI. The app opens external URLs through its own opener; what a plain link click does inside the app's web view is not verified, and navigating the main web view would replace the app. Show the URL as text, or copy it with `navigator.clipboard.writeText` (see [Network and platform](11-network-and-platform.md#browser-apis-in-the-web-view)). To link a note, use a button that calls `ctx.workspace.openNote(path)`.

## A themed modal dialog

A native `<dialog>` opened with `showModal()` gives a focus-trapped modal on the browser's top layer, above every app element, with Escape handling built in. This is the pattern for a panel that is more than one question.

```javascript
const PANEL_CLASS = 'mod-panel-example';

// <dialog> centering restated: the app's CSS reset sets margin, padding and border to 0.
const PANEL_STYLE = `
	position: fixed; inset: 0; margin: auto;
	width: min(480px, calc(100vw - 32px)); max-height: calc(100vh - 64px);
	overflow: auto; padding: 16px; border-radius: 12px;
	border: 1px solid var(--border);
	background: var(--popover); color: var(--popover-foreground);
	font: inherit; font-size: 14px;`;

// ::backdrop and :focus-visible cannot be set inline; this <style> lives inside the dialog and leaves with it.
const PANEL_CSS = `
	dialog.${PANEL_CLASS}::backdrop { background: rgb(0 0 0 / 0.45); }
	dialog.${PANEL_CLASS} button { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border); }
	dialog.${PANEL_CLASS} button.primary { background: var(--primary); color: var(--primary-foreground); border-color: transparent; }
	dialog.${PANEL_CLASS} button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
	dialog.${PANEL_CLASS} .caption { color: var(--muted-foreground); font-size: 12px; margin-bottom: 4px; }`;

function el(tag, props = {}, ...children) {
	const node = document.createElement(tag);
	for (const [key, value] of Object.entries(props)) {
		if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
		else if (key === 'style') node.style.cssText = value;
		else if (value === true) node.setAttribute(key, '');
		else if (value !== false && value != null) node.setAttribute(key, String(value));
	}
	node.append(...children.filter((child) => child != null && child !== false));
	return node;
}

/** Opens the panel and returns a function that closes it. `restoreFocus` runs once the panel has closed. */
function openPanel(ctx, notes, restoreFocus) {
	const dialog = el('dialog', { class: PANEL_CLASS, style: PANEL_STYLE, 'aria-label': 'Recent notes' });
	const close = () => {
		if (dialog.open) dialog.close();
	};
	dialog.append(
		el('style', {}, PANEL_CSS),
		el('div', { class: 'caption' }, ctx.mod.name),
		el('h2', { style: 'font-size: 16px; font-weight: 600; margin-bottom: 12px' }, 'Recent notes'),
		el('ul', { style: 'display: grid; gap: 4px; margin-bottom: 16px' },
			...notes.map((note) => el('li', {},
				el('button', {
					type: 'button',
					onclick: () => {
						close();
						ctx.workspace.openNote(note.path).catch((err) => ctx.notify(String(err?.message ?? err), { kind: 'error' }));
					},
				}, note.title),
			)),
		),
		el('div', { style: 'display: flex; justify-content: flex-end' },
			el('button', { type: 'button', class: 'primary', autofocus: true, onclick: close }, 'Close'),
		),
	);
	// App shortcuts listen on document in the bubble phase: keep keys typed here away from them.
	// Escape still closes, since cancel is the browser's default action, not a listener.
	dialog.addEventListener('keydown', (e) => e.stopPropagation());
	dialog.addEventListener('close', () => {
		dialog.remove();
		restoreFocus();
	});
	document.body.append(dialog);
	dialog.showModal();
	return close;
}

const mod = {
	onload(ctx) {
		let closeOpen = null;
		let openTimer = null;
		// One cleanup for whatever is open or about to open: ctx.register cannot be undone, so never register per open.
		ctx.register(() => {
			clearTimeout(openTimer);
			closeOpen?.();
		});

		ctx.addAction({
			id: 'recent',
			title: 'Show recent notes',
			run: async (_input, run) => {
				const entries = await ctx.vault.list('Projects');
				if (run.signal.aborted) return;
				const notes = entries
					.filter((entry) => !entry.isFolder && entry.name.endsWith('.md'))
					.slice(0, 20)
					.map((entry) => ({ path: entry.path, title: entry.name.slice(0, -3) }));
				// Captured now: when the panel opens, the run view that holds focus is gone.
				const returnTo = ctx.app.editorStore.activeTabPath;
				const restoreFocus = () => {
					if (ctx.signal.aborted) return;
					const view = ctx.app.editorStore.editorView;
					if (returnTo && ctx.app.editorStore.activeTabPath === returnTo && view?.dom.isConnected) view.focus();
				};
				closeOpen?.();
				clearTimeout(openTimer);
				// The run view stays open until this function returns: open the panel once it has closed.
				openTimer = setTimeout(() => {
					if (!ctx.signal.aborted) closeOpen = openPanel(ctx, notes, restoreFocus);
				}, 0);
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Recent notes', icon: 'lucide:history', actions: ['recent'] });
	},
};

export default mod;
```

Rules this pattern encodes:

| Rule | Why |
|------|-----|
| Restate `position`, `inset`, `margin`, `padding`, `border` | The app's Tailwind reset zeroes margin, padding and border on every element, which undoes the browser's `<dialog>` centering and frame |
| Style buttons and inputs explicitly | The same reset makes buttons transparent with no border, and font inherited |
| A `<style>` inside the dialog for `::backdrop`, `:hover`, `:focus-visible` | Pseudo-elements and pseudo-classes cannot be set inline; `style-src 'unsafe-inline'` allows the element, and it leaves with the dialog. Prefix class names with something unique: the sheet is global |
| `keydown` stops propagating at the dialog | App shortcuts (Cmd+S, Cmd+P, `/` and others) listen on `document` in the bubble phase and would fire while the user types in your panel |
| Decide where focus returns **before** opening, and restore it on close | When an action opens the panel, `document.activeElement` is a button of the closing run view or the rail, not where the user was. Capture what to go back to (the active tab's path) in the action, and on close focus the editor if that note is still active |
| `autofocus` on the first useful control | `showModal()` focuses the first focusable element, or the one with `autofocus` |
| One `ctx.register` at `onload`, `closeOpen` and `openTimer` variables | Unload closes the panel and cancels a pending open; re-running the action replaces it; nothing accumulates |
| Open it **after** the action returned, from a `setTimeout(..., 0)` | The run view stays open until `run` returns, and a run that logged or showed progress keeps it open on **Done**, on top of the panel. So log nothing and show no progress in an action that ends by opening a panel, return, and open from the timer: the view has closed by then |
| Guard against a late open | Check `run.signal.aborted` after the action's awaits, and `ctx.signal.aborted` in the timer, so a panel never opens after Stop or unload |
| The panel lives outside the run | Once open, nothing of the run is left: no `run.signal`, no **Stop**, no `run.ui`. Code behind the panel's buttons uses `ctx.signal`, `ctx.ui` and its own inline errors |

> [!WARNING]
> A modal `<dialog>` makes **everything else inert**, including the app's own dialogs. A `ctx.ui.confirm` called while your panel is open opens behind it and cannot be clicked. Confirm inside your panel (a second button row, a "Click again to delete" state), or close the panel before calling `ctx.ui`. Toasts from `ctx.notify` also show behind your backdrop: dimmed by it and not clickable. While the panel is open, report results and errors inside it (see [A modal form](#a-modal-form)).

Escape fires the dialog's `cancel` event and then `close`. To ask before closing on Escape (unsaved input), call `e.preventDefault()` in a `cancel` listener and handle it yourself.

For a non-modal floating panel, use `dialog.show()` instead of `showModal()`: no backdrop, no inertness, no focus trap, and it is not on the top layer, so give it `z-index` and `position: fixed` yourself.

## A modal form

When `run.ui.prompt` and `run.ui.pick` are not enough (several fields at once, validation as the user types), build a form in the same kind of `<dialog>`. It reuses `el`, `PANEL_CLASS` and `PANEL_STYLE` from [above](#a-themed-modal-dialog). What it adds:

- **Inputs styled with theme variables.** The app's CSS reset leaves an `<input>` with no border, no padding and a transparent background; restate them with `--input`, `--background`, `--foreground` and `--ring`.
- **Enter submits.** A real `<form>` with a submit button gives Enter-to-submit in every field; its `submit` handler calls `preventDefault()` so the page does not navigate.
- **Validation before submit, errors inline.** Required fields are checked on submit, and the message shows in the form (`role="alert"`). A toast would be behind the backdrop.
- **Async submit.** The submit runs with the fields, Cancel and Escape disabled. **Cancel does not abort a submit already running**: the form is outside any run, so nothing would stop a write half done. The form stays open until the submit settles, then closes on success or shows the error and lets the user correct it.
- **`ctx.signal`, never `run.signal`.** The form opens after its action returned (see above), so the run is over. Check `ctx.signal.aborted` after every `await` in the submit.

```javascript
const FORM_CSS = `
	dialog.${PANEL_CLASS} form { display: grid; gap: 12px; }
	dialog.${PANEL_CLASS} label { display: grid; gap: 4px; font-size: 12px; color: var(--muted-foreground); }
	dialog.${PANEL_CLASS} input { padding: 4px 8px; border-radius: 6px; border: 1px solid var(--input); background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; }
	dialog.${PANEL_CLASS} input:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
	dialog.${PANEL_CLASS} [role="alert"] { color: var(--destructive); font-size: 12px; min-height: 1em; }
	dialog.${PANEL_CLASS} button { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border); }
	dialog.${PANEL_CLASS} button.primary { background: var(--primary); color: var(--primary-foreground); border-color: transparent; }
	dialog.${PANEL_CLASS} button:disabled { opacity: 0.5; }`;

/**
 * Opens a form. `fields`: [{ name, label, placeholder?, required? }].
 * `submit(values, signal)` may be async; what it throws is shown in the form.
 * Returns a function that closes the form at once, submit or not (for unload's cleanup).
 */
function openForm(ctx, { title, fields, submitLabel = 'Save', submit, restoreFocus = () => {} }) {
	let submitting = false;
	const inputs = fields.map((f) => el('input', { name: f.name, placeholder: f.placeholder ?? '', autocomplete: 'off' }));
	const error = el('div', { role: 'alert' });
	const cancel = el('button', { type: 'button' }, 'Cancel');
	const save = el('button', { type: 'submit', class: 'primary' }, submitLabel);
	const form = el('form', {},
		el('h2', { style: 'font-size: 16px; font-weight: 600' }, title),
		...fields.map((f, i) => el('label', {}, f.label, inputs[i])),
		error,
		el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px' }, cancel, save),
	);
	const dialog = el('dialog', { class: PANEL_CLASS, style: PANEL_STYLE, 'aria-label': title }, el('style', {}, FORM_CSS), form);
	const close = () => {
		if (dialog.open) dialog.close();
	};
	const setBusy = (busy) => {
		submitting = busy;
		for (const control of [...inputs, cancel, save]) control.disabled = busy;
	};

	cancel.addEventListener('click', close);
	// Escape fires `cancel`: refuse it while a submit runs, as the disabled Cancel button does.
	dialog.addEventListener('cancel', (e) => {
		if (submitting) e.preventDefault();
	});
	dialog.addEventListener('keydown', (e) => e.stopPropagation());
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (submitting) return;
		const values = Object.fromEntries(fields.map((f, i) => [f.name, inputs[i].value.trim()]));
		const missing = fields.findIndex((f) => f.required && !values[f.name]);
		if (missing !== -1) {
			error.textContent = `${fields[missing].label} is required`;
			inputs[missing].focus();
			return;
		}
		error.textContent = '';
		setBusy(true);
		try {
			await submit(values, ctx.signal);
			if (ctx.signal.aborted) return;
			setBusy(false);
			close();
		} catch (err) {
			if (ctx.signal.aborted) return;
			setBusy(false);
			// A Tauri rejection is a bare string, not an Error.
			error.textContent = typeof err?.message === 'string' ? err.message : String(err);
		}
	});
	dialog.addEventListener('close', () => {
		dialog.remove();
		restoreFocus();
	});
	document.body.append(dialog);
	dialog.showModal();
	inputs[0]?.focus();
	return close;
}

// In onload, opened from an action exactly like the panel above (setTimeout after the run returns):
// closeOpen = openForm(ctx, {
// 	title: 'New meeting note',
// 	fields: [{ name: 'title', label: 'Title', required: true }, { name: 'who', label: 'Attendees', placeholder: 'Ada, Grace' }],
// 	submitLabel: 'Create',
// 	restoreFocus,
// 	submit: async ({ title, who }, signal) => {
// 		const name = safeName(title);
// 		if (!name) throw new Error('The title needs at least one letter or digit');
// 		const path = `Meetings/${name}.md`;
// 		await ctx.vault.create(path, `# ${title}\n\nAttendees: ${who}\n`);
// 		if (!signal.aborted) await ctx.workspace.openNote(path);
// 	},
// });
```

`safeName` is the canonical file-name helper from [Vault files](04-vault-files.md#note-names-safename). The unload cleanup that calls `closeOpen()` closes the form even during a submit (`close` does not check `submitting`); the submit's own `ctx.signal` checks then stop it from touching the dead form. When the user may want a second try after a failure, keep the typed values, as this form does: only success closes it.

## Mounting into app regions

Putting UI inside the app's own chrome (the status bar, the editor) means depending on the app's markup. Treat every selector as **raw**: it is not an API and can change in any release. Five rules:

1. **One constant per selector, with a comment** that says it is app markup. When it breaks, there is one line to fix.
2. **Guard null.** The region may not exist yet (vault still opening), may be hidden, or may have been renamed. `querySelector(...)?.append(node)` and move on.
3. **Re-mount when the region re-renders.** The app rebuilds regions (vault switch, layout changes), and your node goes with the old DOM. Watch for that (below).
4. **Remove on unload.** `ctx.register` removes your node, disconnects observers and clears timers. The host does not track DOM you add.
5. **Remove, do not hide.** A `display: none` node still counts as a child for the app's CSS (see the status bar divider below).

### Known regions

| Region | Hook | Notes |
|--------|------|-------|
| Status bar | `[data-status-bar]`, with two direct `.status-bar-group` children (left, right) | The bar draws a 12px divider before every child of a group except the first (`:not(:first-child)::before`). Prepend to a group and the next item gets the divider. Text color is the bar's own `--status-bar-fg`, inherited |
| The editor of the active tab | `ctx.app.editorStore.editorView?.dom` | Raw, see [Raw app access](09-raw-app.md#editorstoreeditorview). One view is shared by Markdown tabs; it is `null` for canvas, kanban and collection boards and virtual tabs, and a **new** view is created when the user comes back from one. Re-read it, never keep it |
| Rail buttons | `[data-rail-item="<key>"]` | Mod buttons have key `mod:<mod-id>:<button-id>`. Add buttons with `ctx.addRailButton`, do not inject them |

Anything else (note list rows, the properties panel, tab headers) has no hook worth naming here: inspect the markup in a dev build (see [Errors and debugging](15-errors-and-debugging.md#devtools-and-the-console)) and expect it to change.

### Re-mounting: `MutationObserver` or `ctx.watch`

When the region is plain app DOM, a `MutationObserver` on `document.body` notices it being replaced. It fires on **every** DOM change in the app (each keystroke in the editor is one), so the callback must be nearly free: check `node.isConnected` and return, and defer the real work to one `requestAnimationFrame`. Observe only while your UI is shown.

When the region follows reactive app state, watch the state instead. The editor DOM, for example, changes exactly when `editorView` changes:

```javascript
function mountInEditor(ctx, badge) {
	// The editor view is raw app state: a new instance after a board or virtual tab, null with no editor.
	const attach = (view) => {
		badge.remove();
		if (view?.dom?.isConnected) view.dom.append(badge);
	};
	attach(ctx.app.editorStore.editorView);
	const stop = ctx.watch(() => ctx.app.editorStore.editorView, attach);
	ctx.register(() => {
		stop();
		badge.remove();
	});
}
```

`ctx.watch` compares by `Object.is` and tracks only Svelte state read synchronously inside `read` (see [Events and reactivity](07-events-and-reactivity.md#ctxwatch-reacting-to-app-state)).

## A status-bar chip

An element in the status bar inherits the bar's font, size and color, so it needs no theme code. `createStatusChip` below is the canonical chip: the [status-chip example](../../examples/mods/status-chip/) and the [Cookbook](14-cookbook.md) use this same helper, selector and observer.

- **`<span>` when the chip only shows something, `<button>` only with a click handler.** A button is announced and focused as a control; one that does nothing is a trap for keyboard and screen reader users. `createStatusChip(onClick)` makes a button when it gets a handler and a span without one.
- **The right group already holds the app's own items**: the save status and the word count of the active note. Do not add a second word count with another definition (the app counts words split on whitespace, after the frontmatter): two numbers that disagree look like a bug. Show something the bar does not.
- The chip goes **first** in the right group (`prepend`): the bar draws a divider before every item except the first, so the app's items keep theirs.

This complete mod shows a session timer as a chip that appears on Start and is removed on Stop or click. The example adds a `ctx.watch` on the active tab and `ctx.theme.onChange`.

```javascript
// App markup (the status bar component), not an API: it can change in any release.
const STATUS_GROUP_SELECTOR = '[data-status-bar] > .status-bar-group:last-child';

/**
 * A chip at the start of the right status-bar group, put back when the app
 * rebuilds the bar. A `<button>` when it has a click handler, else a `<span>`
 * (display only). Fill `node` yourself; `show()` mounts it, `hide()` removes it.
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

const mod = {
	onload(ctx) {
		let startedAt = 0;
		let interval = null;
		const pad = (n) => String(n).padStart(2, '0');
		const chip = createStatusChip(() => stop());
		chip.node.style.fontVariantNumeric = 'tabular-nums';
		chip.node.title = 'Session timer: click to stop';
		chip.node.setAttribute('aria-label', 'Session timer: click to stop');

		// Against the clock, not a tick count: a throttled or late interval cannot drift the time shown.
		const render = () => {
			const seconds = Math.floor((Date.now() - startedAt) / 1000);
			chip.node.textContent = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
			chip.show();
		};
		const stop = () => {
			if (interval !== null) clearInterval(interval);
			interval = null;
			chip.hide();
		};
		// The interval, the observer and the chip would all outlive the mod.
		ctx.register(stop);

		ctx.addAction({
			id: 'start',
			title: 'Start session timer',
			run: () => {
				stop();
				startedAt = Date.now();
				interval = setInterval(render, 1000);
				render();
			},
		});
		ctx.addAction({ id: 'stop', title: 'Stop session timer', run: () => stop() });
		ctx.labs.place('start', { palette: true });
		ctx.labs.place('stop', { palette: true });
		ctx.addRailButton({ id: 'main', title: 'Session timer', icon: 'lucide:timer', actions: ['start', 'stop'] });
	},
};

export default mod;
```

Notes:

- The observer runs only while the chip is shown, and puts the chip back within a frame when the app rebuilds the bar or when the bar appears after the mod loaded. A paused, non-ticking chip needs nothing else.
- When the timer ends, or anything happens that the user must not miss, do not rely on `ctx.notify` alone: its toast disappears after a few seconds. Leave the chip in a visible "done" state until clicked, or call `ctx.ui.alert` from the callback.
- To keep state across reloads (the timer survives a restart), store `startedAt` with `ctx.saveData` and restore it in `onload` (see [Mod data](05-mod-data.md#savedatavalue)).
- To show something about the active note, `ctx.watch(() => ctx.app.editorStore.activeTabPath, update)` is the narrowest read: it changes on tab switches, not keystrokes. For a value derived from its text, watch `activeTabContent` and debounce the work by 300 to 500 ms: `ctx.onNoteSaved` misses changes that reach an open tab without a save through the app (a reload from disk, a link rewrite).

## Style isolation with shadow DOM

The app's global CSS (the Tailwind reset, element styles) reaches every element you add to the light DOM, and your `<style>` reaches the app's. A shadow root separates both directions. What still crosses the boundary:

- **CSS custom properties inherit into the shadow tree**, so `var(--card)` and every contract variable work inside it and follow theme changes with no code.
- Inherited properties (`color`, `font-family`, `font-size`, `line-height`) inherit from the host element.
- The app's utility classes do **not** apply inside; write your own CSS in a `<style>` element in the root (`style-src 'unsafe-inline'` allows it).

```javascript
/** A themed card in its own shadow root; returns { card, setMode, remove }. */
function mountCard(parent, mode) {
	const host = document.createElement('div');
	const root = host.attachShadow({ mode: 'open' });
	const style = document.createElement('style');
	style.textContent = `
		:host { display: block; }
		.card { background: var(--card); color: var(--card-foreground); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; }
		.caption { color: var(--muted-foreground); font-size: 12px; }
		:host([data-mode="dark"]) .card { box-shadow: 0 0 0 1px rgb(255 255 255 / 0.04); }
	`;
	const card = document.createElement('div');
	card.className = 'card';
	root.append(style, card);
	host.dataset.mode = mode;
	parent.append(host);
	return {
		card,
		setMode: (next) => { host.dataset.mode = next; },
		remove: () => host.remove(),
	};
}

// const view = mountCard(someParent, ctx.theme.current.mode);
// const stop = ctx.theme.onChange(({ mode }) => view.setMode(mode));
// ctx.register(() => { stop(); view.remove(); });
```

Only copy `mode` onto the host when you need a mode-specific rule the variables cannot express; colors themselves need no subscription.

## Canvas and chart colors

A `<canvas>` and most chart libraries take color strings, so CSS variables do not reach them. Read `ctx.theme.current`, paint, and repaint on `onChange`:

```javascript
function drawBars(canvas, values, colors) {
	const ratio = window.devicePixelRatio || 1;
	const { width, height } = canvas.getBoundingClientRect();
	canvas.width = Math.round(width * ratio);
	canvas.height = Math.round(height * ratio);
	const g = canvas.getContext('2d');
	g.scale(ratio, ratio);
	g.clearRect(0, 0, width, height);
	g.strokeStyle = colors.border;
	g.beginPath();
	g.moveTo(0, height - 0.5);
	g.lineTo(width, height - 0.5);
	g.stroke();
	const max = Math.max(1, ...values);
	const barWidth = width / Math.max(1, values.length);
	g.fillStyle = colors.primary;
	values.forEach((value, i) => {
		const barHeight = (value / max) * (height - 4);
		g.fillRect(i * barWidth + 2, height - barHeight, barWidth - 4, barHeight);
	});
}

// canvas.style.cssText = 'display: block; width: 100%; height: 200px;'; // required, see below
// const paint = ({ colors }) => drawBars(canvas, values, colors);
// paint(ctx.theme.current);
// const stopTheme = ctx.theme.onChange(paint);
// const resize = new ResizeObserver(() => paint(ctx.theme.current));
// resize.observe(canvas);
// ctx.register(() => { stopTheme(); resize.disconnect(); canvas.remove(); });
```

Two things `drawBars` relies on:

- **The canvas has a CSS width and height.** Without one, its displayed size follows its pixel size: `drawBars` sets `canvas.width` to the displayed width times `devicePixelRatio`, which makes the canvas larger, which fires the `ResizeObserver`, which paints again, larger each time. Give it `width` and `height` in CSS (`100%` and a fixed height work).
- **Every color it uses is non-empty.** A color the theme does not define reads as `''` (a custom theme can leave keys out), and a canvas ignores `fillStyle = ''`, so the bars are drawn in whatever color was set before. Fall back per key: `colors.primary || '#2563eb'`.

### A complete chart panel

A themed `<dialog>` with a bar chart that repaints on theme changes and resizes, opened after the action ends (the rules are those of [A themed modal dialog](#a-themed-modal-dialog)). It charts the notes per subfolder of `Projects`.

```javascript
const FOLDER = 'Projects';
const CHART_CLASS = 'mod-chart-example';
/** Used for a theme color that reads as '' (not defined by a custom theme) */
const FALLBACK = { border: '#d4d4d8', primary: '#2563eb', mutedForeground: '#71717a' };

const DIALOG_STYLE = `
	position: fixed; inset: 0; margin: auto;
	width: min(560px, calc(100vw - 32px)); padding: 16px; border-radius: 12px;
	border: 1px solid var(--border); background: var(--popover); color: var(--popover-foreground);
	font: inherit; font-size: 14px;`;
const DIALOG_CSS = `
	dialog.${CHART_CLASS}::backdrop { background: rgb(0 0 0 / 0.45); }
	dialog.${CHART_CLASS} button { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border); }
	dialog.${CHART_CLASS} button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`;

/** The colors the chart paints with, each non-empty */
function chartColors(colors) {
	return Object.fromEntries(Object.entries(FALLBACK).map(([key, fallback]) => [key, colors[key] || fallback]));
}

/** Paints one bar per row, labels under the bars, at the canvas's CSS size */
function drawBars(canvas, rows, colors) {
	const ratio = window.devicePixelRatio || 1;
	const { width, height } = canvas.getBoundingClientRect();
	if (width === 0 || height === 0) return;
	canvas.width = Math.round(width * ratio);
	canvas.height = Math.round(height * ratio);
	const g = canvas.getContext('2d');
	g.scale(ratio, ratio);
	g.clearRect(0, 0, width, height);
	const labelHeight = 18;
	const plot = height - labelHeight;
	const max = Math.max(1, ...rows.map((row) => row.value));
	const barWidth = width / rows.length;
	g.font = '12px system-ui, sans-serif';
	g.textAlign = 'center';
	rows.forEach((row, i) => {
		const barHeight = (row.value / max) * (plot - 16);
		g.fillStyle = colors.primary;
		g.fillRect(i * barWidth + 4, plot - barHeight, Math.max(1, barWidth - 8), barHeight);
		g.fillStyle = colors.mutedForeground;
		g.fillText(String(row.value), i * barWidth + barWidth / 2, plot - barHeight - 4);
		g.fillText(row.label.length > 12 ? `${row.label.slice(0, 11)}...` : row.label, i * barWidth + barWidth / 2, height - 4);
	});
	g.strokeStyle = colors.border;
	g.beginPath();
	g.moveTo(0, plot - 0.5);
	g.lineTo(width, plot - 0.5);
	g.stroke();
}

/** Opens the chart and returns a function that closes it */
function openChart(ctx, rows, restoreFocus) {
	const dialog = document.createElement('dialog');
	dialog.className = CHART_CLASS;
	dialog.style.cssText = DIALOG_STYLE;
	dialog.setAttribute('aria-label', `Notes per folder in ${FOLDER}`);
	const style = document.createElement('style');
	style.textContent = DIALOG_CSS;
	const heading = document.createElement('h2');
	heading.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 12px';
	heading.textContent = `Notes per folder in ${FOLDER}`;
	const canvas = document.createElement('canvas');
	// The CSS size keeps the ResizeObserver from looping (see above).
	canvas.style.cssText = 'display: block; width: 100%; height: 240px; margin-bottom: 12px';
	canvas.setAttribute('role', 'img');
	canvas.setAttribute('aria-label', rows.map((row) => `${row.label}: ${row.value}`).join(', '));
	const close = document.createElement('button');
	close.type = 'button';
	close.textContent = 'Close';
	close.autofocus = true;
	close.addEventListener('click', () => dialog.close());
	const footer = document.createElement('div');
	footer.style.cssText = 'display: flex; justify-content: flex-end';
	footer.append(close);
	dialog.append(style, heading, canvas, footer);

	// ctx.theme.current throws once the mod is unloaded; a resize can still arrive before the close event.
	const paint = () => {
		if (!ctx.signal.aborted) drawBars(canvas, rows, chartColors(ctx.theme.current.colors));
	};
	const stopTheme = ctx.theme.onChange(paint);
	const resize = new ResizeObserver(paint);
	dialog.addEventListener('keydown', (e) => e.stopPropagation());
	dialog.addEventListener('close', () => {
		stopTheme();
		resize.disconnect();
		dialog.remove();
		restoreFocus();
	});
	document.body.append(dialog);
	dialog.showModal();
	resize.observe(canvas);
	paint();
	return () => {
		if (dialog.open) dialog.close();
	};
}

export default {
	onload(ctx) {
		let closeOpen = null;
		let openTimer = null;
		ctx.register(() => {
			clearTimeout(openTimer);
			closeOpen?.();
		});

		ctx.addAction({
			id: 'chart',
			title: `Chart notes per folder in ${FOLDER}`,
			run: async (_input, run) => {
				// Captured before any await: where focus goes back to when the chart closes.
				const returnTo = ctx.app.editorStore.activeTabPath;
				const folders = (await ctx.vault.list(FOLDER)).filter((entry) => entry.isFolder);
				const rows = [];
				for (const folder of folders) {
					if (run.signal.aborted) return;
					const entries = await ctx.vault.list(folder.path);
					rows.push({ label: folder.name, value: entries.filter((e) => !e.isFolder && /\.(md|markdown)$/i.test(e.name)).length });
				}
				if (run.signal.aborted) return;
				if (rows.length === 0) return ctx.notify(`${FOLDER} has no subfolders`);
				rows.sort((a, b) => a.label.localeCompare(b.label));
				const restoreFocus = () => {
					if (ctx.signal.aborted) return;
					const view = ctx.app.editorStore.editorView;
					if (returnTo && ctx.app.editorStore.activeTabPath === returnTo && view?.dom.isConnected) view.focus();
				};
				closeOpen?.();
				clearTimeout(openTimer);
				// No run.log or progress: the run view closes when run returns, then the chart opens.
				openTimer = setTimeout(() => {
					if (!ctx.signal.aborted) closeOpen = openChart(ctx, rows, restoreFocus);
				}, 0);
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Notes per folder', icon: 'lucide:chart-column', actions: ['chart'] });
	},
};
```

`stopTheme` runs when the chart closes and again at unload (the host's cleanup); a disposer from `ctx` runs once, so the second call does nothing. The canvas's `aria-label` carries the numbers for a screen reader.

Values arrive in the theme's own syntax (hex or `oklch()` for the built-in themes, anything CSS accepts for custom ones). A library that only understands hex or `rgb()` needs a conversion. A 1x1 canvas converts any color the engine parses:

```javascript
/** Converts a CSS color to 'rgba(r, g, b, a)', or returns null when the engine cannot parse it. */
function toRgba(color) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 1;
	const g = canvas.getContext('2d', { willReadFrequently: true });
	const sentinel = '#010203';
	g.fillStyle = sentinel;
	g.fillStyle = color; // an unparseable value is ignored and the sentinel stays
	if (g.fillStyle === sentinel && color.trim().toLowerCase() !== sentinel) return null;
	g.fillRect(0, 0, 1, 1);
	const [r, gr, b, a] = g.getImageData(0, 0, 1, 1).data;
	return `rgba(${r}, ${gr}, ${b}, ${(a / 255).toFixed(3)})`;
}
```

The conversion is to sRGB: a wide-gamut `oklch()` color is clamped. Cache the converted palette per `onChange` call rather than converting per frame.

QueryJS charts (`kb.ui.chart`) are a separate route with their own theming; see [QueryJS](../13-queryjs.md).

## Images, styles and fonts under the CSP

The app's Content Security Policy applies to your DOM like to the app's. The directives that matter for UI (full policy and the network side in [Network and platform](11-network-and-platform.md#fetch-and-the-csp)):

| Directive | Value | For a mod |
|-----------|-------|-----------|
| `img-src` | `'self' asset: http://asset.localhost data: https:` | `<img>` and CSS `url()` from any `https:` host work, and `data:` URIs. `http:` hosts do not. `blob:` is not listed, so `URL.createObjectURL` images are blocked (by CSP rules; not tested here). Prefer `data:` URIs or inline `<svg>` for icons you ship |
| `style-src` | `'self' 'unsafe-inline'` | `style="..."`, `el.style.cssText` and `<style>` elements work. `<link rel="stylesheet">` to another origin is blocked: inline the CSS |
| `font-src` | `'self' data:` | Web fonts from a CDN are blocked. Inherit the app's font (`font: inherit`), or embed a font as a `data:` URI |
| `script-src` | `'self' 'unsafe-eval'` | No inline `<script>`, no `on*=` attributes, no remote scripts. Bundle libraries into `main.js` (below) |

Showing an image file from the vault needs an asset-protocol URL that the app builds internally; a mod has no supported way to make one.

## Rail registries

`ctx.app.railRegistryStore` is the live registry behind the rail, the note list and the Files menus. **raw**: shapes and behavior can change in any release. The stable and unstable APIs already wrap the two practical parts (`addRailButton` registers a rail action, `labs.place({ menu })` a menu item); reach for the registry only for what they do not cover. Full field-by-field shapes are in [Raw app access](09-raw-app.md#railregistrystore).

| Method | Replaces an entry with the same | Shape (summary) | From plain JS |
|--------|----------------------------------|-----------------|---------------|
| `registerAction(entry)` | `key` | `{ key, label, icon: 'pack:name' or a lucide name, color?: { light, dark }, busy?: () => boolean, run: () => void }` | Practical, but `ctx.addRailButton` does this with a picker, busy state and cleanup |
| `registerMenuItem(entry)` | `id` | `{ id, label, on: ['note' and/or 'folder'], files?: 'markdown' or 'all', run(target) }`; `target` is `{ on, path }`, vault-relative, root `''`. Note rows are the rail note list's menu, folders the Files navigator's | Practical: a menu item that runs without a run view and without the `<mod name>: ` label prefix |
| `registerNavigator(entry)` | `id` | `{ id, label, icon: Component, component: Component, lens: () => Lens }` | Not practical |
| `registerLensProvider(entry)` | `kind` | `{ kind, resolve(lens, context) => ResolvedLens or null, newNote?, headerAction? }`; a lens kind is reached only through a navigator's `lens()` | Not practical without a navigator |
| `registerTodaySection(entry)` | `id` | `{ id, label, component: Component }`, rendered with no props above Today's notes | Not practical |
| `registerFolderCreator(entry)` | `id` | `{ id, label, icon: Component, fileName, create(dir) => Promise<string> }` | Not practical |

"Not practical" means the entry needs a Svelte 5 `Component` that the **app's own** Svelte runtime renders. A plain-JS mod has none, and a component compiled into your bundle runs on a second copy of the Svelte runtime; whether the app can render it is not verified. Do not build on it.

Rules for anything you register:

- **Each register call returns an unregister function. Pass it to `ctx.register`.** Mod unload removes only what the host registered (rail buttons, placements); a raw registration otherwise outlives the mod and calls into a dead `ctx`.
- **Pick keys no one else uses.** Registering a taken key **replaces** the other entry, and it is not restored when yours unregisters. Built-in ids include navigator `calendar`, lens kind `day`, Today section `my-people` and folder creator `kanban`; host keys are `mod:<mod-id>:...`. Use something like `mod-raw:<mod-id>:<name>`.
- **Guard every callback yourself.** The app calls `run`, `resolve` and the rest without `try/catch`: a throw in a menu `run` is an uncaught exception, and a throwing lens `resolve` breaks the note list render. Catch, and report through `ctx.notify` if `!ctx.signal.aborted`.
- **Feature-detect the method** before calling it, since a raw member can disappear.
- Lists are replaced, not mutated: entries are compared by identity, so keep the object you registered.

```javascript
/** A Files and note-row menu item that copies the clicked path. Call from onload. */
function addCopyPathItem(ctx) {
	const registry = ctx.app.railRegistryStore;
	if (typeof registry?.registerMenuItem !== 'function') {
		ctx.log('railRegistryStore.registerMenuItem is missing; copy-path item skipped');
		return;
	}
	const unregister = registry.registerMenuItem({
		id: `mod-raw:${ctx.mod.id}:copy-path`,
		label: 'Copy vault path',
		on: ['note', 'folder'],
		files: 'all',
		// Called by the menu without a try/catch: nothing may escape.
		run: (target) => {
			const text = target.path || '/';
			navigator.clipboard.writeText(text).then(
				() => { if (!ctx.signal.aborted) ctx.notify(`Copied ${text}`); },
				(err) => { if (!ctx.signal.aborted) ctx.notify(`Copy failed: ${String(err?.message ?? err)}`, { kind: 'error' }); },
			);
		},
	});
	ctx.register(unregister);
}
```

## Bundling a UI framework

A UI larger than a few elements is easier in Svelte, Preact, lit or another library. A mod is still one `main.js` with no `import`, so bundle the framework into it with your own build, kept **outside the vault** (the vault holds only the built `main.js` and `manifest.json`). With esbuild:

```bash
esbuild src/main.js --bundle --format=iife --global-name=__mod \
  --footer:js='export default __mod.default;' \
  --outfile="$VAULT/_system/mods/my-mod/main.js"
```

The footer puts the one `export default` the loader accepts on its own line. Each build writes `main.js`, which reloads the mod. Type checking, TypeScript, the Svelte plugin and testing are in [Types, build and test](12-types-build-and-test.md#building-a-mod-from-typescript).

The bundler's input (not `main.js`: this file uses `import`, the build removes it) mounts the framework into an element the mod owns and unmounts it on close and on unload:

```javascript
// src/main.js, the esbuild input. Preact with htm needs no JSX step.
import { h, render } from 'preact';
import htm from 'htm';

const html = htm.bind(h);

function Panel({ name, onClose }) {
	return html`<div style="padding: 16px; background: var(--popover); color: var(--popover-foreground)">
		<p style="color: var(--muted-foreground); font-size: 12px">${name}</p>
		<button type="button" onClick=${onClose}>Close</button>
	</div>`;
}

export default {
	onload(ctx) {
		let host = null;
		const close = () => {
			if (!host) return;
			render(null, host); // unmount first: runs component cleanups and effects
			host.remove();
			host = null;
		};
		ctx.register(close);
		ctx.addAction({
			id: 'open',
			title: 'Open panel',
			run: () => {
				close();
				host = document.createElement('div');
				document.body.append(host);
				render(html`<${Panel} name=${ctx.mod.name} onClose=${close} />`, host);
			},
		});
	},
};
```

The same shape for other frameworks:

| Framework | Mount | Unmount |
|-----------|-------|---------|
| Svelte 5 | `const app = mount(App, { target: host, props })` | `unmount(app)`, then `host.remove()` |
| Preact | `render(vnode, host)` | `render(null, host)`, then `host.remove()` |
| lit | `render(template, host)` (`lit-html`) or a custom element appended to `host` | `host.remove()`; a custom element tag can be defined only once per page, so guard `customElements.get(name)` across reloads |

Notes:

- Text interpolated by these frameworks (`${name}`, `{name}`) is escaped. Their raw-HTML escapes (`{@html}`, `dangerouslySetInnerHTML`, `unsafeHTML`) carry the same risk as `innerHTML`.
- Inside a modal `<dialog>`, mount the framework **into the dialog element** and unmount on its `close` event.
- Your bundle carries its own copy of the framework. It is separate from the app's Svelte, so its components work in DOM you own, not in the rail registry (above).
- Keep the bundle lean: each save or build re-evaluates the whole `main.js` on the app's main thread.

## Performance

Mod UI runs on the app's main thread, next to the editor. A slow handler is a slow keystroke.

- **Coalesce updates.** Many events per frame (keystrokes, mutations, `onChange` bursts) should set a flag and render once in `requestAnimationFrame`.
- **Read layout, then write.** Interleaving `getBoundingClientRect()` or `offsetHeight` with style writes forces a layout per pair (layout thrash). Read everything first, then write.
- **Build off-document.** Assemble a list in a `DocumentFragment` or a detached element, then insert once (`list.replaceChildren(...rows)`).
- **Update text, not trees.** For a ticking value, set `textContent` on one node instead of rebuilding the UI.
- **Keep observers narrow.** A `MutationObserver` on `body` with `subtree: true` sees every app change: return early, and disconnect when your UI is hidden. `ctx.watch` reads should be narrow (`activeTabPath`, not `activeTab.content`, which changes per keystroke).
- **Cap what you render.** Lists of hundreds of notes should be limited or paged; the app's own picker shows at most 100 rows.
- **Long work does not belong in render code.** Chunk it and yield (see [Network and platform](11-network-and-platform.md#the-main-thread)).

## Cleanup checklist

Everything below outlives the mod unless a `ctx.register` callback undoes it:

- [ ] DOM nodes you appended (dialogs, chips, hosts, `<style>` elements outside them)
- [ ] `MutationObserver`, `ResizeObserver`, `IntersectionObserver` (`disconnect()`)
- [ ] `setInterval`, `setTimeout`, `requestAnimationFrame` loops
- [ ] Listeners on `window`, `document` or app elements
- [ ] Framework roots (`unmount`, `render(null, host)`)
- [ ] Raw registry entries (`ctx.register(unregister)`)

Disposers returned by `ctx.watch` and `ctx.theme.onChange` are removed at unload by the host; call them yourself only to stop earlier. Cleanups run in reverse registration order after `onunload`; a throwing cleanup toasts `_system/mods/<id>: cleanup failed: <message>` and the rest still run (see [Events and reactivity](07-events-and-reactivity.md#ctxregister-and-ctxsignal-cleanup-and-order)).

## See also

- [Dialogs](06-dialogs.md): the app's own themed dialogs
- [Events and reactivity](07-events-and-reactivity.md): `ctx.watch`, `ctx.register`, DOM listeners and timers
- [Raw app access](09-raw-app.md): `railRegistryStore`, `editorStore` and the rest of `ctx.app`
- [Network and platform](11-network-and-platform.md): the CSP, browser APIs, the main thread
- [Types, build and test](12-types-build-and-test.md): bundling, TypeScript, tests with a fake DOM
- [Theming](../26-theming.md): every theme token
- [Vault Mods](../28-mods.md): the user guide
