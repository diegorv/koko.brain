---
title: Teste de Frontmatter
tags:
  - teste
  - manual
  - markdown
created: 2024-01-15
modified: 2024-06-20
author: Diego
status: active
priority: 3
draft: true
category: documentation
---

# Teste: Frontmatter (YAML Properties)

%%
COMO TESTAR:
- Verifique que o frontmatter acima e renderizado como painel "Properties"
- Verifique contagem de propriedades no badge
- Verifique icones por tipo de propriedade
- Verifique que tags aparecem como pills
- O frontmatter NUNCA deve ser mostrado como source no live preview
%%

## Descricao do Frontmatter Acima

%%
ESPERADO:
- Widget "Properties" substituindo o bloco YAML
- Badge mostrando quantidade de propriedades
- Propriedade "title": string normal
- Propriedade "tags": array de tags como pills com botao X
- Propriedade "created": icone de relogio (tipo date)
- Propriedade "modified": icone de relogio
- Propriedade "author": string normal
- Propriedade "status": string normal
- Propriedade "priority": numero
- Propriedade "draft": boolean
- Propriedade "category": string normal
- O gutter deve ter marcadores ocultos para linhas internas do frontmatter
%%

## Interacao com Properties Panel

%%
TESTE MANUAL:
1. O painel de propriedades deve estar sincronizado com o frontmatter
2. Alterar uma propriedade no painel deve atualizar o YAML
3. Alterar o YAML diretamente deve atualizar o painel
4. Adicionar/remover tags deve funcionar via pills com X
%%

## Verificacoes Adicionais

%%
ESPERADO:
- Frontmatter so e valido no INICIO do documento
- Deve comecar na primeira linha com ---
- Deve terminar com ---
- Propriedades desconhecidas devem ser exibidas normalmente
%%
