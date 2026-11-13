import { describe, it, expect } from 'vitest';
import {
	parseButtonConfig,
	validateButtonConfig,
	getButtonActions,
	buttonConfigError,
} from '#lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.js';

describe('parseButtonConfig', () => {
	it('parses a basic config with single action', () => {
		const config = parseButtonConfig(`
label: Mark as Done
style: primary
action:
  type: updateMetadata
  bindTarget: status
  value: done
`);
		expect(config).not.toBeNull();
		expect(config!.label).toBe('Mark as Done');
		expect(config!.style).toBe('primary');
		expect(config!.action).toEqual({
			type: 'updateMetadata',
			bindTarget: 'status',
			value: 'done',
		});
	});

	it('parses updateMetadata action with correct fields', () => {
		const config = parseButtonConfig(`
label: Update
action:
  type: updateMetadata
  bindTarget: priority
  value: high
`);
		expect(config).not.toBeNull();
		expect(config!.action!.type).toBe('updateMetadata');
		const action = config!.action! as { type: string; bindTarget: string; value: string };
		expect(action.bindTarget).toBe('priority');
		expect(action.value).toBe('high');
	});

	it('parses open action with wikilink', () => {
		const config = parseButtonConfig(`
label: Open Note
action:
  type: open
  link: "[[My Note]]"
`);
		expect(config).not.toBeNull();
		expect(config!.action!.type).toBe('open');
		const action = config!.action! as { type: string; link: string };
		expect(action.link).toBe('[[My Note]]');
	});

	it('parses open action with URL', () => {
		const config = parseButtonConfig(`
label: Visit Site
action:
  type: open
  link: "https://example.com"
`);
		expect(config).not.toBeNull();
		const action = config!.action! as { type: string; link: string };
		expect(action.link).toBe('https://example.com');
	});

	it('parses createNote action', () => {
		const config = parseButtonConfig(`
label: New Meeting
action:
  type: createNote
  fileName: Meeting Notes
  folderPath: meetings
  openNote: true
`);
		expect(config).not.toBeNull();
		const action = config!.action! as {
			type: string;
			fileName: string;
			folderPath: string;
			openNote: boolean;
		};
		expect(action.type).toBe('createNote');
		expect(action.fileName).toBe('Meeting Notes');
		expect(action.folderPath).toBe('meetings');
		expect(action.openNote).toBe(true);
	});

	it('parses multiple actions', () => {
		const config = parseButtonConfig(`
label: Do Both
actions:
  - type: updateMetadata
    bindTarget: status
    value: done
  - type: open
    link: "[[Summary]]"
`);
		expect(config).not.toBeNull();
		expect(config!.actions).toHaveLength(2);
		expect(config!.actions![0].type).toBe('updateMetadata');
		expect(config!.actions![1].type).toBe('open');
	});

	it('returns null for missing label', () => {
		const config = parseButtonConfig(`
style: primary
action:
  type: updateMetadata
  bindTarget: status
  value: done
`);
		expect(config).toBeNull();
	});

	it('returns null for missing action and actions', () => {
		const config = parseButtonConfig(`
label: No Action
style: primary
`);
		expect(config).toBeNull();
	});

	it('falls back to default for invalid style', () => {
		const config = parseButtonConfig(`
label: Test
style: invalid
action:
  type: open
  link: "https://example.com"
`);
		expect(config).not.toBeNull();
		expect(config!.style).toBe('default');
	});

	it('falls back to default when style is absent', () => {
		const config = parseButtonConfig(`
label: Test
action:
  type: open
  link: "https://example.com"
`);
		expect(config).not.toBeNull();
		expect(config!.style).toBe('default');
	});

	it('returns null for invalid YAML', () => {
		expect(parseButtonConfig(':::invalid')).toBeNull();
	});

	it('parses optional tooltip', () => {
		const config = parseButtonConfig(`
label: Click
tooltip: Click me to proceed
action:
  type: open
  link: "https://example.com"
`);
		expect(config).not.toBeNull();
		expect(config!.tooltip).toBe('Click me to proceed');
	});

	it('parses optional id', () => {
		const config = parseButtonConfig(`
label: My Button
id: my-btn
action:
  type: open
  link: "https://example.com"
`);
		expect(config).not.toBeNull();
		expect(config!.id).toBe('my-btn');
	});

	it('accepts `prop` as alias for `bindTarget` in updateMetadata (single action)', () => {
		const config = parseButtonConfig(`
label: Update
action:
  type: updateMetadata
  prop: status
  value: doing
`);
		expect(config).not.toBeNull();
		expect(config!.action).toEqual({
			type: 'updateMetadata',
			bindTarget: 'status',
			value: 'doing',
		});
	});

	it('accepts `prop` as alias for `bindTarget` in updateMetadata (actions array)', () => {
		const config = parseButtonConfig(`
label: Update
actions:
  - type: updateMetadata
    prop: status
    value: done
  - type: updateMetadata
    prop: prioridade
    value: baixa
`);
		expect(config).not.toBeNull();
		expect(config!.actions).toHaveLength(2);
		expect(config!.actions![0]).toEqual({
			type: 'updateMetadata',
			bindTarget: 'status',
			value: 'done',
		});
		expect(config!.actions![1]).toEqual({
			type: 'updateMetadata',
			bindTarget: 'prioridade',
			value: 'baixa',
		});
	});

	it('returns null when updateMetadata is missing bindTarget', () => {
		const config = parseButtonConfig(`
label: Test
action:
  type: updateMetadata
  value: done
`);
		expect(config).toBeNull();
	});

	it('returns null when updateMetadata is missing value', () => {
		const config = parseButtonConfig(`
label: Test
action:
  type: updateMetadata
  bindTarget: status
`);
		expect(config).toBeNull();
	});

	it('returns null when open is missing link', () => {
		const config = parseButtonConfig(`
label: Test
action:
  type: open
`);
		expect(config).toBeNull();
	});

	it('returns null when createNote is missing fileName', () => {
		const config = parseButtonConfig(`
label: Test
action:
  type: createNote
  folderPath: meetings
`);
		expect(config).toBeNull();
	});
});

describe('parseButtonConfig: updateMetadata value types', () => {
	const single = (value: string) => parseButtonConfig(`label: Go\naction:\n  type: updateMetadata\n  prop: count\n  value: ${value}\n`);

	it.each([
		['3', 3],
		['true', true],
		['false', false],
		['"3"', '3'],
		['done', 'done'],
	])('value %s is kept as %j', (raw, expected) => {
		expect(single(raw)?.action).toEqual({ type: 'updateMetadata', bindTarget: 'count', value: expected });
	});

	it.each(['[a, b]', '{ a: 1 }', 'null', '~'])('value %s is invalid', (raw) => {
		expect(single(raw)).toBeNull();
	});
});

describe('buttonConfigError', () => {
	it.each([
		['label: [unclosed', 'YAML does not parse'],
		['', 'expected a map with label and action'],
		['just text', 'expected a map with label and action'],
		['action: { type: open, link: x }', 'label missing'],
		['label: Go', 'no action or actions'],
		['label: Go\nactions: []', 'no action or actions'],
		['label: Go\naction: { type: launch }', 'unknown action type "launch"'],
		['label: Go\naction: open', 'an action is not a map'],
		['label: Go\naction: { link: x }', 'an action has no type'],
		['label: Go\naction: { type: updateMetadata, prop: status }', 'updateMetadata needs prop and value'],
		['label: Go\naction: { type: updateMetadata, value: done }', 'updateMetadata needs prop and value'],
		['label: Go\naction: { type: open }', 'open needs link'],
		['label: Go\naction: { type: createNote }', 'createNote needs fileName'],
		['label: Go\nactions:\n  - { type: open, link: x }\n  - { type: createNote }', 'createNote needs fileName'],
		['label: Go\naction: { type: openView }', 'openView needs a .view path'],
		['label: Go\naction: { type: openView, path: "" }', 'openView needs a .view path'],
		['label: Go\naction: { type: openView, path: 3 }', 'openView needs a .view path'],
		['label: Go\naction: { type: openView, path: Projects.md }', 'openView needs a .view path'],
		['label: Go\naction: { type: openView, path: _system/views }', 'openView needs a .view path'],
		['label: Go\naction: { type: openView, path: ../Projects.view }', 'openView path leaves the vault'],
		['label: Go\naction: { type: openView, path: a/../../Projects.view }', 'openView path leaves the vault'],
	])('%j -> %s', (yaml, reason) => {
		expect(buttonConfigError(yaml)).toBe(reason);
		expect(parseButtonConfig(yaml)).toBeNull();
	});

	it('is null for a valid config', () => {
		expect(buttonConfigError('label: Go\naction: { type: open, link: x }')).toBeNull();
		expect(buttonConfigError('label: Go\nstyle: unknown\nactions:\n  - { type: updateMetadata, prop: n, value: 3 }')).toBeNull();
	});

	it.each([
		'_system/views/Projects.view',
		'Projects.VIEW',
		'a/../Projects.view',
		'/Projects.view',
	])('is null for an openView of %s', (path) => {
		expect(buttonConfigError(`label: Go\naction: { type: openView, path: "${path}" }`)).toBeNull();
	});
});

describe('parseButtonConfig: openView', () => {
	it('keeps the vault-relative path', () => {
		const config = parseButtonConfig('label: Projetos\naction:\n  type: openView\n  path: _system/views/Projects.view\n');
		expect(config?.action).toEqual({ type: 'openView', path: '_system/views/Projects.view' });
	});

	it('ignores an unknown field and still renders the button', () => {
		const config = parseButtonConfig('label: Go\nhidden: true\naction:\n  type: openView\n  path: Projects.view\n  newTab: true\n');
		expect(config).not.toBeNull();
		expect(getButtonActions(config!)).toEqual([{ type: 'openView', path: 'Projects.view', newTab: true }]);
	});
});

describe('validateButtonConfig', () => {
	it('returns false for null', () => {
		expect(validateButtonConfig(null)).toBe(false);
	});

	it('returns false for non-object', () => {
		expect(validateButtonConfig('string')).toBe(false);
	});

	it('returns false for empty label', () => {
		expect(validateButtonConfig({ label: '', action: { type: 'open', link: 'http://x' } })).toBe(false);
	});
});

describe('getButtonActions', () => {
	it('normalizes single action into array', () => {
		const actions = getButtonActions({
			label: 'Test',
			style: 'default',
			action: { type: 'open', link: 'https://example.com' },
		});
		expect(actions).toHaveLength(1);
		expect(actions[0].type).toBe('open');
	});

	it('returns actions array directly', () => {
		const actions = getButtonActions({
			label: 'Test',
			style: 'default',
			actions: [
				{ type: 'open', link: 'https://example.com' },
				{ type: 'updateMetadata', bindTarget: 'x', value: 'y' },
			],
		});
		expect(actions).toHaveLength(2);
	});

	it('returns empty array when no actions', () => {
		const actions = getButtonActions({
			label: 'Test',
			style: 'default',
		});
		expect(actions).toHaveLength(0);
	});
});
