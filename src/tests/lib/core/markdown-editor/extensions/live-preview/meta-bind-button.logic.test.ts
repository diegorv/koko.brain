import { describe, it, expect } from 'vitest';
import {
	parseButtonConfig,
	validateButtonConfig,
	getButtonActions,
} from '$lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic';

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
