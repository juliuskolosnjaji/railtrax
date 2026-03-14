#!/bin/bash

# Railtrax Deployment Script
# This script helps prepare the project for Vercel deployment

set -e

echo "🚀 Starting Railtrax deployment preparation..."

# Check if required environment variables are set
echo "🔍 Checking environment variables..."

required_vars=(
  "DATABASE_URL"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
  "LEMONSQUEEZY_API_KEY"
  "LEMONSQUEEZY_WEBHOOK_SECRET"
  "LEMONSQUEEZY_STORE_ID"
  "RESEND_API_KEY"
  "NEXT_PUBLIC_URL"
)

missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  printf ' %s\n' "${missing_vars[@]}"
  echo "Please set these in your .env.local file before deploying."
  exit 1
fi

echo "✅ All required environment variables are set"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Type checking
echo "🔍 Running TypeScript type checking..."
npm run type-check

# Build the project
echo "🏗️  Building the project..."
npm run build

echo "✅ Build completed successfully!"

# Prisma database operations
echo "🗄️  Setting up database..."

if [ "$1" == "--skip-db" ]; then
  echo "⏭️  Skipping database setup as requested"
else
  echo "📤 Pushing Prisma schema..."
  npx prisma db push
  
  echo "🌱 Seeding database..."
  npx prisma db seed
  
  echo "✅ Database setup completed!"
fi

echo "🎉 Railtrax is ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Connect your repository to Vercel"
echo "2. Configure environment variables in Vercel dashboard"
echo "3. Deploy using 'vercel --prod' or through the Vercel dashboard"
echo "4. Run all Supabase migrations in the SQL editor (see DEPLOYMENT.md)"
echo "5. Test all features after deployment"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"