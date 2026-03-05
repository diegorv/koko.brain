# Teste: Callouts (Obsidian-style)

%%
COMO TESTAR:
- Verifique cor da borda esquerda por tipo
- Verifique titulo em negrito
- Teste callouts dobráveis: clique no chevron para expandir/colapsar
- Verifique que callouts NAO sao tratados como blockquotes
%%

## 1. Callout Note

> [!note] Titulo da Nota
> Conteudo da nota aqui.
> Segunda linha do conteudo.

%%
ESPERADO:
- Borda esquerda com cor especifica para "note"
- "Titulo da Nota" em negrito
- Marcador "> [!note]" oculto quando cursor fora
%%

## 2. Callout Tip

> [!tip] Dica Importante
> Esta e uma dica muito util.

%%
ESPERADO:
- Cor distinta de "note"
%%

## 3. Callout Warning

> [!warning] Atencao
> Cuidado com este comportamento.

%%
ESPERADO:
- Cor amarela/laranja para warning
%%

## 4. Callout Danger

> [!danger] Perigo
> Acao irreversivel.

%%
ESPERADO:
- Cor vermelha para danger
%%

## 5. Callout Bug

> [!bug] Bug Encontrado
> Descricao do bug aqui.

%%
ESPERADO:
- Cor especifica para bug
%%

## 6. Callout Example

> [!example] Exemplo
> Codigo de exemplo aqui.

%%
ESPERADO:
- Cor especifica para example
%%

## 7. Callout Quote

> [!quote] Citacao Famosa
> "Ser ou nao ser, eis a questao."

%%
ESPERADO:
- Cor especifica para quote
%%

## 8. Callout Info

> [!info] Informacao
> Informacao adicional aqui.

%%
ESPERADO:
- Cor especifica para info
%%

## 9. Callout Sem Titulo

> [!note]
> Callout sem titulo customizado.

%%
ESPERADO:
- Deve usar o tipo como titulo padrao ("Note")
- Conteudo deve aparecer normalmente
%%

## 10. Callout Dobravel - Comeca Expandido

> [!note]+ Clique para Colapsar
> Este conteudo esta visivel por padrao.
> Clique no chevron para esconder.

%%
ESPERADO:
- Chevron visivel (triangulo para baixo)
- Conteudo visivel por padrao
- INTERACAO: clicar no chevron deve colapsar o conteudo
- Chevron muda de direcao ao colapsar
%%

## 11. Callout Dobravel - Comeca Colapsado

> [!warning]- Clique para Expandir
> Este conteudo esta escondido por padrao.
> Clique no chevron para mostrar.

%%
ESPERADO:
- Chevron visivel (triangulo para direita)
- Conteudo OCULTO por padrao
- INTERACAO: clicar no chevron deve expandir o conteudo
%%

## 12. Callout com Formatacao Inline

> [!tip] Dica com **Negrito** e *Italico*
> Conteudo com `codigo`, ~~tachado~~ e ==highlight==.
> E tambem [links](https://example.com) e [[wikilinks]].

%%
ESPERADO:
- Toda formatacao inline deve funcionar dentro de callouts
%%

## 13. Callout com Lista

> [!example] Lista dentro de Callout
> - Item 1
> - Item 2
> - [x] Task completa
> - [ ] Task pendente

%%
ESPERADO:
- Listas devem funcionar dentro de callouts
- Checkboxes devem ser interativos
%%

## 14. Callouts Consecutivos

> [!note] Primeiro Callout
> Conteudo do primeiro.

> [!warning] Segundo Callout
> Conteudo do segundo.

> [!danger] Terceiro Callout
> Conteudo do terceiro.

%%
ESPERADO:
- Cada callout independente com sua propria cor
- Separacao visual clara entre callouts
%%

## 15. Callout Multi-Paragrafo

> [!info] Callout Longo
> Primeiro paragrafo do callout.
>
> Segundo paragrafo do callout.
>
> Terceiro paragrafo do callout.

%%
ESPERADO:
- Todos os paragrafos dentro do mesmo callout
- Linhas vazias com > mantêm o callout
%%

## 16. Edge Cases

> [!NOTA] Tipo em Maiusculas
> Deve funcionar com qualquer capitalizacao?

> [!custom] Tipo Customizado
> Tipo nao reconhecido - qual o comportamento?

> [!note] Callout com apenas uma linha

%%
ESPERADO:
- Verificar se tipos sao case-insensitive
- Verificar comportamento com tipos nao reconhecidos (deve usar estilo padrao?)
- Callout de uma linha deve funcionar
%%
