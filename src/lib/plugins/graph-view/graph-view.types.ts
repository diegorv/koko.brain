export interface GraphNode {
	id: string;
	name: string;
	folder: string;
	tags: string[];
	linkCount: number;
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
}

export interface GraphLink {
	source: string;
	target: string;
	bidirectional?: boolean;
}

export interface GraphData {
	nodes: GraphNode[];
	links: GraphLink[];
}

export type GraphMode = 'global' | 'local';

export interface GraphFilters {
	tag: string | null;
	folder: string | null;
	searchQuery: string;
	showOrphans: boolean;
}

export interface GraphDisplay {
	showArrows: boolean;
}
