# Teste: Wikilinks (Obsidian-style)

%%
COMO TESTAR:
- Verifique que [[ e ]] sao ocultos quando cursor fora
- Verifique cor roxa e sublinhado
- Teste click para navegacao
- Teste auto-complete ao digitar [[
%%

## 1. Wikilink Basico

Texto com [[nota-exemplo]] no meio.

[[nota-no-inicio]] da linha.

Fim da linha com [[nota-no-fim]].

%%
ESPERADO:
- Cursor fora: [[ e ]] ocultos, texto visivel em roxo com sublinhado
- Cursor dentro: [[ e ]] visiveis
- Click: deve abrir a nota (ou criar se nao existir)
%%

## 2. Wikilink com Texto de Exibicao

Texto com [[nota-real|Texto Exibido]] no meio.

[[caminho/longo/nota|Nome Curto]]

%%
ESPERADO:
- Cursor fora: mostra apenas "Texto Exibido", oculta "[[nota-real|"
- Cursor dentro: sintaxe completa visivel
- O pipe (|) e tudo antes dele devem ser ocultos
%%

## 3. Wikilink com Referencia a Heading

Link para heading: [[#Wikilink Basico]]

Link para heading em outra nota: [[outra-nota#Secao Importante]]

%%
ESPERADO:
- Cursor fora: [[ e ]] ocultos, texto do heading visivel
- Click: deve navegar para o heading (na mesma nota ou em outra)
%%

## 4. Wikilink com Referencia a Block ID

Link para bloco: [[#^block-123]]

Link para bloco em outra nota: [[outra-nota#^block-456]]

%%
ESPERADO:
- Cursor fora: [[ e ]] ocultos
- Click: deve navegar para o block ID
%%

## 5. Wikilink Embed de Imagem

![[imagem-teste.png]]

![[imagem-teste.png|300]]

![[imagem-teste.png|300x200]]

%%
ESPERADO:
- Imagem renderizada inline quando cursor fora
- Sintaxe visivel quando cursor dentro
- |300 define largura, |300x200 define largura e altura
- Se imagem nao existir: verificar fallback/erro
%%

## 6. Wikilink Embed de Nota

![[nota-para-embed]]

%%
ESPERADO:
- Cursor fora: conteudo da nota renderizado em container com borda e header
- Cursor dentro: sintaxe visivel
- Loading state: deve mostrar "Loading..." ate conteudo carregar
- Se nota nao existir: verificar fallback
%%

## 7. Wikilink Embed de Secao

![[nota-para-embed#Secao Especifica]]

![[nota-para-embed#^block-id]]

%%
ESPERADO:
- Apenas a secao/bloco referenciado deve ser renderizado
- Mesmo estilo visual de embed de nota completa
%%

## 8. Multiplos Wikilinks

Texto com [[primeiro]], [[segundo]] e [[terceiro]] wikilinks.

%%
ESPERADO:
- Cada wikilink independente
- Mover cursor sobre um revela apenas os marcadores daquele wikilink
%%

## 9. Wikilink com Formatacao

**[[nota-negrito]]**

*[[nota-italico]]*

%%
ESPERADO:
- Formatacao externa deve ser aplicada ao wikilink
%%

## 10. Auto-Complete de Wikilinks

%%
TESTE MANUAL:
1. Digite [[ no editor
2. Deve aparecer menu de auto-complete com sugestoes de notas
3. Selecione uma nota da lista
4. Wikilink deve ser completado automaticamente
5. Verifique que o menu desaparece apos selecao
%%

Comece a digitar aqui:

## 11. Edge Cases

[[]] (wikilink vazio)

[[ nota com espacos ]]

[[nota/com/subpastas]]

[[Nota com Acentuacao]]

%%
ESPERADO:
- Wikilink vazio: verificar comportamento
- Espacos extras: verificar se funciona
- Subpastas: deve resolver o caminho corretamente
- Acentuacao: deve funcionar normalmente
%%
