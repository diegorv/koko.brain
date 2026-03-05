/** A single card on the Kanban board */
export interface KanbanItem {
	/** Unique identifier for this card */
	id: string;
	/** Raw text content of the card (without the `- [ ] ` prefix) */
	text: string;
	/** Whether the card's checkbox is checked */
	checked: boolean;
}

/** A single lane (column) on the board */
export interface KanbanLane {
	/** Unique identifier for this lane */
	id: string;
	/** Lane title (from `## Heading`) */
	title: string;
	/** Cards in this lane, in document order */
	items: KanbanItem[];
}

/** Per-lane settings, keyed by lane title in the settings block */
export interface KanbanLaneSettings {
	/** Maximum number of items allowed in this lane (0 = unlimited) */
	maxItems?: number;
	/** Whether moving a card into this lane auto-checks it */
	autoComplete?: boolean;
	/** Whether this lane is currently collapsed */
	collapsed?: boolean;
}

/** Sort mode for cards within a lane */
export type KanbanSortMode = 'manual' | 'date-asc' | 'date-desc' | 'text-asc' | 'text-desc' | 'checked';

/** View mode for the kanban board */
export type KanbanViewMode = 'board' | 'list' | 'table';

/** Board-level settings */
export interface KanbanSettings {
	/** Lane width in pixels (default: 272) */
	laneWidth?: number;
	/** Tag-to-color mapping, e.g. { "urgent": "red", "bug": "orange" } */
	tagColors?: Record<string, string>;
	/** Per-lane settings keyed by lane title */
	laneSettings?: Record<string, KanbanLaneSettings>;
	/** Current sort mode */
	sortMode?: KanbanSortMode;
	/** Current view mode */
	viewMode?: KanbanViewMode;
}

/** Complete Kanban board data model */
export interface KanbanBoard {
	/** Active lanes on the board */
	lanes: KanbanLane[];
	/** Archived items (after the `---` separator) */
	archive: KanbanItem[];
	/** Board-level settings */
	settings: KanbanSettings;
}
