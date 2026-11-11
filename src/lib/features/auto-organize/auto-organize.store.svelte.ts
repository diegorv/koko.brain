import type { AutoOrganizeRule, AutoOrganizeConfig } from './auto-organize.types';

/** Internal state */
let rules = $state<AutoOrganizeRule[]>([]);
let excludedFolders = $state<string[]>([]);
let isConfigLoaded = $state(false);

/** Reactive store for auto-organize rules and excluded folders */
export const autoOrganizeStore = {
	/** Ordered list of all rules (first-match wins) */
	get rules() { return rules; },
	/** Folder paths excluded from auto-organize evaluation */
	get excludedFolders() { return excludedFolders; },
	/** Whether the config has been loaded from disk */
	get isConfigLoaded() { return isConfigLoaded; },
	/** Only enabled rules, preserving order */
	get enabledRules(): AutoOrganizeRule[] {
		return rules.filter((r) => r.enabled);
	},

	/** Replaces all state from a loaded config */
	setConfig(config: AutoOrganizeConfig) {
		rules = [...config.rules];
		excludedFolders = [...config.excludedFolders];
		isConfigLoaded = true;
	},

	/** Appends a new rule to the end of the list */
	addRule(rule: AutoOrganizeRule) {
		rules = [...rules, rule];
	},

	/** Merges partial updates into an existing rule by id */
	updateRule(id: string, updates: Partial<AutoOrganizeRule>) {
		rules = rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
	},

	/** Removes a rule by id */
	removeRule(id: string) {
		rules = rules.filter((r) => r.id !== id);
	},

	/** Replaces the entire rules array (for drag reorder) */
	reorderRules(newRules: AutoOrganizeRule[]) {
		rules = [...newRules];
	},

	/** Replaces the excluded folders list */
	setExcludedFolders(folders: string[]) {
		excludedFolders = [...folders];
	},

	/** Resets all state to initial values */
	reset() {
		rules = [];
		excludedFolders = [];
		isConfigLoaded = false;
	},
};
