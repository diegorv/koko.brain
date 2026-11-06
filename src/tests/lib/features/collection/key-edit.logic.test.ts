import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
	applyEditorKeyEdit,
	EDITOR_KEYS,
	editorKeyBaseAfter,
	editorKeyBases,
	isViewAt,
	sortedJson,
	type EditorKey,
} from '#lib/features/collection/key-edit.logic.js';
import { parseCollectionYaml, type CollectionYamlUpdates } from '#lib/features/collection/yaml-parser.js';
import type { CollectionDefinition } from '#lib/features/collection/collection.types.js';

const YAML = `filters:
  and:
    - status == 'open'
  note: kept
formulas:
  double: price * 2
views:
  - type: table
    name: First
    filters:
      and:
        - priority > 1
    sort:
      - column: status
        direction: ASC
  - type: calendar
    name: Cal
    dateProperty: due
`;

function definitionOf(yaml: string): CollectionDefinition {
	const parsed = parseCollectionYaml(yaml);
	if (!parsed.success) throw new Error(parsed.error);
	return parsed.definition;
}

describe('sortedJson', () => {
	it('gives one string for objects whose keys differ only in order, at every level', () => {
		expect(sortedJson({ b: 1, a: { d: 2, c: [{ y: 1, x: 2 }] } })).toBe(sortedJson({ a: { c: [{ x: 2, y: 1 }], d: 2 }, b: 1 }));
	});

	it('gives "null" for undefined', () => {
		expect(sortedJson(undefined)).toBe('null');
	});
});

describe('editorKeyBases', () => {
	it('has a base for every key', () => {
		expect(Object.keys(editorKeyBases(definitionOf(YAML), 0)).sort()).toEqual([...EDITOR_KEYS].sort());
	});

	it('pairs a view key with the name of the view at the index', () => {
		const def = definitionOf(YAML);
		const renamed = definitionOf(YAML.replace('name: First', 'name: Renamed'));

		expect(editorKeyBases(def, 0).viewSort).not.toBe(editorKeyBases(renamed, 0).viewSort);
		expect(editorKeyBases(def, 0).filters).toBe(editorKeyBases(renamed, 0).filters);
	});

	it('reads the view at the index', () => {
		const def = definitionOf(YAML);

		expect(editorKeyBases(def, 1).viewDateProperty).not.toBe(editorKeyBases(def, 0).viewDateProperty);
	});
});

describe('applyEditorKeyEdit', () => {
	it('writes a sort and leaves the filters as written, unknown key and one-item and included', () => {
		const bases = editorKeyBases(definitionOf(YAML), 0);

		const result = applyEditorKeyEdit(YAML, 'viewSort', [{ column: 'priority', direction: 'DESC' }], bases.viewSort, 0);

		if (!result.ok) throw new Error('refused');
		const raw = parseYaml(result.yaml);
		expect(raw.filters).toEqual({ and: ["status == 'open'"], note: 'kept' });
		expect(raw.views[0].filters).toEqual({ and: ['priority > 1'] });
		expect(raw.views[0].sort).toEqual([{ column: 'priority', direction: 'DESC' }]);
		expect(raw.formulas).toEqual({ double: 'price * 2' });
		expect(raw.views[1]).toEqual({ type: 'calendar', name: 'Cal', dateProperty: 'due' });
	});

	it('writes a view key into the view at the index', () => {
		const bases = editorKeyBases(definitionOf(YAML), 1);

		const result = applyEditorKeyEdit(YAML, 'viewDateProperty', 'start', bases.viewDateProperty, 1);

		if (!result.ok) throw new Error('refused');
		expect(parseYaml(result.yaml).views.map((v: { dateProperty?: string }) => v.dateProperty)).toEqual([undefined, 'start']);
	});

	it('refuses when that key changed since its base was read', () => {
		const base = editorKeyBases(definitionOf(YAML), 0).viewSort;
		const changed = YAML.replace('direction: ASC', 'direction: DESC');

		expect(applyEditorKeyEdit(changed, 'viewSort', [], base, 0)).toEqual({ ok: false, reason: 'conflict' });
	});

	it('writes when only another key changed', () => {
		const base = editorKeyBases(definitionOf(YAML), 0).viewSort;
		const changed = YAML.replace('price * 2', 'price * 3');

		const result = applyEditorKeyEdit(changed, 'viewSort', [], base, 0);

		if (!result.ok) throw new Error('refused');
		const raw = parseYaml(result.yaml);
		expect(raw.views[0].sort).toBeUndefined();
		expect(raw.formulas).toEqual({ double: 'price * 3' });
	});

	it('refuses a view key when another view now sits at the index', () => {
		const twins = `views:
  - type: table
    name: A
  - type: table
    name: B
`;
		const base = editorKeyBases(definitionOf(twins), 0).viewSort;
		const swapped = twins.replace('name: A', 'name: X').replace('name: B', 'name: A').replace('name: X', 'name: B');

		expect(applyEditorKeyEdit(swapped, 'viewSort', [{ column: 'x', direction: 'ASC' }], base, 0)).toEqual({ ok: false, reason: 'conflict' });
	});

	it('reports YAML that does not parse as a view', () => {
		const result = applyEditorKeyEdit('views: [unclosed', 'viewSort', [], '', 0);

		expect(result.ok).toBe(false);
		expect(result).toMatchObject({ reason: 'invalid' });
	});
});

describe('editorKeyBaseAfter', () => {
	it('is the base the written file gives, so a second edit of the key is not refused', () => {
		const sort = [{ column: 'priority', direction: 'DESC' as const }];
		const bases = editorKeyBases(definitionOf(YAML), 0);
		const first = applyEditorKeyEdit(YAML, 'viewSort', sort, bases.viewSort, 0);
		if (!first.ok) throw new Error('refused');

		const after = editorKeyBaseAfter(YAML, 'viewSort', sort, 0);

		expect(after).toBe(editorKeyBases(definitionOf(first.yaml), 0).viewSort);
		expect(applyEditorKeyEdit(first.yaml, 'viewSort', [], after, 0).ok).toBe(true);
	});

	it('matches a removed key: an empty sort, an empty date property and no formulas', () => {
		const roundTrips = <K extends EditorKey>(key: K, value: CollectionYamlUpdates[K]) => {
			const first = applyEditorKeyEdit(YAML, key, value, editorKeyBases(definitionOf(YAML), 0)[key], 0);
			if (!first.ok) throw new Error('refused');
			expect(editorKeyBaseAfter(YAML, key, value, 0)).toBe(editorKeyBases(definitionOf(first.yaml), 0)[key]);
		};
		roundTrips('viewSort', []);
		roundTrips('viewDateProperty', '');
		roundTrips('formulas', undefined);
	});

	it('is an empty string for YAML that does not parse', () => {
		expect(editorKeyBaseAfter('views: [unclosed', 'viewSort', [], 0)).toBe('');
	});
});

describe('isViewAt', () => {
	it('is true when the view at the index has the name', () => {
		expect(isViewAt(YAML, 1, 'Cal')).toBe(true);
	});

	it('is false for another name, an index past the end, and YAML that does not parse', () => {
		expect(isViewAt(YAML, 0, 'Cal')).toBe(false);
		expect(isViewAt(YAML, 2, 'Cal')).toBe(false);
		expect(isViewAt('views: [unclosed', 0, 'First')).toBe(false);
	});
});
