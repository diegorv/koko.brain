Insumos do vault (140.307 chunks, ~216 MB, 3,9 chunks/s, nota esperada em rank 500-3000) vêm do seu diagnóstico local e não foram verificados de forma independente; só a aritmética sobre eles é minha. Baseline: 140.307 / 3,9 = 9,99 h de re-embed [29]. O `embedder.rs` já corta em 512 tokens e usa lote 8 [29].

### Voyage AI

**Modelos.** Geração atual é a família Voyage 4 (voyage-4-large, voyage-4, voyage-4-lite, voyage-4-nano, voyage-code-4): 32.000 tokens de contexto, 1024 dims por padrão com MRL 256/512/2048, saídas float/int8/uint8/binary/ubinary [1]. voyage-3-large, voyage-3.5, voyage-multilingual-2 e voyage-code-3 estão como legado [1]. Há ainda voyage-context-4 (embedding contextualizado de chunk): 32.000 tokens por chunk, 120.000 no total com auto-chunking [7]. Rerankers rerank-3 e rerank-3-lite existem em Preview, 32.000 tokens, máximo 1.000 documentos [8].

**Qualidade multilíngue.** As alegações da Voyage são agregadas, nunca por idioma: o post do voyage-3.5 cita 62 datasets em 26 idiomas sem recorte de português [6]; o do voyage-4 mede 29 datasets do RTEB e reporta +3,87% sobre Gemini Embedding 001, +8,20% sobre Cohere Embed v4 e +14,05% sobre OpenAI v3 Large, sem baseline BGE-M3 e sem menção a português [2]. A melhor evidência em português é o MTEB-BR (93 modelos, 22 tarefas nativas): voyage-context-4 em 4o (0,6676) e voyage-4-large em 9o (0,6532), com o aberto Qwen3-Embedding-8B em 2o (0,6704) na frente de todo modelo Voyage [5]. Um delta direto Voyage vs BGE-M3 em português NÃO FOI ENCONTRADO: bge-m3 está no pool do MTEB-BR mas sem média das 22 tarefas na tabela ranqueada, e a Voyage nunca compara com BGE-M3 [5].

**Custo estimado.** Premissa explícita: ~3,5 caracteres por token para markdown misto pt/en (a média de 5 caracteres por token da própria Voyage é otimista para inglês; português fragmenta mais, e URLs e sintaxe markdown puxam para baixo) [10]. 216 MB dão ~62M tokens (faixa 55M-75M), o que cabe inteiro nos 200M tokens gratuitos por conta, válidos para voyage-4-large, voyage-4, voyage-4-lite, voyage-context-4 e voyage-code-4 [9]: o índice inicial custa zero. A preço de tabela, se o free tier não valesse: US$ 1,10-1,50 no lite (US$ 0,02/M), US$ 3,30-4,50 no voyage-4 (US$ 0,06/M), US$ 6,60-9,00 no large ou context-4 (US$ 0,12/M) [9]. Query de ~20 tokens: US$ 0,0000024; 1M de queries: US$ 2,40 [9]. Rerank hospedado com 50 pares de ~440 tokens: ~22K tokens/query, US$ 0,0011 no rerank-3, ~9.000 queries dentro dos 200M gratuitos [9].

**Tempo de indexação.** Tier 1: 3M TPM (voyage-4-large e context-4), 8M TPM (voyage-4), 16M TPM (voyage-4-lite); dobra com US$ 100 pagos, triplica com US$ 1.000 [11]. Para 62M tokens: ~21 min, ~8 min e ~4 min respectivamente, contra 9,99 h locais [11][29]. RPM não é gargalo (141 requisições a 1.000 textos) [11]; o teto real de lote é tokens por requisição: 120K nos large (~272 chunks/req, ~516 requisições) e 320K nos standard (~727 chunks/req, ~193) [14].

**Privacidade (redação exata).** O padrão é armazenar e treinar. FAQ: "customers can opt-out from Voyage storing and using their data for future model training so that there is a zero-day retention of the data" [12]. Para sair é preciso "have a payment method on file and be an organization Admin" [12], e é porta de mão única: "You won't be able to opt-in again in the dashboard after you opt out." [12]. Residência não é garantida: a política diz que os dados "may be transferred to - and maintained on - computers located outside of your state, province, country" [13]. Voyage é SOC 2, relatório via trust center Vanta [13]. Não há on-prem nem VPC documentado; as superfícies alternativas são MongoDB Atlas, GCP Vertex Model Garden, AWS Marketplace e Azure Managed Applications [15]. Com `private/` e `personal/` no vault, este é o ponto decisivo.

**Offline.** A API não roda offline. A única rota Voyage offline é o voyage-4-nano: Apache-2.0, 340M params (180M não-embedding + 160M de embedding), 32.000 de contexto, MRL 2048/1024/512/256, treinado com quantização, e compartilha espaço de embedding com os modelos hospedados, permitindo misturar local e API sem reindexar [3]. Existe build ONNX Apache-2.0 (model_quantized 421,6 MB, q4 243,0 MB), com prefixo de query "Represent the query for retrieving supporting documents: " [4]. Duas ressalvas: o exemplo publicado é onnxruntime Python e não a crate `ort`, então compatibilidade com o seu pipeline é inferência, não evidência [4]; e a qualidade do nano em português NÃO FOI MEDIDA (ausente do MTEB-BR) [5]. A latência absoluta dos rerankers Voyage também NÃO FOI ENCONTRADA em fonte primária, então não dá para comparar de frente com os seus 5-10 s [8].

### Alternativas locais

| Modelo | Params | Dims | Pooling / prefixo | MTEB multilíngue retrieval (fonte) | Export ONNX | Viabilidade no app | Re-embed estimado |
|---|---|---|---|---|---|---|---|
| BGE-M3 (atual) | 568M | 1024 | hoje mean; sem prefixo por design [16] | 54,60 MTEB Multi v2 [17]; PT 0,6351, 4o entre os viáveis em CPU [18] | int8 569,7 MB (Xenova) [28] | em produção [29] | 9,99 h se os vetores mudarem [29] |
| EmbeddingGemma-300m | 308M, ~100M computáveis [21] | 768, MRL 512/256/128 [19] | mean + 2 densas + L2 dentro do grafo; prefixos assimétricos "task: search result / query: " e "title: none / text: " [19] | 62,49 MTEB Multi v2 [17]; PT 0,6535, 1o entre os viáveis [18] | q8 308,9 MB, q4 196,7 MB [19] | alta: 2 entradas int64, saída `sentence_embedding` pronta (você apaga o mean pooling); licença Gemma e repo do Google é gated [19][20]; análogo Rust+ort mede ~280-295 ms por request, mas em Graviton2, não Apple silicon [30] | ~3,3 h estimado pela proporção de params computáveis (100M vs 303M), não medido [21][25] |
| snowflake-arctic-embed-l-v2.0 | 568M / 303M | 1024, MRL 256 | CLS + prefixo "query: " só na query [25] | ausente da tabela MTEB Multi v2 [17]; PT 0,6361, +0,001 sobre BGE-M3 [18] | int8 569,7 MB [25] | alta (mesmo XLM-R-large do BGE-M3) [25] | ~10 h [29] |
| Qwen3-Embedding-0.6B | 596M | 1024, MRL 32-1024 | last-token + instrução só na query [22] | 64,65 MTEB Multi v2 [17]; PT 0,6034, ABAIXO do BGE-M3 [18] | export é decoder genai: 59 entradas, 57 saídas, ~470 MB de KV descartado por lote 8x512 [22] | baixa [22] | ~14,6 h (1,46x o compute do BGE-M3) mais o KV [22][29] |
| harrier-oss-v1 270m / 0.6b | 270M / 0,6B | 640 / 1024 | last-token + L2, instrução na query [23] | 66,5 / 69,0 MTEB v2 [23]; PT 0,5713 / 0,6196, ABAIXO do BGE-M3 [18] | quantized 343,7 MB, q4 205,5 MB [23] | média, MIT [23] | não estimado |
| granite-embedding-311m-r2 | 311M | 768 | CLS segundo o card (a fonte secundária que dizia mean foi refutada na verificação) [24] | PT 0,6074, ABAIXO do BGE-M3 [18] | quint8_avx2 313,4 MB [24] | média, Apache-2.0 [24] | não estimado |
| multilingual-e5-large-instruct | 560M | 1024 | mean, sem prefixo em documento [26] | 57,12 MTEB Multi v2 [17]; PT 0,5991 [18] | só fp32 (2.235,4 MB), sem int8 e sem export comunitário [26] | bloqueado [26] | n/a |

Descartados: jina-embeddings-v3 e v5 (CC BY-NC 4.0, uso comercial barrado, sinalizado pelo próprio MTEB-BR [5]; specs do v5 foram refutadas na verificação, a licença não); nomic-embed-text-v2-moe (nenhum ONNX no repo, roteamento MoE não traçável [31]); mxbai-embed-large-v1 (só inglês, 0,4018 em PT [18]).

### O que o seu caso pede

**Paráfrase pt contra artigos en.** É o eixo que mais importa e o menos coberto: a única evidência primária direta é o MKQA do paper do BGE-M3 (query em 25 idiomas contra Wikipédia em inglês, Recall@100), onde o BGE-M3 denso faz 76,3 em português e 75,1 de média, acima do mE5-large (73,5 / 70,9) [27]. Não existe número pt->en publicado para EmbeddingGemma, harrier, granite-r2, jina-v5 ou Qwen3: NÃO ENCONTRADO. MTEB-BR e MTEB-PT são monolíngues [5]. Conclusão: nenhum benchmark decide isso por você, só o seu fixture de 19 queries decide.

**Notas pessoais e privadas.** Todos os candidatos locais rodam em processo via `ort`, com rede apenas no download único do modelo, então privacidade não diferencia entre eles [29]. Ela só diferencia local contra Voyage, e ali é decisiva [12][13].

**Uso offline.** Só as opções locais e o voyage-4-nano [3]; qualquer chamada de API mata a busca semântica sem rede.

**Reranker já existente.** Os 5-10 s por query são 50 forward passes do cross-encoder bge-reranker-v2-m3 (568M, int8, ~10 s p50 medido em Apple silicon), enquanto o embedder contribui um único passe por query [29]. Trocar embedder não muda latência. E como o reranker já colocaria as notas certas em 1o-12o se elas chegassem ao pool, o defeito é recall do primeiro estágio, não ordenação.

## Matriz

| Opção | Qualidade esperada | Custo de migração | Privacidade | Offline | Risco |
|---|---|---|---|---|---|
| BGE-M3 + correção CLS | Seu diagnóstico: 4 de 5 paráfrases resolvidas, 1 regressão em query curta; PT 0,6351 [18] | ~1 h de código (estimativa minha) + 9,99 h de máquina [29] | Total, roda em processo [29] | Sim | Baixo e reversível; a regressão da query curta segue em aberto |
| EmbeddingGemma-300m (melhor local) | 1o entre os locais viáveis em CPU: PT 0,6535 [18]; 62,49 vs 54,60 do BGE-M3 no MTEB Multi v2 [17]; zero evidência pt->en | ~4-6 h de código (estimativa minha: prefixos nos dois lados, 768 dims, ler `sentence_embedding`) + ~3,3 h de re-embed [19][21] | Total, roda em processo [29] | Sim | Contexto cai para 2.048 tokens, irrelevante porque você já corta em 512 [29]; licença Gemma e repo do Google gated [20] |
| Voyage AI (context-4 ou 4-large) | 4o e 9o no MTEB-BR, atrás de um aberto de 8B [5]; sem número pt->en e sem baseline BGE-M3 [2][5] | ~6-8 h de código (estimativa minha: input_type, HTTP, lote por teto de tokens [14]) + ~21 min de indexação [11]; US$ 0 no free tier de 200M, US$ 6,60-9,00 a preço de tabela [9] | Padrão é reter e treinar; opt-out exige cartão e admin e é irreversível [12]; sem residência [13] | Não, salvo voyage-4-nano local [3] | Alto com `private/` e `personal/`; rerank-3 em Preview [8] |
| Manter como está | Recall continua quebrado: nota esperada em 500-3000, fora do pool de 50 do reranker | 0 h | Total [29] | Sim | O reranker já resolveria (1o-12o) se a nota chegasse ao pool; o problema não se corrige sozinho |

## Recomendação

Caminho principal: EmbeddingGemma-300m local, mas só depois de validar, nunca antes.
Validação barata, ~30 min em vez de 10 h: indexe 5% aleatório das notas (~476 notas, ~7.015 chunks, 29,98 min a 3,9 chunks/s [29]) mais as 17 notas esperadas do fixture, e rode as 19 queries contra esse subconjunto comparando o rank da nota esperada.
Rode o mesmo protocolo em duas configs, BGE-M3 com CLS e EmbeddingGemma, na mesma amostra; a comparação de ranks dentro do subconjunto é justa e custa uma hora somada.
Se EmbeddingGemma vencer, faça o re-embed completo (~3,3 h estimado [21]) e aproveite para encolher o índice: 768 dims dão 431,0 MB em f32 contra 574,7 MB hoje, e 256 via MRL dão 143,7 MB [19].
Fallback: BGE-M3 com pooling CLS. É MIT, zero dependência nova, e é o único modelo do conjunto com evidência primária pt->en a favor (MKQA 76,3 R@100 em português [27]). Se ele empatar com EmbeddingGemma no fixture, fique com ele.
Não recomendo Voyage como principal: `private/` e `personal/` contra retenção padrão com opt-out irreversível e sem residência de dados [12][13], e o MTEB-BR mostra modelo aberto na frente de todo Voyage em português [5]. Se ainda quiser Voyage, use voyage-4-nano local [3] e submeta ao mesmo teste de 30 min.
Reranker: não mexa agora. Os 5-10 s são os 50 passes do cross-encoder, e trocar embedder não muda isso [29]; como ele já ranquearia as notas em 1o-12o, o alvo é recall do primeiro estágio.
Se depois da troca ainda faltar recall, aumente o pool de 50 antes de trocar o cross-encoder, e meça a latência de novo; latência absoluta dos rerankers hospedados da Voyage não foi encontrada em fonte primária [8], então essa comparação não pode ser feita no papel.

## Fontes

1. [1] Voyage AI, Text Embeddings (tabela de modelos): https://docs.voyageai.com/docs/embeddings
2. [2] Voyage AI blog, voyage-4 (2026-01-15): https://blog.voyageai.com/2026/01/15/voyage-4/
3. [3] Hugging Face, voyageai/voyage-4-nano (pesos abertos Apache-2.0): https://huggingface.co/voyageai/voyage-4-nano
4. [4] Hugging Face, onnx-community/voyage-4-nano-ONNX: https://huggingface.co/onnx-community/voyage-4-nano-ONNX
5. [5] MTEB-BR, benchmark nativo de português (arXiv 2607.04581): https://arxiv.org/abs/2607.04581
6. [6] Voyage AI blog, voyage-3.5 (2025-05-20): https://blog.voyageai.com/2025/05/20/voyage-3-5/
7. [7] Voyage AI blog, voyage-context-4 (2026-06-29) e docs de contextualized chunk embeddings: https://blog.voyageai.com/2026/06/29/voyage-context-4/
8. [8] Voyage AI, Reranker (rerank-3 / rerank-3-lite, Preview): https://docs.voyageai.com/docs/reranker
9. [9] Voyage AI, Pricing: https://docs.voyageai.com/docs/pricing
10. [10] Voyage AI, Tokenization: https://docs.voyageai.com/docs/tokenization
11. [11] Voyage AI, Rate Limits: https://docs.voyageai.com/docs/rate-limits
12. [12] Voyage AI, FAQ (retencao e opt-out de zero-day retention): https://docs.voyageai.com/docs/faq
13. [13] Voyage AI, Privacy Policy e trust center SOC 2: https://www.voyageai.com/privacy
14. [14] Voyage AI, Embeddings API reference (input_type, limites de lote): https://docs.voyageai.com/reference/embeddings-api
15. [15] Voyage AI blog, novos modelos e disponibilidade ampliada (2026-01-15): https://blog.voyageai.com/2026/01/15/new-models-and-expanded-availability/
16. [16] Hugging Face, BAAI/bge-m3 (card + config.json): https://huggingface.co/BAAI/bge-m3
17. [17] EmbeddingGemma technical report, Tabela 5 MTEB(Multilingual v2) (arXiv 2509.20354): https://arxiv.org/html/2509.20354v2
18. [18] Dataset MTEB-BR/mteb-pt-results, medias de 6 tarefas de retrieval recomputadas dos JSONs por tarefa: https://huggingface.co/datasets/MTEB-BR/mteb-pt-results
19. [19] Hugging Face, onnx-community/embeddinggemma-300m-ONNX (grafo, prefixos, tamanhos de arquivo): https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX
20. [20] Hugging Face, google/embeddinggemma-300m (repo gated, licenca Gemma): https://huggingface.co/google/embeddinggemma-300m
21. [21] Google Developers Blog, Introducing EmbeddingGemma (2025-09-04): https://developers.googleblog.com/en/introducing-embeddinggemma/
22. [22] Hugging Face, Qwen/Qwen3-Embedding-0.6B e onnx-community/Qwen3-Embedding-0.6B-ONNX (export genai, config.json): https://huggingface.co/Qwen/Qwen3-Embedding-0.6B
23. [23] Hugging Face, microsoft/harrier-oss-v1-270m e mirror ONNX: https://huggingface.co/microsoft/harrier-oss-v1-270m
24. [24] Hugging Face, ibm-granite/granite-embedding-311m-multilingual-r2: https://huggingface.co/ibm-granite/granite-embedding-311m-multilingual-r2
25. [25] Hugging Face, Snowflake/snowflake-arctic-embed-l-v2.0 (card, config.json, blobs ONNX): https://huggingface.co/Snowflake/snowflake-arctic-embed-l-v2.0
26. [26] Hugging Face API, intfloat/multilingual-e5-large-instruct (card e listagem de blobs, so fp32): https://huggingface.co/api/models/intfloat/multilingual-e5-large-instruct?blobs=true
27. [27] BGE-M3 paper, avaliacao MKQA (query multilingue contra corpus em ingles, arXiv 2402.03216): https://arxiv.org/html/2402.03216v4
28. [28] Hugging Face, Xenova/bge-m3 (onnx/model_quantized.onnx, 569,7 MB, o arquivo que o app baixa hoje): https://huggingface.co/Xenova/bge-m3
29. [29] Repositorio local: /Users/diegorv/Dev/pet-projects/koko/brain/src-tauri/src/semantic/model.rs (BGE_M3_EMBEDDER, BGE_RERANKER_V2_M3 com ~10 s p50 em Apple silicon, embedding_dimensions None no reranker) e /Users/diegorv/Dev/pet-projects/koko/brain/src-tauri/src/semantic/embedder.rs (INFERENCE_BATCH_SIZE = 8, clamp de 512 tokens)
30. [30] Sobolev, EmbeddingGemma inference on AWS Lambda (Rust + ort 2.0.0-rc.10, ARM64 Graviton2, ~280-295 ms warm): https://sobolev.substack.com/p/embeddinggemma-inference-on-aws-lambda
31. [31] Hugging Face, nomic-ai/nomic-embed-text-v2-moe (sem arquivos .onnx no repo): https://huggingface.co/nomic-ai/nomic-embed-text-v2-moe