import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { safeReturnPath, withTimeout, oauthErrorMessage } from '../lib/authFlow';

export interface GeoData {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  sessionTimeLeft: number | null; // seconds remaining in session, null when not logged in
  isSessionExpiring: boolean;     // true when < 5 minutes left
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: (returnPath?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (name: string, email: string, password: string, geo?: GeoData) => Promise<string | null>;
  signOut: () => Promise<void>;
  /**
   * Update full_name and/or social links in user metadata.
   * If any social link value changes, `social_links_updated_at` is stamped to
   * enforce the 24-hour article-submission cooldown.
   */
  updateProfile: (fullName: string, socialLinks: Record<string, string>) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(() => oauthErrorMessage(window.location.search, window.location.hash));
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSessionTimer = (sess: Session | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!sess?.expires_at) { setSessionTimeLeft(null); return; }

    const tick = () => {
      const remaining = sess.expires_at! - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        setSessionTimeLeft(0);
        clearInterval(timerRef.current!);
        // Supabase refreshes tokens itself. Do not race refresh or call auth APIs from its callback.
      } else {
        setSessionTimeLeft(remaining);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  };

  useEffect(() => {
    let active = true;
    let eventVersion = 0;
    // Keep this callback synchronous and free of Supabase auth calls.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      eventVersion++;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      startSessionTimer(newSession);
      if (newSession) setAuthError(null);
      setLoading(false);
    });
    const initialVersion = eventVersion;
    withTimeout(supabase.auth.getSession()).then(({ data, error }) => {
      if (!active || eventVersion !== initialVersion) return;
      if (error) throw error;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      startSessionTimer(data.session);
    }).catch(() => {
      if (active && eventVersion === initialVersion) setAuthError('Your session could not be restored. Retry sign-in, or try a private browser window.');
    }).finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      subscription.unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isSessionExpiring = sessionTimeLeft !== null && sessionTimeLeft > 0 && sessionTimeLeft < 300;

  const signInWithGoogle = async () => {
    const { error } = await withTimeout(supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    }));
    if (error) throw error;
  };

  const signInWithGitHub = async (returnPath = '/') => {
    setAuthError(null);
    // Request the URL without navigating so a late result cannot redirect after a timeout.
    const { data, error } = await withTimeout(supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}${safeReturnPath(returnPath)}`, skipBrowserRedirect: true },
    }));
    if (error) throw error;
    if (!data.url) throw new Error('GitHub sign-in is unavailable. Please retry.');
    window.location.assign(data.url);
  };

  const signInWithEmail = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signUpWithEmail = async (name: string, email: string, password: string, geo?: GeoData): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          ...(geo && {
            geo_city: geo.city,
            geo_region: geo.region,
            geo_country: geo.country,
            geo_country_code: geo.countryCode,
            geo_lat: geo.lat,
            geo_lng: geo.lng,
            geo_registered_at: new Date().toISOString(),
          }),
        },
      },
    });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (fullName: string, socialLinks: Record<string, string>): Promise<string | null> => {
    const prevMeta = user?.user_metadata ?? {};
    const updatedMeta: Record<string, unknown> = { full_name: fullName };

    let anyLinkChanged = false;
    for (const [id, val] of Object.entries(socialLinks)) {
      const key = `social_${id}`;
      updatedMeta[key] = val;
      // Cooldown only triggers when an existing (non-empty) link is replaced with
      // a different value. Adding a link for the first time (empty → value) or
      // clearing it (value → empty) does NOT start the cooldown.
      const prev = (prevMeta[key] as string | undefined) ?? '';
      if (prev && val && prev !== val) anyLinkChanged = true;
    }

    if (anyLinkChanged) {
      updatedMeta.social_links_updated_at = new Date().toISOString();
    }

    const { error } = await supabase.auth.updateUser({ data: updatedMeta });
    if (error) return error.message;

    // Upsert community invite links to public.profiles so they can be read
    // for any author without auth.users access.
    if (user) {
      const upsertPayload = {
        user_id: user.id,
        slack_url: socialLinks['slack'] || null,
        whatsapp_url: socialLinks['whatsapp'] || null,
        telegram_url: socialLinks['telegram'] || null,
        updated_at: new Date().toISOString(),
      };
      const { error: upsertError } = await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'user_id' });
      if (upsertError) {
        console.error('[VibeMarket] profiles upsert failed:', upsertError.code);
      }
    }

    return null;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, sessionTimeLeft, isSessionExpiring, signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// The context hook intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useVibeAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useVibeAuth must be used inside <AuthProvider>');
  return ctx;
};
