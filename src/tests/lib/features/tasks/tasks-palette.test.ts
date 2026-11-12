import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Source scan: no raw Tailwind palette class (`text-purple-400`) in the Tasks
 * feature; its colors come from theme tokens. Issue 198's architecture test
 * replaces this file once it covers `src/lib/features/tasks/`.
 */

const ROOT = process.cwd();
const TASKS_DIR = join(ROOT, 'src/lib/features/tasks');

/** Issue 198's prefix list, `border` with its side forms. */
const PREFIXES = 'bg|text|border(?:-[xytblrse])?|ring|fill|stroke|outline|decoration|from|via|to';

/** The palette names Tailwind ships. */
const PALETTES = [
	'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
	'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'mauve', 'mist', 'olive', 'taupe',
].join('|');

/** Optional variants, a prefix, a palette name, a 2 or 3 digit shade and an optional `/opacity`. */
const PALETTE_CLASS = new RegExp(
	`(?<![\\w-])(?:[\\w-]+:)*(?:${PREFIXES})-(?:${PALETTES})-\\d{2,3}(?:/\\d+)?(?![\\w-])`,
);

/** Every `.svelte` and `.ts` file under `dir`. */
function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.(svelte|ts)$/.test(entry.name) ? [path] : [];
	});
}

describe('tasks palette guard', () => {
	it('flags palette classes and passes theme tokens', () => {
		for (const cls of ['text-purple-400', 'hover:bg-red-500/15', 'dark:border-l-slate-200', 'to-sky-950']) {
			expect(PALETTE_CLASS.test(cls), cls).toBe(true);
		}
		for (const cls of ['text-primary', 'bg-primary/20', 'border-border/50', 'text-muted-foreground']) {
			expect(PALETTE_CLASS.test(cls), cls).toBe(false);
		}
	});

	it('finds no palette class in src/lib/features/tasks/', () => {
		const files = sourceFiles(TASKS_DIR);
		const scanned = files.map((f) => relative(TASKS_DIR, f));
		expect(scanned).toContain('TasksView.svelte');
		expect(scanned).toContain('tasks.logic.ts');

		const hits: string[] = [];
		for (const file of files) {
			readFileSync(file, 'utf8')
				.split('\n')
				.forEach((line, i) => {
					if (PALETTE_CLASS.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}`);
				});
		}
		expect(hits).toEqual([]);
	});
});
