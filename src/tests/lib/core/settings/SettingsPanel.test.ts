// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

import { sectionComponents } from '$lib/core/settings/SettingsPanel.svelte';
import { SETTINGS_SECTION_GROUPS, settingsSectionGroupsFor } from '$lib/core/settings/settings.logic';

/** Every section id the settings sidebar can navigate to, in nav order. */
const navIds = SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.id));

describe('sectionComponents', () => {
	it('resolves every navigable section to a component', () => {
		for (const id of navIds) {
			expect(sectionComponents[id], `no component mapped for section "${id}"`).toBeDefined();
		}
	});

	it('has no entry for a section the sidebar does not expose', () => {
		expect(Object.keys(sectionComponents).sort()).toEqual([...navIds].sort());
	});

	it('maps every section to a distinct component', () => {
		const mapped = navIds.map((id) => sectionComponents[id]);
		expect(new Set(mapped).size).toBe(navIds.length);
	});
});

describe('sectionComponents on mobile', () => {
	const mobileIds = settingsSectionGroupsFor(true).flatMap((g) => g.sections.map((s) => s.id));

	it('resolves every mobile-navigable section to a component', () => {
		for (const id of mobileIds) {
			expect(sectionComponents[id], `no component mapped for section "${id}"`).toBeDefined();
		}
	});

	it('exposes a strict subset of the desktop navigation', () => {
		expect(mobileIds.length).toBeLessThan(navIds.length);
		for (const id of mobileIds) expect(navIds).toContain(id);
		expect(mobileIds).not.toContain('update');
		expect(mobileIds).not.toContain('quick-capture');
	});
});
