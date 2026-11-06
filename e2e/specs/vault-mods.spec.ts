import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

const MODS = `${TEST_VAULT_PATH}/_system/mods`;

const HELLO_MOD: Record<string, string> = {
	[`${MODS}/hello/manifest.json`]: JSON.stringify({ id: 'hello', name: 'Hello mod', version: '1.0.0' }),
	[`${MODS}/hello/main.js`]: `export default {
	onload(ctx) {
		globalThis.__helloRan = true;
		ctx.notify('Hello');
		ctx.addAction({ id: 'hello', title: 'Say hello', description: 'Shows a toast', run: async () => ctx.notify('Hello from the rail') });
		ctx.addAction({
			id: 'idea',
			title: 'New idea note',
			input: { placeholder: 'Describe the idea' },
			run: async (input) => {
				const path = await ctx.vault.create('Ideas/Idea.md', '# Idea\\n\\n' + input);
				await ctx.workspace.openNote(path);
			},
		});
		ctx.addAction({
			id: 'slow',
			title: 'Slow job',
			run: async (input, run) => {
				run.log('Step 1 done');
				run.progress(1, 2, 'Halfway');
				await new Promise((resolve, reject) => {
					globalThis.__slowRelease = resolve;
					run.signal.addEventListener('abort', () => reject(new Error('stopped')));
				});
				run.log('Step 2 done');
				run.progress(2, 2);
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Hello mod', icon: 'lucide:sparkles' });
	},
};
`,
};

const BROKEN_MOD: Record<string, string> = {
	[`${MODS}/broken/manifest.json`]: JSON.stringify({ id: 'broken', name: 'Broken mod', version: '0.1.0' }),
	[`${MODS}/broken/main.js`]: 'const mod = { onload() {} };\n',
};

function toasts(page: Page) {
	return page.locator('[data-sonner-toast]');
}

/**
 * Reloads the page and opens the vault again with the files it held. The mods
 * flag lives in localStorage, which survives the reload; the virtual FS does not.
 */
async function reopenVault(page: Page): Promise<void> {
	const files = await page.evaluate(() => window.__e2e.fs.dump());
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
	await page.evaluate((f) => window.__e2e.fs.populate(f), files);
	await page.evaluate((p) => window.__e2e.dialog.setOpenResponse(p), TEST_VAULT_PATH);
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await expect(page.locator('[data-rail]')).toBeVisible({ timeout: 10_000 });
}

/** Opens Settings > Labs and returns the panel. */
async function openLabs(page: Page) {
	await pressShortcut(page, 'Mod+Comma');
	const panel = page.locator('[role="dialog"][aria-label="Settings"]');
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: /^labs$/i }).click();
	return panel;
}

test.describe('Vault mods', () => {
	test.describe('a vault with a hello mod', () => {
		test.use({ vaultFiles: { ...TEST_FILES, ...HELLO_MOD } });

		test('mods are off by default: the hello mod does not run', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);

			await expect(panel.getByRole('switch', { name: 'Vault mods' })).toHaveAttribute('data-state', 'unchecked');
			await expect(panel.locator('[data-mod-folder]')).toHaveCount(0);
			await expect(toasts(page).filter({ hasText: 'Hello mod' })).toHaveCount(0);
			// The vault open has finished by the time Labs is open, so a start that ran would have set it.
			expect(await page.evaluate(() => (globalThis as { __helloRan?: boolean }).__helloRan)).toBeUndefined();
		});

		test('turning mods on runs the hello mod and lists it in Labs', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);

			await panel.getByRole('switch', { name: 'Vault mods' }).click();

			await expect(toasts(page).filter({ hasText: 'Hello mod: Hello' })).toHaveCount(1);
			const row = panel.locator('[data-mod-folder="hello"]');
			await expect(row).toContainText('Hello mod');
			await expect(row).toContainText('1.0.0');
			await expect(row).toContainText('Loaded');
			expect(await page.evaluate(() => (globalThis as { __helloRan?: boolean }).__helloRan)).toBe(true);
		});

		test("the hello mod's rail button opens its picker, and picking Say hello runs it", async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			const button = page.locator('[data-rail-item="mod:hello:main"]');
			await expect(button).toHaveAttribute('aria-label', 'Hello mod');
			await button.click();

			const row = page.locator('[data-mod-action="hello"]');
			await expect(row).toContainText('Say hello');
			await expect(row).toContainText('Shows a toast');
			await row.click();

			await expect(toasts(page).filter({ hasText: 'Hello mod: Hello from the rail' })).toHaveCount(1);
			await expect(row).toBeHidden();
			await expect(button).not.toHaveAttribute('aria-current', 'page');
		});

		test('New idea note asks for text, writes the note and opens it', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await page.locator('[data-rail-item="mod:hello:main"]').click();
			await page.locator('[data-mod-action="idea"]').click();
			const field = page.locator('[data-mod-input]');
			await expect(field).toHaveAttribute('placeholder', 'Describe the idea');
			await field.fill('A flying car');
			await field.press('Enter');

			await expect(field).toBeHidden();
			const editor = page.locator('.cm-content');
			await expect(editor).toContainText('Idea');
			await expect(editor).toContainText('A flying car');
			expect(await page.evaluate((p) => window.__e2e.fs.dump()[p], `${TEST_VAULT_PATH}/Ideas/Idea.md`)).toBe(
				'# Idea\n\nA flying car',
			);
		});

		test('a long action shows its log in the run view, and Stop cancels a second run', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			const button = page.locator('[data-rail-item="mod:hello:main"]');
			const view = page.locator('[data-mod-run]');
			const status = view.locator('[data-mod-run-status]');
			await button.click();
			await page.locator('[data-mod-action="slow"]').click();

			await expect(view).toContainText('Slow job');
			await expect(view).toContainText('Step 1 done');
			await expect(view.locator('[data-mod-run-progress-label]')).toHaveText('Halfway');
			await expect(status).toHaveText('Running');
			await expect(button).toHaveAttribute('aria-busy', 'true');

			await page.evaluate(() => (globalThis as { __slowRelease?: () => void }).__slowRelease?.());

			await expect(view).toContainText('Step 2 done');
			await expect(status).toHaveText('Done');
			await expect(button).not.toHaveAttribute('aria-busy');
			await view.locator('[data-mod-run-close]').click();
			await expect(view).toBeHidden();

			await button.click();
			await page.locator('[data-mod-action="slow"]').click();
			await expect(status).toHaveText('Running');
			await view.locator('[data-mod-run-stop]').click();

			await expect(status).toHaveText('Cancelled');
			await expect(button).not.toHaveAttribute('aria-busy');
			await expect(toasts(page).filter({ hasText: 'Slow job failed' })).toHaveCount(0);
		});

		test('turning mods off removes the hello mod rail button', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			const toggle = panel.getByRole('switch', { name: 'Vault mods' });
			await toggle.click();
			await expect(page.locator('[data-rail-item="mod:hello:main"]')).toHaveCount(1);

			await toggle.click();

			await expect(page.locator('[data-rail-item="mod:hello:main"]')).toHaveCount(0);
		});

		test('with mods on, reopening the vault runs the hello mod again', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(toasts(page).filter({ hasText: 'Hello mod: Hello' })).toHaveCount(1);

			await reopenVault(page);

			await expect(toasts(page).filter({ hasText: 'Hello mod: Hello' })).toHaveCount(1);
		});

		test('saving a new main.js reloads the mod: its rail button takes the new title', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			const button = page.locator('[data-rail-item^="mod:hello:"]');
			await expect(button).toHaveAttribute('aria-label', 'Hello mod');

			// A save of main.js, delivered the way the Rust watcher reports it.
			const mainPath = `${MODS}/hello/main.js`;
			const next = HELLO_MOD[mainPath].replace("title: 'Hello mod'", "title: 'Hello mod v2'");
			expect(next).not.toBe(HELLO_MOD[mainPath]);
			await page.evaluate(({ path, content }) => window.__e2e.fs.writeFile(path, content), { path: mainPath, content: next });
			await page.evaluate((paths) => window.__e2e.events.emit('vault-files-changed', { paths }), [mainPath]);

			await expect(button).toHaveAttribute('aria-label', 'Hello mod v2');
			await expect(button).toHaveCount(1);
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
		});
	});

	test.describe('a vault with a broken mod and a good mod', () => {
		test.use({ vaultFiles: { ...TEST_FILES, ...HELLO_MOD, ...BROKEN_MOD } });

		test('the broken mod shows a folder-named error and the good mod still loads', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);

			await panel.getByRole('switch', { name: 'Vault mods' }).click();

			const message = '_system/mods/broken: main.js: found no "export default"';
			await expect(toasts(page).filter({ hasText: message })).toHaveCount(1);
			const broken = panel.locator('[data-mod-folder="broken"]');
			await expect(broken).toContainText('Error');
			await expect(broken).toContainText(message);

			await expect(toasts(page).filter({ hasText: 'Hello mod: Hello' })).toHaveCount(1);
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
		});
	});
});
