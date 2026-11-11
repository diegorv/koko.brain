import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { activeTab, openFile } from '../fixtures/helpers';
import {
	RULE_TIMEOUT_MS,
	editorDoc,
	enableAutoOrganize,
	fileContent,
	openAutoOrganizeSettings,
	switchAutoOrganizeOn,
	typeAtEnd,
} from '../fixtures/auto-organize';

// Auto Organize flows a user meets in the app: building a rule in Settings,
// typing in a note while a rule rewrites its frontmatter, and a rule that
// renames a note and creates its follow-up in the same run.

const RULES_FILE = `${TEST_VAULT_PATH}/.kokobrain/auto-organize-rules.json`;

test.describe('a rule built in Settings', () => {
	const NOTE = `${TEST_VAULT_PATH}/Projects/Roadmap.md`;

	test('acts on the next save once it is switched on', async ({ vaultPage: page }) => {
		const panel = await openAutoOrganizeSettings(page);
		await switchAutoOrganizeOn(panel);

		await panel.getByRole('button', { name: 'Add rule' }).click();
		await panel.getByPlaceholder('Rule name').fill('Projects get an owner');

		await panel.getByRole('button', { name: 'Add expression' }).click();
		const expression = panel.getByPlaceholder('Expression...');
		await expression.fill('file.inFolder("Projects")');
		await expression.press('Tab');
		await expect(panel.locator('[data-match-count]')).toHaveText(/^Matches [1-9]\d* notes? now$/);

		await panel.getByRole('button', { name: 'Add property' }).click();
		const key = panel.getByLabel('Property key');
		await key.fill('owner');
		await key.press('Tab');
		const value = panel.getByLabel('Property value');
		await value.fill('me');
		await value.press('Tab');

		// A new rule starts off; its switch is the one after "Enable Auto Organize".
		const ruleSwitch = panel.getByRole('switch').nth(1);
		await expect(ruleSwitch).toHaveAttribute('aria-checked', 'false');
		await ruleSwitch.click();
		await expect(ruleSwitch).toHaveAttribute('aria-checked', 'true');

		// Wait for the finished rule on disk: edits save on a shared debounce, and an
		// earlier save already holds "owner" without the value or the switch.
		await expect
			.poll(async () => JSON.parse((await fileContent(page, RULES_FILE)) ?? '{"rules":[]}').rules[0], { timeout: RULE_TIMEOUT_MS })
			.toMatchObject({ enabled: true, properties: [{ key: 'owner', value: 'me' }] });
		await page.keyboard.press('Escape');
		await expect(panel).toBeHidden();

		await openFile(page, 'Roadmap.md');
		await typeAtEnd(page, ' Reviewed.');

		await expect.poll(() => fileContent(page, NOTE), { timeout: RULE_TIMEOUT_MS }).toContain('owner: me');
		expect(await fileContent(page, NOTE)).toContain('Reviewed.');
	});
});

test.describe('typing while a rule rewrites the frontmatter', () => {
	const NOTE = `${TEST_VAULT_PATH}/work/topics/AWS/lambda.md`;
	test.use({
		vaultFiles: {
			...TEST_FILES,
			[RULES_FILE]: JSON.stringify({
				rules: [
					{
						id: 'aws',
						name: 'AWS topic notes',
						enabled: true,
						destination: '',
						expression: 'file.inFolder("work/topics/AWS")',
						properties: [{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' }],
					},
				],
				excludedFolders: [],
			}),
			[NOTE]: 'Notes about Lambda.\n',
		},
	});

	test('the caret follows the text, so the next keystrokes land in the body', async ({ vaultPage: page }) => {
		await enableAutoOrganize(page);
		await openFile(page, 'lambda.md');
		await typeAtEnd(page, 'Alpha');

		// The rule adds a frontmatter block above the caret while the note stays open.
		await expect.poll(() => editorDoc(page), { timeout: RULE_TIMEOUT_MS }).toContain('_belongs_to: "[[AWS]]"');

		// No click: the caret is wherever the rewrite left it.
		await page.keyboard.type(' Beta');
		const doc = await editorDoc(page);
		const frontmatter = doc.slice(0, doc.indexOf('---', 3) + 3);
		expect(frontmatter).toContain('_belongs_to: "[[AWS]]"');
		expect(frontmatter).not.toContain('Beta');
		expect(doc).toContain('Alpha Beta');
		await expect.poll(() => fileContent(page, NOTE), { timeout: RULE_TIMEOUT_MS }).toContain('Alpha Beta');
	});
});

test.describe('a meeting rule that renames and creates a follow-up', () => {
	const SOURCE = `${TEST_VAULT_PATH}/Meetings/sync.md`;
	const RENAMED = `${TEST_VAULT_PATH}/Meetings/Meeting - Roadmap.md`;
	const FOLLOW_UP = `${TEST_VAULT_PATH}/Meetings/Meeting - Roadmap follow-up.md`;
	test.use({
		vaultFiles: {
			...TEST_FILES,
			[RULES_FILE]: JSON.stringify({
				rules: [
					{
						id: 'meeting',
						name: 'Meetings get a name and a follow-up',
						enabled: true,
						destination: '',
						expression: 'type == "meeting" && !isEmpty(topic)',
						rename: { expr: '["Meeting - ", topic].join("")' },
						createNote: {
							path: '{folder}/{basename} follow-up.md',
							properties: [{ key: 'status', value: 'todo', mode: 'if-missing' }],
						},
					},
				],
				excludedFolders: [],
			}),
			[SOURCE]: '---\ntype: meeting\ntopic: Roadmap\n---\nMeeting notes.\n',
		},
	});

	test('renames the note first, then creates the follow-up from the new name', async ({ vaultPage: page }) => {
		await enableAutoOrganize(page);
		await openFile(page, 'sync.md');
		await typeAtEnd(page, ' Decided.');

		await expect.poll(() => fileContent(page, RENAMED), { timeout: RULE_TIMEOUT_MS }).toContain('Decided.');
		expect(await fileContent(page, SOURCE)).toBeNull();
		await expect.poll(() => fileContent(page, FOLLOW_UP), { timeout: RULE_TIMEOUT_MS }).toContain('status: todo');
		// Created from the new name only: a create that ran before the rename would leave this one.
		expect(await fileContent(page, `${TEST_VAULT_PATH}/Meetings/sync follow-up.md`)).toBeNull();

		await expect(activeTab(page)).toContainText('Meeting - Roadmap');
	});
});
