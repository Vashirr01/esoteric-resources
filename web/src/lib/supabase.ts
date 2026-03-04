import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rcjclulpdehdlukahnwb.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamNsdWxwZGVoZGx1a2FobndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTM3MzEsImV4cCI6MjA4ODA2OTczMX0.GrwMupkUkP_ykfSEXzEf5r314WR0XQ6W-lQHL6tgrx0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch wrapper that attaches the current session token.
 * On 401, refreshes the session and retries once.
 * If refresh fails, signs out (ProtectedRoute handles redirect).
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signOut();
    throw new Error("No session");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Try refreshing session
    const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
    if (error || !refreshed) {
      await supabase.auth.signOut();
      throw new Error("Session expired");
    }

    headers.set("Authorization", `Bearer ${refreshed.access_token}`);
    return fetch(url, { ...options, headers });
  }

  return res;
}
