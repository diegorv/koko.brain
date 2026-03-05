---
tags: [debugging, incident, production]
date: 2025-01-14
---

# Debugging: Memory Leak in Worker Service

## Symptoms
- Worker pods restarting every 4-6 hours in production
- Memory usage climbs linearly from 256MB to the 2GB limit
- No errors in application logs, only OOMKilled in Kubernetes events

## Root cause investigation
1. **Heap dump analysis**: Found 847,000 retained `EventListener` objects
2. **Code review**: The `processQueue()` function registers a new listener on each invocation but never removes old ones
3. **Timeline**: Bug introduced in commit `a3f8e2c` (PR #892) — merged 3 days ago

## Fix
```javascript
// Before (leaky)
async function processQueue() {
  emitter.on('job:complete', handleComplete);
  // ...
}

// After (fixed)
async function processQueue() {
  emitter.removeAllListeners('job:complete');
  emitter.on('job:complete', handleComplete);
  // ...
}
```

## Prevention
- Added a metric for event listener count per emitter
- Set up alerting when listener count exceeds 100
- Added to PR checklist: "Are all event listeners properly cleaned up?"

## Impact
- 3 days of degraded performance
- ~200 failed background jobs (all retried successfully)
- No customer-facing impact thanks to retry mechanism
