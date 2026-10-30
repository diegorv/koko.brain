// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { KBAPI } from '#lib/plugins/queryjs/kb-api.js';
import type { NoteRecord } from '#lib/features/collection/collection.types.js';
import type { TaskV2 } from '#lib/types/vault-v2.types.js';
import { entryV2, outgoingLinksFromContent } from '../fixtures/vault-entries.fixture';

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

/**
 * Runs the real `help/examples/queryjs-features` scripts with the example
 * folder nested in a larger vault, next to a personal note that matches every
 * tag, date and link the scripts filter on. A scoped script never renders it.
 */

const EXAMPLE = join(process.cwd(), 'help/examples/queryjs-features');
const VAULT = '/vault';
const HERE = `${VAULT}/Resources/help/examples/queryjs-features`;
const CURRENT = `${HERE}/daily-2026-02-13.md`;

const TAGS = ['project', 'meeting', 'to-list', 'type/meeting', 'type/journal/daily'];

/** An open task, the only shape `_shared-open-tasks.js` reads. */
const OPEN_TASK = { text: 'call the bank', checked: false, lineNumber: 3 } as TaskV2;

/** A note with every tag the scripts filter on, created on the current note's day. */
function note(path: string, extraTag: string) {
	const basename = path.slice(path.lastIndexOf('/') + 1, -'.md'.length);
	const record: NoteRecord = {
		path,
		name: `${basename}.md`,
		basename,
		folder: path.slice(0, path.lastIndexOf('/')),
		ext: 'md',
		mtime: Date.parse('2026-02-13T10:00:00Z'),
		ctime: Date.now(),
		size: 100,
		properties: new Map<string, unknown>([
			['created', '2026-02-13'],
			['status', 'active'],
			['progress', 50],
		]),
	};
	const entry = entryV2(path, {
		tags: [...TAGS, extraTag],
		tasks: [OPEN_TASK],
		outgoingLinks: outgoingLinksFromContent('[[daily-2026-02-13]]'),
	});
	return { record, entry };
}

/** A KBAPI over the nested example, running as the example's daily note. */
function createAPI() {
	const current = note(CURRENT, 'type/journal/daily');
	const inside = note(`${HERE}/inside-note.md`, 'inside-only');
	const outside = note(`${VAULT}/Personal/OUTSIDE-NOTE.md`, 'outside-only');
	const notes = [current, inside, outside];
	const container = document.createElement('div');
	const kb = new KBAPI({
		container,
		propertyIndex: new Map(notes.map((n) => [n.record.path, n.record])),
		entries: notes.map((n) => n.entry),
		currentFilePath: CURRENT,
		vaultPath: VAULT,
		loadScript: async (path) => readFileSync(join(EXAMPLE, path.slice(`${VAULT}/`.length)), 'utf8'),
	});
	return { kb, container };
}

/** Renders `__system/queryjs/<name>.js` and returns the container's text. */
async function render(name: string, input?: unknown): Promise<string> {
	const { kb, container } = createAPI();
	await kb.view(`__system/queryjs/${name}`, input);
	expect(container.querySelector('.cm-lp-qjs-error')?.textContent).toBeUndefined();
	return container.textContent ?? '';
}

describe('queryjs-features scripts read only their example folder', () => {
	it.each([
		'project-status-cards',
		'project-progress-bars',
		'recent-edits-timeline',
		'note-shortlist',
		'vault-tag-cloud',
		'tag-heatmap',
		'tag-count',
		'meeting-list',
		'weekly-meeting-list',
	])('%s lists notes in the folder and none outside it', async (name) => {
		const text = await render(name);
		expect(text).toMatch(/inside-note|inside-only/);
		expect(text).not.toMatch(/OUTSIDE-NOTE|outside-only/);
	});

	it('_shared-open-tasks lists tasks of the folder only', async () => {
		const text = await render('_shared-open-tasks', { emptyMessage: 'none' });
		expect(text).toContain('inside-note');
		expect(text).not.toContain('OUTSIDE-NOTE');
	});

	it('vault-overview-cards counts the notes in the folder only', async () => {
		const text = await render('vault-overview-cards');
		expect(text).toMatch(/2\s*Notes|Notes\s*2/);
	});

	it('every kb.view() path resolves inside the folder opened as its own vault', () => {
		const files = [
			...readdirSync(EXAMPLE).filter((f) => f.endsWith('.md')),
			...readdirSync(join(EXAMPLE, '__system/queryjs')).map((f) => `__system/queryjs/${f}`),
		];
		const paths = files.flatMap((f) =>
			[...readFileSync(join(EXAMPLE, f), 'utf8').matchAll(/\bkb\.view\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]),
		);
		expect(paths.length).toBeGreaterThan(0);
		expect(paths.filter((p) => !existsSync(join(EXAMPLE, `${p}.js`)))).toEqual([]);
	});

	it('the inline meeting list in daily-2026-02-13.md lists the folder only', async () => {
		const note = readFileSync(join(EXAMPLE, 'daily-2026-02-13.md'), 'utf8');
		const block = [...note.matchAll(/```queryjs\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => b.includes('kb.pages'));
		const { kb, container } = createAPI();
		new Function('kb', 'dv', 'input', block ?? '')(kb, kb, undefined);
		expect(container.textContent).toContain('inside-note');
		expect(container.textContent).not.toContain('OUTSIDE-NOTE');
	});
});
