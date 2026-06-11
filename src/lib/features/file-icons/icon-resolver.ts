import { fileIconsStore } from './file-icons.store.svelte';
import { getIconSync } from './file-icons.icon-data';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import type { NormalizedIcon } from './file-icons.types';

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

	const defPath = typeDefinitionsStore.getTypeDefinitionPath(typeName);
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
	const typeName = typeDefinitionsStore.getEntryByPath(path)?.isA;
	if (!typeName || typeName === 'Type') return undefined;

	return resolveIconForType(typeName);
}
