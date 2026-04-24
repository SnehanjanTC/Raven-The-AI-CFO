/** Environment configuration with validation */

interface EnvConfig {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  isSupabaseConfigured: boolean;
}

function loadEnv(): EnvConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  return {
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

export const env = loadEnv();
