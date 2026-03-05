import type { TaskMetadata, TaskPriority, TaskStatus, RecurrenceRule } from './task-metadata.types';

/**
 * Date signifier patterns: emoji followed by a YYYY-MM-DD date.
 * Supports optional variation selector (U+FE0F) after each emoji.
 */
const DATE_PATTERNS: { emoji: string; field: keyof TaskMetadata }[] = [
	{ emoji: '\u{1F4C5}', field: 'dueDate' }, // 📅
	{ emoji: '\u{23F3}', field: 'scheduledDate' }, // ⏳
	{ emoji: '\u{1F6EB}', field: 'startDate' }, // 🛫
	{ emoji: '\u{2795}', field: 'createdDate' }, // ➕
	{ emoji: '\u{2705}', field: 'doneDate' }, // ✅
	{ emoji: '\u{274C}', field: 'cancelledDate' }, // ❌
];

/**
 * Priority signifier patterns: emoji maps to a priority level.
 * Order matters for regex building (longest match first not needed here, all single emoji).
 */
const PRIORITY_PATTERNS: { emoji: string; priority: TaskPriority }[] = [
	{ emoji: '\u{1F53A}', priority: 'highest' }, // 🔺
	{ emoji: '\u{23EB}', priority: 'high' }, // ⏫
	{ emoji: '\u{1F53C}', priority: 'medium' }, // 🔼
	{ emoji: '\u{1F53D}', priority: 'low' }, // 🔽
	{ emoji: '\u{23EC}', priority: 'lowest' }, // ⏬
];

/** Builds a regex that matches an emoji (with optional variation selector) */
function emojiRe(emoji: string): string {
	return `${emoji}\uFE0F?`;
}

/** Regex for date signifiers: emoji + optional space + YYYY-MM-DD */
function buildDateRegex(emoji: string): RegExp {
	return new RegExp(`${emojiRe(emoji)}\\s*(\\d{4}-\\d{2}-\\d{2})`);
}

/** Regex for priority signifiers (just the emoji, no value after it) */
function buildPriorityRegex(emoji: string): RegExp {
	return new RegExp(emojiRe(emoji));
}

/**
 * Builds the recurrence regex fresh each call to avoid lastIndex state issues.
 * Matches 🔁 followed by text until the next signifier or end of string.
 */
function buildRecurrenceRegex(): RegExp {
	return new RegExp(
		`${emojiRe('\u{1F501}')}\\s*(.+?)(?=\\s*(?:${[...DATE_PATTERNS.map((d) => emojiRe(d.emoji)), ...PRIORITY_PATTERNS.map((p) => emojiRe(p.emoji)), emojiRe('\u{1F194}'), emojiRe('\u{26D4}'), emojiRe('\u{1F3C1}'), '#\\w'].join('|')})|$)`,
	);
}

/** Regex for ID signifier: 🆔 followed by an identifier */
function buildIdRegex(): RegExp {
	return new RegExp(`${emojiRe('\u{1F194}')}\\s*(\\S+)`);
}

/** Regex for dependsOn signifier: ⛔ followed by comma-separated IDs */
function buildDependsOnRegex(): RegExp {
	return new RegExp(`${emojiRe('\u{26D4}')}\\s*(\\S+(?:\\s*,\\s*\\S+)*)`);
}

/** Regex for onCompletion signifier: 🏁 followed by text */
function buildOnCompletionRegex(): RegExp {
	return new RegExp(`${emojiRe('\u{1F3C1}')}\\s*(\\S+)`);
}

/** Regex for tags: # followed by word characters (but not inside signifiers) */
const TAG_RE = /#([\w][\w-]*)/g;

/**
 * Parses emoji signifiers from a task's raw text and extracts structured metadata.
 *
 * Supports the following signifiers:
 * - 📅 YYYY-MM-DD (due date)
 * - ⏳ YYYY-MM-DD (scheduled date)
 * - 🛫 YYYY-MM-DD (start date)
 * - ➕ YYYY-MM-DD (created date)
 * - ✅ YYYY-MM-DD (done date)
 * - ❌ YYYY-MM-DD (cancelled date)
 * - 🔺 (highest priority), ⏫ (high), 🔼 (medium), 🔽 (low), ⏬ (lowest)
 * - 🔁 text (recurrence rule)
 * - 🆔 id (task ID)
 * - ⛔ id1,id2 (depends on)
 * - 🏁 action (on completion)
 * - #tag (tags)
 *
 * @param rawText - The task text without the `- [ ] ` prefix
 * @returns Parsed metadata with clean description
 */
export function parseTaskMetadata(rawText: string): TaskMetadata {
	let text = rawText;
	const metadata: TaskMetadata = {
		description: '',
		tags: [],
	};

	// Extract date signifiers
	for (const { emoji, field } of DATE_PATTERNS) {
		const re = buildDateRegex(emoji);
		const match = re.exec(text);
		if (match) {
			(metadata as unknown as Record<string, unknown>)[field] = match[1];
			text = text.replace(match[0], '');
		}
	}

	// Extract priority signifiers (first match wins)
	for (const { emoji, priority } of PRIORITY_PATTERNS) {
		const re = buildPriorityRegex(emoji);
		const match = re.exec(text);
		if (match) {
			metadata.priority = priority;
			text = text.replace(match[0], '');
			break;
		}
	}

	// Extract recurrence
	const recurrenceMatch = buildRecurrenceRegex().exec(text);
	if (recurrenceMatch) {
		metadata.recurrence = { text: recurrenceMatch[1].trim() };
		text = text.replace(recurrenceMatch[0], '');
	}

	// Extract ID
	const idMatch = buildIdRegex().exec(text);
	if (idMatch) {
		metadata.id = idMatch[1];
		text = text.replace(idMatch[0], '');
	}

	// Extract dependsOn
	const depsMatch = buildDependsOnRegex().exec(text);
	if (depsMatch) {
		metadata.dependsOn = depsMatch[1].split(',').map((s) => s.trim());
		text = text.replace(depsMatch[0], '');
	}

	// Extract onCompletion
	const completionMatch = buildOnCompletionRegex().exec(text);
	if (completionMatch) {
		metadata.onCompletion = completionMatch[1];
		text = text.replace(completionMatch[0], '');
	}

	// Extract tags from cleaned text (after stripping signifiers)
	const cleanedForTags = text.trim();
	let tagMatch;
	const tagRe = new RegExp(TAG_RE.source, 'g');
	while ((tagMatch = tagRe.exec(cleanedForTags)) !== null) {
		metadata.tags.push(tagMatch[1]);
	}

	// Remove tags from description
	text = text.replace(TAG_RE, '');

	// Clean up: collapse multiple spaces and trim
	metadata.description = text.replace(/\s{2,}/g, ' ').trim();

	return metadata;
}

/**
 * Serializes TaskMetadata back into a text string with emoji signifiers.
 * Useful for round-trip testing and potential future editing.
 */
export function serializeTaskMetadata(metadata: TaskMetadata): string {
	const parts: string[] = [metadata.description];

	// Priority
	if (metadata.priority) {
		const priorityEmoji = PRIORITY_PATTERNS.find((p) => p.priority === metadata.priority);
		if (priorityEmoji) parts.push(priorityEmoji.emoji);
	}

	// Dates
	for (const { emoji, field } of DATE_PATTERNS) {
		const value = metadata[field as keyof TaskMetadata];
		if (typeof value === 'string' && value) {
			parts.push(`${emoji} ${value}`);
		}
	}

	// Recurrence
	if (metadata.recurrence) {
		parts.push(`\u{1F501} ${metadata.recurrence.text}`);
	}

	// ID
	if (metadata.id) {
		parts.push(`\u{1F194} ${metadata.id}`);
	}

	// DependsOn
	if (metadata.dependsOn && metadata.dependsOn.length > 0) {
		parts.push(`\u{26D4} ${metadata.dependsOn.join(',')}`);
	}

	// OnCompletion
	if (metadata.onCompletion) {
		parts.push(`\u{1F3C1} ${metadata.onCompletion}`);
	}

	// Tags
	for (const tag of metadata.tags) {
		parts.push(`#${tag}`);
	}

	return parts.filter(Boolean).join(' ');
}

/**
 * Maps a checkbox character to a TaskStatus.
 * Supports standard and extended checkbox chars from the Tasks plugin.
 */
export function mapCheckboxChar(char: string): TaskStatus {
	switch (char) {
		case ' ':
			return 'todo';
		case 'x':
		case 'X':
			return 'done';
		case '-':
			return 'cancelled';
		case '/':
			return 'in-progress';
		case '?':
			return 'question';
		case '>':
			return 'forwarded';
		case '!':
			return 'important';
		default:
			return 'todo';
	}
}

/**
 * Maps a TaskStatus back to a checkbox character.
 * Inverse of mapCheckboxChar.
 */
export function statusToCheckboxChar(status: TaskStatus): string {
	switch (status) {
		case 'todo':
			return ' ';
		case 'done':
			return 'x';
		case 'cancelled':
			return '-';
		case 'in-progress':
			return '/';
		case 'question':
			return '?';
		case 'forwarded':
			return '>';
		case 'important':
			return '!';
		default:
			return ' ';
	}
}

/**
 * Checks if a task is overdue based on its due date.
 * @param dueDate - Due date string in YYYY-MM-DD format
 * @param now - Current time in ms (injectable for testing)
 */
export function isOverdue(dueDate: string, now?: number): boolean {
	const due = new Date(dueDate + 'T23:59:59');
	const current = now ? new Date(now) : new Date();
	return current > due;
}

/**
 * Checks if a task is due today.
 * @param dueDate - Due date string in YYYY-MM-DD format
 * @param now - Current time in ms (injectable for testing)
 */
export function isDueToday(dueDate: string, now?: number): boolean {
	const current = now ? new Date(now) : new Date();
	const todayStr =
		current.getFullYear() +
		'-' +
		String(current.getMonth() + 1).padStart(2, '0') +
		'-' +
		String(current.getDate()).padStart(2, '0');
	return dueDate === todayStr;
}

/** Formats a Date to YYYY-MM-DD string */
function toDateString(d: Date): string {
	return (
		d.getFullYear() +
		'-' +
		String(d.getMonth() + 1).padStart(2, '0') +
		'-' +
		String(d.getDate()).padStart(2, '0')
	);
}

/**
 * Checks if a task is due within the next N days.
 * Uses date-string comparison to avoid time-of-day boundary issues.
 * @param dueDate - Due date string in YYYY-MM-DD format
 * @param days - Number of days to look ahead (default: 3)
 * @param now - Current time in ms (injectable for testing)
 */
export function isDueSoon(dueDate: string, days = 3, now?: number): boolean {
	const current = now ? new Date(now) : new Date();
	const todayStr = toDateString(current);
	const cutoff = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
	const cutoffStr = toDateString(cutoff);
	return dueDate > todayStr && dueDate <= cutoffStr;
}
