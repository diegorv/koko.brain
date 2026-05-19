import {
	parseFrontmatterProperties,
	extractBody,
	rebuildContent,
} from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import type {
	DeepLinkActionType,
	OpenAction,
	NewAction,
	SearchAction,
	DailyAction,
	CaptureAction,
	CaptureKind,
	CaptureNoteAction,
	CaptureClipAction,
	CaptureLinkAction,
	CaptureShotAction,
	CaptureFileAction,
	ParseResult,
} from './deep-link.types';

/** Set of recognized action types */
const VALID_ACTIONS: Set<string> = new Set(['open', 'new', 'search', 'daily', 'capture']);

/** Set of recognized capture kinds in the v2 schema */
const VALID_CAPTURE_KINDS: Set<CaptureKind> = new Set([
	'note',
	'clip',
	'link',
	'shot',
	'file',
]);

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

		case 'capture':
			return parseCaptureAction(vault, params);
	}
}

/**
 * Parses the v2 `capture` action. The v1 schema (`?content=...`) was removed —
 * URIs without `v=2` or with an unrecognized `kind` return an error.
 */
function parseCaptureAction(vault: string, params: URLSearchParams): ParseResult {
	const version = params.get('v');
	if (version !== '2') {
		return {
			ok: false,
			error: `Unsupported capture schema: expected "v=2", got "${version ?? '(missing)'}"`,
		};
	}

	const kindParam = params.get('kind');
	if (!kindParam || !VALID_CAPTURE_KINDS.has(kindParam as CaptureKind)) {
		return {
			ok: false,
			error: `Missing or invalid "kind" for action "capture": "${kindParam ?? ''}"`,
		};
	}

	const kind = kindParam as CaptureKind;
	const common = {
		type: 'capture' as const,
		vault,
		tags: parseTagsParam(params.get('tags')),
		sourceApp: parseOptionalParam(params.get('source_app')),
		sourceTitle: parseOptionalParam(params.get('source_title')),
		sourceUrl: parseOptionalParam(params.get('source_url')),
		capturedAt: parseOptionalParam(params.get('captured_at')),
	};

	switch (kind) {
		case 'note': {
			const text = params.get('text');
			if (!text) {
				return { ok: false, error: `Missing required parameter: "text" for capture kind "note"` };
			}
			return {
				ok: true,
				action: { ...common, kind: 'note', text } satisfies CaptureNoteAction,
			};
		}

		case 'clip': {
			const text = params.get('text');
			if (!text) {
				return { ok: false, error: `Missing required parameter: "text" for capture kind "clip"` };
			}
			return {
				ok: true,
				action: { ...common, kind: 'clip', text } satisfies CaptureClipAction,
			};
		}

		case 'link': {
			const url = params.get('url');
			if (!url) {
				return { ok: false, error: `Missing required parameter: "url" for capture kind "link"` };
			}
			return {
				ok: true,
				action: {
					...common,
					kind: 'link',
					url,
					title: parseTitleParam(params.get('title')),
				} satisfies CaptureLinkAction,
			};
		}

		case 'shot': {
			const path = params.get('path');
			if (!path) {
				return { ok: false, error: `Missing required parameter: "path" for capture kind "shot"` };
			}
			return {
				ok: true,
				action: { ...common, kind: 'shot', path } satisfies CaptureShotAction,
			};
		}

		case 'file': {
			const path = params.get('path');
			if (!path) {
				return { ok: false, error: `Missing required parameter: "path" for capture kind "file"` };
			}
			return {
				ok: true,
				action: { ...common, kind: 'file', path } satisfies CaptureFileAction,
			};
		}
	}
}

/**
 * Renders the markdown body for a v2 capture action.
 *
 * Per-kind format:
 * - `note` / `clip`: body = `text`; if `sourceUrl` is present, append a blank
 *   line plus a `> Source: [<sourceTitle ?? sourceUrl>](<sourceUrl>)` footer.
 * - `link`: body = `[<title ?? url>](<url>)`; if `sourceUrl` is present AND
 *   different from `url`, append the same `> Source: ...` footer.
 * - `shot` / `file`: returns an empty string. The service short-circuits these
 *   kinds with a "not yet supported" toast and never calls the renderer.
 */
export function renderCaptureBody(action: CaptureAction): string {
	switch (action.kind) {
		case 'note':
		case 'clip': {
			const footer = buildSourceFooter(action.sourceUrl, action.sourceTitle);
			return footer ? `${action.text}\n\n${footer}` : action.text;
		}
		case 'link': {
			const label = action.title ?? action.url;
			const body = `[${label}](${action.url})`;
			const footer =
				action.sourceUrl && action.sourceUrl !== action.url
					? buildSourceFooter(action.sourceUrl, action.sourceTitle)
					: null;
			return footer ? `${body}\n\n${footer}` : body;
		}
		case 'shot':
		case 'file':
			return '';
	}
}

/**
 * Builds the `> Source: [label](url)` footer line, or returns null when no
 * source URL is available. Label falls back to the URL itself when no title.
 */
function buildSourceFooter(
	sourceUrl: string | undefined,
	sourceTitle: string | undefined,
): string | null {
	if (!sourceUrl) return null;
	const label = sourceTitle ?? sourceUrl;
	return `> Source: [${label}](${sourceUrl})`;
}

export { resolveFilePath } from '$lib/utils/path';

/**
 * Parses a string parameter as a boolean.
 * Recognizes "true", "1", and "" (presence without value) as true.
 */
function parseBooleanParam(value: string | null): boolean | undefined {
	if (value === null) return undefined;
	return value === 'true' || value === '1' || value === '';
}

/**
 * Parses an optional string parameter. Returns undefined for null or empty
 * strings so consumers don't have to special-case `""`.
 */
function parseOptionalParam(value: string | null): string | undefined {
	if (value === null) return undefined;
	return value.length > 0 ? value : undefined;
}

/**
 * Parses a title parameter. Trims surrounding whitespace.
 * Returns undefined if the param is null or trims to an empty string.
 */
function parseTitleParam(value: string | null): string | undefined {
	if (value === null) return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
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
 * Injects a `title` property into content's YAML frontmatter.
 *
 * - If content has frontmatter with an existing `title` property, replaces its value.
 * - If content has frontmatter without `title`, adds the property.
 * - If content has no frontmatter, creates a frontmatter block with `title`.
 *
 * Empty/whitespace-only titles are ignored (returns content unchanged).
 *
 * @param content - The full file content (may or may not have frontmatter)
 * @param title - The title string to inject
 * @returns The content with the title injected into frontmatter
 */
export function injectTitleIntoContent(content: string, title: string): string {
	const trimmed = title.trim();
	if (trimmed.length === 0) return content;

	const properties = parseFrontmatterProperties(content);
	const body = extractBody(content);

	const existingTitleProp = properties.find((p) => p.key === 'title');

	if (existingTitleProp) {
		const updatedProperties: Property[] = properties.map((p) =>
			p.key === 'title' ? { key: 'title', value: trimmed, type: 'text' as const } : p,
		);
		return rebuildContent(updatedProperties, body);
	}

	const updatedProperties: Property[] = [
		...properties,
		{ key: 'title', value: trimmed, type: 'text' as const },
	];
	return rebuildContent(updatedProperties, body);
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
