# Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] Create `.env.local` file with all required environment variables
- [ ] Set up Supabase project
- [ ] Set up Upstash Redis
- [ ] Set up Lemon Squeezy account and products
- [ ] Set up Resend account
- [ ] Get API keys for formation services (optional)

### Database Setup
- [ ] Run `npx prisma db push` to create tables
- [ ] Run all Supabase migrations in SQL editor:
  - [ ] `20260312000000_storage_and_triggers.sql`
  - [ ] `20260313000000_handle_new_user.sql`
  - [ ] `20260313000002_performance_indexes.sql`
  - [ ] `20260313000004_leg_trip_id_vendo.sql`
  - [ ] `20260313000005_cascade_deletes.sql`
  - [ ] `20260314000000_pg_cron_setup.sql`
  - [ ] `20260315000000_calendar_token.sql`
- [ ] Run `npx prisma db seed` to populate rolling stock data
- [ ] Enable Google OAuth in Supabase
- [ ] Verify storage buckets and RLS policies

### Vercel Configuration
- [ ] Connect repository to Vercel
- [ ] Configure all environment variables in Vercel dashboard
- [ ] Set up domains and SSL
- [ ] Configure cron job for health check (every 5 minutes)
- [ ] Set up monitoring and alerts

## Deployment

### Build Process
- [ ] Run `npm run build:clean` locally to test build
- [ ] Fix any build errors or type issues
- [ ] Deploy to Vercel (preview or production)

### Post-Deployment
- [ ] Test all core features:
  - [ ] User registration (email + Google OAuth)
  - [ ] Login and logout
  - [ ] Trip creation and editing
  - [ ] Connection search
  - [ ] Map functionality
  - [ ] Subscription flow (Lemon Squeezy)
  - [ ] Journal features (if Plus/Pro)
- [ ] Test webhooks:
  - [ ] Lemon Squeezy webhook endpoint
  - [ ] Verify subscription events are processed
- [ ] Test email delivery
- [ ] Verify health check endpoint is working
- [ ] Check error logs in Vercel dashboard

## Production Monitoring

### Health Checks
- [ ] Set up UptimeRobot or similar for `/api/health`
- [ ] Monitor Vercel metrics
- [ ] Set up error tracking (Sentry, etc.)

### Backups
- [ ] Enable automated Supabase backups
- [ ] Test backup restoration process

### Performance
- [ ] Enable Vercel analytics
- [ ] Monitor Core Web Vitals
- [ ] Set up caching headers where appropriate

## Troubleshooting

### Common Issues

**Build Errors**
- Check TypeScript types: `npm run type-check`
- Verify all dependencies are installed
- Check for missing environment variables

**Database Issues**
- Verify DATABASE_URL is correct
- Check Supabase connection
- Ensure migrations ran successfully

**Auth Issues**
- Verify Supabase credentials
- Check redirect URLs in Supabase auth settings
- Ensure Google OAuth is configured

**Map Issues**
- Verify OpenFreeMap tiles are loading
- Check MapLibre GL JS bundle size
- Ensure map container has proper dimensions

### Support

If you encounter issues during deployment:
1. Check Vercel logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure all migrations ran successfully
5. Check the [GitHub Issues](https://github.com/your-repo/issues) for known problems