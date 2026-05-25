import type { NoteEntryV2, FrontmatterValue } from '$lib/types/vault-v2.types';

/** Display metadata for a type definition. */
export interface TypeMetadata {
	/** Type name (from entry title, e.g. "Project"). */
	name: string;
	/** Display icon name (lucide). */
	icon: string;
	/** Display color. */
	color: string;
	/** Sort order for sidebar sections. Lower = higher. */
	order: number;
	/** Sidebar label override (defaults to name + "s"). */
	sidebarLabel: string;
	/** Template path or content for new notes of this type. */
	template: string | null;
	/** Default sort field for notes of this type. */
	sort: string;
	/** Default view mode. */
	view: string;
	/** Whether the type section is visible in the sidebar. */
	visible: boolean;
	/** Properties to display in list views. */
	listPropertiesDisplay: string[];
}

/** Built-in fallback metadata for common types. */
const BUILTIN_TYPES: Record<string, Partial<TypeMetadata>> = {
	Project: { icon: 'rocket', color: 'red', order: 1 },
	Person: { icon: 'users', color: 'blue', order: 2 },
	Event: { icon: 'calendar', color: 'purple', order: 3 },
	Topic: { icon: 'tag', color: 'green', order: 4 },
	Task: { icon: 'check-square', color: 'orange', order: 5 },
	Note: { icon: 'file-text', color: 'gray', order: 99 },
};

/** Default metadata values. */
const DEFAULTS: TypeMetadata = {
	name: '',
	icon: 'file-text',
	color: 'gray',
	order: 50,
	sidebarLabel: '',
	template: null,
	sort: 'title',
	view: 'all',
	visible: true,
	listPropertiesDisplay: [],
};

/** Extracts a string from a frontmatter value. */
function fmString(fm: Record<string, FrontmatterValue>, key: string): string | null {
	const v = fm[key];
	return typeof v === 'string' ? v : null;
}

/** Extracts a number from a frontmatter value. */
function fmNumber(fm: Record<string, FrontmatterValue>, key: string): number | null {
	const v = fm[key];
	return typeof v === 'number' ? v : null;
}

/** Extracts a boolean from a frontmatter value. */
function fmBool(fm: Record<string, FrontmatterValue>, key: string): boolean | null {
	const v = fm[key];
	return typeof v === 'boolean' ? v : null;
}

/** Extracts a string array from a frontmatter value. */
function fmStringArray(fm: Record<string, FrontmatterValue>, key: string): string[] | null {
	const v = fm[key];
	if (!Array.isArray(v)) return null;
	return v.filter((item): item is string => typeof item === 'string');
}

/** Returns true if the entry is a Type Definition (is_a === "Type"). */
export function isTypeDefinition(entry: NoteEntryV2): boolean {
	return entry.isA === 'Type';
}

/** Extracts TypeMetadata from a Type Definition entry. */
export function extractTypeMetadata(entry: NoteEntryV2): TypeMetadata {
	const fm = entry.frontmatter;
	const name = entry.title;
	const builtin = BUILTIN_TYPES[name] ?? {};

	return {
		name,
		icon: fmString(fm, '_icon') ?? builtin.icon ?? DEFAULTS.icon,
		color: fmString(fm, '_color') ?? builtin.color ?? DEFAULTS.color,
		order: fmNumber(fm, '_order') ?? builtin.order ?? DEFAULTS.order,
		sidebarLabel: fmString(fm, '_sidebar_label') ?? `${name}s`,
		template: fmString(fm, '_template'),
		sort: fmString(fm, '_sort') ?? DEFAULTS.sort,
		view: fmString(fm, '_view') ?? DEFAULTS.view,
		visible: fmBool(fm, '_visible') ?? DEFAULTS.visible,
		listPropertiesDisplay: fmStringArray(fm, '_list_properties_display') ?? DEFAULTS.listPropertiesDisplay,
	};
}

/** Builds a type metadata map from all vault entries. */
export function buildTypeMetadataMap(entries: NoteEntryV2[]): Map<string, TypeMetadata> {
	const map = new Map<string, TypeMetadata>();
	for (const entry of entries) {
		if (isTypeDefinition(entry)) {
			const meta = extractTypeMetadata(entry);
			map.set(meta.name, meta);
		}
	}
	return map;
}

/** Returns metadata for a type name, falling back to builtins then defaults. */
export function getTypeMetadataFallback(name: string, map: Map<string, TypeMetadata>): TypeMetadata {
	const existing = map.get(name);
	if (existing) return existing;
	const builtin = BUILTIN_TYPES[name];
	return {
		...DEFAULTS,
		name,
		...(builtin ?? {}),
		sidebarLabel: `${name}s`,
	};
}
