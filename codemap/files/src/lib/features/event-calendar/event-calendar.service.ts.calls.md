# calls of src/lib/features/event-calendar/event-calendar.service.ts
cols: call <loc> in <fn> -> <target> <kind> [+<n>] · grep: grep -F -- ' in <fn> -> ' codemap/files/src/lib/features/event-calendar/event-calendar.service.ts.calls.md
sections: calls
## calls
call src/lib/features/event-calendar/event-calendar.service.ts:79 in loadEvents -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setLoading mcall +4
call src/lib/features/event-calendar/event-calendar.service.ts:81 in loadEvents -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/features/event-calendar/event-calendar.service.ts:87 in loadEvents -> src/lib/features/event-calendar/event-calendar.service.ts:projectionOptions call
call src/lib/features/event-calendar/event-calendar.service.ts:88 in loadEvents -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventsFromEntries call
call src/lib/features/event-calendar/event-calendar.service.ts:89 in loadEvents -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setSnapshot mcall
call src/lib/features/event-calendar/event-calendar.service.ts:91 in loadEvents -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setLoadError mcall +1
call src/lib/features/event-calendar/event-calendar.service.ts:94 in loadEvents -> src/lib/utils/debug.ts:error call
call src/lib/features/event-calendar/event-calendar.service.ts:119 in loadCalendarTasks -> src/lib/contracts/ipc.ts:call call
call src/lib/features/event-calendar/event-calendar.service.ts:121 in loadCalendarTasks -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts:tasksFromGroups call
call src/lib/features/event-calendar/event-calendar.service.ts:121 in loadCalendarTasks -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setTasks mcall
call src/lib/features/event-calendar/event-calendar.service.ts:123 in loadCalendarTasks -> src/lib/utils/debug.ts:error call
call src/lib/features/event-calendar/event-calendar.service.ts:136 in openEventCalendarTab -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate mcall
call src/lib/features/event-calendar/event-calendar.service.ts:138 in openEventCalendarTab -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.initFromSettings mcall
call src/lib/features/event-calendar/event-calendar.service.ts:139 in openEventCalendarTab -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView mcall
call src/lib/features/event-calendar/event-calendar.service.ts:141 in openEventCalendarTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/event-calendar/event-calendar.service.ts:143 in openEventCalendarTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/features/event-calendar/event-calendar.service.ts:146 in openEventCalendarTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab mcall
call src/lib/features/event-calendar/event-calendar.service.ts:157 in closeEventCalendarTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/event-calendar/event-calendar.service.ts:159 in closeEventCalendarTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/features/event-calendar/event-calendar.service.ts:165 in toggleEventCalendarTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/event-calendar/event-calendar.service.ts:167 in toggleEventCalendarTab -> src/lib/features/event-calendar/event-calendar.service.ts:openEventCalendarTab call
call src/lib/features/event-calendar/event-calendar.service.ts:169 in toggleEventCalendarTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/features/event-calendar/event-calendar.service.ts:171 in toggleEventCalendarTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/features/event-calendar/event-calendar.service.ts:212 in lookupCalendarEvent -> src/lib/features/event-calendar/event-calendar.service.ts:projectionOptions call
call src/lib/features/event-calendar/event-calendar.service.ts:215 in lookupCalendarEvent -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall +1
call src/lib/features/event-calendar/event-calendar.service.ts:216 in lookupCalendarEvent -> src/lib/features/event-calendar/event-calendar.service.ts:withoutPending call +1
call src/lib/features/event-calendar/event-calendar.service.ts:221 in lookupCalendarEvent -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/features/event-calendar/event-calendar.service.ts:223 in lookupCalendarEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventsFromEntries call
call src/lib/features/event-calendar/event-calendar.service.ts:228 in lookupCalendarEvent -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.pendingWrite mcall
call src/lib/features/event-calendar/event-calendar.service.ts:229 in lookupCalendarEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:prunePending call
call src/lib/features/event-calendar/event-calendar.service.ts:252 in findCalendarEvent -> src/lib/features/event-calendar/event-calendar.service.ts:lookupCalendarEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:267 in openEventInCalendar -> src/lib/features/event-calendar/event-calendar.service.ts:lookupCalendarEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:269 in openEventInCalendar -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.initFromSettings mcall
call src/lib/features/event-calendar/event-calendar.service.ts:271 in openEventInCalendar -> src/lib/features/event-calendar/event-calendar-view.logic.ts:focusViewFor call
call src/lib/features/event-calendar/event-calendar.service.ts:272 in openEventInCalendar -> src/lib/features/event-calendar/event-calendar.service.ts:openEventCalendarTab call
call src/lib/features/event-calendar/event-calendar.service.ts:273 in openEventInCalendar -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.requestFocus mcall
call src/lib/features/event-calendar/event-calendar.service.ts:284 in openNewEventDialog -> src/lib/features/event-calendar/event-calendar.service.ts:openEventCalendarTab call
call src/lib/features/event-calendar/event-calendar.service.ts:285 in openNewEventDialog -> src/lib/features/event-calendar/event-calendar.service.ts:tick call
call src/lib/features/event-calendar/event-calendar.service.ts:287 in openNewEventDialog -> src/lib/features/event-calendar/event-calendar-view.logic.ts:defaultCreateSlot call
call src/lib/features/event-calendar/event-calendar.service.ts:294 in openNewEventDialog -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openDialog mcall
call src/lib/features/event-calendar/event-calendar.service.ts:299 in tick -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setNow mcall
call src/lib/features/event-calendar/event-calendar.service.ts:312 in acquireCalendarClock -> src/lib/features/event-calendar/event-calendar.service.ts:tick call +5
call src/lib/features/event-calendar/event-calendar.service.ts:347 in resetEventCalendar -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.reset mcall
call src/lib/features/event-calendar/event-calendar.service.ts:348 in resetEventCalendar -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.reset mcall
call src/lib/features/event-calendar/event-calendar.service.ts:464 in joinPath -> src/lib/features/event-calendar/event-calendar.service.ts:holdPath call
call src/lib/features/event-calendar/event-calendar.service.ts:479 in claimPath -> src/lib/features/event-calendar/event-calendar.service.ts:holdPath call
call src/lib/features/event-calendar/event-calendar.service.ts:507 in enqueue -> src/lib/features/event-calendar/event-calendar.service.ts:generationCheck call
call src/lib/features/event-calendar/event-calendar.service.ts:508 in enqueue -> src/lib/features/event-calendar/event-calendar.service.ts:claimPath call +1
call src/lib/features/event-calendar/event-calendar.service.ts:509 in enqueue -> src/lib/features/event-calendar/event-calendar.service.ts:takeTurn call
call src/lib/features/event-calendar/event-calendar.service.ts:531 in fileBase -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/event-calendar/event-calendar.service.ts:537 in requireEvent -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:538 in requireEvent -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/features/event-calendar/event-calendar.service.ts:632 in followPathChange -> src/lib/features/event-calendar/event-calendar.service.ts:takeOwnPathChange call
call src/lib/features/event-calendar/event-calendar.service.ts:642 in followPathChange -> src/lib/features/event-calendar/event-calendar-history.logic.ts:dropPath call
call src/lib/features/event-calendar/event-calendar.service.ts:642 in followPathChange -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setHistory mcall
call src/lib/features/event-calendar/event-calendar.service.ts:643 in followPathChange -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:643 in followPathChange -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.putPending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:647 in followPathChange -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call +1
call src/lib/features/event-calendar/event-calendar.service.ts:647 in followPathChange -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.remapPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:648 in followPathChange -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.remapPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:658 in registerEventCalendarPathChangeConsumer -> src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer call
call src/lib/features/event-calendar/event-calendar.service.ts:658 in registerEventCalendarPathChangeConsumer -> src/lib/features/event-calendar/event-calendar.service.ts:followPathChange ref
call src/lib/features/event-calendar/event-calendar.service.ts:663 in record -> src/lib/features/event-calendar/event-calendar-history.logic.ts:pushOp call
call src/lib/features/event-calendar/event-calendar.service.ts:663 in record -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setHistory mcall
call src/lib/features/event-calendar/event-calendar.service.ts:688 in writeEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/event-calendar.service.ts:689 in writeEvent -> src/lib/features/event-calendar/event-calendar.service.ts:EventCalendarError new
call src/lib/features/event-calendar/event-calendar.service.ts:693 in writeEvent -> src/lib/core/filesystem/fs.logic.ts:getParentPath call
call src/lib/features/event-calendar/event-calendar.service.ts:694 in writeEvent -> src/lib/features/event-calendar/event-calendar-form.logic.ts:planTitleChange call
call src/lib/features/event-calendar/event-calendar.service.ts:694 in writeEvent -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:698 in writeEvent -> src/lib/features/event-calendar/event-calendar.service.ts:renameAndWrite call +1
call src/lib/features/event-calendar/event-calendar.service.ts:706 in writeEvent -> src/lib/core/filesystem/fs.logic.ts:renamedPath call
call src/lib/features/event-calendar/event-calendar.service.ts:707 in writeEvent -> src/lib/features/event-calendar/event-calendar.service.ts:joinPath call
call src/lib/features/event-calendar/event-calendar.service.ts:709 in writeEvent -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/features/event-calendar/event-calendar.service.ts:734 in renameAndWrite -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/event-calendar/event-calendar.service.ts:734 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.service.ts:asOwnPathChange call
call src/lib/features/event-calendar/event-calendar.service.ts:739 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.remapPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:740 in renameAndWrite -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.remapPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:753 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.pendingWrite mcall +1
call src/lib/features/event-calendar/event-calendar.service.ts:758 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.putPending mcall +2
call src/lib/features/event-calendar/event-calendar.service.ts:759 in renameAndWrite -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/event-calendar/event-calendar.service.ts:759 in renameAndWrite -> src/lib/features/event-calendar/event-calendar-event.logic.ts:applyEventFields call
call src/lib/features/event-calendar/event-calendar.service.ts:767 in renameAndWrite -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/features/event-calendar/event-calendar.service.ts:769 in renameAndWrite -> src/lib/utils/debug.ts:error call
call src/lib/features/event-calendar/event-calendar.service.ts:776 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.dropPending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:782 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call +1
call src/lib/features/event-calendar/event-calendar.service.ts:790 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.service.ts:record call +1
call src/lib/features/event-calendar/event-calendar.service.ts:799 in renameAndWrite -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.settlePending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:816 in updateEventFields -> src/lib/features/event-calendar/event-calendar.service.ts:enqueue call
call src/lib/features/event-calendar/event-calendar.service.ts:817 in updateEventFields -> src/lib/features/event-calendar/event-calendar.service.ts:requireEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:818 in updateEventFields -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/event-calendar.service.ts:819 in updateEventFields -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:820 in updateEventFields -> src/lib/features/event-calendar/event-calendar.service.ts:patchedState call
call src/lib/features/event-calendar/event-calendar.service.ts:821 in updateEventFields -> src/lib/features/event-calendar/event-calendar.service.ts:writeEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:831 in moveEvent -> src/lib/features/event-calendar/event-calendar.service.ts:updateEventFields call
call src/lib/features/event-calendar/event-calendar.service.ts:843 in moveEventToDay -> src/lib/features/event-calendar/event-calendar.service.ts:updateEventFields call
call src/lib/features/event-calendar/event-calendar.service.ts:852 in resizeEvent -> src/lib/features/event-calendar/event-calendar.service.ts:updateEventFields call
call src/lib/features/event-calendar/event-calendar.service.ts:869 in editEvent -> src/lib/features/event-calendar/event-calendar.service.ts:enqueue call
call src/lib/features/event-calendar/event-calendar.service.ts:870 in editEvent -> src/lib/features/event-calendar/event-calendar.service.ts:requireEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:871 in editEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/event-calendar.service.ts:873 in editEvent -> src/lib/features/event-calendar/event-calendar.service.ts:patchedState call
call src/lib/features/event-calendar/event-calendar.service.ts:874 in editEvent -> src/lib/features/event-calendar/event-calendar.service.ts:writeEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:904 in showCreated -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.putPending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:905 in showCreated -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/event-calendar.service.ts:905 in showCreated -> src/lib/features/event-calendar/event-calendar.service.ts:record call
call src/lib/features/event-calendar/event-calendar.service.ts:922 in createEvent -> src/lib/features/event-calendar/event-calendar.service.ts:createNow call
call src/lib/features/event-calendar/event-calendar.service.ts:922 in createEvent -> src/lib/features/event-calendar/event-calendar.service.ts:enqueue call
call src/lib/features/event-calendar/event-calendar.service.ts:933 in createNow -> src/lib/features/event-calendar/event-calendar-event.logic.ts:resolveEventTypeName call
call src/lib/features/event-calendar/event-calendar.service.ts:938 in createNow -> src/lib/features/type-definitions/type-definitions.service.ts:createTypedNote call
call src/lib/features/event-calendar/event-calendar.service.ts:940 in createNow -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventFileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:943 in createNow -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/features/event-calendar/event-calendar.service.ts:943 in createNow -> src/lib/features/event-calendar/event-calendar.service.ts:EventCalendarError new +1
call src/lib/features/event-calendar/event-calendar.service.ts:945 in createNow -> src/lib/features/event-calendar/event-calendar.service.ts:holdPath call
call src/lib/features/event-calendar/event-calendar.service.ts:946 in createNow -> src/lib/features/event-calendar/event-calendar-event.logic.ts:applyEventDraft call
call src/lib/features/event-calendar/event-calendar.service.ts:951 in createNow -> src/lib/utils/debug.ts:error call
call src/lib/features/event-calendar/event-calendar.service.ts:959 in createNow -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:960 in createNow -> src/lib/features/event-calendar/event-calendar.service.ts:showCreated call
call src/lib/features/event-calendar/event-calendar.service.ts:996 in duplicateEvent -> src/lib/features/event-calendar/event-calendar.service.ts:enqueue call
call src/lib/features/event-calendar/event-calendar.service.ts:997 in duplicateEvent -> src/lib/features/event-calendar/event-calendar.service.ts:requireEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:1001 in duplicateEvent -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/event-calendar/event-calendar.service.ts:1003 in duplicateEvent -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/features/event-calendar/event-calendar.service.ts:1004 in duplicateEvent -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/features/event-calendar/event-calendar.service.ts:1004 in duplicateEvent -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call
call src/lib/features/event-calendar/event-calendar.service.ts:1004 in duplicateEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:applyEventFields call
call src/lib/features/event-calendar/event-calendar.service.ts:1005 in duplicateEvent -> src/lib/core/filesystem/fs.logic.ts:getParentPath call
call src/lib/features/event-calendar/event-calendar.service.ts:1006 in duplicateEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventFileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:1009 in duplicateEvent -> src/lib/core/filesystem/fs.logic.ts:generateUniqueName call
call src/lib/features/event-calendar/event-calendar.service.ts:1010 in duplicateEvent -> src/lib/features/event-calendar/event-calendar.service.ts:joinPath call
call src/lib/features/event-calendar/event-calendar.service.ts:1014 in duplicateEvent -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/event-calendar/event-calendar.service.ts:1016 in duplicateEvent -> src/lib/features/event-calendar/event-calendar.service.ts:EventCalendarError new
call src/lib/features/event-calendar/event-calendar.service.ts:1020 in duplicateEvent -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:1024 in duplicateEvent -> src/lib/features/event-calendar/event-calendar.service.ts:showCreated call
call src/lib/features/event-calendar/event-calendar.service.ts:1044 in deleteNow -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/features/event-calendar/event-calendar.service.ts:1044 in deleteNow -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/features/event-calendar/event-calendar.service.ts:1047 in deleteNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.pendingWrite mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1048 in deleteNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.putPending mcall +1
call src/lib/features/event-calendar/event-calendar.service.ts:1050 in deleteNow -> src/lib/core/filesystem/fs.service.ts:deleteItem call
call src/lib/features/event-calendar/event-calendar.service.ts:1050 in deleteNow -> src/lib/features/event-calendar/event-calendar.service.ts:asOwnPathChange call
call src/lib/features/event-calendar/event-calendar.service.ts:1054 in deleteNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.dropPending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1058 in deleteNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.settlePending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1061 in deleteNow -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/event-calendar/event-calendar.service.ts:1073 in deleteEvent -> src/lib/features/event-calendar/event-calendar.service.ts:enqueue call
call src/lib/features/event-calendar/event-calendar.service.ts:1074 in deleteEvent -> src/lib/features/event-calendar/event-calendar.service.ts:requireEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:1075 in deleteEvent -> src/lib/features/event-calendar/event-calendar.service.ts:deleteNow call
call src/lib/features/event-calendar/event-calendar.service.ts:1076 in deleteEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/event-calendar.service.ts:1076 in deleteEvent -> src/lib/features/event-calendar/event-calendar.service.ts:record call
call src/lib/features/event-calendar/event-calendar.service.ts:1088 in findTrashEntry -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/event-calendar/event-calendar.service.ts:1138 in followFilename -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call +1
call src/lib/features/event-calendar/event-calendar.service.ts:1169 in restoreNow -> src/lib/features/event-calendar/event-calendar.service.ts:findTrashEntry call
call src/lib/features/event-calendar/event-calendar.service.ts:1171 in restoreNow -> src/lib/features/event-calendar/event-calendar.service.ts:EventCalendarError new +1
call src/lib/features/event-calendar/event-calendar.service.ts:1178 in restoreNow -> src/lib/core/trash/trash.service.ts:restoreItem call
call src/lib/features/event-calendar/event-calendar.service.ts:1192 in restoreNow -> src/lib/features/event-calendar/event-calendar.service.ts:opsUpTo call
call src/lib/features/event-calendar/event-calendar.service.ts:1193 in restoreNow -> src/lib/features/event-calendar/event-calendar-history.logic.ts:refuseOp call
call src/lib/features/event-calendar/event-calendar.service.ts:1193 in restoreNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setHistory mcall +1
call src/lib/features/event-calendar/event-calendar.service.ts:1199 in restoreNow -> src/lib/features/event-calendar/event-calendar.service.ts:followFilename call +1
call src/lib/features/event-calendar/event-calendar.service.ts:1207 in restoreNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1207 in restoreNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.isPending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1208 in restoreNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.dropPending mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1211 in restoreNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.putPending mcall +1
call src/lib/features/event-calendar/event-calendar.service.ts:1238 in restoreDeletedEvent -> src/lib/features/event-calendar/event-calendar.service.ts:enqueue call
call src/lib/features/event-calendar/event-calendar.service.ts:1240 in restoreDeletedEvent -> src/lib/features/event-calendar/event-calendar.service.ts:findDeleteOp call
call src/lib/features/event-calendar/event-calendar.service.ts:1241 in restoreDeletedEvent -> src/lib/features/event-calendar/event-calendar.service.ts:restoreNow call
call src/lib/features/event-calendar/event-calendar.service.ts:1253 in undoDeleteEvent -> src/lib/features/event-calendar/event-calendar.service.ts:enqueue call
call src/lib/features/event-calendar/event-calendar.service.ts:1254 in undoDeleteEvent -> src/lib/features/event-calendar/event-calendar.service.ts:findDeleteOp call
call src/lib/features/event-calendar/event-calendar.service.ts:1255 in undoDeleteEvent -> src/lib/features/event-calendar/event-calendar.service.ts:restoreNow call
call src/lib/features/event-calendar/event-calendar.service.ts:1266 in applyNoteOp -> src/lib/features/event-calendar/event-calendar.service.ts:claimPath call
call src/lib/features/event-calendar/event-calendar.service.ts:1268 in applyNoteOp -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1270 in applyNoteOp -> src/lib/features/event-calendar/event-calendar-history.logic.ts:dropPath call
call src/lib/features/event-calendar/event-calendar.service.ts:1270 in applyNoteOp -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setHistory mcall +3
call src/lib/features/event-calendar/event-calendar.service.ts:1273 in applyNoteOp -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/event-calendar.service.ts:1273 in applyNoteOp -> src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState call
call src/lib/features/event-calendar/event-calendar.service.ts:1274 in applyNoteOp -> src/lib/features/event-calendar/event-calendar-history.logic.ts:refuseOp call +2
call src/lib/features/event-calendar/event-calendar.service.ts:1278 in applyNoteOp -> src/lib/features/event-calendar/event-calendar.service.ts:deleteNow call
call src/lib/features/event-calendar/event-calendar.service.ts:1286 in applyNoteOp -> src/lib/features/event-calendar/event-calendar.service.ts:restoreNow call
call src/lib/features/event-calendar/event-calendar.service.ts:1294 in applyNoteOp -> src/lib/features/event-calendar/event-calendar.service.ts:generationCheck call
call src/lib/features/event-calendar/event-calendar.service.ts:1308 in applyHistory -> src/lib/features/event-calendar/event-calendar.service.ts:generationCheck call
call src/lib/features/event-calendar/event-calendar.service.ts:1313 in applyHistory -> src/lib/features/event-calendar/event-calendar.service.ts:takeTurn call
call src/lib/features/event-calendar/event-calendar.service.ts:1314 in applyHistory -> src/lib/features/event-calendar/event-calendar.service.ts:applyHistoryNow call
call src/lib/features/event-calendar/event-calendar.service.ts:1326 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar-history.logic.ts:takeRedo call
call src/lib/features/event-calendar/event-calendar.service.ts:1326 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar-history.logic.ts:takeUndo call
call src/lib/features/event-calendar/event-calendar.service.ts:1329 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setHistory mcall +3
call src/lib/features/event-calendar/event-calendar.service.ts:1330 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.service.ts:applyNoteOp call
call src/lib/features/event-calendar/event-calendar.service.ts:1333 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.service.ts:claimPath call
call src/lib/features/event-calendar/event-calendar.service.ts:1334 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1336 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar-history.logic.ts:dropPath call
call src/lib/features/event-calendar/event-calendar.service.ts:1339 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.service.ts:requireEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:1340 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call +1
call src/lib/features/event-calendar/event-calendar.service.ts:1340 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState call
call src/lib/features/event-calendar/event-calendar.service.ts:1341 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar-history.logic.ts:refuseOp call
call src/lib/features/event-calendar/event-calendar.service.ts:1345 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.service.ts:patchBetween call
call src/lib/features/event-calendar/event-calendar.service.ts:1345 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.service.ts:writeEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:1351 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar-history.logic.ts:removeOp call
call src/lib/features/event-calendar/event-calendar.service.ts:1357 in applyHistoryNow -> src/lib/features/event-calendar/event-calendar.service.ts:generationCheck call
call src/lib/features/event-calendar/event-calendar.service.ts:1367 in undoEventChange -> src/lib/features/event-calendar/event-calendar.service.ts:applyHistory call
call src/lib/features/event-calendar/event-calendar.service.ts:1376 in redoEventChange -> src/lib/features/event-calendar/event-calendar.service.ts:applyHistory call
call src/lib/features/event-calendar/event-calendar.service.ts:1419 in toastEventError -> src/lib/features/event-calendar/event-calendar.service.ts:eventErrorMessage call +1
call src/lib/features/event-calendar/event-calendar.service.ts:1420 in toastEventError -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/event-calendar/event-calendar.service.ts:1457 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:generationCheck call
call src/lib/features/event-calendar/event-calendar.service.ts:1458 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:1458 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1460 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:deleteEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:1462 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:toastEventError call +1
call src/lib/features/event-calendar/event-calendar.service.ts:1475 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:EventCalendarError new
call src/lib/features/event-calendar/event-calendar.service.ts:1475 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:undoDeleteEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:1477 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:focusRoot call
call src/lib/features/event-calendar/event-calendar.service.ts:1477 in deleteEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:liveRoot call
call src/lib/features/event-calendar/event-calendar.service.ts:1495 in duplicateEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:duplicateEvent call
call src/lib/features/event-calendar/event-calendar.service.ts:1497 in duplicateEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:toastEventError call
call src/lib/features/event-calendar/event-calendar.service.ts:1498 in duplicateEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:focusRoot call
call src/lib/features/event-calendar/event-calendar.service.ts:1501 in duplicateEventFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:fileBase call
call src/lib/features/event-calendar/event-calendar.service.ts:1501 in duplicateEventFromUi -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/event-calendar.service.ts:1538 in undoEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:applyEventChangeFromUi call
call src/lib/features/event-calendar/event-calendar.service.ts:1547 in redoEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:applyEventChangeFromUi call
call src/lib/features/event-calendar/event-calendar.service.ts:1554 in applyEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:redoEventChange call
call src/lib/features/event-calendar/event-calendar.service.ts:1554 in applyEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:undoEventChange call
call src/lib/features/event-calendar/event-calendar.service.ts:1556 in applyEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:toastEventError call
call src/lib/features/event-calendar/event-calendar.service.ts:1566 in applyEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:applyEventChangeFromUi call
call src/lib/features/event-calendar/event-calendar.service.ts:1566 in applyEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:focusRoot call
call src/lib/features/event-calendar/event-calendar.service.ts:1566 in applyEventChangeFromUi -> src/lib/features/event-calendar/event-calendar.service.ts:liveRoot call
call src/lib/features/event-calendar/event-calendar.service.ts:1583 in applyEventChangeFromUi -> src/lib/core/editor/editor.service.ts:openFileInEditor call
