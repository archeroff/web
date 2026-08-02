#!/usr/bin/env node
// Bootstrap the Supabase schema (if a secret key is present) and seed photos
// from ./pix (or ./public/img) into Supabase storage + photos table.
//
// Usage:
//   node scripts/seed-photos.mjs [--dir ./pix] [--status approved] [--reset]
//
// Reads credentials from .env.local / .env or the shell:
//   SUPABASE_URL=
//   SUPABASE_PUBLISHABLE_KEY=
//   SUPABASE_SECRET_KEY=   (service role key — used for storage/uploads)
//   SUPABASE_ACCESS_TOKEN= (Supabase personal access token — required to apply
//                           the schema remotely via the Management API)
//   ADMIN_MASTER_PASS=     (optional, seeds the admin master password hash)
//
// The schema (supabase/schema.sql) is applied via the Management API when
// SUPABASE_ACCESS_TOKEN is set; without it, schema apply is skipped and the
// script only seeds photos. Photos are uploaded using the publishable/secret
// key, so seeding works as long as the bucket already exists.

import { createClient } from "@supabase/supabase-js"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

const args = process.argv.slice(2)
const flag = (name) => {
  const idx = args.indexOf(name)
  return idx !== -1 ? args[idx + 1] : undefined
}
const has = (name) => args.includes(name)

const sourceDir = path.resolve(root, flag("--dir") || "pix")
const status = flag("--status") || "approved"
const schemaOnly = has("--schema-only")

// ---- load .env.local then .env (simple parser) ----
for (const file of [".env.local", ".env"]) {
  try {
    const raw = await readFile(path.join(root, file), "utf8")
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/)
      if (m && !line.trim().startsWith("#")) {
        const [, k, v] = m
        const clean = v.replace(/^['"]|['"]$/g, "")
        if (!(k in process.env)) process.env[k] = clean
      }
    }
  } catch {
    // ignore missing env files
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const publishable =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const secret = process.env.SUPABASE_SECRET_KEY
const key = secret || publishable

if (!url || !key) {
  console.error(
    "Missing credentials. Create a .env.local with SUPABASE_URL and " +
      "SUPABASE_PUBLISHABLE_KEY (and SUPABASE_SECRET_KEY to auto-create the bucket).",
  )
  process.exit(1)
}

const bucket = "photos"
const mime = (name) => {
  const ext = name.split(".").pop().toLowerCase()
  return {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  }[ext] || "application/octet-stream"
}

const sqlLit = (s) => `'${String(s).replace(/'/g, "''")}'`

const accessToken = process.env.SUPABASE_ACCESS_TOKEN

// Project ref, e.g. https://<ref>.supabase.co -> <ref>
let projectRef = null
try {
  projectRef = new URL(url).hostname.split(".")[0]
} catch {
  projectRef = null
}

// Execute arbitrary SQL via the Supabase Management API (requires a PAT).
// The REST SQL endpoints (/pg/query/v1/query, rpc/pg_query) are not available
// on current projects, so this is the supported remote way to run DDL.
async function runSql(sqlText) {
  if (!accessToken || !projectRef) return false
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Client-Info": "alriyadi-seed/1.0",
      },
      body: JSON.stringify({ query: sqlText }),
    },
  )
  if (!res.ok) {
    console.log(`  ⚠ Management API failed (${res.status}): ${(await res.text()).slice(0, 300)}`)
    return false
  }
  console.log("  ✓ SQL executed via Management API")
  return true
}

// supabase-js constructs a Realtime client at startup, which needs a global
// WebSocket (missing on Node 20). This script never uses Realtime, so shim it.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class WebSocketShim {}
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---- apply schema (bucket, storage policies, tables, RLS, RPCs, grants) ----
// Requires a Supabase personal access token (SUPABASE_ACCESS_TOKEN). Without
// one this is skipped non-fatally — the schema is applied manually from
// supabase/schema.sql in the SQL editor instead.
if (accessToken && projectRef) {
  const schemaSql = await readFile(path.join(root, "supabase", "schema.sql"), "utf8")
  console.log("Applying supabase/schema.sql via the Management API…")
  if (!(await runSql(schemaSql))) {
    console.error(
      "\nCould not apply the schema automatically. Check the SUPABASE_ACCESS_TOKEN " +
        "GitHub secret, or paste supabase/schema.sql into the Supabase SQL editor " +
        "(https://supabase.com/dashboard/project/_/sql/new), then re-run this workflow.",
    )
    process.exit(1)
  }

  const master = process.env.ADMIN_MASTER_PASS || process.env.VITE_ADMIN_MASTER_PASS
  if (master) {
    const masterSql =
      `insert into public.settings (key, value) ` +
      `values ('master_password_hash', encode(extensions.digest(${sqlLit(master)}, 'sha256'), 'hex')) ` +
      `on conflict (key) do update set value = excluded.value;`
    console.log("Seeding master password hash…")
    if (!(await runSql(masterSql))) {
      console.warn("  ⚠ Could not seed the master password hash.")
    }
  }
} else {
  console.warn(
    "  ⚠ No SUPABASE_ACCESS_TOKEN configured — skipping automatic schema apply. " +
      "Apply supabase/schema.sql manually in the SQL editor to keep the backend up to date.",
  )
}

if (schemaOnly) {
  console.log("Schema-only mode done.")
  process.exit(0)
}

// ---- ensure bucket exists ----
const { data: buckets } = await supabase.storage.listBuckets()
let bucketOk = buckets?.some((b) => b.id === bucket) ?? false
if (!bucketOk) {
  if (!secret) {
    console.error(
      `Bucket "${bucket}" does not exist and no SUPABASE_SECRET_KEY was provided ` +
        "to create it. Run supabase/schema.sql in the Supabase SQL editor first.",
    )
    process.exit(1)
  }
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 10485760,
  })
  if (error) {
    console.error(`Failed to create bucket "${bucket}": ${error.message}`)
    process.exit(1)
  }
  bucketOk = true
  console.log(`Bucket "${bucket}" created.`)
}

// ---- optional full reset of the table ----
if (has("--reset")) {
  const { error } = await supabase.from("photos").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) console.warn(`Reset warning: ${error.message}`)
  else console.log("Deleted all existing rows.")
}

// ---- load existing URLs to avoid duplicates ----
const { data: existing } = await supabase.from("photos").select("url")
const existingUrls = new Set((existing ?? []).map((r) => r.url))

// ---- upload ----
let files = []
try {
  files = (await readdir(sourceDir))
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
} catch {
  files = []
}

if (files.length === 0) {
  console.warn(`No images found in ${sourceDir}; skipping photo seeding.`)
  process.exit(0)
}

let ok = 0
let skipped = 0
for (const [i, fname] of files) {
  const buf = await readFile(path.join(sourceDir, fname))
  const storageName = `${fname}`

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(storageName, buf, { upsert: true, contentType: mime(fname) })
  if (upErr) {
    console.error(`[upload] ${fname}: ${upErr.message}`)
    continue
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storageName)
  const url = pub.publicUrl

  if (existingUrls.has(url)) {
    skipped += 1
    continue
  }

  const alt = fname.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")
  const { error: insErr } = await supabase.from("photos").insert({
    url,
    alt: `Al Riyadi ${alt}`,
    status,
    sort_order: i,
  })
  if (insErr) {
    console.error(`[insert] ${fname}: ${insErr.message}`)
    continue
  }
  ok += 1
  console.log(`✓ ${fname}`)
}

console.log(`\nDone. Uploaded ${ok}, skipped ${skipped}, of ${files.length} files from ${sourceDir}.`)
