// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';

import { mount, unmount, flushSync, type Component } from 'svelte';
import PeriodicNotesSection from '#lib/core/settings/sections/PeriodicNotesSection.svelte';
import FilesSection from '#lib/core/settings/sections/FilesSection.svelte';
import QueryjsSection from '#lib/plugins/queryjs/QueryjsSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

/**
 * Settings text that the help pages quote: each description says what the
 * setting does in the code, so help 19 can match it word for word.
 */

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function render(section: Component): string {
	settingsStore.reset();
	target = document.body.appendChild(document.createElement('div'));
	component = mount(section, { target });
	flushSync();
	return target.textContent ?? '';
}

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	settingsStore.reset();
});

describe('Settings copy the help pages quote', () => {
	it('Periodic Notes > Base folder names the Quick Capture and New here notes it also places', () => {
		const text = render(PeriodicNotesSection);
		expect(text).toContain(
			'Folder where periodic notes are created. Quick Capture notes (Cmd+N included) and a plain + New here note go in it too.',
		);
	});

	it('Files & Folders > System folder says the Files navigator still shows it', () => {
		const text = render(FilesSection);
		expect(text).toContain(
			"Vault-relative folder left out of the rail's note lists, the Types navigator counts, the calendars, the inbox badges and QueryJS kb.pages(). The Files navigator still shows it. Leave empty to disable.",
		);
		expect(text).not.toContain("hidden from the rail's note lists");
	});

	it('QueryJS points to the help page, not a README section', () => {
		const text = render(QueryjsSection);
		expect(text).toContain('documented in the QueryJS page of the user guide (help/documentation/13-queryjs.md)');
		expect(text).not.toContain('documented in the README');
	});

	it('QueryJS > Always says a cached result is reused, not re-run on every render', () => {
		settingsStore.updateQueryjs({ autoRunQueries: 'always' });
		target = document.body.appendChild(document.createElement('div'));
		component = mount(QueryjsSection, { target });
		flushSync();
		const text = target.textContent ?? '';
		expect(text).toContain(
			'Run every block that has no cached result, each time it is drawn. A result stays cached until a note is saved or changes on disk.',
		);
		expect(text).not.toContain('Re-run on every render');
	});
});
