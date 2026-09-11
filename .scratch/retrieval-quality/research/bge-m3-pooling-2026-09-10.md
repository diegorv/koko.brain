## BGE-M3 no koko/brain: mean vs CLS pooling, custo de migração e alternativas

### 1. Como o BGE-M3 gera o vetor denso e como foi treinado

O backbone é um XLM-RoBERTa-large: `XLMRobertaModel`, 24 camadas, hidden 1024, 16 cabeças, vocab 250002, `position_embedding_type: absolute`, `max_position_embeddings` 8194, com `max_seq_length` 8192 no lado sentence-transformers [7]. O token "CLS" aqui é o `<s>` do XLM-R, índice 0 da sequência [8].

O vetor denso é definido como `norm(H[0])`, ou seja, o hidden state normalizado do token especial `[CLS]`, e a relevância é o produto interno entre query e passagem [3]. Isso aparece em quatro lugares independentes: o paper [3], o código de referência (`last_hidden_state[:, 0]` seguido de `F.normalize`) [4], o default do embedder de inferência (`DEFAULT_POOLING_METHOD = "cls"`, `normalize_embeddings: bool = True`) [5], e o `1_Pooling/config.json` do repo, que traz `pooling_mode_cls_token: true` e `pooling_mode_mean_tokens: false` [1]. O pipeline sentence-transformers é Transformer, Pooling, Normalize, isto é, a L2 é aplicada depois do pooling [2].

O treino explica por que isso não é detalhe de implementação. O encoder parte de um xlm-roberta-large re-pré-treinado com RetroMAE após estender a posição máxima para 8192; depois vem um estágio contrastivo não supervisionado em que **só o denso é treinado**; depois o fine-tune com self-knowledge distillation, cujo professor é a soma dos scores denso, sparse e multi-vetor [3]. E o paper divide os papéis dos tokens por construção: `[CLS]` para denso, os demais tokens para sparse e multi-vetor [3]. Em outras palavras, a geometria que a loss otimizou é a do CLS; a média dos tokens nunca foi objeto de nenhuma loss. O modelo também não pede prefixo de instrução na query, ao contrário dos bge-*-v1.5 [8].

### 2. O que é recomendado oficialmente e pela comunidade

| Fonte | O que diz | Número |
|---|---|---|
| `1_Pooling/config.json` [1] | cls true, mean explicitamente false | n/a |
| FlagEmbedding (BAAI) [6] | "If you use mean pooling, there will be a significant decrease in performance" | nenhum |
| Card do Xenova/bge-m3 [9] | `{ pooling: 'cls', normalize: true }` nos dois exemplos | n/a |
| HF discussion #69 [15] | fallback silencioso para mean é bug real, confirmado por BAAI, ainda reportado em 2025 | n/a |
| sentence-transformers #3536 [16] | v5 caiu em mean por regressão; mesma similaridade deu -0.30347106 (mean) vs -0.030682037 (cls) | 1 par |
| Cloudflare Workers AI [14] | adicionou `pooling: cls` e recomenda trocar; espaços incompatíveis entre si | nenhum |

Não existe delta publicado (MTEB/BEIR/MIRACL) para "aplicar mean pooling num checkpoint treinado com CLS". Procurei e não achei; a afirmação da BAAI permanece qualitativa [6]. O único estudo head-to-head CLS vs mean que traz tabela (ModernBERT-base, 2026) mostra CLS igual ou melhor em contexto curto e muito pior em contexto longo (LongEmbed CLS 43.3 vs Mean 62.7; MLDR 24.9 vs 28.0; BEIR 42.8 vs 41.6) [17]. Ele **não se aplica ao seu caso** por dois motivos: treina ModernBERT separadamente sob cada pooling (não é um checkpoint CLS lido com mean), e o mecanismo alegado é o decaimento de atenção induzido por RoPE, que o BGE-M3 não usa (posições absolutas aprendidas) [7][17].

### 3. O que o export ONNX da Xenova e o transformers.js fazem

O repo Xenova/bge-m3 tem duas famílias de grafo, cada uma em 8 precisões [12]. A família `model*.onnx` tem entradas `input_ids` + `attention_mask` e **uma** saída, `last_hidden_state`: é token-level, sem pooling. A família `sentence_transformers*.onnx` tem as mesmas entradas e **duas** saídas, `token_embeddings` e `sentence_embedding`, com o pooling assado no grafo [12]. Esses nomes são exatamente os que o Optimum declara para um export completo de SentenceTransformer [11], e o `sentence_embedding` já sai CLS-poolado e L2-normalizado, porque o patcher roda o forward do modelo inteiro sobre o stack Transformer, Pooling(cls), Normalize [11][1][2].

No transformers.js, `pooling: 'cls'` é literalmente `result.slice(null, 0)` (fatia do token 0), `pooling: 'mean'` é a média mascarada dividida pela contagem de 1s da attention mask, e `normalize: true` é L2 na última dimensão [10]. Duas armadilhas: (a) o pipeline `feature-extraction` **nunca lê** `sentence_embedding`; a cadeia é `last_hidden_state ?? logits ?? token_embeddings`, então alimentar o ST export ao pipeline devolve silenciosamente tokens não poolados [10]; para usar o ST export é preciso `model_file_name: 'sentence_transformers'` e ler a saída direto da sessão. (b) no wasm o dtype default é q8, que mapeia para o sufixo `_quantized`, não `_int8` [10]. Os arquivos int8/q8 da Xenova foram gerados com `per_channel: true`, `reduce_range: true`, `QInt8` [13].

O ponto prático: o app já está na família certa (`last_hidden_state` + pooling no lado do host). Trocar mean por CLS é ler o índice 0 em vez de fazer a média, e depois L2. É uma linha.

### 4. O que isso implica para o app

Por que mean funciona "razoavelmente": as camadas superiores do XLM-R carregam sinal semântico distribuído, e a média de todos os tokens ainda correlaciona com tópico e, sobretudo, com sobreposição lexical. Ela funciona como um "bag of contextual tokens" barato. Mas nada no treino vinculou `norm(mean(H))` a `norm(H[0])`: é um funcional linear diferente dos mesmos hidden states, e a direção da média deriva com a contagem de tokens, o que injeta um viés de comprimento que o CLS não tem. Não existe rotação do lado da query que compense isso. Esse parágrafo é raciocínio derivado da definição verificada [3][4], não um resultado medido; a única afirmação de autoridade é a da BAAI, sem número [6].

Daí a falha específica em paráfrase longa em português: quando a query não compartilha tokens com a nota, o que resta é só a geometria treinada, e essa geometria é a do CLS. E é justamente aí que o denso do M3 é forte: MKQA pt, Recall@100, denso 76.3, acima de mE5-large 73.5 e OpenAI-3 73.7, abaixo apenas de E5-mistral-7b 77.5 [3]. Você está pagando por um modelo cross-lingual bom e lendo o vetor errado.

Sobre o controle curto que caiu de rank 5 para ~176: **essa medição não é evidência contra o CLS**. Se o índice global continua em mean e só a amostra (ou só a query) foi re-poolada em CLS, a comparação é entre espaços incompatíveis, e a própria Cloudflare trata os dois como espaços mutuamente não compatíveis [14][6]. Isso vale nos dois sentidos: os 4 ganhos de rank 500-3000 para 1-2 também estão contaminados, só que na direção favorável. O mecanismo plausível para uma query curta de palavra-chave é que o mean a resolvia por sobreposição lexical média, que o CLS abstrai; o remédio para isso não é pooling, é sinal lexical (FTS5, que você já tem) na fusão, ou pool maior antes do reranker.

### 5. Custo real de migrar e alavancas para reduzir

No throughput medido, 140k chunks custam 140000/4.2 = 9.3 h a 140000/3.6 = 10.8 h [45]. Armazenamento por versão de vetor: 140k x 1024 dims x 4 B = 573 MB em fp32, 287 MB em fp16, 143 MB em int8 escalar [45]. Manter as duas versões ao mesmo tempo custa ~0.6 GB, o que é irrelevante. A restrição da migração incremental é **correção** (nunca misturar versões numa mesma comparação), não espaço.

Alavancas, com o que dá para prometer:

| Alavanca | Faixa esperada | Base |
|---|---|---|
| Ordenar por comprimento, padding para o maior do batch | 1.0x a alta, depende do histograma | é o que o FlagEmbedding [5] e o sentence-transformers fazem; o ganho é E[max no batch]/E[comprimento real], então meça o histograma antes |
| Sweep de batch size | poucos por cento a ~1.5x | throughput em CPU não é monotônico em batch, tem pico [20] |
| `session.intra_op.allow_spinning=1` | pequeno mas grátis | os prebuilts do ort são CLIENT_PACKAGE_BUILD, com spinning desligado por padrão [26][27] |
| Threads intra-op | A/B, sem garantia | default é o número de cores físicos, aqui 10 (4 P + 6 E); ORT já tem mitigação para híbrido [28] |
| Re-quantizar com preset arm64 (`reduce_range=False`) | recupera 1 bit de peso, grátis | reduce_range existe para saturação AVX2/AVX512, não há esse problema em ARM [24][25] |
| fp16 no CPU EP | **negativo** | o CPU EP não tem kernels fp16, insere Casts e computa em fp32 [23] |
| CoreML | entre pior que CPU e desconhecido | MLProgram é a única forma viável, mas faltam Gather, Where, Expand, Equal, Not, ConstantOfShape e CumSum, que o grafo bge-m3 contém [21][13]; nenhuma tabela CoreML tem operador quantizado, então int8 e CoreML são mutuamente exclusivos [21]; fp32 é barrado da ANE por construção [22]; fragmentação ficar mais lenta que o CPU EP é modo de falha documentado [38][39]. Cheque em minutos com `check_onnx_model_mobile_usability` antes de escrever Rust [38][43] |

Não existe número publicado de speedup do CoreML EP para BGE-M3 ou qualquer embedder classe BERT-large em Apple silicon; procurei e não achei. O único número medido de precisão para int8 é o agregado do sentence-transformers, 3.23x sobre PyTorch fp32 com perda de qualidade "menor que meio por cento", em x86 i7-13700K [20], e a quantização é lossy por definição [24]. Migração incremental com vetores versionados é o padrão operacional para exatamente este problema; dual-index serving é a baseline nomeada na literatura [29].

### 6. Alternativas sem re-embed, e o que esperar

**(a) Hybrid sparse.** Não é sem re-embed: os pesos sparse são função por token do `last_hidden_state`, então exigem a mesma passada completa pelo encoder [3][4]. E no seu cenário exato rende quase nada: MKQA pt, denso 76.3, denso+sparse 76.5 (+0.2); sparse sozinho 50.9, ou seja 25.4 pontos pior [3]. Sparse paga em monolíngue (MIRACL 67.8 para 68.9) e em documento longo (MLDR 52.5 para 64.8) [3], nenhum dos dois é paráfrase entre idiomas. Se ainda assim quiser, o export multi-cabeça já existe pronto [44].

**(b) Tradução ou expansão de query.** Tradução é medidamente pior que usar o denso multilíngue: BGE-M3 96.2%/95.6% Recall@15 contra Google Translate 92.4%/93.0% [36], e um estudo CLIR de 2025 conclui que sistemas devem priorizar embeddings multilíngues sobre pipelines de tradução [40]. Expansão generativa tem ganho publicado **só sobre BM25**: Hit@10 69.35% para 84.06% em queries curtas, Recall@10 38.55% para 40.47% em queries longas [41]; não transfere para índice denso.

**(c) Pool maior + reranker.** A única alternativa que de fato não toca no corpus. O reranker é o maior ganho medido publicado: falha do top-20 de 5.7% para 1.9%, redução de 67%, rescorando um pool de 150 [30]. Mas rerank não conserta recall: com o chunk certo em rank 500-3000, um pool de 50 pares nunca o vê. Aumentar o pool custa uma forward de cross-encoder por candidato, serializada [32].

**(d) Chunking.** Qualquer estratégia de chunk invalida os vetores por definição, então falha o requisito "sem re-embed" [30]. Headers contextuais gerados por LLM são o maior efeito não relacionado a modelo (-35% sozinho, -49% com BM25 contextual) mas custam uma geração por chunk [30]. Chunks menores não são ganho direcional [37]. Para referência, a BAAI recomenda ~512 tokens [18] e um benchmark comunitário com bge-m3 denso deu MRR@10 0.893 com chunks de 512 contra 0.825 com o artigo inteiro em 8192 [19].

**(e) Trocar de modelo para um que use mean nativamente.** multilingual-e5-large de fato tem `pooling_mode_mean_tokens: true` e prefixos `query:`/`passage:` obrigatórios [35], mas perde 2.8 pontos no cenário exato (73.5 vs 76.3 em MKQA pt) [3], tem teto de 512 tokens contra 8192 (forçando re-chunk de todo o vault) [35], e custa um re-embed completo do mesmo jeito. O único upside real é tamanho (mE5-small 118 MB int8 contra 568 MB do bge-m3) [42][12], e tamanho não é o seu problema.

### 7. Recomendação

Faça o CLS. Ele é a definição do modelo em quatro fontes primárias independentes [1][3][4][5], e mean pooling é uso indevido documentado [6][14][15], não uma escolha de tuning. Nenhuma das alternativas (a) a (e) substitui isso: (a) e (c) ficam em cima dos vetores errados, (b) reescreve a query no mesmo espaço errado, (d) e (e) custam re-embed do mesmo jeito. Faça com risco mínimo: adicione uma coluna de versão de pooling ao vetor, re-embed incremental em background (as duas versões coexistindo custam ~0.6 GB [45]), com regra dura de nunca comparar versões diferentes na mesma consulta, e mantenha o índice v1 servindo até a v2 fechar 100%. Só então rode o fixture de 19 queries, porque qualquer número tirado de índice misto (inclusive o rank 5 para 176) não é medição, é ruído de espaços incompatíveis [14]. Antes de escrever qualquer Rust de CoreML, gaste os 10 minutos do `check_onnx_model_mobile_usability` [38]; e antes de comprar batch maior, olhe o histograma de comprimento de chunk e ligue ordenação por comprimento com padding para o maior do batch [5][20]. Para o b02 (reranker), trate como bloqueado pela migração: re-meça depois da v2 completa, e enquanto isso aplique as correções baratas que independem do pooling, ou seja, pool de 50 para 150 a 200 candidatos [30][3], `max_length` de 512 a 1024 no par com truncamento `only_second` [31][34], e sigmoid sobre o logit cru em vez do pipeline `text-classification`, que faz softmax sobre um único logit e devolve 1.0 constante [33].


## Recomendação

Faça o CLS pooling. Ele é a definição do modelo em quatro fontes primárias independentes (1_Pooling/config.json, o paper, o FlagEmbedding e o grafo ONNX do Optimum), e mean pooling é uso indevido documentado, não uma escolha de tuning; nenhuma alternativa sem re-embed substitui isso, porque todas ficam em cima de vetores lidos no espaço errado. Execute com risco mínimo: coluna de versão de pooling no vetor, re-embed incremental em background (as duas versões coexistem por ~0.6 GB), regra dura de nunca comparar versões diferentes na mesma consulta, e v1 servindo até a v2 fechar 100% do índice. Só depois disso rode o fixture de 19 queries; a regressão de rank 5 para ~176 foi medida em índice misto e não é evidência contra o CLS (nem os 4 ganhos são evidência a favor). As 10 h são reais (9.3 a 10.8 h no throughput medido) mas são background, não um experimento; antes de otimizar, meça o histograma de comprimento de chunk, ligue ordenação por comprimento com padding para o maior do batch e faça sweep de batch; não use fp16 no CPU EP e rode o check_onnx_model_mobile_usability antes de investir em CoreML. Para o b02 (reranker), trate como bloqueado pela migração e re-meça depois da v2; enquanto isso aplique o que independe do pooling: pool de 50 para 150 a 200 candidatos, max_length 512 a 1024 no par com truncamento only_second, e sigmoid sobre o logit cru em vez do pipeline text-classification, que devolve 1.0 constante.

## Fontes

1. [1] BAAI/bge-m3 1_Pooling/config.json — https://huggingface.co/BAAI/bge-m3/raw/main/1_Pooling/config.json
2. [2] BAAI/bge-m3 modules.json — https://huggingface.co/BAAI/bge-m3/raw/main/modules.json
3. [3] BGE-M3 paper, arXiv:2402.03216v3 (secs. 3.2, 3.3, 3.4, Tabelas 2/3/4, notas 6 e 7) — https://arxiv.org/html/2402.03216v3
4. [4] FlagEmbedding, m3/modeling.py (_dense_embedding, _sparse_embedding, _colbert_embedding, F.normalize) — https://github.com/FlagOpen/FlagEmbedding/blob/master/FlagEmbedding/finetune/embedder/encoder_only/m3/modeling.py
5. [5] FlagEmbedding, inference/embedder/encoder_only/m3.py (DEFAULT_POOLING_METHOD, normalize_embeddings, sort by length) — https://github.com/FlagOpen/FlagEmbedding/blob/master/FlagEmbedding/inference/embedder/encoder_only/m3.py
6. [6] FlagEmbedding, research/baai_general_embedding/README.md ('significant decrease in performance' com mean pooling) — https://raw.githubusercontent.com/FlagOpen/FlagEmbedding/master/research/baai_general_embedding/README.md
7. [7] BAAI/bge-m3 config.json e sentence_bert_config.json — https://huggingface.co/BAAI/bge-m3/raw/main/config.json
8. [8] BAAI/bge-m3 model card, special_tokens_map.json e tokenizer_config.json — https://huggingface.co/BAAI/bge-m3/raw/main/README.md
9. [9] Xenova/bge-m3 model card (pooling: 'cls', normalize: true) — https://huggingface.co/Xenova/bge-m3
10. [10] transformers.js, pipelines/feature-extraction.js, utils/tensor.js, utils/dtypes.js, models/session_config.js — https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/pipelines/feature-extraction.js
11. [11] optimum-onnx, exporters/onnx/model_configs.py e model_patcher.py (SentenceTransformersTransformerOnnxConfig) — https://github.com/huggingface/optimum-onnx/blob/main/optimum/exporters/onnx/model_configs.py
12. [12] HF API, listagem de blobs de Xenova/bge-m3 (tamanhos e as duas famílias ONNX) — https://huggingface.co/api/models/Xenova/bge-m3?blobs=true
13. [13] Xenova/bge-m3 quantize_config.json (per_channel, reduce_range, QInt8, op_types) — https://huggingface.co/Xenova/bge-m3/raw/main/quantize_config.json
14. [14] Cloudflare Workers AI changelog 2025-04-11 (opção pooling: cls, incompatibilidade entre espaços) — https://developers.cloudflare.com/changelog/post/2025-04-11-new-models-faster-inference/
15. [15] HF discussion BAAI/bge-m3 #69 (fallback silencioso para mean pooling) — https://huggingface.co/BAAI/bge-m3/discussions/69
16. [16] sentence-transformers issue #3536 (regressão para mean pooling em v5; -0.30347106 vs -0.030682037) — https://github.com/huggingface/sentence-transformers/issues/3536
17. [17] arXiv:2601.21525v1, LMK pooling (Tabela 1, CLS vs mean em ModernBERT; mecanismo RoPE) — https://arxiv.org/html/2601.21525v1
18. [18] HF discussion BAAI/bge-m3 #59 (recomendação de chunk ~512 tokens) — https://huggingface.co/BAAI/bge-m3/discussions/59
19. [19] Benchmark comunitário, chunk 512 vs janela 8192 com bge-m3 denso (MRR@K) — https://saeedesmaili.com/notes/to-chunk-or-not-to-chunk-with-the-long-context-single-embedding-models/
20. [20] sentence-transformers, docs efficiency.rst (metodologia de sweep de batch; 3.23x onnx-qint8, perda <0.5%, hardware x86) — https://github.com/huggingface/sentence-transformers/blob/main/docs/sentence_transformer/usage/efficiency.rst
21. [21] ONNX Runtime, CoreML Execution Provider doc (tabelas NeuralNetwork e MLProgram, RequireStaticInputShapes, ModelCacheDirectory) — https://github.com/microsoft/onnxruntime/blob/gh-pages/docs/execution-providers/CoreML-ExecutionProvider.md
22. [22] Apple coremltools, typed execution ('Only the NE is barred ... float 32 precision') — https://apple.github.io/coremltools/docs-guides/source/typed-execution.html
23. [23] ONNX Runtime, float16 doc (CPU sem kernels fp16, Casts inseridos) — https://github.com/microsoft/onnxruntime/blob/gh-pages/docs/performance/model-optimizations/float16.md
24. [24] ONNX Runtime, quantization doc (lossy; per-channel e reduce-range; reduce_range é mitigação x86, não ARM) — https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html
25. [25] optimum-onnx, onnxruntime/configuration.py (AutoQuantizationConfig.arm64, reduce_range=False) — https://github.com/huggingface/optimum-onnx/blob/main/optimum/onnxruntime/configuration.py
26. [26] pykeio/ort-artifacts-staging, src/build.ts (KleidiAI ON em aarch64; CLIENT_PACKAGE_BUILD=ON) — https://github.com/pykeio/ort-artifacts-staging/blob/main/src/build.ts
27. [27] ONNX Runtime, core/util/thread_utils.h (allow_spinning=false sob ORT_CLIENT_PACKAGE_BUILD) — https://github.com/microsoft/onnxruntime/blob/main/onnxruntime/core/util/thread_utils.h
28. [28] ONNX Runtime, threading doc (intra_op default = cores físicos) e threadpool.cc (mitigação híbrida) — https://github.com/microsoft/onnxruntime/blob/gh-pages/docs/performance/tune-performance/threading.md
29. [29] Drift-Adapter, arXiv:2509.23471 (custo de re-encode, dual-index serving como baseline, 95-99% de recall recuperado) — https://arxiv.org/abs/2509.23471
30. [30] Anthropic, Contextual Retrieval (reranking 5.7% -> 1.9%, pool 150 -> top 20; contextual embeddings -35%, com BM25 -49%) — https://www.anthropic.com/news/contextual-retrieval
31. [31] BAAI/bge-reranker-v2-m3 discussion #9 (fine-tune com max_length 1024; recomendação) — https://huggingface.co/BAAI/bge-reranker-v2-m3/discussions/9
32. [32] HF API, blobs de onnx-community/bge-reranker-v2-m3-ONNX (tamanhos por precisão) — https://huggingface.co/api/models/onnx-community/bge-reranker-v2-m3-ONNX?blobs=true
33. [33] transformers.js, pipelines/text-classification.js (softmax sobre logit único devolve 1.0) — https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/pipelines/text-classification.js
34. [34] FlagEmbedding, inference/reranker/encoder_only/base.py (par [query, passage], truncation='only_second', max_length 512, sigmoid) — https://github.com/FlagOpen/FlagEmbedding/blob/master/FlagEmbedding/inference/reranker/encoder_only/base.py
35. [35] intfloat/multilingual-e5-large (1_Pooling mean=true, prefixos obrigatórios, sentence_bert_config max_seq_length 512) — https://huggingface.co/intfloat/multilingual-e5-large
36. [36] arXiv:2608.12820, query translation vs cross-lingual embeddings (BGE-M3 96.2/95.6 vs Google Translate 92.4/93.0 Recall@15) — https://arxiv.org/abs/2608.12820
37. [37] arXiv:2505.21700, Rethinking Chunk Size For Long-Document Retrieval — https://arxiv.org/abs/2505.21700
38. [38] ONNX Runtime, tools/python/util/mobile_helpers/usability_checker.py (aviso de partições e recomendação contra o EP) — https://github.com/microsoft/onnxruntime/blob/main/tools/python/util/mobile_helpers/usability_checker.py
39. [39] ONNX Runtime issue #19887 (relato real: 16 partições cobrindo 25% dos nós, performance igual à CPU) — https://github.com/microsoft/onnxruntime/issues/19887
40. [40] arXiv:2511.19324, What Drives Cross-lingual Ranking (priorizar embeddings multilíngues sobre tradução) — https://arxiv.org/abs/2511.19324
41. [41] arXiv:2511.19325, Generative Query Expansion with Multilingual LLMs for CLIR (ganhos medidos apenas sobre BM25) — https://arxiv.org/html/2511.19325
42. [42] HF API, blobs de Xenova/multilingual-e5-small (118 MB int8) — https://huggingface.co/api/models/Xenova/multilingual-e5-small
43. [43] pykeio/ort, src/ep/coreml.rs e docs de prebuilt binaries (superfície de opções do CoreML EP; macOS já vem com o EP) — https://github.com/pykeio/ort/blob/main/src/ep/coreml.rs
44. [44] aapot/bge-m3-onnx (grafo único emitindo dense + sparse + ColBERT, script de export publicado) — https://huggingface.co/aapot/bge-m3-onnx
45. [45] Aritmética local sobre os números do diagnóstico (140k chunks / 3.6-4.2 chunks/s; 140k x 1024 dims x 4 B). Não é fonte externa.