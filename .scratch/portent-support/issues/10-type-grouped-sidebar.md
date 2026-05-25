Status: done
Phase: 3

# Type-grouped sidebar mode

## What to build

A new sidebar mode that groups notes by their Portent type instead of filesystem folders. This is the primary navigation mode for Portent-compatible vaults.

Sidebar structure:
```
[Search]
[Filters: All | Inbox | Archived | Favorites]
---
[Type sections, ordered by _order then alphabetical]
  Projects (icon: rocket, color: red)
    - Launch website
    - Try padel
  Responsibilities (icon: target, color: red)
    - Stay in good shape
  People (icon: users, color: blue)
    - Sergio Panagia
  Topics (icon: tag, color: green)
    - Padel
    - Portent
  Notes (icon: file-text, color: green)
    - How I Run Tolaria
---
[Untyped] (notes without is_a field)
[Folders] (existing file explorer, collapsed)
```

Each type section:
- Header with icon + color + label from Type Definition metadata (issue 09)
- Collapsible list of notes of that type
- Click note -> open in editor
- Note count badge
- Default sort from Type Definition's `_sort` field

Toggle between type-sidebar and file-explorer via settings or a sidebar mode switcher.

## Acceptance criteria

- [ ] New sidebar component showing notes grouped by type
- [ ] Type sections use icon, color, label from Type Definition store (issue 09)
- [ ] Sections sorted by `_order`, then alphabetical
- [ ] Filter bar: All (default), Inbox (not organized, not archived), Archived, Favorites
- [ ] "Untyped" section for notes without `is_a`
- [ ] File explorer still accessible (toggle or tab)
- [ ] Notes within sections sorted by Type Definition's `_sort` or title
- [ ] Note count badge per section
- [ ] Clicking a note opens it in the editor
- [ ] Sidebar updates reactively when notes are created, deleted, or re-typed
- [ ] Settings toggle to choose default sidebar mode
- [ ] Tests for section building logic

## Blocked by

- 09-type-definition-entry-parser
