/**
 * Named font sizes of the app chrome, defined as `--text-<role>` in the
 * `@theme` block of `src/app.css` (which holds the values and their meaning).
 * CSS cannot import this list; `text-roles.test.ts` keeps the two in sync.
 */
export const TEXT_ROLES = ['label', 'meta', 'rail', 'row', 'title'] as const;
