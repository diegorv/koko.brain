import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

// The Properties panel re-parses the active note on a 300 ms debounce. Inside
// that window a panel commit around a tab switch must not write note A's
// properties into note B, and a panel edit right before the switch must not
// leave A's properties on screen for B. The page clock is paused across the
// switch so "within 300 ms" holds on every run; with real timers a slow run
// would leave the window and the spec would pass even with that bug present.
test.use({ clockTime: '2026-10-30T10:00:00' });

const A_NAME = '19-meta-bind.md';
const B_NAME = '10-tables.md';
const A_PATH = `${TEST_VAULT_PATH}/${A_NAME}`;
const B_PATH = `${TEST_VAULT_PATH}/${B_NAME}`;

const A_CONTENT = `---
status: todo
prioridade: media
---

# Meta bind

Status: \`INPUT[inlineSelect(todo, doing, done):status]\`

Plain text at the end.
`;

const B_CONTENT = `# Tables

| a | b | c |
|---|---|---|
| 1 | | 3 |
`;

/** Past the 300 ms re-parse debounce and the 500 ms frontmatter auto-save. */
const SETTLE_MS = 2_000;

/**
 * The active editor's document. Reads the CodeMirror view behind
 * `.cm-content` through the DOM back-reference `EditorView.findFromDOM` uses,
 * because the spec cannot import the page's CodeMirror module.
 */
async function editorDoc(page: Page): Promise<string> {
	return page.evaluate(() => {
		const content = document.querySelector('.cm-content') as
			| (Element & { cmTile?: { root?: { view?: { state: { doc: { toString(): string } } } } } })
			| null;
		const view = content?.cmTile?.root?.view;
		if (!view) throw new Error('No CodeMirror view behind .cm-content');
		return view.state.doc.toString();
	});
}

async function savedFile(page: Page, path: string): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), path);
}

function tab(page: Page, name: string) {
	return page.locator('[role="tab"]', { hasText: name });
}

async function expectActive(page: Page, name: string): Promise<void> {
	await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText(name);
}

/** Keys of the property rows the Properties panel shows. */
async function panelKeys(page: Page): Promise<string[]> {
	return page.locator('input[data-property-key]').evaluateAll((inputs) =>
		inputs.map((i) => (i as HTMLInputElement).value),
	);
}

/** Seeds A and B, opens both in tabs and leaves A active with its properties shown. */
async function openBothNotes(page: Page): Promise<void> {
	await page.evaluate(
		({ files }) => window.__e2e.fs.populate(files),
		{ files: { [A_PATH]: A_CONTENT, [B_PATH]: B_CONTENT } },
	);
	await page.evaluate(
		({ paths }) => window.__e2e.events.emit('vault-files-changed', { paths }),
		{ paths: [A_PATH, B_PATH] },
	);
	await openTreeItem(page, A_NAME);
	await openTreeItem(page, B_NAME);
	await tab(page, A_NAME).click();
	await expectActive(page, A_NAME);
	await expect.poll(() => panelKeys(page)).toEqual(['prioridade', 'status']);
}

/**
 * Stops the page's timers: from here until `runFor`, no debounce fires, so
 * every later step happens inside the panel's 300 ms re-parse window.
 */
async function pauseClock(page: Page): Promise<void> {
	const now = await page.evaluate(() => Date.now());
	await page.clock.pauseAt(now + 1_000);
}

/**
 * Edits A's `prioridade` value in the panel (it commits on input). Rows are
 * sorted by key, so `prioridade` is the first one (checked in openBothNotes).
 */
async function editPrioridadeInPanel(page: Page): Promise<void> {
	const row = page.locator('div.group').filter({ has: page.locator('input[data-property-key]') }).first();
	await row.locator('input:not([data-property-key])').fill('alta');
}

/** Adds an empty `foo` property through the panel's "Add property" row. */
async function addPropertyInPanel(page: Page): Promise<void> {
	await page.locator('button', { hasText: 'Add property' }).click();
	const input = page.getByPlaceholder('Property name...');
	await input.fill('foo');
	await input.press('Enter');
}

async function switchToB(page: Page): Promise<void> {
	await tab(page, B_NAME).click();
	await expectActive(page, B_NAME);
}

/** B's editor and saved file hold B's body with `foo` and none of A's properties. */
async function expectBHasOnlyFoo(page: Page): Promise<void> {
	const doc = await editorDoc(page);
	expect(doc).toContain('foo');
	expect(doc).not.toContain('status');
	expect(doc).not.toContain('prioridade');
	expect(doc).toContain(B_CONTENT);

	await expect.poll(() => savedFile(page, B_PATH)).toContain('foo');
	const file = await savedFile(page, B_PATH);
	expect(file).not.toContain('status');
	expect(file).not.toContain('prioridade');
	expect(file).toContain(B_CONTENT);

	expect(await panelKeys(page)).toEqual(['foo']);
}

test.describe('Properties panel never writes across notes', () => {
	test('a panel edit in A, a fast switch and a panel action in B leave A out of B', async ({
		vaultPage: page,
	}) => {
		await openBothNotes(page);
		await pauseClock(page);

		await editPrioridadeInPanel(page);
		await switchToB(page);
		await addPropertyInPanel(page);
		await page.clock.runFor(SETTLE_MS);

		await expectBHasOnlyFoo(page);
		await expect.poll(() => savedFile(page, A_PATH)).toContain('prioridade: alta');
	});

	test('a meta-bind select change in A, a fast switch and a panel action in B leave A out of B', async ({
		vaultPage: page,
	}) => {
		await openBothNotes(page);
		// The select renders only while the cursor is off its line.
		await page.locator('.cm-line', { hasText: 'Plain text at the end' }).click();
		const select = page.locator('.cm-lp-meta-bind-select').first();
		await expect(select).toHaveValue('todo');
		await pauseClock(page);

		await select.selectOption('doing');
		await expect.poll(() => editorDoc(page)).toContain('status: doing');
		await switchToB(page);
		await addPropertyInPanel(page);
		await page.clock.runFor(SETTLE_MS);

		await expectBHasOnlyFoo(page);
		await expect.poll(() => savedFile(page, A_PATH)).toContain('status: doing');
	});

	test('after a panel edit in A and a fast switch, the panel shows B once the debounce has passed', async ({
		vaultPage: page,
	}) => {
		await openBothNotes(page);
		await pauseClock(page);

		await editPrioridadeInPanel(page);
		await switchToB(page);
		await page.clock.runFor(SETTLE_MS);

		await expect(page.locator('button', { hasText: 'Add property' })).toBeVisible();
		expect(await panelKeys(page)).toEqual([]);
		expect(await editorDoc(page)).toBe(B_CONTENT);
		expect(await savedFile(page, B_PATH)).toBe(B_CONTENT);
	});
});
