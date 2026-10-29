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

/**
 * Opens still in flight, by day. Every Calendar view and remount shares this
 * map, so a second open of a day whose note does not exist yet joins the first
 * instead of racing its `create_note` into "File already exists".
 */
const inFlight = new Map<string, Promise<void>>();

export const eventCalendarDailyNoteStore = {
	/** Whether an opener is registered, i.e. whether the daily note action is shown. */
	get available(): boolean {
		return opener !== null;
	},

	/**
	 * Registers `next` as the opener, replacing any previous one. The returned
	 * function unregisters it, and is a no-op once a later registration replaced it.
	 * A replacement without an unregister is a re-init of the same vault, so its
	 * opens in flight stay joinable. The unregister runs on vault teardown and
	 * forgets them: they belong to the closed vault.
	 */
	register(next: DailyNoteOpener): () => void {
		opener = next;
		return () => {
			if (opener !== next) return;
			opener = null;
			inFlight.clear();
		};
	},

	/**
	 * Opens the daily note of `day`; rejects when no opener is registered or the
	 * opener fails. While an open of `day` is in flight, returns that same promise.
	 */
	open(day: string): Promise<void> {
		if (!opener) return Promise.reject(new Error('No daily note opener is registered'));
		const pending = inFlight.get(day);
		if (pending) return pending;
		const opening: Promise<void> = opener(day).finally(() => {
			if (inFlight.get(day) === opening) inFlight.delete(day);
		});
		inFlight.set(day, opening);
		return opening;
	},
};
