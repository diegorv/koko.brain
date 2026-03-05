---
tags: [estudos, engenharia, sistemas-distribuídos]
date: 2025-01-08
---

# Notas de Estudo: Sistemas Distribuídos

## Teorema CAP
Em um sistema distribuído, é impossível garantir simultaneamente:
- **Consistency** (Consistência): Todos os nós veem os mesmos dados ao mesmo tempo
- **Availability** (Disponibilidade): Toda requisição recebe uma resposta (sem garantia de ser a mais recente)
- **Partition Tolerance** (Tolerância a Partições): O sistema continua funcionando mesmo com falhas de rede entre nós

Na prática, partições de rede são inevitáveis, então a escolha real é entre **CP** e **AP**.

## Padrões de Consistência

### Consistência Forte
Após uma escrita, qualquer leitura retorna o valor atualizado. Exemplo: banco de dados relacional com transações ACID.

### Consistência Eventual
O sistema garante que, se nenhuma nova escrita for feita, eventualmente todas as leituras retornarão o último valor escrito. Exemplo: DynamoDB, Cassandra.

### CRDT (Conflict-free Replicated Data Types)
Estruturas de dados que podem ser replicadas em múltiplos nós e resolvem conflitos automaticamente. Útil para edição colaborativa em tempo real.

## Padrões Arquiteturais

### Saga
Para transações que envolvem múltiplos serviços:
1. Cada serviço executa sua parte da transação
2. Se um passo falha, executa ações compensatórias nos passos anteriores
3. Duas abordagens: coreografia (eventos) ou orquestração (coordenador central)

### Event Sourcing
Em vez de armazenar o estado atual, armazena todos os eventos que levaram a esse estado. Vantagens:
- Histórico completo de mudanças
- Possibilidade de "rebobinar" para qualquer ponto no tempo
- Facilita auditoria e debugging

## Ferramentas que quero estudar
- [ ] Apache Kafka — streaming de eventos
- [ ] Redis Cluster — cache distribuído
- [ ] etcd — consenso distribuído (usado pelo Kubernetes)
- [ ] CockroachDB — SQL distribuído com consistência forte
