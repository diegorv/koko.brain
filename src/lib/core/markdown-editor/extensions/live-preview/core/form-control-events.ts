/** Keyboard, text-input and IME events a form control handles on its own. */
const CONTROL_EVENT_TYPES = new Set([
	'keydown',
	'keyup',
	'keypress',
	'beforeinput',
	'input',
	'compositionstart',
	'compositionupdate',
	'compositionend',
]);

/** Elements whose keys belong to the control, not to the editor. */
const FORM_CONTROL_SELECTOR = 'input, select, textarea';

/**
 * `WidgetType.ignoreEvent` answer for a widget that holds form controls.
 *
 * Widgets that stop `mousedown` on their controls leave the editor selection
 * on another line, and CodeMirror runs its keymap for any event a widget does
 * not ignore. Without this, Backspace / Delete / Tab / Enter pressed in the
 * control edit the note at the editor's cursor. Returns `true` only for key,
 * input and composition events from an `input`, `select` or `textarea`, so
 * mouse events keep reaching CodeMirror as before.
 * @param event The event CodeMirror asks the widget about.
 * @returns Whether CodeMirror should leave the event to the control.
 */
export function isFormControlInputEvent(event: Event): boolean {
	if (!CONTROL_EVENT_TYPES.has(event.type)) return false;
	const target = event.target;
	return target instanceof Element && target.closest(FORM_CONTROL_SELECTOR) !== null;
}
