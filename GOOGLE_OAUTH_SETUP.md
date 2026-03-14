# Google OAuth Setup Guide for RailPlanner

This guide walks you through setting up Google OAuth for your RailPlanner application.

## Prerequisites

- Google Cloud Console account (free)
- Supabase project with authentication enabled
- Your deployed application URL

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "railplanner-auth")
4. Click "Create"

### 1.2 Enable Required APIs
1. In your project, go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - "Google+ API" (for basic profile info)
   - "Identity and Access Management API"

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (since this is for public users)
3. Fill in the required information:
   - App name: "RailPlanner"
   - User support email: Your email
   - Developer contact: Your email
4. Add authorized domains:
   - Your production domain (e.g., "railplanner.app")
   - "localhost" (for development)
5. Add scopes:
   - `email`
   - `profile`
   - `openid`
6. Complete the consent screen setup

## Step 2: Create OAuth Credentials

### 2.1 Create OAuth Client ID
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose application type: "Web application"
4. Configure as follows:

**Authorized JavaScript origins:**
- `http://localhost:3000` (development)
- `https://your-domain.com` (production)

**Authorized redirect URIs:**
- `http://localhost:3000/auth/callback` (development)
- `https://your-domain.com/auth/callback` (production)

5. Click "Create" and save your Client ID and Client Secret

## Step 3: Configure Supabase

### 3.1 Enable Google Provider
1. Go to your [Supabase dashboard](https://app.supabase.com)
2. Select your project
3. Go to "Authentication" → "Providers"
4. Find "Google" and click "Enable"
5. Enter your credentials:
   - Client ID: From Google Cloud Console
   - Client Secret: From Google Cloud Console
6. Add redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback`
7. Save changes

### 3.2 Configure User Metadata
The Google OAuth will automatically capture:
- Email address
- Full name
- Profile picture URL
- Google ID

This data is stored in the user's `raw_user_meta_data` and can be accessed via the `user.user_metadata` object.

## Step 4: Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-client-id-from-google
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret-from-google
```

For production (Netlify, Vercel, etc.):
1. Go to your deployment dashboard
2. Add these as environment variables
3. Redeploy your application

## Step 5: Test the Implementation

### 5.1 Local Testing
1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/signup`
3. Click "Sign up with Google"
4. Complete the Google authentication flow
5. You should be redirected to `/dashboard` after successful authentication

### 5.2 Production Testing
1. Deploy your changes
2. Navigate to your production signup page
3. Test the Google sign-up flow
4. Verify user data is properly stored in Supabase

## Troubleshooting

### Common Issues:

**"Invalid redirect URI" error:**
- Double-check your redirect URIs in Google Cloud Console
- Ensure they exactly match your `/auth/callback` endpoint
- Include both `http://localhost:3000` and your production domain

**"Sign up with Google" button not working:**
- Check browser console for JavaScript errors
- Verify your Google Client ID is correctly set in environment variables
- Ensure Google+ API is enabled in Google Cloud Console

**User not created in Supabase:**
- Check Supabase authentication logs
- Verify the Google provider is enabled in Supabase dashboard
- Ensure your auth callback route is properly configured

**CORS errors:**
- Add your domain to authorized JavaScript origins in Google Cloud Console
- Ensure your production domain is included in both origins and redirects

## Security Best Practices

1. **Keep your client secret secure** - Never expose it to the client-side
2. **Use HTTPS in production** - Google requires HTTPS for production apps
3. **Implement proper session management** - Supabase handles this automatically
4. **Regular security audits** - Periodically review your OAuth configuration
5. **Monitor usage** - Keep an eye on your Google Cloud Console for unusual activity

## Next Steps

- Consider adding other OAuth providers (GitHub, Facebook, Twitter)
- Implement account linking for users who want to connect multiple providers
- Add social login buttons to the login page (if not already present)
- Customize the user experience based on login method

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Review Supabase authentication logs
3. Verify your Google Cloud Console configuration
4. Test with different browsers and devices