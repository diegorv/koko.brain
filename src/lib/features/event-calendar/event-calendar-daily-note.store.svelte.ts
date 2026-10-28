/**
 * Bridge from the Calendar to whatever opens a day's daily note.
 *
 * `features/` must not import `plugins/`, so the periodic-notes plugin
 * registers its opener here and the day headers render their daily note
 * action only while one is registered.
 */

/** Opens or creates the daily note of a `YYYY-MM-DD` day key. */
export type DailyNoteOpener = (day: string) => Promise<void>;

/** The registered opener, or null when no plugin provides one. */
let opener = $state.raw<DailyNoteOpener | null>(null);

export const eventCalendarDailyNoteStore = {
	/** Whether an opener is registered, i.e. whether the daily note action is shown. */
	get available(): boolean {
		return opener !== null;
	},

	/**
	 * Registers `next` as the opener, replacing any previous one. The returned
	 * function unregisters it, and is a no-op once a later registration replaced it.
	 */
	register(next: DailyNoteOpener): () => void {
		opener = next;
		return () => {
			if (opener === next) opener = null;
		};
	},

	/** Opens the daily note of `day`; rejects when no opener is registered or the opener fails. */
	open(day: string): Promise<void> {
		if (!opener) return Promise.reject(new Error('No daily note opener is registered'));
		return opener(day);
	},
};
