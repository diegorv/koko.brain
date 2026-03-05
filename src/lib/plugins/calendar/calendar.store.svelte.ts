import { toDateKey } from './calendar.logic';

/** Year being displayed */
let currentYear = $state<number>(new Date().getFullYear());
/** Month being displayed (0-11) */
let currentMonth = $state<number>(new Date().getMonth());
/** DateKey of the selected day, or null */
let selectedDateKey = $state<string | null>(toDateKey(new Date()));
/** Map of dateKey → array of full file paths for files associated with that date */
let dayPaths = $state<Map<string, string[]>>(new Map());

// Derived state implemented as getters for vitest compatibility

/** Reactive store for the calendar panel state */
export const calendarStore = {
	get currentYear() { return currentYear; },
	get currentMonth() { return currentMonth; },
	get selectedDateKey() { return selectedDateKey; },
	get dayPaths() { return dayPaths; },
	/** Map of dateKey → file count for days that have at least one file */
	get dayFileCounts() { return new Map([...dayPaths.entries()].map(([k, v]) => [k, v.length])); },
	/** File list for the selected date */
	get selectedDateFiles() { return selectedDateKey ? (dayPaths.get(selectedDateKey) ?? []) : []; },

	/** Advances to the next month */
	nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear++;
		} else {
			currentMonth++;
		}
	},

	/** Goes back to the previous month */
	prevMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear--;
		} else {
			currentMonth--;
		}
	},

	/** Advances to the next year */
	nextYear() { currentYear++; },

	/** Goes back to the previous year */
	prevYear() { currentYear--; },

	/** Navigates to the current month and selects today */
	goToToday() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
		selectedDateKey = toDateKey(now);
	},

	/** Sets the selected day */
	setSelectedDateKey(key: string | null) { selectedDateKey = key; },

	/** Updates the map of days with files */
	setDayPaths(paths: Map<string, string[]>) { dayPaths = paths; },

	/** Moves a file from one date key to another in the calendar map */
	updateFileDate(filePath: string, oldKey: string | null, newKey: string | null) {
		const next = new Map(dayPaths);
		if (oldKey) {
			const old = next.get(oldKey);
			if (old) {
				const filtered = old.filter((p) => p !== filePath);
				if (filtered.length > 0) {
					next.set(oldKey, filtered);
				} else {
					next.delete(oldKey);
				}
			}
		}
		if (newKey) {
			const existing = next.get(newKey);
			if (existing) {
				if (!existing.includes(filePath)) {
					next.set(newKey, [...existing, filePath]);
				}
			} else {
				next.set(newKey, [filePath]);
			}
		}
		dayPaths = next;
	},

	/** Resets all state to defaults */
	reset() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
		selectedDateKey = toDateKey(now);
		dayPaths = new Map();
	},
};
