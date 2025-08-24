## API Reference (Vibe POS)

**Version**: 1.0.0  
**Environments**:
- Dev: `https://vibenet.online`
- Live: `https://vibenet.shop`

### Conventions

- **Auth**: Bearer JWT via `Authorization: Bearer <token>` (Supabase Auth)
- **Content-Type**: `application/json` unless otherwise stated
- **Timestamps**: ISO 8601 (UTC)
- **IDs**: UUID v4
- **Pagination**: `page` (1-based), `limit` (default 20, max 100)
- **Filtering**: Common query params: `q`, `from`, `to`, `status`, `location_id`, `customer_id`
- **Errors**: Unified JSON error envelope

Error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "price must be a positive number",
    "details": { "field": "price" }
  }
}
```

### Authentication

- Supabase manages sign-in (email/password, OAuth).  
- Use returned `access_token` as the Bearer token.  
- Tokens refresh client-side; server validates per-request.

Login

```bash
curl -X POST "https://vibenet.online/api/tenant/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"strong-password"}'
```

Response (shape may vary)

```json
{
  "user": {
    "id": "c2d0b8b6-9b0d-4e2a-b1bb-7c9a1f96f2c1",
    "email": "owner@example.com",
    "tenant_id": "c3f2d6e4-5a48-4b12-9c2c-12a34bc56de7"
  },
  "access_token": "<jwt>",
  "expires_in": 3600
}
```

### Rate Limiting & Security

- Per-token and/or per-IP rate limits may apply (HTTP 429 on exceed).  
- Expose only tenant-owned data; all endpoints enforce tenant scoping under RLS.  
- Prefer idempotent writes where feasible (e.g., payments webhooks).

---

## Endpoints by Resource

The following catalog lists common operations. Request/response shapes are representative; minor differences may exist depending on implementation details.

### Tenant

- POST `/api/tenant/signup` – Create tenant and primary admin (public)
- POST `/api/tenant/login` – Login to obtain JWT (public)

Signup

```bash
curl -X POST "https://vibenet.online/api/tenant/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name":"Vibe Salon",
    "email":"owner@example.com",
    "password":"strong-password",
    "plan":"Basic"
  }'
```

Response

```json
{
  "tenant": { "id": "4e0a7c7b-1ad0-4d1f-a1a1-1a1a1a1a1a1a", "name": "Vibe Salon", "subdomain": "vibe-salon" },
  "user": { "id": "c2d0b8b6-9b0d-4e2a-b1bb-7c9a1f96f2c1", "email": "owner@example.com" }
}
```

---

### Products

- GET `/api/products` – List products
- POST `/api/products` – Create product
- GET `/api/products/{id}` – Retrieve product
- PATCH `/api/products/{id}` – Update product
- DELETE `/api/products/{id}` – Remove product

List

```bash
curl -X GET "https://vibenet.online/api/products?page=1&limit=20&q=shampoo&location_id=11111111-2222-3333-4444-555555555555" \
  -H "Authorization: Bearer <jwt>"
```

Create

```bash
curl -X POST "https://vibenet.online/api/products" \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{
    "name":"Premium Shampoo",
    "sku":"SHAM-001",
    "category_id":"9a9a9a9a-9a9a-9a9a-9a9a-9a9a9a9a9a9a",
    "unit":"pcs",
    "price":9.99,
    "cost":5.25,
    "stock":100,
    "location_id":"11111111-2222-3333-4444-555555555555"
  }'
```

---

### Orders

- GET `/api/orders` – List orders
- POST `/api/orders` – Create order
- GET `/api/orders/{id}` – Retrieve order
- PATCH `/api/orders/{id}` – Update (e.g., status)

Create

```bash
curl -X POST "https://vibenet.online/api/orders" \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{
    "customer_id":"77777777-8888-9999-aaaa-bbbbbbbbbbbb",
    "location_id":"11111111-2222-3333-4444-555555555555",
    "items":[{"product_id":"d9f9f9f9-aaaa-bbbb-cccc-ddddeeeeffff","qty":2,"price":9.99}],
    "payment_method":"cash"
  }'
```

Response (simplified)

```json
{ "order": { "id": "aaaa1111-bbbb-2222-cccc-3333dddd4444", "status": "open", "total": 19.98 } }
```

---

### Invoices

- GET `/api/invoices` – List invoices
- POST `/api/invoices` – Generate invoice from order
- GET `/api/invoices/{id}` – Retrieve invoice
- PATCH `/api/invoices/{id}` – Update invoice (e.g., due_date)

Generate from order

```bash
curl -X POST "https://vibenet.online/api/invoices" \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{ "order_id":"aaaa1111-bbbb-2222-cccc-3333dddd4444", "due_date":"2025-09-30" }'
```

---

### Payments

- POST `/api/payments` – Record payment
- GET `/api/payments/{id}` – Retrieve payment

Record

```bash
curl -X POST "https://vibenet.online/api/payments" \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{ "invoice_id":"5555eeee-6666-ffff-7777-888899990000", "amount":19.98, "method":"cash" }'
```

---

### Reports

- GET `/api/reports/sales` – Sales report

Query

```bash
curl -X GET "https://vibenet.online/api/reports/sales?from=2025-01-01&to=2025-01-31&granularity=day&location_id=11111111-2222-3333-4444-555555555555" \
  -H "Authorization: Bearer <jwt>"
```

Response (example)

```json
{
  "series": [ { "date": "2025-01-01", "revenue": 1250.5, "orders": 42 } ],
  "totals": { "revenue": 1250.5, "orders": 42 }
}
```

---

### Customers

- GET `/api/customers` – List customers
- POST `/api/customers` – Create customer
- GET `/api/customers/{id}` – Retrieve customer
- PATCH `/api/customers/{id}` – Update customer

Create

```bash
curl -X POST "https://vibenet.online/api/customers" \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{ "name":"Jane Doe", "phone":"+254712345678", "email":"jane@example.com" }'
```

---

### Suppliers

- GET `/api/suppliers` – List suppliers
- POST `/api/suppliers` – Create supplier
- GET `/api/suppliers/{id}` – Retrieve supplier
- PATCH `/api/suppliers/{id}` – Update supplier

---

### Locations

- GET `/api/locations` – List locations
- POST `/api/locations` – Create location
- PATCH `/api/locations/{id}` – Update location

Create

```bash
curl -X POST "https://vibenet.online/api/locations" \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{ "name":"Downtown Branch", "address":"1 Market St" }'
```

---

### Audit Logs

- GET `/api/audit-logs` – List audit logs (admin)

Query params: `actor_id`, `action`, `entity_type`, `from`, `to`

```bash
curl -X GET "https://vibenet.online/api/audit-logs?from=2025-01-01&to=2025-01-31&action=ORDER_CREATE" \
  -H "Authorization: Bearer <jwt>"
```

Response (example)

```json
{
  "data": [
    { "id": "log-1", "ts": "2025-01-01T12:00:00Z", "actor_id": "user-1", "action": "ORDER_CREATE", "entity": { "type": "order", "id": "aaaa1111-bbbb-2222-cccc-3333dddd4444" } }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

---

### Notifications

- POST `/api/notifications/whatsapp` – Send WhatsApp message (tenant-scoped)
- GET `/api/notifications/templates` – List available templates

Send WhatsApp

```bash
curl -X POST "https://vibenet.online/api/notifications/whatsapp" \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{ "to":"+254712345678", "template":"invoice_due", "params": { "name":"Jane", "amount":"19.98" } }'
```

Response (example)

```json
{ "status": "queued", "message_id": "msg_12345" }
```

---

## Pagination

Responses that support pagination include `page`, `limit`, and `total`. Example:

```json
{ "data": [/* items */], "page": 1, "limit": 20, "total": 57 }
```

Use `page` and `limit` query params to navigate. Avoid requesting pages beyond `Math.ceil(total/limit)`.

## Validation & Error Codes

- `VALIDATION_ERROR`: Invalid payload or query
- `AUTH_REQUIRED`: Missing/invalid token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Version conflict or uniqueness violation
- `RATE_LIMITED`: Too many requests

## Change Log

- 1.0.0: Initial publication aligned with documentation version 1.0.0


