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
			id: 'project',
			title: 'New project',
			run: async () => {
				if (!(await ctx.ui.confirm({ title: 'Create a project note?', confirmLabel: 'Create' }))) return;
				const title = await ctx.ui.prompt({ title: 'New project', label: 'Project title', placeholder: 'Project name' });
				if (title === null) return;
				const path = await ctx.vault.create('Projects/' + title + '.md', '# ' + title + '\\n');
				await ctx.workspace.openNote(path);
			},
		});
		ctx.addAction({
			id: 'pick-template',
			title: 'Pick a template',
			run: async () => {
				const selected = await ctx.ui.pick({
					title: 'Choose a template',
					items: [
						{ id: 'meeting', title: 'Meeting', content: '# Meeting agenda' },
						{ id: 'travel', title: 'Travel', content: '# Travel itinerary' },
					],
				});
				if (selected === null) return;
				const path = await ctx.vault.create('Templates/' + selected.id + '.md', selected.content);
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
		ctx.addAction({
			id: 'inspect', title: 'Inspect selected note',
			run: async (_input, run) => {
				const text = await ctx.vault.read(run.target.path);
				const path = await ctx.vault.create('Menus/Selected.md', '# Selected\\n\\n' + run.target.path + '\\n\\n' + text);
				await ctx.workspace.openNote(path);
			},
		});
		ctx.addAction({
			id: 'annotate', title: 'Annotate selected note',
			run: async (_input, run) => {
				const text = await ctx.ui.prompt({ title: 'Annotate note', label: 'Annotation' });
				if (text === null) return;
				const path = await ctx.vault.create('Menus/Annotation.md', '# Annotation\\n\\n' + run.target.path + '\\n\\n' + text);
				await ctx.workspace.openNote(path);
			},
		});
		ctx.labs.place('inspect', { menu: { on: ['note'] } });
		ctx.labs.place('annotate', { menu: { on: ['note'] } });
		ctx.labs.place('slow', { palette: true });
		ctx.labs.place('idea', { palette: true });
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

		test('Cmd+P runs a placed action and renders its output', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await pressShortcut(page, 'Mod+p');
			const search = page.getByPlaceholder('Type a command...');
			await search.fill('Say hello');
			await expect(page.getByText('No commands found.')).toBeVisible();
			await search.fill('Slow job');
			await expect(page.getByRole('option', { name: /Hello mod: Slow job/ })).toBeVisible();
			await search.press('Enter');

			const view = page.locator('[data-mod-run]');
			await expect(search).toBeHidden();
			await expect(view).toContainText('Slow job');
			await expect(view).toContainText('Step 1 done');
			await expect(view.locator('[data-mod-run-progress-label]')).toHaveText('Halfway');
			await page.evaluate(() => (globalThis as { __slowRelease?: () => void }).__slowRelease?.());
			await expect(view).toContainText('Step 2 done');
			await expect(view.locator('[data-mod-run-status]')).toHaveText('Done');
		});

		test('Cmd+P focuses an input action and creates the rendered note', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await pressShortcut(page, 'Mod+p');
			const search = page.getByPlaceholder('Type a command...');
			await search.fill('New idea note');
			await expect(page.getByRole('option', { name: /Hello mod: New idea note/ })).toBeVisible();
			await search.press('Enter');
			const field = page.locator('[data-mod-input]');
			await expect(search).toBeHidden();
			await expect(field).toBeFocused();
			await expect(field).toHaveAttribute('placeholder', 'Describe the idea');
			await field.fill('A palette-created idea');
			await field.press('Enter');
			await expect(field).toBeHidden();
			await expect(page.locator('.cm-content')).toContainText('A palette-created idea');
		});

		test('a row menu action writes and opens a note from the clicked target', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await page.locator('[data-rail-item="files"]').click();
			const row = page.locator('[data-note-row]', { has: page.getByText('Welcome', { exact: true }) });
			await row.click({ button: 'right' });
			await page.getByRole('menuitem', { name: 'Hello mod: Inspect selected note', exact: true }).click();
			await expect(page.locator('.cm-content')).toContainText('Welcome.md');
			await expect(page.locator('.cm-content')).toContainText('This is the test vault');
			expect(await page.evaluate((p) => window.__e2e.fs.dump()[p], `${TEST_VAULT_PATH}/Menus/Selected.md`)).toBe(
				'# Selected\n\nWelcome.md\n\n' + TEST_FILES[`${TEST_VAULT_PATH}/Welcome.md`],
			);
		});

		test('a row menu prompt keeps focus after the menu closes and writes the answer', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await page.locator('[data-rail-item="files"]').click();
			await page.locator('[data-note-row]', { has: page.getByText('Welcome', { exact: true }) }).click({ button: 'right' });
			await page.getByRole('menuitem', { name: 'Hello mod: Annotate selected note', exact: true }).click();
			const dialog = page.locator('[data-mod-dialog="prompt"]');
			const field = dialog.locator('[data-mod-dialog-field]');
			await expect(page.getByRole('menu')).toBeHidden();
			await expect(dialog).toContainText('Annotate note');
			await expect(field).toBeFocused();
			await page.keyboard.type('A focused annotation');
			await expect(field).toHaveValue('A focused annotation');
			await page.keyboard.press('Enter');
			await expect(dialog).toBeHidden();
			await expect(page.locator('.cm-content')).toContainText('A focused annotation');
			expect(await page.evaluate((p) => window.__e2e.fs.dump()[p], `${TEST_VAULT_PATH}/Menus/Annotation.md`)).toBe(
				'# Annotation\n\nWelcome.md\n\nA focused annotation',
			);
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

		test('a mod action confirms, prompts for a title and creates a note with it', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await page.locator('[data-rail-item="mod:hello:main"]').click();
			await page.locator('[data-mod-action="project"]').click();

			const dialog = page.locator('[data-mod-dialog]');
			await expect(dialog).toHaveAttribute('data-mod-dialog', 'confirm');
			await expect(dialog.locator('[data-mod-dialog-caption]')).toHaveText('Hello mod');
			await expect(dialog).toContainText('Create a project note?');
			await expect(dialog.locator('[data-mod-dialog-confirm]')).toHaveText('Create');
			await expect(dialog.locator('[data-mod-dialog-confirm]')).toBeFocused();
			await page.keyboard.press('Enter');

			await expect(dialog).toHaveAttribute('data-mod-dialog', 'prompt');
			await expect(dialog.locator('[data-mod-dialog-caption]')).toHaveText('Hello mod');
			await expect(dialog).toContainText('Project title');
			const field = dialog.locator('[data-mod-dialog-field]');
			await expect(field).toHaveAttribute('placeholder', 'Project name');
			await field.fill('Moonshot');
			await field.press('Enter');

			await expect(dialog).toBeHidden();
			await expect(page.locator('.cm-content')).toContainText('Moonshot');
			expect(await page.evaluate((p) => window.__e2e.fs.dump()[p], `${TEST_VAULT_PATH}/Projects/Moonshot.md`)).toBe('# Moonshot\n');
		});

		test('a mod picker searches templates and opens a note from the accepted item', async ({ vaultPage: page }) => {
			const panel = await openLabs(page);
			await panel.getByRole('switch', { name: 'Vault mods' }).click();
			await expect(panel.locator('[data-mod-folder="hello"]')).toContainText('Loaded');
			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await page.locator('[data-rail-item="mod:hello:main"]').click();
			await page.locator('[data-mod-action="pick-template"]').click();

			const dialog = page.locator('[data-mod-dialog="pick"]');
			await expect(dialog).toContainText('Choose a template');
			await expect(dialog.getByRole('option')).toHaveCount(2);
			const search = dialog.locator('[data-mod-dialog-field]');
			await expect(search).toBeFocused();
			await search.fill('Travel');
			await expect(dialog.getByRole('option')).toHaveCount(1);
			await expect(dialog.getByRole('option')).toHaveText('Travel');
			await search.press('Enter');

			await expect(dialog).toBeHidden();
			await expect(page.locator('.cm-content')).toContainText('Travel itinerary');
			expect(await page.evaluate((p) => window.__e2e.fs.dump()[p], `${TEST_VAULT_PATH}/Templates/travel.md`)).toBe(
				'# Travel itinerary',
			);
		});

		for (const persistMessages of [false, true]) {
			test(`a long action renders success and cancellation with message persistence ${persistMessages ? 'on' : 'off'}`, async ({ vaultPage: page }) => {
				// The path API imports native core relatively, outside the Vite core alias.
				await page.evaluate(() => {
					Object.assign(window, { __TAURI_INTERNALS__: {
						invoke: async (command: string) => {
							if (command === 'plugin:path|resolve_directory') return '/test-logs';
							throw new Error(`Unexpected native command: ${command}`);
						},
					} });
				});
				const trace = () => page.evaluate(() => Object.entries(window.__e2e.fs.dump())
					.filter(([path]) => path.startsWith('/test-logs/') && path.endsWith('.log'))
					.flatMap(([, text]) => text.split('\n'))
					.filter((line) => line.includes('[FRONT-END:MOD-HOST] '))
					.map((line) => JSON.parse(line.slice(line.indexOf('[FRONT-END:MOD-HOST] ') + '[FRONT-END:MOD-HOST] '.length))));
				const panel = await openLabs(page);
				await panel.getByRole('button', { name: 'Troubleshooting', exact: true }).click();
				await panel.locator('.bg-setting-item-bg').filter({ has: page.getByText('Save debug log to file', { exact: true }) }).getByRole('switch').click();
				const consent = panel.getByRole('switch', { name: 'Save mod run messages to file', exact: true });
				await expect(consent).toHaveAttribute('aria-checked', 'false');
				if (persistMessages) await consent.click();
				await panel.getByRole('button', { name: /^labs$/i }).click();
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
				// Wait for a real buffer flush before ending the run: later writes must append.
				await expect.poll(async () => (await trace()).filter((record) => record.event === 'action-start').length).toBe(1);

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
				await expect.poll(async () => (await trace()).filter((record) => record.event === 'action-end').length).toBe(2);
				const records = await trace();
				const starts = records.filter((record) => record.event === 'action-start');
				expect(starts).toHaveLength(2);
				expect(starts[0].runId).not.toBe(starts[1].runId);
				expect(records.filter((record) => record.event === 'action-end')).toEqual([
					{ event: 'action-end', modId: 'hello', actionId: 'slow', runId: starts[0].runId, origin: 'rail', outcome: 'done', elapsedMs: expect.any(Number) },
					{ event: 'action-end', modId: 'hello', actionId: 'slow', runId: starts[1].runId, origin: 'rail', outcome: 'cancelled', elapsedMs: expect.any(Number) },
				]);
				expect(records).toContainEqual({ event: 'load-attempt', modId: 'hello' });
				expect(records).toContainEqual(expect.objectContaining({ event: 'load-result', modId: 'hello', outcome: 'loaded' }));
				expect(JSON.stringify(records.filter((record) => record.event !== 'run-message'))).not.toMatch(/Slow job|Halfway|Step 1 done/);
				const messages = records.filter((record) => record.event === 'run-message');
				if (persistMessages) {
					expect(messages).toEqual([
						expect.objectContaining({ modId: 'hello', actionId: 'slow', runId: starts[0].runId, sequence: 1, text: 'Step 1 done' }),
						expect.objectContaining({ modId: 'hello', actionId: 'slow', runId: starts[0].runId, sequence: 2, text: 'Step 2 done' }),
						expect.objectContaining({ modId: 'hello', actionId: 'slow', runId: starts[1].runId, sequence: 1, text: 'Step 1 done' }),
					]);
				} else {
					expect(messages).toEqual([]);
					const output = await page.evaluate(() => Object.entries(window.__e2e.fs.dump())
						.filter(([path]) => path.startsWith('/test-logs/') && path.endsWith('.log'))
						.map(([, text]) => text).join(''));
					expect(output).not.toMatch(/Step 1 done|Step 2 done/);
				}
			});
		}

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
