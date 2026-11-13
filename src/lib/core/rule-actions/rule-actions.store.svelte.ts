/**
 * Actions an Auto Organize rule can run. The mods host registers the mod
 * actions listed in a manifest's `ruleActions`, and Auto Organize looks them
 * up here: features may not import plugins (ADR-0003), so this slot sits in
 * core between them.
 */

/** The note a rule runs an action on */
export interface RuleActionTarget {
	/** Always a note */
	on: 'note';
	/** Vault-relative path of the note, as `run.target.path` gives it to a mod */
	path: string;
}

/** An action a rule can run */
export interface RuleAction {
	/** Globally namespaced id: `mod:<mod>:action:<action>` */
	id: string;
	/** Mod name and action title, shown in Settings */
	label: string;
	/**
	 * Starts the action on the note with the rule's text, `''` when the rule
	 * has none; settles when its run ends
	 */
	run: (target: RuleActionTarget, input: string) => Promise<void>;
	/** Present when the action asks for text, so Settings shows a field for the rule's text */
	input?: {
		/** Hint shown in the empty field */
		placeholder?: string;
	};
}

/** Registered actions; raw state preserves identity for cleanup */
let actions = $state.raw<RuleAction[]>([]);

/** Live registry of the actions a rule can run */
export const ruleActionsStore = {
	/** Every registered action, in registration order */
	get list(): readonly RuleAction[] {
		return actions;
	},

	/** The registered action with `id`, or undefined */
	get(id: string): RuleAction | undefined {
		return actions.find((a) => a.id === id);
	},

	/** Registers an action, replacing one with its id; the cleanup removes only this registration */
	register(action: RuleAction): () => void {
		const entry = { ...action };
		actions = [...actions.filter((a) => a.id !== entry.id), entry];
		return () => {
			actions = actions.filter((a) => a !== entry);
		};
	},

	/** Drops every registration */
	reset() {
		actions = [];
	},
};
