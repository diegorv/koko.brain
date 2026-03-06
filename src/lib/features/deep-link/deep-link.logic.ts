import {
	parseFrontmatterProperties,
	extractBody,
	rebuildContent,
} from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import type {
	DeepLinkAction,
	DeepLinkActionType,
	OpenAction,
	NewAction,
	SearchAction,
	DailyAction,
	CaptureAction,
	ParseResult,
} from './deep-link.types';

/** Set of recognized action types */
const VALID_ACTIONS: Set<string> = new Set(['open', 'new', 'search', 'daily', 'capture']);

/**
 * Parses a `kokobrain://` URI string into a typed deep-link action.
 *
 * URI format: `kokobrain://action?param1=value1&param2=value2`
 * The URL constructor maps `action` to `url.hostname` and params to `url.searchParams`.
 *
 * @returns A `ParseResult` — either `{ ok: true, action }` or `{ ok: false, error }`.
 */
export function parseDeepLinkUri(uri: string): ParseResult {
	let url: URL;
	try {
		url = new URL(uri);
	} catch {
		return { ok: false, error: `Invalid URI: ${uri}` };
	}

	if (url.protocol !== 'kokobrain:') {
		return { ok: false, error: `Invalid protocol: expected "kokobrain:", got "${url.protocol}"` };
	}

	const action = url.hostname;
	if (!action || !VALID_ACTIONS.has(action)) {
		return { ok: false, error: `Unknown action: "${action}"` };
	}

	const params = url.searchParams;
	const vault = params.get('vault');
	if (!vault) {
		return { ok: false, error: `Missing required parameter: "vault"` };
	}

	const actionType = action as DeepLinkActionType;

	switch (actionType) {
		case 'open':
			return {
				ok: true,
				action: {
					type: 'open',
					vault,
					file: params.get('file') ?? undefined,
					path: params.get('path') ?? undefined,
				} satisfies OpenAction,
			};

		case 'new': {
			const name = params.get('name') ?? undefined;
			const file = params.get('file') ?? undefined;
			if (!name && !file) {
				return { ok: false, error: `Missing required parameter: "name" or "file" for action "new"` };
			}
			return {
				ok: true,
				action: {
					type: 'new',
					vault,
					name,
					file,
					content: params.get('content') ?? undefined,
					silent: parseBooleanParam(params.get('silent')),
					append: parseBooleanParam(params.get('append')),
					prepend: parseBooleanParam(params.get('prepend')),
					overwrite: parseBooleanParam(params.get('overwrite')),
					clipboard: parseBooleanParam(params.get('clipboard')),
				} satisfies NewAction,
			};
		}

		case 'search': {
			const query = params.get('query');
			if (!query) {
				return { ok: false, error: `Missing required parameter: "query" for action "search"` };
			}
			return {
				ok: true,
				action: {
					type: 'search',
					vault,
					query,
				} satisfies SearchAction,
			};
		}

		case 'daily':
			return {
				ok: true,
				action: {
					type: 'daily',
					vault,
					content: params.get('content') ?? undefined,
					append: parseBooleanParam(params.get('append')),
					prepend: parseBooleanParam(params.get('prepend')),
					clipboard: parseBooleanParam(params.get('clipboard')),
				} satisfies DailyAction,
			};

		case 'capture': {
			const content = params.get('content');
			if (!content) {
				return { ok: false, error: `Missing required parameter: "content" for action "capture"` };
			}
			return {
				ok: true,
				action: {
					type: 'capture',
					vault,
					content,
					tags: parseTagsParam(params.get('tags')),
				} satisfies CaptureAction,
			};
		}
	}
}

/**
 * Resolves a relative file path against a vault root path.
 * Adds `.md` extension if no extension is present.
 * Rejects paths that traverse outside the vault directory.
 *
 * @example resolveFilePath('/vault', 'notes/hello') → '/vault/notes/hello.md'
 * @example resolveFilePath('/vault', 'notes/hello.md') → '/vault/notes/hello.md'
 * @example resolveFilePath('/vault/', 'notes/hello') → '/vault/notes/hello.md'
 * @throws {Error} If the resolved path escapes the vault directory
 */
export function resolveFilePath(vaultPath: string, file: string): string {
	const base = vaultPath.endsWith('/') ? vaultPath.slice(0, -1) : vaultPath;
	const relative = file.startsWith('/') ? file.slice(1) : file;
	const fullPath = `${base}/${relative}`;

	// Normalize the path by resolving ".." and "." segments
	const normalized = normalizePath(fullPath);

	// Ensure the resolved path stays within the vault
	if (!normalized.startsWith(base + '/') && normalized !== base) {
		throw new Error(`Path traversal detected: "${file}" resolves outside the vault`);
	}

	// Add .md if no extension is present
	const lastSegment = normalized.split('/').pop() ?? '';
	if (!lastSegment.includes('.')) {
		return `${normalized}.md`;
	}

	return normalized;
}

/**
 * Normalizes a path by resolving `.` and `..` segments.
 * Does not access the filesystem — purely string-based.
 */
function normalizePath(path: string): string {
	const parts = path.split('/');
	const resolved: string[] = [];
	for (const part of parts) {
		if (part === '.' || part === '') {
			continue;
		} else if (part === '..') {
			resolved.pop();
		} else {
			resolved.push(part);
		}
	}
	return '/' + resolved.join('/');
}

/**
 * Parses a string parameter as a boolean.
 * Recognizes "true", "1", and "" (presence without value) as true.
 */
function parseBooleanParam(value: string | null): boolean | undefined {
	if (value === null) return undefined;
	return value === 'true' || value === '1' || value === '';
}

/**
 * Parses a comma-separated tags parameter into an array of trimmed, non-empty tag strings.
 * Returns undefined if the param is null or results in no valid tags.
 */
function parseTagsParam(value: string | null): string[] | undefined {
	if (value === null) return undefined;
	const tags = value.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
	return tags.length > 0 ? tags : undefined;
}

/**
 * Injects tags into content's YAML frontmatter.
 *
 * - If content has existing frontmatter with a `tags` list, merges new tags (deduplicated).
 * - If content has frontmatter but no `tags` property, adds one.
 * - If content has no frontmatter, creates a frontmatter block with the tags.
 *
 * @param content - The full file content (may or may not have frontmatter)
 * @param tags - Array of tag strings to inject
 * @returns The content with tags injected into frontmatter
 */
export function injectTagsIntoContent(content: string, tags: string[]): string {
	if (tags.length === 0) return content;

	const properties = parseFrontmatterProperties(content);
	const body = extractBody(content);

	const existingTagsProp = properties.find((p) => p.key === 'tags');

	if (existingTagsProp && existingTagsProp.type === 'list') {
		const existingTags = existingTagsProp.value as string[];
		const merged = [...existingTags];
		for (const tag of tags) {
			if (!merged.includes(tag)) {
				merged.push(tag);
			}
		}
		const updatedProperties = properties.map((p) =>
			p.key === 'tags' ? { ...p, value: merged } : p,
		);
		return rebuildContent(updatedProperties as Property[], body);
	}

	if (existingTagsProp) {
		// tags property exists but is not a list — replace with list
		const updatedProperties: Property[] = properties.map((p) =>
			p.key === 'tags' ? { key: 'tags', value: tags, type: 'list' as const } : p,
		);
		return rebuildContent(updatedProperties, body);
	}

	// No tags property — add one
	const updatedProperties: Property[] = [
		...properties,
		{ key: 'tags', value: tags, type: 'list' as const },
	];
	return rebuildContent(updatedProperties, body);
}
