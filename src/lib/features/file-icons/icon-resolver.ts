import { fileIconsStore, type FrontmatterIconRef } from './file-icons.store.svelte';
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

/**
 * Result of icon resolution: the one answer to how an item looks, read by every
 * place that shows one. Without `icon` the caller keeps its own default icon and
 * still applies `color` to it (`iconColorStyle`) and `titleColor` to the title.
 */
export interface ResolvedIcon {
	/** The normalized icon ready for rendering; absent when only colors apply */
	icon?: NormalizedIcon;
	/** Optional color override for the icon */
	color?: string;
	/** Optional color override for the filename text */
	titleColor?: string;
}

/** Turns an index entry into a result; an icon its pack does not have still leaves the colors. */
function resolveRef(ref: FrontmatterIconRef | undefined): ResolvedIcon | undefined {
	if (!ref) return undefined;
	const icon = ref.iconPack && ref.iconName ? getIconSync(ref.iconPack, ref.iconName) : undefined;
	if (!icon && !ref.color && !ref.titleColor) return undefined;
	return { icon, color: ref.color, titleColor: ref.titleColor };
}

/**
 * Resolves the display icon and colors for a file path:
 * 1. The file's own frontmatter icon, with its own colors only
 * 2. The icon of the file's type definition, with the file's own colors laid over the type's
 *
 * Returns undefined when nothing applies; caller provides its own fallback.
 * Reading packVersion creates a reactive dependency so consumers re-render
 * when icon packs finish loading.
 */
export function resolveIconForPath(path: string): ResolvedIcon | undefined {
	void fileIconsStore.packVersion;

	const own = resolveRef(fileIconsStore.getFrontmatterIcon(path));
	if (own?.icon) return own;

	const inherited = resolveTypeIconForPath(path);
	if (!own) return inherited;
	return {
		icon: inherited?.icon,
		color: own.color ?? inherited?.color,
		titleColor: own.titleColor ?? inherited?.titleColor,
	};
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
	return resolveRef(fileIconsStore.getFrontmatterIcon(defPath));
}

/** Finds the file's type via isA, then resolves the type definition's icon */
function resolveTypeIconForPath(path: string): ResolvedIcon | undefined {
	const typeName = typeIconLookup?.typeOf(path);
	if (!typeName || typeName === 'Type') return undefined;

	return resolveIconForType(typeName);
}
