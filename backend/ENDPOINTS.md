# FinOS Backend API Endpoints

All endpoints are prefixed with `/api/v1`

## Authentication (`/auth`)
- `POST /register` - Register new user
- `POST /login` - Login with email/password
- `POST /guest` - Login as guest
- `GET /me` - Get current authenticated user (requires auth)

## Transactions (`/transactions`)
- `GET /` - List transactions with filters (type, category, status, date_from, date_to, search)
- `POST /` - Create transaction (requires auth)
- `GET /{transaction_id}` - Get single transaction (requires auth)
- `PATCH /{transaction_id}` - Update transaction (requires auth)
- `DELETE /{transaction_id}` - Delete transaction (requires auth)
- `GET /export/csv` - Export transactions as CSV (requires auth)

## Invoices (`/invoices`)
- `GET /` - List invoices with filters (status, client_name, date_from, date_to)
- `POST /` - Create invoice (requires auth)
- `GET /{invoice_id}` - Get single invoice (requires auth)
- `PATCH /{invoice_id}` - Update invoice (requires auth)
- `DELETE /{invoice_id}` - Delete invoice (requires auth)

## Filings (`/filings`)
- `GET /` - List filings with filters (type, status, period)
- `POST /` - Create filing (requires auth)
- `GET /{filing_id}` - Get single filing (requires auth)
- `PATCH /{filing_id}` - Update filing/mark as filed (requires auth)
- `DELETE /{filing_id}` - Delete filing (requires auth)

## Integrations (`/integrations`)
- `GET /` - List user's integration connections (requires auth)
- `POST /` - Create new integration with encrypted credentials (requires auth)
- `POST /test` - Test integration connection without storing
- `PATCH /{integration_id}` - Update integration credentials (requires auth)
- `DELETE /{integration_id}` - Disconnect integration (requires auth)
- `POST /{integration_id}/sync` - Trigger sync for integration (requires auth)

## Reports (`/reports`)
- `GET /` - List reports with type filter (requires auth)
- `POST /` - Create report (requires auth)
- `POST /generate` - Auto-generate report from transaction data (requires auth)
- `GET /{report_id}` - Get single report (requires auth)
- `DELETE /{report_id}` - Delete report (requires auth)
- `GET /{report_id}/export` - Export report as CSV (requires auth)

## Dashboard (`/dashboard`)
- `GET /summary` - Get comprehensive dashboard metrics (auth optional)
- `GET /mrr-trend` - Get MRR trend data (auth optional)
- `GET /cash-flow` - Get cash flow data (auth optional)
- `GET /expenses` - Get expense breakdown by category (auth optional)
- `GET /anomalies` - Detect and return financial anomalies (auth optional)

## Compliance (`/compliance`)
- `POST /tds/calculate` - Calculate TDS based on section and amount (requires auth)
- `POST /gst/calculate` - Calculate GST (requires auth)
- `POST /ptax/calculate` - Calculate Professional Tax (requires auth)
- `GET /health` - Get compliance health scores (requires auth)
- `GET /deadlines` - Get upcoming compliance deadlines (requires auth)

### Compliance Calculations

#### TDS Sections Supported
- 194C: Contractor/Professional fees (1% rate, ₹30,000 threshold)
- 194J: Professional fees (10% rate, ₹30,000 threshold)
- 194H: Commission/Brokerage (5% rate, ₹25,000 threshold)
- 194I: Rent (5% rate, ₹100,000 threshold)
- 194A: Interest on securities (10% rate, ₹40,000 threshold)

#### GST Rates
- 0%, 5%, 12%, 18%, 28% based on HSN code
- Support for IGST (Interstate), CGST+SGST (Intrastate), Composition scheme

#### Professional Tax by State
- Maharashtra (MH), Karnataka (KA), West Bengal (WB)
- Delhi (DL), Tamil Nadu (TN), Gujarat (GJ)
- Rajasthan (RJ), Uttar Pradesh (UP), Andhra Pradesh (AP)

## Notifications (`/notifications`)
- `GET /` - List notifications with unread first (requires auth)
- `POST /{notification_id}/read` - Mark notification as read (requires auth)
- `POST /read-all` - Mark all notifications as read (requires auth)
- `GET /unread-count` - Get unread notification count (requires auth)

## AI Proxy (`/ai`)
- `POST /chat` - Send chat request to AI provider (requires auth)
  - Supports OpenAI, Anthropic, Google Gemini
  - Automatic fallback through providers
  - Server-side API key management

## Team/Employees (`/team`)
- `GET /` - List employees (requires auth)
- `POST /` - Create employee with auto-calculated Professional Tax (requires auth)
- `GET /{employee_id}` - Get single employee (requires auth)
- `PATCH /{employee_id}` - Update employee (requires auth)
- `DELETE /{employee_id}` - Delete employee (requires auth)
- `GET /summary/payroll` - Get payroll summary with aggregated costs (requires auth)

## Authentication

Two types of endpoints:
1. **Read-only dashboard/health endpoints**: Use `user: User | None = Depends(get_current_user)`
   - Optional authentication
   - Return empty/default data if not authenticated

2. **Data modification endpoints**: Use `user: User = Depends(require_user)`
   - Required authentication
   - Return 401 if not authenticated

Bearer token format:
```
Authorization: Bearer <token>
```

Token obtained from `/auth/login` or `/auth/register`

## Data Scoping

All endpoints (except authentication) are automatically scoped to the authenticated user's `user_id`. Users can only access their own data.

## Error Handling

Standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## File Locations

All endpoint files are located in: `/app/api/v1/endpoints/`

- `auth.py` - Authentication endpoints
- `transactions.py` - Transaction management
- `invoices.py` - Invoice management
- `filings.py` - Tax filing management
- `integrations.py` - Integration management
- `reports.py` - Report generation and management
- `dashboard.py` - Dashboard analytics
- `compliance.py` - Tax calculations and compliance
- `notifications.py` - User notifications
- `ai_proxy.py` - AI provider proxy
- `team.py` - Employee management
