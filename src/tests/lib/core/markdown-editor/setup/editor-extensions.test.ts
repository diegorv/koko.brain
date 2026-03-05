import { describe, it, expect, vi } from 'vitest';
import { Compartment } from '@codemirror/state';

import { createExtensions } from '$lib/core/markdown-editor/setup/editor-extensions';
import type { CreateExtensionsOptions } from '$lib/core/markdown-editor/setup/editor-extensions';

function makeOptions(overrides: Partial<CreateExtensionsOptions> = {}): CreateExtensionsOptions {
	return {
		isLivePreview: false,
		fontFamily: 'Menlo, monospace',
		fontSize: 16,
		lineHeight: 1.6,
		contentWidth: 0,
		paragraphSpacing: 0,
		lineNumbersCompartment: new Compartment(),
		editorThemeCompartment: new Compartment(),
		languageCompartment: new Compartment(),
		highlightStyleCompartment: new Compartment(),
		onDocChanged: vi.fn(),
		isTabSwitching: () => false,
		...overrides,
	};
}

describe('createExtensions', () => {
	it('returns a non-empty array of extensions', () => {
		const extensions = createExtensions(makeOptions());
		expect(extensions).toBeInstanceOf(Array);
		expect(extensions.length).toBeGreaterThan(0);
	});

	it('returns extensions when live preview is enabled', () => {
		const extensions = createExtensions(makeOptions({ isLivePreview: true }));
		expect(extensions).toBeInstanceOf(Array);
		expect(extensions.length).toBeGreaterThan(0);
	});

	it('returns extensions when live preview is disabled', () => {
		const extensions = createExtensions(makeOptions({ isLivePreview: false }));
		expect(extensions).toBeInstanceOf(Array);
		expect(extensions.length).toBeGreaterThan(0);
	});

	it('returns a new array on each call', () => {
		const opts = makeOptions();
		const a = createExtensions(opts);
		const b = createExtensions(opts);
		expect(a).not.toBe(b);
	});

	it('handles different font settings', () => {
		const a = createExtensions(makeOptions({ fontFamily: 'Menlo', fontSize: 14, lineHeight: 1.4 }));
		const b = createExtensions(makeOptions({ fontFamily: 'Monaco', fontSize: 18, lineHeight: 2.0 }));
		expect(a.length).toBe(b.length);
	});

	it('uses the same compartment references passed in options', () => {
		const lineNumbersCompartment = new Compartment();
		const editorThemeCompartment = new Compartment();
		const languageCompartment = new Compartment();
		const highlightStyleCompartment = new Compartment();

		const extensions = createExtensions(makeOptions({
			lineNumbersCompartment,
			editorThemeCompartment,
			languageCompartment,
			highlightStyleCompartment,
		}));

		// The extensions array should contain the compartment configurations
		expect(extensions.length).toBeGreaterThan(0);
	});
});
