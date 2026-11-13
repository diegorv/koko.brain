import { executeQuery } from '#lib/features/collection/collection.logic.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { CollectionDefinition, QueryResult } from '#lib/features/collection/collection.types.js';
import { getViewRowSetPort } from '#lib/features/collection/view-row-set.port.js';
import { relativePath } from '#lib/utils/path.js';

import type { ModQueryV1 } from './contract/mod-api.v1';
import type { ModVaultScope } from './mod-vault.service';
import { assertVaultPath } from './mods.logic';

/**
 * Builds `ctx.query`: read-only matching over the property index with the
 * engine of views and inline blocks (`executeQuery`). Rejects before the index
 * is ready, since an empty index would read as "no note matches", and on a
 * filter error instead of answering `false` or `[]`. An error while evaluating
 * one note counts as no match, as in views, so `matches` and `notes` agree on
 * evaluation errors. `matches` applies no row rule, so it answers for archived,
 * system-folder, type-definition and `.view` notes that `notes` leaves out.
 */
export function createModQuery({ modId, vaultPath, assertLive }: ModVaultScope): ModQueryV1 {
	/** The live guard, the expression check and the readiness check, then the one-view definition */
	const prepare = (op: string, expression: unknown, path?: unknown): CollectionDefinition => {
		assertLive();
		// Mods are untyped JavaScript. An empty filter is no filter in `executeQuery`, which would match every note.
		if (typeof expression !== 'string' || expression.trim() === '') {
			throw new Error(`Mod "${modId}": query.${op} needs a non-empty expression`);
		}
		if (op === 'matches') assertVaultPath(path);
		if (!collectionStore.isIndexReady) {
			throw new Error(`Mod "${modId}": query.${op}: the vault's notes are not indexed yet`);
		}
		return { views: [{ type: 'table', name: 'mod', filters: expression }] };
	};
	const records = (op: string, result: QueryResult) => {
		if (result.filterError !== undefined) throw new Error(`Mod "${modId}": query.${op}: ${result.filterError}`);
		return result.records;
	};

	return {
		async matches(expression, path) {
			const definition = prepare('matches', expression, path);
			const abs = `${vaultPath}/${path}`;
			const record = collectionStore.propertyIndex.get(abs);
			if (!record) throw new Error(`Mod "${modId}": query.matches: "${path}" is not an indexed note`);
			const result = executeQuery(definition, definition.views[0], new Map([[abs, record]]), vaultPath);
			return records('matches', result).length === 1;
		},
		async notes(expression) {
			const definition = prepare('notes', expression);
			const port = getViewRowSetPort();
			if (!port) throw new Error(`Mod "${modId}": query.notes is not available yet`);
			// The inline block's row rule: no system-folder note, `.view`, type definition or uncited archived note.
			const result = executeQuery(definition, definition.views[0], collectionStore.propertyIndex, vaultPath, (r, v, d) =>
				port.blockRows(r, v, d),
			);
			// Index order differs between a rebuild and deltas.
			return records('notes', result).map((r) => relativePath(vaultPath, r.path)).sort();
		},
	};
}
