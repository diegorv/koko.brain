import type { TaskStatus } from './task-metadata.types';

/**
 * Every task status in the Tasks view's order, open statuses first. Lists
 * and menus that name the statuses follow it.
 */
export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in-progress', 'question', 'important', 'forwarded', 'done', 'cancelled'];

/**
 * Whether a task in `status` is open: done and cancelled are closed, every
 * other status is open. Reads the status only; Rust's `checked` is true for
 * every status but todo, so it cannot tell an open `[/]` from a done `[x]`.
 */
export function isTaskOpen(status: TaskStatus): boolean {
	return status !== 'done' && status !== 'cancelled';
}

/**
 * The status a Tasks-list click writes for a task now in `status`: a closed
 * task reopens to `todo`, an open one completes to `done`.
 */
export function toggleTarget(status: TaskStatus): TaskStatus {
	return isTaskOpen(status) ? 'done' : 'todo';
}

/** Lucide icon name of a status glyph; the view maps each to its component. */
export type StatusGlyphIcon =
	| 'circle'
	| 'circle-dot'
	| 'circle-check-big'
	| 'circle-minus'
	| 'circle-question-mark'
	| 'circle-alert'
	| 'circle-arrow-right';

/** How the Tasks view draws and names a status */
export interface StatusGlyph {
	/** Lucide icon name */
	icon: StatusGlyphIcon;
	/** The status in words, as the circle's title and the end of its accessible name */
	word: string;
	/** The circle's one color class, kept whole so Tailwind emits it */
	tone: string;
}

const STATUS_GLYPHS: Record<TaskStatus, StatusGlyph> = {
	todo: { icon: 'circle', word: 'todo', tone: 'text-muted-foreground' },
	'in-progress': { icon: 'circle-dot', word: 'in progress', tone: 'text-primary' },
	question: { icon: 'circle-question-mark', word: 'question', tone: 'text-warning' },
	important: { icon: 'circle-alert', word: 'important', tone: 'text-destructive' },
	forwarded: { icon: 'circle-arrow-right', word: 'forwarded', tone: 'text-muted-foreground' },
	done: { icon: 'circle-check-big', word: 'done', tone: 'text-success' },
	cancelled: { icon: 'circle-minus', word: 'cancelled', tone: 'text-muted-foreground' },
};

/** The glyph the Tasks view draws for `status`. */
export function statusGlyph(status: TaskStatus): StatusGlyph {
	return STATUS_GLYPHS[status];
}
