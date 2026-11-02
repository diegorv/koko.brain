// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

Element.prototype.scrollTo = () => {};

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null), convertFileSrc: (p: string) => p }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(async () => {}),
	exists: vi.fn(async () => false),
	mkdir: vi.fn(async () => {}),
	readDir: vi.fn(async () => []),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));

import { mount, unmount, flushSync } from 'svelte';
import { readTextFile } from '@tauri-apps/plugin-fs';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { NOOP_HOST, type EditorHost } from '#lib/core/markdown-editor/editor-host.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { MetaBindButtonWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.js';
import type { ButtonConfig } from '#lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.js';

const A = '/vault/A.md';
const B = '/vault/B.md';
const A_DOC = '---\nstatus: todo\n---\n\nNote A holds the button.\n';
const B_DOC = '---\nstatus: draft\nowner: bob\n---\n\nNote B is the link target.\n';

/** The app host's `openLink` is `await openFileInEditor(path)` (app/editor-host.ts). */
const host: EditorHost = {
	...NOOP_HOST,
	resolveLink: (target) => (target === 'B' ? B : null),
	openLink: async (path) => {
		await openFileInEditor(path);
	},
};

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

async function settle(): Promise<void> {
	for (let i = 0; i < 20; i++) await Promise.resolve();
	flushSync();
}

describe('F104: meta-bind button [open, updateMetadata] sequence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		flushSync();
		vi.mocked(readTextFile).mockImplementation(async (p) => (String(p) === B ? B_DOC : A_DOC));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	for (const bOpen of [true, false]) {
		it(`writes status into the button's own note, not the opened note (B ${bOpen ? 'already open' : 'not open'})`, async () => {
			editorStore.addTab({ path: A, name: 'A.md', content: A_DOC, savedContent: A_DOC });
			if (bOpen) {
				editorStore.addTab({ path: B, name: 'B.md', content: B_DOC, savedContent: B_DOC });
				editorStore.setActiveIndex(0);
			}
			target = document.body.appendChild(document.createElement('div'));
			component = mount(MarkdownEditor, { target, props: { host, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks } });
			flushSync();

			const view = editorStore.editorView!;
			const config: ButtonConfig = {
				label: 'Go',
				style: 'default',
				actions: [
					{ type: 'open', link: '[[B]]' },
					{ type: 'updateMetadata', bindTarget: 'status', value: 'done' },
				],
			};
			const dom = new MetaBindButtonWidget(config).toDOM(view);
			document.body.appendChild(dom);
			dom.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
			await settle();
			await new Promise((r) => setTimeout(r, 0)); // the dynamic import('../widgets') in the action
			await settle();

			expect(editorStore.activeTabPath).toBe(B);
			const b = editorStore.tabs.find((t) => t.path === B)!;
			expect(b.content).toBe(B_DOC);
			dom.remove();
		});
	}
});
