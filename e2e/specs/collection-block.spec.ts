import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive, openFile } from '../fixtures/helpers';

const Q2_PATH = `${TEST_VAULT_PATH}/Projects/2026-Q2.md`;

/** A note whose collection block lists the notes with `status: active` (only Projects/Roadmap.md in the seeded vault). */
const ACTIVE_NOTES = `# Active notes

\`\`\`collection
filters: "status == 'active'"
views:
  - type: table
    name: Active
    order:
      - file.name
      - status
\`\`\`
`;

test.use({ vaultFiles: { ...TEST_FILES, [`${TEST_VAULT_PATH}/Active.md`]: ACTIVE_NOTES } });

/** The rendered rows of the collection block, one string of cell texts per row. */
function blockRows(page: Page): Promise<string[]> {
	return page
		.locator('.cm-lp-collection-block tbody tr')
		.evaluateAll((rows) => rows.map((row) => [...row.querySelectorAll('td')].map((td) => td.textContent).join(' | ')));
}

test.describe('Collection block', () => {
	test('renders the rows its query matches in the vault', async ({ vaultPage: page }) => {
		await openFile(page, 'Active.md');

		const block = page.locator('.cm-lp-collection-block');
		await expect(block.locator('.cm-lp-collection-header')).toHaveText('Active (1)');
		await expect.poll(() => blockRows(page)).toEqual(['Roadmap.md | active']);
	});

	test('updates its rows after another note starts matching the query', async ({ vaultPage: page }) => {
		await openFile(page, 'Active.md');
		await expect.poll(() => blockRows(page)).toEqual(['Roadmap.md | active']);

		// An external edit of Projects/2026-Q2.md, delivered the way the Rust watcher reports it.
		const q2 = TEST_FILES[Q2_PATH].replace('status: in-progress', 'status: active');
		await page.evaluate(({ path, content }) => window.__e2e.fs.writeFile(path, content), { path: Q2_PATH, content: q2 });
		await page.evaluate((paths) => window.__e2e.events.emit('vault-files-changed', { paths }), [Q2_PATH]);

		await expect(page.locator('.cm-lp-collection-header')).toHaveText('Active (2)');
		await expect.poll(async () => (await blockRows(page)).sort()).toEqual(['2026-Q2.md | active', 'Roadmap.md | active']);
	});

	test('clicking a row opens its note and the block stays rendered', async ({ vaultPage: page }) => {
		await openFile(page, 'Active.md');
		await expect.poll(() => blockRows(page)).toEqual(['Roadmap.md | active']);

		// The row stops mousedown, so CodeMirror does not move the cursor onto
		// the fence and reveal the block's YAML before the click lands.
		await page.locator('.cm-lp-collection-block tbody tr', { hasText: 'Roadmap.md' }).click();

		await expectTabActive(page, 'Roadmap');
		await expect(page.locator('.cm-content')).toContainText('The current high-level plan.');

		await page.locator('.editor-tabs-bar [role="tab"]', { hasText: 'Active.md' }).click();
		await expectTabActive(page, 'Active.md');
		await expect(page.locator('.cm-lp-collection-block .cm-lp-collection-header')).toHaveText('Active (1)');
		await expect.poll(() => blockRows(page)).toEqual(['Roadmap.md | active']);
		await expect(page.locator('.cm-content')).not.toContainText('filters:');
	});
});
