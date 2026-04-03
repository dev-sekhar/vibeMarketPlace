import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[VibeMarket] Supabase env vars missing. ' +
    'Copy .env.example to .env.local and fill in your project URL and anon key.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
