import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source scan: colors outside shadcn's `components/ui` come from theme tokens
 * (`text-success`, `bg-destructive/15`), never from a numbered Tailwind
 * palette shade, which ignores the active theme. Comments are scanned too.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ['src/lib', 'src/routes'];
const SKIP_DIR = 'src/lib/components/ui/';

/** Utility prefixes that take a color, `border` with its side forms. */
const PREFIXES = 'bg|text|border(?:-[xytblrse])?|ring|fill|stroke|outline|decoration|from|via|to';

/** The palette names the installed Tailwind 4 ships (`node_modules/tailwindcss/theme.css`). */
const PALETTES = [
	'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
	'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'mauve', 'mist', 'olive', 'taupe',
].join('|');

/** Optional variants, a prefix, a palette name, a 2 or 3 digit shade and an optional `/alpha`. */
const PALETTE_CLASS = new RegExp(
	`(?<![\\w-])(?:[\\w-]+:)*(?:${PREFIXES})-(?:${PALETTES})-\\d{2,3}(?:/\\d+)?(?![\\w-])`,
);

function sourceFiles(): string[] {
	return SCAN_DIRS.flatMap((dir) =>
		readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
			.filter((name) => /\.(svelte|ts)$/.test(name))
			.map((name) => join(dir, name)),
	).filter((path) => !path.startsWith(SKIP_DIR));
}

describe('no raw palette classes', () => {
	it('matches palette utilities with variants and alpha', () => {
		for (const cls of [
			'text-green-500',
			'dark:text-green-400',
			'bg-red-500/15',
			'hover:bg-amber-500/20',
			'border-l-red-500',
			'border-t-blue-400',
			'ring-violet-500',
			'from-pink-400',
			'fill-taupe-300',
			'text-slate-950',
			'bg-red-50',
		]) {
			expect(PALETTE_CLASS.test(cls), cls).toBe(true);
		}
	});

	it('lets theme tokens and non-shade colors through', () => {
		for (const cls of [
			'text-type-orange',
			'bg-muted',
			'text-white',
			'bg-black/50',
			'border-l-destructive',
			'text-success',
			'ring-offset-2',
			'bg-green',
			'text-green-5',
		]) {
			expect(PALETTE_CLASS.test(cls), cls).toBe(false);
		}
	});

	it('finds no palette class in src/lib or src/routes outside components/ui', () => {
		const files = sourceFiles();
		expect(files).toContain(join('src/lib/features/tasks', 'TasksView.svelte'));
		const uiFile = join(SKIP_DIR, 'button/button.svelte');
		expect(existsSync(join(ROOT, uiFile))).toBe(true);
		expect(files).not.toContain(uiFile);

		const hits: string[] = [];
		for (const file of files) {
			readFileSync(join(ROOT, file), 'utf8')
				.split('\n')
				.forEach((line, i) => {
					if (PALETTE_CLASS.test(line)) hits.push(`${file}:${i + 1}`);
				});
		}
		expect(hits).toEqual([]);
	});
});
