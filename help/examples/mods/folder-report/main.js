// Example vault mod. To try it, copy this folder to <vault>/_system/mods/folder-report/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// Right-click a folder in Files and pick "Folder report: Report on this folder".
// Uses ctx.app (the editor, to update a report that is open) and ctx.labs (the
// menu placement): both are raw or experimental, with no compatibility promise.

/** Reports go here, so the mod never writes into the folders it reads */
const REPORT_FOLDER = 'Folder report';
/** Only the text between these markers is regenerated; the rest of the note is the user's */
const START = '<!-- folder-report:generated:start v1 -->';
const END = '<!-- folder-report:generated:end -->';
/** Keeps a huge folder's report readable */
const MAX_LISTED = 200;

/** Anything thrown, as text: a Tauri rejection is a bare string, not an Error */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/**
 * A wikilink pinned to this exact file, shown as its name ([[Folder/Name.md|Name]]):
 * [[Folder/Name]] would resolve by name only and could reach a namesake elsewhere.
 * Plain text when the path would break the link syntax.
 */
function link(path) {
	const name = path.split('/').pop().replace(/\.md$/i, '');
	return /[[\]|#^\\]/.test(path) ? path : `[[${path}|${name}]]`;
}

/**
 * `text` with the generated block replaced by `block`. Refuses unless the
 * note holds exactly one start and one end marker, each alone on its line, in
 * order: an edited marker is the user's to fix, not something to guess at.
 */
function replaceBlock(text, block) {
	const lines = text.split('\n');
	// A CRLF note keeps "\r" at the end of each line.
	const bare = lines.map((line) => line.replace(/\r$/, ''));
	const start = bare.indexOf(START);
	const end = bare.indexOf(END);
	const count = (marker) => bare.filter((line) => line === marker).length;
	if (start < 0 || end < start || count(START) !== 1 || count(END) !== 1) {
		throw new Error('The report markers were edited or removed; restore them or delete the report note');
	}
	// The start marker is never the last line, so its ending is the note's.
	const cr = lines[start].endsWith('\r') ? '\r' : '';
	return [...lines.slice(0, start), ...block.split('\n').map((line) => line + cr), ...lines.slice(end + 1)].join('\n');
}

/** Vault-relative path (ctx.vault, run.target, onNoteSaved) to the absolute form ctx.app and ctx.kb() use. */
function toAbsolute(ctx, path) {
	return `${ctx.app.vaultStore.path}/${path}`;
}

/**
 * Absolute app path to the vault-relative form ctx.vault takes. Throws outside the vault.
 * Collapses "//" first: app paths built from a folder setting with an edge slash
 * (a daily-note folder set to "Journal/") carry it, and ctx.vault rejects it.
 */
function toVaultPath(ctx, absolute) {
	const root = ctx.app.vaultStore.path.replace(/\/+$/, '');
	const path = absolute.replace(/\/{2,}/g, '/');
	if (!path.startsWith(`${root}/`)) throw new Error(`"${absolute}" is outside the vault`);
	return path.slice(root.length + 1);
}

/** The one range that turns `before` into `after`, for a minimal editor change. */
function changedRange(before, after) {
	const max = Math.min(before.length, after.length);
	let from = 0;
	while (from < max && before[from] === after[from]) from++;
	let tail = 0;
	while (tail < max - from && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
	return { from, to: before.length - tail, insert: after.slice(from, after.length - tail) };
}

/**
 * Applies `edit(text) => newText` to a note that may be open in the editor.
 * `absolutePath` is an app path (`${ctx.app.vaultStore.path}/Folder/Note.md`).
 * `edit` must be synchronous and return a string; it runs exactly once.
 * Resolves to whether the text changed. Rejects when the note is missing,
 * when `edit` throws, and when a background tab holds unsaved edits of this note.
 */
async function editNote(ctx, absolutePath, edit) {
	const { activeTab: tab, editorView: view } = ctx.app.editorStore;
	const normalized = (path) => path.replace(/\/{2,}/g, '/');
	if (tab && normalized(tab.path) === normalized(absolutePath) && view?.dom.isConnected) {
		const text = view.state.doc.toString();
		// An editor not yet showing this note must not take the edit: it would land in another note.
		// The view's doc uses "\n"; the tab keeps a CRLF file's raw text until the first edit.
		if (text === tab.content.replace(/\r\n?/g, '\n')) {
			const next = edit(text);
			if (next === text) return false;
			view.dispatch({ changes: changedRange(text, next) });
			return true;
		}
	}
	const path = toVaultPath(ctx, absolutePath);
	const text = await ctx.vault.read(path);
	const next = edit(text);
	if (next === text) return false;
	// ctx.vault matches tabs by exact path, so a tab opened at a path with "//" needs both steps by hand.
	const openTab = () => ctx.app.editorStore.tabs.find((t) => normalized(t.path) === normalized(absolutePath));
	const before = openTab();
	if (before && before.content !== before.savedContent) throw new Error(`"${path}" has unsaved changes in an open tab`);
	await ctx.vault.write(path, next);
	const after = openTab();
	if (after && after.content === after.savedContent && after.content !== next) {
		ctx.app.syncExternalContentToEditor(after.path, next, true, 'none');
	}
	return true;
}

/**
 * Every Markdown note under `folder`, listing one folder at a time so Cancel and
 * Stop (both abort `signal`) take effect between them. Null once aborted.
 */
async function walk(ctx, folder, signal) {
	const notes = [];
	const queue = [folder];
	let listed = 0;
	while (queue.length > 0) {
		if (signal.aborted) return null;
		const current = queue.shift();
		let entries;
		try {
			entries = await ctx.vault.list(current);
		} catch (err) {
			throw new Error(`Cannot list ${current}: ${errorMessage(err)}`);
		}
		for (const entry of entries) {
			if (entry.isFolder) queue.push(entry.path);
			else if (/\.md$/i.test(entry.name)) notes.push(entry.path);
		}
		listed++;
	}
	// A Cancel during the last listing still resolves the dialog with this value.
	if (signal.aborted) return null;
	return { notes: notes.sort(), folders: listed };
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'report',
			title: 'Report on this folder',
			description: `Lists the folder's notes in a note under "${REPORT_FOLDER}"`,
			run: async (_input, run) => {
				if (run.target?.on !== 'folder') throw new Error('Right-click a folder in Files to run this');
				const folder = run.target.path;
				// '' is the vault root: a report of every note is not what this example is for.
				if (folder === '') throw new Error('Pick a folder, not the vault root');
				if (folder === REPORT_FOLDER || folder.startsWith(`${REPORT_FOLDER}/`)) {
					throw new Error(`"${REPORT_FOLDER}" holds the reports themselves`);
				}

				// A loading dialog, not run.progress: this action ends by opening the report, and a
				// run that showed progress or logged keeps its view open on Done on top of it.
				const found = await run.ui.loading(`Reading ${folder}...`, (signal) => walk(ctx, folder, signal), { cancellable: true });
				if (!found || run.signal.aborted) return;
				const path = `${REPORT_FOLDER}/${folder.replaceAll('/', ' - ')}.md`;
				const ok = await run.ui.confirm({
					title: 'Write the report?',
					message: `${found.notes.length} notes in ${found.folders} folders. The report goes to ${path}.`,
					confirmLabel: 'Write',
				});
				if (!ok) return;

				const listed = found.notes.slice(0, MAX_LISTED).map((note) => `- ${link(note)}`);
				if (found.notes.length > MAX_LISTED) listed.push(`- and ${found.notes.length - MAX_LISTED} more`);
				const block = [
					START,
					`Generated ${new Date().toLocaleString()}: ${found.notes.length} notes in ${found.folders} folders.`,
					'',
					...listed,
					END,
				].join('\n');

				if (run.signal.aborted) return;
				if (await ctx.vault.exists(path)) {
					// Through the editor when it shows the report, so the caret stays with the user's
					// text; on disk otherwise, refused when a background tab holds unsaved edits.
					await editNote(ctx, toAbsolute(ctx, path), (text) => (run.signal.aborted ? text : replaceBlock(text, block)));
				} else {
					if (run.signal.aborted) return;
					await ctx.vault.create(path, `# Report: ${folder}\n\nYour notes here are kept when the report is regenerated.\n\n${block}\n`);
				}
				if (run.signal.aborted) return;
				await ctx.workspace.openNote(path);
			},
		});
		ctx.labs.place('report', { menu: { on: ['folder'] } });
	},
};
