// Pure helpers for the Google OAuth redirect flow (Supabase Auth) — no
// React Native imports, so this file can be unit-tested in plain Node.
//
// Flow: the app opens Supabase's /auth/v1/authorize?provider=google URL in
// a browser session; Google asks the user to pick an account; Supabase
// redirects back to the app's deep link with the session tokens in the
// URL fragment:  <redirect>#access_token=...&refresh_token=...&expires_in=3600
// On failure the redirect carries error / error_description instead.

export function buildGoogleAuthorizeUrl(supabaseUrl: string, redirectTo: string): string {
  // prompt=select_account: ALWAYS show Google's account chooser.
  // Without it, Google silently reuses the browser's already-signed-in
  // account — the user can never pick a different one (owner report
  // 2026-10-30: sign-in "went straight into the account").
  return `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&prompt=select_account`;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

function parseParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const hashIdx = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const raw =
    hashIdx >= 0 ? url.slice(hashIdx + 1) : queryIdx >= 0 ? url.slice(queryIdx + 1) : '';
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    try {
      params.set(key, decodeURIComponent(value.replace(/\+/g, ' ')));
    } catch {
      params.set(key, value);
    }
  }
  return params;
}

// Returns the session tokens from a successful OAuth redirect, or null
// when the URL carries no usable token pair.
export function parseOAuthRedirect(url: string): OAuthTokens | null {
  const params = parseParams(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  const expiresIn = Number(params.get('expires_in') ?? '3600');
  return {
    accessToken,
    refreshToken,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600,
  };
}

// Returns the human-readable OAuth error from a failed redirect, or null.
export function oauthRedirectError(url: string): string | null {
  const params = parseParams(url);
  const description = params.get('error_description');
  if (description) return description;
  return params.get('error') ?? null;
}
