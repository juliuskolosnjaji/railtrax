# Railtrax

A full-stack web app for planning, visualizing, and documenting European train journeys. Built with Next.js 16, Supabase, and Tailwind CSS.

## ✅ Recent Updates

- **Next.js 16 Upgrade**: Successfully upgraded from Next.js 14 to Next.js 16 with React 19
- **Google OAuth**: Added Google sign-up and login functionality
- **PDF Export Fixes**: Resolved 4 critical issues - missing station names, invalid dates, 0km distances, and map failures
- **Fallback Map Generator**: Created SVG fallback when external map services fail
- **Distance Calculations**: Fixed missing distance_km calculations for existing legs
- **Render.com Deployment**: Ready for deployment on Render.com with proper configuration

## 🚀 Features

- **Trip Planning**: Create and manage multi-leg train journeys
- **Connection Search**: Search connections across DB/SBB/ÖBB with real-time data
- **Interactive Map**: Visualize routes on a map using Maplibre GL JS
- **Travel Journal**: Document your journeys with rich text and photos (Plus/Pro)
- **Statistics**: Track your train travel with detailed stats and heatmaps
- **Träwelling Integration**: Check in to your train journeys
- **Export**: Share your trips as PDF or image

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Map**: Maplibre GL JS + react-map-gl
- **State Management**: React Query + Zustand
- **Forms**: React Hook Form + Zod
- **Deployment**: Render.com

## 🚀 Deployment

### Render.com Deployment (Recommended)

1. **Connect your GitHub repository** to Render.com
2. **Use the provided `render.yaml`** configuration file
3. **Set environment variables** as shown above
4. **Deploy automatically** on push to main branch

See [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md) for detailed deployment instructions.

### Manual Setup (Alternative)

#### Prerequisites

Before deploying, you need to set up the following services:

1. **Supabase Project** - Database and Auth
2. **Upstash Redis** - Caching and rate limiting
3. **Lemon Squeezy** - Subscription management
4. **Resend** - Email delivery

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=your-api-key
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-secret
LEMONSQUEEZY_STORE_ID=your-store-id
LS_VARIANT_PLUS_MONTHLY=your-plus-monthly-variant-id
LS_VARIANT_PLUS_YEARLY=your-plus-yearly-variant-id
LS_VARIANT_PRO_MONTHLY=your-pro-monthly-variant-id
LS_VARIANT_PRO_YEARLY=your-pro-yearly-variant-id

# Email
RESEND_API_KEY=your-resend-api-key

# App
NEXT_PUBLIC_URL=https://your-app.render.app

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI (optional)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Formation APIs (optional)
SWISS_OTD_API_KEY=your-swiss-otd-key
NS_API_KEY=your-ns-api-key
NAVITIA_API_KEY=your-navitia-api-key
```

### Database Setup

1. **Push Prisma Schema**:
   ```bash
   npx prisma db push
   ```

2. **Run Supabase Migrations**:
   Copy the contents of `supabase/migrations/` and run them in your Supabase SQL editor in order:
   - `20260312000000_storage_and_triggers.sql`
   - `20260313000000_handle_new_user.sql`
   - `20260313000002_performance_indexes.sql`
   - `20260313000004_leg_trip_id_vendo.sql`
   - `20260313000005_cascade_deletes.sql`
   - `20260314000000_pg_cron_setup.sql`
   - `20260315000000_calendar_token.sql`

3. **Seed Rolling Stock Data**:
   ```bash
   npx prisma db seed
   ```

### Post-Deployment Fixes

1. **Fix Missing Distance Calculations** (for existing trips):
   ```bash
   npx prisma db execute --file scripts/fix-distance-km.sql
   ```
   This fixes 0km/0kg CO₂ calculations in PDF exports.

2. **PDF Export Issues Resolved**:
   - ✅ Station names now display correctly
   - ✅ Invalid dates fixed with proper null handling
   - ✅ Distance calculations work for all legs
   - ✅ Fallback SVG map when external services fail

### Google OAuth Setup

1. **Set up Google Cloud Console**:
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs: `https://your-app.com/auth/callback`
   - Copy Client ID and Client Secret to environment variables

   See [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md) for detailed German tutorial.

### Supabase Configuration

1. **Enable Google OAuth**:
   - Go to Authentication → Providers
   - Enable Google provider
   - Add your Google Client ID and Client Secret
   - Add your Google OAuth credentials

2. **Set up Storage Buckets**:
   - The migrations will create the necessary buckets
   - Ensure RLS policies are correctly applied

3. **Configure Webhook**:
   - In Lemon Squeezy, set the webhook URL to: `https://your-app.vercel.app/api/billing/webhook`
   - Use the `LEMONSQUEEZY_WEBHOOK_SECRET` from your environment variables

### Vercel Deployment

1. **Connect to Vercel**:
   ```bash
   npx vercel
   ```
   Or push your code to a Git repository and import it in the Vercel dashboard.

2. **Configure Environment Variables**:
   - In your Vercel project settings, add all environment variables from `.env.local`
   - Use the Vercel integration for easier management of Supabase and Upstash

3. **Deploy**:
   ```bash
   npx vercel --prod
   ```

### Post-Deployment

1. **Test the Application**:
   - Check all features work correctly
   - Test user registration and login
   - Test connection search and trip creation
   - Test subscription flows

2. **Set up Health Check**:
   - The `/api/health` endpoint is configured to run every 5 minutes
   - This prevents Supabase from pausing your project

3. **Monitor Logs**:
   - Use Vercel's built-in logging to monitor your application
   - Set up error tracking if needed

## 📝 Development

To run the project locally:

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run database migrations
npx prisma db push

# Run seed data
npx prisma db seed

# Start development server
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.