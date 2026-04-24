# Raven Deployment Guide

Complete step-by-step guide for deploying Raven to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Production Setup](#supabase-production-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying Raven to production, you'll need accounts and credentials for:

### Required Services

1. **Supabase** (Database & Auth)
   - Create account at https://supabase.com
   - Create a new production project
   - Note the project URL and API keys

2. **Anthropic** (AI Provider)
   - Create account at https://console.anthropic.com
   - Generate API key for Claude access
   - Note the API key (keep secure)

3. **Backend Hosting** (Choose one)
   - **Railway**: https://railway.app (recommended)
   - **Render**: https://render.com
   - **Heroku**: https://heroku.com
   - **AWS/GCP/Azure**: Custom setup

4. **Frontend Hosting** (Choose one)
   - **Vercel**: https://vercel.com (recommended for Vite)
   - **Netlify**: https://netlify.com
   - **AWS S3 + CloudFront**: Custom setup

5. **Error Tracking** (Optional but recommended)
   - **Sentry**: https://sentry.io
   - Create an organization and project
   - Generate DSN for frontend and backend

6. **Domain & DNS**
   - Register domain (Namecheap, GoDaddy, Route53, etc.)
   - Configure DNS records
   - SSL/TLS certificate (provided by hosting platforms)

---

## Supabase Production Setup

### 1. Create Production Project

1. Log in to https://supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: `raven-prod`
   - **Database Password**: Generate strong password (save securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Pro (for production)
4. Click "Create new project" and wait for provisioning (5-10 minutes)

### 2. Run Database Migrations

1. In Supabase dashboard, navigate to **SQL Editor**
2. Create a new query for each migration file in `supabase/migrations/`:

   **First, check what migration files exist:**
   ```bash
   ls -la supabase/migrations/
   ```

3. For each `.sql` file:
   - Open the file
   - Copy its contents
   - Paste into SQL Editor in Supabase
   - Click "Run"
   - Verify success (no errors)

**Important**: Run migrations in numerical order if they're numbered.

### 3. Enable Row-Level Security (RLS)

1. In Supabase dashboard, go to **Authentication > Policies**
2. For each table created by migrations:
   - Click the table
   - Enable RLS
   - Add policy: `SELECT` for authenticated users on their own data
   - Template:
     ```sql
     SELECT (auth.uid() = user_id)
     ```

### 4. Retrieve Production Credentials

1. Go to **Settings > API** in Supabase dashboard
2. Copy and save:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon key**: Public key for frontend
   - **service_role key**: Private key for backend only
   - **JWT Secret**: For token verification

Store these securely (preferably in your hosting platform's secret manager, not in .env files).

---

## Backend Deployment

### Option A: Deploy to Railway (Recommended)

#### Setup Railway Account

1. Sign up at https://railway.app
2. Connect your GitHub account
3. Create a new project

#### Deploy Backend

1. In Railway dashboard, click "New Project" > "Deploy from GitHub"
2. Select your Raven repository
3. Railway will detect the Dockerfile
4. Configure the service:
   - **Name**: `raven-backend`
   - **Source**: Select `./backend` directory
   - **Build Command**: `docker build -t raven .`
   - **Start Command**: Leave blank (uses Dockerfile CMD)
   - **Port**: 8000

#### Set Environment Variables in Railway

In the Railway dashboard for your service, add these variables:

```
ENVIRONMENT=production
PYTHONUNBUFFERED=1
ANTHROPIC_API_KEY=sk-ant-xxxxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>
SECRET_KEY=<generate-with: openssl rand -hex 32>
ALLOWED_ORIGINS=https://app.raven.com,https://www.raven.com
ENCRYPTION_KEY=<generate-with: openssl rand -hex 32>
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
MONTHLY_TOKEN_LIMIT=1000000
```

#### Deploy

1. Railway automatically deploys on push to main
2. Monitor the build logs
3. Once deployed, Railway provides a URL: `https://xxxx.railway.app`

### Option B: Deploy to Render

#### Setup Render Account

1. Sign up at https://render.com
2. Connect your GitHub account
3. Create a new Web Service

#### Deploy Backend

1. Click "New +" > "Web Service"
2. Select your Raven repository
3. Configure:
   - **Name**: `raven-backend`
   - **Environment**: Docker
   - **Build Command**: Leave blank (uses Dockerfile)
   - **Start Command**: Leave blank (uses Dockerfile CMD)
   - **Plan**: Paid plan (required for production)

#### Set Environment Variables in Render

In the Render dashboard, add environment variables:

```
ENVIRONMENT=production
PYTHONUNBUFFERED=1
ANTHROPIC_API_KEY=sk-ant-xxxxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>
SECRET_KEY=<generate-with: openssl rand -hex 32>
ALLOWED_ORIGINS=https://app.raven.com,https://www.raven.com
ENCRYPTION_KEY=<generate-with: openssl rand -hex 32>
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
MONTHLY_TOKEN_LIMIT=1000000
```

#### Deploy

1. Click "Create Web Service"
2. Render automatically deploys on push to main
3. Provide URL: `https://xxxx.onrender.com`

### Generate Secure Keys (Required for Both)

Before deploying, generate these keys locally:

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

Copy the output and paste into the hosting platform's environment variables.

---

## Frontend Deployment

### Deploy to Vercel (Recommended for Vite)

#### Setup Vercel Account

1. Sign up at https://vercel.com
2. Connect your GitHub account

#### Deploy Frontend

1. Click "Add New..." > "Project"
2. Select your Raven repository
3. Vercel auto-detects Vite configuration
4. Configure:
   - **Project Name**: `raven-app`
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (frontend is at root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### Set Environment Variables in Vercel

In the Vercel dashboard, add for "Production" environment:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_URL=https://<backend-url>/api/v1
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**Note**: `VITE_API_URL` should point to your deployed backend (Railway, Render, or custom URL)

#### Configure Custom Domain

1. In Vercel dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `app.raven.com`)
4. Update DNS records at your registrar:
   - **CNAME**: Point your domain to `cname.vercel-dns.com`
   - **Nameservers**: Or update with Vercel's nameservers
5. SSL certificate auto-generates (within 24 hours)

#### Deploy

1. Vercel automatically deploys on push to main
2. Monitor the build logs
3. Access at your custom domain

### Deploy to Netlify (Alternative)

1. Sign up at https://netlify.com
2. Connect GitHub repository
3. Configure build:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add environment variables (same as Vercel)
5. Deploy

---

## Post-Deployment Verification

### 1. Backend Health Check

Test your backend is running:

```bash
curl -X GET https://<backend-url>/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "ai": true,
  "supabase": true
}
```

### 2. Frontend Access

1. Open your frontend URL in browser
2. Verify page loads without errors
3. Open browser DevTools (F12)
4. Check **Console** for errors
5. Check **Network** tab for failed requests

### 3. Authentication Flow

1. Navigate to `/login`
2. Attempt to log in with test credentials
3. Verify:
   - Login succeeds
   - Redirected to `/chat` or dashboard
   - Session persists on page reload

### 4. API Integration

1. In the app, try using a feature that calls the backend
2. Open DevTools > **Network** tab
3. Verify API calls:
   - Status: 200 (success)
   - No CORS errors
   - Response is valid JSON

### 5. Sentry Integration (if configured)

1. Log in to Sentry dashboard
2. Verify you can see events from your app
3. Trigger a test error to confirm capture:

   **Frontend (in browser console):**
   ```javascript
   throw new Error("Test error from Raven");
   ```

   **Backend (via API call):**
   ```python
   raise Exception("Test error from backend")
   ```

4. Check Sentry dashboard for the errors

### Verification Checklist

- [ ] Backend health endpoint returns 200
- [ ] Frontend loads without errors
- [ ] Login/auth works
- [ ] Can interact with dashboard/chat
- [ ] API calls succeed (Network tab shows 200)
- [ ] CORS headers present (`Access-Control-Allow-Origin`)
- [ ] No sensitive data in browser console
- [ ] Sentry capturing errors (if configured)
- [ ] SSL/TLS certificate valid (check browser lock icon)

---

## Monitoring & Alerts

### 1. Set Up Uptime Monitoring

Use any of these services to monitor backend health:

**UptimeRobot** (free):
1. Sign up at https://uptimerobot.com
2. Create new monitor:
   - **URL**: `https://<backend-url>/api/v1/health`
   - **Interval**: 5 minutes
   - **Alert Contacts**: Your email
3. Get alerts if backend goes down

**Better Uptime** (free tier):
1. Sign up at https://betterstack.com
2. Create monitor with same settings

**Using the health check script**:
```bash
# Add to cron (runs every 5 minutes)
*/5 * * * * /path/to/raven/scripts/check_health.sh https://<backend-url>
```

### 2. Configure Sentry Alerts

1. Log in to Sentry.io
2. Go to **Alerts** > **Create Alert Rule**
3. Set up alert when:
   - **Event**: New error or issue
   - **Notify**: Slack, email, PagerDuty, etc.
4. Configure for both frontend and backend projects

### 3. Monitor Database Performance

In Supabase dashboard:
1. Go to **Monitoring** > **Database**
2. Watch:
   - Query performance
   - Connection count
   - Error rates
3. Set up alerts for high CPU/memory usage

### 4. Backend Logs

**Railway**:
- Logs tab shows real-time output
- Search and filter logs
- Set alerts for errors

**Render**:
- Logs tab shows real-time output
- Download logs as files

---

## Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError` or `ImportError`

**Solution**:
1. Verify `requirements.txt` has all dependencies
2. Check logs for specific missing module
3. Add to `requirements.txt` and redeploy

**Error**: `ANTHROPIC_API_KEY not found`

**Solution**:
1. Verify env var is set in hosting platform
2. Check variable name (must be exact)
3. Redeploy after setting variable

### CORS errors in browser

**Error**: `Access-Control-Allow-Origin` missing

**Solution**:
1. Check `ALLOWED_ORIGINS` env var on backend
2. Make sure frontend URL is included
3. Format: `https://app.raven.com,https://www.raven.com` (comma-separated)
4. Redeploy backend

### Authentication not working

**Error**: Login fails, redirects to login

**Solution**:
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in frontend
2. Check Supabase authentication settings:
   - Go to **Authentication > URL Configuration**
   - Add your frontend URL to "Site URL" and "Redirect URLs"
3. Clear browser cache and cookies
4. Redeploy frontend

### API calls fail with 401 Unauthorized

**Error**: Requests to backend fail with 401

**Solution**:
1. Check JWT token is being sent
2. Verify `SUPABASE_JWT_SECRET` matches frontend's secret
3. Check token expiry (default: 24 hours)
4. Look at backend logs for auth errors

### Database migrations failed

**Error**: SQL error when running migrations

**Solution**:
1. Check migration syntax
2. Verify tables don't already exist
3. Run migrations one at a time
4. Check Supabase SQL Editor for specific error message
5. If stuck, drop tables and rerun migrations

### Out of memory or slow performance

**Error**: Backend crashes or timeouts

**Solution**:
1. Upgrade plan (Railway, Render)
2. Optimize database queries
3. Enable caching (Redis)
4. Monitor logs for long-running operations
5. Contact hosting support

### Frontend build fails

**Error**: `npm run build` fails in CI/CD

**Solution**:
1. Check environment variables are set
2. Verify TypeScript errors: `npm run lint`
3. Check for missing dependencies
4. Review build output for specific error
5. Test locally: `npm run build`

---

## Performance Tips

### Backend Optimization

1. Enable database connection pooling
2. Set appropriate `MONTHLY_TOKEN_LIMIT`
3. Monitor Anthropic API usage
4. Cache frequently accessed data
5. Use compression middleware

### Frontend Optimization

1. Code splitting is enabled in `vite.config.ts`
2. Images optimized with size constraints
3. Bundle analyzed with Rollup
4. Static assets cached (via Vercel)
5. CSS is minified in production

### Database Optimization

1. Add indexes on frequently queried columns
2. Archive old data to separate table
3. Use connection pooling
4. Monitor slow query logs
5. Regular backups (Supabase auto-backs up)

---

## Security Checklist

- [ ] All API keys stored in environment variables (not in .env files)
- [ ] ANTHROPIC_API_KEY only on backend
- [ ] SUPABASE_SERVICE_KEY only on backend
- [ ] VITE_ variables in frontend cannot contain secrets
- [ ] SSL/TLS enabled on all URLs
- [ ] CORS limited to specific origins
- [ ] Database RLS enabled
- [ ] Rate limiting enabled
- [ ] Headers set (X-Content-Type-Options, etc.)
- [ ] Error details not exposed to users
- [ ] Sentry configured for error tracking
- [ ] Secrets rotated periodically

---

## Support & Additional Resources

- **Raven Documentation**: See README.md
- **Supabase Docs**: https://supabase.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Vite Docs**: https://vitejs.dev
- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://railway.app/docs
- **Sentry Docs**: https://docs.sentry.io

For issues or questions, open a GitHub issue or contact the team.
