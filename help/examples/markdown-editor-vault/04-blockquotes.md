# Teste: Blockquotes

%%
COMO TESTAR:
- Verifique borda esquerda + padding + background colorido
- Mova cursor para dentro/fora e verifique > visibilidade
- Teste niveis de aninhamento (ate 3 niveis com estilos distintos)
%%

## 1. Blockquote Simples

> Esta e uma citacao simples.

%%
ESPERADO:
- Cursor fora: ">" oculto, borda esquerda colorida + padding + background
- Cursor dentro: ">" visivel com animacao suave
%%

## 2. Blockquote Multi-Linha

> Primeira linha da citacao.
> Segunda linha da citacao.
> Terceira linha da citacao.

%%
ESPERADO:
- Todo o bloco deve ter estilo consistente (mesma borda/background)
- Cada linha deve ter seu ">" independentemente controlado pelo cursor
%%

## 3. Blockquote com Paragrafo Vazio

> Primeiro paragrafo.
>
> Segundo paragrafo apos linha vazia.

%%
ESPERADO:
- Linha vazia com ">" deve manter o estilo do blockquote
- Ambos paragrafos dentro do mesmo bloco visual
%%

## 4. Blockquotes Aninhados (2 Niveis)

> Nivel 1
>> Nivel 2

%%
ESPERADO:
- Nivel 1: primeiro estilo de background
- Nivel 2: segundo estilo de background (distinto)
- Bordas esquerdas acumuladas por nivel
%%

## 5. Blockquotes Aninhados (3 Niveis)

> Nivel 1
>> Nivel 2
>>> Nivel 3

%%
ESPERADO:
- Cada nivel com background distinto (ate 3 niveis suportados)
- Profundidade visual clara entre niveis
%%

## 6. Blockquote com Formatacao Inline

> Citacao com **negrito**, *italico*, `codigo`, ~~tachado~~ e ==highlight==.

> Citacao com [link](https://example.com) e [[wikilink]].

%%
ESPERADO:
- Toda formatacao inline deve funcionar dentro de blockquotes
- Marcadores inline independentes do marcador >
%%

## 7. Blockquote com Lista

> - Item 1
> - Item 2
> - Item 3

> 1. Primeiro
> 2. Segundo
> 3. Terceiro

%%
ESPERADO:
- Listas dentro de blockquotes devem funcionar normalmente
- Marcadores de lista substituidos por widgets mesmo dentro do blockquote
%%

## 8. Blockquote com Heading

> # Heading dentro de blockquote
>
> Texto normal apos heading.

%%
ESPERADO:
- Heading estilizado normalmente dentro do blockquote
- # oculto quando cursor fora
%%

## 9. Blockquote vs Callout

> Este e um blockquote normal.

> [!note] Este e um callout, NAO um blockquote.

%%
ESPERADO:
- Blockquote normal: estilo padrao de citacao
- Callout: NAO deve ser tratado como blockquote, deve ser tratado pelo callout plugin
- O blockquote plugin deve EXCLUIR callouts (linhas com [!type])
%%

## 10. Edge Cases

>Sem espaco apos > (deve funcionar mesmo assim?)

> > Espaco entre > > (aninhamento com espaco)

%%
ESPERADO:
- Verificar comportamento com/sem espaco apos >
- Verificar aninhamento com espaco entre marcadores
%%
