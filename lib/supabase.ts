import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const MASTER_PASSCODE =
  (import.meta.env.VITE_ADMIN_MASTER_PASSCODE as string | undefined) ||
  "alriyadi-master"

export const isSupabaseConfigured = () => supabase !== null
