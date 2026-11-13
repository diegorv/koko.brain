# Type definitions examples

Sample notes demonstrating types, relationships, lifecycle flags, type
definitions and `.view` files -- inspired by the [Portent](https://portent.md)
knowledge base specification. Portent defines eight default types (Projects,
Operations, Responsibilities, Tasks, Events, Notes, Topics, People) with
graph-style relationships (`_belongs_to`, `_related_to`) and a
capture/organize/archive lifecycle. This folder shows how Kokobrain implements
those ideas with free-form types and frontmatter flags. Open it in Kokobrain to
see the Types navigator, the rail, relationship backlinks and the lifecycle
actions of the note action bar.

Every `.view` file lists only notes in a folder named
`type-definitions-features` (`file.folder.endsWith(...)`), so the views keep
working when the folder is copied into a larger vault. If you rename the
folder, update that filter. The type definitions in `_types/` cannot be
scoped: a type's list in the Types navigator holds every note of that type
across the vault, and these definitions merge with your own types of the same
name.

## What's here

| File | Demonstrates |
|------|--------------|
| **Type definitions (all 8 Portent types + Meeting)** | |
| `_types/Responsibility.md` | PORT: long-running area of accountability, pinned to the rail with `_rail: true` |
| `_types/Project.md` | PORT: type definition with custom icon, color, order, and template |
| `_types/Operation.md` | PORT: recurring work with frequency and `_belongs_to` display |
| `_types/Task.md` | PORT: one-off work with priority and `_belongs_to` display |
| `_types/Event.md` | ENTP: things that happened, with `date` on its list rows |
| `_types/Note.md` | ENTP: default type for knowledge artifacts |
| `_types/Topic.md` | ENTP: type definition with list properties display |
| `_types/Person.md` | ENTP: type definition with a custom sidebar label (`People`) |
| `_types/Meeting.md` | Custom type with `_title_color` and `date` / `attendees` on its list rows |
| **View files** | |
| `active-projects.view` | View with filter expression, custom icon/color, and `_title_color` |
| `recent-meetings.view` | View with date-based filter (`file.ctime`) and `duration()` function |
| `project-inbox.view` | `_group: Work`: listed under a **Work** subheading in Views, after the views without a group |
| `drafts.view` | `_visible: false`: left out of Views; reach it from the Files navigator or the palette's **Open view: Drafts** |
| `health.view` | `_rail: true`: pinned to the rail, with its own icon and color |
| `projects-by-status.view` | Two views under `views:`; `_rail_view: Active` makes the note list run the second one, while the editor opens on **All** |
| `dated-since-march.view` | A date filter, `date >= date('2026-03-01')` (the Filter panel's **on or after**), on a frontmatter `date`, oldest first |
| **Typed notes** | |
| `project-kokobrain.md` | Project note with relationships, `_favorite`, and `_favorite_index` |
| `project-website-redesign.md` | Archived project showing lifecycle flags |
| `project-inbox-example.md` | Project in the Inbox (`_organized: false`) with `status: draft` |
| `person-alice.md` | Person note linked via `manager` relationship from projects |
| `person-bob.md` | Person note with no `_organized` flag (counts as organized) |
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
2. Type definition notes (`type: Type`) customize how each type appears in the Types navigator: label, icon, color, order, template, folder and the properties on its rows.
3. The Types navigator lists each type; clicking one fills the note list with its notes that are not archived, most recently modified first.
4. View files (`.view`) define saved filter queries that appear under Views in the Types navigator, above the types.

## How relationships work

1. `_belongs_to: "[[project-kokobrain]]"` creates a hierarchical link.
2. `_related_to: ["[[topic-rust]]", "[[topic-svelte]]"]` creates associations.
3. Any frontmatter field with wikilink values creates a relationship.
4. The Backlinks panel shows a Relationships section with these connections.

## How lifecycle works

1. `_organized: false` puts a note in the Inbox; a note without the flag counts as organized.
2. `_archived: true` hides it from default views; the rail's Archive item lists it.
3. `_favorite: true` lists it under Favorites.
4. The note action bar above every note toggles these states: the star (`Cmd+D`), the Organized check circle (`Cmd+E`), and More > Archive / Restore.

## Trying it locally

1. Copy this folder into your vault.
2. Click **Types** in the rail (the layers icon).
3. Browse all types: Responsibilities, Projects, Operations, Meetings, Topics, Tasks, Events, Notes, and People. Then the views: Active Projects, Recent Meetings, Health, Projects by Status and Dated Since March 2026, with Project Inbox under **Work**. Drafts is not listed: press `Cmd+P` and run **Open view: Drafts**.
4. Look at the rail: **Responsibilities** and **Health** are pinned below Files. Right-click either in the Types navigator and choose **Unpin from rail** to remove the pin.
5. Open `project-kokobrain.md` and check the Backlinks panel for relationship backlinks.
6. Click **Inbox** in the rail to see `project-inbox-example.md`. While **Explicit organization** is on in Settings > Types (the default), new notes start there too.
7. Click "Active Projects" in the Types navigator and use the Filter (funnel) and Sort (⇅) icons in the note list header to tweak the query: every edit writes back to `active-projects.view`.

See [Types & Relationships](../../documentation/25-types-and-relationships.md) for the full guide.
