# Roadmap

## Batch 2: source-grounded pipeline + editorial gate
- [ ] Schema: sources, raw_items, corrections, audit_log, extend articles (status, source_urls, gate_report, region, offence_type, case_status, thread_id), site_settings auto-publish switch + daily cap
- [ ] Seed 12 verified sources (official = trust_tier 1)
- [ ] Edge function: poll sources, dedupe, gate, AI summary (80-180 words, attributed), auto-publish rules, CRON_SECRET
- [ ] pg_cron every 15 min
- [ ] /admin/review queue (source vs draft, gate report, approve/reject/publish, correction, audit log)
- [ ] Backfill gate over last 30 days published, CSV report; "Source: not recorded" fallback
- [ ] First run results report
- [ ] Publish; Vercel deploy + HTTP checks (blocked: no Vercel access from here)
