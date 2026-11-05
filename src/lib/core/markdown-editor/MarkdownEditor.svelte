<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import {
		EditorState,
		EditorSelection,
		Compartment,
		Transaction,
		type ChangeSpec,
		type StateEffect,
	} from '@codemirror/state';
	import { selectAll } from '@codemirror/commands';
	import { readText } from '@tauri-apps/plugin-clipboard-manager';
	import { toast } from 'svelte-sonner';
	import Link from '@lucide/svelte/icons/link';
	import FileSymlink from '@lucide/svelte/icons/file-symlink';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Copy from '@lucide/svelte/icons/copy';
	import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
	import SquareDashedText from '@lucide/svelte/icons/square-dashed-text';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { findTabIndex, getPositionAfterFrontmatter } from '#lib/core/editor/editor.logic.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { applyHeadingTypography } from '#lib/core/settings/settings.service.js';
	import { effectiveContentWidth } from '#lib/core/settings/settings.logic.js';
	import { onContentChange } from '#lib/core/editor/editor.service.js';
	import { forceDecorationRebuild } from './extensions/live-preview';
	import { followWikilinkClick } from './extensions/live-preview/wikilink-navigation';
	import { debug, error, perfStart, perfEnd, perfBaseline } from '#lib/utils/debug.js';
	import { IS_MAC } from '#lib/utils/platform.js';
	import { formatShortcut } from '#lib/utils/keybindings.js';
	import type { BlockLinkActions, EditorHost } from './editor-host';
	import type { FencedBlockRenderer } from './extensions/live-preview/core/fenced-block-renderers';
	import { getLanguageEffects, getLanguageEffectsSync } from './highlight-styles';
	import {
		saveTabViewState,
		getTabViewState,
		deleteTabViewState,
		saveTabEditorState,
		takeTabEditorState,
		clearTabEditorStates,
		takeTabRename,
	} from './tab-view-state';
	import { buildEditorTheme, createExtensions, editorModeEffects } from './setup';
	import { COPY_BLOCK_LINK_SHORTCUT } from './setup/editor-extensions';
	import { docDiff } from './doc-diff.logic';
	import { resolveWikilinkClickPosition } from './wikilink-click-target';

	interface Props {
		/**
		 * The app's editor host: link resolution, navigation, note creation.
		 * Installed once at mount; a later change of this prop is not applied.
		 */
		host: EditorHost;
		/** The app's fenced-block renderers (queryjs, collection). Installed once at mount, like `host`. */
		renderers: readonly FencedBlockRenderer[];
		/** Copy-block-link for the context menu and the keymap. Installed once at mount, like `host`. */
		blockLinks: BlockLinkActions;
	}

	let { host, renderers, blockLinks }: Props = $props();

	let container: HTMLDivElement;
	let view: EditorView | undefined;
	let lastTabPath: string | undefined;
	/** Whether a tab switch is in progress (suppresses onContentChange from the doc replace) */
	let isTabSwitching = false;
	/** Whether an external-content doc replace is in progress (suppresses onContentChange from it) */
	let isExternalEdit = false;
	/**
	 * AbortController for the rAF chain queued at the end of the tab-switch
	 * effect. When the user switches tabs faster than the rAF can fire, the
	 * prior chain is aborted so a stale `forceDecorationRebuild` does not
	 * land on the new tab's view (Phase 4.4).
	 */
	let tabSwitchRafAbort: AbortController | null = null;
	const sourceModeCompartment = new Compartment();
	const editorThemeCompartment = new Compartment();
	const languageCompartment = new Compartment();
	const highlightStyleCompartment = new Compartment();
	/** Reconfigures language parser and highlight style based on the active tab's file extension */
	async function applyLanguageForTab(tabName: string) {
		if (!view) return;
		const effects = await getLanguageEffects(tabName, languageCompartment, highlightStyleCompartment);
		view.dispatch({ effects });
	}

	/**
	 * `content` with the line breaks CodeMirror's doc uses (it splits on
	 * `\r\n`, `\r` and `\n` and joins with `\n`). The store keeps a file's raw
	 * text until the first edit, so a CRLF note is longer there than in the
	 * view: diff and clamp against this form, never against the raw string.
	 */
	function toDocText(content: string): string {
		return content.replace(/\r\n?/g, '\n');
	}

	/**
	 * A state holding `content` with no undo history, built from the current
	 * settings and editor mode, so it needs no reconfigure. Its language is
	 * markdown: a code file gets its parser from `applyLanguageForTab`. The
	 * cursor is clamped to the doc, so a position computed on raw text cannot
	 * point past its end.
	 */
	function freshState(content: string, cursorPos: number): EditorState {
		const text = toDocText(content);
		return EditorState.create({
			doc: text,
			selection: EditorSelection.cursor(Math.min(cursorPos, text.length)),
			extensions: createExtensions({
				isLivePreview: editorStore.isLivePreview,
				fontFamily: settingsStore.editor.fontFamily,
				fontSize: settingsStore.editor.fontSize,
				lineHeight: settingsStore.editor.lineHeight,
				contentWidth: effectiveContentWidth(settingsStore.editor),
				paragraphSpacing: settingsStore.editor.paragraphSpacing,
				sourceModeCompartment,
				editorThemeCompartment,
				languageCompartment,
				highlightStyleCompartment,
				host,
				renderers,
				disabledDecorators: settingsStore.disabledDecorators,
				copyBlockLink: blockLinks.copyLink,
				onDocChanged: (content, fmChanged) => onContentChange(content, fmChanged),
				isTabSwitching: () => isTabSwitching,
				isExternalEdit: () => isExternalEdit,
			}),
		});
	}

	/**
	 * Installs `next` in the view and never throws: a `setState` that throws (a
	 * widget `toDOM`) is logged and retried once, as `replaceDoc` does.
	 */
	function setViewState(next: EditorState) {
		if (!view) return;
		try {
			view.setState(next);
		} catch (err) {
			error('EDITOR', 'doc replace threw, rebuilding the view:', err);
			try {
				view.setState(next);
			} catch (rebuildErr) {
				error('EDITOR', 'view rebuild after a failed doc replace threw:', rebuildErr);
			}
		}
	}

	/**
	 * Turns the doc into `content` (no history entry) and never throws. Only
	 * the changed regions are replaced (`docDiff`), so the undo events of the
	 * user's own edits map through them and an undo lands where it was made.
	 * When the change is too large to diff, the note's history is dropped
	 * instead (a fresh state keeping the current language), so no undo event
	 * is left to replay at a position the mapping cannot place.
	 * CodeMirror commits the new state before it builds widget DOM, so a widget
	 * whose `toDOM` throws escapes `dispatch` with `view.state` on the new doc
	 * while `contentDOM` still shows the old one; the next replace then
	 * throws a `TypeError`. On a throw the view is rebuilt with `setState` from
	 * a state holding `content`, derived from `view.state` so the compartments
	 * reconfigured since mount (theme, language, live-preview mode) carry over.
	 * A throw from that rebuild (a widget that throws on every render) is only
	 * logged: the view then stays desynced until the next replace that renders.
	 * Callers still reset their suppress flag in a `finally`.
	 */
	function replaceDoc(content: string, cursorPos: number) {
		if (!view) return;
		const v = view;
		const text = toDocText(content);
		const changes = docDiff(v.state.doc.toString(), text);
		if (!changes) {
			const language = languageCompartment.get(v.state) ?? [];
			const highlight = highlightStyleCompartment.get(v.state) ?? [];
			const fresh = freshState(text, cursorPos).update({
				effects: [languageCompartment.reconfigure(language), highlightStyleCompartment.reconfigure(highlight)],
			}).state;
			setViewState(fresh);
			return;
		}
		const spec = (c: ChangeSpec) => ({
			changes: c,
			selection: EditorSelection.cursor(Math.min(cursorPos, text.length)),
			annotations: Transaction.addToHistory.of(false),
		});
		try {
			v.dispatch(spec(changes));
		} catch (err) {
			error('EDITOR', 'doc replace threw, rebuilding the view:', err);
			try {
				const rest = docDiff(v.state.doc.toString(), text) ?? { from: 0, to: v.state.doc.length, insert: text };
				v.setState(v.state.update(spec(rest)).state);
			} catch (rebuildErr) {
				error('EDITOR', 'view rebuild after a failed doc replace threw:', rebuildErr);
			}
		}
	}

	/**
	 * Shows the tab at `path` with its own editor state, so undo and redo never
	 * cross notes in the one view every tab shares. A first visit gets a fresh
	 * state (`freshState`). A revisit takes the state saved when the user left
	 * the tab and brings it up to date in one update with no history entry:
	 * the content the store holds now (a background write may have changed it;
	 * `docDiff` maps the history through it), the cursor, and the current
	 * theme, editor mode and `langEffects`, since a saved state keeps the
	 * compartment values it had when it was left. A background write too large
	 * to diff drops the saved state for a fresh one, as `replaceDoc` does.
	 * If building the state throws, the tab gets a fresh state with the cursor
	 * at 0, so the view does not stay on the previous tab's doc.
	 */
	function showTabState(path: string, content: string, cursorPos: number, langEffects: StateEffect<unknown>[]) {
		if (!view) return;
		const text = toDocText(content);
		let next: EditorState;
		try {
			const saved = takeTabEditorState(path);
			const changes = saved ? docDiff(saved.doc.toString(), text) : null;
			next =
				saved && changes
					? saved.update({
							changes,
							selection: EditorSelection.cursor(Math.min(cursorPos, text.length)),
							annotations: Transaction.addToHistory.of(false),
							effects: [
								editorThemeCompartment.reconfigure(
									buildEditorTheme(fontFamily, fontSize, lineHeight, contentWidth, paragraphSpacing)
								),
								...editorModeEffects(editorStore.isLivePreview, sourceModeCompartment, settingsStore.disabledDecorators),
								...langEffects,
							],
						}).state
					: freshState(text, cursorPos);
		} catch (err) {
			error('EDITOR', 'building the tab state threw, using a fresh one:', err);
			next = freshState(text, 0);
		}
		setViewState(next);
	}

	/** Whether a debug log (console or file) is on, so the scroll log may read layout. */
	function tabScrollLogOn(): boolean {
		return settingsStore.debugMode || settingsStore.debugLogToFile;
	}

	/**
	 * Logs the editor's `scrollTop` and viewport at `step` of the switch to
	 * `path`, for diagnosing fresh tabs that open scrolled down. Reading
	 * `scrollTop` forces layout, so nothing is read with the debug log off.
	 * Never logs note text.
	 */
	function logTabScroll(step: string, path: string) {
		if (!view || !tabScrollLogOn()) return;
		const { from, to } = view.viewport;
		debug('TAB_SWITCH', `scroll ${step}, path: ${path} scrollTop: ${view.scrollDOM.scrollTop} viewport: ${from}-${to}`);
	}

	async function handleEditorClick(e: MouseEvent) {
		if (!view) return;
		const pos = resolveWikilinkClickPosition(e, view, IS_MAC);
		if (pos === null) return;

		// Capture-phase interception: this listener is registered with
		// `{ capture: true }` on the container, so it runs before any handler
		// inside `cm-editor`. `stopImmediatePropagation` prevents CodeMirror's
		// internal mousedown handler from firing — without that, CM would arm
		// its drag-select state machine, and the mouseup that lands AFTER the
		// async tab switch would commit a multi-line selection in the new doc
		// (which the reveal rule then shows as source across blocks).
		e.preventDefault();
		e.stopImmediatePropagation();

		await followWikilinkClick(view, pos);
	}

	/** Doc position of the last right-click, or null when it hit no text. */
	let contextMenuPos: number | null = null;

	/** Whether the selection had text when the menu opened; Cut and Copy are disabled otherwise. */
	let menuHasSelection = $state(false);

	/**
	 * Remembers the right-click position for the block-link items. A click inside
	 * a non-empty selection keeps the selection; anywhere else moves the cursor
	 * to the click, as a left click would.
	 */
	function handleContextMenu(e: MouseEvent) {
		if (!view) return;
		const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
		contextMenuPos = pos;
		const insideSelection =
			pos !== null && view.state.selection.ranges.some((r) => !r.empty && r.from <= pos && pos <= r.to);
		if (pos !== null && !insideSelection) view.dispatch({ selection: EditorSelection.cursor(pos) });
		menuHasSelection = view.state.selection.ranges.some((r) => !r.empty);
	}

	/** The text of the non-empty selection ranges, joined the way CodeMirror's own copy joins them. */
	function selectedText(state: EditorState): string {
		return state.selection.ranges
			.filter((r) => !r.empty)
			.map((r) => state.sliceDoc(r.from, r.to))
			.join(state.lineBreak);
	}

	/** Writes the selection to the clipboard; returns false (after a toast) when the write fails. */
	async function writeSelection(editorView: EditorView): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(selectedText(editorView.state));
			return true;
		} catch (err) {
			error('EDITOR-MENU', 'clipboard write failed:', err);
			toast.error('Could not copy to the clipboard.');
			return false;
		}
	}

	async function handleCopy() {
		if (!view || view.state.selection.ranges.every((r) => r.empty)) return;
		const editorView = view;
		await writeSelection(editorView);
		editorView.focus();
	}

	async function handleCut() {
		if (!view || view.state.selection.ranges.every((r) => r.empty)) return;
		const editorView = view;
		const before = editorView.state;
		// Delete only what was copied: skip when the doc or selection changed during the write.
		if ((await writeSelection(editorView)) && editorView.state === before) {
			editorView.dispatch({ ...before.replaceSelection(''), userEvent: 'delete.cut' });
		}
		editorView.focus();
	}

	/**
	 * Plain-text paste: the TSV-to-table and HTML-link paste handlers read a
	 * `ClipboardEvent`, which a menu click does not have.
	 */
	async function handlePaste() {
		if (!view) return;
		const editorView = view;
		try {
			const text = await readText();
			if (text) {
				editorView.dispatch({
					...editorView.state.replaceSelection(text),
					userEvent: 'input.paste',
					scrollIntoView: true,
				});
			}
		} catch (err) {
			error('EDITOR-MENU', 'clipboard read failed:', err);
			toast.error('Could not paste from the clipboard.');
		}
		editorView.focus();
	}

	function handleSelectAll() {
		if (!view) return;
		selectAll(view);
		view.focus();
	}

	/**
	 * `copyBlockLink` acts on the selection head's line. When the right-click kept
	 * a selection, move the cursor to the clicked position first so the link
	 * targets the clicked line.
	 */
	function moveCursorToContextMenuPos(editorView: EditorView) {
		if (editorView.state.selection.main.empty || contextMenuPos === null) return;
		editorView.dispatch({ selection: EditorSelection.cursor(contextMenuPos) });
	}

	async function handleCopyBlockLink() {
		if (!view) return;
		moveCursorToContextMenuPos(view);
		await blockLinks.copyLink(view);
	}

	async function handleCopyBlockEmbed() {
		if (!view) return;
		moveCursorToContextMenuPos(view);
		await blockLinks.copyEmbed(view);
	}

	onMount(() => {
		const tab = editorStore.activeTab;
		if (!tab) return;

		// Restore cursor from saved view state if available (e.g. after remount from collection/canvas tab)
		const saved = getTabViewState(tab.path);
		const cursorPos = saved ? saved.cursorPos : getPositionAfterFrontmatter(toDocText(tab.content));

		const state = freshState(tab.content, cursorPos);

		view = new EditorView({ state, parent: container });
		editorStore.setEditorView(view);
		applyLanguageForTab(tab.name);
		view.focus();

		// Restore scroll position after the view has rendered
		if (saved) {
			requestAnimationFrame(() => {
				view?.scrollDOM.scrollTo(saved.scrollLeft, saved.scrollTop);
			});
		}

		lastTabPath = tab.path;
		// Renames recorded while no editor was mounted were never consumed.
		clearTabEditorStates();
		container.addEventListener('mousedown', handleEditorClick, { capture: true });
	});

	onDestroy(() => {
		editorStore.setEditorView(null);
		container?.removeEventListener('mousedown', handleEditorClick, { capture: true });
		// Abort any pending tab-switch rAF chain so it does not fire on a
		// destroyed view.
		tabSwitchRafAbort?.abort();
		tabSwitchRafAbort = null;
		// Saved tab states close over this instance's compartments and flags,
		// and its rename records are meaningless to the next instance.
		clearTabEditorStates();
		if (view) {
			const path = lastTabPath;
			if (path) {
				saveTabViewState(path, {
					scrollTop: view.scrollDOM.scrollTop,
					scrollLeft: view.scrollDOM.scrollLeft,
					cursorPos: view.state.selection.main.head,
				});
			}
			view.destroy();
		}
	});

	// IMPORTANT: This effect MUST be defined before the content-sync effect below.
	// Both fire on tab switch; this one replaces the CM document first, so the
	// content-sync effect sees CM already has the right content and skips.
	$effect(() => {
		const path = editorStore.activeTabPath;

		untrack(() => {
			if (!view || path === lastTabPath || !path) return;

			// A rename of the active tab (`renameTabViewState` recorded it and
			// already moved its scroll/cursor state) is a path change, not a tab
			// switch: the view keeps its state and history, and the doc replace /
			// scroll reset are skipped.
			// The old path must be gone from the tabs: a record left by renames
			// that ended where they started (A -> A2 -> A) must not turn a later
			// switch to a tab at A2 into a rename.
			const renamedTo = lastTabPath ? takeTabRename(lastTabPath) : undefined;
			if (renamedTo === path && lastTabPath && findTabIndex(editorStore.tabs, lastTabPath) < 0) {
				lastTabPath = path;
				return;
			}

			// Save old tab's view state
			if (lastTabPath) {
				// Clean up stale entry if the previous tab was closed
				if (findTabIndex(editorStore.tabs, lastTabPath) < 0) {
					deleteTabViewState(lastTabPath);
				} else {
					saveTabViewState(lastTabPath, {
						scrollTop: view.scrollDOM.scrollTop,
						scrollLeft: view.scrollDOM.scrollLeft,
						cursorPos: view.state.selection.main.head,
					});
					saveTabEditorState(lastTabPath, view.state);
				}
			}

			// Get new tab content
			const tab = editorStore.activeTab;
			if (!tab) return;

			// Restore cursor position for the new tab (clamped to new doc length)
			const saved = getTabViewState(path);
			const cursorPos = saved ? saved.cursorPos : getPositionAfterFrontmatter(toDocText(tab.content));

			// Phase 4.3: bundle the language reconfigure into the same dispatch
			// as the doc replace when possible. Markdown / kanban resolve
			// synchronously via `getLanguageEffectsSync`; code files (.ts,
			// .py, …) need an async parser load — for those we keep the
			// prior 2-dispatch path via `applyLanguageForTab`.
			const langEffects = getLanguageEffectsSync(tab.name, languageCompartment, highlightStyleCompartment);

			// Suppress onContentChange while the tab's state is installed — this is
			// a tab switch, not a user edit, so we don't want to trigger a debounced
			// auto-save.
			isTabSwitching = true;
			debug('TAB_SWITCH', 'installing tab state, path:', path, 'contentLen:', tab.content.length);
			debug(
				'TAB_SWITCH',
				saved
					? `scroll saved view state: scrollTop=${saved.scrollTop} scrollLeft=${saved.scrollLeft} cursorPos=${saved.cursorPos}, path: ${path}`
					: `scroll saved view state: none (fresh tab), path: ${path}`
			);
			logTabScroll('before replace', path);
			const t0 = perfStart();
			try {
				showTabState(path, tab.content, cursorPos, langEffects ?? []);
			} finally {
				isTabSwitching = false;
			}
			perfEnd('TAB_SWITCH', 'docReplace', t0);
			logTabScroll('after replace', path);

			// Async language load for code files only — markdown/kanban already
			// reconfigured via the inline `effects` above.
			if (langEffects === null) {
				applyLanguageForTab(tab.name);
			}

			// Restore focus so the caret renders. When the editor did not have
			// focus, CodeMirror's focus observer writes its last recorded
			// scrollTop back if scrollTop is 0 (`@codemirror/view` focus observer).
			// That value is the previous tab's, so the new tab's scroll is written
			// right after, before CodeMirror's next measure draws the wrong viewport.
			const restoreTabScroll = () => {
				if (saved) {
					view?.scrollDOM.scrollTo(saved.scrollLeft, saved.scrollTop);
				} else {
					view?.scrollDOM.scrollTo(0, 0);
				}
			};
			view.focus();
			restoreTabScroll();
			logTabScroll('after focus', path);

			// Phase 4.4: cancel the prior pending rAF chain so a rapid tab
			// switch (A → B before A's rAF fires) does not land A's
			// `forceDecorationRebuild` on B's view.
			tabSwitchRafAbort?.abort();
			tabSwitchRafAbort = new AbortController();
			const rafSignal = tabSwitchRafAbort.signal;

			// Scroll events fire a frame after the write, so this also catches
			// the writes made during the doc replace above, including
			// CodeMirror's own (scroll-anchor correction, scroll targets), which
			// cannot be logged where they happen.
			const scrollDOM = view.scrollDOM;
			const logScrollEvent = () => logTabScroll('event', path);
			if (tabScrollLogOn()) scrollDOM.addEventListener('scroll', logScrollEvent, { signal: rafSignal });

			// Re-pin the saved offset after CodeMirror's first measure, which can
			// clamp it to the pre-measure height estimate or move it with a
			// scroll-anchor correction, then force decoration rebuild once the
			// viewport is stable
			requestAnimationFrame(() => {
				if (rafSignal.aborted) return;
				debug('TAB_SWITCH', 'restoring scroll, visibleRanges:', view?.visibleRanges?.map(r => `${r.from}-${r.to}`));
				logTabScroll('frame 1', path);
				restoreTabScroll();
				logTabScroll('after restore', path);
				requestAnimationFrame(() => {
					if (rafSignal.aborted) return;
					debug('TAB_SWITCH', 'dispatching forceDecorationRebuild, visibleRanges:', view?.visibleRanges?.map(r => `${r.from}-${r.to}`));
					logTabScroll('frame 2', path);
					const t1 = perfStart();
					view?.dispatch({ effects: forceDecorationRebuild.of(null) });
					perfEnd('TAB_SWITCH', 'decorationRebuild', t1);
					requestAnimationFrame(() => {
						if (rafSignal.aborted) return;
						logTabScroll('frame 3', path);
						scrollDOM.removeEventListener('scroll', logScrollEvent);
					});
				});
			});

			lastTabPath = path;
		});
	});

	$effect(() => {
		const pos = editorStore.pendingScrollPosition;

		untrack(() => {
			if (pos === null || !view) return;

			editorStore.setPendingScrollPosition(null);

			// Double-rAF ensures this runs after the tab-switch effect's scroll restore
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (!view) return;
					const clampedPos = Math.min(pos, view.state.doc.length);
					const path = lastTabPath ?? '';
					logTabScroll(`pending scrollIntoView pos=${clampedPos} before`, path);
					view.dispatch({
						selection: EditorSelection.cursor(clampedPos),
						effects: EditorView.scrollIntoView(clampedPos, { y: 'center' }),
					});
					view.focus();
					// The scroll itself lands in CodeMirror's next measure, so this
					// still shows the pre-scroll scrollTop; `frame 3` shows the result.
					logTabScroll(`pending scrollIntoView pos=${clampedPos} dispatched`, path);
				});
			});
		});
	});

	// Sync external content changes (Properties panel, task toggle, link
	// rename, watcher reload) into CodeMirror. Phase 5 of the perf refactor:
	// driven by `editorStore.externalContentSignal` (a counter bumped only by
	// `syncExternalContentToEditor`), NOT by `activeTab.content`. Keystrokes
	// don't bump the signal, so this effect doesn't re-run on every keystroke
	// and the per-keystroke `view.state.doc.toString()` round-trip is gone.
	//
	// `lastSeenSignal` skips the dispatch on first mount (signal === 0) — the
	// editor view was constructed with the initial content already; we only
	// dispatch on EXTERNAL bumps that follow.
	let lastSeenSignal = 0;
	$effect(() => {
		const signal = editorStore.externalContentSignal;

		untrack(() => {
			if (signal === lastSeenSignal) return;
			lastSeenSignal = signal;
			if (!view) return;
			const content = editorStore.activeTab?.content;
			if (content === undefined) return;

			const tBaseline = perfStart();
			const cursorPos = Math.min(view.state.selection.main.head, content.length);
			// Suppress onContentChange during the doc replace — this is an
			// external write, not a user edit. The writer already picked its
			// auto-save schedule when it called `syncExternalContentToEditor`;
			// letting the dispatch re-enter the keystroke pipeline would arm a
			// second timer inferred from the previous doc's frontmatter.
			isExternalEdit = true;
			try {
				replaceDoc(content, cursorPos);
			} finally {
				isExternalEdit = false;
			}
			perfBaseline('contentSyncEffect:dispatched', tBaseline);
		});
	});

	$effect(() => {
		const enabled = editorStore.isLivePreview;

		untrack(() => {
			if (!view) return;
			view.dispatch({ effects: editorModeEffects(enabled, sourceModeCompartment, settingsStore.disabledDecorators) });
		});
	});

	// Rebuild frontmatter widget when tag colors change
	$effect(() => {
		settingsStore.tagColors.colors;

		untrack(() => {
			if (!view) return;
			view.dispatch({ effects: forceDecorationRebuild.of(null) });
		});
	});

	// Rebuild decorations when the state a renderer's widgets snapshot changes
	// (`FencedBlockRenderer.rebuildOn`). A widget constructed before the
	// deferred property index build finishes renders "Building index..." with
	// no recovery path until an edit, and a collection block keeps its cached
	// rows after a change in another note: nothing else dispatches a rebuild
	// for either (audit 2026-06-10 HIGH finding 4, audit 2026-08-12 M12). The
	// rebuild creates fresh widgets whose eq() snapshot reflects the change.
	$effect(() => {
		for (const renderer of renderers) renderer.rebuildOn?.();

		untrack(() => {
			if (!view) return;
			view.dispatch({ effects: forceDecorationRebuild.of(null) });
		});
	});

	// Primitive deriveds so the theme effect below re-runs only when a theme
	// input changes. Any settings write replaces the whole settings object, and
	// a theme reconfigure on, say, the profiling toggle would make
	// `checkUpdateAction` rebuild every decoration (it rebuilds on `reconfigured`).
	const fontFamily = $derived(settingsStore.editor.fontFamily);
	const fontSize = $derived(settingsStore.editor.fontSize);
	const lineHeight = $derived(settingsStore.editor.lineHeight);
	const paragraphSpacing = $derived(settingsStore.editor.paragraphSpacing);
	const contentWidth = $derived(effectiveContentWidth(settingsStore.editor));

	// Reactively update editor theme when settings change
	$effect(() => {
		void [fontFamily, fontSize, lineHeight, paragraphSpacing, contentWidth];

		untrack(() => {
			if (!view) return;
			view.dispatch({
				effects: editorThemeCompartment.reconfigure(
					buildEditorTheme(fontFamily, fontSize, lineHeight, contentWidth, paragraphSpacing)
				),
			});
		});
	});

	// Reactively update heading typography CSS variables when settings change
	$effect(() => {
		const _typography = settingsStore.editor.headingTypography;

		untrack(() => {
			applyHeadingTypography();
		});
	});
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		{#snippet children()}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div bind:this={container} class="absolute inset-0" oncontextmenu={handleContextMenu}></div>
		{/snippet}
	</ContextMenu.Trigger>
	<ContextMenu.Content class="w-56">
		<ContextMenu.Item disabled={!menuHasSelection} onclick={handleCut}>
			<Scissors class="size-4" />
			Cut
		</ContextMenu.Item>
		<ContextMenu.Item disabled={!menuHasSelection} onclick={handleCopy}>
			<Copy class="size-4" />
			Copy
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handlePaste}>
			<ClipboardPaste class="size-4" />
			Paste
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleSelectAll}>
			<SquareDashedText class="size-4" />
			Select all
		</ContextMenu.Item>
		<ContextMenu.Separator />
		<ContextMenu.Item onclick={handleCopyBlockLink}>
			<Link class="size-4" />
			Copy block link
			<ContextMenu.Shortcut>{formatShortcut(COPY_BLOCK_LINK_SHORTCUT)}</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleCopyBlockEmbed}>
			<FileSymlink class="size-4" />
			Copy block embed
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
