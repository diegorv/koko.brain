# Teste: Tabelas (GFM)

%%
COMO TESTAR:
- Verifique que tabelas sao substituidas por widget HTML <table>
- Verifique alinhamento de colunas
- Mova cursor para dentro da tabela e verifique que source aparece
- Teste formatacao inline dentro de celulas
%%

## 1. Tabela Basica

| Nome | Idade | Cidade |
|------|-------|--------|
| Ana | 25 | Sao Paulo |
| Bruno | 30 | Rio de Janeiro |
| Carlos | 28 | Belo Horizonte |

%%
ESPERADO:
- Cursor fora: tabela renderizada como HTML <table> com bordas
- Linhas alternadas com cores diferentes
- Header (primeira linha) estilizado diferentemente
- Cursor dentro: source markdown visivel
%%

## 2. Alinhamento de Colunas

| Esquerda | Centro | Direita |
|:---------|:------:|--------:|
| texto | texto | texto |
| alinhado | alinhado | alinhado |
| a esquerda | ao centro | a direita |

%%
ESPERADO:
- Coluna 1: alinhada a esquerda (padrao com :---)
- Coluna 2: alinhada ao centro (com :---:)
- Coluna 3: alinhada a direita (com ---:)
%%

## 3. Tabela com Formatacao Inline

| Feature | Sintaxe | Resultado |
|---------|---------|-----------|
| Negrito | `**text**` | **text** |
| Italico | `*text*` | *text* |
| Codigo | `` `code` `` | `code` |
| Tachado | `~~text~~` | ~~text~~ |
| Link | `[text](url)` | [text](https://example.com) |

%%
ESPERADO:
- Formatacao inline deve funcionar dentro de celulas da tabela
- Cada celula renderizada com o estilo correto
%%

## 4. Tabela com Muitas Colunas

| Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 |
|-------|-------|-------|-------|-------|-------|-------|-------|
| a | b | c | d | e | f | g | h |
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |

%%
ESPERADO:
- Tabela deve se adaptar ou ter scroll horizontal
- Todas as colunas visiveis e alinhadas
%%

## 5. Tabela com Muitas Linhas

| ID | Item | Status |
|----|------|--------|
| 1 | Item A | Ativo |
| 2 | Item B | Inativo |
| 3 | Item C | Ativo |
| 4 | Item D | Pendente |
| 5 | Item E | Ativo |
| 6 | Item F | Inativo |
| 7 | Item G | Ativo |
| 8 | Item H | Pendente |
| 9 | Item I | Ativo |
| 10 | Item J | Inativo |

%%
ESPERADO:
- Todas as linhas renderizadas
- Linhas alternadas com cores diferentes
%%

## 6. Tabela com Celulas Vazias

| A | B | C |
|---|---|---|
| 1 | | 3 |
| | 5 | |
| 7 | 8 | 9 |

%%
ESPERADO:
- Celulas vazias devem ser renderizadas como celulas vazias
- Layout nao deve quebrar
%%

## 7. Tabela com Meta-Bind Input

| Propriedade | Valor |
|-------------|-------|
| Status | `INPUT[inlineSelect(todo, doing, done):status]` |
| Prioridade | `INPUT[inlineSelect(baixa, media, alta):prioridade]` |

%%
ESPERADO:
- Campos INPUT devem ser renderizados como dropdowns interativos dentro das celulas
- Selecionar um valor deve atualizar o frontmatter
%%

## 8. Tabela Minima

| A |
|---|
| 1 |

%%
ESPERADO:
- Tabela com uma unica coluna deve funcionar
%%

## 9. Edge Cases

| Header sem separador |
| conteudo |

| A | B |
|---|
| 1 | 2 | 3 |

%%
ESPERADO:
- Sem linha separadora: NAO deve ser tabela valida
- Numero inconsistente de colunas: verificar comportamento
%%
