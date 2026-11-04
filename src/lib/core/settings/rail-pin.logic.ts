/**
 * Keys of the rail items pinned with `_rail: true`, saved in
 * `layout.railItem`. They live here, not in the rail shell, so a feature that
 * moves a pin (the type rename) can build the key without importing
 * `features/rail-shell`, which already imports it (ADR-0003 feature cycles).
 */

/** The rail item key prefix of a pinned `.view`; the rest is its absolute path. */
export const VIEW_PIN_PREFIX = 'view:';

/** The rail item key prefix of a pinned type; the rest is its `TypeMetadata.name`. */
export const TYPE_PIN_PREFIX = 'type:';

/** The rail item key of the `.view` at `path` pinned to the rail. */
export function viewPinKey(path: string): string {
	return VIEW_PIN_PREFIX + path;
}

/** The rail item key of the type `name` pinned to the rail. */
export function typePinKey(name: string): string {
	return TYPE_PIN_PREFIX + name;
}
