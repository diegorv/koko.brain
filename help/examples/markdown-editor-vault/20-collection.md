# Test: Collection (Data Query Blocks)

%%
COMO TESTAR:
- Every block reads only notes in this folder (filter `file.folder.contains("/markdown-editor-vault")`), so it lists the same notes whether this folder is its own vault or nested in a large one
- The rows come from the fake data notes in `data/` (bug-*, task-*, project-*, meeting-*, daily-*) plus the test notes of this folder with frontmatter (18-frontmatter: active, 19-meta-bind: todo, 21-combined-stress: active)
- The counts below assume this folder holds only its own files: 39 notes (24 test notes + 15 in `data/`)
- Renaming this folder breaks the filter (a collection filter cannot refer to the note's own folder)
- Verifique que blocos collection sao renderizados como tabelas interativas
- Verifique loading state e error state
- Teste click em linhas para abrir notas
- Cursor dentro do bloco: mostra YAML raw
- Cursor fora do bloco: mostra tabela renderizada
%%

## 1. Query Basica (Todas as Notas)

```collection
filters: 'file.folder.contains("/markdown-editor-vault")'
views:
  - type: table
    name: All Notes
    order:
      - file.name
      - status
      - priority
      - tags
```

%%
ESPERADO:
- Cursor fora: tabela interativa com as 39 notas desta pasta (24 notas de teste + 15 em data/)
- Header mostra "All Notes (39)"
- Sem rodape "Showing 50 of N" (o limite padrao e 50 linhas)
- Status/priority/tags preenchidos nas notas de data/ e em 18-frontmatter, 19-meta-bind (so status), 21-combined-stress
- Colunas: file.name, status, priority, tags
- Valores null: dimmed (cor mais clara) com dash
- Hover: destaque na linha sob o mouse
- Click: abre a nota correspondente
%%

## 2. Filtro Simples (status == active)

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - "status == 'active'"
views:
  - type: table
    name: Active Items
    order:
      - file.name
      - priority
      - assignee
      - progress
```

%%
ESPERADO:
- "Active Items (4)": bug-login-timeout, project-kokobrain, 18-frontmatter, 21-combined-stress
- Notas com status planning (project-garden), completed (bug-css-overflow), backlog (task-refactor-store) e todo (19-meta-bind) NAO aparecem
%%

## 3. Filtro com Tag

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - "file.hasTag('bug')"
views:
  - type: table
    name: Bugs
    order:
      - file.name
      - priority
      - assignee
      - status
```

%%
ESPERADO:
- "Bugs (2)": apenas notas que tem a tag "bug" no frontmatter
- Deve mostrar bug-login-timeout (active, high, Diego) e bug-css-overflow (completed, medium, Ana)
%%

## 4. Filtro AND Composto

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - "status == 'active'"
    - "priority == 'high'"
views:
  - type: table
    name: High Priority Active
    order:
      - file.name
      - assignee
      - progress
      - due
```

%%
ESPERADO:
- Apenas notas que sao AMBOS active E high priority
- "High Priority Active (1)": bug-login-timeout (Diego, 40, 2026-02-20)
- project-kokobrain e active mas priority 1, 18-frontmatter e active mas priority 3
%%

## 5. Filtro OR

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
  or:
    - "file.hasTag('bug')"
    - "file.hasTag('meeting')"
views:
  - type: table
    name: Bugs & Meetings
    order:
      - file.name
      - status
      - tags
```

%%
ESPERADO:
- Notas que tem tag "bug" OU tag "meeting"
- "Bugs & Meetings (5)": bug-login-timeout, bug-css-overflow, meeting-planning-feb10, meeting-standup-feb13, meeting-retro-feb13
%%

## 6. Filtro NOT

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
  not:
    - "file.hasTag('pessoal')"
views:
  - type: table
    name: Work Only
    order:
      - file.name
      - status
      - priority
```

%%
ESPERADO:
- Todas as notas EXCETO as com tag "pessoal"
- "Work Only (38)": so project-garden (tag pessoal) sai
%%

## 7. Filtro com Expressao Numerica

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - "progress > 50"
views:
  - type: table
    name: More Than Half Done
    order:
      - file.name
      - progress
      - status
```

%%
ESPERADO:
- Apenas notas com progress > 50
- "More Than Half Done (2)": bug-css-overflow (100) e project-kokobrain (60)
%%

## 8. Sort Simples (A-Z)

```collection
filters: 'file.folder.contains("/markdown-editor-vault")'
views:
  - type: table
    name: Alphabetical
    order:
      - file.name
      - status
    sort:
      - column: file.name
        direction: ASC
```

%%
ESPERADO:
- As 39 notas ordenadas alfabeticamente por nome de arquivo: 01-inline-formatting ... 24-queryjs-advanced, depois bug-css-overflow, bug-login-timeout, daily-2026-02-09 ... task-refactor-store
%%

## 9. Sort Multiplo

```collection
filters: 'file.folder.contains("/markdown-editor-vault")'
views:
  - type: table
    name: Status + Priority
    order:
      - file.name
      - status
      - priority
    sort:
      - column: status
        direction: ASC
      - column: priority
        direction: DESC
```

%%
ESPERADO:
- Primeiro ordena por status (ASC), depois por priority (DESC) dentro do mesmo status
- Ordem dos status: active (4), backlog, completed, planning, todo; notas sem status (meetings, dailies, testes) ficam no fim
%%

## 10. Limit

```collection
filters: 'file.folder.contains("/markdown-editor-vault")'
views:
  - type: table
    name: Top 3
    order:
      - file.name
      - progress
      - status
    sort:
      - column: progress
        direction: DESC
    limit: 3
```

%%
ESPERADO:
- Apenas 3 resultados (os 3 com maior progress)
- bug-css-overflow (100), project-kokobrain (60), bug-login-timeout (40); notas sem progress ficam no fim e nao entram
%%

## 11. Formula (Campo Calculado)

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - "progress != null"
formulas:
  remaining: "100 - progress"
views:
  - type: table
    name: Progress Tracker
    order:
      - file.name
      - progress
      - formula.remaining
      - status
properties:
  formula.remaining:
    displayName: Remaining %
```

%%
ESPERADO:
- Coluna "Remaining %" mostra 100 - progress
- "Progress Tracker (5)": bug-login-timeout 40 -> 60, bug-css-overflow 100 -> 0, task-refactor-store 0 -> 100, project-kokobrain 60 -> 40, project-garden 25 -> 75
%%

## 12. Formula Condicional (if)

```collection
filters: 'file.folder.contains("/markdown-editor-vault")'
formulas:
  statusLabel: "if(status == 'completed', 'Done', if(status == 'active', 'In Progress', 'Other'))"
views:
  - type: table
    name: Labels
    order:
      - file.name
      - formula.statusLabel
      - priority
properties:
  formula.statusLabel:
    displayName: Status Label
```

%%
ESPERADO:
- Coluna "Status Label" mostra texto condicional:
  - completed -> "Done"
  - active -> "In Progress"
  - qualquer outro -> "Other"
- 39 linhas: 1 "Done" (bug-css-overflow), 4 "In Progress" (bug-login-timeout, project-kokobrain, 18-frontmatter, 21-combined-stress), 34 "Other"
%%

## 13. Display Names (Colunas Renomeadas)

```collection
filters: 'file.folder.contains("/markdown-editor-vault")'
views:
  - type: table
    name: Custom Names
    order:
      - file.name
      - assignee
      - progress
      - due
properties:
  file.name:
    displayName: Note
  assignee:
    displayName: Owner
  progress:
    displayName: "Progress (%)"
  due:
    displayName: Deadline
```

%%
ESPERADO:
- Headers da tabela usam os nomes customizados:
  - file.name -> "Note"
  - assignee -> "Owner"
  - progress -> "Progress (%)"
  - due -> "Deadline"
- 39 linhas; Owner/Progress/Deadline preenchidos so nas 5 notas de data/ com essas propriedades (bugs, task, projects)
%%

## 14. View Filter (Filtro global + filtro da view)

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - "status != 'backlog'"
views:
  - type: table
    name: Active Non-Bugs
    filters: "!file.hasTag('bug')"
    order:
      - file.name
      - status
      - priority
```

%%
ESPERADO:
- Filtro global remove backlog
- Filtro da view TAMBEM remove bugs
- Resultado: notas que NAO sao backlog E NAO sao bugs
- "Active Non-Bugs (36)": as 39 notas menos task-refactor-store (backlog) e os 2 bugs; notas sem status passam (null != 'backlog')
%%

## 15. Metadados de Arquivo

```collection
filters: 'file.folder.contains("/markdown-editor-vault")'
views:
  - type: table
    name: File Info
    order:
      - file.name
      - file.folder
      - file.ext
      - file.size
```

%%
ESPERADO:
- Colunas mostram metadados do arquivo (path, folder, extension, size)
- 39 linhas; as 15 notas de data/ mostram a pasta .../markdown-editor-vault/data
%%

## 16. Bloco Collection Vazio (Edge Case)

```collection
```

%%
ESPERADO:
- Deve mostrar erro "YAML must be an object"
- NAO deve crashar o editor
%%

## 17. YAML Invalido (Edge Case)

```collection
views: not-an-array
```

%%
ESPERADO:
- Deve mostrar erro "Field 'views' must be an array"
- NAO deve crashar o editor
%%

## 18. Views Vazio (Edge Case)

```collection
views: []
```

%%
ESPERADO:
- Deve mostrar erro "Field 'views' must not be empty"
%%

## 19. View sem Type (Edge Case)

```collection
views:
  - name: Missing Type
    order:
      - file.name
```

%%
ESPERADO:
- Deve mostrar erro "View at index 0 is missing 'type'"
%%

## 20. Filtro Sem Resultados

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - "file.hasTag('tag-que-nao-existe')"
views:
  - type: table
    name: Empty
    order:
      - file.name
```

%%
ESPERADO:
- Header mostra "Empty (0)"
- Mensagem "No results match the current filters"
%%
