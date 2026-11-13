---
status: todo
prioridade: media
categoria: geral
fase: planejamento
---

# Teste: Meta-Bind

%%
COMO TESTAR:
- Verifique que INPUT fields sao renderizados como dropdowns interativos
- Verifique que button blocks sao renderizados como botoes clicaveis
- Teste interacao: mudar select deve atualizar frontmatter
%%

## 1. Inline Select Basico

Status atual: `INPUT[inlineSelect(todo, doing, done):status]`

%%
ESPERADO:
- Cursor fora: dropdown renderizado mostrando valor atual do frontmatter (status)
- Cursor dentro: sintaxe visivel
- INTERACAO: selecionar outro valor deve atualizar a propriedade "status" no frontmatter
- Se propriedade nao existir: deve ser criada automaticamente
%%

## 2. Multiplos Inline Selects

Prioridade: `INPUT[inlineSelect(baixa, media, alta, critica):prioridade]`

Categoria: `INPUT[inlineSelect(geral, bug, feature, docs):categoria]`

Fase: `INPUT[inlineSelect(planejamento, desenvolvimento, teste, concluido):fase]`

%%
ESPERADO:
- Cada dropdown independente
- Cada um vinculado a sua propriedade no frontmatter
- Mudar um nao deve afetar os outros
%%

## 3. Inline Select em Tabela

| Campo | Valor |
|-------|-------|
| Status | `INPUT[inlineSelect(todo, doing, done):status]` |
| Prioridade | `INPUT[inlineSelect(baixa, media, alta):prioridade]` |

%%
ESPERADO:
- Dropdowns funcionais dentro de celulas de tabela
- Tabela deve acomodar o tamanho do dropdown
%%

## 4. Button Block - Estilo Default

```meta-bind-button
label: Botao Default
style: default
actions:
  - type: updateMetadata
    prop: status
    value: doing
```

%%
ESPERADO:
- Cursor fora: botao renderizado com estilo default
- Cursor dentro: YAML visivel
- INTERACAO: clicar deve executar a acao (atualizar status para "doing")
%%

## 5. Button Block - Estilo Primary

```meta-bind-button
label: Marcar como Concluido
style: primary
actions:
  - type: updateMetadata
    prop: status
    value: done
```

%%
ESPERADO:
- Botao com estilo primary (cor de destaque)
%%

## 6. Button Block - Estilo Destructive

```meta-bind-button
label: Resetar Status
style: destructive
actions:
  - type: updateMetadata
    prop: status
    value: todo
```

%%
ESPERADO:
- Botao com estilo destructive (cor vermelha/perigosa)
%%

## 7. Button Block - Estilo Plain

```meta-bind-button
label: Botao Simples
style: plain
actions:
  - type: updateMetadata
    prop: prioridade
    value: baixa
```

%%
ESPERADO:
- Botao com estilo plain (minimalista)
%%

## 8. Button Block com YAML Invalido

```meta-bind-button
label: Botao com erro
invalid yaml content here
  - missing proper structure
```

%%
ESPERADO:
- Widget de erro deve aparecer em vez do botao
- Mensagem de erro visivel indicando YAML invalido
- NAO deve crashar o editor
%%

## 9. Number Input

Score: `INPUT[number():score]`

%%
ESPERADO:
- Cursor fora: input numerico renderizado
- Aceita apenas numeros
- Atualiza propriedade "score" no frontmatter
%%

## 10. Date Input

Data: `INPUT[date():data_entrega]`

%%
ESPERADO:
- Cursor fora: date picker renderizado (formato YYYY-MM-DD)
- Atualiza propriedade "data_entrega" no frontmatter
%%

## 11. Toggle / Boolean Input

Arquivado: `INPUT[toggle():arquivado]`

Ativo: `INPUT[boolean():ativo]`

%%
ESPERADO:
- Cursor fora: checkbox/switch renderizado
- Toggle: true/yes/1/on (case-insensitive) = checked
- Atualiza propriedade no frontmatter como true/false
%%

## 12. Option Labels (Value/Label Syntax)

Humor: `INPUT[inlineSelect(option(1, muito ruim), option(2, ruim), option(3, ok), option(4, bom), option(5, otimo)):humor]`

%%
ESPERADO:
- Dropdown mostra labels (muito ruim, ruim, ok, bom, otimo)
- Valor armazenado no frontmatter e numerico (1-5)
%%

## 13. Button - Open Action

```meta-bind-button
label: Abrir Projeto
style: primary
action:
  type: open
  link: "[[project-kokobrain]]"
```

%%
ESPERADO:
- A button that opens the note "project-kokobrain" (or focuses its tab when it is already open)
%%

## 14. Button - Create Note Action

```meta-bind-button
label: Nova Ideia
style: default
action:
  type: createNote
  fileName: Nova Ideia
  folderPath: Inbox
```

%%
ESPERADO:
- Botao que cria "Inbox/Nova Ideia.md" e abre
%%

## 14a. Button - Open View Action

```meta-bind-button
label: Abrir Projetos
action:
  type: openView
  path: _system/views/Projects.view
```

```meta-bind-button
label: Not a view
action:
  type: openView
  path: Projects.md
```

%%
ESPERADO:
- The first button opens `_system/views/Projects.view` as a click on its row under Views does; this example vault has no such file, so clicking it shows an error message and opens nothing
- The second block renders an inline error instead of a button: `Invalid button: openView needs a .view path`
%%

## 15. Button - Multiple Actions Chain

```meta-bind-button
label: Finalizar e Arquivar
style: destructive
tooltip: Marca como done e arquiva
actions:
  - type: updateMetadata
    prop: status
    value: done
  - type: updateMetadata
    prop: arquivado
    value: true
```

%%
ESPERADO:
- Botao executa duas acoes em sequencia
- Tooltip aparece no hover
%%

## 16. Button - Reset Status

```meta-bind-button
label: Reset
action:
  type: updateMetadata
  prop: status
  value: todo
```

%%
ESPERADO:
- A button that sets status back to "todo"
- `id` and `hidden` (Obsidian Meta Bind's inline buttons and hidden blocks) are not supported: a button ignores those keys and renders as usual
%%

## 17. Edge Cases

Inline select com propriedade inexistente: `INPUT[inlineSelect(a, b, c):propriedade_nova]`

%%
ESPERADO:
- Propriedade deve ser criada no frontmatter ao selecionar um valor
- Dropdown deve mostrar vazio/default inicialmente
%%

Tipo desconhecido com opcoes (fallback para select): `INPUT[customType(x, y, z):campo_custom]`

%%
ESPERADO:
- Tipo nao reconhecido com opcoes deve renderizar como inline select
%%
