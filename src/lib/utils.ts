import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import type { HTMLAttributes } from "svelte/elements";
import { TEXT_ROLES } from "#lib/utils/text-roles.js";

// tailwind-merge does not read app.css: without the roles, `text-row` counts
// as a color class and `cn()` drops the real color class next to it.
const twMerge = extendTailwindMerge({ extend: { theme: { text: [...TEXT_ROLES] } } });

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, El extends HTMLElement = HTMLElement> = T & {
	ref?: El | null;
} & HTMLAttributes<El>;

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;

export type WithoutChild<T> = Omit<T, 'child'>;
