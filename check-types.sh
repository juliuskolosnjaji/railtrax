#!/bin/bash

echo "🔍 Running comprehensive TypeScript error detection..."

# Check for any .ts or .tsx files that might have implicit any issues
echo "📋 Checking for files with potential TypeScript issues..."

# Find all TypeScript files and check them
find app -name "*.ts" -o -name "*.tsx" | while read -r file; do
  echo "Checking: $file"
  # Look for common patterns that cause TypeScript errors
  if grep -n "forEach.*=>.*{" "$file" | grep -v ":\s*[A-Z]"; then
    echo "⚠️  Potential implicit any in forEach: $file"
  fi
  
  if grep -n "map.*=>.*{" "$file" | grep -v ":\s*[A-Z]"; then
    echo "⚠️  Potential implicit any in map: $file"
  fi
  
  if grep -n "filter.*=>.*{" "$file" | grep -v ":\s*[A-Z]"; then
    echo "⚠️  Potential implicit any in filter: $file"
  fi
done

echo ""
echo "🏗️  Running full TypeScript compilation check..."
npx tsc --noEmit --strict --noImplicitAny --strictNullChecks

if [ $? -eq 0 ]; then
  echo "✅ TypeScript compilation successful!"
else
  echo "❌ TypeScript errors found. Let's check the Next.js build..."
fi

echo ""
echo "🚀 Running Next.js build..."
npm run build