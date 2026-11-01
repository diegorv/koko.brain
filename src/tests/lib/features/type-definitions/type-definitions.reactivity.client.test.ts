// @vitest-environment jsdom
// jsdom: vitest then resolves the Svelte client runtime, where effects really re-run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { refreshTypeDefinitions } from '#lib/features/type-definitions/type-definitions.service.js';

import { countEffectRuns } from '../../../fixtures/settings-effect-probe.svelte.js';

/** Minimal entry: only the fields the type-definitions code reads. */
function entry(path: string, title: string, isA: string | null, frontmatter: Record<string, unknown> = {}): NoteEntryV2 {
	return { path, title, isA, frontmatter } as unknown as NoteEntryV2;
}

const projectType = entry('/v/types/Project.md', 'Project', 'Type', { _icon: 'folder' });
const noteA = entry('/v/a.md', 'A', 'Project');

/**
 * Every vault index refresh hands these writers a whole-vault snapshot (10k+
 * entries in a real vault) after a single-note save. They must not make that
 * snapshot deeply reactive, and must not wake type-metadata readers when no
 * type definition changed.
 */
describe('type-definitions refresh cost (client runtime)', () => {
	let probe: ReturnType<typeof countEffectRuns> | null = null;

	beforeEach(() => {
		typeDefinitionsStore.reset();
	});

	afterEach(() => {
		probe?.dispose();
		probe = null;
	});

	it('stores the entries snapshot as-is, without a deep proxy', () => {
		const snapshot = [projectType, noteA];
		typeDefinitionsStore.setEntries(snapshot);

		expect(typeDefinitionsStore.entries).toBe(snapshot);
		expect(typeDefinitionsStore.entries[1]).toBe(noteA);
	});

	it('still notifies entries readers when a new snapshot is set', () => {
		probe = countEffectRuns(() => typeDefinitionsStore.entries.length);
		flushSync();
		const before = probe.runs();

		typeDefinitionsStore.setEntries([projectType, noteA]);
		flushSync();

		expect(probe.runs()).toBe(before + 1);
		expect(typeDefinitionsStore.entries).toHaveLength(2);
	});

	it('does not wake type-metadata readers when no type definition changed', async () => {
		await refreshTypeDefinitions([projectType, noteA]);
		probe = countEffectRuns(() => typeDefinitionsStore.typeMetadataMap);
		flushSync();
		const before = probe.runs();

		// A save of a regular note: same type definitions, other entries differ.
		await refreshTypeDefinitions([projectType, entry('/v/a.md', 'A renamed', 'Project')]);
		flushSync();

		expect(probe.runs()).toBe(before);
		expect(typeDefinitionsStore.getTypeMetadata('Project')).toBeDefined();
	});

	it('wakes type-metadata readers when a type definition changed', async () => {
		await refreshTypeDefinitions([projectType]);
		probe = countEffectRuns(() => typeDefinitionsStore.typeMetadataMap);
		flushSync();
		const before = probe.runs();

		await refreshTypeDefinitions([entry('/v/types/Project.md', 'Project', 'Type', { _icon: 'star' })]);
		flushSync();

		expect(probe.runs()).toBe(before + 1);
		expect(typeDefinitionsStore.getTypeMetadata('Project')?.icon).toBe('star');
	});

	it('clears the metadata when the last type definition goes away', async () => {
		await refreshTypeDefinitions([projectType]);
		await refreshTypeDefinitions([noteA]);

		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(0);
	});
});
