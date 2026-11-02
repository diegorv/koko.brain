# Deep-dive group h10-debounce

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## save-pipeline-10: Trailing-only 2 s debounce with no maxWait and no blur or app-hide flush
- claimed severity: data-loss
- anchor: src/lib/utils/debounce.ts:9
- scenario: A long run of continuous typing with no 2 s pause, then a renderer crash, force quit or Cmd+Q, loses the entire run. Switching to another app does not save either.
- evidence given: READ: debounce.ts:9-17 has no maxWait; the only arming is onContentChange (editor.service.ts:224-227); no blur or visibilitychange save exists in src/lib (grep: only event-calendar and log.service use visibilitychange).
