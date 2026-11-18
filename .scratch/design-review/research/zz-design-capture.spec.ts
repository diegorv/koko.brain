import { appendFileSync, mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openCommandPalette, openFile, openQuickSwitcher, openSearch, pressShortcut } from '../fixtures/helpers';

/**
 * Design review capture: seeds a realistic vault and screenshots every surface.
 * Each capture swallows its own failure (logged to GAPS) so one broken surface
 * does not stop the run (scripts/e2e.sh passes -x).
 */
const ROOT = '/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/design-review';
const OUT = `${ROOT}/screens`;
const GAPS = `${ROOT}/research/capture-gaps.log`;
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/_failed`, { recursive: true });
mkdirSync(`${ROOT}/research`, { recursive: true });

const V = TEST_VAULT_PATH;
const SETTINGS_PATH = `${V}/.kokobrain/settings.json`;

type Mode = 'light' | 'dark';
const THEMES: Record<Mode, string> = { light: 'Lavender Haze', dark: 'KokoBrain Default' };

const RICH = `---
_type: Project
status: active
priority: 1
owner: Diego
due: 2026-12-01
rating: 4
tags: [plan, launch, kokobrain]
_organized: false
---

# Kokobrain Launch Plan

Status: \`INPUT[inlineSelect(todo, doing, done):status]\` Rating: \`INPUT[number():rating]\` Due: \`INPUT[date():due]\`

This plan ties together the **roadmap**, the *design sync* and the \`release\` checklist. See [[Projects/Roadmap|the roadmap]] and [[Meetings/2026-11-09 Design sync]], or jump to [[Projects/Website Redesign#Open questions]]. #launch #plan

> [!note] Why this matters
> A calm, fast launch beats a loud one. Ship the **editor polish** first.

> [!warning] Risk
> The updater signing key rotates on 2026-11-20. Rebuild before then.

> [!tip]+ Tip
> Press \`Cmd+P\` to run any command from the palette.

## Milestones

1. Feature freeze on 2026-11-14
   - Last UI pass
   - Docs and changelog
2. Release candidate on 2026-11-21
3. Public release on 2026-12-01

## Tasks

- [ ] Finish the onboarding tour 📅 2026-11-12 ⏫
- [ ] Write release notes 📅 2026-11-10 🔼
- [/] Polish the settings dialog 📅 2026-11-11
- [x] Fix the queryjs save bug 📅 2026-11-08
- [ ] Record the demo video 📅 2026-11-20 🔁 every week
- [ ] Ask [[People/Ana Souza]] for a design review

## Code

\`\`\`ts
export function greet(name: string): string {
	const prefix = name.length > 0 ? 'Hello' : 'Hi';
	return \`\${prefix}, \${name}!\`; // returns a string
}
\`\`\`

## Metrics

| Metric | Target | Current | Owner |
| --- | ---: | ---: | --- |
| Cold start (ms) | 800 | 620 | Diego |
| Notes indexed | 20000 | 18432 | Diego |
| Crash-free sessions | 99.5% | 99.8% | Ana |

## Embedded

![[Meetings/2026-11-09 Design sync]]

---

Footnote reference[^1] and a ~~struck~~ ==highlighted== phrase.

[^1]: Source: internal benchmark, October.
`;

const ROADMAP = `---
_type: Project
status: active
priority: 2
owner: Diego
due: 2026-12-15
tags: [plan]
---

# Roadmap

Linked from [[Welcome]] and [[Projects/Kokobrain Launch Plan]].

## Q4
- [ ] Calendar polish 📅 2026-11-18
- [ ] Mobile capture spike 📅 2026-11-25 🔽
- [x] Types navigator 📅 2026-10-30

## Q1
- [ ] Sync research
`;

const REDESIGN = `---
_type: Project
status: active
priority: 3
owner: Ana
due: 2026-11-30
tags: [design]
---

# Website Redesign

## Open questions

- [ ] Which hero image? 📅 2026-11-05
- [ ] Dark mode for the docs? 📅 2026-11-13
`;

const OKRS = `---
_type: Project
status: planned
priority: 2
owner: Diego
tags: [okr]
---

# Q4 OKRs

- [ ] Reach 100 weekly active users
- [ ] Cut cold start under 700 ms 📅 2026-11-28
`;

const WELCOME = `# Welcome

This is the vault home. Visit [[Projects/Roadmap]] for the active plan.

#intro
`;

const DESIGN_SYNC = `---
_type: Meeting
date: 2026-11-09
attendees: [Diego, Ana]
---

# Design sync

## Decisions

- Keep the icon rail labeled
- Move note actions into the action bar

## Actions

- [ ] Ana: audit contrast in the light theme 📅 2026-11-12
`;

const RETRO = `---
_type: Meeting
date: 2026-11-05
---

# Retro

Went well: fast iteration. To improve: fewer half-finished branches.
`;

const ANA = `---
_type: Person
company: Studio North
---

# Ana Souza

Designer. Works on [[Projects/Website Redesign]].
`;

const HEALTH = `# Health

- [ ] Book dentist 📅 2026-11-12
- [ ] Run 5k 📅 2026-11-10
`;

const READING = `# Reading List

- [ ] The Design of Everyday Things
- [x] Refactoring UI
`;

const DASHBOARD = `# Dashboard

## Active projects

\`\`\`collection
filters:
  and:
    - "_type == 'Project'"
views:
  - type: table
    name: Projects
    order:
      - file.name
      - status
      - priority
      - owner
      - due
    sort:
      - column: priority
        direction: ASC
\`\`\`

## Notes by folder

\`\`\`queryjs
const pages = kb.pages().groupBy((p) => p.file.folder);
kb.table(['Folder', 'Notes'], pages.map((g) => [g.key || '/', g.rows.length]));
\`\`\`
`;

const KANBAN = `## Backlog

- [ ] Types navigator polish #design {color:purple}
- [ ] Mobile capture spike #research

## In progress

- [ ] Calendar week view {2026-11-14} #calendar {color:blue}
- [ ] Settings dialog audit {2026-11-11} #design

## Review

- [ ] Onboarding tour {2026-11-12} #docs {color:yellow}

## Done

- [x] Fix queryjs save bug #bug {color:green}
- [x] Bump version to 4.9.1

%% kanban:settings
{
  "tagColors": { "design": "purple", "calendar": "blue", "docs": "yellow", "bug": "green", "research": "gray" }
}
%%
`;

const CANVAS = JSON.stringify(
	{
		nodes: [
			{ id: 'g1', type: 'group', x: -420, y: -260, width: 520, height: 420, label: 'Research', color: '5' },
			{ id: 't1', type: 'text', x: -390, y: -210, width: 260, height: 90, text: '## Driving question\nWhat makes a note app feel calm?', color: '1' },
			{ id: 'f1', type: 'file', x: -390, y: -90, width: 260, height: 120, file: 'Meetings/2026-11-09 Design sync.md', color: '4' },
			{ id: 't2', type: 'text', x: 180, y: -200, width: 280, height: 110, text: '**Hypothesis**\nFewer chrome elements, faster feedback.', color: '3' },
			{ id: 't3', type: 'text', x: 180, y: -30, width: 280, height: 90, text: 'Prototype the rail without labels', color: '2' },
			{ id: 'l1', type: 'link', x: -60, y: 220, width: 300, height: 90, url: 'https://jsoncanvas.org' },
		],
		edges: [
			{ id: 'e1', fromNode: 't1', fromSide: 'right', toNode: 't2', toSide: 'left', label: 'leads to' },
			{ id: 'e2', fromNode: 't2', fromSide: 'bottom', toNode: 't3', toSide: 'top' },
			{ id: 'e3', fromNode: 'f1', fromSide: 'bottom', toNode: 'l1', toSide: 'top' },
		],
	},
	null,
	2,
);

const VIEW = `filters:
  and:
    - "_type == 'Project'"
views:
  - type: table
    name: Projects
    order:
      - file.name
      - status
      - priority
      - due
`;

/** Daily note for `day` with a few tasks. */
function daily(day: string, extra = ''): string {
	return `# ${day}\n\n## Plan\n- [ ] Review PRs 📅 ${day}\n- [x] Morning stand-up\n${extra}\nLinked: [[Welcome]]\n`;
}

const EVENTS: Array<[string, string]> = [
	['Standup', '_type: Event\ndate: 2026-11-10\nstart: 09:00\nend: 09:30\nevent_color: pink'],
	['Design review', '_type: Event\ndate: 2026-11-10\nstart: 11:00\nend: 12:30\nevent_color: blue'],
	['1-1 with Ana', '_type: Event\ndate: 2026-11-10\nstart: 14:00\nend: 14:45\nevent_color: green'],
	['Sprint planning', '_type: Event\ndate: 2026-11-11\nstart: 10:00\nend: 12:00\nevent_color: orange'],
	['Dentist', '_type: Event\ndate: 2026-11-12\nstart: 08:30\nend: 09:15\nevent_color: yellow'],
	['Launch rehearsal', '_type: Event\ndate: 2026-11-12\nall_day: true\nevent_color: pink'],
	['Team lunch', '_type: Event\ndate: 2026-11-13\nstart: 12:30\nend: 13:30\nevent_color: green'],
	['Retro', '_type: Event\ndate: 2026-11-13\nstart: 16:00\nend: 17:00\nevent_color: blue'],
	['Planning offsite', '_type: Event\ndate: 2026-11-18\nall_day: true\nevent_color: orange'],
	['Release candidate', '_type: Event\ndate: 2026-11-21\nstart: 10:00\nend: 11:00\nevent_color: pink'],
	['Thanksgiving call', '_type: Event\ndate: 2026-11-26\nstart: 18:00\nend: 19:00\nevent_color: green'],
	['Month kickoff', '_type: Event\ndate: 2026-11-02\nstart: 09:30\nend: 10:30\nevent_color: blue'],
	['Conference talk', '_type: Event\ndate: 2026-11-04\nstart: 15:00\nend: 16:00\nevent_color: orange'],
];

/** The seeded vault. `layout: false` drops the layout block so the app uses its default pane sizes. */
function vault(mode: Mode, opts: { layout?: boolean } = {}): Record<string, string> {
	const settings = JSON.parse(TEST_FILES[SETTINGS_PATH]);
	settings.appearance = { activeTheme: THEMES[mode] };
	if (opts.layout === false) delete settings.layout;
	const files: Record<string, string> = {
		[`${V}/.kokobrain/`]: '',
		[SETTINGS_PATH]: JSON.stringify(settings, null, 2),
		[`${V}/Welcome.md`]: WELCOME,
		[`${V}/Dashboard.md`]: DASHBOARD,
		[`${V}/Projects/`]: '',
		[`${V}/Projects/Kokobrain Launch Plan.md`]: RICH,
		[`${V}/Projects/Roadmap.md`]: ROADMAP,
		[`${V}/Projects/Website Redesign.md`]: REDESIGN,
		[`${V}/Projects/Q4 OKRs.md`]: OKRS,
		[`${V}/Projects/Board.kanban`]: KANBAN,
		[`${V}/Projects/Brainstorm.canvas`]: CANVAS,
		[`${V}/Projects/Active.view`]: VIEW,
		[`${V}/Meetings/`]: '',
		[`${V}/Meetings/2026-11-09 Design sync.md`]: DESIGN_SYNC,
		[`${V}/Meetings/2026-11-05 Retro.md`]: RETRO,
		[`${V}/People/`]: '',
		[`${V}/People/Ana Souza.md`]: ANA,
		[`${V}/Areas/`]: '',
		[`${V}/Areas/Health.md`]: HEALTH,
		[`${V}/Areas/Reading List.md`]: READING,
		[`${V}/Daily/`]: '',
		[`${V}/Daily/2026-11-10.md`]: daily('2026-11-10', '- [ ] Write release notes 📅 2026-11-10 🔼\n- [ ] Overdue follow-up 📅 2026-11-05\n'),
		[`${V}/Daily/2026-11-09.md`]: daily('2026-11-09'),
		[`${V}/Daily/2026-11-08.md`]: daily('2026-11-08'),
		[`${V}/Inbox/`]: '',
		[`${V}/Inbox/capture-2026-11-10-08-12-33.md`]: '---\n_organized: false\n---\nIdea: a quieter rail when the window is narrow.\n',
		[`${V}/Inbox/capture-2026-11-09-17-40-02.md`]: '---\n_organized: false\n---\nCall the accountant about the invoice #admin\n',
		[`${V}/Inbox/capture-2026-11-09-09-05-11.md`]: '---\n_organized: false\n---\n- [ ] Buy a USB-C hub\n- [ ] Renew domain\n',
		[`${V}/Events/`]: '',
	};
	for (const [name, fm] of EVENTS) files[`${V}/Events/${name}.md`] = `---\n${fm}\n---\n${name} notes\n`;
	return files;
}

/** Records a capture gap and swallows the failure so the rest of the run continues. */
async function capture(page: Page, name: string, body: () => Promise<void>): Promise<void> {
	try {
		await body();
	} catch (error) {
		appendFileSync(GAPS, `${name}: ${String(error).split('\n').slice(0, 4).join(' | ')}\n`);
		await page.screenshot({ path: `${OUT}/_failed/${name}.png` }).catch(() => {});
	}
}

async function shot(page: Page, slug: string, mode: Mode, clip?: { x: number; y: number; width: number; height: number }): Promise<void> {
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${OUT}/${slug}-${mode}.png`, ...(clip ? { clip } : {}) });
}

/** Waits for the daily-note auto-open, so later keystrokes land in the right tab. */
async function settle(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10' })).toBeVisible({ timeout: 10_000 });
	await page.getByText('Loading...', { exact: true }).waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {});
	await page.waitForTimeout(800);
}

async function openCalendarTab(page: Page): Promise<void> {
	await settle(page);
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
	await expect(page.locator('body')).not.toHaveCSS('pointer-events', 'none');
}

async function openSettings(page: Page, section?: string): Promise<void> {
	await pressShortcut(page, 'Mod+Comma');
	const panel = page.locator('[role="dialog"][aria-label="Settings"]');
	await expect(panel).toBeVisible();
	if (section) await panel.getByRole('button', { name: section, exact: true }).click();
	await page.waitForTimeout(300);
}

const SETTINGS_SECTIONS = [
	'Appearance', 'Editor', 'Layout', 'Types', 'Periodic Notes', 'Quick Capture', '1:1 Notes', 'Calendar',
	'Files & Folders', 'File History', 'Auto Organize', 'Trash', 'Search', 'QueryJS', 'Todoist', 'Labs', 'Sentry',
	'Troubleshooting', 'Update',
];

for (const mode of ['light', 'dark'] as const) {
	test.describe(`design capture ${mode}`, () => {
		test.use({
			vaultFiles: vault(mode),
			clockTime: '2026-11-10T10:00:00+01:00',
			timezoneId: 'Europe/Berlin',
			colorScheme: mode,
			viewport: { width: 1440, height: 900 },
		});

		test('landing today', async ({ vaultPage: page }) => {
			await capture(page, `landing-${mode}`, async () => {
				await settle(page);
				await shot(page, 'landing-today', mode);
			});
		});

		test('editor rich note', async ({ vaultPage: page }) => {
			await capture(page, `editor-${mode}`, async () => {
				await openFile(page, 'Kokobrain Launch Plan.md');
				await page.waitForTimeout(800);
				await shot(page, 'editor-live-preview', mode);
				await page.locator('.cm-scroller').first().evaluate((el) => (el.scrollTop = 900));
				await shot(page, 'editor-live-preview-scrolled', mode);
			});
		});

		test('note list files', async ({ vaultPage: page }) => {
			await capture(page, `note-list-${mode}`, async () => {
				await openFile(page, 'Kokobrain Launch Plan.md');
				await page.locator('[data-rail-item="files"]').click();
				await page.waitForTimeout(500);
				await shot(page, 'files-note-list', mode);
			});
		});

		test('settings appearance', async ({ vaultPage: page }) => {
			await capture(page, `settings-appearance-${mode}`, async () => {
				await settle(page);
				await openSettings(page, 'Appearance');
				await shot(page, 'settings-appearance', mode);
			});
		});

		test('calendar week', async ({ vaultPage: page }) => {
			await capture(page, `calendar-week-${mode}`, async () => {
				await openCalendarTab(page);
				await page.waitForTimeout(800);
				await shot(page, 'calendar-week', mode);
			});
		});

		test('tasks view', async ({ vaultPage: page }) => {
			await capture(page, `tasks-${mode}`, async () => {
				await settle(page);
				await pressShortcut(page, 'Mod+Shift+T');
				await page.getByRole('button', { name: 'All open', exact: true }).click();
				await page.waitForTimeout(1500);
				await shot(page, 'tasks-all-open', mode);
			});
		});

		test('kanban', async ({ vaultPage: page }) => {
			await capture(page, `kanban-${mode}`, async () => {
				await openFile(page, 'Board.kanban');
				await page.waitForTimeout(800);
				await shot(page, 'kanban-board', mode);
			});
		});

		if (mode !== 'light') return;

		test('vault picker', async ({ page }) => {
			await capture(page, 'vault-picker', async () => {
				await page.goto('/', { waitUntil: 'networkidle' });
				await page.evaluate(() => {
					localStorage.setItem(
						'kokobrain:recent-vaults',
						JSON.stringify([
							{ path: '/Users/me/Notes/personal', name: 'personal', openedAt: 3 },
							{ path: '/Users/me/Work/second-brain', name: 'second-brain', openedAt: 2 },
							{ path: '/Users/me/Docs/archive-2024', name: 'archive-2024', openedAt: 1 },
						]),
					);
				});
				await page.reload({ waitUntil: 'networkidle' });
				await page.waitForTimeout(600);
				await shot(page, 'vault-picker', mode);
			});
		});

		test('rail lenses', async ({ vaultPage: page }) => {
			await settle(page);
			for (const key of ['inbox', 'favorites', 'types', 'archive', 'calendar']) {
				await capture(page, `rail-${key}`, async () => {
					await page.locator(`[data-rail-item="${key}"]`).click();
					await page.waitForTimeout(600);
					await shot(page, `rail-${key}`, mode);
				});
			}
		});

		test('source mode and action bar', async ({ vaultPage: page }) => {
			await openFile(page, 'Kokobrain Launch Plan.md');
			await page.waitForTimeout(600);
			await capture(page, 'action-bar', async () => {
				const bar = page.getByTestId('note-action-bar');
				const box = await bar.boundingBox();
				if (!box) throw new Error('no action bar box');
				await shot(page, 'note-action-bar', mode, { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: Math.min(1440 - Math.max(0, box.x - 20), box.width + 40), height: box.height + 60 });
			});
			await capture(page, 'source-mode', async () => {
				await page.getByTestId('note-action-bar').getByRole('button', { name: 'Show raw Markdown' }).click();
				await page.waitForTimeout(500);
				await shot(page, 'editor-source-mode', mode);
			});
		});

		test('properties and sidebar panels', async ({ vaultPage: page }) => {
			await openFile(page, 'Kokobrain Launch Plan.md');
			await page.waitForTimeout(800);
			const sidebar = page.locator('[data-right-sidebar]');
			await capture(page, 'sidebar-default', async () => {
				await shot(page, 'right-sidebar-default', mode);
			});
			await capture(page, 'sidebar-expanded', async () => {
				const headers = sidebar.locator('button:has(h2)');
				const count = await headers.count();
				for (let i = 0; i < count; i++) {
					const header = headers.nth(i);
					if ((await header.getAttribute('aria-expanded')) === 'false') await header.click();
				}
				await page.waitForTimeout(800);
				await shot(page, 'right-sidebar-all-expanded', mode);
			});
			await capture(page, 'sidebar-crop', async () => {
				const box = await sidebar.boundingBox();
				if (!box) throw new Error('no sidebar');
				await shot(page, 'right-sidebar-crop', mode, box);
			});
		});

		test('tabs bar and empty state', async ({ vaultPage: page }) => {
			await settle(page);
			for (const name of ['Roadmap.md', 'Welcome.md', 'Dashboard.md', 'Website Redesign.md']) await openFile(page, name);
			await capture(page, 'tabs', async () => {
				await shot(page, 'tabs-bar-several', mode, { x: 0, y: 0, width: 1440, height: 160 });
			});
			await capture(page, 'empty-editor', async () => {
				for (let i = 0; i < 8; i++) {
					await pressShortcut(page, 'Mod+W');
					await page.waitForTimeout(150);
				}
				await shot(page, 'editor-empty-state', mode);
			});
		});

		test('command palette', async ({ vaultPage: page }) => {
			await settle(page);
			await capture(page, 'palette', async () => {
				await openCommandPalette(page);
				await page.waitForTimeout(600);
				await shot(page, 'command-palette', mode);
				await page.locator('input[placeholder*="command"]:visible').first().fill('cal');
				await shot(page, 'command-palette-filtered', mode);
			});
		});

		test('quick switcher', async ({ vaultPage: page }) => {
			await settle(page);
			await capture(page, 'quick-switcher', async () => {
				await openQuickSwitcher(page);
				await page.keyboard.type('road');
				await shot(page, 'quick-switcher', mode);
			});
		});

		test('search results', async ({ vaultPage: page }) => {
			await settle(page);
			await capture(page, 'search', async () => {
				await openSearch(page);
				await page.locator('[data-rail-search-header] input').fill('design');
				await page.waitForTimeout(1500);
				await shot(page, 'search-results', mode);
			});
		});

		test('settings sections', async ({ vaultPage: page }) => {
			await settle(page);
			await openSettings(page);
			for (const section of SETTINGS_SECTIONS) {
				if (section === 'Appearance') continue;
				await capture(page, `settings-${section}`, async () => {
					const panel = page.locator('[role="dialog"][aria-label="Settings"]');
					await panel.getByRole('button', { name: section, exact: true }).click();
					await page.waitForTimeout(500);
					await shot(page, `settings-${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, mode);
				});
			}
		});

		test('calendar month and day', async ({ vaultPage: page }) => {
			await openCalendarTab(page);
			await capture(page, 'calendar-month', async () => {
				await page.getByRole('tab', { name: 'Month' }).click();
				await page.waitForTimeout(800);
				await shot(page, 'calendar-month', mode);
			});
			await capture(page, 'calendar-day', async () => {
				await page.getByRole('tab', { name: 'Day' }).click();
				await page.waitForTimeout(800);
				await shot(page, 'calendar-day', mode);
			});
		});

		test('calendar plugin navigator', async ({ vaultPage: page }) => {
			await settle(page);
			await capture(page, 'calendar-plugin', async () => {
				await page.locator('[data-rail-item="calendar"]').click();
				await page.locator('[data-calendar-navigator] button[data-date="2026-11-10"]').click();
				await page.waitForTimeout(600);
				await shot(page, 'calendar-plugin-navigator', mode);
			});
		});

		test('canvas', async ({ vaultPage: page }) => {
			await capture(page, 'canvas', async () => {
				await openFile(page, 'Brainstorm.canvas');
				await page.waitForTimeout(1000);
				await shot(page, 'canvas-view', mode);
			});
		});

		test('graph', async ({ vaultPage: page }) => {
			await settle(page);
			await capture(page, 'graph', async () => {
				await pressShortcut(page, 'Mod+G');
				await page.waitForTimeout(2500);
				await shot(page, 'graph-view', mode);
			});
		});

		test('collection block and view file', async ({ vaultPage: page }) => {
			await capture(page, 'collection-block', async () => {
				await openFile(page, 'Dashboard.md');
				await page.waitForTimeout(2000);
				await shot(page, 'collection-and-queryjs-block', mode);
			});
			await capture(page, 'view-file', async () => {
				await openFile(page, 'Active.view');
				await page.waitForTimeout(1200);
				await shot(page, 'view-file-table', mode);
			});
		});

		test('auto organize', async ({ vaultPage: page }) => {
			await settle(page);
			await capture(page, 'auto-organize', async () => {
				await openSettings(page, 'Auto Organize');
				const panel = page.locator('[role="dialog"][aria-label="Settings"]');
				await panel.getByRole('switch').first().click();
				await panel.getByRole('button', { name: 'Add rule' }).click();
				await panel.getByPlaceholder('Rule name').fill('Projects get an owner');
				await panel.getByRole('button', { name: 'Add expression' }).click();
				const expression = panel.getByPlaceholder('Expression...');
				await expression.fill('file.inFolder("Projects")');
				await expression.press('Tab');
				await panel.getByRole('button', { name: 'Add property' }).click();
				const key = panel.getByLabel('Property key');
				await key.fill('owner');
				await key.press('Tab');
				const value = panel.getByLabel('Property value');
				await value.fill('me');
				await value.press('Tab');
				await page.waitForTimeout(800);
				await shot(page, 'auto-organize-rule-builder', mode);
			});
		});

		test('file history', async ({ vaultPage: page }) => {
			await capture(page, 'file-history', async () => {
				await openFile(page, 'Kokobrain Launch Plan.md');
				await openCommandPalette(page);
				await page.locator('input[placeholder*="command"]:visible').first().fill('View File History');
				await page.keyboard.press('Enter');
				await expect(page.getByRole('heading', { name: /File History/ })).toBeVisible();
				await page.waitForTimeout(800);
				await shot(page, 'file-history', mode);
			});
		});

		test('note row context menu', async ({ vaultPage: page }) => {
			await capture(page, 'context-menu', async () => {
				await settle(page);
				await page.locator('[data-rail-item="files"]').click();
				await page.locator(`[data-files-navigator-folder="${V}/Projects"]`).click();
				await page.locator('[data-rail-note-list] [data-note-row]').first().click({ button: 'right' });
				await page.waitForTimeout(500);
				await shot(page, 'note-row-context-menu', mode);
			});
		});

		test('narrow window', async ({ vaultPage: page }) => {
			await page.setViewportSize({ width: 1024, height: 700 });
			await openFile(page, 'Kokobrain Launch Plan.md');
			await capture(page, 'narrow', async () => {
				await page.waitForTimeout(800);
				await shot(page, 'narrow-1024x700-editor', mode);
			});
			await capture(page, 'narrow-today', async () => {
				await page.locator('[data-rail-item="today"]').click();
				await page.waitForTimeout(500);
				await shot(page, 'narrow-1024x700-today', mode);
			});
		});
	});
}

test.describe('design capture default pane sizes', () => {
	test.use({
		vaultFiles: vault('light', { layout: false }),
		clockTime: '2026-11-10T10:00:00+01:00',
		timezoneId: 'Europe/Berlin',
		colorScheme: 'light',
		viewport: { width: 1440, height: 900 },
	});

	test('default layout', async ({ vaultPage: page }) => {
		await capture(page, 'default-layout', async () => {
			await settle(page);
			await shot(page, 'landing-default-pane-sizes', 'light');
		});
	});
});
