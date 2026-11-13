import { describe, it, expect } from 'vitest';
import {
	getLifecycleState,
	isFavorite,
	isOrganized,
	setBooleanFlag,
	toggleOrganized,
	toggleArchived,
	toggleFavorite,
} from '#lib/features/properties/lifecycle.logic.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

function prop(key: string, value: unknown): Property {
	return { key, value, type: typeof value === 'boolean' ? 'boolean' : 'text' } as Property;
}

describe('getLifecycleState', () => {
	it('returns organized when no flags', () => {
		// A missing _organized reads as organized, as in the Rust index.
		expect(getLifecycleState([])).toBe('organized');
		expect(getLifecycleState([prop('title', 'Hello')])).toBe('organized');
	});

	it('returns organized when _organized true', () => {
		expect(getLifecycleState([prop('_organized', true)])).toBe('organized');
	});

	it('returns archived when _archived true (overrides organized)', () => {
		expect(getLifecycleState([prop('_organized', true), prop('_archived', true)])).toBe('archived');
	});

	it('returns inbox when _organized false', () => {
		expect(getLifecycleState([prop('_organized', false)])).toBe('inbox');
	});
});

/**
 * The same frontmatter, read by Rust (`NoteEntry::from_content`) and by the
 * TS lifecycle helpers. `organized` / `archived` are copied from the Rust tests
 * `from_content_lifecycle_flags_*` and `from_content_organized_flag_from_canonical_key`
 * in `src-tauri/src/vault/entry.rs`.
 */
const RUST_LIFECYCLE_ROWS = [
	{ name: 'no _organized key', content: '---\ntitle: Hello\n---\n', organized: true, archived: false, state: 'organized' },
	{ name: '_organized: true', content: '---\n_organized: true\n---\n', organized: true, archived: false, state: 'organized' },
	{ name: '_organized: false', content: '---\n_organized: false\n---\n', organized: false, archived: false, state: 'inbox' },
	{ name: '_organized: yes (not a boolean)', content: '---\n_organized: yes\n---\n', organized: true, archived: false, state: 'organized' },
	{ name: '_archived: true alone', content: '---\n_archived: true\n---\n', organized: true, archived: true, state: 'archived' },
] as const;

describe('lifecycle helpers read _organized like the Rust index', () => {
	it.each(RUST_LIFECYCLE_ROWS)('$name', ({ content, organized, state }) => {
		const props = parseFrontmatterProperties(content);

		expect(isOrganized(props)).toBe(organized);
		expect(getLifecycleState(props)).toBe(state);
	});

	it.each(RUST_LIFECYCLE_ROWS)('$name: isInboxEntry agrees with getLifecycleState', ({ content, organized, archived }) => {
		const props = parseFrontmatterProperties(content);
		const entry = entryV2('/vault/n.md', { organized, archived });

		expect(isInboxEntry(entry)).toBe(getLifecycleState(props) === 'inbox');
	});
});

describe('isFavorite', () => {
	it('returns false when no _favorite', () => {
		expect(isFavorite([])).toBe(false);
	});

	it('returns true when _favorite is true', () => {
		expect(isFavorite([prop('_favorite', true)])).toBe(true);
	});

	it('returns false when _favorite is false', () => {
		expect(isFavorite([prop('_favorite', false)])).toBe(false);
	});
});

describe('isOrganized', () => {
	it('returns true when no _organized', () => {
		// A missing _organized reads as organized, as in the Rust index.
		expect(isOrganized([])).toBe(true);
	});

	it('returns true when _organized is true, even on an archived note', () => {
		expect(isOrganized([prop('_organized', true)])).toBe(true);
		expect(isOrganized([prop('_organized', true), prop('_archived', true)])).toBe(true);
	});

	it('returns false only when _organized is the boolean false', () => {
		expect(isOrganized([prop('_organized', false)])).toBe(false);
		// A non-boolean _organized reads as organized, as in the Rust index.
		expect(isOrganized([prop('_organized', 'yes')])).toBe(true);
	});
});

describe('setBooleanFlag', () => {
	it('adds flag when not present', () => {
		const result = setBooleanFlag([], '_organized', true);
		expect(result).toEqual([{ key: '_organized', value: true, type: 'boolean' }]);
	});

	it('updates existing flag', () => {
		const props = [prop('_organized', false)];
		const result = setBooleanFlag(props, '_organized', true);
		expect(result[0].value).toBe(true);
	});

	it('does not mutate original', () => {
		const props = [prop('_organized', false)];
		setBooleanFlag(props, '_organized', true);
		expect(props[0].value).toBe(false);
	});
});

describe('toggleOrganized', () => {
	it('sets _organized to true', () => {
		const result = toggleOrganized([], true);
		expect(result.find((p) => p.key === '_organized')?.value).toBe(true);
	});

	it('keeps _archived when organizing an archived note', () => {
		const props = [prop('_archived', true)];
		const result = toggleOrganized(props, true);
		expect(result.find((p) => p.key === '_archived')?.value).toBe(true);
		expect(result.find((p) => p.key === '_organized')?.value).toBe(true);
	});

	it('sets _organized to false', () => {
		const props = [prop('_organized', true)];
		const result = toggleOrganized(props, false);
		expect(result.find((p) => p.key === '_organized')?.value).toBe(false);
	});
});

describe('toggleArchived', () => {
	it('sets _archived to true', () => {
		const result = toggleArchived([], true);
		expect(result.find((p) => p.key === '_archived')?.value).toBe(true);
	});

	it('sets _archived to false', () => {
		const props = [prop('_archived', true)];
		const result = toggleArchived(props, false);
		expect(result.find((p) => p.key === '_archived')?.value).toBe(false);
	});
});

describe('toggleFavorite', () => {
	it('sets _favorite to true', () => {
		const result = toggleFavorite([], true);
		expect(result.find((p) => p.key === '_favorite')?.value).toBe(true);
	});

	it('sets _favorite to false', () => {
		const props = [prop('_favorite', true)];
		const result = toggleFavorite(props, false);
		expect(result.find((p) => p.key === '_favorite')?.value).toBe(false);
	});
});
