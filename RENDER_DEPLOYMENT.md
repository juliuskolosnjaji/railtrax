# Render.com Deployment Guide for RailPlanner

This guide walks you through deploying your RailPlanner app on Render.com with full functionality including Google OAuth.

## Prerequisites

- Render.com account (free tier available)
- All your environment variables ready
- GitHub repository connected
- Google OAuth credentials (for social login)

## Quick Deploy with Render.yaml

### 1. Connect GitHub to Render
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Render will automatically detect your `render.yaml` file

### 2. Manual Setup (Alternative)
If you prefer manual setup instead of using render.yaml:

**Basic Configuration:**
- **Name**: railplanner-web
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

### 3. Environment Variables Setup

Add these environment variables in your Render dashboard:

```bash
# Database
DATABASE_URL=your-postgresql-connection-string

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Billing (Lemon Squeezy)
LEMONSQUEEZY_API_KEY=your-lemon-squeezy-api-key
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-secret
LEMONSQUEEZY_STORE_ID=your-store-id
LS_VARIANT_PLUS_MONTHLY=your-plus-monthly-variant-id
LS_VARIANT_PLUS_YEARLY=your-plus-yearly-variant-id
LS_VARIANT_PRO_MONTHLY=your-pro-monthly-variant-id
LS_VARIANT_PRO_YEARLY=your-pro-yearly-variant-id

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# OAuth (Google)
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret

# AI (Anthropic)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Train Data APIs
SWISS_OTD_API_KEY=your-swiss-api-key
NS_API_KEY=your-ns-api-key
NAVITIA_API_KEY=your-navitia-api-key

# App URL (automatically set by Render)
NEXT_PUBLIC_URL=your-app-url-on-render

# Node.js version
NODE_VERSION=20.19.0
```

### 4. Advanced Configuration

**Instance Settings:**
- **Plan**: Starter (free) or Standard for better performance
- **Auto-deploy**: Enable (deploys on every push to main)
- **Health checks**: Enabled with `/api/health` endpoint
- **Environment**: Production

**Custom Domain (Optional):**
1. Go to Settings → Custom Domains
2. Add your domain
3. Update DNS records as instructed
4. Update Google OAuth redirect URLs with your custom domain

### 5. Google OAuth Configuration for Render

Since you're using Google OAuth, make sure to:

1. **Update Google Cloud Console:**
   - Add your Render domain to authorized JavaScript origins
   - Add `https://your-app.onrender.com/auth/callback` to redirect URIs

2. **Update Supabase:**
   - Add your Render domain to authorized redirect URLs
   - Both `http://localhost:3000/auth/callback` and `https://your-app.onrender.com/auth/callback`

### 6. Deploy Your Application

1. Push your code to GitHub main branch
2. Render will automatically detect the push and start deployment
3. Monitor the deployment logs in Render dashboard
4. Once complete, test your application at the provided URL

### 7. Post-Deployment Verification

**Test these features:**
- ✅ Homepage loads correctly
- ✅ Sign up with email works
- ✅ Sign up with Google works
- ✅ Login functionality works
- ✅ Database connections work
- ✅ Redis caching works
- ✅ API endpoints respond correctly
- ✅ Billing integration works
- ✅ Email notifications work

### 8. Monitoring & Maintenance

**Set up monitoring:**
- Enable Render's built-in monitoring
- Set up alerts for downtime
- Monitor build logs for errors
- Track performance metrics

**Regular maintenance:**
- Keep dependencies updated
- Monitor for security alerts
- Review logs regularly
- Test all features periodically

## Troubleshooting

### Common Issues:

**Build fails with Node.js version errors:**
- Ensure NODE_VERSION is set to 20.19.0
- Check that all dependencies support Node 20

**Database connection issues:**
- Verify DATABASE_URL is correct
- Check if your database accepts external connections
- Ensure firewall rules allow Render IPs

**Google OAuth not working:**
- Verify redirect URLs in Google Cloud Console
- Check environment variables are set correctly
- Ensure your domain is in authorized origins

**Environment variables not loading:**
- Double-check variable names match your code
- Ensure no typos in values
- Check Render logs for variable loading errors

**Performance issues:**
- Consider upgrading from free tier
- Enable caching where appropriate
- Optimize database queries

## Support

If you encounter issues:
1. Check Render deployment logs
2. Verify all environment variables are set
3. Test locally first with same environment variables
4. Review the comprehensive setup guide in `GOOGLE_OAUTH_SETUP.md`
5. Check Render's documentation: https://render.com/docs

## Next Steps

- Set up custom domain for professional appearance
- Configure email notifications for deployment events
- Set up monitoring and alerting
- Consider adding a staging environment
- Implement proper error tracking (Sentry, etc.)