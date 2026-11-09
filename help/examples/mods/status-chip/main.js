// Example vault mod. To try it, copy this folder to <vault>/_system/mods/status-chip/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// Adds a chip to the right of the status bar. The app's DOM and ctx.app are
// raw access, with no compatibility promise.

/**
 * The status bar's two groups, left and right (StatusBar.svelte). App markup,
 * not an API: when the app changes it, the chip finds no place and stays out.
 */
const STATUS_BAR_GROUP = '.status-bar-group';
/** Updates the clock and puts the chip back if the app re-rendered the bar */
const TICK_MS = 30_000;

const pad2 = (n) => String(n).padStart(2, '0');

/** Anything thrown, as text: a Tauri rejection is a bare string, not an Error */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

export default {
	onload(ctx) {
		const editor = ctx.app.editorStore;
		let visible = true;

		const chip = document.createElement('button');
		chip.type = 'button';
		chip.dataset.modStatusChip = '';
		// Theme variables follow every theme change by themselves, so no handler is needed for them.
		chip.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--foreground); font-variant-numeric: tabular-nums;';
		const dot = document.createElement('span');
		dot.style.cssText = 'width: 6px; height: 6px; border-radius: 50%;';
		const label = document.createElement('span');
		chip.append(dot, label);

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
			chip.title = `Open note and time (${theme.mode} theme). Click to open today's note.`;
		};
		const attach = () => {
			if (!visible || chip.isConnected) return;
			const groups = document.querySelectorAll(STATUS_BAR_GROUP);
			// Prepend: the bar draws a divider before every item but the first.
			groups[groups.length - 1]?.prepend(chip);
		};

		const onClick = () => {
			ctx.app.openOrCreateDailyNote().catch((err) => {
				if (!ctx.signal.aborted) ctx.notify(`Cannot open today's note: ${errorMessage(err)}`, { kind: 'warning' });
			});
		};
		chip.addEventListener('click', onClick);

		render();
		paint(ctx.theme.current);
		attach();

		// watch, theme.onChange and the action are removed at unload by the host;
		// the timer, the listener and the node are the mod's own to remove.
		ctx.watch(() => editor.activeTabPath, render);
		ctx.theme.onChange(paint);
		const timer = setInterval(() => {
			render();
			attach();
		}, TICK_MS);
		ctx.register(() => {
			clearInterval(timer);
			chip.removeEventListener('click', onClick);
			chip.remove();
		});

		ctx.addAction({
			id: 'toggle',
			title: 'Show or hide the chip',
			run: () => {
				visible = !visible;
				// Removed, not hidden: a hidden first child would still push a divider onto the next item.
				if (visible) attach();
				else chip.remove();
			},
		});
		ctx.labs.place('toggle', { palette: true });
	},
};
