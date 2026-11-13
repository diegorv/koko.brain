import { splitPropertyIntoPills } from '#lib/features/type-definitions/type-sidebar.logic.js';
import type { LensNote, ResolvedLens } from '#lib/features/rail-shell/rail-shell.types.js';

/**
 * Trims and lower-cases a search box value. An all-whitespace query becomes
 * the empty string, which means "no filter".
 */
export function normalizeListQuery(query: string): string {
	return query.trim().toLowerCase();
}

/**
 * True when a note stays in the list for a normalized query. Matches the title,
 * the display text of the pills of the shown properties, or a full-text hit
 * (`fullTextPaths`) whose body matched the query. The subtitle is left out on
 * purpose: it holds relative times that change while the list is open.
 */
export function noteMatchesListQuery(
	note: LensNote,
	normalizedQuery: string,
	listProperties: readonly string[],
	fullTextPaths?: ReadonlySet<string>,
): boolean {
	if (!normalizedQuery) return true;
	if (fullTextPaths?.has(note.path)) return true;
	if (note.title.toLowerCase().includes(normalizedQuery)) return true;
	return listProperties.some((key) =>
		splitPropertyIntoPills(note.frontmatter[key]).some((pill) =>
			pill.text.toLowerCase().includes(normalizedQuery),
		),
	);
}

/**
 * Narrows a resolved lens to the notes that match `query`. An empty query
 * returns `resolved` itself so callers can skip the copy. Groups are filtered
 * one by one and kept even when empty, so a group header still shows.
 * `listPropertiesFor` gives the pill keys each note is searched by.
 */
export function filterResolvedLens(
	resolved: ResolvedLens,
	query: string,
	listPropertiesFor: (note: LensNote) => readonly string[],
	fullTextPaths?: ReadonlySet<string>,
): ResolvedLens {
	const normalized = normalizeListQuery(query);
	if (!normalized) return resolved;
	const keep = (note: LensNote): boolean =>
		noteMatchesListQuery(note, normalized, listPropertiesFor(note), fullTextPaths);
	return {
		...resolved,
		notes: resolved.notes.filter(keep),
		...(resolved.groups
			? {
					groups: resolved.groups.map((group) => ({
						...group,
						notes: group.notes.filter(keep),
					})),
				}
			: {}),
	};
}
