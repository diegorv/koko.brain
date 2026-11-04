import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildNoteRecord, executeQuery } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';

/**
 * Runs every collection of `help/examples/collection-features` (the
 * `.collection` files and the ` ```collection ` blocks of its notes) over the
 * folder's own notes, the way the editor and the inline block run them.
 */

const FOLDER = join(process.cwd(), 'help/examples/collection-features');
const ROOT = '/vault/examples/collection-features';

/** The blocks of collection-edge-cases.md that show the parse error widget on purpose. */
const MEANT_TO_FAIL = [
	'collection-edge-cases.md #3',
	'collection-edge-cases.md #4',
	'collection-edge-cases.md #5',
	'collection-edge-cases.md #6',
];

interface Sample {
	label: string;
	yaml: string;
}

function samples(): Sample[] {
	const out: Sample[] = [];
	for (const name of readdirSync(FOLDER).sort()) {
		const text = readFileSync(join(FOLDER, name), 'utf8');
		if (name.endsWith('.collection')) out.push({ label: name, yaml: text });
		if (name.endsWith('.md')) {
			let i = 0;
			for (const m of text.matchAll(/^```collection\n([\s\S]*?)^```/gm)) out.push({ label: `${name} #${++i}`, yaml: m[1] });
		}
	}
	return out;
}

function folderIndex(): Map<string, PropertyIndexRecord> {
	const index = new Map<string, PropertyIndexRecord>();
	for (const name of readdirSync(FOLDER)) {
		if (!name.endsWith('.md')) continue;
		const path = `${ROOT}/${name}`;
		index.set(path, buildNoteRecord(path, readFileSync(join(FOLDER, name), 'utf8')));
	}
	return index;
}

describe('collection-features samples', () => {
	const all = samples();
	const index = folderIndex();

	it('finds the .collection files and the inline blocks (scanner sanity)', () => {
		expect(all.filter((s) => s.label.endsWith('.collection')).length).toBeGreaterThanOrEqual(9);
		expect(all.filter((s) => s.label.includes('.md #')).length).toBeGreaterThanOrEqual(20);
	});

	it('every sample parses, except the edge cases meant to show the parse error', () => {
		const failed = all.filter((s) => !parseCollectionYaml(s.yaml).success).map((s) => s.label);
		expect(failed).toEqual(MEANT_TO_FAIL);
	});

	it('every view of every sample runs with no filter error', () => {
		const errors: string[] = [];
		for (const { label, yaml } of all) {
			const parsed = parseCollectionYaml(yaml);
			if (!parsed.success) continue;
			for (const view of parsed.definition.views) {
				const { filterError } = executeQuery(parsed.definition, view, index);
				if (filterError) errors.push(`${label} [${view.name}]: ${filterError}`);
			}
		}
		expect(errors).toEqual([]);
	});

	it('every formula.<name> a view shows, sorts by or sizes is a formula the sample defines', () => {
		const missing: string[] = [];
		for (const { label, yaml } of all) {
			const parsed = parseCollectionYaml(yaml);
			if (!parsed.success) continue;
			const defined = new Set(Object.keys(parsed.definition.formulas ?? {}));
			for (const view of parsed.definition.views) {
				const columns = [...(view.order ?? []), ...(view.sort ?? []).map((s) => s.column), ...Object.keys(view.columnSize ?? {})];
				for (const column of columns) {
					if (column.startsWith('formula.') && !defined.has(column.slice('formula.'.length))) missing.push(`${label} [${view.name}]: ${column}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});
});
