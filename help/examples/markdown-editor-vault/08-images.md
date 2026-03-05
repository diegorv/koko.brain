# Teste: Imagens

%%
COMO TESTAR:
- Verifique que imagens sao renderizadas quando cursor fora
- Verifique que sintaxe aparece quando cursor dentro
- Teste diferentes formatos de tamanho
%%

## 1. Imagem Inline Basica

![Alt text da imagem](https://via.placeholder.com/200x100)

%%
ESPERADO:
- Cursor fora: imagem renderizada como <img>, sintaxe oculta
- Cursor dentro: sintaxe completa visivel ![alt](url)
- Alt text acessivel
%%

## 2. Imagem com Titulo

![Imagem com titulo](https://via.placeholder.com/200x100 "Titulo da Imagem")

%%
ESPERADO:
- Mesmo comportamento de imagem basica
- Titulo incluido na parte oculta
%%

## 3. Imagem com Tamanho (Sintaxe Obsidian)

![Imagem pequena|100](https://via.placeholder.com/200x100)

![Imagem media|300](https://via.placeholder.com/400x200)

![Imagem com dimensoes|200x150](https://via.placeholder.com/400x300)

%%
ESPERADO:
- |100: largura 100px
- |300: largura 300px
- |200x150: largura 200px, altura 150px
- Widget deve respeitar as dimensoes especificadas
%%

## 4. Imagem de Referencia

![Imagem de referencia][img-ref]

[img-ref]: https://via.placeholder.com/150x80

%%
ESPERADO:
- Imagem renderizada usando URL da definicao de referencia
- Linha de definicao dimmed
- resolveRefUrl() deve encontrar a definicao
%%

## 5. Wikilink Embed de Imagem

![[placeholder.png]]

![[placeholder.png|300]]

![[placeholder.png|300x200]]

%%
ESPERADO:
- Imagem do vault renderizada inline
- |300 define largura, |300x200 define largura e altura
- Se arquivo nao existir: verificar fallback/mensagem de erro
%%

## 6. Multiplas Imagens

![Primeira](https://via.placeholder.com/100x50) ![Segunda](https://via.placeholder.com/100x50)

%%
ESPERADO:
- Ambas imagens renderizadas
- Cada uma independente para controle de cursor
%%

## 7. Imagem como Link

[![Imagem clicavel](https://via.placeholder.com/100x50)](https://example.com)

%%
ESPERADO:
- Imagem dentro de link - verificar se renderiza corretamente
%%

## 8. Edge Cases

![](https://via.placeholder.com/100x50) (alt vazio)

![Imagem com URL invalida](nao-e-url-valida)

![Imagem com URL perigosa](javascript:alert('xss'))

![Alt text muito longo que deveria ser truncado ou quebrado em multiplas linhas para testar o comportamento](https://via.placeholder.com/100x50)

%%
ESPERADO:
- Alt vazio: imagem deve renderizar normalmente
- URL invalida: NAO deve renderizar imagem, verificar isSafeUrl()
- javascript URL: deve ser BLOQUEADA (seguranca)
- Alt longo: verificar como e tratado visualmente
%%
