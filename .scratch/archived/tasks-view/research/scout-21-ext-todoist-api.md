# Scout 21: Todoist API (current state) and SDK version

Scope: current Todoist API (unified v1), REST v2 / Sync v9 status, SDK `@doist/todoist-sdk` versions. Read-only research. Items marked "unverified" were not confirmed from a primary source in this run.

## Facts

### Repo SDK version
- `package.json:33`: `"@doist/todoist-sdk": "^15.8.0"` (read directly).
- Registry dist-tag `latest` is `17.0.0`: https://registry.npmjs.org/@doist/todoist-sdk (fetched; the response was truncated, so the publish time of 17.0.0 was not seen).
- GitHub releases (https://github.com/Doist/todoist-sdk-typescript/releases, fetched via the releases page under the old repo path, which resolved):
  - v17.0.0, 2026-11-05, breaking: user settings store `legacyPricing` as a price version number (#762).
  - v16.0.0, 2026-11-03, breaking: sync keeps unrecognized view option values instead of throwing (#743). Adds table view style for projects.
  - v15.13.0, 2026-10-31: fractional order keys for projects, sections, folders (#737).
  - v15.13.1 through v15.10.0 (2026-10-29 to 2026-11-02): fixes and helpers.
- Consequence: `^15.8.0` never resolves to 16.x or 17.x (caret stops at the major). Upgrading to 16 or 17 is a deliberate major bump. Both majors are marked breaking. Whether 15.x still works against the live API is not verified.
- npm web page returned 403 (https://www.npmjs.com/package/@doist/todoist-sdk). Registry JSON was used instead.

### Package and repo names
- SDK README (https://github.com/Doist/todoist-api-typescript, fetched; the URL resolved): install with `npm install @doist/todoist-sdk`, Node 20.18.1 or later.
- Repo URL in registry metadata: `git+https://github.com/Doist/todoist-sdk-typescript.git`.
- Registry 0.0.1 is an OIDC trusted-publishing placeholder. The first real release is 8.0.0. The rename from `@doist/todoist-api-typescript` is likely but not confirmed in the fetched text.

### API shutdown status
- REST v2 and Sync v9 were shut down on 2026-02-10 (secondary sources: Airbyte issue #86899 https://github.com/airbytehq/airbyte/issues/86899 citing the vendor notice https://groups.google.com/a/doist.com/g/todoist-api/c/brwENjfT_tk; Drafts forum https://forums.getdrafts.com/t/todoist-api-changes/16352 saying the date was confirmed and that brownouts were scheduled before it; n8n community https://community.n8n.io/t/todoist-api-deprecated/234235). The vendor Google Group post was cited but not fetched in this run.
- Behaviour after shutdown per developer PRs and issues: old `/rest/v2/*` returns 410 Gone (Airbyte #86899).
- Unrelated earlier deprecation: REST v1 and Sync v8 shut down 2022-11-30 (Google Group thread https://groups.google.com/a/doist.com/g/todoist-api/c/33g1sC_ov3Q, from search results).
- Unified v1 base URL: `https://api.todoist.com/api/v1/` (https://developer.todoist.com/api/v1/, fetched). Sync is `POST /api/v1/sync`, form-encoded.
- Migration v1 changes reported in third-party PRs (secondary):
  - Lists are paginated: `{results, next_cursor}`.
  - Quick add is `POST tasks/quick`, and it no longer adds the default reminder on its own.
  - Close and reopen return 200 with an empty body (v2 used 204).
  - `Idempotency-Key` header is no longer honored. Sync-style `uuid` idempotency is used instead.
  - The `url` property was removed from tasks.
  - Object IDs changed (n8n community post above, unverified against docs). The docs say `project_id` takes `v2_id` only (developer docs migration text, fetched).
- Migration guide sections (headings only, from fetched nav): lowercase endpoints, subdomain change, IDs and task URLs, pagination, renames, deprecated endpoints, `/sync` changes.
- Renames noted: `day_orders` replaced by `user_item_orders`. `workspace_set_default_project_ordering` replaced by `default_order_key` on `project_update` and `folder_update`. `section_reorder` deprecated, use `section_update` with `order_key`. `project_move_to_workspace` and `project_move_to_personal` without `use_lro` deprecated.

### Auth
- Every request: `Authorization: Bearer <token>` (developer docs, fetched).
- Personal token from the integrations settings page, for testing.
- OAuth2 authorize: `https://app.todoist.com/oauth/authorize`. Token: `https://api.todoist.com/oauth/access_token`.
- Scopes: `task:add`, `data:read`, `data:read_write`, `data:delete`, `project:delete`, `backups:read`.
- New apps: access tokens expire after 1 hour, refresh tokens rotate. Legacy apps keep long-lived tokens (developer docs, fetched).
- Also: dynamic client registration (RFC 7591, `/oauth/register`) and OAuth Client ID Metadata Documents with PKCE for public clients.
- SDK auth: `new TodoistApi('TOKEN')`, `getAuthToken`, `refreshAuthToken`, `revokeToken` (SDK README, fetched). Public clients omit `clientSecret` on refresh.

### Resource endpoints (names from fetched nav; paths partly confirmed)
- Tasks: list, get, create, update, delete, move, close, reopen, quick add, get by filter, completed by completion date, completed by due date (developer docs nav).
- Projects: CRUD, archive, unarchive, list archived, search, collaborators, permissions, join, CSV and template import.
- Sections: list, get, create, update, delete, search, archive, unarchive.
- Labels: personal CRUD and search. Shared labels: list, rename, remove.
- Comments: CRUD plus reactions.
- Filters: the REST section lists delete only. Create, update and reorder are Sync commands (developer docs nav, fetched).
- Completed tasks path: `GET /api/v1/tasks/completed/by_completion_date` with `filter_query` (example `#Work & overdue`), `limit` (default 50), `completed_at` on each task. Also `GET /api/v1/tasks/completed/by_due_date` and `GET /api/v1/tasks/completed/stats` (search result quoting developer docs, https://developer.todoist.com/api/v1/). Third-party: `since` and `until` (YYYY-MM-DD), `cursor`, `workspace_id`, `project_id`, `section_id`, `parent_id`, `limit` max 50. Unverified against the docs.
- Filter query for get-by-filter: SDK `getTasksByFilter({ query })`, with `escapeFilterToken` helper (SDK README, fetched).

### Task fields
- Official docs (via search snippet quoting developer.todoist.com/api/v1): task has `due`, `deadline`, `duration` objects. Duration is a positive integer. The API accepts more than 24 hours. The web and desktop picker caps edits at 24 hours.
- Example fields from docs: `due_string`, `due_date`, `due_datetime`, `due_lang`, `duration: 30`, `duration_unit: "minute"`, `deadline_date`.
- Priority: 1 to 4, with 4 the highest. Docs say "So, p1 will return 4 in the API" (search snippet quoting official docs). The UI p1 maps to API 4, UI p4 to API 1.
- Sync-era Todoist v9 used the same scale (from memory, not verified here).

### Sync
- Reads: `sync_token` (`*` for full, previous token for incremental) and `resource_types`.
- Writes: `commands` array, each with a `uuid` for idempotency and optional `temp_id`. Results in `sync_status` and `temp_id_mapping` (developer docs nav, fetched; detail was truncated).
- `temp_id_mapping` and `sync_status` shapes were not read in full.

### Completed-task gaps
- Known limitation: `by_completion_date` misses completed occurrences of recurring tasks (Doist/todoist-sdk-typescript issue #694 https://github.com/Doist/todoist-sdk-typescript/issues/694; julesvbertolino/todoist-enhanced #331; Doist/todoist-api-python #206 cited by the enhanced issue). Older `/tasks/completed` reportedly returned them. Activity log is an alternative (secondary).

### Rate limits
- Developer docs have a "Request limits" section and a "Rate Limiting" section. Their numbers were not captured.
- Confirmed in docs text (fetched): 429 means too many requests. `retry_after` appears in `error_extra`. A 401 for an expired token may include `Retry-After: 3`, and the docs say refresh rather than retry (developer docs, fetched).
- Third-party only: 1000 requests per 15 minutes per user token, with 429 on excess. A second source says 450 per 15 minutes. These conflict. Sync batching is credited with reducing rate-limit pressure (developer docs, fetched).
- X-RateLimit headers: not confirmed.

### Webhooks
- Developer docs have a Webhooks section with Configuration and Request Format subsections (sidebar, fetched). Events, payload and retry policy were not captured.
- Integrations are managed in the App Management Console at `https://app.todoist.com/app/settings/integrations/app-management` (fetched).

## Problems and gaps (for the Tasks view PRD)

1. Current SDK pin is `^15.8.0` while the registry is at 17.0.0 and 16.x and 17.x are breaking. Any SDK code changed for the PRD must target one major explicitly, and the upgrade path needs its own Issue.
2. Priority mapping is reversed relative to the UI. Any priority filter or sort in the Tasks view must map p1 to API 4. This is an easy place to get wrong (the view's current use of priority is unknown from this scout; it is read-only and not checked here).
3. Completed-task listing via `by_completion_date` is incomplete for recurring tasks. A "done this week" view built on it under-reports.
4. Sent-task identity in the app is `filePath + task text`. Todoist v1 renames and ID changes make external IDs fragile. The PRD should not depend on v9-era IDs.
5. `Idempotency-Key` is gone in v1. Any retry logic that relied on it must use the Sync `uuid` idempotency for sync commands, and needs checking for REST writes.
6. Quick add no longer adds the default reminder. Behaviour differences matter if the app's Todoist send path uses quick add.
7. Rate limits are not confirmed from the primary source. The PRD should not promise a sync frequency based on the third-party numbers.
8. Filters: create, update and reorder are Sync-only in v1. A UI for "saved Todoist filters" needs Sync, not the REST filter endpoints.
9. OAuth tokens expire after 1 hour for new apps. A personal-token-only setup avoids this, but a multi-user or distributed app needs refresh-token handling.

## Ideas worth keeping

- Use `getTasksByFilter` with Todoist's own filter syntax for "which tasks are sourced". The app can compose the query string, and this removes the need to replicate filter logic locally. The SDK's `escapeFilterToken` helps with user-typed search text.
- Use `by_completion_date` with `since`/`until` for a completed-tasks log, with the recurring-task caveat documented in the UI.
- Mirror Todoist's `due` / `deadline` / `duration` as three separate fields in the Tasks view model. Do not collapse them into one date.
- Show the priority in the UI using Todoist's p1 to p4 labels, with the API value stored as-is (4 to 1).
- Use Sync `sync_token` for incremental refresh of projects, sections, labels, and filters, instead of full re-list per refresh.
- Store the SDK major version in the PRD as a decision point, with a spike to check breaking changes in 16 and 17 against the current `src/lib/features/tasks/todoist*.ts` wrapper (not read in this run).

## Open questions

1. Exact REST paths and parameters for `tasks` create, update and list (developer docs Tasks section was not reachable in full; only nav names fetched).
2. Exact rate-limit numbers and whether X-RateLimit headers exist (Request limits section not captured).
3. Webhook events, payload and retry policy.
4. Whether `@doist/todoist-api-typescript` is deprecated on npm (not checked; npm web returned 403).
5. Whether SDK 15.x still functions against unified v1, or whether the pinned version is already on a shim. Unverified.
6. Whether the app's current code uses v9-era IDs or the `url` property that v1 removed. Not read here (out of scope for this scout).
7. Recurring-task completion via the activity log endpoint: exact path and filters not verified.

## Sources (fetched or searched in this run)
- https://developer.todoist.com/api/v1/ (fetched, partial)
- https://developer.todoist.com/guides/ (fetched, partial)
- https://registry.npmjs.org/@doist/todoist-sdk (fetched, partial)
- https://github.com/Doist/todoist-sdk-typescript/releases (fetched)
- https://github.com/Doist/todoist-api-typescript (fetched; README)
- https://github.com/Doist/todoist-sdk-typescript/issues/694 (search result only)
- https://github.com/airbytehq/airbyte/issues/86899 (search result only)
- https://groups.google.com/a/doist.com/g/todoist-api/c/brwENjfT_tk (cited, not fetched)
- https://forums.getdrafts.com/t/todoist-api-changes/16352 (search result only)
- https://community.n8n.io/t/todoist-api-deprecated/234235 (search result only)
