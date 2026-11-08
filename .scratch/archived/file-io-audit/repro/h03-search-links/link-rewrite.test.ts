/**
 * Repro (h03: rename-move-delete-4 and fidelity-13).
 *
 * `replaceWikilinks` compares the whole link target with the bare note name,
 * so a path-qualified link such as `[[Work/Plan]]` is never rewritten. The
 * link still resolves to the renamed note through the basename fallback, so
 * after the rename it dangles. The same function has no code-fence awareness,
 * so a `[[Old Note]]` inside a fenced example is rewritten too.
 *
 * Pure logic, no mocks. The tests assert the CORRECT behavior and fail while
 * the bugs exist.
 */
import { describe, it, expect } from 'vitest';
import { replaceWikilinks } from '#lib/core/filesystem/link-updater.logic.js';
import { resolveWikilink } from '#lib/core/filesystem/wikilink-resolution.logic.js';

describe('h03 repro: wikilink rewrite on rename', () => {
	it('keeps a path-qualified link resolving to the renamed note', () => {
		const rewritten = replaceWikilinks('See [[Work/Plan]]', 'Plan', 'Roadmap');
		const target = /\[\[([^\]|#]*)/.exec(rewritten)?.[1] ?? '';
		// After the rename the note lives at Work/Roadmap.md.
		expect(resolveWikilink(target, ['/vault/Work/Roadmap.md'])).toBe('/vault/Work/Roadmap.md');
	});

	it('leaves wikilinks inside a fenced code block untouched', () => {
		const content = '```md\n[[Old Note]]\n```\n';
		expect(replaceWikilinks(content, 'Old Note', 'New Note')).toBe(content);
	});
});
