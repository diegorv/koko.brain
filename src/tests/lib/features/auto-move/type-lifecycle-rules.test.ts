import { describe, it, expect } from 'vitest';
import { generateLifecycleRules } from '$lib/features/auto-move/type-lifecycle-rules';
import { findMatchingRule } from '$lib/features/auto-move/auto-move.logic';
import { buildNoteRecord } from '$lib/features/collection/collection.logic';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';

function makeTypeMetadata(overrides: Partial<TypeMetadata> = {}): TypeMetadata {
	return {
		name: overrides.name ?? 'Project',
		path: overrides.path ?? null,
		icon: overrides.icon ?? 'rocket',
		color: overrides.color ?? 'red',
		order: overrides.order ?? 1,
		sidebarLabel: overrides.sidebarLabel ?? 'Projects',
		template: overrides.template ?? null,
		folder: overrides.folder ?? null,
		sort: overrides.sort ?? 'title',
		view: overrides.view ?? 'all',
		visible: overrides.visible ?? true,
		listPropertiesDisplay: overrides.listPropertiesDisplay ?? [],
		archiveTo: overrides.archiveTo ?? null,
	};
}

describe('generateLifecycleRules', () => {
	it('generates archive + unarchive rules for types with archiveTo', () => {
		const map = new Map([
			['Project', makeTypeMetadata({ name: 'Project', archiveTo: '{folder}/_archive' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules).toHaveLength(2);

		expect(rules[0].name).toBe('[Project] Archive');
		expect(rules[0].expression).toBe('type.lower() == "project" && _archived == true && !file.folder.endsWith("_archive")');
		expect(rules[0].destination).toBe('{folder}/_archive');

		expect(rules[1].name).toBe('[Project] Unarchive');
		expect(rules[1].expression).toBe('type.lower() == "project" && _archived == false && file.folder.endsWith("_archive")');
		expect(rules[1].destination).toBe('{parent}');
	});

	it('skips types without archiveTo', () => {
		const map = new Map([
			['Project', makeTypeMetadata({ name: 'Project', archiveTo: '{folder}/_archive' })],
			['Person', makeTypeMetadata({ name: 'Person', archiveTo: null })],
			['Topic', makeTypeMetadata({ name: 'Topic' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules).toHaveLength(2);
		expect(rules[0].name).toBe('[Project] Archive');
		expect(rules[1].name).toBe('[Project] Unarchive');
	});

	it('returns empty array when no types have archiveTo', () => {
		const map = new Map([
			['Person', makeTypeMetadata({ name: 'Person' })],
		]);

		expect(generateLifecycleRules(map)).toHaveLength(0);
	});

	it('returns empty array for empty map', () => {
		expect(generateLifecycleRules(new Map())).toHaveLength(0);
	});

	it('generates rules for multiple types', () => {
		const map = new Map([
			['Project', makeTypeMetadata({ name: 'Project', archiveTo: '{folder}/_archive' })],
			['Task', makeTypeMetadata({ name: 'Task', archiveTo: '{folder}/_archive' })],
			// Event uses a custom archiveTo that is NOT "{folder}/<segment>", so it
			// only gets an archive rule -- {parent} cannot restore it correctly.
			['Event', makeTypeMetadata({ name: 'Event', archiveTo: 'archive/events/{year}' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules).toHaveLength(5);
		expect(rules.map(r => r.name)).toEqual([
			'[Project] Archive',
			'[Project] Unarchive',
			'[Task] Archive',
			'[Task] Unarchive',
			'[Event] Archive',
		]);
	});

	it('derives the archive folder segment for a custom {folder}/<segment> destination', () => {
		const map = new Map([
			['Project', makeTypeMetadata({ name: 'Project', archiveTo: '{folder}/done' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules).toHaveLength(2);
		// Both guards use the derived segment "done", not the hardcoded "_archive".
		expect(rules[0].expression).toBe('type.lower() == "project" && _archived == true && !file.folder.endsWith("done")');
		expect(rules[1].expression).toBe('type.lower() == "project" && _archived == false && file.folder.endsWith("done")');
		expect(rules[1].destination).toBe('{parent}');
	});

	it('emits only an archive rule (no folder guard, no unarchive) for non-{folder} destinations', () => {
		const map = new Map([
			['Event', makeTypeMetadata({ name: 'Event', archiveTo: 'archive/events/{year}' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules).toHaveLength(1);
		expect(rules[0].name).toBe('[Event] Archive');
		// No file.folder.endsWith(...) guard -- the service relies on
		// isAlreadyInDestination to prevent re-archiving for dynamic destinations.
		expect(rules[0].expression).toBe('type.lower() == "event" && _archived == true');
		expect(rules[0].destination).toBe('archive/events/{year}');
	});

	it('does not emit an unarchive rule for a multi-segment {folder} destination', () => {
		const map = new Map([
			['Project', makeTypeMetadata({ name: 'Project', archiveTo: '{folder}/sub/_archive' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules).toHaveLength(1);
		expect(rules[0].name).toBe('[Project] Archive');
		expect(rules[0].expression).toBe('type.lower() == "project" && _archived == true');
	});

	it('generates stable deterministic IDs per type', () => {
		const map = new Map([
			['Project', makeTypeMetadata({ name: 'Project', archiveTo: '{folder}/_archive' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules[0].id).toBe('lifecycle-archive-project');
		expect(rules[1].id).toBe('lifecycle-unarchive-project');
	});
});

describe('generateLifecycleRules - evaluated against real note records', () => {
	const archiveMap = new Map([
		['Project', makeTypeMetadata({ name: 'Project', archiveTo: '{folder}/_archive' })],
	]);

	/** Builds a record the same way auto-move.service.ts::evaluateAndMove does. */
	function recordFor(path: string, frontmatter: string): NoteRecord {
		return buildNoteRecord(path, `---\n${frontmatter}\n---\n\nbody\n`);
	}

	it('matches the archive rule for an archived note written with the `type` alias', () => {
		const rules = generateLifecycleRules(archiveMap);
		const record = recordFor('/vault/Projects/alpha.md', 'type: Project\n_archived: true');

		expect(findMatchingRule(rules, record)?.name).toBe('[Project] Archive');
	});

	it('matches the archive rule for a note written with the canonical `_type` key', () => {
		const rules = generateLifecycleRules(archiveMap);
		const record = recordFor('/vault/Projects/alpha.md', '_type: Project\n_archived: true');

		expect(findMatchingRule(rules, record)?.name).toBe('[Project] Archive');
	});

	it('matches the unarchive rule when an archived-folder note flips _archived to false', () => {
		const rules = generateLifecycleRules(archiveMap);
		const record = recordFor('/vault/Projects/_archive/alpha.md', 'type: Project\n_archived: false');

		expect(findMatchingRule(rules, record)?.name).toBe('[Project] Unarchive');
	});

	it('does not re-archive a note already inside the archive folder', () => {
		const rules = generateLifecycleRules(archiveMap);
		const record = recordFor('/vault/Projects/_archive/alpha.md', 'type: Project\n_archived: true');

		expect(findMatchingRule(rules, record)).toBeNull();
	});

	it('ignores notes of a different type', () => {
		const rules = generateLifecycleRules(archiveMap);
		const record = recordFor('/vault/People/bob.md', 'type: Person\n_archived: true');

		expect(findMatchingRule(rules, record)).toBeNull();
	});

	it('ignores notes of the right type that are not archived', () => {
		const rules = generateLifecycleRules(archiveMap);
		const record = recordFor('/vault/Projects/alpha.md', 'type: Project\n_archived: false');

		expect(findMatchingRule(rules, record)).toBeNull();
	});

	it('matches regardless of the casing the user wrote the type in', () => {
		const rules = generateLifecycleRules(archiveMap);
		const record = recordFor('/vault/Projects/alpha.md', 'type: project\n_archived: true');

		expect(findMatchingRule(rules, record)?.name).toBe('[Project] Archive');
	});

	it('matches the archive rule for a dynamic (non-{folder}) destination', () => {
		const rules = generateLifecycleRules(
			new Map([['Event', makeTypeMetadata({ name: 'Event', archiveTo: 'archive/events/{year}' })]]),
		);
		const record = recordFor('/vault/Events/kickoff.md', 'type: Event\n_archived: true');

		expect(findMatchingRule(rules, record)?.name).toBe('[Event] Archive');
	});
});
