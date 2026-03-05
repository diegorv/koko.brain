import type { KanbanBoard, KanbanItem, KanbanLane, KanbanSettings, KanbanSortMode, KanbanViewMode } from './kanban.types';

const HEADING_RE = /^##\s+(.+)$/;
const TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/;
const ARCHIVE_SEPARATOR_RE = /^---\s*$/;
const SETTINGS_BLOCK_RE = /%%\s*kanban:settings\s*\n([\s\S]*?)\n%%/;
const DATE_IN_BRACES_RE = /\{(\d{4}-\d{2}-\d{2})\}/;
const COLOR_IN_BRACES_RE = /\{color:(blue|green|red|orange|purple|yellow|gray)\}/;

/** Default lane width in pixels */
export const DEFAULT_LANE_WIDTH = 272;

/** Generates a unique ID for lanes/items */
export function generateKanbanId(): string {
	return crypto.randomUUID().slice(0, 8);
}

/**
 * Parses the `%% kanban:settings ... %%` block from raw content.
 * Returns an empty object if no settings block is found or JSON is malformed.
 */
export function parseSettings(content: string): KanbanSettings {
	const match = content.match(SETTINGS_BLOCK_RE);
	if (!match) return {};
	try {
		return JSON.parse(match[1]) as KanbanSettings;
	} catch {
		return {};
	}
}

/**
 * Serializes board settings into a `%% kanban:settings ... %%` block.
 * Returns empty string if settings object has no meaningful values.
 */
export function serializeSettings(settings: KanbanSettings): string {
	const filtered = Object.fromEntries(
		Object.entries(settings).filter(([, v]) => v !== undefined),
	);
	if (Object.keys(filtered).length === 0) return '';
	return `\n%% kanban:settings\n${JSON.stringify(filtered, null, 2)}\n%%\n`;
}

/**
 * Parses a `.kanban` file's markdown content into a KanbanBoard.
 *
 * Format:
 * - `## Heading` → lane
 * - `- [ ] text` / `- [x] text` → item
 * - `---` → separates active content from archive
 * - `%% kanban:settings { JSON } %%` → board settings
 */
export function parseKanbanBoard(content: string): KanbanBoard {
	// Extract settings from raw content before line-by-line parsing
	const settings = parseSettings(content);

	// Strip the settings block so it doesn't interfere with line parsing
	const cleanContent = content.replace(SETTINGS_BLOCK_RE, '');

	const lines = cleanContent.split('\n');
	const lanes: KanbanLane[] = [];
	const archive: KanbanItem[] = [];
	let currentLane: KanbanLane | null = null;
	let inArchive = false;

	for (const line of lines) {
		// Check for archive separator
		if (!inArchive && ARCHIVE_SEPARATOR_RE.test(line)) {
			inArchive = true;
			currentLane = null;
			continue;
		}

		// Parse heading → lane
		const headingMatch = line.match(HEADING_RE);
		if (headingMatch) {
			if (inArchive) {
				// Archive heading — we still collect items into the archive array
				// but we don't create a lane for it
				continue;
			}
			currentLane = {
				id: generateKanbanId(),
				title: headingMatch[1].trim(),
				items: [],
			};
			lanes.push(currentLane);
			continue;
		}

		// Parse task item → card
		const taskMatch = line.match(TASK_RE);
		if (taskMatch) {
			const checked = taskMatch[1].toLowerCase() === 'x';
			const text = taskMatch[2];
			const item: KanbanItem = {
				id: generateKanbanId(),
				text,
				checked,
			};

			if (inArchive) {
				archive.push(item);
			} else if (currentLane) {
				currentLane.items.push(item);
			}
		}
	}

	return { lanes, archive, settings };
}

/**
 * Serializes a KanbanBoard back to markdown.
 * Appends `%% kanban:settings ... %%` block at the end if settings are non-empty.
 */
export function serializeKanbanBoard(board: KanbanBoard): string {
	const parts: string[] = [];

	for (const lane of board.lanes) {
		parts.push(`## ${lane.title}`);
		parts.push('');
		for (const item of lane.items) {
			const check = item.checked ? 'x' : ' ';
			parts.push(`- [${check}] ${item.text}`);
		}
		parts.push('');
	}

	if (board.archive.length > 0) {
		parts.push('---');
		parts.push('');
		parts.push('## Archive');
		parts.push('');
		for (const item of board.archive) {
			const check = item.checked ? 'x' : ' ';
			parts.push(`- [${check}] ${item.text}`);
		}
		parts.push('');
	}

	const settingsBlock = serializeSettings(board.settings);
	return parts.join('\n') + settingsBlock;
}

/** Creates a new empty board with default lanes */
export function createEmptyKanbanBoard(): KanbanBoard {
	return {
		lanes: [
			{ id: generateKanbanId(), title: 'To Do', items: [] },
			{ id: generateKanbanId(), title: 'In Progress', items: [] },
			{ id: generateKanbanId(), title: 'Done', items: [] },
		],
		archive: [],
		settings: {},
	};
}

// ── Board manipulation (immutable updates) ──────────────────────────

/** Adds a new item to the end of a lane */
export function addItem(board: KanbanBoard, laneId: string, text: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? { ...lane, items: [...lane.items, { id: generateKanbanId(), text, checked: false }] }
				: lane,
		),
	};
}

/** Removes an item from a lane */
export function removeItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? { ...lane, items: lane.items.filter((item) => item.id !== itemId) }
				: lane,
		),
	};
}

/** Updates an item's text */
export function updateItem(board: KanbanBoard, laneId: string, itemId: string, text: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? {
						...lane,
						items: lane.items.map((item) =>
							item.id === itemId ? { ...item, text } : item,
						),
					}
				: lane,
		),
	};
}

/** Toggles an item's checked state */
export function toggleItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? {
						...lane,
						items: lane.items.map((item) =>
							item.id === itemId ? { ...item, checked: !item.checked } : item,
						),
					}
				: lane,
		),
	};
}

/**
 * Moves an item from one lane to another (or within the same lane).
 * The item is inserted at `toIndex` in the target lane.
 * If `autoCheck` is true, the item's checked state is set to true.
 */
export function moveItem(
	board: KanbanBoard,
	fromLaneId: string,
	itemId: string,
	toLaneId: string,
	toIndex: number,
	autoCheck?: boolean,
): KanbanBoard {
	// Find the item in the source lane
	const sourceLane = board.lanes.find((l) => l.id === fromLaneId);
	if (!sourceLane) return board;
	const sourceItem = sourceLane.items.find((i) => i.id === itemId);
	if (!sourceItem) return board;

	// Apply autoCheck if moving between lanes
	const item = autoCheck && fromLaneId !== toLaneId
		? { ...sourceItem, checked: true }
		: sourceItem;

	if (fromLaneId === toLaneId) {
		// Reorder within the same lane
		const items = sourceLane.items.filter((i) => i.id !== itemId);
		const clampedIndex = Math.min(toIndex, items.length);
		items.splice(clampedIndex, 0, item);
		return {
			...board,
			lanes: board.lanes.map((lane) =>
				lane.id === fromLaneId ? { ...lane, items } : lane,
			),
		};
	}

	// Move between different lanes
	return {
		...board,
		lanes: board.lanes.map((lane) => {
			if (lane.id === fromLaneId) {
				return { ...lane, items: lane.items.filter((i) => i.id !== itemId) };
			}
			if (lane.id === toLaneId) {
				const items = [...lane.items];
				const clampedIndex = Math.min(toIndex, items.length);
				items.splice(clampedIndex, 0, item);
				return { ...lane, items };
			}
			return lane;
		}),
	};
}

/** Adds a new lane to the board */
export function addLane(board: KanbanBoard, title: string): KanbanBoard {
	return {
		...board,
		lanes: [...board.lanes, { id: generateKanbanId(), title, items: [] }],
	};
}

/** Removes a lane from the board */
export function removeLane(board: KanbanBoard, laneId: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.filter((lane) => lane.id !== laneId),
	};
}

/** Renames a lane */
export function renameLane(board: KanbanBoard, laneId: string, newTitle: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId ? { ...lane, title: newTitle } : lane,
		),
	};
}

/** Moves a lane to a new position */
export function moveLane(board: KanbanBoard, fromIndex: number, toIndex: number): KanbanBoard {
	if (fromIndex === toIndex) return board;
	if (fromIndex < 0 || fromIndex >= board.lanes.length) return board;
	if (toIndex < 0 || toIndex >= board.lanes.length) return board;

	const lanes = [...board.lanes];
	const [moved] = lanes.splice(fromIndex, 1);
	lanes.splice(toIndex, 0, moved);
	return { ...board, lanes };
}

/** Moves an item to the archive */
export function archiveItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard {
	const sourceLane = board.lanes.find((l) => l.id === laneId);
	if (!sourceLane) return board;
	const item = sourceLane.items.find((i) => i.id === itemId);
	if (!item) return board;

	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? { ...lane, items: lane.items.filter((i) => i.id !== itemId) }
				: lane,
		),
		archive: [...board.archive, { ...item, checked: true }],
	};
}

/** Archives all checked items in a lane */
export function archiveCompletedItems(board: KanbanBoard, laneId: string): KanbanBoard {
	const sourceLane = board.lanes.find((l) => l.id === laneId);
	if (!sourceLane) return board;

	const completed = sourceLane.items.filter((i) => i.checked);
	if (completed.length === 0) return board;

	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? { ...lane, items: lane.items.filter((i) => !i.checked) }
				: lane,
		),
		archive: [...board.archive, ...completed],
	};
}

/** Restores an item from the archive to a lane */
export function restoreItem(board: KanbanBoard, itemId: string, toLaneId: string): KanbanBoard {
	const item = board.archive.find((i) => i.id === itemId);
	if (!item) return board;

	return {
		...board,
		archive: board.archive.filter((i) => i.id !== itemId),
		lanes: board.lanes.map((lane) =>
			lane.id === toLaneId
				? { ...lane, items: [...lane.items, { ...item, checked: false }] }
				: lane,
		),
	};
}

// ── Settings manipulation ────────────────────────────────────────────

/** Updates board-level settings (shallow merge) */
export function updateBoardSettings(
	board: KanbanBoard,
	updates: Partial<KanbanSettings>,
): KanbanBoard {
	return { ...board, settings: { ...board.settings, ...updates } };
}

/** Checks if a lane is collapsed */
export function isLaneCollapsed(board: KanbanBoard, laneTitle: string): boolean {
	return board.settings.laneSettings?.[laneTitle]?.collapsed ?? false;
}

/** Toggles the collapsed state of a lane in board settings */
export function toggleLaneCollapsed(board: KanbanBoard, laneTitle: string): KanbanBoard {
	const laneSettings = board.settings.laneSettings ?? {};
	const current = laneSettings[laneTitle]?.collapsed ?? false;
	return {
		...board,
		settings: {
			...board.settings,
			laneSettings: {
				...laneSettings,
				[laneTitle]: { ...laneSettings[laneTitle], collapsed: !current },
			},
		},
	};
}

/** Gets the max items limit for a lane (0 = unlimited) */
export function getLaneMaxItems(board: KanbanBoard, laneTitle: string): number {
	return board.settings.laneSettings?.[laneTitle]?.maxItems ?? 0;
}

/** Sets the max items limit for a lane (0 or undefined = unlimited) */
export function setLaneMaxItems(board: KanbanBoard, laneTitle: string, maxItems: number): KanbanBoard {
	const laneSettings = board.settings.laneSettings ?? {};
	return {
		...board,
		settings: {
			...board.settings,
			laneSettings: {
				...laneSettings,
				[laneTitle]: {
					...laneSettings[laneTitle],
					maxItems: maxItems > 0 ? maxItems : undefined,
				},
			},
		},
	};
}

/** Checks if a lane has reached its item limit */
export function isLaneAtLimit(board: KanbanBoard, laneTitle: string): boolean {
	const max = getLaneMaxItems(board, laneTitle);
	if (max === 0) return false;
	const lane = board.lanes.find((l) => l.title === laneTitle);
	return lane ? lane.items.length >= max : false;
}

/** Checks if a lane has auto-complete enabled */
export function isLaneAutoComplete(board: KanbanBoard, laneTitle: string): boolean {
	return board.settings.laneSettings?.[laneTitle]?.autoComplete ?? false;
}

/** Sets the auto-complete flag for a lane */
export function setLaneAutoComplete(board: KanbanBoard, laneTitle: string, autoComplete: boolean): KanbanBoard {
	const laneSettings = board.settings.laneSettings ?? {};
	return {
		...board,
		settings: {
			...board.settings,
			laneSettings: {
				...laneSettings,
				[laneTitle]: { ...laneSettings[laneTitle], autoComplete },
			},
		},
	};
}

// ── Date extraction/manipulation ─────────────────────────────────────

/** Extracts a date string from card text (format: {YYYY-MM-DD}). Returns null if none found. */
export function extractCardDate(text: string): string | null {
	const match = text.match(DATE_IN_BRACES_RE);
	return match ? match[1] : null;
}

/** Sets or replaces a date in card text. Appends if no date exists. */
export function setCardDate(text: string, date: string): string {
	if (DATE_IN_BRACES_RE.test(text)) {
		return text.replace(DATE_IN_BRACES_RE, `{${date}}`);
	}
	return `${text} {${date}}`;
}

/** Removes the date from card text */
export function removeCardDate(text: string): string {
	return text.replace(DATE_IN_BRACES_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Returns the card text with the date portion stripped (for display) */
export function stripCardDate(text: string): string {
	return text.replace(DATE_IN_BRACES_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Date proximity relative to today */
export type DateProximity = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'future' | 'none';

/** Determines the date proximity for coloring. Both params are YYYY-MM-DD strings. */
export function getDateProximity(dateStr: string | null, todayStr: string): DateProximity {
	if (!dateStr) return 'none';
	if (dateStr < todayStr) return 'overdue';
	if (dateStr === todayStr) return 'today';
	// Check tomorrow and upcoming (within 3 days)
	const todayMs = new Date(todayStr + 'T00:00:00').getTime();
	const dateMs = new Date(dateStr + 'T00:00:00').getTime();
	const diffDays = Math.round((dateMs - todayMs) / 86400000);
	if (diffDays === 1) return 'tomorrow';
	if (diffDays <= 3) return 'upcoming';
	return 'future';
}

// ── Card color extraction/manipulation ───────────────────────────────

/** Extracts a color name from card text (format: {color:name}). Returns null if none found. */
export function extractCardColor(text: string): string | null {
	const match = text.match(COLOR_IN_BRACES_RE);
	return match ? match[1] : null;
}

/** Sets or replaces a color in card text. Appends if no color exists. */
export function setCardColor(text: string, color: string): string {
	if (COLOR_IN_BRACES_RE.test(text)) {
		return text.replace(COLOR_IN_BRACES_RE, `{color:${color}}`);
	}
	return `${text} {color:${color}}`;
}

/** Removes the color from card text */
export function removeCardColor(text: string): string {
	return text.replace(COLOR_IN_BRACES_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Returns the card text with the color portion stripped (for display) */
export function stripCardColor(text: string): string {
	return text.replace(COLOR_IN_BRACES_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Strips both date and color metadata tokens from card text for display */
export function stripCardMetadata(text: string): string {
	return text
		.replace(DATE_IN_BRACES_RE, '')
		.replace(COLOR_IN_BRACES_RE, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

// ── Tag extraction/manipulation ──────────────────────────────────────

const INLINE_TAG_RE = /(?:^|\s)#([\p{L}_][\p{L}\d_/-]*)/gmu;

/** Extracts inline #tags from card text */
export function extractCardTags(text: string): string[] {
	const tags: string[] = [];
	for (const match of text.matchAll(INLINE_TAG_RE)) {
		tags.push(match[1]);
	}
	return [...new Set(tags)];
}

/** Sets a tag color in board settings */
export function setTagColor(board: KanbanBoard, tag: string, color: string): KanbanBoard {
	const tagColors = { ...(board.settings.tagColors ?? {}), [tag]: color };
	return { ...board, settings: { ...board.settings, tagColors } };
}

/** Removes a tag color from board settings */
export function removeTagColor(board: KanbanBoard, tag: string): KanbanBoard {
	const tagColors = { ...(board.settings.tagColors ?? {}) };
	delete tagColors[tag];
	return { ...board, settings: { ...board.settings, tagColors } };
}

// ── Rich text parsing ───────────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/** A segment of card text for rich rendering */
export type CardSegment =
	| { type: 'text'; value: string }
	| { type: 'wikilink'; target: string; heading?: string; display: string }
	| { type: 'tag'; value: string };

/** Extracts wikilinks from card text */
export function extractCardWikilinks(text: string): Array<{ target: string; heading?: string; display: string }> {
	const links: Array<{ target: string; heading?: string; display: string }> = [];
	for (const m of text.matchAll(WIKILINK_RE)) {
		const target = m[1];
		const heading = m[2] || undefined;
		const display = m[3] || (heading ? `${target}#${heading}` : target);
		links.push({ target, heading, display });
	}
	return links;
}

/**
 * Parses card text into segments for rich rendering.
 * Recognizes wikilinks ([[target]]) and #tags in text.
 * Date tokens ({YYYY-MM-DD}) should already be stripped before calling this.
 */
export function parseCardSegments(text: string): CardSegment[] {
	// Combined pattern: wikilinks OR tags
	const COMBINED_RE = /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]|(?:^|\s)#([\p{L}_][\p{L}\d_/-]*)/gmu;
	const segments: CardSegment[] = [];
	let lastIndex = 0;

	for (const m of text.matchAll(COMBINED_RE)) {
		const matchStart = m.index!;

		// For tags, the match may include a leading space — adjust
		const isTag = m[4] !== undefined;
		let segStart = matchStart;
		let segContent = m[0];

		if (isTag && segContent.startsWith(' ')) {
			// Include the leading space as text
			segStart = matchStart + 1;
			segContent = segContent.slice(1);
		}

		// Add preceding text
		if (segStart > lastIndex) {
			segments.push({ type: 'text', value: text.slice(lastIndex, segStart) });
		}

		if (isTag) {
			segments.push({ type: 'tag', value: m[4] });
		} else {
			const target = m[1];
			const heading = m[2] || undefined;
			const display = m[3] || (heading ? `${target}#${heading}` : target);
			segments.push({ type: 'wikilink', target, heading, display });
		}

		lastIndex = matchStart + m[0].length;
	}

	// Trailing text
	if (lastIndex < text.length) {
		segments.push({ type: 'text', value: text.slice(lastIndex) });
	}

	return segments;
}

// ── Sorting ─────────────────────────────────────────────────────────

/**
 * Sorts items according to the given sort mode. Returns a new array.
 * For 'manual', returns items unchanged.
 */
export function sortItems(items: KanbanItem[], mode: KanbanSortMode): KanbanItem[] {
	if (mode === 'manual') return items;

	const sorted = [...items];
	switch (mode) {
		case 'text-asc':
			sorted.sort((a, b) => a.text.localeCompare(b.text));
			break;
		case 'text-desc':
			sorted.sort((a, b) => b.text.localeCompare(a.text));
			break;
		case 'date-asc':
			sorted.sort((a, b) => {
				const da = extractCardDate(a.text);
				const db = extractCardDate(b.text);
				if (!da && !db) return 0;
				if (!da) return 1;
				if (!db) return -1;
				return da.localeCompare(db);
			});
			break;
		case 'date-desc':
			sorted.sort((a, b) => {
				const da = extractCardDate(a.text);
				const db = extractCardDate(b.text);
				if (!da && !db) return 0;
				if (!da) return 1;
				if (!db) return -1;
				return db.localeCompare(da);
			});
			break;
		case 'checked':
			sorted.sort((a, b) => {
				if (a.checked === b.checked) return 0;
				return a.checked ? 1 : -1;
			});
			break;
	}
	return sorted;
}

/** Sets the board sort mode */
export function setSortMode(board: KanbanBoard, mode: KanbanSortMode): KanbanBoard {
	return { ...board, settings: { ...board.settings, sortMode: mode } };
}

// ── Filtering ───────────────────────────────────────────────────────

/**
 * Filters items by a text query. Case-insensitive, matches against
 * item text (including tags, dates, wikilinks).
 * Returns original array if query is empty.
 */
export function filterItems(items: KanbanItem[], query: string): KanbanItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return items;
	return items.filter((item) => item.text.toLowerCase().includes(q));
}

// ── View mode ───────────────────────────────────────────────────────

/** Sets the board view mode */
export function setViewMode(board: KanbanBoard, mode: KanbanViewMode): KanbanBoard {
	return { ...board, settings: { ...board.settings, viewMode: mode } };
}
