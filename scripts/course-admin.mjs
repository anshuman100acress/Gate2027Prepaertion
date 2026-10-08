import { createClient } from '@supabase/supabase-js';
import { serviceCloudSettings } from './course-catalog.mjs';

export function courseAdmin(env = process.env) {
  const { url, serviceRoleKey } = serviceCloudSettings(env);
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

// Supabase error bodies can contain request data. Keep command output limited to
// fixed operation names and HTTP/error codes, never credentials or payloads.
export function requireResult(result, operation) {
  if (result.error) {
    const code = typeof result.error.code === 'string' && /^[A-Za-z0-9_-]{1,30}$/.test(result.error.code) ? ` (${result.error.code})` : '';
    throw new Error(`${operation} failed${code}. Check the project, service credential and course-access migration.`);
  }
  return result.data;
}
