import { createClient } from '@supabase/supabase-js';

// Browser client (anon key + user's JWT). PostgREST is our REST API.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server client (service role) — bypasses RLS, used only in API routes.
export const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
