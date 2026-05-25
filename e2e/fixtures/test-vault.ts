/**
 * Test vault loaded by the `vaultPage` fixture. The content is shaped to
 * exercise every panel a golden-path spec might assert on:
 *
 *   - Welcome.md          → links [[Projects/Roadmap]], inline tag #intro
 *   - Inbox.md            → contains the literal "Welcome" so unlinked
 *                           mentions has something to find
 *   - Projects/Roadmap.md → frontmatter (status, priority, tags), links
 *                           [[Welcome]] + [[Projects/2026-Q2]], two backlinks
 *   - Projects/2026-Q2.md → tasks (- [ ] / - [x]), links [[Projects/Roadmap]]
 *   - Projects/archive/2025-Q4.md → archived note in nested folder
 *   - Daily/2026-05-01.md → daily note with tasks, links [[Welcome]]
 *
 * Adjusting this file ripples into every spec that uses `vaultPage` —
 * keep changes additive when possible.
 */

import { test as base, type Page } from '@playwright/test';

export const TEST_VAULT_PATH = '/test-vault';

const DEFAULT_SETTINGS = {
	periodicNotes: {
		folder: 'Daily',
		// `autoPin: false` so the auto-opened daily-note tab can be closed via
		// Cmd+W in tests. Production defaults to `autoPin: true` (see
		// settings.store.svelte.ts) but that makes empty-state / Cmd+W tests
		// flaky because pinned tabs are skipped by `closeTab`.
		daily: { format: 'YYYY-MM-DD', template: '', templatePath: '', autoOpen: true, autoPin: false },
		weekly: { format: 'YYYY-[W]WW', templatePath: '' },
		monthly: { format: 'YYYY-MM', templatePath: '' },
		quarterly: { format: 'YYYY-[Q]Q', templatePath: '' },
	},
	quickNote: {
		folderFormat: 'Inbox',
		filenameFormat: 'capture-YYYY-MM-DD-HH-mm-ss',
		templatePath: '',
	},
	oneOnOne: {
		peopleFolder: 'People',
		folderFormat: 'YYYY/MM',
		filenameFormat: '{person}-DD-MM-YYYY',
		templatePath: '',
	},
	layout: {
		sidebarMode: 'files',
		rightSidebarVisible: true,
		propertiesVisible: true,
		backlinksVisible: true,
		outgoingLinksVisible: true,
		tagsVisible: true,
		tableOfContentsVisible: true,
	},
	folderNotes: { enabled: true },
	editor: {
		fontFamily: 'MonoLisa, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
		fontSize: 14,
		lineHeight: 1.6,
	},
	templates: { folder: '_templates' },
	appearance: {},
};

const WELCOME = `# Welcome

This is the test vault. Visit [[Projects/Roadmap]] to see the active plan.

#intro
`;

const INBOX = `# Inbox

Quick capture area. The string Welcome appears here as plain text so the
unlinked mentions panel has something to surface.
`;

const ROADMAP = `---
status: active
priority: 1
tags: [plan, project]
---

# Roadmap

The current high-level plan. Linked from [[Welcome]] and references
[[Projects/2026-Q2]] for the next milestone.

#plan
`;

const Q2 = `---
status: in-progress
quarter: 2
---

# 2026 Q2

Driven by [[Projects/Roadmap]].

## Tasks
- [ ] Ship feature A
- [x] Draft RFC
- [ ] Review pending PRs

#plan
`;

const ARCHIVED = `# 2025 Q4 (archived)

Historical content. No outgoing links.
`;

const DAILY = `# 2026-05-01

Daily note. Linked back to [[Welcome]] for navigation.

- [ ] Reply to email thread
- [x] Morning stand-up
`;

export const TEST_FILES: Record<string, string> = {
	[`${TEST_VAULT_PATH}/Welcome.md`]: WELCOME,
	[`${TEST_VAULT_PATH}/Inbox.md`]: INBOX,
	[`${TEST_VAULT_PATH}/Projects/`]: '',
	[`${TEST_VAULT_PATH}/Projects/Roadmap.md`]: ROADMAP,
	[`${TEST_VAULT_PATH}/Projects/2026-Q2.md`]: Q2,
	[`${TEST_VAULT_PATH}/Projects/archive/`]: '',
	[`${TEST_VAULT_PATH}/Projects/archive/2025-Q4.md`]: ARCHIVED,
	[`${TEST_VAULT_PATH}/Daily/`]: '',
	[`${TEST_VAULT_PATH}/Daily/2026-05-01.md`]: DAILY,
	[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
	[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(DEFAULT_SETTINGS, null, 2),
};

async function waitForE2eApi(page: Page) {
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
}

async function populateAndOpenVault(page: Page) {
	await page.goto('/', { waitUntil: 'networkidle' });
	await waitForE2eApi(page);

	await page.evaluate(({ files }) => window.__e2e.fs.populate(files), { files: TEST_FILES });
	await page.evaluate(({ vaultPath }) => window.__e2e.dialog.setOpenResponse(vaultPath), {
		vaultPath: TEST_VAULT_PATH,
	});

	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
}

export const test = base.extend<{ vaultPage: Page }>({
	vaultPage: async ({ page }, use) => {
		await populateAndOpenVault(page);
		await use(page);
	},
});

export { expect } from '@playwright/test';
