import { formatDateWithOffset } from '#lib/utils/date.js';
import type { PriorityEmoji } from '#lib/utils/task-tokens.js';
import type { TaskPriority } from './task-metadata.types';

/** The row menu's Due presets. */
export type DuePreset = 'today' | 'tomorrow' | 'week';

const PRESET_OFFSET_DAYS: Record<DuePreset, number> = { today: 0, tomorrow: 1, week: 7 };

/**
 * The `YYYY-MM-DD` due date a Due preset sets: today, tomorrow, or today + 7
 * days. `today` is the view's `YYYY-MM-DD` today, so the clock is read there.
 */
export function resolveDuePreset(preset: DuePreset, today: string): string {
	return formatDateWithOffset(today, 'YYYY-MM-DD', 'YYYY-MM-DD', PRESET_OFFSET_DAYS[preset]);
}

/**
 * The signifier of each priority level, as the Rust parser reads them
 * (`PRIORITY_EMOJIS`). `none` has none: it is the absence of one.
 */
export const PRIORITY_SIGNIFIERS: Record<Exclude<TaskPriority, 'none'>, PriorityEmoji> = {
	highest: '🔺',
	high: '⏫',
	medium: '🔼',
	low: '🔽',
	lowest: '⏬',
};

/** The signifier `setPriorityToken` writes for `priority`; null for `none`, which removes it. */
export function prioritySignifier(priority: TaskPriority): PriorityEmoji | null {
	return priority === 'none' ? null : PRIORITY_SIGNIFIERS[priority];
}

/** A priority's row menu label and toast word: the level, capitalized (`None` for none). */
export function priorityMenuLabel(priority: TaskPriority): string {
	return priority.charAt(0).toUpperCase() + priority.slice(1);
}
