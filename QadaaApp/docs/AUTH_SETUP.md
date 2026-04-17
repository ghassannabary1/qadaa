# OAuth Setup

This app now has a Supabase-based account section ready for Google and Facebook sign-in.

## Environment

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Supabase

1. Create a Supabase project.
2. Copy the project URL and publishable key.
3. In Supabase Auth, enable Google and Facebook providers.
4. Add the native redirect URL allowlist for this Expo app using the `qadaa` scheme.

Suggested native redirect:

```txt
qadaa://auth/callback
```

## Google

1. Create a Google OAuth app.
2. Add the Supabase callback URL shown in the Supabase Google provider screen.
3. Save the Google client ID and secret in Supabase.

## Facebook

1. Create a Facebook app in Meta for Developers.
2. Add the Supabase callback URL shown in the Supabase Facebook provider screen.
3. Ensure both `public_profile` and `email` permissions are enabled for testing.
4. Save the Facebook app ID and secret in Supabase.

## Testing

OAuth testing should be done in a development build or native run, not Expo Go.

Examples:

```bash
npx expo run:android
npx expo run:ios
```
