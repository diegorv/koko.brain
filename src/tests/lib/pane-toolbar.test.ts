import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source scan for the second-row toolbars under the top band. They share one
 * height, gutter and divider through the `pane-toolbar` utility in
 * `src/app.css`; jsdom does not compute Tailwind, so the shared recipe is held
 * here by the utility's definition and by each site using it without
 * overrides.
 */

const ROOT = process.cwd();

/** Every second-row toolbar, by file. */
const TOOLBARS = [
	'src/lib/features/note-action-bar/NoteActionBar.svelte',
	'src/lib/features/collection/CollectionView.svelte',
	'src/lib/features/tags/TagsView.svelte',
	'src/lib/features/tasks/TasksView.svelte',
	'src/lib/plugins/kanban/KanbanView.svelte',
	'src/lib/features/event-calendar/EventCalendarHeader.svelte',
	'src/lib/core/layout/SidebarSection.svelte',
];

/**
 * Classes that would compete with the utility's own. Tailwind does not promise
 * which of two utilities setting the same property wins, so a site never adds one.
 */
const OVERRIDE = /(^|\s)(h-\S+|p[xytblr]?-\S+|gap-\S+|border-(?!b\b)\S+|flex-wrap)(?=\s|$)/;

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** The class lists in `source` that carry `pane-toolbar`. */
function toolbarClassLists(source: string): string[] {
	return [...source.matchAll(/class="([^"]*)"/g)].map((m) => m[1]).filter((c) => /(^|\s)pane-toolbar(\s|$)/.test(c));
}

describe('pane-toolbar', () => {
	it('is one 40px row with the 12px gutter, a 4px gap and the divider token as its bottom edge', () => {
		const block = read('src/app.css').match(/@utility pane-toolbar \{([^}]*)\}/)?.[1] ?? '';
		const applied = block.match(/@apply ([^;]*);/)?.[1].split(/\s+/) ?? [];
		expect(applied).toEqual(expect.arrayContaining(['flex', 'h-10', 'shrink-0', 'items-center', 'gap-1', 'px-3', 'border-b', 'border-divider']));
	});

	it.each(TOOLBARS)('%s draws its toolbar with it, without overrides', (path) => {
		const lists = toolbarClassLists(read(path));
		expect(lists).toHaveLength(1);
		expect(lists[0]).not.toMatch(OVERRIDE);
	});
});
