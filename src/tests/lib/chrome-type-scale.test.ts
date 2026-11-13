import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source scan of the chrome's components for the type-scale rules that no
 * single component test can hold: the small-text floor and the one uppercase
 * section-label style (see the text roles in `src/app.css`). shadcn's
 * `components/ui` is out of scope.
 */

const ROOT = process.cwd();
const SCAN_DIR = 'src/lib';
const SKIP_DIR = 'src/lib/components/ui/';

/** The smallest readable size in the chrome, in px. */
const FLOOR_PX = 11;

/** Sites allowed below the floor, by file: numeric badges only. */
const BELOW_FLOOR: Record<string, string> = {};

/** Uppercase that is not a section label, by file. */
const OWN_UPPERCASE: Record<string, string> = {
	'src/lib/core/settings/BuildInfo.svelte': 'release channel badge',
	'src/lib/features/collection/CollectionCalendarView.svelte': 'weekday column headers',
	'src/lib/features/collection/CollectionLinearCalendarView.svelte': 'weekday column headers',
};

function svelteFiles(): string[] {
	return readdirSync(join(ROOT, SCAN_DIR), { recursive: true, encoding: 'utf8' })
		.filter((name) => name.endsWith('.svelte'))
		.map((name) => join(SCAN_DIR, name))
		.filter((path) => !path.startsWith(SKIP_DIR));
}

/** `file:line` for every line of the chrome's components matching `re`. */
function sites(re: RegExp, keep: (match: RegExpMatchArray) => boolean = () => true): string[] {
	const found: string[] = [];
	for (const path of svelteFiles()) {
		readFileSync(join(ROOT, path), 'utf8')
			.split('\n')
			.forEach((line, i) => {
				for (const match of line.matchAll(re)) {
					if (keep(match)) found.push(`${path}:${i + 1}`);
				}
			});
	}
	return found;
}

const fileOf = (site: string) => site.slice(0, site.lastIndexOf(':'));

describe('chrome type scale', () => {
	it(`has no text below ${FLOOR_PX}px outside numeric badges`, () => {
		const small = sites(/\btext-\[(\d+(?:\.\d+)?)px\]/g, (m) => Number(m[1]) < FLOOR_PX);
		expect(small.filter((site) => !(fileOf(site) in BELOW_FLOOR))).toEqual([]);
	});

	it('keeps the allowed badges at 10px or more', () => {
		const tiny = sites(/\btext-\[(\d+(?:\.\d+)?)px\]/g, (m) => Number(m[1]) < 10);
		expect(tiny).toEqual([]);
	});

	it('styles every uppercase section label with section-label', () => {
		const uppercase = sites(/\buppercase\b/g);
		expect(uppercase.filter((site) => !(fileOf(site) in OWN_UPPERCASE))).toEqual([]);
	});

	it('gives a section label a color at full opacity', () => {
		expect(sites(/\bsection-label\b[^"]*\btext-[\w-]+\/\d+/g)).toEqual([]);
	});
});
