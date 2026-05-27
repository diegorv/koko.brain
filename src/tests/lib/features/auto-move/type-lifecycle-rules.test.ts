import { describe, it, expect } from 'vitest';
import { generateLifecycleRules } from '$lib/features/auto-move/type-lifecycle-rules';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';

function makeTypeMetadata(overrides: Partial<TypeMetadata> = {}): TypeMetadata {
	return {
		name: overrides.name ?? 'Project',
		icon: overrides.icon ?? 'rocket',
		color: overrides.color ?? 'red',
		order: overrides.order ?? 1,
		sidebarLabel: overrides.sidebarLabel ?? 'Projects',
		template: overrides.template ?? null,
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
		expect(rules[0].expression).toBe('type.lower() == "project" && _archived == true');
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
			['Event', makeTypeMetadata({ name: 'Event', archiveTo: 'archive/events/{year}' })],
		]);

		const rules = generateLifecycleRules(map);
		expect(rules).toHaveLength(6);
		expect(rules.map(r => r.name)).toEqual([
			'[Project] Archive',
			'[Project] Unarchive',
			'[Task] Archive',
			'[Task] Unarchive',
			'[Event] Archive',
			'[Event] Unarchive',
		]);
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
