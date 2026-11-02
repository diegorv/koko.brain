<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import {
		EditorState,
		EditorSelection,
		Compartment,
		Transaction,
		type Extension,
		type StateEffect,
	} from '@codemirror/state';
	import Link from '@lucide/svelte/icons/link';
	import FileSymlink from '@lucide/svelte/icons/file-symlink';
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
	/** The extensions the view was mounted with, reused for a tab's first state */
	let mountExtensions: Extension[] = [];

	/** Reconfigures language parser and highlight style based on the active tab's file extension */
	async function applyLanguageForTab(tabName: string) {
		if (!view) return;
		const effects = await getLanguageEffects(tabName, languageCompartment, highlightStyleCompartment);
		view.dispatch({ effects });
	}

	/**
	 * Turns the doc into `content` (no history entry) and never throws. Only
	 * the range that differs is replaced (`docDiff`), so the undo events of the
	 * user's own edits map through it and an undo never lands after the
	 * replacement text at the end of the doc.
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
		const spec = () => ({
			changes: docDiff(v.state.doc.toString(), content),
			selection: EditorSelection.cursor(cursorPos),
			annotations: Transaction.addToHistory.of(false),
		});
		try {
			v.dispatch(spec());
		} catch (err) {
			error('EDITOR', 'doc replace threw, rebuilding the view:', err);
			try {
				v.setState(v.state.update(spec()).state);
			} catch (rebuildErr) {
				error('EDITOR', 'view rebuild after a failed doc replace threw:', rebuildErr);
			}
		}
	}

	/**
	 * Shows the tab at `path` with its own editor state, so undo and redo never
	 * cross notes in the one view every tab shares. Starts from the state saved
	 * when the user left the tab, or from a fresh state with the mount-time
	 * extensions on a first visit, and brings it up to date in one update with
	 * no history entry: the content the store holds now (a background write may
	 * have changed it; `docDiff` maps the history through it), the cursor, and
	 * the current theme, editor mode and `langEffects`, since a saved state
	 * keeps the compartment values it had when it was left. Never throws: a
	 * `setState` that throws (a widget `toDOM`) is logged and retried once, as
	 * `replaceDoc` does.
	 */
	function showTabState(path: string, content: string, cursorPos: number, langEffects: StateEffect<unknown>[]) {
		if (!view) return;
		const base = takeTabEditorState(path) ?? EditorState.create({ doc: content, extensions: mountExtensions });
		const next = base.update({
			changes: docDiff(base.doc.toString(), content),
			selection: EditorSelection.cursor(cursorPos),
			annotations: Transaction.addToHistory.of(false),
			effects: [
				editorThemeCompartment.reconfigure(
					buildEditorTheme(fontFamily, fontSize, lineHeight, contentWidth, paragraphSpacing)
				),
				...editorModeEffects(editorStore.isLivePreview, sourceModeCompartment, settingsStore.disabledDecorators),
				...langEffects,
			],
		}).state;
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

	/** Moves the cursor to the right-click position so copy-block-link operates on the correct line */
	function handleContextMenu(e: MouseEvent) {
		if (!view) return;
		const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
		if (pos === null) return;
		view.dispatch({ selection: EditorSelection.cursor(pos) });
	}

	async function handleCopyBlockLink() {
		if (view) await blockLinks.copyLink(view);
	}

	async function handleCopyBlockEmbed() {
		if (view) await blockLinks.copyEmbed(view);
	}

	onMount(() => {
		const tab = editorStore.activeTab;
		if (!tab) return;

		// Restore cursor from saved view state if available (e.g. after remount from collection/canvas tab)
		const saved = getTabViewState(tab.path);
		const cursorPos = saved ? Math.min(saved.cursorPos, tab.content.length) : getPositionAfterFrontmatter(tab.content);

		mountExtensions = createExtensions({
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
		});
		const state = EditorState.create({
			doc: tab.content,
			extensions: mountExtensions,
			selection: EditorSelection.cursor(cursorPos),
		});

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
		container.addEventListener('mousedown', handleEditorClick, { capture: true });
	});

	onDestroy(() => {
		editorStore.setEditorView(null);
		container?.removeEventListener('mousedown', handleEditorClick, { capture: true });
		// Abort any pending tab-switch rAF chain so it does not fire on a
		// destroyed view.
		tabSwitchRafAbort?.abort();
		tabSwitchRafAbort = null;
		// Saved tab states close over this instance's compartments and flags.
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
			if (lastTabPath && takeTabRename(lastTabPath) === path) {
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
			const cursorPos = saved ? Math.min(saved.cursorPos, tab.content.length) : getPositionAfterFrontmatter(tab.content);

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
			const t0 = perfStart();
			try {
				showTabState(path, tab.content, cursorPos, langEffects ?? []);
			} finally {
				isTabSwitching = false;
			}
			perfEnd('TAB_SWITCH', 'docReplace', t0);

			// Async language load for code files only — markdown/kanban already
			// reconfigured via the inline `effects` above.
			if (langEffects === null) {
				applyLanguageForTab(tab.name);
			}

			// Restore focus so the caret renders
			view.focus();

			// Phase 4.4: cancel the prior pending rAF chain so a rapid tab
			// switch (A → B before A's rAF fires) does not land A's
			// `forceDecorationRebuild` on B's view.
			tabSwitchRafAbort?.abort();
			tabSwitchRafAbort = new AbortController();
			const rafSignal = tabSwitchRafAbort.signal;

			// Restore scroll position, then force decoration rebuild once viewport is stable
			requestAnimationFrame(() => {
				if (rafSignal.aborted) return;
				debug('TAB_SWITCH', 'restoring scroll, visibleRanges:', view?.visibleRanges?.map(r => `${r.from}-${r.to}`));
				if (saved) {
					view?.scrollDOM.scrollTo(saved.scrollLeft, saved.scrollTop);
				} else {
					view?.scrollDOM.scrollTo(0, 0);
				}
				requestAnimationFrame(() => {
					if (rafSignal.aborted) return;
					debug('TAB_SWITCH', 'dispatching forceDecorationRebuild, visibleRanges:', view?.visibleRanges?.map(r => `${r.from}-${r.to}`));
					const t1 = perfStart();
					view?.dispatch({ effects: forceDecorationRebuild.of(null) });
					perfEnd('TAB_SWITCH', 'decorationRebuild', t1);
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
					view.dispatch({
						selection: EditorSelection.cursor(clampedPos),
						effects: EditorView.scrollIntoView(clampedPos, { y: 'center' }),
					});
					view.focus();
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
		<ContextMenu.Item onclick={handleCopyBlockLink}>
			<Link class="mr-2 size-4" />
			Copy link to block
			<ContextMenu.Shortcut>⌘⇧L</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleCopyBlockEmbed}>
			<FileSymlink class="mr-2 size-4" />
			Copy block embed
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
