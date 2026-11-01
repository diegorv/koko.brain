/**
 * When the view lens's Sort and Filter toolbar state is (re-)seeded from the
 * `.view` YAML. The query REPLACES the parsed filters with the toolbar state,
 * so a stale seed shows the wrong notes and a seed that is never redone stays
 * wrong.
 */
export interface ViewSeedState {
	/** The `.view` the toolbar state was seeded from, or null when it holds no seed */
	seededPath: string | null;
	/** The content hash of that `.view` when it was seeded or last adopted */
	seededHash: string | undefined;
	/**
	 * The view our own save is writing: its next load adopts the new hash instead
	 * of re-seeding. Scoped to a path so a view the lens moves to mid-save never
	 * consumes another view's latch (b48787e4).
	 */
	selfUpdatePath: string | null;
}

/** What happened to the view lens */
export type ViewSeedEvent =
	/** The `.view` at `path` parsed, with this content hash */
	| { kind: 'loaded'; path: string; hash: string | undefined }
	/** The `.view` failed to parse, or its read rejected */
	| { kind: 'load-failed' }
	/** The lens is not a view lens */
	| { kind: 'no-view' }
	/** Our own save of the toolbar state to `path` started */
	| { kind: 'save-started'; path: string }
	/** That save failed */
	| { kind: 'save-failed' };

/** No seed and no save in flight */
export const INITIAL_VIEW_SEED: ViewSeedState = { seededPath: null, seededHash: undefined, selfUpdatePath: null };

/**
 * Advances the seed state by one event and says whether the toolbar state must
 * be re-seeded from the parsed `.view` now (only ever true on `loaded`).
 */
export function stepViewSeed(prev: ViewSeedState, event: ViewSeedEvent): { next: ViewSeedState; reseed: boolean } {
	switch (event.kind) {
		case 'loaded': {
			const own = prev.selfUpdatePath === event.path;
			const reseed = !own && (prev.seededPath !== event.path || prev.seededHash !== event.hash);
			const selfUpdatePath = own || reseed ? null : prev.selfUpdatePath;
			return { next: { seededPath: event.path, seededHash: event.hash, selfUpdatePath }, reseed };
		}
		case 'load-failed':
		case 'no-view':
			return { next: { ...prev, seededPath: null, seededHash: undefined }, reseed: false };
		case 'save-started':
			return { next: { ...prev, selfUpdatePath: event.path }, reseed: false };
		case 'save-failed':
			return { next: { ...prev, selfUpdatePath: null, seededHash: undefined }, reseed: false };
	}
}
