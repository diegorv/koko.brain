# Test: Collection (Data Query Blocks)

%%
COMO TESTAR:
- Every block reads only notes in this folder (filter `file.folder.contains("/markdown-editor-vault")`), so it lists the same notes whether this folder is its own vault or nested in a large one
- The expected results below assume the data notes from `collection-features/` (bug-*, projeto-*, meeting-*): copy that folder into this one; without it most tables are empty
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
- Cursor fora: tabela interativa com as notas do vault, limitada a 50 linhas
- Header mostra "All Notes (N)" com a contagem total
- Com mais de 50 notas: rodape "Showing 50 of N" abaixo da tabela
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
- Apenas notas com status "active" na tabela
- Notas com status planning/completed/backlog NAO aparecem
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
- Apenas notas que tem a tag "bug"
- Deve mostrar bug-login-timeout e bug-css-overflow
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
%%

## 5. Filtro OR

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - or:
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
%%

## 6. Filtro NOT

```collection
filters:
  and:
    - 'file.folder.contains("/markdown-editor-vault")'
    - not:
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
- Notas ordenadas alfabeticamente por nome de arquivo
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
- Ex: progress=75 -> remaining=25
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
