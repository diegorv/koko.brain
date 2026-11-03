import type { Page, Locator } from '@playwright/test';
import { test, expect } from '../../fixtures/live-preview';
import { openFile } from '../../fixtures/helpers';

// A block widget far above the viewport can be rebuilt when ANOTHER note
// changes (the watcher event, then the index bump). Had CodeMirror dropped the
// measured height of that off-screen line, it would re-estimate it at the
// default line height and the text on screen would slide by the difference.
// It does not: these widgets come from ViewPlugins, and CodeMirror's height map
// reads only StateField (static) decorations, so a plugin rebuild off screen
// keeps the measured height. These tests guard that, e.g. against moving the
// collection decorator into a StateField. The measure is the y of a line inside
// `.cm-scroller`, not `scrollTop`.

const VAULT = '/test-vault';
const HOST = 'host.md';
const OTHER = 'Other.md';
const OTHER_PATH = `${VAULT}/${OTHER}`;
const ANCHOR = 'Anchor line.';
/** The largest screen-y change of the anchor line the tests accept, in px. */
const MAX_SHIFT = 5;

const SETTINGS = {
	layout: {
		rightSidebarVisible: false,
		propertiesVisible: false,
		backlinksVisible: false,
		outgoingLinksVisible: false,
		tableOfContentsVisible: false,
	},
	editor: { fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 },
	folderNotes: { enabled: false },
	templates: { folder: '_templates' },
	queryjs: { autoRunQueries: 'always' },
	appearance: {},
};

const filler = (n: number) => Array.from({ length: n }, (_, i) => `Filler paragraph ${i + 1}.\n`).join('\n');

/** `block` near the top, the anchor far below it, and room below the anchor so the view is not clamped at the end. */
const hostNote = (block: string) => `# Host

${block}

${filler(300)}
${ANCHOR}

${filler(10)}`;

const otherNote = (status: string, body: string) => `---
status: ${status}
---

# Other

${body}
`;

/** Seven notes with `status: active`, so the collection block and the queryjs output are tall. */
const ACTIVE_NOTES = Object.fromEntries(
	Array.from({ length: 7 }, (_, i) => [`${VAULT}/Active ${i + 1}.md`, otherNote('active', `Active note ${i + 1}.`)]),
);

const COLLECTION_BLOCK = `\`\`\`collection
filters: "status == 'active'"
views:
  - type: table
    name: Active
    order:
      - file.name
      - status
\`\`\``;

const QUERYJS_BLOCK = `\`\`\`queryjs
for (const p of kb.pages().where((p) => p.status === "active")) kb.paragraph("QJS " + p.file.name);
\`\`\``;

const EMBED_BLOCK = `![[Other]]`;

/** Opens a vault with `files` plus the settings, then opens the host note. */
async function openVault(page: Page, files: Record<string, string>): Promise<void> {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
	await page.evaluate((f) => window.__e2e.fs.populate(f), {
		...files,
		[`${VAULT}/.kokobrain/`]: '',
		[`${VAULT}/.kokobrain/settings.json`]: JSON.stringify(SETTINGS, null, 2),
	});
	await page.evaluate((p) => window.__e2e.dialog.setOpenResponse(p), VAULT);
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[data-rail]').waitFor({ state: 'visible', timeout: 10_000 });
	await openFile(page, HOST);
	await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 15_000 });
}

/** Top of `locator`'s first element relative to the top of `.cm-scroller`, in px. */
async function screenY(locator: Locator): Promise<number> {
	return locator.first().evaluate((el) => {
		const scroller = el.closest('.cm-scroller') ?? document.querySelector('.cm-scroller');
		if (!scroller) throw new Error('screenY: no .cm-scroller');
		return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
	});
}

/** Two animation frames and a pause past the 150 ms scroll debounce, so CodeMirror has measured and redrawn. */
async function settle(page: Page): Promise<void> {
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
	await page.waitForTimeout(300);
}

/** Puts the cursor on the anchor line far below the block and centers it on screen. */
async function parkAtAnchor(page: Page): Promise<Locator> {
	await page.locator('.cm-scroller').evaluate((el) => {
		el.scrollTop = el.scrollHeight;
	});
	await settle(page);
	const anchor = page.locator('.cm-line', { hasText: ANCHOR }).first();
	await anchor.click();
	await anchor.evaluate((el) => el.scrollIntoView({ block: 'center' }));
	await settle(page);
	expect(await page.locator('.cm-scroller').evaluate((el) => el.scrollTop)).toBeGreaterThan(2000);
	return anchor;
}

/** Writes Other.md and reports it the way the Rust watcher does. */
async function writeOther(page: Page, content: string): Promise<void> {
	await page.evaluate(({ path, content }) => window.__e2e.fs.writeFile(path, content), { path: OTHER_PATH, content });
	await page.evaluate((paths) => window.__e2e.events.emit('vault-files-changed', { paths }), [OTHER_PATH]);
}

/** Past the watcher handling, the throttled index bump (~2 s) and the rebuild it triggers. */
async function waitForRerender(page: Page): Promise<void> {
	await page.waitForTimeout(3_000);
	await settle(page);
}

async function scrollToTop(page: Page): Promise<void> {
	await page.locator('.cm-scroller').evaluate((el) => {
		el.scrollTop = 0;
	});
	await settle(page);
}

/** Asserts the anchor line moved less than `MAX_SHIFT` px on screen. */
function expectStill(trigger: string, before: number, after: number): void {
	const shift = after - before;
	expect(Math.abs(shift), `${trigger}: anchor y ${before.toFixed(1)} -> ${after.toFixed(1)}`).toBeLessThan(MAX_SHIFT);
}

test.describe('An off-screen block that re-renders keeps the visible text in place', () => {
	test('collection block: another note starts matching the query', async ({ lpPage: page }) => {
		await openVault(page, {
			...ACTIVE_NOTES,
			[`${VAULT}/${HOST}`]: hostNote(COLLECTION_BLOCK),
			[OTHER_PATH]: otherNote('draft', 'Draft body.'),
		});
		await expect(page.locator('.cm-lp-collection-header')).toHaveText('Active (7)');
		const anchor = await parkAtAnchor(page);
		const before = await screenY(anchor);

		await writeOther(page, otherNote('active', 'Draft body.'));
		await waitForRerender(page);

		expectStill('collection block', before, await screenY(anchor));

		// The block did re-render with the new data.
		await scrollToTop(page);
		await expect(page.locator('.cm-lp-collection-header')).toHaveText('Active (8)');
	});

	test('queryjs block: another note starts matching the script', async ({ lpPage: page }) => {
		await openVault(page, {
			...ACTIVE_NOTES,
			[`${VAULT}/${HOST}`]: hostNote(QUERYJS_BLOCK),
			[OTHER_PATH]: otherNote('draft', 'Draft body.'),
		});
		await expect(page.locator('.cm-lp-qjs-block p')).toHaveCount(7);
		const anchor = await parkAtAnchor(page);
		const before = await screenY(anchor);

		await writeOther(page, otherNote('active', 'Draft body.'));
		await waitForRerender(page);

		expectStill('queryjs block', before, await screenY(anchor));

		// The block re-runs with the new data once it is back on screen.
		await scrollToTop(page);
		await expect(page.locator('.cm-lp-qjs-block p')).toHaveCount(8);
	});

	test('note embed: the embedded note changes', async ({ lpPage: page }) => {
		const shortBody = 'Embedded first line.';
		await openVault(page, {
			[`${VAULT}/${HOST}`]: hostNote(EMBED_BLOCK),
			[OTHER_PATH]: otherNote('draft', shortBody),
		});
		await expect(page.locator('.cm-lp-embed-content')).toContainText(shortBody);
		const anchor = await parkAtAnchor(page);
		const before = await screenY(anchor);

		const longBody = Array.from({ length: 12 }, (_, i) => `Embedded line ${i + 1}.`).join('\n\n');
		await writeOther(page, otherNote('draft', longBody));
		await waitForRerender(page);

		expectStill('note embed', before, await screenY(anchor));

		// The embed shows the new content once it is back on screen.
		await scrollToTop(page);
		await expect(page.locator('.cm-lp-embed-content')).toContainText('Embedded line 12.');
	});
});
