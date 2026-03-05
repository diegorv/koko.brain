export interface TagEntry {
	name: string;
	count: number;
	filePaths: string[];
}

export interface TagTreeNode {
	segment: string;
	fullPath: string;
	count: number;
	totalCount: number;
	filePaths: string[];
	children: TagTreeNode[];
}

export type TagSortMode = 'name' | 'count';
