import { describe, it, expect } from 'vitest';
import { parseCollectionYaml } from '$lib/features/collection/yaml-parser';
import { executeQuery } from '$lib/features/collection/collection.logic';
import type { NoteRecord } from '$lib/features/collection/collection.types';

/**
 * End-to-end validation of relationship filters as they reach the engine from
 * a real .view / .collection YAML body — parseCollectionYaml then executeQuery,
 * not a hand-built CollectionDefinition.
 *
 * Records mirror the Rust projection in `project_note_record` (vault.rs): the
 * `_belongs_to` / `_related_to` / `_has_many` fields arrive as arrays of CLEAN
 * wikilink targets (no `[[ ]]`, no `|alias`, no `#heading`), even for a single
 * link. The bare (no-underscore) keys are NOT first-class and reach the record
 * only as the raw frontmatter string.
 */

function makeRecord(path: string, props: Record<string, unknown>): NoteRecord {
	const name = path.split('/').pop() ?? path;
	const ext = '.md';
	const basename = name.replace('.md', '');
	const folder = path.substring(0, path.lastIndexOf('/'));
	return {
		path, name, basename, folder, ext,
		mtime: 0, ctime: 0, size: 0,
		properties: new Map(Object.entries(props)),
	};
}

function makeIndex(records: NoteRecord[]): Map<string, NoteRecord> {
	return new Map(records.map((r) => [r.path, r]));
}

/** Parses a collection YAML body and runs its first view against an index. */
function run(yaml: string, index: Map<string, NoteRecord>): string[] {
	const parsed = parseCollectionYaml(yaml);
	if (!parsed.success) throw new Error(parsed.error);
	const view = parsed.definition.views[0];
	const result = executeQuery(parsed.definition, view, index);
	return result.records.map((r) => r.path);
}

describe('Relationship filters through the .view/.collection pipeline', () => {
	it('_belongs_to.contains matches a single projected wikilink target', () => {
		const index = makeIndex([
			// single `_belongs_to: "[[Website Redesign]]"` projects to a 1-element array
			makeRecord('/kickoff.md', { type: 'Event', _belongs_to: ['Website Redesign'] }),
			makeRecord('/other.md', { type: 'Event', _belongs_to: ['Mobile App'] }),
			makeRecord('/untyped.md', {}),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: Children',
			"filters: \"_belongs_to.contains('Website Redesign')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/kickoff.md']);
	});

	it('_belongs_to.contains is case-insensitive', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _belongs_to: ['Website Redesign'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"_belongs_to.contains('website redesign')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/a.md']);
	});

	it('_related_to.contains matches one of several targets', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _related_to: ['design-systems', 'accessibility'] }),
			makeRecord('/b.md', { _related_to: ['performance'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"_related_to.contains('accessibility')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/a.md']);
	});

	it('_has_many.contains matches inverse-ownership targets', () => {
		const index = makeIndex([
			makeRecord('/parent.md', { _has_many: ['task-a', 'task-b'] }),
			makeRecord('/leaf.md', {}),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"_has_many.contains('task-b')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/parent.md']);
	});

	it('combines type and a relationship filter with && (real .view usage)', () => {
		const index = makeIndex([
			makeRecord('/m1.md', { type: 'Event', _belongs_to: ['Website Redesign'] }),
			makeRecord('/m2.md', { type: 'Note', _belongs_to: ['Website Redesign'] }),
			makeRecord('/m3.md', { type: 'Event', _belongs_to: ['Mobile App'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"type == 'Event' && _belongs_to.contains('Website Redesign')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/m1.md']);
	});

	it('combines type and a relationship filter with the structured {and} form', () => {
		const index = makeIndex([
			makeRecord('/m1.md', { type: 'Event', _belongs_to: ['Website Redesign'] }),
			makeRecord('/m2.md', { type: 'Note', _belongs_to: ['Website Redesign'] }),
			makeRecord('/m3.md', { type: 'Event', _belongs_to: ['Mobile App'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			'filters:',
			'  and:',
			"    - \"type == 'Event'\"",
			"    - \"_belongs_to.contains('Website Redesign')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/m1.md']);
	});

	it('FOOTGUN: the `and` keyword is NOT a logical operator (use && or {and})', () => {
		// The expression grammar only understands && / || ; the doc examples that
		// write `type == "X" and status == "Y"` tokenize `and` as an identifier and
		// silently match nothing. Use `&&` in string filters or the {and:[...]} form.
		const index = makeIndex([
			makeRecord('/m1.md', { type: 'Event', _belongs_to: ['Website Redesign'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"type == 'Event' and _belongs_to.contains('Website Redesign')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual([]);
	});

	it('view-level filters field works the same as global filters', () => {
		const index = makeIndex([
			makeRecord('/a.md', { _belongs_to: ['Parent'] }),
			makeRecord('/b.md', { _belongs_to: ['Elsewhere'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"    filters: \"_belongs_to.contains('Parent')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/a.md']);
	});

	// --- Documented footguns -------------------------------------------------

	it('FOOTGUN: == on a single-element relationship array passes by JS coercion', () => {
		// `_belongs_to == "Parent"` works ONLY because looseEqual falls through to
		// JS `==`, and `["Parent"] == "Parent"` coerces the array to "Parent".
		const index = makeIndex([
			makeRecord('/a.md', { _belongs_to: ['Parent'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"_belongs_to == 'Parent'\"",
		].join('\n');
		expect(run(yaml, index)).toEqual(['/a.md']);
	});

	it('FOOTGUN: == fails on a multi-element relationship array', () => {
		// `["a","b"] == "a"` coerces to "a,b" == "a" -> false. Equality is unsafe
		// for relationships; `.contains()` is the only reliable operator.
		const index = makeIndex([
			makeRecord('/a.md', { _belongs_to: ['Parent', 'AlsoParent'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"_belongs_to == 'Parent'\"",
		].join('\n');
		expect(run(yaml, index)).toEqual([]);
		// but contains still matches either element
		const yaml2 = yaml.replace("_belongs_to == 'Parent'", "_belongs_to.contains('Parent')");
		expect(run(yaml2, index)).toEqual(['/a.md']);
	});

	it('FOOTGUN: bare belongs_to (no underscore) is not the projected target array', () => {
		// The Rust side only projects `_belongs_to`. A bare `belongs_to` is absent
		// from the projected record, so a filter on it matches nothing.
		const index = makeIndex([
			makeRecord('/a.md', { _belongs_to: ['Parent'] }),
		]);
		const yaml = [
			'views:',
			'  - type: table',
			'    name: V',
			"filters: \"belongs_to.contains('Parent')\"",
		].join('\n');
		expect(run(yaml, index)).toEqual([]);
	});
});
