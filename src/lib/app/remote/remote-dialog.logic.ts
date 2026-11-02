/**
 * Button labels of a `plugin:dialog|message` call, in order, from its
 * `buttons` arg (the plugin's `buttonsToRust` output). The answer is the
 * label picked, as the desktop plugin returns it: `ask` compares it with its
 * ok label, `confirm` with `Ok`. Anything unknown gets a single `Ok`.
 */
export function dialogButtons(buttons: unknown): string[] {
	switch (buttons) {
		case 'OkCancel':
			return ['Ok', 'Cancel'];
		case 'YesNo':
			return ['Yes', 'No'];
		case 'YesNoCancel':
			return ['Yes', 'No', 'Cancel'];
	}
	if (buttons && typeof buttons === 'object') {
		const custom = buttons as Record<string, unknown>;
		if (typeof custom.OkCustom === 'string') return [custom.OkCustom];
		for (const key of ['OkCancelCustom', 'YesNoCancelCustom']) {
			const labels = custom[key];
			if (Array.isArray(labels) && labels.every((l) => typeof l === 'string')) return labels as string[];
		}
	}
	return ['Ok'];
}
