// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => false), Channel: class {} }));

import { mount, unmount, flushSync, type Component } from 'svelte';
import EditorSection from '#lib/core/settings/sections/EditorSection.svelte';
import FileHistorySection from '#lib/core/settings/sections/FileHistorySection.svelte';
import QuickCaptureSection from '#lib/core/settings/sections/QuickCaptureSection.svelte';
import TypesSection from '#lib/core/settings/sections/TypesSection.svelte';
import SearchSection from '#lib/features/search/SearchSection.svelte';
import PeriodicNotesSection from '#lib/core/settings/sections/PeriodicNotesSection.svelte';
import FilesSection from '#lib/core/settings/sections/FilesSection.svelte';
import QueryjsSection from '#lib/plugins/queryjs/QueryjsSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { readSource, settingsFiles } from './settings-files';

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

/** The source without comments, which may name libraries and use em dashes. */
function withoutComments(source: string): string {
	return source
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split('\n')
		.filter((line) => !line.trim().startsWith('//'))
		.join('\n');
}

/** The labels of the setting rows in the mounted section. */
const rowLabels = () => [...target.querySelectorAll('.bg-setting-item-bg span.font-medium')].map((el) => el.textContent);

describe('Settings copy rules', () => {
	it('names no library in any Settings page', () => {
		const off = settingsFiles().filter((path) => withoutComments(readSource(path)).includes('dayjs'));
		expect(off).toEqual([]);
	});

	it('uses no em dash in any Settings page', () => {
		const off = settingsFiles().filter((path) => withoutComments(readSource(path)).includes('\u2014'));
		expect(off).toEqual([]);
	});

	it('labels the reranker row without a model ID', () => {
		settingsStore.reset();
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		target = document.body.appendChild(document.createElement('div'));
		component = mount(SearchSection, { target });
		flushSync();

		expect(rowLabels()).toContain('Reranker');
		expect(target.textContent).not.toContain('jina');
		expect(target.textContent).not.toContain('BGE');
	});

	it('describes the editor font without naming CSS', () => {
		const text = render(EditorSection);
		expect(text).toContain('Fonts for the editor, comma-separated; the first one installed is used');
		expect(text).not.toContain('CSS');
	});

	it('says what happens to snapshots after the retention days, as cleanup_history does', () => {
		const text = render(FileHistorySection);
		expect(text).toContain('Days to keep every snapshot. For 30 more days one per day is kept per file, then they are deleted (1–365)');
		expect(text).not.toContain('thinning');
	});

	it('places the Quick Capture subfolder inside the notes folder, not directly under the vault', () => {
		const text = render(QuickCaptureSection);
		expect(text).toContain('Date pattern for the subfolder inside the notes folder, e.g. YYYY/MM-MMM');
		expect(text).not.toContain('under the vault');
	});
});

describe('Settings folder names', () => {
	it('tells the periodic and the typed notes folders apart', () => {
		render(PeriodicNotesSection);
		expect(rowLabels()).toContain('Notes folder');
		expect(rowLabels()).not.toContain('Base folder');
		unmount(component!);
		document.body.innerHTML = '';

		const text = render(TypesSection);
		expect(rowLabels()).toContain('Typed notes folder');
		expect(rowLabels()).not.toContain('Base folder');
		expect(text).toContain('typed notes folder / type folder / note');
	});
});

describe('Settings copy the help pages quote', () => {
	it('Periodic Notes > Notes folder names the Quick Capture and New here notes it also places', () => {
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
