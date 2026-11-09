// Example vault mod. To try it, copy this folder to <vault>/_system/mods/daily-journal/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// Uses ctx.app (daily note path, editor) and ctx.labs (palette): both are raw
// or experimental, with no compatibility promise.

const ACTION_ID = 'add-entry';

/** Anything thrown, as text: a Tauri rejection is a bare string, not an Error */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

const pad2 = (n) => String(n).padStart(2, '0');

/** HH:mm in local time: the journal follows the user's clock, not UTC */
const localTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** A folder setting with an edge slash yields "//" in app paths, which ctx.vault rejects */
const collapse = (path) => path.replace(/\/{2,}/g, '/');

/** An absolute app path as the vault-relative path ctx.vault takes */
function toVaultPath(vaultRoot, absolute) {
	const prefix = `${vaultRoot}/`;
	if (!absolute.startsWith(prefix)) throw new Error(`"${absolute}" is outside the vault`);
	return collapse(absolute.slice(prefix.length)).replace(/^\//, '');
}

/** What goes after `text` so that `line` ends up as its last line */
function appendix(text, line) {
	return `${text === '' || text.endsWith('\n') ? '' : '\n'}${line}\n`;
}

/**
 * Appends `line` to the note at `absolute`. When the editor shows exactly
 * this note, the line goes in through CodeMirror, like typing: unsaved edits,
 * caret and undo stay, and autosave writes it. Otherwise the note is read and
 * written on disk, which refuses a note with unsaved edits in a background
 * tab. `viaEditor: false` forces the disk route. Resolves to the route taken,
 * or null once stopped.
 */
async function appendLine(ctx, absolute, line, stopped, viaEditor) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	if (viaEditor && tab && collapse(tab.path) === collapse(absolute) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		// Right after a tab switch the view can still hold the previous note. The view's doc
		// uses "\n"; the tab keeps a CRLF file's raw text until the first edit.
		if (text === tab.content.replace(/\r\n?/g, '\n')) {
			if (stopped()) return null;
			view.dispatch({ changes: { from: text.length, insert: appendix(text, line) } });
			return 'editor';
		}
	}
	const path = toVaultPath(ctx.app.vaultStore.path, absolute);
	let text;
	try {
		text = await ctx.vault.read(path);
	} catch (err) {
		throw new Error(`Cannot read ${path}: ${errorMessage(err)}`);
	}
	if (stopped()) return null;
	const next = text + appendix(text, line);
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => collapse(t.path) === collapse(absolute));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
	return 'disk';
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: ACTION_ID,
			title: 'Add a journal entry',
			description: "Appends a timestamped line to today's daily note",
			input: { placeholder: 'What happened?' },
			run: async (text, run) => {
				const entry = text.trim();
				if (!entry) throw new Error('Type an entry');
				// The time the user pressed Enter, not the time a dialog closed.
				const now = new Date();
				const absolute = ctx.app.dailyNotePath(now);
				const path = toVaultPath(ctx.app.vaultStore.path, absolute);

				const existed = await ctx.vault.exists(path);
				if (!existed) {
					const create = await run.ui.confirm({
						title: "Today's note does not exist",
						message: `Create ${path} from your daily note template?`,
						confirmLabel: 'Create',
					});
					if (!create || run.signal.aborted) return;
					// Creates it from the Periodic Notes template and opens it.
					await ctx.app.openOrCreateDailyNote();
				}

				if (run.signal.aborted) return;
				// A just-created note has no unsaved edits, and the editor may still show
				// the previous note (an equal template passes the content check), so
				// write it on disk.
				const route = await appendLine(ctx, absolute, `- ${localTime(now)} ${entry}`, () => run.signal.aborted, existed);
				if (route) run.log(`Added to ${path} (${route === 'editor' ? 'in the open note' : 'on disk'})`);
			},
		});
		ctx.labs.place(ACTION_ID, { palette: true });

		ctx.addRailButton({
			id: 'main',
			title: 'Daily journal',
			icon: 'lucide:notebook-pen',
			actions: [ACTION_ID],
		});
	},
};
