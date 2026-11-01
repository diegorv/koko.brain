import type { RailLensProvider, RailNavigator, RailTodaySection } from './rail-shell.types';

/**
 * The rail shell's registration point. `features/` may not import `plugins/`
 * (ADR 0003), so plugin-owned parts (the Calendar navigator, the Day lens,
 * Today's My people) register here at vault open and unregister at teardown.
 */

/** Navigators registered by plugins, in registration order */
let navigators = $state<RailNavigator[]>([]);
/** Lens providers registered by plugins, one per kind */
let lensProviders = $state<RailLensProvider[]>([]);
/** Today sections registered by plugins, in registration order */
let todaySections = $state<RailTodaySection[]>([]);

export const railRegistryStore = {
	/** Registered navigators */
	get navigators() {
		return navigators;
	},
	/** Registered lens providers */
	get lensProviders() {
		return lensProviders;
	},
	/** Registered Today sections */
	get todaySections() {
		return todaySections;
	},

	/** Adds a navigator, replacing one with the same id. Returns its unregister function. */
	registerNavigator(entry: RailNavigator): () => void {
		navigators = [...navigators.filter((n) => n.id !== entry.id), entry];
		return () => {
			navigators = navigators.filter((n) => n !== entry);
		};
	},

	/** Adds a lens provider, replacing one for the same kind. Returns its unregister function. */
	registerLensProvider(entry: RailLensProvider): () => void {
		lensProviders = [...lensProviders.filter((p) => p.kind !== entry.kind), entry];
		return () => {
			lensProviders = lensProviders.filter((p) => p !== entry);
		};
	},

	/** Adds a Today section, replacing one with the same id. Returns its unregister function. */
	registerTodaySection(entry: RailTodaySection): () => void {
		todaySections = [...todaySections.filter((s) => s.id !== entry.id), entry];
		return () => {
			todaySections = todaySections.filter((s) => s !== entry);
		};
	},

	/** Drops every registration */
	reset() {
		navigators = [];
		lensProviders = [];
		todaySections = [];
	},
};
