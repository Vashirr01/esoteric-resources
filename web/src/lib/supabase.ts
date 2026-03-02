import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rcjclulpdehdlukahnwb.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamNsdWxwZGVoZGx1a2FobndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTM3MzEsImV4cCI6MjA4ODA2OTczMX0.GrwMupkUkP_ykfSEXzEf5r314WR0XQ6W-lQHL6tgrx0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
