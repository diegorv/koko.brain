import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { contrastRatio, flatten } from '#lib/utils/color.js';

/**
 * Source scan: the theme builder tunes the muted text tokens to 4.5:1 on their
 * surface, and an alpha modifier (`text-muted-foreground/50`) or a translucent
 * placeholder throws that away. Text and placeholders in `src/lib` and
 * `src/routes`, outside shadcn's `components/ui`, use these tokens at full strength. Comments are blanked
 * before the scan, so a comment may name a class.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ['src/lib', 'src/routes'];
const SKIP_DIR = 'src/lib/components/ui/';

/** The text tokens the builder lifts to 4.5:1, plus the body foreground. */
const TOKENS = 'muted-foreground|right-sidebar-muted-fg|tab-text-inactive|file-explorer-muted-fg|foreground';

/** A `/NN` or `/[...]` alpha modifier. */
const ALPHA = String.raw`/(?:\d+|\[[^\]\s]+\])`;

/** A text token with an alpha, or any placeholder color with an alpha; variants allowed before either. */
const FADED_CLASS = new RegExp(
	String.raw`(?<![\w-])(?:text-(?:${TOKENS})${ALPHA}|placeholder:text-[\w-]+${ALPHA})(?![\w-])`,
	'g',
);

/** Faded classes that stay, by file and exact class, with the reason. */
const ALLOWLIST: { file: string; cls: string; reason: string }[] = [
	{
		file: 'src/lib/plugins/mods/ModDialogHost.svelte',
		cls: 'text-foreground/80',
		reason: 'textarea value matches the components/ui Input value color; foreground at 80% on input-bg is 4.70:1 or more in all 28 audited themes',
	},
	{
		file: 'src/lib/features/event-calendar/EventForm.svelte',
		cls: 'text-foreground/80',
		reason: 'textarea value matches the components/ui Input value color; foreground at 80% on input-bg is 4.70:1 or more in all 28 audited themes',
	},
];

/** Replaces `<!-- -->`, `/* *\/` and `//` comments with spaces, keeping line breaks so line numbers hold. */
function blankComments(src: string): string {
	const blank = (m: string) => m.replace(/[^\n]/g, ' ');
	return src
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/(?<![:\\'"`])\/\/[^\n]*/g, blank);
}

/** Every faded class in a source, as `line cls`. */
function fadedClasses(src: string): { line: number; cls: string }[] {
	const hits: { line: number; cls: string }[] = [];
	blankComments(src)
		.split('\n')
		.forEach((text, i) => {
			for (const m of text.matchAll(FADED_CLASS)) hits.push({ line: i + 1, cls: m[0] });
		});
	return hits;
}

function svelteFiles(): string[] {
	return SCAN_DIRS.flatMap((dir) =>
		readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
			.filter((name) => name.endsWith('.svelte'))
			.map((name) => join(dir, name)),
	).filter((path) => !path.startsWith(SKIP_DIR));
}

describe('muted text tokens at full strength', () => {
	it('matches alpha on the tuned text tokens and on placeholders, with variants', () => {
		for (const [cls, match] of [
			['text-muted-foreground/50', 'text-muted-foreground/50'],
			['hover:text-muted-foreground/60', 'text-muted-foreground/60'],
			['data-[outside-month]:text-muted-foreground/40', 'text-muted-foreground/40'],
			['!text-right-sidebar-muted-fg/70', 'text-right-sidebar-muted-fg/70'],
			['text-tab-text-inactive/60', 'text-tab-text-inactive/60'],
			['text-file-explorer-muted-fg/40', 'text-file-explorer-muted-fg/40'],
			['text-foreground/80', 'text-foreground/80'],
			['text-muted-foreground/[0.5]', 'text-muted-foreground/[0.5]'],
			['placeholder:text-muted-foreground/50', 'placeholder:text-muted-foreground/50'],
			['focus:placeholder:text-right-sidebar-fg/30', 'placeholder:text-right-sidebar-fg/30'],
		]) {
			expect(fadedClasses(cls).map((h) => h.cls), cls).toEqual([match]);
		}
	});

	it('lets full-strength tokens, other tokens and alpha on surfaces through', () => {
		for (const cls of [
			'text-muted-foreground',
			'placeholder:text-muted-foreground',
			'text-right-sidebar-fg/80',
			'bg-muted/30',
			'hover:bg-tab-text-inactive/10',
			'border-muted-foreground/10',
			'text-primary/80',
			'text-foreground',
		]) {
			expect(fadedClasses(cls), cls).toEqual([]);
		}
	});

	it('ignores classes named in comments', () => {
		const src = [
			'<!-- text-muted-foreground/50 -->',
			'/* placeholder:text-muted-foreground/50 */',
			'// text-foreground/80',
			'<a href="https://x.dev" class="text-muted-foreground/50">',
		].join('\n');
		expect(fadedClasses(src)).toEqual([{ line: 4, cls: 'text-muted-foreground/50' }]);
	});

	it('finds no faded text class in a .svelte file under src/lib or src/routes outside components/ui and the allow-list', () => {
		const files = svelteFiles();
		expect(files).toContain(join('src/lib/features/collection', 'CollectionView.svelte'));
		expect(files).toContain(join('src/routes/(app)', '+page.svelte'));
		const uiFile = join(SKIP_DIR, 'input/input.svelte');
		expect(existsSync(join(ROOT, uiFile))).toBe(true);
		expect(files).not.toContain(uiFile);

		const hits: string[] = [];
		const allowed = new Set<string>();
		for (const file of files) {
			for (const { line, cls } of fadedClasses(readFileSync(join(ROOT, file), 'utf8'))) {
				const entry = ALLOWLIST.find((a) => a.file === file && a.cls === cls);
				if (entry) allowed.add(`${entry.file} ${entry.cls}`);
				else hits.push(`${file}:${line} ${cls}`);
			}
		}
		expect(hits).toEqual([]);
		// A stale allow-list entry would silently permit the class again later.
		expect([...allowed].sort()).toEqual(ALLOWLIST.map((a) => `${a.file} ${a.cls}`).sort());
		for (const a of ALLOWLIST) expect(a.reason.length, `${a.file} ${a.cls}`).toBeGreaterThan(0);
	});
});

describe('muted text tokens of the built-in themes', () => {
	/** The token on its surface, as the theme builder pairs them. */
	const PAIRS = [
		['mutedForeground', 'background'],
		['rightSidebarMutedFg', 'rightSidebarBg'],
		['tabTextInactive', 'rightSidebarBg'],
	] as const;

	/** The color at `alpha`, as an 8-digit hex `contrastRatio` composites over the surface. */
	function withAlpha(color: string, alpha: number): string {
		return flatten(color, '#000000')! + Math.round(alpha * 255).toString(16).padStart(2, '0');
	}

	it.each(PAIRS)('%s on %s is at least 4.5:1 in every built-in theme', (fg, bg) => {
		for (const theme of BUILTIN_THEMES) {
			const { ui } = theme.colors;
			expect(contrastRatio(ui[fg], ui[bg])!, theme.name).toBeGreaterThanOrEqual(4.5);
		}
	});

	it.each(PAIRS)('%s at 60%% on %s falls under 4.5:1 in at least one built-in theme', (fg, bg) => {
		const ratios = BUILTIN_THEMES.map((theme) => {
			const { ui } = theme.colors;
			return contrastRatio(withAlpha(ui[fg], 0.6), flatten(ui[bg], '#000000')!)!;
		});
		expect(Math.min(...ratios)).toBeLessThan(4.5);
	});
});
