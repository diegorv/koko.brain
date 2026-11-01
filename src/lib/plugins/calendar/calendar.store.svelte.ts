/** Year being displayed */
let currentYear = $state<number>(new Date().getFullYear());
/** Month being displayed (0-11) */
let currentMonth = $state<number>(new Date().getMonth());

/** Reactive store for the calendar panel state */
export const calendarStore = {
	get currentYear() { return currentYear; },
	get currentMonth() { return currentMonth; },

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

	/** Resets all state to defaults */
	reset() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
	},
};
