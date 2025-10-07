# Deployment Guide: noir-playground-server

This guide covers deploying the noir-playground-server to production using the GitHub Student Developer Pack benefits.

## Prerequisites

- GitHub Student Developer Pack activated
- DigitalOcean account with $200 student credit claimed
- GitHub repository access

## Recommended Platform: DigitalOcean App Platform

### Benefits
- **$200 credit for 1 year** via GitHub Student Pack
- Native Docker container support
- Automatic SSL/HTTPS
- GitHub integration with auto-deploy
- Simple deployment process
- Cost: ~$5/month (covered by credit for 40 months)

---

## Step-by-Step Deployment

### 1. Claim Your DigitalOcean Student Credit

1. Visit https://www.digitalocean.com/github-students
2. Sign up or login with your GitHub account
3. Verify your student status (if not already verified)
4. $200 credit will be automatically applied to your account

### 2. Deploy via App Platform (Web Console)

#### Option A: Using App Spec File (Recommended)

1. **Login to DigitalOcean**
   - Go to https://cloud.digitalocean.com
   - Click "Create" → "Apps"

2. **Import from GitHub**
   - Select "GitHub" as source
   - Authorize DigitalOcean to access your repositories
   - Choose repository: `noir-playground`
   - Choose branch: `main` (or your preferred branch)

3. **Import App Spec**
   - Click "Edit Your App Spec"
   - Upload or paste contents from `noir-playground-server/.do/app.yaml`
   - Click "Save"

4. **Review Configuration**
   - App name: `noir-playground-server`
   - Region: Choose closest to your users (NYC, SFO, AMS, etc.)
   - Service: Docker container
   - Resources: Basic (1 container, 512MB RAM)

5. **Deploy**
   - Click "Create Resources"
   - Wait 5-10 minutes for initial build
   - Note your app URL: `https://noir-playground-server-xxxxx.ondigitalocean.app`

#### Option B: Manual Configuration

1. **Create App**
   - DigitalOcean Dashboard → Create → Apps
   - Source: GitHub
   - Repository: `noir-playground`
   - Branch: `main`

2. **Configure Service**
   - **Type**: Web Service
   - **Name**: `api`
   - **Source Directory**: `/`
   - **Dockerfile Path**: `noir-playground-server/Dockerfile`
   - **HTTP Port**: `4000`

3. **Environment Variables**
   Add the following in the Environment Variables section:
   ```
   NODE_ENV=production
   PORT=4000
   NOIR_DATA_PATH=/data/noir-profiler
   NOIR_BACKEND_PATH=/usr/local/bin/bb
   ```

4. **Health Check**
   - Path: `/api/health`
   - Initial delay: 60 seconds
   - Timeout: 10 seconds

5. **Choose Plan**
   - Basic: $5/month (recommended, covered by student credit)
   - Professional: $12/month (if you need more resources)

6. **Deploy**
   - Review and confirm
   - Wait for build to complete

### 3. Enable Auto-Deploy (Optional)

1. Go to your App settings in DigitalOcean
2. Navigate to "Settings" → "App-Level"
3. Enable "Autodeploy" toggle
4. Choose branch to auto-deploy from (e.g., `main`)
5. Now every push to that branch will trigger a new deployment

### 4. Configure Frontend (Vercel)

Once your profiler server is deployed, configure the frontend to use it:

1. **Get Your Deployment URL**
   - Find it in DigitalOcean App Platform dashboard
   - Format: `https://noir-playground-server-xxxxx.ondigitalocean.app`

2. **Add Environment Variable in Vercel**
   - Go to https://vercel.com/dashboard
   - Select your `noir-playground` project
   - Settings → Environment Variables
   - Add new variable:
     - **Name**: `VITE_PROFILER_SERVER_URL`
     - **Value**: `https://your-app.ondigitalocean.app`
     - **Environments**: Production, Preview, Development
   - Click "Save"

3. **Redeploy Frontend**
   - Go to Deployments tab
   - Click "..." on latest deployment → "Redeploy"
   - Or push a new commit to trigger deployment

### 5. Verify Deployment

Test your deployed profiler server:

```bash
# Health check
curl https://your-app.ondigitalocean.app/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-07T..."}

# Check profiler availability
curl https://your-app.ondigitalocean.app/api/profile/check-profiler

# Expected response with profiler version info
```

---

## Alternative Deployment Options

### Railway.app (From Student Pack)

Railway is another option but has less generous free tier:

1. Visit https://railway.app
2. Connect GitHub account
3. "New Project" → "Deploy from GitHub repo"
4. Select `noir-playground` repo
5. Railway auto-detects Dockerfile
6. Set environment variables (same as above)
7. Deploy

### Heroku (From Student Pack)

Heroku offers $13/month for 24 months:

1. Install Heroku CLI: `brew install heroku`
2. Login: `heroku login`
3. Create app: `heroku create noir-playground-server`
4. Set stack: `heroku stack:set container`
5. Deploy: `git push heroku main`

---

## Monitoring & Maintenance

### View Logs
- DigitalOcean: App → Runtime Logs
- Filter by component, severity, time range

### Monitor Usage
- Dashboard → Billing
- Check remaining student credit
- View monthly resource usage

### Scale Resources
If you need more power:
1. App Settings → Components → api
2. Change instance size
3. Costs will increase accordingly

### Update Deployment
- **Auto-deploy enabled**: Just push to your branch
- **Manual**: App → Settings → Force Rebuild & Deploy

---

## Cost Breakdown

| Plan | RAM | CPU | Cost/Month | Months with $200 Credit |
|------|-----|-----|------------|-------------------------|
| Basic XXS | 512MB | 0.5 vCPU | $5 | 40 months |
| Basic XS | 1GB | 1 vCPU | $12 | 16 months |
| Professional XS | 1GB | 1 vCPU | $25 | 8 months |

**Recommendation**: Start with Basic XXS. The profiler server is lightweight and $5/month is sufficient.

---

## Troubleshooting

### Build Fails

**Issue**: Docker build times out or fails
- **Solution**: Check build logs in DigitalOcean console
- Ensure Dockerfile is valid and builds locally
- Check that all dependencies are specified

### Health Check Fails

**Issue**: App fails health checks and restarts
- **Solution**: Increase `initial_delay_seconds` to 90
- Server needs time to install noir-profiler on first start
- Check logs for errors during startup

### CORS Errors

**Issue**: Frontend can't connect to profiler server
- **Solution**: CORS is already configured in main.ts
- Verify VITE_PROFILER_SERVER_URL is set correctly in Vercel
- Check that URL includes https:// prefix

### Out of Memory

**Issue**: Container crashes with OOM errors
- **Solution**: Upgrade to Basic XS plan (1GB RAM)
- Barretenberg backend needs more memory for large circuits

---

## Security Best Practices

1. **Keep Dependencies Updated**
   - Regularly update npm packages
   - Update Noir toolchain versions in Dockerfile

2. **Monitor Access Logs**
   - Check for unusual traffic patterns
   - Set up alerts for high error rates

3. **Rate Limiting**
   - Consider adding rate limiting for public endpoints
   - Use DigitalOcean's built-in DDoS protection

4. **Environment Variables**
   - Never commit secrets to git
   - Use DigitalOcean's encrypted environment variables

---

## Support & Resources

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **GitHub Student Pack**: https://education.github.com/pack
- **DigitalOcean Community**: https://www.digitalocean.com/community/
- **NestJS Deployment**: https://docs.nestjs.com/

---

## Quick Reference Commands

```bash
# Test local Docker build
docker build -t noir-playground-server ./noir-playground-server
docker run -p 4000:4000 noir-playground-server

# Test deployed endpoint
curl https://your-app.ondigitalocean.app/api/health

# View DigitalOcean CLI commands
doctl apps list
doctl apps logs <app-id> --follow

# Force redeploy
doctl apps create-deployment <app-id>
```

---

## Next Steps After Deployment

1. ✅ Test profiler functionality in production frontend
2. ✅ Monitor first week of usage and performance
3. ✅ Set up alerts for downtime or errors
4. ✅ Document any issues or improvements needed
5. ✅ Consider caching strategies if usage is high

---

**Deployment Date**: _[Add date when deployed]_
**Deployed By**: @0xandee
**Production URL**: _[Add URL when deployed]_
**Status**: Ready for deployment
