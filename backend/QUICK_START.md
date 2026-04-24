# Raven Backend - Quick Start Guide

## Running the Server

```bash
cd /sessions/kind-pensive-meitner/mnt/raven/backend
python -m uvicorn app.main:app --reload
```

Server will be available at: `http://localhost:8000`
- API Docs: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

## Authentication Flow

### 1. Register a new user
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "full_name": "John Doe",
    "company_name": "Acme Corp"
  }'
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### 2. Login with existing credentials
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

### 3. Use the token in subsequent requests
```bash
curl -X GET http://localhost:8000/api/v1/transactions/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

## Common Operations

### Create a Transaction
```bash
curl -X POST http://localhost:8000/api/v1/transactions/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-30",
    "description": "Software subscription",
    "amount": 5000.00,
    "type": "debit",
    "category": "Software",
    "status": "pending",
    "gst_rate": 18.0,
    "gst_amount": 900.0,
    "notes": "Monthly subscription renewal"
  }'
```

### List Transactions with Filters
```bash
curl "http://localhost:8000/api/v1/transactions/?category=Software&status=pending&skip=0&limit=50" \
  -H "Authorization: Bearer <token>"
```

### Calculate TDS
```bash
curl -X POST http://localhost:8000/api/v1/compliance/tds/calculate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "194J",
    "amount": 50000.00,
    "pan_available": true,
    "is_resident": true
  }'
```

### Get Dashboard Summary
```bash
curl http://localhost:8000/api/v1/dashboard/summary \
  -H "Authorization: Bearer <token>"
```

### Create Integration
```bash
curl -X POST http://localhost:8000/api/v1/integrations/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "razorpay",
    "display_name": "Razorpay Business Account",
    "category": "payments",
    "environment": "production",
    "credentials": {
      "api_key": "rzp_live_xxx",
      "api_secret": "secret_xxx"
    }
  }'
```

### Test Integration (without storing)
```bash
curl -X POST http://localhost:8000/api/v1/integrations/test \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "razorpay",
    "environment": "sandbox",
    "credentials": {
      "api_key": "test_key",
      "api_secret": "test_secret"
    }
  }'
```

### Create Employee
```bash
curl -X POST http://localhost:8000/api/v1/team/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Smith",
    "email": "alice@company.com",
    "role": "Developer",
    "department": "Engineering",
    "state": "MH",
    "monthly_salary": 75000.00,
    "pan": "AAAPA1234A"
  }'
```

### Get Payroll Summary
```bash
curl http://localhost:8000/api/v1/team/summary/payroll \
  -H "Authorization: Bearer <token>"
```

### Generate Report
```bash
curl -X POST http://localhost:8000/api/v1/reports/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2026 P&L Report",
    "type": "P&L",
    "period": "Q1 2026",
    "version": "v1.0"
  }'
```

### Get Compliance Deadlines
```bash
curl http://localhost:8000/api/v1/compliance/deadlines \
  -H "Authorization: Bearer <token>"
```

### Export Transactions as CSV
```bash
curl http://localhost:8000/api/v1/transactions/export/csv \
  -H "Authorization: Bearer <token>" \
  --output transactions.csv
```

## Key Features

### Authentication
- JWT-based bearer token authentication
- 24-hour token expiration (configurable)
- User data automatically scoped to authenticated user

### Data Security
- Integration credentials encrypted with Fernet encryption
- Passwords hashed with bcrypt
- No sensitive data in request logs

### Indian Tax Compliance
- TDS calculations (194C, 194J, 194H, 194I, 194A)
- GST calculations (0%, 5%, 12%, 18%, 28%)
- Professional Tax for 9 states
- Compliance health scoring

### Financial Analytics
- Revenue and expense tracking
- MRR/ARR calculations
- Cash flow analysis
- Burn rate and runway
- Expense category breakdown
- Anomaly detection

### Integrations
- Support for Razorpay, Zoho, Tally, HDFC, GST Portal
- Encrypted credential storage
- Sync tracking
- Connection testing

### Filtering & Pagination
All list endpoints support:
- Filtering (status, type, category, date ranges, search)
- Pagination (skip, limit)
- Sorting by date/creation

## Error Responses

```json
{
  "detail": "Not authenticated"
}
```

Status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/raven

# Auth
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Provider (optional, for chat endpoint)
ANTHROPIC_API_KEY=sk-ant-...

# Encryption
ENCRYPTION_KEY=your-encryption-key-for-credentials

# CORS
CORS_ORIGINS=["http://localhost:3002", "http://localhost:5173"]

# App
DEBUG=true
```

## File Locations

- Endpoint modules: `/app/api/v1/endpoints/`
- Models: `/app/models/`
- Schemas: `/app/schemas/`
- Core utilities: `/app/core/`

## Testing

All endpoints are available in the interactive API docs:
```
http://localhost:8000/api/docs
```

Use the Swagger UI to test all endpoints directly without writing curl commands.

## Troubleshooting

### "Not authenticated" error
- Ensure Authorization header is included
- Check token format: `Authorization: Bearer <token>`
- Verify token has not expired

### "Database connection failed"
- Check DATABASE_URL in .env
- Ensure PostgreSQL/SQLite is running
- Run migrations if needed

### "Email already registered" on signup
- User with that email already exists
- Use login endpoint instead

### Encryption errors
- Ensure ENCRYPTION_KEY is set in .env
- Key must be >= 32 characters for security
