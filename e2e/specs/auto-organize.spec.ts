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
			properties: [{ key: 'tags', value: 'archived', mode: 'add' }],
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
});
