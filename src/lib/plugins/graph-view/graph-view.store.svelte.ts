import type { GraphMode, GraphFilters, GraphDisplay } from './graph-view.types';

let mode = $state<GraphMode>('global');
let filters = $state<GraphFilters>({ tag: null, folder: null, searchQuery: '', showOrphans: true });
let display = $state<GraphDisplay>({ showArrows: false });
let highlightedNodeId = $state<string | null>(null);
/**
 * The note the graph centers on: the markdown note that was active when the
 * graph tab was opened or focused, or null when there was none. It cannot be
 * `editorStore.activeTabPath`, which is the graph tab's own virtual path
 * whenever GraphView is mounted.
 */
let centerPath = $state<string | null>(null);

/** Fewest link hops the local graph shows around its center. */
export const MIN_LOCAL_DEPTH = 1;
/** Most link hops the local graph shows around its center. */
export const MAX_LOCAL_DEPTH = 3;

/**
 * Link hops local mode shows around the center. Session state like `mode`,
 * not a setting; `openGraphTab` sets it back to 1 when it creates the tab.
 */
let localDepth = $state(MIN_LOCAL_DEPTH);

export const graphViewStore = {
	get mode() { return mode; },
	get filters() { return filters; },
	get display() { return display; },
	get highlightedNodeId() { return highlightedNodeId; },
	/** Path of the note local mode centers on and global mode highlights, or null. */
	get centerPath() { return centerPath; },
	/** Link hops local mode shows around the center, 1 to 3. */
	get localDepth() { return localDepth; },

	setMode(m: GraphMode) { mode = m; },
	setFilters(f: Partial<GraphFilters>) { filters = { ...filters, ...f }; },
	setDisplay(d: Partial<GraphDisplay>) { display = { ...display, ...d }; },
	setHighlightedNode(id: string | null) { highlightedNodeId = id; },
	/** Sets the note the graph centers on (null for none). */
	setCenterPath(path: string | null) { centerPath = path; },
	/** Sets the local graph depth, clamped to 1-3. */
	setLocalDepth(depth: number) { localDepth = Math.min(MAX_LOCAL_DEPTH, Math.max(MIN_LOCAL_DEPTH, depth)); },

	reset() {
		mode = 'global';
		filters = { tag: null, folder: null, searchQuery: '', showOrphans: true };
		display = { showArrows: false };
		highlightedNodeId = null;
		centerPath = null;
		localDepth = MIN_LOCAL_DEPTH;
	},
};
