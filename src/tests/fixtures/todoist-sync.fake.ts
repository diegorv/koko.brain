/**
 * A fake Todoist Sync API (`POST https://api.todoist.com/api/v1/sync`) for
 * tests that run the real `@doist/todoist-sdk` through the real plugin-http
 * fetch adapter. Plug it in as the `@tauri-apps/plugin-http` `fetch` mock:
 *
 * ```ts
 * const { fake } = vi.hoisted(() => ({ fake: { current: null as FakeTodoist | null } }));
 * vi.mock('@tauri-apps/plugin-http', () => ({ fetch: (url: string, init?: RequestInit) => fake.current!.fetch(url, init) }));
 * beforeEach(() => { fake.current = createFakeTodoist(); });
 * ```
 *
 * Wire format is the API's (snake_case JSON); the SDK camel-cases it. Every
 * resource carries the version of its last change, and a `sync_token` is
 * `v<N>`: `*` returns every live resource (no checked items, as the real API
 * does), `v<N>` returns what changed after
 * N, deleted resources included (with `is_deleted: true`). Commands answer
 * with `sync_status` keyed by uuid and `temp_id_mapping` keyed by temp_id;
 * a replayed uuid returns its first outcome without applying it again.
 * `item_close` on a recurring item rolls its date forward, unless the rule
 * says `starting`, which completes it for good (`research/live-check.md` R).
 * An `item_update` of `due` keeps the recurrence only when it sends the rule
 * as `string` (live-check 7); an `item_add` stores only item fields, and a
 * due sent as a rule alone gets its first date. `project_add` and
 * `project_update` (name only) change projects; a temp id is resolved only
 * in the request that created it, so a client that splits its commands
 * over requests must send the real id. A full sync leaves archived projects
 * and sections out ("active resource data", API docs); an incremental one
 * reports them. `section_add` adds a section; `item_move` takes one of
 * `section_id` (the item goes to that section and its project) or
 * `project_id` (the item goes to the root of that project, out of any
 * section).
 *
 * Extend this file when an engine ticket needs another command or resource.
 */

/** Raw API item (`items` resource). */
export interface FakeItem {
	id: string;
	user_id: string;
	project_id: string;
	section_id: string | null;
	parent_id: string | null;
	added_by_uid: string | null;
	assigned_by_uid: string | null;
	responsible_uid: string | null;
	labels: string[];
	deadline: { date: string; lang: string } | null;
	duration: { amount: number; unit: 'minute' | 'day' } | null;
	checked: boolean;
	is_deleted: boolean;
	added_at: string | null;
	completed_at: string | null;
	updated_at: string | null;
	due: { is_recurring: boolean; string: string; date: string; datetime?: string | null; timezone?: string | null; lang?: string | null } | null;
	priority: number;
	child_order: number;
	content: string;
	description: string;
	day_order: number;
	is_collapsed: boolean;
}

/** Raw API personal project (`projects` resource). */
export interface FakeProject {
	id: string;
	can_assign_tasks: boolean;
	child_order: number;
	color: string;
	created_at: string | null;
	is_archived: boolean;
	is_deleted: boolean;
	is_favorite: boolean;
	is_frozen: boolean;
	name: string;
	updated_at: string | null;
	view_style: string;
	default_order: number;
	description: string;
	is_collapsed: boolean;
	is_shared: boolean;
	parent_id: string | null;
	inbox_project: boolean;
}

/** Raw API section (`sections` resource). */
export interface FakeSection {
	id: string;
	user_id: string;
	project_id: string;
	added_at: string;
	updated_at: string;
	archived_at: string | null;
	name: string;
	description: string | null;
	section_order: number;
	is_archived: boolean;
	is_deleted: boolean;
	is_collapsed: boolean;
}

/** A Sync API command as the SDK sends it (snake_case args). */
export interface FakeCommand {
	type: string;
	uuid: string;
	temp_id?: string;
	args: Record<string, unknown>;
}

/** The parsed body of one request the fake received. */
export interface FakeRequest {
	sync_token?: string;
	resource_types?: string[];
	commands?: FakeCommand[];
}

/**
 * A failure for the next request(s):
 * - `rate-limit`: 429 with `error_extra.retry_after`.
 * - `unauthorized`: 401.
 * - `server-error`: 503.
 * - `dropped`: the request is applied, then the response is lost (fetch
 *   rejects with a network `TypeError`, which the SDK retries).
 * - `offline`: fetch rejects with a network `TypeError` without applying.
 */
export type FakeFailure =
	| { kind: 'rate-limit'; retryAfter?: number }
	| { kind: 'unauthorized' }
	| { kind: 'server-error' }
	| { kind: 'dropped' }
	| { kind: 'offline' };

/** The fake server. */
export interface FakeTodoist {
	/** The plugin-http `fetch` the adapter calls. */
	fetch(url: string, init?: RequestInit): Promise<Response>;
	/** Bearer token the server accepts; any other gets 401. */
	token: string;
	/** Current version; the next full or incremental sync returns `v<version>`. */
	readonly version: number;
	/** Every request received, in order, including failed ones. */
	readonly requests: FakeRequest[];
	/** Adds or replaces a project; returns the stored row. */
	addProject(project: Partial<FakeProject> & { id: string; name: string }): FakeProject;
	/** Adds or replaces a section; returns the stored row. */
	addSection(section: Partial<FakeSection> & { id: string; project_id: string; name: string }): FakeSection;
	/** Adds or replaces an item; returns the stored row. */
	addItem(item: Partial<FakeItem> & { id: string; project_id: string; content: string }): FakeItem;
	/** Changes a project as if edited in Todoist, bumping its version. */
	updateProject(id: string, patch: Partial<FakeProject>): FakeProject;
	/** The stored project, or undefined. */
	project(id: string): FakeProject | undefined;
	/** Every stored project, deleted and archived ones included, in insertion order. */
	projects(): FakeProject[];
	/** Changes a section as if edited in Todoist, bumping its version. */
	updateSection(id: string, patch: Partial<FakeSection>): FakeSection;
	/** The stored section, or undefined. */
	section(id: string): FakeSection | undefined;
	/** Every stored section, deleted and archived ones included, in insertion order. */
	sections(): FakeSection[];
	/** Changes an item as if edited in Todoist, bumping its version. */
	updateItem(id: string, patch: Partial<FakeItem>): FakeItem;
	/** The stored item, or undefined. */
	item(id: string): FakeItem | undefined;
	/** Every stored item, deleted ones included, in insertion order. */
	items(): FakeItem[];
	/** Queues a failure for the next `times` requests (default 1). */
	failNext(failure: FakeFailure, times?: number): void;
	/** Answers every later command on item `id` with a 400 `sync_status`, applying nothing. */
	refuseCommandsFor(id: string): void;
	/** Answers every later `item_add` into project `projectId` with a 400 `sync_status`, applying nothing. */
	refuseAddsIn(projectId: string): void;
	/** Answers every later `project_add` and `project_update` with a 400 `sync_status`, applying nothing. */
	refuseProjectCommands(): void;
	/** Answers every later `section_add` with a 400 `sync_status`, applying nothing. */
	refuseSectionAdds(): void;
}

const USER_ID = 'u1';
const STAMP = '2026-11-01T10:00:00.000000Z';

/** The next date of a recurring due: `every week` +7 days, `every month` +1 month, anything else +1 day. A time part is kept. */
function nextOccurrence(date: string, rule: string): string {
	const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
	if (/\bweek\b/iu.test(rule)) d.setUTCDate(d.getUTCDate() + 7);
	else if (/\bmonth\b/iu.test(rule)) d.setUTCMonth(d.getUTCMonth() + 1);
	else d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10) + date.slice(10);
}

/** An `item_update` due as sent (snake_case). */
type UpdateDue = { date?: string; string?: string; timezone?: string | null; lang?: string };

/**
 * The due an `item_update` leaves (live-check 7): without a `string` the
 * date becomes the text and the recurrence is gone; with one, the rule is
 * whatever `string` says (`every ...` repeats). `null` removes the due.
 */
function updatedDue(before: FakeItem['due'], sent: UpdateDue | null): FakeItem['due'] {
	if (sent === null || sent.date === undefined) return null;
	const text = sent.string ?? sent.date;
	return {
		date: sent.date,
		string: text,
		is_recurring: /\bevery\b/iu.test(text),
		datetime: sent.date.includes('T') ? sent.date : null,
		timezone: sent.timezone ?? null,
		lang: sent.lang ?? before?.lang ?? null,
	};
}

/**
 * The due an `item_add` leaves (live-check R): a date, with or without a
 * rule, as {@link updatedDue}; a rule alone (`{string}`) starts on its next
 * occurrence after the fake's clock day, as Todoist picks the first date.
 */
function addedDue(sent: UpdateDue | null | undefined): FakeItem['due'] {
	if (!sent) return null;
	if (sent.date === undefined && sent.string !== undefined) {
		return { date: nextOccurrence(STAMP.slice(0, 10), sent.string), string: sent.string, is_recurring: true, datetime: null, timezone: null, lang: sent.lang ?? 'en' };
	}
	return updatedDue(null, sent);
}

/** Creates an empty fake server accepting the token `test-token`. */
export function createFakeTodoist(): FakeTodoist {
	let version = 1;
	let nextId = 1000;
	const projects = new Map<string, { row: FakeProject; v: number }>();
	const sections = new Map<string, { row: FakeSection; v: number }>();
	const items = new Map<string, { row: FakeItem; v: number }>();
	const outcomes = new Map<string, { status: unknown; tempId?: string; id?: string }>();
	const failures: FakeFailure[] = [];
	const requests: FakeRequest[] = [];
	const refused = new Set<string>();
	const refusedProjects = new Set<string>();
	let refuseProjects = false;
	let refuseSections = false;

	const bump = () => ++version;

	function storeItem(row: FakeItem): FakeItem {
		items.set(row.id, { row, v: bump() });
		return row;
	}

	function newItem(fields: Partial<FakeItem> & { id: string; project_id: string; content: string }): FakeItem {
		return {
			user_id: USER_ID,
			section_id: null,
			parent_id: null,
			added_by_uid: USER_ID,
			assigned_by_uid: null,
			responsible_uid: null,
			labels: [],
			deadline: null,
			duration: null,
			checked: false,
			is_deleted: false,
			added_at: STAMP,
			completed_at: null,
			updated_at: STAMP,
			due: null,
			priority: 1,
			child_order: 1,
			description: '',
			day_order: -1,
			is_collapsed: false,
			...fields,
		};
	}

	function commandError(error: string, httpCode = 400) {
		return { error, error_code: 20, error_extra: {}, error_tag: 'INVALID_ARGUMENT', http_code: httpCode };
	}

	function storeProject(row: FakeProject): FakeProject {
		projects.set(row.id, { row, v: bump() });
		return row;
	}

	function storeSection(row: FakeSection): FakeSection {
		sections.set(row.id, { row, v: bump() });
		return row;
	}

	function newSection(fields: Partial<FakeSection> & { id: string; project_id: string; name: string }): FakeSection {
		return {
			user_id: USER_ID,
			added_at: STAMP,
			updated_at: STAMP,
			archived_at: null,
			description: null,
			section_order: 1,
			is_archived: false,
			is_deleted: false,
			is_collapsed: false,
			...fields,
		};
	}

	function newProject(fields: Partial<FakeProject> & { id: string; name: string }): FakeProject {
		return {
			can_assign_tasks: false,
			child_order: 1,
			color: 'charcoal',
			created_at: STAMP,
			is_archived: false,
			is_deleted: false,
			is_favorite: false,
			is_frozen: false,
			updated_at: STAMP,
			view_style: 'list',
			default_order: 0,
			description: '',
			is_collapsed: false,
			is_shared: false,
			parent_id: null,
			inbox_project: false,
			...fields,
		};
	}

	/** Applies one command (temp ids of this request already resolved); returns its `sync_status` value and any new id. */
	function apply(cmd: FakeCommand): { status: unknown; id?: string } {
		const args = cmd.args;
		if (cmd.type.startsWith('project_')) return applyProject(cmd);
		if (cmd.type === 'section_add') {
			if (refuseSections) return { status: commandError('Invalid argument value') };
			if (typeof args.name !== 'string' || typeof args.project_id !== 'string') return { status: commandError('name and project_id required') };
			if (!projects.has(args.project_id)) return { status: commandError('Project not found', 404) };
			const id = `s${nextId++}`;
			storeSection(newSection({ id, project_id: args.project_id, name: args.name }));
			return { status: 'ok', id };
		}
		if (typeof args.id === 'string' && refused.has(args.id)) return { status: commandError('Invalid argument value') };
		if (cmd.type === 'item_add' && typeof args.project_id === 'string' && refusedProjects.has(args.project_id)) {
			return { status: commandError('Invalid argument value') };
		}
		const existing = typeof args.id === 'string' ? items.get(args.id) : undefined;
		switch (cmd.type) {
			case 'item_add': {
				if (typeof args.content !== 'string' || typeof args.project_id !== 'string') {
					return { status: commandError('content and project_id required') };
				}
				if (!projects.has(args.project_id)) return { status: commandError('Project not found', 404) };
				const id = String(nextId++);
				// Only item fields are stored; command options such as `auto_parse_labels` are not.
				const known = ['description', 'priority', 'labels', 'section_id', 'parent_id', 'child_order'] as const;
				const fields = Object.fromEntries(known.filter((k) => k in args).map((k) => [k, args[k]])) as Partial<FakeItem>;
				storeItem(newItem({ ...fields, id, content: args.content, project_id: args.project_id, due: addedDue(args.due as UpdateDue | null | undefined) }));
				return { status: 'ok', id };
			}
			case 'item_update': {
				if (!existing) return { status: commandError('Item not found', 404) };
				const { id: _id, ...patch } = args;
				if ('due' in patch) patch.due = updatedDue(existing.row.due, patch.due as UpdateDue | null);
				storeItem({ ...existing.row, ...(patch as Partial<FakeItem>), updated_at: STAMP });
				return { status: 'ok' };
			}
			case 'item_close': {
				if (!existing) return { status: commandError('Item not found', 404) };
				const due = existing.row.due;
				// live-check R: a plain recurring rule rolls forward; one with `starting <date>` completes for good.
				if (due?.is_recurring && !/\bstarting\b/iu.test(due.string)) {
					storeItem({ ...existing.row, due: { ...due, date: nextOccurrence(due.date, due.string) } });
				} else {
					storeItem({ ...existing.row, checked: true, completed_at: STAMP, due: due?.is_recurring ? null : due });
				}
				return { status: 'ok' };
			}
			case 'item_move': {
				if (!existing) return { status: commandError('Item not found', 404) };
				if (typeof args.section_id === 'string') {
					const section = sections.get(args.section_id);
					if (!section || section.row.is_deleted) return { status: commandError('Section not found', 404) };
					storeItem({ ...existing.row, project_id: section.row.project_id, section_id: section.row.id });
				} else if (typeof args.project_id === 'string') {
					if (!projects.has(args.project_id)) return { status: commandError('Project not found', 404) };
					storeItem({ ...existing.row, project_id: args.project_id, section_id: null });
				} else {
					return { status: commandError('section_id or project_id required') };
				}
				return { status: 'ok' };
			}
			case 'item_uncomplete': {
				if (!existing) return { status: commandError('Item not found', 404) };
				storeItem({ ...existing.row, checked: false, completed_at: null });
				return { status: 'ok' };
			}
			case 'item_delete': {
				if (!existing) return { status: commandError('Item not found', 404) };
				storeItem({ ...existing.row, is_deleted: true });
				return { status: 'ok' };
			}
			default:
				return { status: commandError(`Unknown command ${cmd.type}`) };
		}
	}

	function applyProject(cmd: FakeCommand): { status: unknown; id?: string } {
		const args = cmd.args;
		if (refuseProjects) return { status: commandError('Invalid argument value') };
		switch (cmd.type) {
			case 'project_add': {
				if (typeof args.name !== 'string') return { status: commandError('name required') };
				const parent = typeof args.parent_id === 'string' ? args.parent_id : null;
				if (parent !== null && !projects.has(parent)) return { status: commandError('Parent project not found', 404) };
				const id = `p${nextId++}`;
				storeProject(newProject({ id, name: args.name, parent_id: parent }));
				return { status: 'ok', id };
			}
			case 'project_update': {
				const existing = typeof args.id === 'string' ? projects.get(args.id) : undefined;
				if (!existing || existing.row.is_deleted) return { status: commandError('Project not found', 404) };
				storeProject({ ...existing.row, ...(typeof args.name === 'string' ? { name: args.name } : {}), updated_at: STAMP });
				return { status: 'ok' };
			}
			default:
				return { status: commandError(`Unknown command ${cmd.type}`) };
		}
	}

	/** `args` with every string value that is a temp id of this request replaced by its real id. */
	function resolveTempIds(args: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
		return Object.fromEntries(Object.entries(args).map(([k, v]) => [k, typeof v === 'string' && v in mapping ? mapping[v] : v]));
	}

	function since<T>(map: Map<string, { row: T & { is_deleted: boolean }; v: number }>, from: number | null): T[] {
		return [...map.values()]
			.filter(({ row, v }) => (from === null ? !row.is_deleted : v > from))
			.map(({ row }) => structuredClone(row));
	}

	function json(status: number, body: unknown): Response {
		return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
	}

	function respond(body: FakeRequest): Response {
		const syncStatus: Record<string, unknown> = {};
		const tempIdMapping: Record<string, string> = {};
		for (const cmd of body.commands ?? []) {
			let outcome = outcomes.get(cmd.uuid);
			if (!outcome) {
				const result = apply({ ...cmd, args: resolveTempIds(cmd.args, tempIdMapping) });
				outcome = { status: result.status, tempId: cmd.temp_id, id: result.id };
				outcomes.set(cmd.uuid, outcome);
			}
			syncStatus[cmd.uuid] = outcome.status;
			if (outcome.tempId && outcome.id) tempIdMapping[outcome.tempId] = outcome.id;
		}

		const response: Record<string, unknown> = {};
		if (body.commands?.length) {
			response.sync_status = syncStatus;
			response.temp_id_mapping = tempIdMapping;
		}
		const token = body.sync_token;
		if (token !== undefined) {
			const from = token === '*' ? null : Number(/^v(\d+)$/.exec(token)?.[1] ?? Number.NaN);
			if (from !== null && Number.isNaN(from)) return json(400, commandError('Invalid sync token'));
			const types = new Set(body.resource_types ?? []);
			const wants = (type: string) => types.has(type) || types.has('all');
			if (wants('projects')) response.projects = since(projects, from).filter((p) => from !== null || !p.is_archived);
			if (wants('sections')) response.sections = since(sections, from).filter((s) => from !== null || !s.is_archived);
			// A full sync returns only uncompleted items (live-check 5b).
			if (wants('items')) response.items = since(items, from).filter((i) => from !== null || !i.checked);
			response.full_sync = from === null;
			response.sync_token = `v${version}`;
		}
		return json(200, response);
	}

	const fake: FakeTodoist = {
		token: 'test-token',
		get version() {
			return version;
		},
		requests,

		async fetch(url: string, init?: RequestInit): Promise<Response> {
			if (!url.endsWith('/api/v1/sync')) throw new Error(`fake Todoist: unexpected URL ${url}`);
			const body = JSON.parse(String(init?.body ?? '{}')) as FakeRequest;
			requests.push(body);

			const failure = failures.shift();
			if (failure?.kind === 'offline') throw new TypeError('Network request failed: fetch');
			if (failure?.kind === 'unauthorized') return json(401, { error: 'Unauthorized', http_code: 401 });
			if (failure?.kind === 'server-error') return json(503, { error: 'Service Unavailable', http_code: 503 });
			if (failure?.kind === 'rate-limit') {
				return json(429, {
					error: 'Too many requests',
					error_code: 35,
					error_extra: failure.retryAfter === undefined ? {} : { retry_after: failure.retryAfter },
					error_tag: 'LIMITS_REACHED',
					http_code: 429,
				});
			}

			const headers = new Headers(init?.headers);
			if (headers.get('authorization') !== `Bearer ${fake.token}`) {
				return json(401, { error: 'Invalid token', http_code: 401 });
			}

			const response = respond(body);
			if (failure?.kind === 'dropped') throw new TypeError('Network request failed: fetch');
			return response;
		},

		addProject(project) {
			return storeProject(newProject(project));
		},

		updateProject(id, patch) {
			const existing = projects.get(id);
			if (!existing) throw new Error(`fake Todoist: no project ${id}`);
			return storeProject({ ...existing.row, ...patch });
		},

		project(id) {
			return projects.get(id)?.row;
		},

		projects() {
			return [...projects.values()].map(({ row }) => row);
		},

		addSection(section) {
			return storeSection(newSection(section));
		},

		updateSection(id, patch) {
			const existing = sections.get(id);
			if (!existing) throw new Error(`fake Todoist: no section ${id}`);
			return storeSection({ ...existing.row, ...patch });
		},

		section(id) {
			return sections.get(id)?.row;
		},

		sections() {
			return [...sections.values()].map(({ row }) => row);
		},

		addItem(item) {
			return storeItem(newItem(item));
		},

		updateItem(id, patch) {
			const existing = items.get(id);
			if (!existing) throw new Error(`fake Todoist: no item ${id}`);
			return storeItem({ ...existing.row, ...patch });
		},

		item(id) {
			return items.get(id)?.row;
		},

		items() {
			return [...items.values()].map(({ row }) => row);
		},

		failNext(failure, times = 1) {
			for (let i = 0; i < times; i++) failures.push(failure);
		},

		refuseCommandsFor(id) {
			refused.add(id);
		},

		refuseAddsIn(projectId) {
			refusedProjects.add(projectId);
		},

		refuseProjectCommands() {
			refuseProjects = true;
		},

		refuseSectionAdds() {
			refuseSections = true;
		},
	};
	return fake;
}
