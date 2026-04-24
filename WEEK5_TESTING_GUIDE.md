# Week 5 Security Hardening - Testing Guide

This guide provides manual and automated testing procedures for all Week 5 security hardening features.

## Prerequisites

- Backend running: `uvicorn app.main:app --reload`
- Valid JWT token for a test user (obtain from `/api/v1/auth/login`)

## 1. Health Check Endpoint (No Auth Required)

### Test: Basic health check
```bash
curl -s http://localhost:8000/api/v1/health | jq .
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "ai": true,
  "supabase": true
}
```

**Pass Criteria:**
- `ai: true` if `ANTHROPIC_API_KEY` is set
- `supabase: true` if `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
- Status code: 200
- Returns within 1 second

---

## 2. Authentication Middleware

### Test 2.1: Missing Authorization Header
```bash
curl -v -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

**Expected:**
- Status code: 401
- Response: `{"error": true, "message": "Missing or invalid Authorization header", "code": "UNAUTHORIZED"}`

### Test 2.2: Invalid Token
```bash
curl -v -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

**Expected:**
- Status code: 401
- Response: `{"error": true, "message": "Invalid or expired token", "code": "INVALID_TOKEN"}`

### Test 2.3: Valid Token (Should Pass to Endpoint Handler)
```bash
# Get a valid token first
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}' | jq -r '.access_token')

# Now use it
curl -v -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

**Expected:**
- Status code: 200 (or 503 if API key not configured)
- Request passes auth middleware and reaches endpoint

**Pass Criteria:**
- Valid token is accepted
- user_id is extracted and available to endpoint

---

## 3. Rate Limiting

### Test 3.1: Exceed Chat Rate Limit (60/min per user)
```bash
TOKEN="your-valid-token-here"

# Send 65 requests rapidly
for i in {1..65}; do
  response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "hello"}]}')
  
  http_code=$(echo "$response" | tail -n1)
  if [ "$http_code" = "429" ]; then
    echo "Request $i: Rate limit hit!"
    echo "$response" | head -n-1 | jq .
    break
  fi
  echo "Request $i: $http_code"
done
```

**Expected:**
- Requests 1-60: Status 200 (or 503 if API key not set)
- Request 61+: Status 429
- Response includes `Retry-After` header
- Response body: `{"error": true, "message": "Rate limit exceeded", "code": "RATE_LIMIT_EXCEEDED"}`

### Test 3.2: Verify Retry-After Header
```bash
TOKEN="your-valid-token-here"

# Send requests until rate limit
for i in {1..65}; do
  curl -s -X POST http://localhost:8000/api/v1/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "hello"}]}' > /dev/null
done

# Next request should have Retry-After
curl -i -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

**Expected:**
- Header: `Retry-After: <seconds>`
- Example: `Retry-After: 45` (time until window resets)

### Test 3.3: CSV Upload Rate Limit (10/day per user)
```bash
TOKEN="your-valid-token-here"

# Create a minimal CSV file
echo "Date,Amount,Description,Category" > test.csv
echo "2026-04-23,100,Test,Revenue" >> test.csv

# Try to upload 11 times (11th should fail with 429)
for i in {1..11}; do
  curl -s -w "\n%{http_code}\n" -X POST http://localhost:8000/api/v1/csv/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test.csv" | tail -n1
done
```

**Expected:**
- Uploads 1-10: Status 200
- Upload 11: Status 429

**Pass Criteria:**
- Different rate limits apply to different endpoints
- Limit persists across requests within the window

---

## 4. CORS Configuration

### Test 4.1: Cross-Origin Request (Should Fail)
```bash
curl -v -H "Origin: https://malicious.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:8000/api/v1/chat
```

**Expected:**
- No `Access-Control-Allow-Origin` header in response
- Request rejected (preflight fails)

### Test 4.2: Allowed Origin (Should Succeed)
```bash
# If localhost:3002 is in ALLOWED_ORIGINS:
curl -v -H "Origin: http://localhost:3002" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:8000/api/v1/chat
```

**Expected:**
- Response includes: `Access-Control-Allow-Origin: http://localhost:3002`

### Test 4.3: Method Check
```bash
curl -X PUT http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
- Status 405 (Method Not Allowed) or 403
- PUT method not in allowed list

---

## 5. Input Sanitization

### Test 5.1: Chat Input with HTML Tags
```bash
TOKEN="your-valid-token-here"

curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Hello <script>alert(1)</script> world"
    }]
  }'
```

**Expected:**
- HTML tags are stripped
- Claude receives: "Hello alert(1) world"
- No script injection possible

### Test 5.2: Chat Input Exceeds Max Length
```bash
TOKEN="your-valid-token-here"

# Create a 5000-character message (max is 4000)
LONG_MESSAGE=$(python3 -c "print('a' * 5000)")

curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"$LONG_MESSAGE\"}]}"
```

**Expected:**
- Message is truncated to 4000 characters
- No error, graceful truncation

### Test 5.3: CSV Filename Sanitization
```bash
TOKEN="your-valid-token-here"

# Create CSV with path traversal attempt in filename
echo "Date,Amount,Description,Category" > "../../etc/passwd.csv"
echo "2026-04-23,100,Test,Revenue" >> "../../etc/passwd.csv"

curl -X POST http://localhost:8000/api/v1/csv/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@../../etc/passwd.csv'
```

**Expected:**
- Filename is sanitized (path components removed)
- File is stored with safe name (e.g., `etc_passwd.csv`)
- Upload succeeds, no directory traversal

---

## 6. API Key Security

### Test 6.1: Health Check Shows API Key Status
```bash
# With ANTHROPIC_API_KEY set
curl http://localhost:8000/api/v1/health | jq .ai
# Should output: true

# Without ANTHROPIC_API_KEY (unset it)
# curl http://localhost:8000/api/v1/health | jq .ai
# Should output: false
```

### Test 6.2: Chat Fails When API Key Not Configured
```bash
# Unset ANTHROPIC_API_KEY, restart backend
unset ANTHROPIC_API_KEY

TOKEN="your-valid-token-here"

curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

**Expected:**
- Status code: 503
- Response: `{"error": true, "message": "AI service not configured. Please contact support.", "code": "..."}`

### Test 6.3: No VITE_ANTHROPIC_API_KEY in Frontend
```bash
# Check frontend code
grep -r "VITE_ANTHROPIC_API_KEY" /path/to/frontend/src/
# Should return: 0 results (no matches)
```

**Expected:**
- No `VITE_ANTHROPIC_API_KEY` references in frontend code
- Frontend doesn't make direct Claude API calls

---

## 7. Error Handling

### Test 7.1: Unhandled Exception Returns Generic Error
```bash
TOKEN="your-valid-token-here"

# Trigger an error (e.g., invalid JSON)
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d 'INVALID JSON'
```

**Expected:**
- Status code: 400 or 422
- Response: Generic error message (no stack trace)
- Example: `{"error": true, "message": "Invalid request", "code": "VALIDATION_ERROR"}`

### Test 7.2: Network Error Returns 503
```bash
# Stop Supabase or Claude API endpoint
# Then try to make a request that uses external services

TOKEN="your-valid-token-here"

curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

**Expected:**
- Status code: 503
- Response: `{"error": true, "message": "AI service temporarily unavailable", "code": "SERVICE_UNAVAILABLE"}`

### Test 7.3: Check Server Logs for Full Error Details
```bash
# Backend logs should show full stack trace
# Example output:
# ERROR - Unhandled exception in POST /api/v1/chat:
# Traceback (most recent call last):
#   File "...", line X, in dispatch
# ...
```

**Expected:**
- Full error details in server logs (not sent to client)
- Client only receives generic message

---

## 8. Security Headers

### Test 8.1: Check All Security Headers
```bash
curl -i http://localhost:8000/api/v1/health | grep -E "X-Content-Type-Options|X-Frame-Options|X-XSS-Protection|Strict-Transport-Security"
```

**Expected Output:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
(Strict-Transport-Security: max-age=31536000 only in production)
```

### Test 8.2: HSTS Header in Production Only
```bash
# In development (DEBUG=True)
curl -i http://localhost:8000/api/v1/health | grep "Strict-Transport-Security"
# Should return: (empty, not present)

# In production (DEBUG=False)
curl -i http://localhost:8000/api/v1/health | grep "Strict-Transport-Security"
# Should return: Strict-Transport-Security: max-age=31536000
```

---

## 9. Frontend ErrorBoundary

### Test 9.1: Render Error Caught by Boundary
```javascript
// In browser console while app is loaded:
// Trigger a render error in a component

const ErrorComponent = () => {
  throw new Error("Test error for ErrorBoundary");
};

// If ErrorBoundary wraps this, it should show:
// "Something went wrong"
// With a "Try Again" button
```

**Expected:**
- Error boundary catches the error
- Friendly message displayed (not a white screen)
- "Try Again" button resets the component
- Error logged to console

---

## 10. Integration Test Checklist

```bash
# Quick integration test
./run_integration_tests.sh

# Or manually:

# 1. Start backend
cd backend
uvicorn app.main:app --reload &
BACKEND_PID=$!

# 2. Register and login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "testpassword123",
    "full_name": "Test User"
  }' | jq -r '.access_token')

# 3. Test health check
curl http://localhost:8000/api/v1/health

# 4. Test rate limiting
for i in {1..65}; do
  curl -s -X POST http://localhost:8000/api/v1/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "test"}]}' > /dev/null
done

# 5. Verify 429 on 65th request
curl -w "\n%{http_code}\n" -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'

# 6. Check security headers
curl -i http://localhost:8000/api/v1/health | grep -E "X-Content-Type-Options|X-Frame-Options|X-XSS-Protection"

# 7. Cleanup
kill $BACKEND_PID
```

---

## Performance Testing

### Rate Limiter Performance
```bash
# Test in-memory rate limiter with high concurrency
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/health
```

**Expected:**
- No memory leaks
- Response time < 100ms
- Cleanup doesn't cause delays

### Middleware Overhead
```bash
# Compare response time with/without middleware
# Baseline (without auth middleware):
curl -w "Time: %{time_total}s\n" http://localhost:8000/api/v1/health

# With auth (valid token):
curl -w "Time: %{time_total}s\n" -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/health
```

**Expected:**
- Overhead < 10ms per request
- No significant latency impact

---

## Common Issues & Troubleshooting

### Issue: "Rate limit exceeded" on first request
**Solution:** Different user_ids have separate limits. Ensure you're testing with the same token.

### Issue: CORS errors in browser
**Solution:** Verify your frontend origin is in `ALLOWED_ORIGINS`. Check with:
```bash
echo $ALLOWED_ORIGINS
```

### Issue: Auth middleware not extracting user_id
**Solution:** Verify token has `sub` field:
```bash
TOKEN="your-token"
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .
```

### Issue: CSV upload sanitization too aggressive
**Solution:** Adjust max length or character restrictions in `sanitize_filename()`

---

## Automated Test Suite

Run the existing test suite:
```bash
cd backend
pytest tests/ -v

# Or run specific tests:
pytest tests/test_rls.py -v
```

## CI/CD Integration

For GitHub Actions, add this step:
```yaml
- name: Security Tests
  run: |
    cd backend
    pytest tests/test_rls.py -v
    # Add integration tests here
```
