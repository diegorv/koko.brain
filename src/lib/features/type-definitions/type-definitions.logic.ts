import type { NoteEntryV2, FrontmatterValue } from '$lib/types/vault-v2.types';
import { isValidFileName } from '$lib/core/filesystem/fs.logic';

/** Display metadata for a type definition. */
export interface TypeMetadata {
	/** Type name (from entry title, e.g. "Project"). */
	name: string;
	/** Absolute path to the Type Definition note backing this metadata, or `null` when only a builtin/default fallback is available (no on-disk definition). */
	path: string | null;
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
	/** Vault-relative base folder where new notes of this type are created (null = vault root). */
	folder: string | null;
	/** Default sort field for notes of this type. */
	sort: string;
	/** Default view mode. */
	view: string;
	/** Whether the type section is visible in the sidebar. */
	visible: boolean;
	/** Properties to display in list views. */
	listPropertiesDisplay: string[];
	/** Destination template when _archived is set to true (e.g. "{folder}/_archive"). */
	archiveTo: string | null;
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
	path: null,
	icon: 'file-text',
	color: 'gray',
	order: 50,
	sidebarLabel: '',
	template: null,
	folder: null,
	sort: 'title',
	view: 'all',
	visible: true,
	listPropertiesDisplay: [],
	archiveTo: null,
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
		path: entry.path,
		icon: fmString(fm, '_icon') ?? builtin.icon ?? DEFAULTS.icon,
		color: fmString(fm, '_color') ?? builtin.color ?? DEFAULTS.color,
		order: fmNumber(fm, '_order') ?? builtin.order ?? DEFAULTS.order,
		sidebarLabel: fmString(fm, '_sidebar_label') ?? `${name}s`,
		template: fmString(fm, '_template'),
		folder: fmString(fm, '_folder'),
		sort: fmString(fm, '_sort') ?? DEFAULTS.sort,
		view: fmString(fm, '_view') ?? DEFAULTS.view,
		visible: fmBool(fm, '_visible') ?? DEFAULTS.visible,
		listPropertiesDisplay: fmStringArray(fm, '_list_properties_display') ?? DEFAULTS.listPropertiesDisplay,
		archiveTo: fmString(fm, '_archive_to') ?? DEFAULTS.archiveTo,
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

/**
 * Validates a candidate type name for creation/rename dialogs. Returns an
 * error message, or `null` when the name is acceptable. A type's name is its
 * definition note's file name (without extension), so the name must be a
 * legal file name; collisions are checked case-insensitively because the
 * default macOS file system is case-insensitive.
 */
export function validateTypeName(name: string, existingTypeNames: string[]): string | null {
	const trimmed = name.trim();
	if (!trimmed) return 'Type name is required';
	if (!isValidFileName(trimmed)) return 'Invalid type name';
	const lower = trimmed.toLowerCase();
	if (existingTypeNames.some((t) => t.toLowerCase() === lower)) {
		return 'A type with this name already exists';
	}
	return null;
}

/** First letter uppercase, rest preserved — the casing rule Rust applies to `_type` values when deriving `is_a` (entry.rs::extract_is_a). */
function normalizeTypeCasing(s: string): string {
	return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * TS mirror of Rust's `rewrite_type_in_frontmatter` (parsing.rs): rewrites
 * the value of a top-level `_type:` / `type:` frontmatter key when its
 * (unquoted, casing-normalized) value equals `oldType`. Preserves key
 * spelling, quote style, and line endings; touches nothing outside the
 * frontmatter block. Returns `null` when nothing matched.
 *
 * Used by renameType to rewrite the in-memory content of OPEN editor tabs
 * before the Rust command rewrites the rest of the vault on disk —
 * otherwise a dirty tab's pending auto-save would clobber the propagated
 * rewrite with the stale `_type`.
 */
export function rewriteTypeInFrontmatter(content: string, oldType: string, newType: string): string | null {
	const fmMatch = /^---\r?\n[\s\S]*?\r?\n---/.exec(content);
	if (!fmMatch) return null;
	const block = fmMatch[0];
	const oldNormalized = normalizeTypeCasing(oldType);

	let changed = false;
	const rebuilt = block
		.split(/(?<=\n)/)
		.map((line) => {
			const body = line.replace(/\r?\n$/, '');
			const ending = line.slice(body.length);
			const keyMatch = /^(_?type):([\s\S]*)$/.exec(body);
			if (!keyMatch) return line;
			const raw = keyMatch[2].trim();
			let value = raw;
			let quote = '';
			if (
				raw.length >= 2 &&
				((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
			) {
				quote = raw[0];
				value = raw.slice(1, -1);
			}
			if (normalizeTypeCasing(value) !== oldNormalized) return line;
			changed = true;
			return `${keyMatch[1]}: ${quote}${newType}${quote}${ending}`;
		})
		.join('');
	if (!changed) return null;
	return rebuilt + content.slice(block.length);
}

/**
 * Builds the absolute directory a new typed note is created in:
 * `vaultPath / baseFolder / typeFolder`, where `baseFolder` is the global
 * setting and `typeFolder` is the type's own `_folder`. Empty/whitespace-only
 * segments are skipped, and leading/trailing slashes are stripped, so an
 * empty base + empty type folder yields the vault root (current default).
 */
export function buildTypeNoteDir(
	vaultPath: string,
	baseFolder: string | null,
	typeFolder: string | null,
): string {
	const clean = (s: string | null): string => (s ?? '').trim().replace(/^\/+|\/+$/g, '');
	const parts = [vaultPath];
	const base = clean(baseFolder);
	const type = clean(typeFolder);
	if (base) parts.push(base);
	if (type) parts.push(type);
	return parts.join('/');
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
