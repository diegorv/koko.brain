/** A single card on the Kanban board */
export interface KanbanItem {
	/** Unique identifier for this card */
	id: string;
	/** Raw text content of the card (without the `- [ ] ` prefix) */
	text: string;
	/** Whether the card's checkbox is checked */
	checked: boolean;
	/**
	 * Lines the board does not model (prose, `### Sub`, indented notes, other
	 * list markers, blank runs) that follow this card in the file, written back
	 * verbatim after it. When the card moves, is archived or is restored, only its
	 * leading indented lines go with it; the rest stay in place.
	 */
	extraLines?: string[];
}

/** A single lane (column) on the board */
export interface KanbanLane {
	/** Unique identifier for this lane */
	id: string;
	/** Lane title (from `## Heading`) */
	title: string;
	/** Cards in this lane, in document order */
	items: KanbanItem[];
	/** Raw lines between the heading and the first card. Undefined writes one blank line. */
	headLines?: string[];
	/** Trailing blank lines that close the lane. Undefined writes one blank line. */
	gapLines?: string[];
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

/** Raw layout of the archive section, as read from the file */
export interface KanbanArchiveLayout {
	/** The `---` separator line */
	separator: string;
	/** Blank lines between the separator and the archive heading */
	spacer: string[];
	/** The `## Archive` heading line */
	heading: string;
	/** Raw lines between the heading and the first archived card */
	headLines: string[];
	/** Trailing blank lines that close the archive */
	gapLines: string[];
}

/** Raw `%% kanban:settings` block, as read from the file */
export interface KanbanSettingsBlock {
	/** The block's lines, from the opening `%% kanban:settings` to the closing `%%` */
	lines: string[];
	/**
	 * `JSON.stringify` of the settings parsed from the block (`{}` when its JSON
	 * is malformed). While the board's settings still stringify to this, the raw
	 * lines are written back unchanged.
	 */
	snapshot: string;
	/** Blank lines that followed the block */
	trailLines: string[];
}

/** Complete Kanban board data model */
export interface KanbanBoard {
	/** Active lanes on the board */
	lanes: KanbanLane[];
	/** Archived items (after the `---` separator) */
	archive: KanbanItem[];
	/** Board-level settings */
	settings: KanbanSettings;
	/** Raw lines before the first lane (frontmatter included), written back verbatim */
	preamble?: string[];
	/** Archive section layout read from the file; undefined writes the default layout */
	archiveLayout?: KanbanArchiveLayout;
	/** Settings block read from the file */
	settingsBlock?: KanbanSettingsBlock;
	/** Line ending of the source file; undefined writes `\n` */
	lineEnding?: '\n' | '\r\n';
}
