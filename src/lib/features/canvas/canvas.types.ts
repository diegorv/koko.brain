/** Preset color numbers (1–6) mapping to specific hues, or a hex string (#RRGGBB) */
export type CanvasColor = '1' | '2' | '3' | '4' | '5' | '6' | (string & {});

/** Maps preset color numbers to hex values */
export const CANVAS_COLOR_MAP: Record<string, string> = {
	'1': '#fb464c', // red
	'2': '#e9973f', // orange
	'3': '#e0de71', // yellow
	'4': '#44cf6e', // green
	'5': '#53dfdd', // cyan
	'6': '#a882ff', // purple
};

/** Side of a node where an edge connects */
export type CanvasSide = 'top' | 'right' | 'bottom' | 'left';

/** Style for an edge endpoint */
export type CanvasEdgeEnd = 'none' | 'arrow';

// --- Node types ---

/** Properties shared by all canvas node types */
export interface CanvasNodeBase {
	/** Unique identifier */
	id: string;
	/** X-coordinate position on the canvas */
	x: number;
	/** Y-coordinate position on the canvas */
	y: number;
	/** Width of the node */
	width: number;
	/** Height of the node */
	height: number;
	/** Optional color (preset 1–6 or hex) */
	color?: CanvasColor;
}

/** A text card with markdown content */
export interface CanvasTextNode extends CanvasNodeBase {
	type: 'text';
	/** Markdown text content */
	text: string;
}

/** A reference to a file in the vault */
export interface CanvasFileNode extends CanvasNodeBase {
	type: 'file';
	/** Path to the file in the vault */
	file: string;
	/** Optional subpath (heading or block reference) */
	subpath?: string;
}

/** An external URL reference */
export interface CanvasLinkNode extends CanvasNodeBase {
	type: 'link';
	/** External URL */
	url: string;
	/** Optional display label (shown instead of hostname when set) */
	label?: string;
}

/** A visual container for grouping nodes */
export interface CanvasGroupNode extends CanvasNodeBase {
	type: 'group';
	/** Optional display label */
	label?: string;
	/** Optional background image path */
	background?: string;
}

/** An image displayed on the canvas */
export interface CanvasImageNode extends CanvasNodeBase {
	type: 'image';
	/** Path to the image file in the vault, or external URL */
	file: string;
}

/** Discriminated union of all canvas node types */
export type CanvasNode = CanvasTextNode | CanvasFileNode | CanvasLinkNode | CanvasGroupNode | CanvasImageNode;

/** A directed connection between two nodes */
export interface CanvasEdge {
	/** Unique identifier */
	id: string;
	/** Source node ID */
	fromNode: string;
	/** Target node ID */
	toNode: string;
	/** Side of the source node */
	fromSide?: CanvasSide;
	/** Side of the target node */
	toSide?: CanvasSide;
	/** Endpoint style at the source (default: 'none') */
	fromEnd?: CanvasEdgeEnd;
	/** Endpoint style at the target (default: 'arrow') */
	toEnd?: CanvasEdgeEnd;
	/** Optional text label on the edge */
	label?: string;
	/** Optional edge color (preset 1–6 or hex) */
	color?: CanvasColor;
}

/** Top-level canvas data structure (JSON Canvas 1.0) */
export interface CanvasData {
	/** Array of nodes in ascending z-index order */
	nodes: CanvasNode[];
	/** Array of connections between nodes */
	edges: CanvasEdge[];
}
