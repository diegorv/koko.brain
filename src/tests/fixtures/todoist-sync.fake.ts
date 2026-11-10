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
 * `v<N>`: `*` returns every live resource, `v<N>` returns what changed after
 * N, deleted resources included (with `is_deleted: true`). Commands answer
 * with `sync_status` keyed by uuid and `temp_id_mapping` keyed by temp_id;
 * a replayed uuid returns its first outcome without applying it again.
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
	/** Changes an item as if edited in Todoist, bumping its version. */
	updateItem(id: string, patch: Partial<FakeItem>): FakeItem;
	/** The stored item, or undefined. */
	item(id: string): FakeItem | undefined;
	/** Queues a failure for the next `times` requests (default 1). */
	failNext(failure: FakeFailure, times?: number): void;
}

const USER_ID = 'u1';
const STAMP = '2026-11-01T10:00:00.000000Z';

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

	/** Applies one command; returns its `sync_status` value and any new id. */
	function apply(cmd: FakeCommand): { status: unknown; id?: string } {
		const args = cmd.args;
		const existing = typeof args.id === 'string' ? items.get(args.id) : undefined;
		switch (cmd.type) {
			case 'item_add': {
				if (typeof args.content !== 'string' || typeof args.project_id !== 'string') {
					return { status: commandError('content and project_id required') };
				}
				const id = String(nextId++);
				const { content, project_id, ...rest } = args as Record<string, unknown> & { content: string; project_id: string };
				storeItem(newItem({ ...(rest as Partial<FakeItem>), id, content, project_id }));
				return { status: 'ok', id };
			}
			case 'item_update': {
				if (!existing) return { status: commandError('Item not found', 404) };
				const { id: _id, ...patch } = args;
				storeItem({ ...existing.row, ...(patch as Partial<FakeItem>), updated_at: STAMP });
				return { status: 'ok' };
			}
			case 'item_close': {
				if (!existing) return { status: commandError('Item not found', 404) };
				storeItem({ ...existing.row, checked: true, completed_at: STAMP });
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
				const result = apply(cmd);
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
			if (wants('projects')) response.projects = since(projects, from);
			if (wants('sections')) response.sections = since(sections, from);
			if (wants('items')) response.items = since(items, from);
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
			const row: FakeProject = {
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
				...project,
			};
			projects.set(row.id, { row, v: bump() });
			return row;
		},

		addSection(section) {
			const row: FakeSection = {
				user_id: USER_ID,
				added_at: STAMP,
				updated_at: STAMP,
				archived_at: null,
				description: null,
				section_order: 1,
				is_archived: false,
				is_deleted: false,
				is_collapsed: false,
				...section,
			};
			sections.set(row.id, { row, v: bump() });
			return row;
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

		failNext(failure, times = 1) {
			for (let i = 0; i < times; i++) failures.push(failure);
		},
	};
	return fake;
}
