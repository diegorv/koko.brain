import { describe, it, expect } from 'vitest';
import {
	getLifecycleState,
	isFavorite,
	setBooleanFlag,
	removeBooleanFlag,
	toggleOrganized,
	toggleArchived,
	toggleFavorite,
} from '$lib/features/properties/lifecycle.logic';
import type { Property } from '$lib/features/properties/properties.types';

function prop(key: string, value: unknown): Property {
	return { key, value, type: typeof value === 'boolean' ? 'boolean' : 'text' } as Property;
}

describe('getLifecycleState', () => {
	it('returns inbox when no flags', () => {
		expect(getLifecycleState([])).toBe('inbox');
		expect(getLifecycleState([prop('title', 'Hello')])).toBe('inbox');
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

describe('removeBooleanFlag', () => {
	it('removes existing flag', () => {
		const props = [prop('title', 'Hi'), prop('_archived', true)];
		const result = removeBooleanFlag(props, '_archived');
		expect(result.length).toBe(1);
		expect(result[0].key).toBe('title');
	});

	it('no-op when flag absent', () => {
		const props = [prop('title', 'Hi')];
		const result = removeBooleanFlag(props, '_archived');
		expect(result.length).toBe(1);
	});
});

describe('toggleOrganized', () => {
	it('sets _organized to true', () => {
		const result = toggleOrganized([], true);
		expect(result.find((p) => p.key === '_organized')?.value).toBe(true);
	});

	it('removes _archived when organizing', () => {
		const props = [prop('_archived', true)];
		const result = toggleOrganized(props, true);
		expect(result.find((p) => p.key === '_archived')).toBeUndefined();
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
