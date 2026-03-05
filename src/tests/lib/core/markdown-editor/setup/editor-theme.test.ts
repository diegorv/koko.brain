import { describe, it, expect } from 'vitest';

import { buildEditorTheme } from '$lib/core/markdown-editor/setup/editor-theme';

describe('buildEditorTheme', () => {
	it('returns a valid Extension', () => {
		const theme = buildEditorTheme('Menlo, monospace', 16, 1.6, 0, 0);
		expect(theme).toBeDefined();
	});

	it('returns a new instance on each call with same params', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		const b = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different font families', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		const b = buildEditorTheme('Monaco', 16, 1.6, 0, 0);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different font sizes', () => {
		const a = buildEditorTheme('Menlo', 14, 1.6, 0, 0);
		const b = buildEditorTheme('Menlo', 18, 1.6, 0, 0);
		expect(a).not.toBe(b);
	});

	it('returns different instances for different line heights', () => {
		const a = buildEditorTheme('Menlo', 16, 1.4, 0, 0);
		const b = buildEditorTheme('Menlo', 16, 2.0, 0, 0);
		expect(a).not.toBe(b);
	});

	it('handles empty font family', () => {
		const theme = buildEditorTheme('', 16, 1.6, 0, 0);
		expect(theme).toBeDefined();
	});

	it('handles zero font size', () => {
		const theme = buildEditorTheme('Menlo', 0, 1.6, 0, 0);
		expect(theme).toBeDefined();
	});

	it('returns different instances for different paragraph spacing', () => {
		const a = buildEditorTheme('Menlo', 16, 1.6, 0, 0);
		const b = buildEditorTheme('Menlo', 16, 1.6, 0, 0.5);
		expect(a).not.toBe(b);
	});

	it('uses paddingBottom (not marginBottom) for paragraph spacing to preserve click targets', () => {
		const theme = buildEditorTheme('Menlo', 16, 1.6, 0, 0.5);
		const themeStr = JSON.stringify(theme);
		expect(themeStr).toContain('padding-bottom');
		expect(themeStr).not.toContain('margin-bottom');
	});
});
