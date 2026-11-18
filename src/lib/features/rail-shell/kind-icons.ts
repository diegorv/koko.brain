import type { Component } from 'svelte';
import FileIcon from '@lucide/svelte/icons/file';
import FileText from '@lucide/svelte/icons/file-text';
import FileType from '@lucide/svelte/icons/file-type';
import ImageIcon from '@lucide/svelte/icons/image';
import Kanban from '@lucide/svelte/icons/kanban';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Table from '@lucide/svelte/icons/table';
import type { FileKind } from './rail-shell.types';

/**
 * The row icon of each file kind when the file has no icon of its own (the
 * file tree's kind icons). One shared map so every list shows the same icon
 * per kind. Not a `.logic.ts`: it imports components.
 */
export const KIND_ICONS: Record<FileKind, Component> = {
	markdown: FileText,
	canvas: LayoutDashboard,
	kanban: Kanban,
	view: Table,
	pdf: FileType,
	image: ImageIcon,
	other: FileIcon,
};
