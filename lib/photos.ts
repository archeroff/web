import { supabase } from "@/lib/supabase"

export interface Photo {
  id: string
  url: string
  alt: string
  sort_order: number
  status: "pending" | "approved"
  created_at: string
}

export type PhotoCard = Pick<Photo, "id" | "url" | "alt">

const imgPath = (n: number) => {
  const ext =
    n === 1
      ? "png"
      : n === 3 || n === 13
        ? "webp"
        : n === 15
          ? "jpg"
          : "jpeg"
  return `/img/${n}.${ext}`
}

export const FALLBACK_PHOTOS: PhotoCard[] = Array.from({ length: 15 }, (_, i) => ({
  id: `local-${i + 1}`,
  url: imgPath(i + 1),
  alt: `Al Riyadi dish ${i + 1}`,
}))

const storageNameFromUrl = (url: string): string | null => {
  const marker = "/object/public/photos/"
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

export async function listApproved(): Promise<PhotoCard[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("photos")
    .select("id,url,alt")
    .eq("status", "approved")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error || !data) return []
  return data
}

export interface UploadStatus {
  configured: boolean
  bucketExists: boolean | null
  bucketError?: string
}

export async function getUploadStatus(): Promise<UploadStatus> {
  if (!supabase) return { configured: false, bucketExists: null }
  const { data, error } = await supabase.storage.listBuckets()
  if (error) return { configured: true, bucketExists: null, bucketError: error.message }
  return { configured: true, bucketExists: data.some((b) => b.id === "photos") }
}

export async function uploadPhoto(file: File): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured" }

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${file.name.slice(
    file.name.lastIndexOf("."),
  )}`
  const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "Upload"

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(name, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes("bucket")) {
      return {
        ok: false,
        error:
          'Storage bucket "photos" is missing. Run supabase/schema.sql in the Supabase SQL editor, then retry.',
      }
    }
    return { ok: false, error: uploadError.message }
  }

  const { error: insertError } = await supabase
    .from("photos")
    .insert({ url: publicUrl(name), alt, status: "pending" })

  if (insertError) return { ok: false, error: insertError.message }

  return { ok: true }
}

export function publicUrl(name: string): string {
  const url = supabase?.storage.from("photos").getPublicUrl(name).data.publicUrl
  if (url) return url
  return `/photos/${name}`
}

export async function listAll(): Promise<Photo[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc("list_photos_all")
  if (error || !data) return []
  return data as Photo[]
}

export async function approvePhoto(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.rpc("approve_photo", { p_id: id })
  return !error
}

export async function deletePhoto(id: string, url: string): Promise<boolean> {
  if (!supabase) return false
  const name = storageNameFromUrl(url)
  if (name) {
    await supabase.storage.from("photos").remove([name])
  }
  const { error } = await supabase.rpc("delete_photo", { p_id: id })
  return !error
}

export async function updateOrder(ids: string[]): Promise<boolean> {
  if (!supabase || ids.length === 0) return false
  const { error } = await supabase.rpc("update_order", { ids })
  return !error
}

export async function verifyAdminPassword(pwd: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc("verify_password", { pwd })
  if (error || data === null) return false
  return data === true
}

export async function setAdminPassword(
  master: string,
  newPwd: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured" }
  const { data, error } = await supabase.rpc("set_admin_password", {
    master,
    new_pwd: newPwd,
  })
  if (error) return { ok: false, error: error.message }
  return data === true ? { ok: true } : { ok: false, error: "Incorrect master password" }
}
