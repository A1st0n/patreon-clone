import { createClient } from '@supabase/supabase-js';

// ponytail: fall back to harmless placeholders so the app still builds and
// deploys without secrets. The UI runs on local seed data in that case.
const DEMO = 'https://demo.supabase.co';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEMO;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key';

// "Set" isn't enough — .env.local ships placeholders, and a placeholder that
// looks configured means every auth call fails with "Failed to fetch".
export const isConfigured = Boolean(URL && ANON) && URL !== DEMO;

// Browser client (anon key + user's JWT). PostgREST is our REST API.
export const supabase = createClient(URL, ANON);

// Server client (service role) bypasses RLS, used only in API routes.
export const admin = () =>
  createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key');
