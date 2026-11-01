/** Year being displayed */
let currentYear = $state<number>(new Date().getFullYear());
/** Month being displayed (0-11) */
let currentMonth = $state<number>(new Date().getMonth());
/** Map of dateKey → array of full file paths for files associated with that date */
let dayPaths = $state<Map<string, string[]>>(new Map());

/** Reactive store for the calendar panel state */
export const calendarStore = {
	get currentYear() { return currentYear; },
	get currentMonth() { return currentMonth; },
	get dayPaths() { return dayPaths; },

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

	/** Shows the given month (0-11) */
	showMonth(year: number, month: number) {
		currentYear = year;
		currentMonth = month;
	},

	/** Navigates to the current month */
	goToToday() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
	},

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
		dayPaths = new Map();
	},
};
