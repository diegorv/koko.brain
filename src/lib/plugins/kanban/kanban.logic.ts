import { clamp } from '#lib/utils/clamp.js';
import type {
	KanbanArchiveLayout,
	KanbanBoard,
	KanbanItem,
	KanbanLane,
	KanbanSettings,
	KanbanSettingsBlock,
	KanbanSortMode,
	KanbanViewMode,
} from './kanban.types';

const HEADING_RE = /^##\s+(.+)$/;
const TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/;
/** Matches the archive separator and the frontmatter fences */
const RULE_RE = /^---\s*$/;
const ARCHIVE_HEADING_RE = /^##\s+Archive\s*$/;
const FRONTMATTER_CLOSE_RE = /^(---|\.\.\.)\s*$/;
const SETTINGS_BLOCK_RE = /%%\s*kanban:settings\s*\n([\s\S]*?)\n%%/;
const SETTINGS_OPEN_RE = /^%%\s*kanban:settings\s*$/;
/** An indented, non-blank raw line: a card's continuation, which moves with the card */
const CONTINUATION_RE = /^\s+\S/;
const SETTINGS_CLOSE_RE = /^%%/;
const BLANK_RE = /^\s*$/;
const NEWLINE_RE = /\r?\n/g;
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

/** A lane or the archive while parsing: where its cards and raw lines go */
interface ParseSection {
	items: KanbanItem[];
	headLines: string[];
	gapLines: string[];
}

/**
 * Index of the `## Archive` heading when `lines[i]` opens the archive in the
 * form the serializer writes (`---`, blank lines, `## Archive`), else -1.
 */
function archiveHeadingIndex(lines: string[], i: number): number {
	if (!RULE_RE.test(lines[i])) return -1;
	let j = i + 1;
	while (j < lines.length && BLANK_RE.test(lines[j])) j++;
	return j < lines.length && ARCHIVE_HEADING_RE.test(lines[j]) ? j : -1;
}

/**
 * Index of the closing fence of a frontmatter block that opens on line 0, else
 * -1. Line 0 is a rule above a lane, not a frontmatter opener, when a card comes
 * before the fence, or when `## ` lines come before it and either nothing else
 * does or the fence opens the archive (otherwise that `---` would close the
 * frontmatter and swallow the lanes). A `## ` YAML comment among keys stays frontmatter.
 */
function frontmatterEnd(lines: string[]): number {
	if (!RULE_RE.test(lines[0]) || archiveHeadingIndex(lines, 0) >= 0) return -1;
	let heading = false;
	let other = false;
	for (let j = 1; j < lines.length; j++) {
		const line = lines[j];
		if (FRONTMATTER_CLOSE_RE.test(line)) {
			return heading && (!other || archiveHeadingIndex(lines, j) >= 0) ? -1 : j;
		}
		if (TASK_RE.test(line)) return -1;
		if (HEADING_RE.test(line)) heading = true;
		else if (!BLANK_RE.test(line)) other = true;
	}
	return -1;
}

/**
 * Moves the blank run that ends a section into its `gapLines`. An itemless
 * section keeps a leading blank line in its head, so a card added later lands
 * in the canonical `## Lane` / blank / card shape.
 */
function closeSection(section: ParseSection | null): void {
	if (!section) return;
	const last = section.items.at(-1);
	const tail = last ? (last.extraLines ??= []) : section.headLines;
	const keep = !last && tail.length > 0 && BLANK_RE.test(tail[0]) ? 1 : 0;
	let start = tail.length;
	while (start > keep && BLANK_RE.test(tail[start - 1])) start--;
	section.gapLines.push(...tail.splice(start));
}

/**
 * Splits the first closed `%% kanban:settings` ... `%%` block out of the lines.
 * An opener followed by another opener before any `%%` never closed and stays a
 * raw line. The block is always written at the end, so non-blank lines after it
 * rejoin the body.
 */
function extractSettingsBlock(lines: string[]): {
	bodyLines: string[];
	settings: KanbanSettings;
	settingsBlock?: KanbanSettingsBlock;
} {
	let open = -1;
	let close = -1;
	for (let j = 0; j < lines.length; j++) {
		if (SETTINGS_OPEN_RE.test(lines[j])) {
			open = j;
		} else if (open >= 0 && SETTINGS_CLOSE_RE.test(lines[j])) {
			close = j;
			break;
		}
	}
	if (close < 0) return { bodyLines: lines, settings: {} };

	let settings: KanbanSettings = {};
	try {
		settings = JSON.parse(lines.slice(open + 1, close).join('\n')) as KanbanSettings;
	} catch {
		settings = {};
	}
	const after = lines.slice(close + 1);
	let trailStart = after.length;
	while (trailStart > 0 && BLANK_RE.test(after[trailStart - 1])) trailStart--;
	return {
		bodyLines: [...lines.slice(0, open), ...after.slice(0, trailStart)],
		settings,
		settingsBlock: {
			lines: lines.slice(open, close + 1),
			snapshot: JSON.stringify(settings),
			trailLines: after.slice(trailStart),
		},
	};
}

/**
 * Parses a `.kanban` file's markdown content into a KanbanBoard.
 *
 * Format:
 * - `## Heading` → lane
 * - `- [ ] text` / `- [x] text` → item
 * - `---`, blank lines, `## Archive` → separates active content from archive
 * - `%% kanban:settings { JSON } %%` → board settings
 *
 * Every other line (frontmatter, prose, `### Sub`, indented notes, other list
 * markers, a lone `---`) is kept raw where it was, attached to the board
 * preamble, the lane head or the card it follows, so serializeKanbanBoard
 * writes it back in place. CRLF input is parsed normalized and remembered in
 * `lineEnding`.
 */
export function parseKanbanBoard(content: string): KanbanBoard {
	const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
	const { bodyLines: lines, settings, settingsBlock } = extractSettingsBlock(
		content.replace(/\r\n/g, '\n').split('\n'),
	);

	const preamble: string[] = [];
	const lanes: KanbanLane[] = [];
	const archive: KanbanItem[] = [];
	let archiveLayout: KanbanArchiveLayout | undefined;
	let section: ParseSection | null = null;
	let sink = preamble;

	const fmEnd = frontmatterEnd(lines);
	if (fmEnd >= 0) preamble.push(...lines.slice(0, fmEnd + 1));

	for (let i = fmEnd + 1; i < lines.length; i++) {
		const line = lines[i];

		if (!archiveLayout) {
			const headingIndex = archiveHeadingIndex(lines, i);
			if (headingIndex >= 0) {
				closeSection(section);
				archiveLayout = {
					separator: line,
					spacer: lines.slice(i + 1, headingIndex),
					heading: lines[headingIndex],
					headLines: [],
					gapLines: [],
				};
				section = { items: archive, headLines: archiveLayout.headLines, gapLines: archiveLayout.gapLines };
				sink = archiveLayout.headLines;
				i = headingIndex;
				continue;
			}

			// After the archive heading every heading is a raw line
			const headingMatch = line.match(HEADING_RE);
			if (headingMatch) {
				closeSection(section);
				const lane = {
					id: generateKanbanId(),
					title: headingMatch[1].trim(),
					items: [] as KanbanItem[],
					headLines: [] as string[],
					gapLines: [] as string[],
				};
				lanes.push(lane);
				section = lane;
				sink = lane.headLines;
				continue;
			}
		}

		const taskMatch = line.match(TASK_RE);
		if (taskMatch && section) {
			const item = {
				id: generateKanbanId(),
				text: taskMatch[2],
				checked: taskMatch[1].toLowerCase() === 'x',
				extraLines: [] as string[],
			};
			section.items.push(item);
			sink = item.extraLines;
			continue;
		}

		sink.push(line);
	}
	closeSection(section);

	return { lanes, archive, settings, preamble, archiveLayout, settingsBlock, lineEnding };
}

/** Appends each card line followed by its raw lines */
function pushItems(lines: string[], items: KanbanItem[]): void {
	for (const item of items) {
		const check = item.checked ? 'x' : ' ';
		lines.push(`- [${check}] ${item.text}`, ...(item.extraLines ?? []));
	}
}

/**
 * Serializes a KanbanBoard back to markdown.
 * Raw lines kept by parseKanbanBoard are written back in place, in the source
 * line ending. The settings block goes at the end: the raw block when the
 * settings did not change since parse (malformed JSON included), else a fresh one.
 */
export function serializeKanbanBoard(board: KanbanBoard): string {
	const eol = board.lineEnding ?? '\n';
	const lines: string[] = [...(board.preamble ?? [])];

	for (const lane of board.lanes) {
		lines.push(`## ${lane.title}`, ...(lane.headLines ?? ['']));
		pushItems(lines, lane.items);
		lines.push(...(lane.gapLines ?? ['']));
	}

	const layout = board.archiveLayout;
	if (board.archive.length > 0 || layout?.headLines.some((line) => !BLANK_RE.test(line))) {
		lines.push(
			layout?.separator ?? '---',
			...(layout?.spacer ?? ['']),
			layout?.heading ?? '## Archive',
			...(layout?.headLines ?? ['']),
		);
		pushItems(lines, board.archive);
		lines.push(...(layout?.gapLines ?? ['']));
	} else if (layout && layout.gapLines.length > 0 && lines.at(-1) !== '') {
		// The dropped archive ended the file: keep its final newline
		lines.push('');
	}

	const block = board.settingsBlock;
	if (block && JSON.stringify(board.settings) === block.snapshot) {
		return [...lines, ...block.lines, ...block.trailLines].join(eol);
	}
	return lines.join(eol) + serializeSettings(board.settings).replace(/\n/g, eol);
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

/**
 * Card text is one line: a card is one `- [ ]` line in the file, so a newline
 * would write a bare line the parser does not read back as part of the card.
 */
function toCardText(text: string): string {
	return text.replace(NEWLINE_RE, ' ');
}

/** Adds a new item to the end of a lane. Newlines in `text` become spaces. */
export function addItem(board: KanbanBoard, laneId: string, text: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? { ...lane, items: [...lane.items, { id: generateKanbanId(), text: toCardText(text), checked: false }] }
				: lane,
		),
	};
}

/**
 * Takes the card at `index` out of `items`. With `carry`, its leading indented
 * raw lines (its continuation) go with it. Its other raw lines stay where they
 * were: appended to the card before it, or to `headLines` (undefined reads as
 * one blank line). So the cards after it still follow those lines.
 */
function takeItem(
	items: KanbanItem[],
	index: number,
	headLines: string[] | undefined,
	carry: boolean,
): { items: KanbanItem[]; headLines: string[] | undefined; item: KanbanItem } {
	const rest = [...items];
	const [taken] = rest.splice(index, 1);
	const raw = taken.extraLines ?? [];
	let carried = 0;
	if (carry) while (carried < raw.length && CONTINUATION_RE.test(raw[carried])) carried++;
	const left = raw.slice(carried);
	if (left.length === 0) return { items: rest, headLines, item: taken };
	const item = { ...taken, extraLines: raw.slice(0, carried) };
	if (index > 0) {
		const prev = rest[index - 1];
		rest[index - 1] = { ...prev, extraLines: [...(prev.extraLines ?? []), ...left] };
		return { items: rest, headLines, item };
	}
	return { items: rest, headLines: [...(headLines ?? ['']), ...left], item };
}

/** takeItem on a lane: the lane without the card, and the card */
function takeFromLane(lane: KanbanLane, index: number): { lane: KanbanLane; item: KanbanItem } {
	const taken = takeItem(lane.items, index, lane.headLines, true);
	return { lane: { ...lane, items: taken.items, headLines: taken.headLines }, item: taken.item };
}

/**
 * Removes an item from a lane. The raw lines that followed the card stay in
 * place: they move to the previous card, or to the lane head.
 */
export function removeItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) => {
			if (lane.id !== laneId) return lane;
			const index = lane.items.findIndex((item) => item.id === itemId);
			if (index < 0) return lane;
			const taken = takeItem(lane.items, index, lane.headLines, false);
			return { ...lane, items: taken.items, headLines: taken.headLines };
		}),
	};
}

/** Updates an item's text. Newlines in `text` become spaces. */
export function updateItem(board: KanbanBoard, laneId: string, itemId: string, text: string): KanbanBoard {
	return {
		...board,
		lanes: board.lanes.map((lane) =>
			lane.id === laneId
				? {
						...lane,
						items: lane.items.map((item) =>
							item.id === itemId ? { ...item, text: toCardText(text) } : item,
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
 * Only the card's indented continuation lines move with it (see takeItem).
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
	const sourceIndex = sourceLane.items.findIndex((i) => i.id === itemId);
	if (sourceIndex < 0) return board;
	// Guard the target lane too: the cross-lane branch removes the item from
	// the source lane unconditionally, so a missing target would delete the card.
	if (fromLaneId !== toLaneId && !board.lanes.some((l) => l.id === toLaneId)) return board;

	const taken = takeFromLane(sourceLane, sourceIndex);
	// Apply autoCheck if moving between lanes
	const item = autoCheck && fromLaneId !== toLaneId
		? { ...taken.item, checked: true }
		: taken.item;

	if (fromLaneId === toLaneId) {
		// Reorder within the same lane
		const items = [...taken.lane.items];
		const clampedIndex = clamp(toIndex, 0, items.length);
		items.splice(clampedIndex, 0, item);
		return {
			...board,
			lanes: board.lanes.map((lane) =>
				lane.id === fromLaneId ? { ...taken.lane, items } : lane,
			),
		};
	}

	// Move between different lanes
	return {
		...board,
		lanes: board.lanes.map((lane) => {
			if (lane.id === fromLaneId) return taken.lane;
			if (lane.id === toLaneId) {
				const items = [...lane.items];
				const clampedIndex = clamp(toIndex, 0, items.length);
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

/** Moves an item to the archive. Only its indented continuation lines go with it. */
export function archiveItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard {
	const sourceLane = board.lanes.find((l) => l.id === laneId);
	if (!sourceLane) return board;
	const index = sourceLane.items.findIndex((i) => i.id === itemId);
	if (index < 0) return board;
	const taken = takeFromLane(sourceLane, index);

	return {
		...board,
		lanes: board.lanes.map((lane) => (lane.id === laneId ? taken.lane : lane)),
		archive: [...board.archive, { ...taken.item, checked: true }],
	};
}

/** Archives all checked items in a lane. Only their indented continuation lines go with them. */
export function archiveCompletedItems(board: KanbanBoard, laneId: string): KanbanBoard {
	const sourceLane = board.lanes.find((l) => l.id === laneId);
	if (!sourceLane) return board;
	if (!sourceLane.items.some((i) => i.checked)) return board;

	// Last to first, so a card's left-behind lines can pass up through an earlier checked card
	let lane = sourceLane;
	const completed: KanbanItem[] = [];
	for (let i = lane.items.length - 1; i >= 0; i--) {
		if (!lane.items[i].checked) continue;
		const taken = takeFromLane(lane, i);
		lane = taken.lane;
		completed.unshift(taken.item);
	}

	return {
		...board,
		lanes: board.lanes.map((l) => (l.id === laneId ? lane : l)),
		archive: [...board.archive, ...completed],
	};
}

/**
 * Restores an item from the archive to a lane. Only its indented continuation
 * lines go with it; its other raw lines (`## ` lines included) stay in the archive.
 */
export function restoreItem(board: KanbanBoard, itemId: string, toLaneId: string): KanbanBoard {
	const index = board.archive.findIndex((i) => i.id === itemId);
	if (index < 0) return board;
	const layout = board.archiveLayout;
	const taken = takeItem(board.archive, index, layout?.headLines, true);
	const archiveLayout = taken.headLines === layout?.headLines
		? layout
		: {
				separator: '---',
				spacer: [''],
				heading: '## Archive',
				gapLines: [''],
				...layout,
				headLines: taken.headLines ?? [''],
			};

	return {
		...board,
		archive: taken.items,
		archiveLayout,
		lanes: board.lanes.map((lane) =>
			lane.id === toLaneId
				? { ...lane, items: [...lane.items, { ...taken.item, checked: false }] }
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

/** Tailwind classes for one proximity tone, built on theme tokens so they follow light and dark themes. */
export interface ProximityClasses {
	/** Classes for the date badge (background and text) */
	badge: string;
	/** Classes for the card's left border; empty when the tone has no border */
	border: string;
}

/** The single proximity style map shared by the board card, date picker, list and table views. */
export const PROXIMITY_CLASSES: Record<DateProximity, ProximityClasses> = {
	overdue: { badge: 'bg-destructive/15 text-destructive', border: 'border-l-4 border-l-destructive' },
	today: { badge: 'bg-warning/15 text-warning', border: 'border-l-4 border-l-warning' },
	tomorrow: { badge: 'bg-type-orange/15 text-type-orange', border: 'border-l-4 border-l-type-orange' },
	upcoming: { badge: 'bg-type-blue/15 text-type-blue', border: 'border-l-4 border-l-type-blue' },
	future: { badge: 'bg-muted text-muted-foreground', border: '' },
	none: { badge: 'bg-muted text-muted-foreground', border: '' },
};

/**
 * Proximity tone for a card: a checked (done) card shows no tone, so a completed
 * overdue card does not keep the overdue border and badge. Dates are YYYY-MM-DD.
 */
export function cardProximity(dateStr: string | null, todayStr: string, checked: boolean): DateProximity {
	if (checked) return 'none';
	return getDateProximity(dateStr, todayStr);
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

/**
 * Whether manual drag-reordering of cards is valid for the current view.
 *
 * Drop positions are computed from the rendered (filtered + sorted) cards, but
 * moveItem splices into the lane's full, stored item list. That mapping is only
 * 1:1 when the rendered order equals the stored order: manual sort mode AND no
 * active filter. When the board is sorted or filtered, the rendered cards are a
 * reordered/subset view, so a drop index among them would misplace and persist
 * cards. Callers disable item dragging when this returns false.
 */
export function canReorderItems(sortMode: KanbanSortMode, filterQuery: string): boolean {
	return sortMode === 'manual' && filterQuery.trim() === '';
}

// ── View mode ───────────────────────────────────────────────────────

/** Sets the board view mode */
export function setViewMode(board: KanbanBoard, mode: KanbanViewMode): KanbanBoard {
	return { ...board, settings: { ...board.settings, viewMode: mode } };
}
