import type { ClaudeEvent, ClaudeEventPayload, SlashCommandInfo } from '#lib/contracts/index.js';
import { renderCanvasMarkdown } from '#lib/features/canvas/canvas-markdown.logic.js';

/** A tool the agent called during a reply, shown as a collapsed card. */
export interface ToolPart {
	kind: 'tool';
	/** Tool use id; the matching `ToolResult` carries it. */
	id: string;
	/** Tool name, e.g. `Read` or `Bash`. */
	name: string;
	/** What the tool acts on (a path, a pattern, a command), one line; empty when unknown. */
	target: string;
	/** `running` until its result arrives; `stopped` when the turn ended first. */
	status: 'running' | 'done' | 'error' | 'stopped';
	/** The start of the tool's result text; empty while running. */
	summary: string;
}

/** A run of reply text, Markdown. */
export interface TextPart {
	kind: 'text';
	/** The text streamed so far. */
	text: string;
}

/** One message of the chat. */
export type ChatMessage =
	| { role: 'user'; text: string }
	| { role: 'assistant'; parts: (TextPart | ToolPart)[] };

/** The chat as the panel shows it, minus the attached notes. */
export interface ChatState {
	/** Messages in order; a turn adds the user message and the reply it streams into. */
	messages: ChatMessage[];
	/** The running turn's id, once `claude_run_turn` returned it; `null` otherwise. */
	runId: string | null;
	/** Session of the last `Init` or `Result`, resumed by the next turn; `null` for a new chat or once the resumed session is gone. */
	sessionId: string | null;
	/** `running` from send until the run's `Done` (or a failure before it); an `Error` before `Done` shows but does not end the turn. */
	status: 'idle' | 'running' | 'error';
	/** Inline error of the last turn; `null` when it did not fail. */
	error: string | null;
	/** Slash commands from the last `Init`, kept for the app session. */
	slashCommands: string[];
	/** Events received while a turn waits for its run id, replayed by `startRun`. */
	pending: ClaudeEventPayload[];
	/** Stop was asked before the run id was known; the service cancels once `claude_run_turn` returns it. */
	stopRequested: boolean;
	/** Id of the chat's file in the vault (a UUID); `null` until the first send. */
	chatId: string | null;
	/** ISO time of the chat's first send; `null` until then. */
	createdAt: string | null;
	/** True from a restore of a saved chat until the next send or New chat. */
	restored: boolean;
}

/** A chat with nothing in it. */
export const EMPTY_CHAT: ChatState = {
	messages: [],
	runId: null,
	sessionId: null,
	status: 'idle',
	error: null,
	slashCommands: [],
	pending: [],
	stopRequested: false,
	chatId: null,
	createdAt: null,
	restored: false,
};

/** The id and creation time a chat gets on its first send. */
export interface ChatIdentity {
	/** A new UUID. */
	chatId: string;
	/** ISO time of the send. */
	createdAt: string;
}

/**
 * Starts a turn: the user's text, an empty reply to stream into, `running` with
 * no run id yet. A chat without an id takes `fresh`; one that has an id keeps it.
 */
export function beginTurn(state: ChatState, text: string, fresh: ChatIdentity): ChatState {
	const identity = state.chatId === null ? fresh : { chatId: state.chatId, createdAt: state.createdAt };
	return {
		...state,
		...identity,
		messages: [...state.messages, { role: 'user', text }, { role: 'assistant', parts: [] }],
		runId: null,
		status: 'running',
		error: null,
		pending: [],
		stopRequested: false,
		restored: false,
	};
}

/**
 * Records the run id `claude_run_turn` returned and replays the events of that
 * run that arrived first (a spawn failure sends `Error` and `Done` before the
 * call returns). Buffered events of any other run are dropped.
 */
export function startRun(state: ChatState, runId: string): ChatState {
	let next: ChatState = { ...state, runId, pending: [] };
	for (const payload of state.pending) {
		if (payload.runId === runId) next = receiveEvent(next, payload);
	}
	return next;
}

/** Ends a turn that failed before or while starting, with an inline message. */
export function failTurn(state: ChatState, message: string): ChatState {
	return { ...state, runId: null, status: 'error', error: message, pending: [], stopRequested: false };
}

/** Shows an inline error without ending the turn: a running process keeps its run id, so Stop and its events still work. */
export function showError(state: ChatState, message: string): ChatState {
	return { ...state, error: message };
}

/** Remembers a Stop asked while the turn waits for its run id; no-op otherwise. */
export function requestStop(state: ChatState): ChatState {
	return state.status === 'running' && state.runId === null ? { ...state, stopRequested: true } : state;
}

/** A new chat: no messages, no session, no error, no id. Slash commands stay, they belong to the app session. */
export function resetChat(state: ChatState): ChatState {
	return { ...EMPTY_CHAT, slashCommands: state.slashCommands };
}

/** A chat file in `<vault>/.kokobrain/claude/chats/<chatId>.json`, schema v1. */
export interface StoredChat {
	/** Schema version; a file with any other value is not read. */
	version: 1;
	/** The chat's UUID, also the file name. */
	chatId: string;
	/** Session the next turn resumes; `null` when it has none. */
	sessionId: string | null;
	/** ISO time of the first send. */
	createdAt: string;
	/** ISO time of the last save. */
	updatedAt: string;
	/** The first prompt on one line, at most 80 chars. */
	title: string;
	/** The messages as the panel shows them. */
	messages: ChatMessage[];
}

const MAX_TITLE_LENGTH = 80;

/** A chat's title: its first prompt on one line, cut at 80 chars; empty without a prompt. */
export function chatTitle(messages: readonly ChatMessage[]): string {
	const first = messages.find((m) => m.role === 'user');
	if (!first) return '';
	const line = first.text.replace(/\s+/g, ' ').trim();
	return line.length > MAX_TITLE_LENGTH ? `${line.slice(0, MAX_TITLE_LENGTH - 3)}...` : line;
}

/** The file of a chat, saved at `updatedAt`; `null` for a chat never sent (it has no id). */
export function storedFromChat(
	chat: Pick<ChatState, 'chatId' | 'createdAt' | 'sessionId' | 'messages'>,
	updatedAt: string,
): StoredChat | null {
	if (chat.chatId === null || chat.createdAt === null) return null;
	return {
		version: 1,
		chatId: chat.chatId,
		sessionId: chat.sessionId,
		createdAt: chat.createdAt,
		updatedAt,
		title: chatTitle(chat.messages),
		messages: chat.messages,
	};
}

/** A CLI session id: a lowercase hyphenated UUID. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Parses a chat file. `null` for an unknown version or a malformed file. A
 * tool still `running` when it was saved (a quit mid-turn) comes back `stopped`.
 * A session id that is not a CLI session id is dropped: it becomes a `--resume`
 * argument, and a chat file in a vault from elsewhere could carry an option.
 */
export function chatFromStored(text: string): StoredChat | null {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return null;
	}
	if (!isRecord(raw) || raw.version !== 1) return null;
	const { chatId, sessionId, createdAt, updatedAt, title } = raw;
	if (typeof chatId !== 'string' || typeof createdAt !== 'string' || typeof updatedAt !== 'string' || typeof title !== 'string') return null;
	if (sessionId !== null && typeof sessionId !== 'string') return null;
	if (!Array.isArray(raw.messages)) return null;
	const messages: ChatMessage[] = [];
	for (const item of raw.messages) {
		const message = parseMessage(item);
		if (!message) return null;
		messages.push(message);
	}
	return { version: 1, chatId, sessionId: typeof sessionId === 'string' && SESSION_ID.test(sessionId) ? sessionId : null, createdAt, updatedAt, title, messages };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const TOOL_STATUSES: readonly ToolPart['status'][] = ['running', 'done', 'error', 'stopped'];

function parseMessage(value: unknown): ChatMessage | null {
	if (!isRecord(value)) return null;
	if (value.role === 'user') return typeof value.text === 'string' ? { role: 'user', text: value.text } : null;
	if (value.role !== 'assistant' || !Array.isArray(value.parts)) return null;
	const parts: (TextPart | ToolPart)[] = [];
	for (const part of value.parts) {
		const parsed = parsePart(part);
		if (!parsed) return null;
		parts.push(parsed);
	}
	return { role: 'assistant', parts };
}

function parsePart(value: unknown): TextPart | ToolPart | null {
	if (!isRecord(value)) return null;
	if (value.kind === 'text') return typeof value.text === 'string' ? { kind: 'text', text: value.text } : null;
	if (value.kind !== 'tool') return null;
	const { id, name, target, status, summary } = value;
	if (typeof id !== 'string' || typeof name !== 'string' || typeof target !== 'string' || typeof summary !== 'string') return null;
	if (!TOOL_STATUSES.includes(status as ToolPart['status'])) return null;
	return { kind: 'tool', id, name, target, status: status === 'running' ? 'stopped' : (status as ToolPart['status']), summary };
}

/**
 * Replaces the chat with a saved one: idle, no run, the restored notice on.
 * `null` gives a new chat. Slash commands stay. While a turn runs it returns
 * `state` itself, so a reply in progress is never thrown away.
 */
export function restoreChat(state: ChatState, stored: StoredChat | null): ChatState {
	if (state.status === 'running') return state;
	if (!stored) return resetChat(state);
	return {
		...resetChat(state),
		chatId: stored.chatId,
		createdAt: stored.createdAt,
		sessionId: stored.sessionId,
		messages: stored.messages,
		restored: true,
	};
}

/**
 * Applies one `claude-event`. Events of the current run update the chat; events
 * that arrive while a turn waits for its run id are buffered; anything else
 * (a finished or older run) is ignored and returns `state` itself.
 */
export function receiveEvent(state: ChatState, payload: ClaudeEventPayload): ChatState {
	if (state.runId !== null && payload.runId === state.runId) return applyEvent(state, payload.event);
	if (state.runId === null && state.status === 'running') return { ...state, pending: [...state.pending, payload] };
	return state;
}

function applyEvent(state: ChatState, event: ClaudeEvent): ChatState {
	switch (event.type) {
		case 'Init':
			// Kept from Init too: a turn stopped or crashed before its Result is still resumed.
			return { ...state, sessionId: event.sessionId || state.sessionId, slashCommands: event.slashCommands };
		case 'TextDelta':
			return updateReply(state, (parts) => {
				const last = parts.at(-1);
				if (last?.kind === 'text') return [...parts.slice(0, -1), { kind: 'text', text: last.text + event.text }];
				return [...parts, { kind: 'text', text: event.text }];
			});
		case 'TextRetracted':
			// Abandoned blocks never get an assistant message, so no tool card follows their text.
			return updateReply(state, (parts) => {
				const last = parts.at(-1);
				if (last?.kind !== 'text' || !event.text || !last.text.endsWith(event.text)) return parts;
				const text = last.text.slice(0, -event.text.length);
				return text ? [...parts.slice(0, -1), { kind: 'text', text }] : parts.slice(0, -1);
			});
		case 'ThinkingDelta':
			return state;
		case 'ToolStart':
			return updateReply(state, (parts) => [
				...parts,
				{ kind: 'tool', id: event.id, name: event.name, target: toolTarget(event.input), status: 'running', summary: '' },
			]);
		case 'ToolResult':
			return updateReply(state, (parts) => parts.map((part) =>
				part.kind === 'tool' && part.id === event.id
					? { ...part, status: event.isError ? 'error' : 'done', summary: event.summary }
					: part,
			));
		case 'Result': {
			if (isSessionGone(event)) return { ...state, sessionId: null, error: SESSION_GONE };
			let next: ChatState = { ...state, sessionId: event.sessionId || state.sessionId };
			// An error's text is its cause, shown as the alert below, not as reply text.
			if (event.text && !event.isError) {
				next = updateReply(next, (parts) => (parts.some((p) => p.kind === 'text') ? parts : [...parts, { kind: 'text', text: event.text }]));
			}
			if (event.isError) next = { ...next, error: event.text || 'Claude ended the turn with an error.' };
			return next;
		}
		case 'Error':
			// The process may still run until its Done; ending the turn here would hide Stop and drop its later events.
			return { ...state, error: event.message };
		case 'Done': {
			// A tool whose result never came (Stop, a crash) is not running anymore.
			const next = updateReply(state, (parts) => parts.map((part) =>
				part.kind === 'tool' && part.status === 'running' ? { ...part, status: 'stopped' } : part,
			));
			return { ...next, runId: null, stopRequested: false, status: state.error === null ? 'idle' : 'error' };
		}
	}
}

/** Inline message, in place of the CLI's, when the session a turn resumed no longer exists. */
export const SESSION_GONE = 'The earlier conversation is no longer available to Claude. Your next message starts a new one.';

/**
 * A `--resume` of an unknown or pruned session: a zero-turn error whose text is
 * the CLI's "not found" sentence. Other zero-turn errors exist (unrun turns,
 * setup failures), and their session is still alive, so the text decides.
 */
function isSessionGone(event: Extract<ClaudeEvent, { type: 'Result' }>): boolean {
	return event.isError && event.numTurns === 0 && event.text.startsWith('No conversation found with session ID');
}

/** Rewrites the parts of the last message when it is a reply; otherwise returns `state`. */
function updateReply(state: ChatState, update: (parts: (TextPart | ToolPart)[]) => (TextPart | ToolPart)[]): ChatState {
	const last = state.messages.at(-1);
	if (last?.role !== 'assistant') return state;
	return { ...state, messages: [...state.messages.slice(0, -1), { role: 'assistant', parts: update(last.parts) }] };
}

/** Tool input fields that name what a tool acts on, in the order they are tried. */
const TARGET_FIELDS = ['file_path', 'notebook_path', 'path', 'pattern', 'command', 'url', 'query', 'skill', 'description'];
const MAX_TARGET_LENGTH = 80;

/** What a tool call acts on, from its input, on one line of at most 80 chars; empty when none of the known fields is set. */
export function toolTarget(input: unknown): string {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) return '';
	const record = input as Record<string, unknown>;
	const value = TARGET_FIELDS.map((field) => record[field]).find((v): v is string => typeof v === 'string' && v.trim() !== '');
	if (!value) return '';
	const line = value.replace(/\s+/g, ' ').trim();
	return line.length > MAX_TARGET_LENGTH ? `${line.slice(0, MAX_TARGET_LENGTH - 3)}...` : line;
}

/**
 * The query of the slash-command menu: what follows a `/` at the very start of
 * the prompt, while no whitespace follows it. `null` closes the menu; the CLI
 * expands only a leading `/name`.
 */
export function slashQuery(text: string): string | null {
	const match = /^\/(\S*)$/.exec(text);
	return match ? match[1] : null;
}

/** The commands matching `query`, ignoring case: prefix matches first, then names that contain it, each group in list order. */
export function filterSlashCommands(query: string, commands: readonly string[]): string[] {
	const q = query.toLowerCase();
	const prefix = commands.filter((c) => c.toLowerCase().startsWith(q));
	const inner = commands.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
	return [...prefix, ...inner];
}

/** What the slash menu shows under a command's name. */
export interface SlashCommandDetail {
	/** What the command does, whitespace collapsed; empty when the CLI gives none. */
	description: string;
	/** The arguments it takes; empty for none. */
	argumentHint: string;
}

/**
 * The details of each row of the CLI's command list, keyed by the row's name
 * and by each of its aliases: an `Init` names a skill by its internal name,
 * which is an alias when its frontmatter `name` differs from its folder. A
 * row's name wins over another row's alias.
 */
export function slashCommandDetails(rows: readonly SlashCommandInfo[]): Map<string, SlashCommandDetail> {
	const details = new Map<string, SlashCommandDetail>();
	const detailOf = (row: SlashCommandInfo): SlashCommandDetail => ({
		description: row.description.replace(/\s+/g, ' ').trim(),
		argumentHint: row.argumentHint,
	});
	for (const row of rows) {
		for (const alias of row.aliases) if (!details.has(alias)) details.set(alias, detailOf(row));
	}
	for (const row of rows) details.set(row.name, detailOf(row));
	return details;
}

/** The names, in order, that are neither in `details` nor in `tried`. */
export function untriedSlashNames(names: readonly string[], details: ReadonlyMap<string, SlashCommandDetail>, tried: ReadonlySet<string>): string[] {
	return names.filter((name) => !details.has(name) && !tried.has(name));
}

/** The vault root in one form, without trailing slashes: the runner compares it as a raw string to allow one run per vault. */
export function normalizeVaultPath(path: string): string {
	const trimmed = path.replace(/\/+$/, '');
	return trimmed === '' ? '/' : trimmed;
}

/** The vault-relative path of the active tab when it is a Markdown note in the vault; `null` otherwise. */
export function activeNoteContextPath(activeTabPath: string | null, vaultPath: string | null): string | null {
	if (!activeTabPath || !vaultPath) return null;
	if (!/\.md$/i.test(activeTabPath)) return null;
	const root = `${normalizeVaultPath(vaultPath)}/`;
	return activeTabPath.startsWith(root) ? activeTabPath.slice(root.length) : null;
}

/** Prefix of the href a reply's wikilink gets; a `#` href survives the sanitizer. */
const WIKILINK_HREF = '#wikilink=';

/**
 * `[[target#heading|alias]]` (not an embed) becomes a Markdown link to the
 * note; the heading or block part is dropped, a same-note `[[#x]]` stays text.
 */
function wikilinksToLinks(text: string): string {
	let out = '';
	let last = 0;
	for (const match of text.matchAll(CODE)) {
		out += wikilinksInProse(text.slice(last, match.index)) + match[0];
		last = match.index + match[0].length;
	}
	return out + wikilinksInProse(text.slice(last));
}

/**
 * Fenced blocks (to their closing fence, or the end of the text) and inline
 * code spans, whose `[[x]]` stays literal text.
 */
const CODE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^\1[ \t]*$|(?![\s\S]))|(`+)(?!`)[\s\S]*?(?<!`)\2(?!`)/gm;

function wikilinksInProse(text: string): string {
	return text.replace(/(?<!!)\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g, (whole, rawTarget: string, alias?: string) => {
		const target = rawTarget.split('#')[0].trim();
		if (!target) return whole;
		const label = (alias ?? rawTarget).trim().replace(/[[\]]/g, '');
		return `[${label}](${WIKILINK_HREF}${encodeURIComponent(target)})`;
	});
}

/** A reply's Markdown as sanitized HTML, through the canvas renderer, with wikilinks as followable links. */
export function renderReplyHtml(text: string): string {
	return renderCanvasMarkdown(wikilinksToLinks(text));
}

/** What a click on a link in a reply does: open a note, open a web page, or nothing. */
export function replyLinkAction(href: string | null): { kind: 'wikilink'; target: string } | { kind: 'external'; url: string } | null {
	if (!href) return null;
	if (href.startsWith(WIKILINK_HREF)) {
		try {
			const target = decodeURIComponent(href.slice(WIKILINK_HREF.length));
			return target ? { kind: 'wikilink', target } : null;
		} catch {
			return null;
		}
	}
	if (/^https?:\/\//i.test(href)) return { kind: 'external', url: href };
	return null;
}
