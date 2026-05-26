# Type definitions examples

Sample notes demonstrating types, relationships, lifecycle flags, and
type definitions. Open these in Kokobrain to see the type sidebar,
relationship backlinks, and lifecycle actions in action.

## What's here

| File | Demonstrates |
|------|--------------|
| **Type definitions** | |
| `_types/Project.md` | Type definition with custom icon, color, order, and template |
| `_types/Person.md` | Type definition with built-in fallback overrides |
| `_types/Topic.md` | Type definition with list properties display |
| `_types/Meeting.md` | Type definition with `_view`, `_title_color`, and date-based sorting |
| **View files** | |
| `active-projects.view` | View with filter expression, custom icon/color, and `_title_color` |
| `recent-meetings.view` | View with date-based filter and `duration()` function |
| **Typed notes** | |
| `project-kokobrain.md` | Project note with relationships, `_favorite`, and `_favorite_index` |
| `project-website-redesign.md` | Archived project showing lifecycle flags |
| `project-inbox-example.md` | Project in inbox (`_organized: false`) |
| `person-alice.md` | Person note linked via `manager` relationship from projects |
| `person-bob.md` | Person note in inbox (not organized) |
| `topic-rust.md` | Topic note with favorites, `_order`, and multiple backlinks |
| `topic-svelte.md` | Topic note referenced by projects |
| `meeting-kickoff.md` | Untyped note with `belongs_to` relationship |
| `meeting-weekly-standup.md` | Meeting note using `is_a` alias, with `_order` and attendees |

## How types work

1. Notes declare their type via `type: Project` (or `is_a: Project`) in frontmatter.
2. Type definition notes (`type: Type`) customize how each type appears in the sidebar.
3. The type sidebar groups notes by type and supports filtering by lifecycle state.
4. View files (`.view`) define saved filter queries that appear as sidebar nav items alongside types.

## How relationships work

1. `belongs_to: "[[project-kokobrain]]"` creates a hierarchical link.
2. `related_to: ["[[topic-rust]]", "[[topic-svelte]]"]` creates associations.
3. Any frontmatter field with wikilink values creates a relationship.
4. The Backlinks panel shows a Relationships section with these connections.

## How lifecycle works

1. `_organized: true` marks a note as organized (out of inbox).
2. `_archived: true` hides it from default views.
3. `_favorite: true` marks it for the Favorites filter.
4. The Properties panel shows action buttons to toggle these states.

## Trying it locally

1. Copy this folder into your vault.
2. Switch to type sidebar mode (click the grid icon in the file explorer header).
3. Browse Projects, People, Topics, and Meetings sections. Also check "Active Projects" and "Recent Meetings" view entries.
4. Open `project-kokobrain.md` and check the Backlinks panel for relationship backlinks.
5. Enable Explicit Organization in Settings > Types to see the Inbox filter.

See [Types & Relationships](../../documentation/25-types-and-relationships.md) for the full guide.
