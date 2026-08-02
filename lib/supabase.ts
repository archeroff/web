import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null

export const MASTER_PASSCODE =
  (import.meta.env.VITE_ADMIN_MASTER_PASS as string | undefined) ||
  "alriyadi-master"

export const isSupabaseConfigured = () => supabase !== null
