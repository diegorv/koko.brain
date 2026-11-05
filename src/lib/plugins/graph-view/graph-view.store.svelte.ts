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

export const graphViewStore = {
	get mode() { return mode; },
	get filters() { return filters; },
	get display() { return display; },
	get highlightedNodeId() { return highlightedNodeId; },
	/** Path of the note local mode centers on and global mode highlights, or null. */
	get centerPath() { return centerPath; },

	setMode(m: GraphMode) { mode = m; },
	setFilters(f: Partial<GraphFilters>) { filters = { ...filters, ...f }; },
	setDisplay(d: Partial<GraphDisplay>) { display = { ...display, ...d }; },
	setHighlightedNode(id: string | null) { highlightedNodeId = id; },
	/** Sets the note the graph centers on (null for none). */
	setCenterPath(path: string | null) { centerPath = path; },

	reset() {
		mode = 'global';
		filters = { tag: null, folder: null, searchQuery: '', showOrphans: true };
		display = { showArrows: false };
		highlightedNodeId = null;
		centerPath = null;
	},
};
