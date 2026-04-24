#!/bin/bash

# Week 5 Security Hardening Verification Script
# Checks that all required files are in place and properly configured

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Week 5 Hardening Verification ==="
echo ""

ERRORS=0
WARNINGS=0

# Check middleware files
echo "Checking middleware files..."
MIDDLEWARE_FILES=(
    "backend/app/middleware/__init__.py"
    "backend/app/middleware/auth.py"
    "backend/app/middleware/rate_limit.py"
    "backend/app/middleware/error_handler.py"
    "backend/app/middleware/sanitize.py"
)

for file in "${MIDDLEWARE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file missing"
        ((ERRORS++))
    fi
done

# Check test file
echo ""
echo "Checking test files..."
if [ -f "backend/tests/test_rls.py" ]; then
    echo -e "${GREEN}✓${NC} backend/tests/test_rls.py exists"
else
    echo -e "${RED}✗${NC} backend/tests/test_rls.py missing"
    ((ERRORS++))
fi

# Check documentation
echo ""
echo "Checking documentation files..."
DOCS_FILES=(
    "WEEK5_SECURITY_HARDENING.md"
    "WEEK5_TESTING_GUIDE.md"
    "WEEK5_IMPLEMENTATION_SUMMARY.md"
    "WEEK5_COMPLETION_CHECKLIST.md"
)

for file in "${DOCS_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file missing"
        ((ERRORS++))
    fi
done

# Check Python syntax
echo ""
echo "Checking Python syntax..."
if python3 -m py_compile backend/app/middleware/*.py backend/app/main.py 2>/dev/null; then
    echo -e "${GREEN}✓${NC} All Python files have valid syntax"
else
    echo -e "${RED}✗${NC} Python syntax errors found"
    ((ERRORS++))
fi

# Check for VITE_ANTHROPIC_API_KEY in frontend
echo ""
echo "Checking frontend security..."
if grep -r "VITE_ANTHROPIC_API_KEY" src/ 2>/dev/null; then
    echo -e "${RED}✗${NC} VITE_ANTHROPIC_API_KEY found in frontend (security issue)"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} No VITE_ANTHROPIC_API_KEY in frontend"
fi

# Check for direct Claude API calls in frontend
if grep -r "api.anthropic.com" src/ 2>/dev/null; then
    echo -e "${RED}✗${NC} Direct Claude API calls found in frontend (security issue)"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} No direct Claude API calls in frontend"
fi

# Check middleware imports in main.py
echo ""
echo "Checking main.py integration..."
if grep -q "from app.middleware import" backend/app/main.py; then
    echo -e "${GREEN}✓${NC} Middleware imported in main.py"
else
    echo -e "${RED}✗${NC} Middleware not imported in main.py"
    ((ERRORS++))
fi

if grep -q "app.add_middleware(RateLimitMiddleware)" backend/app/main.py; then
    echo -e "${GREEN}✓${NC} RateLimitMiddleware added"
else
    echo -e "${YELLOW}!${NC} RateLimitMiddleware not found"
    ((WARNINGS++))
fi

if grep -q "app.add_middleware(AuthMiddleware)" backend/app/main.py; then
    echo -e "${GREEN}✓${NC} AuthMiddleware added"
else
    echo -e "${YELLOW}!${NC} AuthMiddleware not found"
    ((WARNINGS++))
fi

if grep -q "app.add_middleware(ErrorHandlerMiddleware)" backend/app/main.py; then
    echo -e "${GREEN}✓${NC} ErrorHandlerMiddleware added"
else
    echo -e "${YELLOW}!${NC} ErrorHandlerMiddleware not found"
    ((WARNINGS++))
fi

# Check health endpoint
if grep -q "def health_check" backend/app/main.py; then
    echo -e "${GREEN}✓${NC} Health check endpoint defined"
else
    echo -e "${RED}✗${NC} Health check endpoint not found"
    ((ERRORS++))
fi

# Check security headers
if grep -q "X-Content-Type-Options" backend/app/main.py; then
    echo -e "${GREEN}✓${NC} Security headers middleware added"
else
    echo -e "${RED}✗${NC} Security headers not found"
    ((ERRORS++))
fi

# Check input sanitization in chat.py
echo ""
echo "Checking endpoint security..."
if grep -q "sanitize_chat_input" backend/app/api/v1/endpoints/chat.py; then
    echo -e "${GREEN}✓${NC} Chat input sanitization added"
else
    echo -e "${RED}✗${NC} Chat input sanitization missing"
    ((ERRORS++))
fi

if grep -q "ANTHROPIC_API_KEY" backend/app/api/v1/endpoints/chat.py && \
   grep -q "not api_key" backend/app/api/v1/endpoints/chat.py; then
    echo -e "${GREEN}✓${NC} API key validation in chat endpoint"
else
    echo -e "${RED}✗${NC} API key validation missing"
    ((ERRORS++))
fi

# Check filename sanitization in csv_upload.py
if grep -q "sanitize_filename" backend/app/api/v1/endpoints/csv_upload.py; then
    echo -e "${GREEN}✓${NC} Filename sanitization added"
else
    echo -e "${RED}✗${NC} Filename sanitization missing"
    ((ERRORS++))
fi

# Check .env.example updates
echo ""
echo "Checking .env.example..."
if grep -q "ANTHROPIC_API_KEY=" .env.example; then
    echo -e "${GREEN}✓${NC} ANTHROPIC_API_KEY documented (backend-only)"
else
    echo -e "${YELLOW}!${NC} ANTHROPIC_API_KEY not documented"
    ((WARNINGS++))
fi

if grep -q "ALLOWED_ORIGINS=" .env.example; then
    echo -e "${GREEN}✓${NC} ALLOWED_ORIGINS documented"
else
    echo -e "${YELLOW}!${NC} ALLOWED_ORIGINS not documented"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "=== Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}! $WARNINGS warning(s) found${NC}"
fi

if [ $ERRORS -eq 0 ]; then
    echo ""
    echo "=== Next Steps ==="
    echo "1. Run manual tests from WEEK5_TESTING_GUIDE.md"
    echo "2. Review code changes"
    echo "3. Test rate limiting: curl -H 'Authorization: Bearer TOKEN' http://localhost:8000/api/v1/health"
    echo "4. Check health endpoint: curl http://localhost:8000/api/v1/health"
    echo "5. Deploy to production"
    exit 0
else
    exit 1
fi
