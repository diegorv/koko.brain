import { parse as parseYaml } from 'yaml';

/** Visual styles for the button */
export type ButtonStyle = 'default' | 'primary' | 'destructive' | 'plain';

/** Action: update a frontmatter property */
export interface UpdateMetadataAction {
	type: 'updateMetadata';
	/** The frontmatter property key to update */
	bindTarget: string;
	/** The value to set, written as typed in the block: `3` a number, `true` a boolean, `"3"` a string */
	value: string | number | boolean;
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

/** Action: open a `.view` the way a click on its row in the menu does */
export interface OpenViewAction {
	type: 'openView';
	/** The vault-relative path of the `.view` file */
	path: string;
}

/** Discriminated union of all supported button actions */
export type ButtonAction = UpdateMetadataAction | OpenAction | CreateNoteAction | OpenViewAction;

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
const VALID_ACTION_TYPES: ReadonlySet<string> = new Set(['updateMetadata', 'open', 'createNote', 'openView']);

/** Whether the `..` segments of a vault-relative path climb above the vault root. */
function leavesVault(path: string): boolean {
	let depth = 0;
	for (const segment of path.split('/')) {
		if (segment === '..') depth--;
		else if (segment !== '' && segment !== '.') depth++;
		if (depth < 0) return true;
	}
	return false;
}

/** Why an `openView` path is refused, or null when it names a `.view` inside the vault. */
function openViewPathError(path: unknown): string | null {
	if (typeof path !== 'string' || !/\.view$/i.test(path)) return 'openView needs a .view path';
	return leavesVault(path) ? 'openView path leaves the vault' : null;
}

/** Why a single action is invalid, or null when it has the required fields for its type. */
function actionError(action: unknown): string | null {
	if (typeof action !== 'object' || action === null) return 'an action is not a map';
	const a = action as Record<string, unknown>;
	if (typeof a.type !== 'string') return 'an action has no type';
	if (!VALID_ACTION_TYPES.has(a.type)) return `unknown action type "${a.type}"`;

	switch (a.type) {
		case 'updateMetadata': {
			// Accept both `bindTarget` and `prop` as the property key
			const target = a.bindTarget ?? a.prop;
			const valid = typeof target === 'string' && target.length > 0
				&& (typeof a.value === 'string' || typeof a.value === 'number' || typeof a.value === 'boolean');
			return valid ? null : 'updateMetadata needs prop and value';
		}
		case 'open':
			return typeof a.link === 'string' && a.link.length > 0 ? null : 'open needs link';
		case 'createNote':
			return typeof a.fileName === 'string' && a.fileName.length > 0 ? null : 'createNote needs fileName';
		case 'openView':
			return openViewPathError(a.path);
		default:
			return `unknown action type "${a.type}"`;
	}
}

/**
 * Why a raw parsed object is not a ButtonConfig, or null when it is one: a
 * label (required), and a valid `action` or a non-empty `actions` array of
 * valid actions.
 */
function configError(raw: unknown): string | null {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'expected a map with label and action';
	const obj = raw as Record<string, unknown>;

	if (typeof obj.label !== 'string' || obj.label.length === 0) return 'label missing';

	const hasActions = Array.isArray(obj.actions) && obj.actions.length > 0;
	if (obj.action === undefined && !hasActions) return 'no action or actions';

	const singleError = obj.action !== undefined ? actionError(obj.action) : null;
	if (obj.action !== undefined && singleError === null) return null;
	if (hasActions) {
		const listError = (obj.actions as unknown[]).map(actionError).find((e) => e !== null) ?? null;
		if (listError === null) return null;
		return singleError ?? listError;
	}
	return singleError;
}

/**
 * Validates whether a raw parsed object has the required fields of a ButtonConfig.
 * Checks label (required), and at least one valid action or actions array.
 */
export function validateButtonConfig(raw: unknown): raw is ButtonConfig {
	return configError(raw) === null;
}

/**
 * Why `parseButtonConfig(yaml)` returns null, as a short reason for the error
 * widget (`label missing`, `updateMetadata needs prop and value`), or null
 * when the block is a valid button.
 */
export function buttonConfigError(yaml: string): string | null {
	let raw: unknown;
	try {
		raw = parseYaml(yaml);
	} catch {
		return 'YAML does not parse';
	}
	return configError(raw);
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
			return { type: 'updateMetadata', bindTarget: target, value: a.value as string | number | boolean };
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
