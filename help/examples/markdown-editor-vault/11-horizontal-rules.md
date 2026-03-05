# Teste: Linhas Horizontais

%%
COMO TESTAR:
- Verifique que cada variante e substituida por widget <hr> estilizado
- Mova cursor para a linha e verifique que source aparece
%%

## 1. Tres Hifens

---

%%
ESPERADO:
- Cursor fora: linha horizontal estilizada (<hr> widget)
- Cursor dentro: --- visivel como texto
%%

## 2. Tres Asteriscos

***

%%
ESPERADO:
- Mesmo visual que tres hifens
%%

## 3. Tres Underlines

___

%%
ESPERADO:
- Mesmo visual que tres hifens
%%

## 4. Mais de Tres Caracteres

-----

*****

_____

%%
ESPERADO:
- Devem funcionar identicamente as versoes com 3 caracteres
%%

## 5. Com Espacos

- - -

* * *

_ _ _

%%
ESPERADO:
- Espacos entre caracteres devem funcionar (CommonMark spec)
%%

## 6. Linhas Horizontais entre Conteudo

Paragrafo acima da linha.

---

Paragrafo abaixo da linha.

%%
ESPERADO:
- Separacao visual clara entre os paragrafos
- Linha horizontal como divisor
%%

## 7. Edge Cases

--

**

__

%%
ESPERADO:
- Apenas 2 caracteres: NAO deve ser linha horizontal
- -- pode ser interpretado como setext heading underline (cuidado)
%%
