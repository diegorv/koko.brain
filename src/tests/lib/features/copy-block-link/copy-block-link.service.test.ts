import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// No mocks for stores or logic files — use real implementations per CLAUDE.md

import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { copyBlockLink, copyBlockLinkToClipboard, copyBlockEmbedToClipboard } from '#lib/features/copy-block-link/copy-block-link.service.js';

function createMockView(lineText: string, cursorPos = 0) {
	return {
		state: {
			selection: { main: { head: cursorPos } },
			doc: {
				lineAt: vi.fn(() => ({
					text: lineText,
					to: lineText.length,
				})),
			},
		},
		dispatch: vi.fn(),
	} as any;
}

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.defineProperty(globalThis, 'navigator', {
	value: { clipboard: { writeText: mockWriteText } },
	writable: true,
});

describe('copyBlockLink', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		// Set up an active tab so editorStore.activeTabPath returns a valid path
		editorStore.addTab({
			path: '/vault/note.md',
			name: 'note.md',
			content: '',
			savedContent: '',
		});
		mockWriteText.mockResolvedValue(undefined);
	});

	it('does nothing when no active tab path', async () => {
		editorStore.reset(); // No tabs → no active path
		const view = createMockView('some text');

		await copyBlockLink(view, false);

		expect(mockWriteText).not.toHaveBeenCalled();
	});

	it('does nothing on empty lines', async () => {
		const view = createMockView('   ');

		await copyBlockLink(view, false);

		expect(mockWriteText).not.toHaveBeenCalled();
	});

	it('copies heading link without block id', async () => {
		const view = createMockView('## My Heading');

		await copyBlockLink(view, false);

		// Real detectBlockElement detects heading, real buildWikilinkText builds the link
		expect(mockWriteText).toHaveBeenCalledWith('[[note#My Heading]]');
		expect(view.dispatch).not.toHaveBeenCalled();
	});

	it('generates and inserts block id for non-heading blocks', async () => {
		const view = createMockView('- [ ] a task');

		await copyBlockLink(view, false);

		// Real detectBlockElement detects list-item, real generateBlockId creates a random ID
		// Verify the dispatch was called to insert a block ID at the end of the line
		expect(view.dispatch).toHaveBeenCalledTimes(1);
		const dispatchArg = view.dispatch.mock.calls[0][0];
		expect(dispatchArg.changes.from).toBe(12); // line.to = lineText.length
		expect(dispatchArg.changes.insert).toMatch(/^ \^[a-z0-9]{6}$/);

		// Verify clipboard received a wikilink with a block ID
		expect(mockWriteText).toHaveBeenCalledTimes(1);
		const clipboardText = mockWriteText.mock.calls[0][0];
		expect(clipboardText).toMatch(/^\[\[note#\^[a-z0-9]{6}\]\]$/);
	});

	it('uses existing block id without inserting', async () => {
		const view = createMockView('some block ^existing');

		await copyBlockLink(view, false);

		// Real detectBlockElement extracts existing block ID
		expect(view.dispatch).not.toHaveBeenCalled();
		expect(mockWriteText).toHaveBeenCalledWith('[[note#^existing]]');
	});

	it('passes embed=true to buildWikilinkText', async () => {
		const view = createMockView('## Heading');

		await copyBlockLink(view, true);

		// Real buildWikilinkText adds "!" prefix for embeds
		expect(mockWriteText).toHaveBeenCalledWith('![[note#Heading]]');
	});

	it('shows toast and logs via the project logger when clipboard write fails for heading', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const view = createMockView('## Heading');
		mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

		await copyBlockLink(view, false);

		expect(toast.error).toHaveBeenCalledWith('Failed to copy link to clipboard.');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('COPY-BLOCK-LINK'),
			'Failed to copy link to clipboard:',
			expect.any(Error),
		);
		consoleErrorSpy.mockRestore();
	});

	it('shows toast and logs via the project logger when clipboard write fails for block', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const view = createMockView('some block ^existing');
		mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

		await copyBlockLink(view, false);

		expect(toast.error).toHaveBeenCalledWith('Failed to copy link to clipboard.');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('COPY-BLOCK-LINK'),
			'Failed to copy link to clipboard:',
			expect.any(Error),
		);
		consoleErrorSpy.mockRestore();
	});

	it('confirms a copied heading link', async () => {
		await copyBlockLink(createMockView('## Heading'), false);

		expect(toast.success).toHaveBeenCalledWith('Block link copied');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('confirms a copied block embed', async () => {
		await copyBlockLink(createMockView('some block ^existing'), true);

		expect(mockWriteText).toHaveBeenCalledWith('![[note#^existing]]');
		expect(toast.success).toHaveBeenCalledWith('Block embed copied');
	});

	it('confirms a copied block link', async () => {
		await copyBlockLink(createMockView('- [ ] a task'), false);

		expect(toast.success).toHaveBeenCalledWith('Block link copied');
	});

	it('tells the user to place the cursor on a block on an empty line', async () => {
		const view = createMockView('   ');

		await copyBlockLink(view, false);

		expect(toast.info).toHaveBeenCalledWith('Place the cursor on a block');
		expect(mockWriteText).not.toHaveBeenCalled();
		expect(view.dispatch).not.toHaveBeenCalled();
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('fires no success toast when the clipboard write fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

		await copyBlockLink(createMockView('## Heading'), false);
		await copyBlockLink(createMockView('- [ ] a task'), false);

		expect(toast.error).toHaveBeenCalledTimes(2);
		expect(toast.success).not.toHaveBeenCalled();
		vi.mocked(console.error).mockRestore();
	});

	it('inserts the block id before writing to the clipboard', async () => {
		const view = createMockView('- [ ] a task');

		await copyBlockLink(view, false);

		expect(view.dispatch.mock.invocationCallOrder[0]).toBeLessThan(mockWriteText.mock.invocationCallOrder[0]);
	});
});

describe('copyBlockLinkToClipboard / copyBlockEmbedToClipboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		editorStore.addTab({
			path: '/vault/note.md',
			name: 'note.md',
			content: '',
			savedContent: '',
		});
		mockWriteText.mockResolvedValue(undefined);
	});

	it('copyBlockLinkToClipboard calls copyBlockLink with embed=false', async () => {
		const view = createMockView('## H');

		await copyBlockLinkToClipboard(view);

		// Real logic produces a non-embed heading link
		expect(mockWriteText).toHaveBeenCalledWith('[[note#H]]');
	});

	it('copyBlockEmbedToClipboard calls copyBlockLink with embed=true', async () => {
		const view = createMockView('## H');

		await copyBlockEmbedToClipboard(view);

		// Real logic produces an embed heading link
		expect(mockWriteText).toHaveBeenCalledWith('![[note#H]]');
	});
});
