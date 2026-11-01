import { describe, expect, it } from 'vitest';

import { scanLib } from '../../../../scripts/import-graph.mjs';

/**
 * The markdown editor's `.ts` files reach the app only through the
 * `editorHost` facet and the profiling port (ADR-0003): no store, service,
 * Tauri, feature, plugin or app-logging import. The two fenced-block widgets
 * are the known exception until they leave the editor.
 */

const EDITOR = 'src/lib/core/markdown-editor/';

/** Block widgets still wired to their features; they move out with the renderer registry. */
const EXCEPTIONS = [
	'src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts',
	'src/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.ts',
];

/** Why an import target is forbidden in the editor, or null. */
function forbidden(target: string): string | null {
	if (target.startsWith('@tauri-apps/')) return 'Tauri';
	if (/\.store\.svelte(\.ts)?$/.test(target)) return 'store';
	if (/\.service(\.ts)?$/.test(target)) return 'service';
	if (target.startsWith('src/lib/features/') || target.startsWith('#lib/features/')) return 'feature';
	if (target.startsWith('src/lib/plugins/') || target.startsWith('#lib/plugins/')) return 'plugin';
	if (target === 'src/lib/utils/debug.ts') return 'utils/debug';
	return null;
}

interface Edge {
	from: string;
	to: string | null;
	spec: string | null;
	line: number;
}

describe('markdown editor imports', () => {
	const { edges } = scanLib(process.cwd()) as { edges: Edge[] };
	const editorEdges = edges.filter(
		(e) => e.from.startsWith(EDITOR) && e.from.endsWith('.ts') && !EXCEPTIONS.includes(e.from),
	);

	it('scans the editor sources', () => {
		expect(editorEdges.length).toBeGreaterThan(0);
	});

	it('no editor .ts file imports a store, service, Tauri, feature, plugin or utils/debug', () => {
		const offending = editorEdges.flatMap((e) => {
			const target = e.to ?? e.spec;
			const reason = target === null ? null : forbidden(target);
			return reason ? [`${e.from}:${e.line} -> ${target} (${reason})`] : [];
		});
		expect(offending).toEqual([]);
	});

	it('the exceptions are still real files', () => {
		const files = new Set(edges.map((e) => e.from));
		for (const file of EXCEPTIONS) expect(files.has(file), file).toBe(true);
	});
});
