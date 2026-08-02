import React, { useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ImagePlus, Loader2, Upload } from 'lucide-react'
import { uploadPhoto } from '@/lib/photos'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const MAX_SIZE_MB = 10
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface FileState {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

function validate(file: File): string | undefined {
  if (!ACCEPTED.includes(file.type)) {
    return 'Not an image (use JPEG, PNG, WebP or GIF)'
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Too large (max ${MAX_SIZE_MB}MB)`
  }
  return undefined
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileState[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const configured = isSupabaseConfigured()

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming).map((file) => ({
      file,
      status: 'pending' as const,
      error: validate(file),
    }))
    setFiles((prev) => [...prev, ...next])
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const uploadAll = async () => {
    if (!configured) return
    let done = 0
    const next = [...files]
    for (let i = 0; i < next.length; i++) {
      const item = next[i]
      if (item.status !== 'pending' || item.error) continue
      next[i] = { ...item, status: 'uploading' }
      setFiles([...next])
      const result = await uploadPhoto(item.file)
      if (result.ok) {
        next[i] = { ...next[i], status: 'done' }
        done += 1
      } else {
        next[i] = { ...next[i], status: 'error', error: result.error }
      }
      setFiles([...next])
    }
    setUploadedCount(done)
  }

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  const clearAll = () => {
    setFiles([])
    setUploadedCount(0)
  }

  const pendingCount = files.filter((f) => f.status === 'pending' && !f.error).length

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-neutral-950 text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marquees
        </Link>
        <span className="text-sm font-semibold">Upload photos</span>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {!configured ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
            Supabase isn&apos;t configured yet. Set{' '}
            <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>{' '}
            in the build, then redeploy.
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors',
                dragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/50',
              )}
            >
              <ImagePlus className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                Drag &amp; drop photos here, or click to choose files
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP or GIF · max 10MB each · you can pick several
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                {files.map((item, i) => (
                  <div
                    key={`${item.file.name}-${i}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <img
                      src={URL.createObjectURL(item.file)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      {item.error && (
                        <p className="text-xs text-destructive">{item.error}</p>
                      )}
                      {item.status === 'uploading' && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading…
                        </p>
                      )}
                      {item.status === 'done' && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Added for review
                        </p>
                      )}
                      {item.status === 'error' && !item.error && (
                        <p className="text-xs text-destructive">Upload failed</p>
                      )}
                    </div>
                    {item.status !== 'uploading' && (
                      <button
                        onClick={() => removeFile(i)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        aria-label="Remove file"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={uploadAll}
                    disabled={pendingCount === 0}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? 's' : ''}` : ''}
                  </button>
                  <button
                    onClick={clearAll}
                    className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                </div>

                {uploadedCount > 0 && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {uploadedCount} photo{uploadedCount > 1 ? 's' : ''} submitted for review.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
