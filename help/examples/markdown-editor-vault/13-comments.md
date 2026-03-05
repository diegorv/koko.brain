# Teste: Comentarios (Obsidian-style)

%%
COMO TESTAR:
- Verifique que comentarios sao completamente ocultos quando cursor fora
- Verifique que aparecem dimmed quando cursor dentro
%%

## 1. Comentario Inline

Texto visivel %%comentario oculto%% mais texto visivel.

Inicio da linha %%comentario%% fim da linha.

%%
ESPERADO:
- Cursor fora: comentario completamente oculto (display: none), texto ao redor flui normalmente
- Cursor dentro: comentario visivel mas dimmed (cor mais clara)
- %% marcadores visiveis quando cursor dentro
%%

## 2. Comentario de Bloco

%%
Este e um comentario de bloco.
Multiplas linhas de comentario.
Nada disto deve ser visivel.
%%

%%
ESPERADO:
- Cursor fora: bloco inteiro oculto (nenhum espaco ocupado)
- Cursor dentro: bloco visivel mas dimmed
%%

## 3. Comentario de Bloco Longo

%%
Linha 1 do comentario longo.
Linha 2 do comentario longo.
Linha 3 do comentario longo.
Linha 4 do comentario longo.
Linha 5 do comentario longo.
%%

%%
ESPERADO:
- Todo o bloco oculto quando cursor fora
- Ao mover cursor para dentro, todas as linhas visiveis
%%

## 4. Multiplos Comentarios Inline

Texto %%primeiro%% normal %%segundo%% mais texto %%terceiro%% fim.

%%
ESPERADO:
- Cada comentario independente
- Mover cursor sobre um revela apenas aquele comentario
%%

## 5. Comentario com Formatacao (NAO Deve Renderizar)

%%**negrito** *italico* `codigo` [[wikilink]]%%

%%
ESPERADO:
- Formatacao dentro de comentarios NAO deve ser renderizada
- Comentario e tratado como texto puro
%%

## 6. Comentarios Consecutivos

Texto entre

%%
Primeiro bloco de comentario.
%%

%%
Segundo bloco de comentario.
%%

mais texto.

%%
ESPERADO:
- Cada bloco independente
- Texto entre blocos visivel normalmente
%%

## 7. Edge Cases

%%comentario sem fechar

%% %% (comentario vazio)

Texto normal %% comentario no fim da linha

%%
ESPERADO:
- Comentario nao fechado: verificar comportamento (pode nao ser tratado como comentario)
- Comentario vazio: verificar se funciona
- Comentario no fim sem fechar: verificar comportamento
%%
