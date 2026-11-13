# calls of src/lib/features/tasks/task-query.logic.ts
cols: call <loc> in <fn> -> <target> <kind> [+<n>] · grep: grep -F -- ' in <fn> -> ' codemap/files/src/lib/features/tasks/task-query.logic.ts.calls.md
sections: calls
## calls
call src/lib/features/tasks/task-query.logic.ts:161 in taskTagOptions -> src/lib/features/tasks/task-query.logic.ts:byLowerCase ref
call src/lib/features/tasks/task-query.logic.ts:169 in tagMenuOptions -> src/lib/features/tasks/task-query.logic.ts:taskTagOptions call
call src/lib/features/tasks/task-query.logic.ts:171 in tagMenuOptions -> src/lib/features/tasks/task-query.logic.ts:byLowerCase ref
call src/lib/features/tasks/task-query.logic.ts:181 in propertyKeyOptions -> src/lib/features/tasks/task-query.logic.ts:byLowerCase ref
call src/lib/features/tasks/task-query.logic.ts:204 in toggleQuickStatus -> src/lib/features/tasks/task-status.logic.ts:TASK_STATUSES mcall
call src/lib/features/tasks/task-query.logic.ts:245 in buildTaskRows -> src/lib/features/tasks/tasks.logic.ts:compareTaskPaths call
call src/lib/features/tasks/task-query.logic.ts:248 in buildTaskRows -> src/lib/features/tasks/task-headings.logic.ts:headingChains call
call src/lib/features/tasks/task-query.logic.ts:252 in buildTaskRows -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/task-query.logic.ts:267 in buildTaskRows -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/features/tasks/task-query.logic.ts:268 in buildTaskRows -> src/lib/features/tasks/tasks.logic.ts:noteFolder call
call src/lib/features/tasks/task-query.logic.ts:269 in buildTaskRows -> src/lib/features/tasks/tasks.logic.ts:noteTaskCounts call
call src/lib/features/tasks/task-query.logic.ts:281 in buildTaskRows -> src/lib/features/tasks/task-status.logic.ts:isTaskOpen call
call src/lib/features/tasks/task-query.logic.ts:291 in buildTaskRows -> src/lib/features/type-definitions/inbox-workflow.logic.ts:isInboxEntry call
call src/lib/features/tasks/task-query.logic.ts:425 in defaultTaskQuery -> src/lib/features/tasks/task-query.logic.ts:emptyTaskExcludes call
call src/lib/features/tasks/task-query.logic.ts:425 in defaultTaskQuery -> src/lib/features/tasks/task-query.logic.ts:headingSources call
call src/lib/features/tasks/task-query.logic.ts:439 in onlyThisFolder -> src/lib/features/tasks/task-query.logic.ts:folderValue call +1
call src/lib/features/tasks/task-query.logic.ts:453 in hideFolder -> src/lib/features/tasks/task-query.logic.ts:folderValue call +1
call src/lib/features/tasks/task-query.logic.ts:481 in onlyThisType -> src/lib/features/tasks/task-query.logic.ts:typeValue call +1
call src/lib/features/tasks/task-query.logic.ts:495 in hideType -> src/lib/features/tasks/task-query.logic.ts:typeValue call +1
call src/lib/features/tasks/task-query.logic.ts:514 in hasNoteTag -> src/lib/features/tasks/task-query.logic.ts:matchesNestedTag call
call src/lib/features/tasks/task-query.logic.ts:523 in clauseTest -> src/lib/features/tasks/task-query.logic.ts:folderValue call
call src/lib/features/tasks/task-query.logic.ts:525 in clauseTest -> src/lib/features/tasks/task-query.logic.ts:inFolder call
call src/lib/features/tasks/task-query.logic.ts:535 in clauseTest -> src/lib/features/tasks/task-query.logic.ts:tagValue call
call src/lib/features/tasks/task-query.logic.ts:537 in clauseTest -> src/lib/features/tasks/task-query.logic.ts:hasNoteTag call
call src/lib/features/tasks/task-query.logic.ts:541 in clauseTest -> src/lib/features/tasks/task-query.logic.ts:headingValue call
call src/lib/features/tasks/task-query.logic.ts:544 in clauseTest -> src/lib/features/tasks/task-headings.logic.ts:matchesHeading call
call src/lib/features/tasks/task-query.logic.ts:547 in clauseTest -> src/lib/features/tasks/task-query.logic.ts:propertyTest call
call src/lib/features/tasks/task-query.logic.ts:577 in propertyTest -> src/lib/features/tasks/task-query.logic.ts:propertyScalars call +2
call src/lib/features/tasks/task-query.logic.ts:605 in excludeTest -> src/lib/features/tasks/task-query.logic.ts:folderValue ref
call src/lib/features/tasks/task-query.logic.ts:607 in excludeTest -> src/lib/features/tasks/task-query.logic.ts:inFolder call
call src/lib/features/tasks/task-query.logic.ts:610 in excludeTest -> src/lib/features/tasks/task-query.logic.ts:tagValue ref
call src/lib/features/tasks/task-query.logic.ts:611 in excludeTest -> src/lib/features/tasks/task-query.logic.ts:hasNoteTag call
call src/lib/features/tasks/task-query.logic.ts:639 in selectSourceRows -> src/lib/features/tasks/task-query.logic.ts:excludeTest call
call src/lib/features/tasks/task-query.logic.ts:641 in selectSourceRows -> src/lib/features/tasks/task-query.logic.ts:clauseTest ref
call src/lib/features/tasks/task-query.logic.ts:642 in selectSourceRows -> src/lib/features/tasks/task-query.logic.ts:liftsArchived call
call src/lib/features/tasks/task-query.logic.ts:694 in stringSet -> src/lib/features/tasks/task-query.logic.ts:byLowerCase ref
call src/lib/features/tasks/task-query.logic.ts:705 in sourceSuggestions -> src/lib/features/tasks/task-query.logic.ts:stringSet call +5
call src/lib/features/tasks/task-query.logic.ts:713 in sourceSuggestions -> src/lib/utils/tag-extraction.ts:findInlineTags call
call src/lib/features/tasks/task-query.logic.ts:774 in duePredicate -> src/lib/utils/date.ts:formatDateWithOffset call
call src/lib/features/tasks/task-query.logic.ts:795 in metaPredicate -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call +2
call src/lib/features/tasks/task-query.logic.ts:801 in metaPredicate -> src/lib/features/tasks/task-query.logic.ts:matchesNestedTag call
call src/lib/features/tasks/task-query.logic.ts:803 in metaPredicate -> src/lib/features/tasks/tasks.logic.ts:taskDisplayText call
call src/lib/features/tasks/task-query.logic.ts:818 in applyQuickFilters -> src/lib/features/tasks/task-query.logic.ts:duePredicate call
call src/lib/features/tasks/task-query.logic.ts:819 in applyQuickFilters -> src/lib/features/tasks/task-query.logic.ts:metaPredicate call
call src/lib/features/tasks/task-query.logic.ts:822 in applyQuickFilters -> src/lib/features/tasks/task-query.logic.ts:passesStatus call
call src/lib/features/tasks/task-query.logic.ts:937 in SORT_COMPARE.due -> src/lib/features/tasks/task-query.logic.ts:compareDue call
call src/lib/features/tasks/task-query.logic.ts:938 in SORT_COMPARE.priority -> src/lib/features/tasks/task-query.logic.ts:priorityOf call +1
call src/lib/features/tasks/task-query.logic.ts:939 in SORT_COMPARE.path -> src/lib/features/tasks/tasks.logic.ts:compareTaskPaths call
call src/lib/features/tasks/task-query.logic.ts:949 in compareRows -> src/lib/features/tasks/tasks.logic.ts:compareTaskPaths call
call src/lib/features/tasks/task-query.logic.ts:990 in headingGroups -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call +1
call src/lib/features/tasks/task-query.logic.ts:1020 in headingGroups -> src/lib/features/tasks/tasks.logic.ts:taskDisplayText call
call src/lib/features/tasks/task-query.logic.ts:1028 in labelOrder -> src/lib/features/tasks/tasks.logic.ts:compareTaskPaths call
call src/lib/features/tasks/task-query.logic.ts:1042 in propertyGroupKey -> src/lib/features/tasks/task-query.logic.ts:valueText call +1
call src/lib/features/tasks/task-query.logic.ts:1043 in propertyGroupKey -> src/lib/features/tasks/task-query.logic.ts:byLowerCase ref
call src/lib/features/tasks/task-query.logic.ts:1060 in flatGrouping -> src/lib/features/tasks/task-query.logic.ts:labelOrder ref +1
call src/lib/features/tasks/task-query.logic.ts:1060 in flatGrouping -> src/lib/features/tasks/task-query.logic.ts:propertyGroupKey call
call src/lib/features/tasks/task-query.logic.ts:1068 in flatGrouping -> src/lib/features/tasks/tasks.logic.ts:compareTaskPaths call
call src/lib/features/tasks/task-query.logic.ts:1072 in flatGrouping -> src/lib/utils/date.ts:formatDateWithOffset call +1
call src/lib/features/tasks/task-query.logic.ts:1084 in flatGrouping -> src/lib/features/tasks/task-query.logic.ts:fixedOrder call +2
call src/lib/features/tasks/task-query.logic.ts:1090 in flatGrouping -> src/lib/features/tasks/task-query.logic.ts:priorityOf ref
call src/lib/features/tasks/task-query.logic.ts:1099 in flatGrouping -> src/lib/features/tasks/task-status.logic.ts:statusGlyph call
call src/lib/features/tasks/task-query.logic.ts:1117 in groupTaskRows -> src/lib/features/tasks/task-query.logic.ts:noteGroups call
call src/lib/features/tasks/task-query.logic.ts:1118 in groupTaskRows -> src/lib/features/tasks/task-query.logic.ts:headingGroups call
call src/lib/features/tasks/task-query.logic.ts:1119 in groupTaskRows -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call +1
call src/lib/features/tasks/task-query.logic.ts:1124 in groupTaskRows -> src/lib/features/tasks/tasks.logic.ts:taskDisplayText call
call src/lib/features/tasks/task-query.logic.ts:1126 in groupTaskRows -> src/lib/features/tasks/task-query.logic.ts:compareRows call
call src/lib/features/tasks/task-query.logic.ts:1127 in groupTaskRows -> src/lib/features/tasks/task-query.logic.ts:flatGrouping call
call src/lib/features/tasks/task-query.logic.ts:1143 in statusWords -> src/lib/features/tasks/task-status.logic.ts:statusGlyph call
call src/lib/features/tasks/task-query.logic.ts:1151 in statusFilterLabel -> src/lib/features/tasks/task-query.logic.ts:statusWords call
call src/lib/features/tasks/task-query.logic.ts:1167 in taskCountText -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call
call src/lib/features/tasks/task-query.logic.ts:1173 in describeStatus -> src/lib/features/tasks/task-query.logic.ts:statusWords call
call src/lib/features/tasks/task-query.logic.ts:1197 in clauseWords -> src/lib/features/tasks/task-query.logic.ts:folderValue call
call src/lib/features/tasks/task-query.logic.ts:1205 in clauseWords -> src/lib/features/tasks/task-query.logic.ts:tagValue call
call src/lib/features/tasks/task-query.logic.ts:1205 in clauseWords -> src/lib/features/tasks/task-query.logic.ts:tagWord call
call src/lib/features/tasks/task-query.logic.ts:1207 in clauseWords -> src/lib/features/tasks/task-query.logic.ts:headingValue call
call src/lib/features/tasks/task-query.logic.ts:1237 in activeCards -> src/lib/features/tasks/task-query.logic.ts:clauseWords call
call src/lib/features/tasks/task-query.logic.ts:1250 in textboxTags -> src/lib/features/tasks/task-query.logic.ts:activeCards call
call src/lib/features/tasks/task-query.logic.ts:1256 in textboxTags -> src/lib/features/tasks/task-query.logic.ts:headingValue call
call src/lib/features/tasks/task-query.logic.ts:1263 in describeSources -> src/lib/features/tasks/task-query.logic.ts:activeCards call
call src/lib/features/tasks/task-query.logic.ts:1266 in describeSources -> src/lib/features/tasks/task-query.logic.ts:textboxTags call
call src/lib/features/tasks/task-query.logic.ts:1278 in describeExcludes -> src/lib/features/tasks/task-query.logic.ts:liftsArchived ref
call src/lib/features/tasks/task-query.logic.ts:1283 in describeExcludes -> src/lib/features/tasks/task-query.logic.ts:folderValue ref
call src/lib/features/tasks/task-query.logic.ts:1285 in describeExcludes -> src/lib/features/tasks/task-query.logic.ts:tagValue call
call src/lib/features/tasks/task-query.logic.ts:1285 in describeExcludes -> src/lib/features/tasks/task-query.logic.ts:tagWord call
call src/lib/features/tasks/task-query.logic.ts:1299 in describeTaskQuery -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call +2
call src/lib/features/tasks/task-query.logic.ts:1301 in describeTaskQuery -> src/lib/features/tasks/task-query.logic.ts:priorityWord ref
call src/lib/features/tasks/task-query.logic.ts:1304 in describeTaskQuery -> src/lib/features/tasks/task-query.logic.ts:describeExcludes call
call src/lib/features/tasks/task-query.logic.ts:1304 in describeTaskQuery -> src/lib/features/tasks/task-query.logic.ts:describeSources call
call src/lib/features/tasks/task-query.logic.ts:1304 in describeTaskQuery -> src/lib/features/tasks/task-query.logic.ts:describeStatus call
call src/lib/features/tasks/task-query.logic.ts:1314 in normalQuick -> src/lib/features/tasks/task-query.logic.ts:asSet call +2
call src/lib/features/tasks/task-query.logic.ts:1352 in queryKey -> src/lib/features/tasks/task-query.logic.ts:normalClause ref
call src/lib/features/tasks/task-query.logic.ts:1354 in queryKey -> src/lib/features/tasks/task-query.logic.ts:asSet call +3
call src/lib/features/tasks/task-query.logic.ts:1355 in queryKey -> src/lib/features/tasks/task-query.logic.ts:normalQuick call
call src/lib/features/tasks/task-query.logic.ts:1368 in isQuickModified -> src/lib/features/tasks/task-query.logic.ts:normalQuick call +1
call src/lib/features/tasks/task-query.logic.ts:1379 in isQueryModified -> src/lib/features/tasks/task-query.logic.ts:queryKey call +1
call src/lib/features/tasks/task-query.logic.ts:1425 in explainEmptyDue -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call
call src/lib/features/tasks/task-query.logic.ts:1461 in explainEmptyTasks -> src/lib/features/tasks/task-query.logic.ts:selectSourceRows call +1
call src/lib/features/tasks/task-query.logic.ts:1463 in explainEmptyTasks -> src/lib/features/tasks/task-query.logic.ts:textboxTags call
call src/lib/features/tasks/task-query.logic.ts:1478 in explainEmptyTasks -> src/lib/features/tasks/task-query.logic.ts:applyQuickFilters call +2
call src/lib/features/tasks/task-query.logic.ts:1481 in explainEmptyTasks -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call +2
call src/lib/features/tasks/task-query.logic.ts:1492 in explainEmptyTasks -> src/lib/features/tasks/task-query.logic.ts:explainEmptyDue call
