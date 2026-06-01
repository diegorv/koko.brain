# Type definitions examples

Sample notes demonstrating types, relationships, lifecycle flags, and
type definitions -- inspired by the [Portent](https://portent.md) knowledge base
specification. Portent defines eight default types (Projects, Operations,
Responsibilities, Tasks, Events, Notes, Topics, People) with graph-style
relationships (`_belongs_to`, `_related_to`) and a capture/organize/archive
lifecycle. This folder shows how Kokobrain implements those ideas with
free-form types and frontmatter flags. Open in Kokobrain to see the type
sidebar, relationship backlinks, and lifecycle actions in action.

## What's here

| File | Demonstrates |
|------|--------------|
| **Type definitions (all 8 Portent types + Meeting)** | |
| `_types/Responsibility.md` | PORT: long-running area of accountability |
| `_types/Project.md` | PORT: type definition with custom icon, color, order, and template |
| `_types/Operation.md` | PORT: recurring work with frequency and `_belongs_to` display |
| `_types/Task.md` | PORT: one-off work with priority and `_belongs_to` display |
| `_types/Event.md` | ENTP: things that happened, date-based sorting |
| `_types/Note.md` | ENTP: default type for knowledge artifacts |
| `_types/Topic.md` | ENTP: type definition with list properties display |
| `_types/Person.md` | ENTP: type definition with built-in fallback overrides |
| `_types/Meeting.md` | Custom type with `_view`, `_title_color`, and date-based sorting |
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
| `responsibility-stay-in-shape.md` | Responsibility with metrics and linked operations |
| `operation-strength-training.md` | Operation with `_belongs_to` Responsibility and frequency |
| `task-sign-up-playtomic.md` | Task with checklist, `_belongs_to` Responsibility |
| `event-product-launch.md` | Event with date, `_belongs_to` Project, multiple relationships |
| `note-portent-overview.md` | Note with `_belongs_to` and `_related_to`, reference material |
| `meeting-kickoff.md` | Untyped note with `_belongs_to` relationship |
| `meeting-weekly-standup.md` | Meeting note with `type`, `_order`, and attendees |

## How types work

1. Notes declare their type via `type: Project` in frontmatter (stored canonically as `_type`).
2. Type definition notes (`type: Type`) customize how each type appears in the sidebar.
3. The type sidebar groups notes by type and supports filtering by lifecycle state.
4. View files (`.view`) define saved filter queries that appear as sidebar nav items alongside types.

## How relationships work

1. `_belongs_to: "[[project-kokobrain]]"` creates a hierarchical link.
2. `_related_to: ["[[topic-rust]]", "[[topic-svelte]]"]` creates associations.
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
3. Browse all sections: Responsibilities, Projects, Operations, Meetings, Topics, Tasks, Events, Notes, and People. Also check "Active Projects" and "Recent Meetings" view entries.
4. Open `project-kokobrain.md` and check the Backlinks panel for relationship backlinks.
5. Enable Explicit Organization in Settings > Types to see the Inbox filter.
6. Click "Active Projects" in the sidebar and use the Filter (funnel) and Sort (⇅) icons in the header to tweak the query — every edit writes back to `active-projects.view`. The Open / Archived / Favorites tabs underneath behave like the type listings.

See [Types & Relationships](../../documentation/25-types-and-relationships.md) for the full guide.
