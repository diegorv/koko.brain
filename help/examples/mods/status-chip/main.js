// Example vault mod. To try it, copy this folder to <vault>/_system/mods/status-chip/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// Adds a chip to the right of the status bar. The app's DOM and ctx.app are
// raw access, with no compatibility promise.

/**
 * The right status-bar group (StatusBar.svelte). App markup, not an API: when
 * the app changes it, the chip finds no place and stays out.
 */
const STATUS_GROUP_SELECTOR = '[data-status-bar] > .status-bar-group:last-child';
/** Updates the clock */
const TICK_MS = 30_000;

const pad2 = (n) => String(n).padStart(2, '0');

/** Anything thrown, as text: a Tauri rejection is a bare string, not an Error */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

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

export default {
	onload(ctx) {
		const editor = ctx.app.editorStore;
		let visible = true;

		const onClick = () => {
			ctx.app.openOrCreateDailyNote().catch((err) => {
				if (!ctx.signal.aborted) ctx.notify(`Cannot open today's note: ${errorMessage(err)}`, { kind: 'warning' });
			});
		};
		const chip = createStatusChip(onClick);
		chip.node.dataset.modStatusChip = '';
		// The bar's font and color are inherited; only the layout is the chip's own.
		chip.node.style.cssText += 'display: inline-flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums;';
		const dot = document.createElement('span');
		dot.style.cssText = 'width: 6px; height: 6px; border-radius: 50%;';
		const label = document.createElement('span');
		chip.node.append(dot, label);

		const render = () => {
			const path = editor.activeTabPath;
			const name = path ? path.split('/').pop() : 'No note';
			const now = new Date();
			// textContent, never innerHTML: a note name is user text.
			label.textContent = `${name} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
		};
		/** Resolved colors are for values JavaScript sets; here the dot uses the accent of the current mode */
		const paint = (theme) => {
			dot.style.background = theme.colors.primary;
			chip.node.title = `Open note and time (${theme.mode} theme). Click to open today's note.`;
		};

		render();
		paint(ctx.theme.current);
		chip.show();

		// watch, theme.onChange and the action are removed at unload by the host;
		// the timer, the observer and the node are the mod's own to remove.
		ctx.watch(() => editor.activeTabPath, render);
		ctx.theme.onChange(paint);
		const timer = setInterval(render, TICK_MS);
		ctx.register(() => {
			clearInterval(timer);
			chip.node.removeEventListener('click', onClick);
			chip.hide();
		});

		ctx.addAction({
			id: 'toggle',
			title: 'Show or hide the chip',
			run: () => {
				visible = !visible;
				if (visible) chip.show();
				else chip.hide();
			},
		});
		ctx.labs.place('toggle', { palette: true });
	},
};
