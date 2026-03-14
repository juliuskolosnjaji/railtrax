#!/bin/bash

# Script to add all environment variables from .env.local to Vercel

echo "🚀 Adding environment variables to Vercel..."

# Read .env.local and add each variable
while IFS='=' read -r key value || [[ -n "$key" ]]; do
    # Skip comments and empty lines
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z "$key" ]]; then
        continue
    fi
    
    # Remove any leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    echo "Adding: $key"
    npx vercel env add "$key" production,preview,development <<EOF
$value
EOF
    echo "✅ Added $key"
done < .env.local

echo "🎉 All environment variables added!"
echo ""
echo "Now run: npx vercel"