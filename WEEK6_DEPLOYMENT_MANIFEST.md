# Week 6 Deployment Configuration - Complete Manifest

**Status**: Week 6.1 & 6.2 Complete  
**Date**: April 23, 2026  
**Deliverable**: All deployment configs, CI/CD pipeline, monitoring setup, comprehensive docs

## Files Created

### 1. Frontend Deployment

#### `vercel.json` (1.4 KB)
**Purpose**: Vercel platform configuration for frontend deployment

**Contents**:
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrites (all paths → index.html)
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Cache-Control headers for static assets
- Environment variables mapping for VITE_* vars

**Key Features**:
- Production-ready Vercel configuration
- Security headers for all responses
- Optimized caching for static/API routes
- Clean URL configuration

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/vercel.json`

---

### 2. Backend Deployment

#### `backend/Dockerfile` (1.3 KB)
**Purpose**: Production Docker image for FastAPI backend

**Features**:
- Multi-stage build (builder → production)
- Minimal base image: `python:3.11-slim`
- Non-root user execution (appuser)
- Health check endpoint
- Production uvicorn settings:
  - 4 workers
  - uvloop for performance
  - Host: 0.0.0.0, Port: 8000

**Build Optimization**:
- Wheels-based dependency installation
- Small final image size
- Efficient layer caching

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/Dockerfile`

#### `backend/.dockerignore` (634 B)
**Purpose**: Exclude unnecessary files from Docker build context

**Excludes**:
- Python cache, build artifacts
- Virtual environments
- IDE/editor files
- Git repository
- Documentation
- Test files
- Log files

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/.dockerignore`

#### `backend/railway.toml` (443 B)
**Purpose**: Railway.app deployment configuration

**Configuration**:
- Dockerfile build
- Health check: GET /api/v1/health (30s interval)
- Environment variables
- Auto-deployment on push

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/railway.toml`

#### `backend/render.yaml` (1.3 KB)
**Purpose**: Render.com deployment configuration

**Configuration**:
- Docker build
- Auto-scaling (1-3 instances)
- Resource limits (CPU/memory)
- Health check endpoint
- Environment variables (marked as secrets)
- Region: Oregon
- Plan: Standard

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/render.yaml`

---

### 3. Backend Production Configuration

#### `backend/app/core/production.py` (5.4 KB)
**Purpose**: Production-specific settings and structured logging

**Key Classes**:
- `get_environment()`: Returns "production" or "development"
- `is_production()`: Boolean check
- `setup_logging()`: Configures logging based on environment
- `ProductionSettings`: Validates required env vars
- `_ProductionJSONFormatter`: Structured JSON logging (production)
- `_DevelopmentFormatter`: Colored console logging (dev)
- `configure_production()`: Initialize at app startup

**Features**:
- Environment-aware logging (JSON in prod, colored in dev)
- Automatic validation of required environment variables
- Security best practices (disabled debug in prod)
- Breadcrumb and exception context
- Production initialization at startup

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/app/core/production.py`

---

### 4. Error Tracking & Monitoring

#### `src/lib/sentry.ts` (3.7 KB)
**Purpose**: Frontend Sentry integration for error tracking

**Exports**:
- `initSentry()`: Initialize Sentry (called in App.tsx)
- `captureException(error, context)`: Manually capture errors
- `captureMessage(message, level)`: Capture messages
- `setSentryUser(id, email, name)`: Set user context
- `clearSentryUser()`: Clear user context
- `createSentryErrorBoundary()`: Create React error boundary

**Features**:
- Only initializes if VITE_SENTRY_DSN is set
- Filters noisy errors (network, browser extensions)
- Session replay enabled (10% sample rate)
- Unhandled promise rejection capture
- Dynamic import to avoid bundling unused code

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/src/lib/sentry.ts`

#### `backend/app/core/sentry.py` (4.9 KB)
**Purpose**: Backend Sentry integration for error tracking

**Exports**:
- `init_sentry()`: Initialize Sentry
- `set_sentry_user(id, email, name)`: Set user context
- `clear_sentry_user()`: Clear context
- `capture_sentry_exception(exception, context)`: Manually capture
- `add_sentry_breadcrumb(message, level, category, data)`: Add breadcrumb

**Features**:
- Only initializes if SENTRY_DSN is set and production env
- FastAPI integration
- SQLAlchemy integration for query tracking
- Logging integration
- Error filtering (404s, timeouts, connection errors)
- Performance monitoring (10% transaction sample rate)
- Profiling enabled (10% in prod, 100% in dev)

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/app/core/sentry.py`

---

### 5. Health Monitoring

#### `scripts/check_health.sh` (2.7 KB, executable)
**Purpose**: Health check script for uptime monitoring

**Usage**:
```bash
./scripts/check_health.sh [BACKEND_URL] [TIMEOUT]
./scripts/check_health.sh https://api.raven.com 5
```

**Features**:
- HTTP status code validation (200 required)
- JSON response validation ("status": "healthy")
- Timeout support (configurable)
- Colored output (RED/GREEN/YELLOW)
- Logging with timestamps
- Exit codes: 0 (healthy), 1 (unhealthy)

**Integration**:
- Cron jobs: `0 */5 * * * /path/to/check_health.sh`
- External services: UptimeRobot, StatusCake, Better Stack
- CI/CD pipelines

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/scripts/check_health.sh`

---

### 6. CI/CD Pipeline

#### `.github/workflows/ci.yml` (3.7 KB)
**Purpose**: GitHub Actions CI pipeline for automated testing and validation

**Jobs**:

1. **Frontend**:
   - Node 20 LTS
   - Dependency caching
   - TypeScript check (`npm run lint`)
   - Build (`npm run build`)
   - Tests (`npm run test`)
   - Build output validation

2. **Backend**:
   - Python 3.11
   - Dependency caching
   - Python syntax check
   - Pytest execution
   - Import validation

3. **Security**:
   - npm audit (moderate level)
   - Python safety check
   - Dependency vulnerability scanning

4. **Summary**:
   - Final CI status check
   - Fails if any job fails

**Triggers**:
- Push to main and develop
- Pull requests to main and develop

**Features**:
- Fast execution (under 15 min)
- Caching for dependencies
- Soft failures for non-critical checks
- Security scanning
- Continue-on-error for optional tests

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/.github/workflows/ci.yml`

---

### 7. Environment Configuration

#### `.env.example` (Updated, 6.8 KB)
**Purpose**: Complete environment variable documentation and template

**Sections**:

1. **Backend Configuration**:
   - ENVIRONMENT (development/production)
   - DEBUG mode
   - DATABASE_URL (SQLite dev, PostgreSQL prod)

2. **Supabase Backend**:
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY (secret)
   - SUPABASE_JWT_SECRET

3. **AI Provider**:
   - ANTHROPIC_API_KEY (secret, backend only)

4. **Security**:
   - SECRET_KEY (JWT signing)
   - ENCRYPTION_KEY (credential storage)
   - ALLOWED_ORIGINS (CORS)

5. **Frontend (VITE_ prefix)**:
   - VITE_SUPABASE_URL (public)
   - VITE_SUPABASE_ANON_KEY (public)
   - VITE_API_URL (backend endpoint)
   - VITE_SENTRY_DSN (optional)

6. **Development Only**:
   - DISABLE_HMR

**Features**:
- Complete documentation for each variable
- Examples with placeholders
- Security warnings
- Production vs development guidance
- Quick start instructions

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/.env.example`

---

### 8. Deployment Documentation

#### `DEPLOYMENT.md` (14 KB)
**Purpose**: Comprehensive step-by-step deployment guide

**Contents**:

1. **Prerequisites**:
   - Accounts needed (Supabase, Anthropic, hosting, domain)
   - Service requirements

2. **Supabase Production Setup** (4 steps):
   - Create production project
   - Run database migrations
   - Enable Row-Level Security (RLS)
   - Retrieve credentials

3. **Backend Deployment** (2 options):
   - **Option A: Railway**
     - Setup account
     - Deploy from GitHub
     - Set environment variables
     - Automatic deployment
   - **Option B: Render**
     - Setup account
     - Create Web Service
     - Set environment variables
     - Docker deployment

4. **Frontend Deployment**:
   - **Vercel** (recommended):
     - Connect GitHub
     - Environment variables
     - Custom domain setup
     - SSL/TLS auto-generation

5. **Post-Deployment Verification**:
   - Backend health check
   - Frontend access
   - Authentication flow
   - API integration
   - Sentry integration
   - 8-item verification checklist

6. **Monitoring & Alerts**:
   - Uptime monitoring (UptimeRobot, Better Stack)
   - Sentry alerts (Slack, email, PagerDuty)
   - Database performance monitoring
   - Backend logs viewing

7. **Troubleshooting**:
   - Backend won't start
   - CORS errors
   - Authentication issues
   - API 401 errors
   - Database migration failures
   - Memory/performance issues
   - Build failures

8. **Performance Tips**:
   - Backend optimization
   - Frontend optimization
   - Database optimization

9. **Security Checklist**:
   - 12-item security verification

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/DEPLOYMENT.md`

---

### 9. Backend Requirements

#### `backend/requirements.txt` (Updated)
**Purpose**: Python dependencies with production packages

**Added**:
- `sentry-sdk[fastapi]>=2.0.0` - Error tracking
- `uvloop>=0.21.0` - High-performance event loop
- `python-json-logger>=2.0.0` - JSON logging

**Includes**:
- Core: FastAPI, Uvicorn, SQLAlchemy
- Auth: python-jose, passlib, bcrypt
- Optional: asyncpg (PostgreSQL), redis, celery

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/requirements.txt`

---

### 10. Backend Main Application

#### `backend/app/main.py` (Updated)
**Purpose**: FastAPI application with production initialization

**Changes**:
- Added `configure_production()` call in lifespan
- Added `init_sentry()` call for error tracking
- Added logging setup
- Enhanced lifespan with startup/shutdown logging

**Lifespan Events**:
1. **Startup**:
   - Configure production settings
   - Initialize Sentry
   - Create database tables
2. **Shutdown**:
   - Log shutdown event

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/backend/app/main.py`

---

### 11. Frontend App Component

#### `src/App.tsx` (Updated)
**Purpose**: React app root with Sentry initialization

**Changes**:
- Imported `initSentry` from `@/lib/sentry`
- Call `initSentry()` at module level (before Router)
- Ensures error tracking active from app start

**Location**: `/sessions/zen-compassionate-johnson/mnt/raven/src/App.tsx`

---

## Deployment Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      RAVEN PRODUCTION DEPLOYMENT                 │
└─────────────────────────────────────────────────────────────────┘

FRONTEND (Vercel)
├── React 19 + Vite SPA
├── Static hosting with CDN
├── Environment: VITE_*
├── Sentry error tracking
└── Custom domain with SSL

BACKEND (Railway/Render)
├── FastAPI Python app
├── Docker containerized
├── Environment variables
├── Sentry error tracking
├── Health check endpoint (/api/v1/health)
└── Uvicorn production server

DATABASE (Supabase)
├── PostgreSQL with RLS
├── JWT authentication
├── Row-level security policies
└── Automated backups

ERROR TRACKING (Sentry)
├── Frontend crash reporting
├── Backend exception tracking
├── Performance monitoring
└── Alert routing

MONITORING
├── Health checks (bash script)
├── Uptime monitoring (external)
├── Database performance
├── Application logs
└── Error dashboards
```

---

## Key Configuration Details

### Build Process
- **Frontend**: Vite with code splitting, minification, vendor chunks
- **Backend**: Multi-stage Docker build with optimized layers
- **CI/CD**: GitHub Actions with caching for fast builds

### Security
- Non-root Docker user
- Security headers (HSTS, CSP, X-Frame-Options)
- Environment variable secrets (not in code)
- CORS restricted to allowed origins
- Database RLS enabled
- Error tracking with PII filtering

### Monitoring & Observability
- Health endpoint for uptime monitoring
- Structured JSON logging in production
- Sentry integration for error tracking
- Breadcrumbs for debugging
- Performance metrics collection

### Scalability
- Render: Auto-scaling 1-3 instances
- Database: Supabase managed PostgreSQL
- Static assets: Vercel CDN
- API caching ready (Redis optional)

---

## Next Steps for Production Launch

1. **Create production accounts**:
   - [ ] Supabase project (Pro plan)
   - [ ] Anthropic API key
   - [ ] Railway or Render account
   - [ ] Vercel account
   - [ ] Sentry account
   - [ ] Domain registration

2. **Configure databases**:
   - [ ] Run migration SQL in Supabase
   - [ ] Enable RLS policies
   - [ ] Backup configuration
   - [ ] Connection pooling setup

3. **Deploy backend**:
   - [ ] Push code to GitHub
   - [ ] Connect to Railway/Render
   - [ ] Set environment variables
   - [ ] Verify health endpoint
   - [ ] Check logs for errors

4. **Deploy frontend**:
   - [ ] Connect to Vercel
   - [ ] Set environment variables
   - [ ] Configure custom domain
   - [ ] Verify SSL certificate
   - [ ] Test authentication flow

5. **Setup monitoring**:
   - [ ] Configure Sentry projects (frontend + backend)
   - [ ] Setup uptime monitoring (UptimeRobot)
   - [ ] Configure Sentry alerts
   - [ ] Test error capture
   - [ ] Setup logging aggregation

6. **Security & Testing**:
   - [ ] Run security checklist
   - [ ] Test all API endpoints
   - [ ] Verify CORS headers
   - [ ] Test error handling
   - [ ] Load testing (optional)

7. **Documentation**:
   - [ ] Update runbook for ops team
   - [ ] Document emergency procedures
   - [ ] Create troubleshooting guide
   - [ ] Setup on-call rotation

---

## Testing the Deployment Configuration

### Local Testing
```bash
# Build Docker image
docker build -t raven-backend backend/

# Run container
docker run -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  raven-backend

# Test health check
curl http://localhost:8000/api/v1/health

# Test health check script
./scripts/check_health.sh http://localhost:8000
```

### CI Pipeline
```bash
# GitHub Actions runs automatically on push
# Check status in: https://github.com/[owner]/raven/actions
# Logs available for each job
# PR checks run before merge
```

---

## Summary Statistics

**Files Created**: 11 main configuration files  
**Total Size**: ~45 KB  
**Lines of Code**: ~1,200 (configs + code)  
**Documentation**: 14 KB (DEPLOYMENT.md)  
**CI/CD**: GitHub Actions workflow  
**Error Tracking**: Sentry frontend + backend  
**Monitoring**: Health check + uptime monitoring  
**Hosting Options**: 2 backend (Railway/Render), 1 frontend (Vercel)

---

## Verification Checklist

- [x] Vercel frontend configuration (vercel.json)
- [x] Docker backend configuration (Dockerfile + .dockerignore)
- [x] Railway deployment config (railway.toml)
- [x] Render deployment config (render.yaml)
- [x] Production settings module (production.py)
- [x] Sentry frontend integration (sentry.ts)
- [x] Sentry backend integration (sentry.py)
- [x] Health check monitoring script (check_health.sh)
- [x] GitHub Actions CI pipeline (ci.yml)
- [x] Complete deployment guide (DEPLOYMENT.md)
- [x] Updated environment template (.env.example)
- [x] Updated backend requirements (requirements.txt)
- [x] Integrated Sentry in App.tsx
- [x] Integrated production config in main.py

**Status**: Ready for production deployment

---

**Week 6 Complete** ✓
