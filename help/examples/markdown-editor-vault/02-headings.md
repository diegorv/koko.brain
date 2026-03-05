# Teste: Headings

%%
COMO TESTAR:
- Mova o cursor para FORA da linha do heading e verifique que # esta oculto
- Mova o cursor para DENTRO da linha do heading e verifique que # aparece
- Verifique tamanhos e cores distintas por nivel
- Transicoes suaves (font-size animation para # marks)
%%

## 1. ATX Headings (H1 a H6)

# Heading 1 - Deve ser o maior (1.6em, bold)

## Heading 2 - Segundo maior (1.4em, bold)

### Heading 3 - Terceiro (1.2em, bold)

#### Heading 4 - Tamanho normal, bold

##### Heading 5 - Tamanho normal, bold

###### Heading 6 - Tamanho normal, bold

%%
ESPERADO:
- Cursor fora: # ocultos com animacao font-size, apenas texto do heading visivel
- Cursor dentro: # visiveis, espaco apos # incluido no range oculto
- H1: 1.6em, bold
- H2: 1.4em, bold
- H3: 1.2em, bold
- H4-H6: tamanho normal, bold
- Cada nivel deve ter cor distinta (CSS variables)
%%

## 2. Setext Headings

Heading 1 Setext
=================

Heading 2 Setext
-----------------

%%
ESPERADO:
- Cursor fora: linha de === ou --- oculta, texto estilizado como H1/H2
- Cursor dentro: linha de === ou --- visivel
- Mesmo estilo visual que ATX H1/H2 equivalentes
%%

## 3. Headings com Formatacao Inline

# Heading com **negrito**

## Heading com *italico*

### Heading com `codigo`

#### Heading com ~~tachado~~

##### Heading com ==highlight==

%%
ESPERADO:
- Formatacao inline deve funcionar DENTRO de headings
- Ao mover cursor para o heading, tanto # quanto marcadores inline devem aparecer
%%

## 4. Edge Cases

####### Sete hashtags (nao e heading valido)

#Sem espaco (nao e heading valido)

## Heading com espacos extras no final

##

%%
ESPERADO:
- 7+ hashtags: NAO deve ser formatado como heading
- Sem espaco apos #: NAO deve ser formatado como heading
- Espacos extras no final: deve funcionar normalmente
- ## vazio: deve funcionar como heading vazio
%%
