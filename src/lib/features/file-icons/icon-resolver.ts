import { fileIconsStore } from './file-icons.store.svelte';
import { getIconSync } from './file-icons.icon-data';
import type { NormalizedIcon } from './file-icons.types';

/**
 * The type questions the icon chain asks. file-icons sits below
 * type-definitions (ADR-0003), so the app fills this slot from
 * `registerAppPorts()` instead of file-icons importing the store. Both
 * methods read the store at call time, so a resolver call inside a
 * reactive context still tracks the store's entries.
 */
export interface TypeIconLookup {
	/** The note's type (`isA`), or null/undefined when it has none */
	typeOf(path: string): string | null | undefined;
	/** Absolute path of the definition note of `typeName`, or undefined */
	definitionPathOf(typeName: string): string | undefined;
}

/** The installed lookup; null until the app registers one. */
let typeIconLookup: TypeIconLookup | null = null;

/**
 * Installs the lookup the resolver uses for type icons. Returns a function
 * that removes it again (only if it is still the installed one).
 */
export function registerTypeIconLookup(lookup: TypeIconLookup): () => void {
	typeIconLookup = lookup;
	return () => {
		if (typeIconLookup === lookup) typeIconLookup = null;
	};
}

/** Result of icon resolution: the icon data plus optional styling */
export interface ResolvedIcon {
	/** The normalized icon ready for rendering */
	icon: NormalizedIcon;
	/** Optional color override for the icon */
	color?: string;
	/** Optional color override for the filename text */
	titleColor?: string;
}

/**
 * Resolves the display icon for a file path using the canonical priority chain:
 * 1. Frontmatter icon (_icon/icon in the file's own YAML)
 * 2. Type definition icon (inherited from the file's type)
 * 3. Custom icon (from .kokobrain/file-icons.json)
 *
 * Returns undefined when no icon is found; caller provides its own fallback.
 * Reading packVersion creates a reactive dependency so consumers re-render
 * when icon packs finish loading.
 */
export function resolveIconForPath(path: string): ResolvedIcon | undefined {
	void fileIconsStore.packVersion;

	// Priority 1: file's own frontmatter icon
	const fmRef = fileIconsStore.getFrontmatterIcon(path);
	if (fmRef) {
		const icon = getIconSync(fmRef.iconPack, fmRef.iconName);
		if (icon) return { icon, color: fmRef.color, titleColor: fmRef.titleColor };
	}

	// Priority 2: type definition icon (inherited via isA)
	const typeResult = resolveTypeIconForPath(path);
	if (typeResult) return typeResult;

	return undefined;
}

/**
 * Resolves the display icon for a type name by looking up
 * the type definition note's frontmatter icon.
 * Used where only a type name is available (e.g. type selector dropdown).
 */
export function resolveIconForType(typeName: string): ResolvedIcon | undefined {
	void fileIconsStore.packVersion;

	const defPath = typeIconLookup?.definitionPathOf(typeName);
	if (!defPath) return undefined;
	const fmRef = fileIconsStore.getFrontmatterIcon(defPath);
	if (fmRef) {
		const icon = getIconSync(fmRef.iconPack, fmRef.iconName);
		if (icon) return { icon, color: fmRef.color, titleColor: fmRef.titleColor };
	}
	return undefined;
}

/** Finds the file's type via isA, then resolves the type definition's icon */
function resolveTypeIconForPath(path: string): ResolvedIcon | undefined {
	const typeName = typeIconLookup?.typeOf(path);
	if (!typeName || typeName === 'Type') return undefined;

	return resolveIconForType(typeName);
}
