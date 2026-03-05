---
tags: [incident, postmortem, infrastructure]
date: 2025-01-13
---

# Incident Postmortem: Database Outage — Jan 11

## Summary
Production PostgreSQL primary went offline for 47 minutes due to disk space exhaustion. All write operations failed. Read replicas continued serving cached data.

## Timeline (UTC-3)
| Time | Event |
|------|-------|
| 14:23 | Disk usage alert fires at 90% threshold |
| 14:25 | On-call engineer (Lucas) acknowledges alert |
| 14:31 | Disk hits 100%. PostgreSQL stops accepting writes |
| 14:33 | Customer reports start arriving via support |
| 14:40 | Lucas identifies WAL files consuming 180GB |
| 14:52 | Emergency: archived old WAL files to S3, freed 50GB |
| 14:58 | PostgreSQL resumes normal operation |
| 15:18 | All queued writes processed, full service restored |

## Root cause
The `archive_command` in PostgreSQL was failing silently for 5 days, causing WAL (Write-Ahead Log) files to accumulate instead of being archived and cleaned up. The archive script had a hardcoded path that broke during the last infrastructure migration.

## Impact
- 47 minutes of write unavailability
- ~3,200 failed API requests (all returned 503)
- No data loss — WAL replay recovered everything
- Estimated revenue impact: ~R$8,000 (failed checkout attempts)

## Action items
- [x] Fix archive_command path and verify it works
- [x] Add monitoring for WAL file count and archive lag
- [ ] Implement disk usage alerting at 70%, 80%, 90% thresholds
- [ ] Create runbook for disk space emergencies
- [ ] Schedule quarterly infrastructure config audit
- [ ] Evaluate moving to managed RDS to reduce operational burden

## What went well
- Read replicas kept the site partially functional
- Lucas responded quickly and had good troubleshooting instincts
- No data was lost thanks to WAL design
