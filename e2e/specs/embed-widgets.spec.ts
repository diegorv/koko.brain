import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

/** 150x150 solid-grey PNG served in place of the real remote asset. */
const STUB_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAIAAACzY+a1AAABb0lEQVR4nO3RQQkAMAzAwPpXVlkVsccI3CkIZJa4+R3AKwvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CvAN53wpz/wbXQQAAAABJRU5ErkJggg==',
	'base64',
);

const REMOTE_IMAGE_URL = 'https://via.placeholder.com/150';

/**
 * Serve the remote image locally so the test never depends on outbound
 * network. Without this the `<img>` stays broken (zero-sized) and
 * `toBeVisible()` flakes.
 */
async function stubRemoteImage(page: import('@playwright/test').Page) {
	await page.route(REMOTE_IMAGE_URL, (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG }),
	);
}

const HOST_NOTE = `# Embeds

External image:

![Remote](${REMOTE_IMAGE_URL})

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
		await stubRemoteImage(page);
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
