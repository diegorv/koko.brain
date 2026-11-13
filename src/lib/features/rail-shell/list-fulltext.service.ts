import { call } from '#lib/contracts/ipc.js';
import { error } from '#lib/utils/debug.js';

/** FTS ranks the whole vault, so a body hit past this rank is lost to a list's filter; its title and pill match still count. */
const MAX_FULLTEXT_RESULTS = 500;

/**
 * Returns the absolute paths of notes whose full text matches `query`, for the
 * rail list search. `search_fts` answers with vault-relative paths, so each one
 * is joined onto `vaultPath`; a trailing slash on the vault path is dropped so
 * the join does not produce `//`.
 *
 * A blank query resolves to an empty set without an IPC call. Errors are logged
 * and rethrown so the caller can fall back to the local title and property match.
 *
 * @param query - The raw search text typed into the list search.
 * @param vaultPath - Absolute path of the open vault.
 * @returns Absolute paths of the matching notes.
 */
export async function searchListFullText(query: string, vaultPath: string): Promise<Set<string>> {
	if (!query.trim()) return new Set();
	const root = vaultPath.replace(/\/+$/, '');
	try {
		const results = await call('search_fts', {
			query,
			maxResults: MAX_FULLTEXT_RESULTS,
			fuzzy: false,
		});
		return new Set(results.map((r) => `${root}/${r.path}`));
	} catch (err) {
		error('LIST-FULLTEXT', 'search_fts failed:', err);
		throw err;
	}
}
