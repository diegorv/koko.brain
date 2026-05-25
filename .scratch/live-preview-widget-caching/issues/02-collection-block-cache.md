Status: done

# Cache collection block widget queries across viewport cycles

## What to build

CollectionBlockWidget.toDOM() currently calls `parseCollectionYaml()` + `executeQuery()` on every viewport re-entry. These operations parse YAML, traverse the property index, apply filters/sorts, and build a full DOM table. This causes jank scrolling through documents with inline collection blocks.

Add a live-DOM cache following the same pattern as the mermaid cache (issue 01) and the queryjs reference implementation. Cache key should incorporate yamlContent + isIndexReady + indexSize (the same fields eq() already checks). On cache hit, re-attach the existing table/calendar DOM. On cache miss, execute the query and cache the result.

## Acceptance criteria

- [ ] Collection blocks render once and are re-attached from cache on viewport re-entry
- [ ] Cache invalidates when YAML content changes or the property index changes (new files added, properties updated)
- [ ] Manual test: open a document with a collection block, scroll it in/out, confirm no re-query or flash
- [ ] Table click handlers (row click to open note) still work after cache re-attach

## Blocked by

None - can start immediately
