# Teste: Block References

%%
COMO TESTAR:
- Verifique que ^block-id e oculto quando cursor fora
- Verifique que aparece dimmed quando cursor dentro
- Block IDs ficam no final da linha
%%

## 1. Block Reference Basico

Este paragrafo tem um block ID no final. ^block-001

%%
ESPERADO:
- Cursor fora: "^block-001" completamente oculto
- Cursor na linha: "^block-001" visivel mas dimmed
- Serve como ancora para ![[nota#^block-001]]
%%

## 2. Block Reference em Diferentes Contextos

Um paragrafo normal com referencia. ^ref-paragrafo

- Um item de lista com referencia ^ref-lista

> Uma citacao com referencia ^ref-citacao

| Tabela | Dados |
|--------|-------|
| celula | valor | ^ref-tabela

%%
ESPERADO:
- Block reference funciona em paragrafos, listas, blockquotes
- Sempre no final da linha
- Verificar se funciona em todos os contextos
%%

## 3. Multiplos Block References

Primeiro bloco. ^id-primeiro

Segundo bloco. ^id-segundo

Terceiro bloco. ^id-terceiro

%%
ESPERADO:
- Cada referencia independente
- Cada uma oculta/visivel baseada na posicao do cursor naquela linha
%%

## 4. Edge Cases

^id-no-inicio (block reference no inicio da linha)

Texto sem espaco antes do^id-sem-espaco

Texto com ^id com espacos no id

%%
ESPERADO:
- No inicio da linha: verificar se e detectado
- Sem espaco antes: verificar se e detectado
- Com espacos no ID: provavelmente NAO e valido
%%
