import type { GraphMode, GraphFilters, GraphDisplay } from './graph-view.types';

let mode = $state<GraphMode>('global');
let filters = $state<GraphFilters>({ tag: null, folder: null, searchQuery: '', showOrphans: true });
let display = $state<GraphDisplay>({ showArrows: false });
let highlightedNodeId = $state<string | null>(null);

export const graphViewStore = {
	get mode() { return mode; },
	get filters() { return filters; },
	get display() { return display; },
	get highlightedNodeId() { return highlightedNodeId; },

	setMode(m: GraphMode) { mode = m; },
	setFilters(f: Partial<GraphFilters>) { filters = { ...filters, ...f }; },
	setDisplay(d: Partial<GraphDisplay>) { display = { ...display, ...d }; },
	setHighlightedNode(id: string | null) { highlightedNodeId = id; },

	reset() {
		mode = 'global';
		filters = { tag: null, folder: null, searchQuery: '', showOrphans: true };
		display = { showArrows: false };
		highlightedNodeId = null;
	},
};
