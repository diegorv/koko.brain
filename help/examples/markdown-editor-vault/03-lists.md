# Teste: Listas

%%
COMO TESTAR:
- Verifique que marcadores sao substituidos por widgets estilizados
- Mova o cursor para a linha e verifique que o marcador original aparece
- Teste interacao com checkboxes (click para toggle)
%%

## 1. Lista Nao Ordenada (Hifen)

- Item um
- Item dois
- Item tres

%%
ESPERADO:
- Cursor fora: "-" substituido por bullet estilizado (ponto)
- Cursor dentro: "-" original visivel
%%

## 2. Lista Nao Ordenada (Asterisco)

* Item um
* Item dois
* Item tres

%%
ESPERADO:
- Mesmo comportamento que hifen - marcador substituido por bullet
%%

## 3. Lista Nao Ordenada (Plus)

+ Item um
+ Item dois
+ Item tres

%%
ESPERADO:
- Mesmo comportamento que hifen e asterisco
%%

## 4. Lista Ordenada

1. Primeiro item
2. Segundo item
3. Terceiro item

%%
ESPERADO:
- Cursor fora: "1." substituido por widget estilizado mostrando o numero
- Cursor dentro: "1." original visivel
- Espaco apos marcador incluido no range de substituicao
%%

## 5. Lista Ordenada com Numeros Grandes

1. Primeiro
10. Decimo
100. Centesimo
1000. Milesimo

%%
ESPERADO:
- Numeros grandes devem funcionar corretamente
- Widget deve mostrar o numero correto
%%

## 6. Task List (Checkbox)

- [ ] Tarefa pendente
- [x] Tarefa completa
- [ ] Outra tarefa pendente

%%
ESPERADO:
- Cursor fora: [ ] ou [x] substituido por checkbox widget interativo
- Checkbox vazio para [ ], checkbox marcado para [x]
- INTERACAO: clicar no checkbox deve alternar entre [ ] e [x] no documento
- Hover state visivel no checkbox
%%

## 7. Listas Aninhadas

- Item nivel 1
  - Item nivel 2
    - Item nivel 3
      - Item nivel 4

1. Ordenada nivel 1
   1. Ordenada nivel 2
      1. Ordenada nivel 3

- Misturada nivel 1
  1. Ordenada nivel 2
     - Nao ordenada nivel 3
       - [x] Task nivel 4

%%
ESPERADO:
- Indentacao correta em cada nivel
- Cada nivel deve ter seu proprio marcador estilizado
- Listas misturadas (ordenada + nao ordenada + task) devem funcionar
%%

## 8. Lista com Conteudo Rico

- Item com **negrito** e *italico*
- Item com `codigo inline`
- Item com ~~tachado~~ e ==highlight==
- Item com [link](https://example.com)
- Item com [[wikilink]]

%%
ESPERADO:
- Toda formatacao inline deve funcionar dentro de itens de lista
- Marcadores do item devem ser independentes dos marcadores inline
%%

## 9. Lista com Multiplos Paragrafos

- Primeiro paragrafo do item.

  Segundo paragrafo do mesmo item (indentado com 2 espacos).

- Proximo item.

%%
ESPERADO:
- Paragrafo continuado deve manter a indentacao da lista
- Bullet visivel apenas na primeira linha do item
%%

## 10. Edge Cases

-
- Item apos item vazio
-Sem espaco (pode nao ser lista valida)

1) Parentese em vez de ponto (nao e lista valida em CommonMark)

%%
ESPERADO:
- Item vazio deve ser renderizado como item de lista
- Sem espaco apos marcador: comportamento pode variar
- Parentese: NAO deve ser lista valida
%%
