# module card src/lib/types
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/types ' codemap/modules
module src/lib/types types files 1 in-modules 17 out-modules 1 pub 8/17 ipc 0/0 card ~1k
## neighbors
dep src/lib/core/filesystem -> src/lib/types 1
dep src/lib/core/markdown-editor -> src/lib/types 2
dep src/lib/core/vault -> src/lib/types 2
dep src/lib/features/backlinks -> src/lib/types 2
dep src/lib/features/collection -> src/lib/types 1
dep src/lib/features/dock-badge -> src/lib/types 1
dep src/lib/features/event-calendar -> src/lib/types 3
dep src/lib/features/file-icons -> src/lib/types 1
dep src/lib/features/note-list -> src/lib/types 1
dep src/lib/features/outgoing-links -> src/lib/types 1
dep src/lib/features/properties -> src/lib/types 4
dep src/lib/features/rail-shell -> src/lib/types 2
dep src/lib/features/tasks -> src/lib/types 2
dep src/lib/features/type-definitions -> src/lib/types 5
dep src/lib/plugins/graph-view -> src/lib/types 1
dep src/lib/plugins/one-on-one -> src/lib/types 1
dep src/lib/plugins/queryjs -> src/lib/types 2
dep src/lib/types -> src/lib/contracts 1
in2 src/lib/types 7 modules: src/lib/app(35) src/lib/plugins/calendar(6) src/lib/plugins/mods(6) src/lib/features/auto-organize(3) src/lib/features/note-action-bar(1) +2 modules
out2 src/lib/types 0 modules: -
## entry files
entry src/lib/types/vault-v2.types.ts ext-in32 src/lib/core/filesystem/folder-notes.logic.ts src/lib/core/markdown-editor/editor-host.ts src/lib/core/markdown-editor/extensions/wikilink/completion.ts src/lib/core/vault/vault-entries.logic.ts src/lib/core/vault/vault-entries.service.ts more importers 27 not shown: src/lib/features/type-definitions(5) src/lib/features/properties(4) src/lib/features/event-calendar(3) +11 modules: q importers src/lib/types/vault-v2.types.ts
## files
file src/lib/types/vault-v2.types.ts types L36 module src/lib/types in32 t0 | Vault IPC types under the `*V2` names the app imports.
## public
sym src/lib/types/vault-v2.types.ts:19 reexport FrontmatterValue = src/lib/contracts/generated/serde_json/JsonValue.ts:JsonValue L1
sym src/lib/types/vault-v2.types.ts:21 reexport NoteEntryV2 = dto:NoteEntry L1
sym src/lib/types/vault-v2.types.ts:22 reexport RelationshipBacklinkV2 = dto:RelationshipBacklink L1
sym src/lib/types/vault-v2.types.ts:23 reexport OutgoingLinkV2 = dto:OutgoingLink L1
sym src/lib/types/vault-v2.types.ts:26 reexport TaskStatusV2 = dto:TaskStatus L1
sym src/lib/types/vault-v2.types.ts:31 reexport TaskHeadingV2 = dto:TaskHeading L1
sym src/lib/types/vault-v2.types.ts:33 reexport FileTaskGroupV2 = dto:FileTaskGroup L1
sym src/lib/types/vault-v2.types.ts:35 reexport NoteRecordV2 = dto:NoteRecord L1
## debt
-
