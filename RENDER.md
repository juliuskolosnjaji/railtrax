# Render Deployment Guide

## Quick Start

### 1. Sign up for Render
- Go to https://render.com
- Create an account (free tier available)

### 2. Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. **Connect to GitHub**: 
   - Authorize Render to access your GitHub
   - Select your repository: `juliuskolosnjaji/railtrax`
   - Select the `main` branch

### 3. Configure Service

**Basic Configuration:**
- **Name**: `railtrax`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Runtime**: **Node** (should auto-detect)
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Instance Type**: **Free** (to start, can upgrade later)

**Environment Variables (Critical):**
Add these in the **Environment** tab:

```bash
# Database
DATABASE_URL=postgresql://postgres:CPMrc%26YccufTdHBS6jSX@db.ifujlwcnfsdxbimqrpgv.supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ifujlwcnfsdxbimqrpgv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdWpsd2NuZnNkeGJpbXFycGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTM0MzEsImV4cCI6MjA4ODkyOTQzMX0.0EVT1thB9-2V4g1NYXbYOekXZjaoqKJr2WQ1QmWiqVw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdWpsd2NuZnNkeGJpbXFycGd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM1MzQzMSwiZXhwIjoyMDg4OTI5NDMxfQ.IwRNAVtm54ocV4Pei3DhaQS_wtTLqwiml1zyI2n7xD4

# App URL (important!)
NEXT_PUBLIC_URL=https://railtrax.onrender.com

# Add other variables from your .env.local file
UPSTASH_REDIS_REST_URL=https://boss-manatee-69910.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAREWAAIncDIwOWE3MzY1ZDgyOTk0ZTczOTIyNjg4MzYxYmE1ZWEzZnAyNjk5MTA
RESEND_API_KEY=re_PSDWFrYt_Bb35xoSyhZ4a5aiRfQ7Y7gf1
```

**Advanced Configuration:**
- **Health Check Path**: `/api/health`
- **Auto-Deploy**: ✅ Enabled (so it deploys when you push to GitHub)

### 4. Deploy
- Click **"Create Web Service"**
- Wait for build to complete (first build may take 5-10 minutes)

### 5. Post-Deployment

**Database Setup:**
1. Run Supabase migrations in your Supabase SQL editor
2. Run: `npx prisma db seed` (you can do this locally since the database is external)

**Test the Application:**
- Visit your Render URL (e.g., `https://railtrax.onrender.com`)
- Test all features work correctly

## Troubleshooting

### Build Fails?
- Check the **Logs** tab in Render dashboard
- Make sure all environment variables are set
- Ensure your database is accessible from Render's IP addresses

### Health Check Fails?
- The `/api/health` endpoint should return 200
- Make sure your database and external services are connected

### Environment Variables Missing?
- Render may take a few minutes to apply new environment variables
- You may need to redeploy after adding variables

## Render Features You'll Like

### Free Tier Benefits:
- **512MB RAM**, **512MB disk** (shared CPU)
- **Web Services**: Free for first service
- **Background Workers**: Free for first worker
- **PostgreSQL**: Free 1GB database (but you're using Supabase)

### Paid Upgrades:
- **Starter**: $7/month for more power
- **Standard**: $25/month for production apps
- **Always-on** instances (free services spin down after 15 minutes)

### Database:
Since you're using Supabase, you don't need Render's PostgreSQL. This keeps your app stateless and portable.

## Domain Setup (Optional)

Once deployed, you can:
1. **Custom Domain**: In Render dashboard → Settings → Domain
2. **Add your domain**: e.g., `railtrax.yourdomain.com`
3. **Update DNS**: Point CNAME to `onrender.com`

## Monitoring

- **Logs**: Real-time logs in Render dashboard
- **Metrics**: CPU, memory, response time
- **Alerts**: Set up email notifications for failures
- **Deploys**: Automatic GitHub integration

---

Your app should deploy successfully on Render! The main advantages over Vercel are:
- More lenient build process
- Better environment variable handling
- Free tier is very generous
- Good for full-stack Node.js applications