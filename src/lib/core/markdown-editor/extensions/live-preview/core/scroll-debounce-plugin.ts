import { ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { forceDecorationRebuild } from './effects';

/**
 * Debounces decoration rebuilds during scroll.
 *
 * When the viewport changes without a doc edit (pure scroll), decoration plugins
 * skip their rebuild (checkUpdateAction returns 'none' for viewportChanged).
 * This plugin waits for the scroll to settle (150ms of no viewport changes),
 * then dispatches forceDecorationRebuild to trigger a single coordinated rebuild
 * across all 27 decoration plugins at once.
 *
 * Combined with expandedVisibleRanges (2000-char buffer), most content already
 * has decorations from the previous rebuild. The debounced rebuild fills in
 * any content that scrolled beyond the buffer.
 */
export const scrollDebouncePlugin = ViewPlugin.fromClass(
	class {
		private timer: ReturnType<typeof setTimeout> | null = null;

		update(update: ViewUpdate) {
			if (update.viewportChanged && !update.docChanged) {
				if (this.timer) clearTimeout(this.timer);
				this.timer = setTimeout(() => {
					this.timer = null;
					update.view.dispatch({
						effects: forceDecorationRebuild.of(null),
					});
				}, 150);
			}
		}

		destroy() {
			if (this.timer) clearTimeout(this.timer);
		}
	},
);
