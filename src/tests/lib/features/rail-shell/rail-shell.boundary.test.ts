import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ADR 0003: features/ may import core/ and utils/ only. Plugin-owned rail parts
// register through railRegistryStore instead of being imported by the shell.
const DIRS = ['src/lib/features/rail-shell', 'src/lib/features/note-list'];
const PLUGIN_IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)['"](?:#lib|\$lib|(?:\.\.\/)+)[^'"]*plugins\//;

describe('rail shell layer boundary', () => {
	const files = DIRS.flatMap((dir) =>
		readdirSync(join(process.cwd(), dir), { recursive: true, encoding: 'utf8' })
			.filter((name) => /\.(ts|svelte)$/.test(name))
			.map((name) => join(dir, name)),
	);

	it('finds the shell sources', () => {
		expect(files).toContain('src/lib/features/rail-shell/RailNoteList.svelte');
	});

	it.each(files)('%s imports nothing from plugins/', (file) => {
		expect(readFileSync(join(process.cwd(), file), 'utf8')).not.toMatch(PLUGIN_IMPORT);
	});

	it('the import check catches a plugin import', () => {
		expect("import X from '#lib/plugins/calendar/CalendarPanel.svelte';").toMatch(PLUGIN_IMPORT);
		expect("import { y } from '../../plugins/one-on-one/one-on-one.service.js';").toMatch(PLUGIN_IMPORT);
		expect("const m = await import('#lib/plugins/calendar/calendar.service.js');").toMatch(PLUGIN_IMPORT);
		expect("import '../plugins/kanban/kanban.css';").toMatch(PLUGIN_IMPORT);
	});
});
