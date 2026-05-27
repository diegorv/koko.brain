import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

const HOST_NOTE = `# Embeds

External image:

![Remote](https://via.placeholder.com/150)

Internal image via wikilink:

![[picture.png]]

Internal audio via HTML tag:

<audio src="clip.mp3"></audio>

Plain text at the end.
`;

async function seedHost(page: import('@playwright/test').Page) {
	await page.evaluate(
		({ files }) => window.__e2e.fs.populate(files),
		{
			files: {
				[`${TEST_VAULT_PATH}/Embeds.md`]: HOST_NOTE,
				[`${TEST_VAULT_PATH}/picture.png`]: '',
				[`${TEST_VAULT_PATH}/clip.mp3`]: '',
			},
		},
	);
	await page.evaluate(
		({ paths }) => window.__e2e.events.emit('vault-files-changed', { paths }),
		{ paths: [`${TEST_VAULT_PATH}/Embeds.md`, `${TEST_VAULT_PATH}/picture.png`, `${TEST_VAULT_PATH}/clip.mp3`] },
	);
	await page.waitForTimeout(600);
}

test.describe('Embed widgets', () => {
	test('external `![](url)` renders an image widget', async ({ vaultPage: page }) => {
		await seedHost(page);
		await openTreeItem(page, 'Embeds.md');
		await expect(page.locator('img.cm-lp-image').first()).toBeVisible({ timeout: 5_000 });
	});

	test('wikilink image `![[picture.png]]` renders an image-embed widget', async ({
		vaultPage: page,
	}) => {
		await seedHost(page);
		await openTreeItem(page, 'Embeds.md');
		// `WikilinkImageEmbedWidget` mounts a `.cm-lp-image-wrapper`. Asset
		// loading via `convertFileSrc` may fail in PLAYWRIGHT mode, but the
		// widget itself must be in the DOM.
		await expect(page.locator('.cm-lp-image-wrapper').first()).toBeAttached({ timeout: 5_000 });
	});
});
