import { parse as parseYaml } from 'yaml';

/** Visual styles for the button */
export type ButtonStyle = 'default' | 'primary' | 'destructive' | 'plain';

/** Action: update a frontmatter property */
export interface UpdateMetadataAction {
	type: 'updateMetadata';
	/** The frontmatter property key to update */
	bindTarget: string;
	/** The value to set */
	value: string;
}

/** Action: open a note or URL */
export interface OpenAction {
	type: 'open';
	/** A [[wikilink]] or https:// URL */
	link: string;
	/** Whether to open in a new tab */
	newTab?: boolean;
}

/** Action: create a new note */
export interface CreateNoteAction {
	type: 'createNote';
	/** The file name for the new note (without .md extension) */
	fileName: string;
	/** The folder path relative to vault root */
	folderPath?: string;
	/** Whether to open the note after creation */
	openNote?: boolean;
}

/** Discriminated union of all supported button actions */
export type ButtonAction = UpdateMetadataAction | OpenAction | CreateNoteAction;

/** Complete configuration for a meta-bind button */
export interface ButtonConfig {
	/** The button label text */
	label: string;
	/** The visual style variant */
	style: ButtonStyle;
	/** Optional tooltip text */
	tooltip?: string;
	/** Optional ID for inline button references (v3) */
	id?: string;
	/** Whether the code block is hidden (v3: inline only) */
	hidden?: boolean;
	/** A single action (mutually exclusive with actions) */
	action?: ButtonAction;
	/** Multiple actions executed in sequence (mutually exclusive with action) */
	actions?: ButtonAction[];
}

const VALID_STYLES: ReadonlySet<string> = new Set(['default', 'primary', 'destructive', 'plain']);
const VALID_ACTION_TYPES: ReadonlySet<string> = new Set(['updateMetadata', 'open', 'createNote']);

/**
 * Validates whether a single action object has the required fields for its type.
 * Returns true if the action is valid.
 */
function isValidAction(action: unknown): action is ButtonAction {
	if (typeof action !== 'object' || action === null) return false;
	const a = action as Record<string, unknown>;
	if (typeof a.type !== 'string' || !VALID_ACTION_TYPES.has(a.type)) return false;

	switch (a.type) {
		case 'updateMetadata': {
			// Accept both `bindTarget` and `prop` as the property key
			const target = a.bindTarget ?? a.prop;
			return typeof target === 'string' && target.length > 0
				&& typeof a.value === 'string';
		}
		case 'open':
			return typeof a.link === 'string' && a.link.length > 0;
		case 'createNote':
			return typeof a.fileName === 'string' && a.fileName.length > 0;
		default:
			return false;
	}
}

/**
 * Validates whether a raw parsed object has the required fields of a ButtonConfig.
 * Checks label (required), and at least one valid action or actions array.
 */
export function validateButtonConfig(raw: unknown): raw is ButtonConfig {
	if (typeof raw !== 'object' || raw === null) return false;
	const obj = raw as Record<string, unknown>;

	if (typeof obj.label !== 'string' || obj.label.length === 0) return false;

	const hasAction = obj.action !== undefined && isValidAction(obj.action);
	const hasActions = Array.isArray(obj.actions) && obj.actions.length > 0
		&& obj.actions.every(isValidAction);

	return hasAction || hasActions;
}

/**
 * Parses a YAML string into a ButtonConfig.
 * Returns null if the YAML is invalid or missing required fields.
 */
export function parseButtonConfig(yaml: string): ButtonConfig | null {
	let raw: unknown;
	try {
		raw = parseYaml(yaml);
	} catch {
		return null;
	}

	if (!validateButtonConfig(raw)) return null;

	const obj = raw as unknown as Record<string, unknown>;
	const style = typeof obj.style === 'string' && VALID_STYLES.has(obj.style)
		? (obj.style as ButtonStyle)
		: 'default';

	// Normalize `prop` → `bindTarget` in updateMetadata actions
	const normalizeAction = (action: ButtonAction): ButtonAction => {
		if (action.type === 'updateMetadata') {
			const a = action as unknown as Record<string, unknown>;
			const target = (a.bindTarget ?? a.prop) as string;
			return { type: 'updateMetadata', bindTarget: target, value: a.value as string };
		}
		return action;
	};

	const config = { ...raw, style } as ButtonConfig;
	if (config.action) config.action = normalizeAction(config.action);
	if (config.actions) config.actions = config.actions.map(normalizeAction);

	return config;
}

/**
 * Returns the array of actions for a button config.
 * Normalizes single `action` into an array, or returns `actions` directly.
 */
export function getButtonActions(config: ButtonConfig): ButtonAction[] {
	if (Array.isArray(config.actions)) return config.actions;
	if (config.action) return [config.action];
	return [];
}
