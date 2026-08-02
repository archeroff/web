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
//   SUPABASE_SECRET_KEY=   (service role key — required for schema bootstrap)
//   ADMIN_MASTER_PASS=     (optional, seeds the admin master password hash)
//
// When SUPABASE_SECRET_KEY is present the script applies supabase/schema.sql
// through the Supabase SQL API, then uploads photos. Without it, the bucket
// must already exist and the schema must already be applied.

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

// Execute arbitrary SQL through Supabase's SQL API using the service role key.
async function runSql(sqlText) {
  const attempts = [
    { name: "/pg/query/v1/query", body: JSON.stringify({ query: sqlText }) },
    { name: "/rest/v1/rpc/pg_query", body: JSON.stringify({ query: sqlText }) },
  ]
  for (const attempt of attempts) {
    try {
      const res = await fetch(`${url}${attempt.name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: secret,
          Authorization: `Bearer ${secret}`,
        },
        body: attempt.body,
      })
      if (res.ok) {
        console.log(`  ✓ SQL executed via ${attempt.name}`)
        return true
      }
      console.log(
        `  ⚠ ${attempt.name} failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
      )
    } catch (e) {
      console.log(`  ⚠ ${attempt.name} threw: ${e.message}`)
    }
  }
  return false
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---- apply schema (bucket, storage policies, tables, RLS, RPCs, grants) ----
if (secret) {
  const schemaSql = await readFile(path.join(root, "supabase", "schema.sql"), "utf8")
  console.log("Applying supabase/schema.sql via the SQL API…")
  if (!(await runSql(schemaSql))) {
    console.error(
      "\nCould not apply the schema automatically. Paste supabase/schema.sql into " +
        "the Supabase SQL editor (https://supabase.com/dashboard/project/_/sql/new), " +
        "then re-run this workflow.",
    )
    process.exit(1)
  }

  const master = process.env.ADMIN_MASTER_PASS || process.env.VITE_ADMIN_MASTER_PASS
  if (master) {
    const masterSql =
      `insert into public.settings (key, value) ` +
      `values ('master_password_hash', encode(digest(${sqlLit(master)}, 'sha256'), 'hex')) ` +
      `on conflict (key) do update set value = excluded.value;`
    console.log("Seeding master password hash…")
    if (!(await runSql(masterSql))) {
      console.warn("  ⚠ Could not seed the master password hash.")
    }
  }
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
const files = (await readdir(sourceDir))
  .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

if (files.length === 0) {
  console.error(`No images found in ${sourceDir}`)
  process.exit(1)
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
