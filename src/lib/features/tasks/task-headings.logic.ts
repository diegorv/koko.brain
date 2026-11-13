import { findInlineTags } from '#lib/utils/tag-extraction.js';
import type { TaskHeadingV2 } from '#lib/types/vault-v2.types.js';

/**
 * How `matchesHeading` compares a tag with a heading: `'tag'` reads the
 * heading's inline tags (the section rule), `'substring'` looks for the tag
 * anywhere in the heading text.
 */
export type HeadingMatchMode = 'tag' | 'substring';

/**
 * The ancestor chain of every heading of a note, from `NoteEntry.taskHeadings`.
 *
 * `chains[i]` holds the texts of heading `i`'s ancestors, outermost first,
 * ending with heading `i`'s own text. An ancestor is the nearest earlier
 * heading with a strictly lower level, then its ancestor, and so on. A task's
 * headings are `chains[task.heading]`, and `[]` when `heading` is absent.
 */
export function headingChains(taskHeadings?: readonly TaskHeadingV2[] | null): string[][] {
	const stack: TaskHeadingV2[] = [];
	const chains: string[][] = [];
	for (const heading of taskHeadings ?? []) {
		while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) stack.pop();
		stack.push(heading);
		chains.push(stack.map((h) => h.text));
	}
	return chains;
}

/**
 * Lower-cased tag names without `#`, from tags typed with or without it.
 * A tag that is empty or only `#` after trimming is dropped. In `'tag'` mode
 * trailing `/` are dropped too, as `findInlineTags` drops them from headings.
 */
function activeTagNames(tags: readonly string[], mode: HeadingMatchMode): string[] {
	const names: string[] = [];
	for (const tag of tags) {
		let name = tag.trim().replace(/^#/, '').toLowerCase();
		if (mode === 'tag') name = name.replace(/\/+$/, '');
		if (name) names.push(name);
	}
	return names;
}

/** Whether `heading` carries the inline tag `name` or one nested under it. */
function headingHasTag(heading: string, name: string): boolean {
	return findInlineTags(heading).some(({ tag }) => {
		const lower = tag.toLowerCase();
		return lower === name || lower.startsWith(`${name}/`);
	});
}

/**
 * Whether any of `tags` matches any heading of a task's chain
 * (`headingChains`), case-insensitive. With no active tag every task is kept.
 *
 * Tags are trimmed and may be typed with or without `#`. In `'tag'` mode a
 * heading matches when one of its inline tags, as `findInlineTags` reads them,
 * equals the tag or is nested under it (`#to-list` matches `#to-list/today`,
 * not `#to-listing`). In `'substring'` mode the heading text contains the tag
 * with its `#`.
 */
export function matchesHeading(headings: readonly string[], tags: readonly string[], mode: HeadingMatchMode): boolean {
	const names = activeTagNames(tags, mode);
	if (names.length === 0) return true;
	return headings.some((heading) => {
		if (mode === 'tag') return names.some((name) => headingHasTag(heading, name));
		const lower = heading.toLowerCase();
		return names.some((name) => lower.includes(`#${name}`));
	});
}
