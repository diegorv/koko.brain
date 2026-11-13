import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openFile } from '../fixtures/helpers';
import {
	RULE_TIMEOUT_MS,
	editorDoc,
	enableAutoOrganize,
	fileContent,
	openAutoOrganizeSettings,
	typeAtEnd,
} from '../fixtures/auto-organize';

// Auto Organize end to end: rules seeded in the vault run on a real editor
// save after the user turns the feature on in Settings. Each check polls the
// saved file, because the run fires after the autosave plus the debounce.

const AWS_NOTE = `${TEST_VAULT_PATH}/work/topics/AWS/lambda.md`;
const DONE_NOTE = `${TEST_VAULT_PATH}/Inbox/finished.md`;
const ARCHIVED_NOTE = `${TEST_VAULT_PATH}/Archive/finished.md`;
/** A second note the "done" rule matches, so its count differs from the AWS rule's. */
const ALSO_DONE_NOTE = `${TEST_VAULT_PATH}/Inbox/also-done.md`;

const RULES = {
	rules: [
		{
			id: 'aws',
			name: 'AWS topic notes',
			enabled: true,
			destination: '',
			expression: 'file.inFolder("work/topics/AWS")',
			properties: [
				{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' },
				{ key: '_icon', value: 'lucide:cloud', mode: 'always' },
			],
		},
		{
			id: 'done',
			name: 'Done goes to Archive',
			enabled: true,
			destination: 'Archive',
			expression: { or: ["status == 'done'", "status == 'dropped'"] },
			properties: [
				{ key: 'tags', value: 'archived', mode: 'add' },
				{ key: 'draft', mode: 'remove' },
			],
		},
	],
	excludedFolders: [],
};

test.use({
	vaultFiles: {
		...TEST_FILES,
		[`${TEST_VAULT_PATH}/.kokobrain/auto-organize-rules.json`]: JSON.stringify(RULES),
		[AWS_NOTE]: 'Notes about Lambda.\n',
		[DONE_NOTE]: '---\nstatus: dropped\ntags: [x]\n---\nA finished note.\n',
		[ALSO_DONE_NOTE]: '---\nstatus: done\n---\nAnother finished note.\n',
	},
});

test.describe('Auto Organize', () => {
	test('a save in a matching folder sets the rule properties, in the file and the open editor', async ({ vaultPage: page }) => {
		await enableAutoOrganize(page);
		await openFile(page, 'lambda.md');
		await typeAtEnd(page, ' Edited.');

		await expect.poll(() => fileContent(page, AWS_NOTE), { timeout: RULE_TIMEOUT_MS }).toContain('_belongs_to: "[[AWS]]"');
		const saved = await fileContent(page, AWS_NOTE);
		expect(saved).toContain('_icon: lucide:cloud');
		expect(saved).toContain('Edited.');

		await expect.poll(() => editorDoc(page), { timeout: RULE_TIMEOUT_MS }).toContain('_belongs_to: "[[AWS]]"');
		expect(await editorDoc(page)).toContain('Edited.');
	});

	test('an "any" filter match moves the note to Archive and adds a tag without replacing the others', async ({ vaultPage: page }) => {
		await enableAutoOrganize(page);
		await openFile(page, 'finished.md');
		await typeAtEnd(page, ' Done.');

		// The move lands before the tag write, so poll for the final state.
		await expect.poll(() => fileContent(page, ARCHIVED_NOTE), { timeout: RULE_TIMEOUT_MS }).toMatch(/tags: \[\s*x,\s*archived\s*\]/);
		expect(await fileContent(page, DONE_NOTE)).toBeNull();
		expect(await fileContent(page, ARCHIVED_NOTE)).toContain('Done.');

		// The open tab followed the move: its next edit is saved at the new path.
		await typeAtEnd(page, ' More.');
		await expect.poll(() => fileContent(page, ARCHIVED_NOTE), { timeout: RULE_TIMEOUT_MS }).toContain('More.');
		expect(await fileContent(page, DONE_NOTE)).toBeNull();
	});

	test('Settings shows the section and how many notes each rule matches now', async ({ vaultPage: page }) => {
		const panel = await openAutoOrganizeSettings(page);
		await expect(panel.locator('[data-match-count]')).toHaveText(['Matches 1 note now', 'Matches 2 notes now']);
	});

	test('every property row fits its controls side by side inside the rule card', async ({ vaultPage: page }) => {
		const panel = await openAutoOrganizeSettings(page);
		const rows = panel.locator('[data-rule-property]');
		await expect(rows).toHaveCount(4);

		// Real layout, which jsdom does not compute: each control is wide enough to
		// use, stays inside its row, and does not cover another control.
		const problems = await rows.evaluateAll((els) =>
			els.flatMap((row, r) => {
				const bounds = row.getBoundingClientRect();
				const controls = [...row.querySelectorAll<HTMLElement>('input:not([type="hidden"]), button')]
					.filter((el) => el.getClientRects().length > 0)
					.map((el) => ({ name: el.getAttribute('aria-label') || el.title || el.tagName, box: el.getBoundingClientRect() }));
				const found: string[] = [];
				for (const [i, a] of controls.entries()) {
					if (a.box.right > bounds.right + 0.5) found.push(`row ${r}: ${a.name} ends past the row`);
					if (a.name === 'Property value' && a.box.width < 80) found.push(`row ${r}: ${a.name} is ${Math.round(a.box.width)}px wide`);
					for (const b of controls.slice(i + 1)) {
						const overlapX = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
						const overlapY = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
						if (overlapX > 0.5 && overlapY > 0.5) found.push(`row ${r}: ${a.name} covers ${b.name}`);
					}
				}
				return found;
			}),
		);
		expect(problems).toEqual([]);

		// A remove row has no value, so its key, mode and delete stay on one line.
		const removeRow = rows.nth(3);
		await expect(removeRow.locator('[aria-label="Property key"]')).toHaveValue('draft');
		const keyTop = (await removeRow.locator('[aria-label="Property key"]').boundingBox())!.y;
		const modeTop = (await removeRow.locator('[aria-label="Property mode"]').boundingBox())!.y;
		expect(Math.abs(modeTop - keyTop)).toBeLessThan(4);
	});

	test('the source menus show "Expression" whole', async ({ vaultPage: page }) => {
		const panel = await openAutoOrganizeSettings(page);
		for (const label of ['Rename source', 'Property source']) {
			await panel.getByRole('combobox', { name: label }).first().click();
			await page.getByRole('option', { name: 'Expression' }).click();
		}
		const triggers = panel.getByRole('combobox', { name: /^(Rename|Property) source$/ }).filter({ hasText: 'Expression' });
		await expect(triggers).toHaveCount(2);

		const clipped = await triggers.evaluateAll((els) =>
			els
				.map((el) => el.querySelector<HTMLElement>('[data-slot="select-value"]')!)
				.filter((value) => value.scrollWidth > value.clientWidth)
				.map((value) => value.closest('[aria-label]')!.getAttribute('aria-label')),
		);
		expect(clipped).toEqual([]);
	});
});
