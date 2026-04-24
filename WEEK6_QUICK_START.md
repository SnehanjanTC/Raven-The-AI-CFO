# Week 6 Deployment - Quick Start Checklist

## What Was Created

All deployment infrastructure files for production launch. This enables Raven to deploy to:
- **Frontend**: Vercel (SPA hosting)
- **Backend**: Railway or Render (containerized API)
- **Database**: Supabase (managed PostgreSQL)
- **Error Tracking**: Sentry (frontend + backend)
- **Monitoring**: Health checks + uptime monitoring

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `vercel.json` | Frontend deployment config | ✓ Created |
| `backend/Dockerfile` | Backend container image | ✓ Created |
| `backend/.dockerignore` | Docker build optimization | ✓ Created |
| `backend/railway.toml` | Railway.app deployment | ✓ Created |
| `backend/render.yaml` | Render.com deployment | ✓ Created |
| `backend/app/core/production.py` | Production config & logging | ✓ Created |
| `backend/app/core/sentry.py` | Backend error tracking | ✓ Created |
| `src/lib/sentry.ts` | Frontend error tracking | ✓ Created |
| `scripts/check_health.sh` | Health monitoring script | ✓ Created |
| `.github/workflows/ci.yml` | CI/CD pipeline | ✓ Created |
| `.env.example` | Environment template (updated) | ✓ Updated |
| `backend/requirements.txt` | Dependencies (updated) | ✓ Updated |
| `DEPLOYMENT.md` | Complete deployment guide | ✓ Created |

## Pre-Launch Checklist

### Phase 1: Account Setup (Days 1-2)

- [ ] **Supabase**: Create production project
  - Go to https://supabase.com
  - Create new project (Pro plan)
  - Save URL and keys

- [ ] **Anthropic**: Get API key
  - Go to https://console.anthropic.com
  - Generate API key
  - Keep secure

- [ ] **Backend Hosting**: Choose and setup
  - [ ] Railway: https://railway.app (recommended)
  - [ ] Render: https://render.com

- [ ] **Frontend Hosting**: Setup Vercel
  - Go to https://vercel.com
  - Connect GitHub account

- [ ] **Sentry**: Create error tracking projects
  - Go to https://sentry.io
  - Create organization
  - Create frontend project (DSN)
  - Create backend project (DSN)

- [ ] **Domain**: Register and setup
  - Register domain (Namecheap, GoDaddy, etc.)
  - Have DNS access ready

### Phase 2: Database Setup (Days 2-3)

- [ ] **Run Supabase migrations**
  ```bash
  # Open Supabase SQL Editor
  # Run each SQL migration file
  # Verify: Tables created, no errors
  ```

- [ ] **Enable RLS** (Row-Level Security)
  ```
  Settings > Authentication > Policies
  Enable for each table
  ```

- [ ] **Save credentials securely**
  ```
  Save to password manager:
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
  - SUPABASE_JWT_SECRET
  - SUPABASE_ANON_KEY
  ```

### Phase 3: Backend Deployment (Days 3-4)

- [ ] **Push code to GitHub**
  ```bash
  git push origin main
  ```

- [ ] **Railway deployment** (if chosen)
  - Connect GitHub repo
  - Select backend directory
  - Add environment variables:
    ```
    ENVIRONMENT=production
    ANTHROPIC_API_KEY=sk-ant-...
    SUPABASE_URL=...
    SUPABASE_SERVICE_KEY=...
    SENTRY_DSN=...
    SECRET_KEY=... (generate: openssl rand -hex 32)
    ```
  - Deploy

- [ ] **Render deployment** (if chosen)
  - Create Web Service
  - Connect GitHub
  - Select Docker build
  - Add environment variables
  - Deploy

- [ ] **Test backend health**
  ```bash
  curl https://<backend-url>/api/v1/health
  # Should return: {"status": "healthy", ...}
  ```

### Phase 4: Frontend Deployment (Days 4-5)

- [ ] **Vercel deployment**
  - Connect GitHub repo
  - Set environment variables:
    ```
    VITE_SUPABASE_URL=...
    VITE_SUPABASE_ANON_KEY=...
    VITE_API_URL=https://<backend-url>/api/v1
    VITE_SENTRY_DSN=...
    ```
  - Deploy

- [ ] **Configure custom domain**
  - Add domain in Vercel
  - Update DNS records (CNAME to cname.vercel-dns.com)
  - Wait for SSL certificate (24 hours)

- [ ] **Test frontend**
  - Open https://app.raven.com (or your domain)
  - Check browser console for errors
  - Test login flow
  - Test API calls (DevTools Network tab)

### Phase 5: Monitoring Setup (Days 5-6)

- [ ] **Sentry alerts**
  - Login to Sentry
  - Configure alert rules
  - Add Slack/email notification

- [ ] **Uptime monitoring**
  - Setup UptimeRobot or Better Stack
  - Add backend health check URL
  - Configure alerts

- [ ] **Test error tracking**
  - Trigger test error in browser console
  - Trigger test error in backend
  - Verify appears in Sentry dashboard

### Phase 6: Security & Testing (Days 6-7)

- [ ] **Security checklist**
  - [ ] HTTPS/SSL enabled
  - [ ] CORS limited to your domain
  - [ ] Secrets in env vars (not code)
  - [ ] Database RLS enabled
  - [ ] No API keys in logs
  - [ ] Error details not exposed
  - [ ] Rate limiting working

- [ ] **Functional testing**
  - [ ] Login/auth works
  - [ ] Can create/edit data
  - [ ] Can chat with AI
  - [ ] Can download reports
  - [ ] API endpoints respond 200
  - [ ] No CORS errors
  - [ ] No unhandled JavaScript errors

- [ ] **Performance testing** (optional)
  - [ ] Page loads < 3 seconds
  - [ ] API responds < 500ms
  - [ ] No N+1 queries
  - [ ] Images optimized

### Phase 7: Launch! (Day 7)

- [ ] **Final checklist**
  - [ ] All tests passing
  - [ ] Monitoring active
  - [ ] Alerts configured
  - [ ] Team trained
  - [ ] Runbook ready
  - [ ] Backups working

- [ ] **Go live**
  - Update DNS to production
  - Monitor closely for 24 hours
  - Have team on standby
  - Share launch announcement

## Key Commands

### Generate Secure Keys
```bash
# For SECRET_KEY and ENCRYPTION_KEY
openssl rand -hex 32
```

### Test Health Endpoint
```bash
./scripts/check_health.sh https://<backend-url>
```

### View Logs
**Railway**: Dashboard > Logs tab  
**Render**: Dashboard > Logs tab  
**Vercel**: Dashboard > Deployments > Logs

### Manual Build Test
```bash
# Frontend
npm run build
# Should create dist/

# Backend
docker build -t raven-backend backend/
# Should complete without errors
```

## Troubleshooting Quick Links

| Problem | Solution | Link |
|---------|----------|------|
| Backend won't start | Check env vars | DEPLOYMENT.md#troubleshooting |
| CORS errors | Update ALLOWED_ORIGINS | DEPLOYMENT.md#cors-errors |
| Login fails | Check Supabase auth settings | DEPLOYMENT.md#auth-not-working |
| Build fails | Check dependencies | DEPLOYMENT.md#build-fails |

## Documentation

- **Full Deployment Guide**: See `DEPLOYMENT.md` (14 KB, comprehensive)
- **Architecture Overview**: See `WEEK6_DEPLOYMENT_MANIFEST.md`
- **GitHub Actions CI**: See `.github/workflows/ci.yml`

## Support Resources

- **Raven Repo**: GitHub issues, discussions
- **Supabase**: https://supabase.com/docs
- **FastAPI**: https://fastapi.tiangolo.com
- **Vercel**: https://vercel.com/docs
- **Railway**: https://railway.app/docs
- **Sentry**: https://docs.sentry.io

## Estimated Timeline

| Phase | Duration | Critical? |
|-------|----------|-----------|
| Account Setup | 1-2 days | Yes |
| Database Setup | 1 day | Yes |
| Backend Deploy | 1 day | Yes |
| Frontend Deploy | 1 day | Yes |
| Monitoring | 1 day | Recommended |
| Testing | 1 day | Yes |
| **Total** | **6-7 days** | - |

## Success Criteria

When all of these are true, you're ready to launch:

✓ Backend `/api/v1/health` returns 200  
✓ Frontend loads without JavaScript errors  
✓ Login works and redirects to dashboard  
✓ API calls return data (Network tab shows 200)  
✓ Sentry capturing errors  
✓ Health monitoring reports "healthy"  
✓ No sensitive data in logs  
✓ SSL/TLS certificate valid  
✓ All team members can access  
✓ Backup procedures tested  

---

## Week 6 Configuration Files

All files follow production best practices:
- **Security**: Secrets in env vars, security headers, RLS, no exposed errors
- **Scalability**: Auto-scaling, connection pooling, caching ready
- **Observability**: Structured logging, error tracking, health checks
- **Reliability**: Health checks, monitoring, alerts, automated deployment
- **Performance**: Code splitting, minification, Docker optimization, CDN

**Ready for production launch.** ✓
