### Bug fix plan (prioritized)

- **[ID 1] Vendor Dashboard crashes when stock > 1000**
  - Diagnosis: Chart/data table not virtualized; heavy client aggregation; possibly 32-bit number assumptions.
  - Fix: Server-side aggregation for widgets; add pagination/virtualization to tables; throttle chart datasets; memoize selectors.
  - Tests: Seed 5k+ products; dashboard load < 2s; charts render without freezes.
  - Acceptance: No crash at 10k rows; CPU stays < 80% for 3s during render.

- **[ID 2] Recurring invoices not generating**
  - Diagnosis: Missing/silent scheduler; non-idempotent generator; failed webhooks.
  - Fix: Add scheduled task (Supabase cron or DO worker); make generator idempotent per invoice period; structured logs + dead-letter queue for failures.
  - Tests: Backfill path generates exactly one invoice per cycle per subscription; retries don’t duplicate.
  - Acceptance: Generation success rate > 99.9% weekly; failures visible in admin log.

- **[ID 3] Negative stock allowed**
  - Diagnosis: Missing DB constraint and transactional checks on multi-location stock movements.
  - Fix: DB check constraint and guarded RPC to enforce non-negative stock; wrap sales/purchases/returns in transactions; optional config to allow negatives per tenant.
  - Tests: Attempts to oversell fail with proper error; transfers respect both locations.
  - Acceptance: Zero negative stock rows in DB; clear UX error message.

- **[ID 4] M-PESA STK push fails for some numbers**
  - Diagnosis: Phone normalization (E.164), sandbox vs live callbacks, timeout handling.
  - Fix: Normalize numbers; configurable shortcodes/callbacks per tenant; retry with exponential backoff; precise error mapping to user-facing messages.
  - Tests: Matrix of valid/invalid numbers; sandbox/live simulators; callback signature verification.
  - Acceptance: > 98% success on valid numbers; actionable error reasons on failure.

- **[ID 5] Dashboard charts not rendering**
  - Diagnosis: Null/NaN data, timezone boundaries, empty series handling.
  - Fix: Sanitize series; consistent UTC; defaults for empty datasets; guard shadcn-ui chart components.
  - Tests: Empty, sparse, and dense datasets; month boundary spans.
  - Acceptance: No runtime errors; charts show “No data” state gracefully.

### Cross-cutting hardening (short-term)

- **Validation and error model**
  - Enforce a single error envelope from `API-Reference.md`; add request validation (e.g., Zod) at all endpoints; map provider errors.
- **Pagination defaults**
  - Default `limit=20`, max `100`; ensure all list endpoints support `page/limit`.
- **Idempotency**
  - Idempotency keys on payments and recurring invoice generation.
- **Auth and multi-tenant isolation**
  - Verify RLS policies per table; ensure endpoints never accept cross-tenant IDs; sanitize logs.
- **Observability**
  - Structured logs (request_id, tenant_id, user_id); basic dashboards: error rate, p95 latency, task success.
- **Rate limiting**
  - Token/IP limits; return 429 with retry-after; client backoff.

### Endpoint coverage gaps to close (align with `API-Reference.md`)

- Ensure parity: `GET/{id}`, `PATCH/{id}`, `DELETE/{id}` where applicable for products, orders, invoices, customers, suppliers, locations.
- Add missing resources (if not present yet): `stock-transfers`, `audit-logs`, `notifications/templates`, `returns`, `cash-drawer`.
- Confirm webhooks: Paystack/M-PESA callbacks, signature verification, idempotent upserts.

### Phased system enhancement plan

- **Phase 0: Hotfixes and stability (1–2 weeks)**
  - Ship fixes for Bug IDs 1–5.
  - Implement validation/error envelope, pagination defaults.
  - Add basic observability (logs/metrics) and rate limiting.

- **Phase 1: Core hardening and DX (1–2 weeks)**
  - RLS policy audit; add missing RPCs/constraints for stock and invoices.
  - Idempotency framework for payments/recurring invoices.
  - Postman collection + envs; CI checks for lint/type/test on PR.

- **Phase 2: Enhancements module kickoff (2 weeks)**
  - Audit Logs: capture key actions (orders, stock, payments); admin list endpoint with filters.
  - Notification Center: WhatsApp templates, per-tenant settings, queued sends with status.
  - Data Export: CSV for major listings with server-side streaming.

- **Phase 3: Tenant UX and feature flags (2 weeks)**
  - Tenant-level UI customization (logo/colors, receipt/invoice templates).
  - Feature flags per tenant to gate modules (e.g., e-commerce).
  - Subscription Alerts: trial/renewal notifications via WhatsApp/email.

- **Phase 4: Performance and scale (2 weeks)**
  - Server-side pagination + virtualization across heavy pages.
  - Query tuning and caching for reports; pre-aggregations for dashboard KPIs.
  - Load test and capacity plan; optimize cold-starts.

- **Phase 5: Mobile/offline prep (exploration 2 weeks)**
  - Define offline data model and sync boundaries; printer abstraction.
  - Prototype Android cashier PWA with background sync.

- **Phase 6: E-commerce storefront (scoped discovery)**
  - Tenant store endpoints, product publishing, order sync into POS.
  - Cart/checkout, payment integration reuse, webhook mapping.

- **Phase 7: Advanced analytics and external integrations**
  - AI insights, customer segmentation, recommendations.
  - QuickBooks/KRA e-TIMS connectors with mappers and audit trails.

### QA and rollout

- **Testing**
  - Unit tests around validation and stock logic; integration tests for payments and recurring invoicing; contract tests for webhooks.
- **Rollout**
  - Feature flags for new modules; canary deploy to a subset of tenants; migrate DB with zero-downtime (create backfill → dual-write → switch).
- **Success metrics**
  - Error rate < 0.5%; dashboard p95 < 1.5s; recurring invoice success > 99.9%; payment success > 98% valid traffic.

If you want, I can translate this into actionable Jira tasks or a GitHub Projects board, mapped to milestones for Phases 0–2 next.