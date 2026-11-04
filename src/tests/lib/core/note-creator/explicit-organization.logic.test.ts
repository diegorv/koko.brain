import { describe, expect, it } from 'vitest';
import {
	applyExplicitOrganization,
	withUnorganizedFlag,
} from '#lib/core/note-creator/explicit-organization.logic.js';

/** How many top-level `_organized:` lines `content` holds. */
function organizedCount(content: string): number {
	return content.split(/\r?\n/).filter((line) => /^_organized:/.test(line)).length;
}

describe('withUnorganizedFlag', () => {
	it('gives empty content a block holding only the key', () => {
		expect(withUnorganizedFlag('')).toBe('---\n_organized: false\n---\n');
	});

	it('prepends a block to a body without frontmatter', () => {
		expect(withUnorganizedFlag('# Title\n\nBody\n')).toBe('---\n_organized: false\n---\n# Title\n\nBody\n');
	});

	it('inserts the key right after the opening line, keeping the rest of the block byte for byte', () => {
		const content = '---\n_type: Person\ntags:\n  - a   \n---\n\nBody';
		expect(withUnorganizedFlag(content)).toBe('---\n_organized: false\n_type: Person\ntags:\n  - a   \n---\n\nBody');
	});

	it('keeps CRLF line endings', () => {
		const content = '---\r\ntitle: Hello\r\n---\r\nBody\r\n';
		expect(withUnorganizedFlag(content)).toBe('---\r\n_organized: false\r\ntitle: Hello\r\n---\r\nBody\r\n');
	});

	it('fills an empty block instead of stacking a second one', () => {
		expect(withUnorganizedFlag('---\n---\nBody')).toBe('---\n_organized: false\n---\nBody');
		expect(withUnorganizedFlag('---\n---')).toBe('---\n_organized: false\n---');
		expect(withUnorganizedFlag('---\r\n---\r\n')).toBe('---\r\n_organized: false\r\n---\r\n');
	});

	it.each([
		['_organized: true', '---\n_organized: true\n---\nBody'],
		['_organized: false', '---\ntitle: x\n_organized: false\n---\nBody'],
		['the organized: alias', '---\norganized: true\n---\nBody'],
	])('leaves content unchanged when %s is already set', (_label, content) => {
		expect(withUnorganizedFlag(content)).toBe(content);
	});

	it('does not count an indented or body line as the key', () => {
		const content = '---\nmeta:\n  _organized: true\n---\n_organized: true\n';
		const result = withUnorganizedFlag(content);
		expect(result).toBe('---\n_organized: false\nmeta:\n  _organized: true\n---\n_organized: true\n');
	});

	it('adds the key to frontmatter holding a comment', () => {
		const content = '---\n# keep me\ntitle: x # trailing\n---\n';
		expect(withUnorganizedFlag(content)).toBe('---\n_organized: false\n# keep me\ntitle: x # trailing\n---\n');
	});

	it('adds the key to unparseable frontmatter without throwing', () => {
		const content = '---\ntitle: a: b: [unclosed\n  - : :\n---\nBody';
		const result = withUnorganizedFlag(content);
		expect(result).toBe('---\n_organized: false\ntitle: a: b: [unclosed\n  - : :\n---\nBody');
		expect(organizedCount(result)).toBe(1);
	});

	it('prepends a block when the opening delimiter is never closed', () => {
		expect(withUnorganizedFlag('---\ntitle: x\n')).toBe('---\n_organized: false\n---\n---\ntitle: x\n');
	});
});

describe('applyExplicitOrganization', () => {
	const content = '---\ntitle: x\n---\nBody';

	it('returns the content unchanged when the switch is off', () => {
		expect(applyExplicitOrganization(content, false)).toBe(content);
		expect(applyExplicitOrganization('', false)).toBe('');
	});

	it('returns the withUnorganizedFlag result when the switch is on', () => {
		expect(applyExplicitOrganization(content, true)).toBe(withUnorganizedFlag(content));
		expect(applyExplicitOrganization('', true)).toBe('---\n_organized: false\n---\n');
	});
});
