import type { ClaudeEvent, ClaudeEventPayload } from '#lib/contracts/index.js';
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
	/** `running` until its result arrives. */
	status: 'running' | 'done' | 'error';
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
	/** Session of the last `Result`, resumed by the next turn; `null` for a new chat. */
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
};

/** Starts a turn: the user's text, an empty reply to stream into, `running` with no run id yet. */
export function beginTurn(state: ChatState, text: string): ChatState {
	return {
		...state,
		messages: [...state.messages, { role: 'user', text }, { role: 'assistant', parts: [] }],
		runId: null,
		status: 'running',
		error: null,
		pending: [],
		stopRequested: false,
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

/** A new chat: no messages, no session, no error. Slash commands stay, they belong to the app session. */
export function resetChat(state: ChatState): ChatState {
	return { ...EMPTY_CHAT, slashCommands: state.slashCommands };
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
			return { ...state, slashCommands: event.slashCommands };
		case 'TextDelta':
			return updateReply(state, (parts) => {
				const last = parts.at(-1);
				if (last?.kind === 'text') return [...parts.slice(0, -1), { kind: 'text', text: last.text + event.text }];
				return [...parts, { kind: 'text', text: event.text }];
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
			let next: ChatState = { ...state, sessionId: event.sessionId };
			if (event.text) {
				next = updateReply(next, (parts) => (parts.some((p) => p.kind === 'text') ? parts : [...parts, { kind: 'text', text: event.text }]));
			}
			if (event.isError) next = { ...next, error: event.text || 'Claude ended the turn with an error.' };
			return next;
		}
		case 'Error':
			// The process may still run until its Done; ending the turn here would hide Stop and drop its later events.
			return { ...state, error: event.message };
		case 'Done':
			return { ...state, runId: null, stopRequested: false, status: state.error === null ? 'idle' : 'error' };
	}
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
