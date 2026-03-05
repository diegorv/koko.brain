---
tags: [architecture, decision, backend]
date: 2025-01-10
---

# ADR-007: Migrating from REST to GraphQL

## Context
Our current REST API has grown to 47 endpoints. Frontend teams frequently need to make multiple requests to assemble a single view, leading to waterfall loading patterns and over-fetching of data.

## Decision
We will adopt GraphQL as the primary API layer for new features, while maintaining existing REST endpoints for backward compatibility.

## Rationale
- **Reduced network overhead**: Clients request exactly the data they need
- **Stronger typing**: Schema-first development catches errors at compile time
- **Better developer experience**: Auto-generated types from schema, built-in documentation
- **Incremental adoption**: REST and GraphQL can coexist behind the same gateway

## Consequences
- Team needs GraphQL training (estimated 2 weeks ramp-up)
- Additional complexity in the API gateway layer
- Need to implement rate limiting differently (query cost analysis vs endpoint-based)

## Status
Accepted — implementation begins Sprint 14.
