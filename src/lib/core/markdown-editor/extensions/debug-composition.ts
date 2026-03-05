import { Compartment } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import {
	ViewPlugin,
	EditorView,
	type ViewUpdate,
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { syntaxHighlighting } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { wikilinkDecoration } from './wikilink';
import { calloutDecoration } from './callout';
import { markdownHighlight } from '../highlight-styles';

// ---------------------------------------------------------------------------
// Debug compartments — wrap suspect extensions so they can be toggled at runtime
// ---------------------------------------------------------------------------

/** Compartments for toggling suspect extensions during debugging */
export const debugCompartments = {
	closeBrackets: new Compartment(),
	bracketMatching: new Compartment(),
	indentOnInput: new Compartment(),
	wikilinkDecoration: new Compartment(),
	calloutDecoration: new Compartment(),
	syntaxHighlighting: new Compartment(),
} as const;

/** Original extension factories — used to re-enable after toggling off */
const extensionFactories: Record<keyof typeof debugCompartments, () => Extension> = {
	closeBrackets: () => closeBrackets(),
	bracketMatching: () => bracketMatching(),
	indentOnInput: () => indentOnInput(),
	wikilinkDecoration: () => wikilinkDecoration(),
	calloutDecoration: () => calloutDecoration(),
	syntaxHighlighting: () => syntaxHighlighting(markdownHighlight),
};

/** Current toggle states */
const toggleStates: Record<keyof typeof debugCompartments, boolean> = {
	closeBrackets: true,
	bracketMatching: true,
	indentOnInput: true,
	wikilinkDecoration: true,
	calloutDecoration: true,
	syntaxHighlighting: true,
};

/** Toggle an extension on/off and log the new state */
function toggleExtension(view: EditorView, name: keyof typeof debugCompartments): boolean {
	const newState = !toggleStates[name];
	toggleStates[name] = newState;
	const ext = newState ? extensionFactories[name]() : [];
	view.dispatch({
		effects: debugCompartments[name].reconfigure(ext),
	});
	const status = newState ? 'ENABLED' : 'DISABLED';
	console.warn(`[DEBUG-TOGGLE] >>> ${name}: ${status} <<<`);
	console.warn(`[DEBUG-TOGGLE] All states:`, { ...toggleStates });
	return true;
}

// ---------------------------------------------------------------------------
// Composition debug ViewPlugin — logs composition events, transactions,
// syntax tree changes, and DOM mutations during composition
// ---------------------------------------------------------------------------

const compositionDebugPlugin = ViewPlugin.fromClass(
	class {
		private composing = false;
		private mutationObserver: MutationObserver;
		private onCompositionStart: (e: CompositionEvent) => void;
		private onCompositionUpdate: (e: CompositionEvent) => void;
		private onCompositionEnd: (e: CompositionEvent) => void;

		constructor(private view: EditorView) {
			// --- Composition DOM event listeners ---
			this.onCompositionStart = (e: CompositionEvent) => {
				this.composing = true;
				const head = view.state.selection.main.head;
				const line = view.state.doc.lineAt(head);
				console.log('[COMP] compositionstart', {
					data: e.data,
					cursorPos: head,
					lineNum: line.number,
					lineText: line.text,
					viewComposing: view.composing,
					compositionStarted: view.compositionStarted,
				});
				// Start observing DOM mutations
				this.mutationObserver.observe(view.contentDOM, {
					childList: true,
					subtree: true,
					characterData: true,
					characterDataOldValue: true,
				});
			};

			this.onCompositionUpdate = (e: CompositionEvent) => {
				console.log('[COMP] compositionupdate', {
					data: e.data,
					viewComposing: view.composing,
					compositionStarted: view.compositionStarted,
				});
			};

			this.onCompositionEnd = (e: CompositionEvent) => {
				const head = view.state.selection.main.head;
				const line = view.state.doc.lineAt(head);
				console.log('[COMP] compositionend', {
					data: e.data,
					cursorPos: head,
					lineNum: line.number,
					lineText: line.text,
					viewComposing: view.composing,
					compositionStarted: view.compositionStarted,
				});
				this.composing = false;
				this.mutationObserver.disconnect();
			};

			view.dom.addEventListener('compositionstart', this.onCompositionStart);
			view.dom.addEventListener('compositionupdate', this.onCompositionUpdate);
			view.dom.addEventListener('compositionend', this.onCompositionEnd);

			// --- DOM mutation observer (only active during composition) ---
			this.mutationObserver = new MutationObserver((mutations) => {
				for (const m of mutations) {
					const target = m.target as HTMLElement;
					const info: Record<string, unknown> = {
						type: m.type,
						targetNode: target.nodeName,
						targetClass: target.className || undefined,
						targetText: (target.textContent || '').slice(0, 100),
					};
					if (m.type === 'characterData') {
						info.oldValue = (m.oldValue || '').slice(0, 100);
					}
					if (m.type === 'childList') {
						info.addedNodes = m.addedNodes.length;
						info.removedNodes = m.removedNodes.length;
						if (m.addedNodes.length > 0) {
							info.addedFirst = (m.addedNodes[0] as HTMLElement).nodeName;
							info.addedText = ((m.addedNodes[0] as HTMLElement).textContent || '').slice(0, 80);
						}
						if (m.removedNodes.length > 0) {
							info.removedFirst = (m.removedNodes[0] as HTMLElement).nodeName;
							info.removedText = ((m.removedNodes[0] as HTMLElement).textContent || '').slice(0, 80);
						}
					}
					console.log('[DOM-MUT]', info);
				}
			});
		}

		update(update: ViewUpdate) {
			// Only log during composition or when doc changes
			if (!update.docChanged && !this.composing) return;

			for (const tr of update.transactions) {
				if (!tr.docChanged) continue;
				console.log('[TX]', {
					composing: update.view.composing,
					compositionStarted: update.view.compositionStarted,
					isInputType: tr.isUserEvent('input.type'),
					isInputComplete: tr.isUserEvent('input.complete'),
					isInput: tr.isUserEvent('input'),
					changes: tr.changes.toJSON(),
					selectionSet: update.selectionSet,
					effectCount: tr.effects.length,
				});
			}

			// Log syntax tree around cursor during composition
			if (this.composing || update.view.compositionStarted) {
				const head = update.state.selection.main.head;
				const line = update.state.doc.lineAt(head);
				const nodes: string[] = [];
				syntaxTree(update.state).iterate({
					from: line.from,
					to: line.to,
					enter(node) {
						nodes.push(`${node.name}[${node.from}-${node.to}]`);
					},
				});
				console.log('[TREE]', {
					lineText: line.text,
					nodes: nodes.join(' > '),
				});
			}
		}

		destroy() {
			this.view.dom.removeEventListener('compositionstart', this.onCompositionStart);
			this.view.dom.removeEventListener('compositionupdate', this.onCompositionUpdate);
			this.view.dom.removeEventListener('compositionend', this.onCompositionEnd);
			this.mutationObserver.disconnect();
		}
	},
);

// ---------------------------------------------------------------------------
// Expose toggle functions on window.dbg for devtools console access.
// Usage: dbg.bracketMatching()  dbg.closeBrackets()  etc.
// ---------------------------------------------------------------------------

let editorViewRef: EditorView | null = null;

function exposeOnWindow() {
	const dbg: Record<string, () => void> = {};
	for (const name of Object.keys(debugCompartments) as (keyof typeof debugCompartments)[]) {
		dbg[name] = () => {
			if (!editorViewRef) {
				console.error('[DEBUG] No editor view available');
				return;
			}
			toggleExtension(editorViewRef, name);
		};
	}
	(window as unknown as Record<string, unknown>).dbg = dbg;
	console.warn('[DEBUG] Toggle functions ready! In console type:');
	console.warn('[DEBUG]   dbg.bracketMatching()   dbg.closeBrackets()   dbg.indentOnInput()');
	console.warn('[DEBUG]   dbg.wikilinkDecoration() dbg.calloutDecoration() dbg.syntaxHighlighting()');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** ViewPlugin that captures the EditorView ref and exposes window.dbg toggles */
const debugWindowPlugin = ViewPlugin.fromClass(
	class {
		constructor(view: EditorView) {
			editorViewRef = view;
			exposeOnWindow();
		}
		update(update: ViewUpdate) {
			editorViewRef = update.view;
		}
		destroy() {
			editorViewRef = null;
		}
	},
);

/** Debug extension that logs composition events, DOM mutations,
 *  and exposes window.dbg.* toggle functions in devtools console */
export function compositionDebugExtension(): Extension {
	return [compositionDebugPlugin, debugWindowPlugin];
}
