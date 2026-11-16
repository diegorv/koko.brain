import type { ClaudeEventPayload, SlashCommandInfo } from '#lib/contracts/index.js';
import {
	beginTurn,
	EMPTY_CHAT,
	failTurn,
	receiveEvent,
	requestStop,
	resetChat,
	restoreChat,
	showError,
	slashCommandDetails,
	slashMenuCommands,
	startRun,
	terminalOnlySlashNames,
	type ChatState,
	type SlashCommandDetail,
	type StoredChat,
} from './claude.logic';

/** The agent chat; the service saves it to the vault and restores the newest one on vault open. */
let chat = $state<ChatState>(EMPTY_CHAT);
/** Vault-relative paths of the notes attached to the chat, in the order added. */
let contextNotes = $state<string[]>([]);
/** The open vault's command list from the CLI; empty until it arrives. */
let slashRows = $state.raw<readonly SlashCommandInfo[]>([]);
/** The open vault's slash command details, from the CLI's command list; empty until it arrives. */
let slashDetails = $state.raw<ReadonlyMap<string, SlashCommandDetail>>(new Map());
/**
 * Row names the last `Init` lacked: the CLI's terminal-only commands. They
 * belong to the CLI, not the vault, so `reset()` keeps them; empty until an
 * `Init` and the rows have both arrived in this app session.
 */
let terminalOnly = $state.raw<ReadonlySet<string>>(new Set());

/** Relearns the terminal-only names from the chat's `Init` names and the rows, once both are there. */
function learnTerminalOnly() {
	if (slashRows.length > 0 && chat.slashCommands.length > 0) terminalOnly = terminalOnlySlashNames(slashRows, chat.slashCommands);
}

/** State of the agent panel: the chat and its attached notes. The event rules live in `claude.logic.ts`. */
export const claudeStore = {
	/** Messages in order: user text, and replies with text and tool cards. */
	get messages() { return chat.messages; },
	/** The running turn's id, once known. */
	get runId() { return chat.runId; },
	/** Session the next turn resumes; `null` for a new chat. */
	get sessionId() { return chat.sessionId; },
	/** `idle`, `running` or `error`. */
	get status() { return chat.status; },
	/** True while a turn runs (from send to its `Done`). */
	get isRunning() { return chat.status === 'running'; },
	/** Inline error of the last turn, or `null`. */
	get error() { return chat.error; },
	/** True when Stop was asked before the turn knew its run id. */
	get stopRequested() { return chat.stopRequested; },
	/** Slash commands from the last `Init`; empty before the first turn. */
	get slashCommands() { return chat.slashCommands; },
	/** What the slash menu lists: the last `Init`'s names, or before one the CLI's row names minus the terminal-only ones. */
	get slashMenuCommands() { return slashMenuCommands(chat.slashCommands, slashRows, terminalOnly); },
	/** Description and argument hint per slash command name or alias; empty until the CLI's list arrives. */
	get slashCommandDetails() { return slashDetails; },
	/** Id of the chat's file; `null` until the first send. */
	get chatId() { return chat.chatId; },
	/** ISO time of the chat's first send; `null` until then. */
	get createdAt() { return chat.createdAt; },
	/** True while a restored chat shows its notice (until the next send or New chat). */
	get restored() { return chat.restored; },
	/** Vault-relative paths of the attached notes. */
	get contextNotes() { return contextNotes; },

	/** Starts a turn with the user's text; the first send of a chat gives it a new id and creation time. */
	beginTurn(text: string) {
		chat = beginTurn(chat, text, { chatId: crypto.randomUUID(), createdAt: new Date().toISOString() });
	},
	/** Records the run id of the turn and replays its buffered events, an `Init` among them. */
	startRun(runId: string) {
		chat = startRun(chat, runId);
		learnTerminalOnly();
	},
	/** Applies one `claude-event`. */
	receive(payload: ClaudeEventPayload) {
		chat = receiveEvent(chat, payload);
		if (payload.event.type === 'Init') learnTerminalOnly();
	},
	/** Ends the turn with an inline error. */
	failTurn(message: string) { chat = failTurn(chat, message); },
	/** Shows an inline error and leaves a running turn running. */
	showError(message: string) { chat = showError(chat, message); },
	/** Remembers a Stop asked before the run id is known. */
	requestStop() { chat = requestStop(chat); },
	/** Clears the chat and sets the attached notes. */
	newChat(notes: string[]) {
		chat = resetChat(chat);
		contextNotes = notes;
	},
	/** Shows a saved chat, or an empty one for `null`; no-op while a turn runs. The attached notes stay. */
	restore(stored: StoredChat | null) { chat = restoreChat(chat, stored); },
	/** Attaches a note; a note already attached is not added twice. */
	addContextNote(path: string) {
		if (!contextNotes.includes(path)) contextNotes = [...contextNotes, path];
	},
	/** Removes an attached note. */
	removeContextNote(path: string) { contextNotes = contextNotes.filter((p) => p !== path); },
	/** Replaces the CLI's command list and its slash command details with `rows`. */
	setSlashCommandRows(rows: readonly SlashCommandInfo[]) {
		slashDetails = slashCommandDetails(rows);
		slashRows = rows;
		learnTerminalOnly();
	},

	/** Back to the initial state; `resetClaude` calls it on vault close. The terminal-only names stay. */
	reset() {
		chat = EMPTY_CHAT;
		contextNotes = [];
		slashRows = [];
		slashDetails = new Map();
	},

	/** @internal test-only: `reset()` plus the terminal-only names, as a fresh app session. */
	_reset() {
		this.reset();
		terminalOnly = new Set();
	},
};
