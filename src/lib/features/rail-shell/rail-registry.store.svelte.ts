import type { RailAction, RailFolderCreator, RailLensProvider, RailNavigator, RailTodaySection } from './rail-shell.types';

/**
 * The rail shell's registration point. `features/` may not import `plugins/`
 * (ADR 0003), so plugin-owned parts (the Calendar navigator, the Day lens,
 * Today's My people, New Kanban Board) register here at vault open and unregister at teardown.
 *
 * The lists are `$state.raw`: entries are only ever replaced, and each unregister finds its
 * entry by identity. A deep `$state` proxy would hand back proxied entries, so `!== entry`
 * would never match and an unregister would leave its entry in place.
 */

/** Navigators registered by plugins, in registration order */
let navigators = $state.raw<RailNavigator[]>([]);
/** Lens providers registered by plugins, one per kind */
let lensProviders = $state.raw<RailLensProvider[]>([]);
/** Today sections registered by plugins, in registration order */
let todaySections = $state.raw<RailTodaySection[]>([]);
/** Folder menu creators registered by plugins, in registration order */
let folderCreators = $state.raw<RailFolderCreator[]>([]);
/** Action buttons registered by plugins, in registration order */
let actions = $state.raw<RailAction[]>([]);

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
	/** Registered folder menu creators */
	get folderCreators() {
		return folderCreators;
	},
	/** Registered action buttons */
	get actions() {
		return actions;
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

	/** Adds a folder menu creator, replacing one with the same id. Returns its unregister function. */
	registerFolderCreator(entry: RailFolderCreator): () => void {
		folderCreators = [...folderCreators.filter((c) => c.id !== entry.id), entry];
		return () => {
			folderCreators = folderCreators.filter((c) => c !== entry);
		};
	},

	/** Adds an action button, replacing one with the same key. Returns its unregister function. */
	registerAction(entry: RailAction): () => void {
		actions = [...actions.filter((a) => a.key !== entry.key), entry];
		return () => {
			actions = actions.filter((a) => a !== entry);
		};
	},

	/** Drops every registration */
	reset() {
		navigators = [];
		lensProviders = [];
		todaySections = [];
		folderCreators = [];
		actions = [];
	},
};
