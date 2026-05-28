import { describe, it, expect } from 'vitest';
import { canonicalizeKey } from '$lib/utils/frontmatter-aliases';

describe('canonicalizeKey', () => {
	it('resolves type aliases', () => {
		expect(canonicalizeKey('is_a')).toBe('type');
		expect(canonicalizeKey('is a')).toBe('type');
	});

	it('resolves system underscore aliases', () => {
		expect(canonicalizeKey('organized')).toBe('_organized');
		expect(canonicalizeKey('archived')).toBe('_archived');
		expect(canonicalizeKey('favorite')).toBe('_favorite');
		expect(canonicalizeKey('order')).toBe('_order');
		expect(canonicalizeKey('sort')).toBe('_sort');
		expect(canonicalizeKey('icon')).toBe('_icon');
		expect(canonicalizeKey('color')).toBe('_color');
		expect(canonicalizeKey('template')).toBe('_template');
		expect(canonicalizeKey('view')).toBe('_view');
		expect(canonicalizeKey('visible')).toBe('_visible');
		expect(canonicalizeKey('list_properties_display')).toBe('_list_properties_display');
	});

	it('resolves sidebar_label aliases', () => {
		expect(canonicalizeKey('sidebar_label')).toBe('_sidebar_label');
		expect(canonicalizeKey('sidebar label')).toBe('_sidebar_label');
	});

	it('passes through canonical keys unchanged', () => {
		expect(canonicalizeKey('type')).toBe('type');
		// Relationship keys are underscore-canonical and take no alias.
		expect(canonicalizeKey('_belongs_to')).toBe('_belongs_to');
		expect(canonicalizeKey('_related_to')).toBe('_related_to');
		expect(canonicalizeKey('_has_many')).toBe('_has_many');
		expect(canonicalizeKey('_organized')).toBe('_organized');
		expect(canonicalizeKey('_icon')).toBe('_icon');
	});

	it('passes through unknown keys unchanged', () => {
		expect(canonicalizeKey('title')).toBe('title');
		expect(canonicalizeKey('tags')).toBe('tags');
		expect(canonicalizeKey('custom_field')).toBe('custom_field');
	});
});
