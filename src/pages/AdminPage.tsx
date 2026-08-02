import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import {
  approvePhoto,
  deletePhoto,
  listAll,
  setAdminPassword,
  updateOrder,
  verifyAdminPassword,
  type Photo,
} from '@/lib/photos'
import { MASTER_PASSCODE } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const SESSION_KEY = 'alriyadi_admin_authed'

type Filter = 'pending' | 'approved' | 'all'

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusBadge({ status }: { status: Photo['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium',
        status === 'approved'
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      )}
    >
      {status === 'approved' ? 'Approved' : 'Pending'}
    </span>
  )
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setChecking(true)
    const valid = pwd === MASTER_PASSCODE || (await verifyAdminPassword(pwd))
    setChecking(false)
    if (valid) onLogin()
    else setError('Incorrect passcode')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Enter your admin passcode to continue
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Passcode"
            autoFocus
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={checking || !pwd}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Protected by passcode. Contact the site owner for access.
        </p>
      </div>
    </div>
  )
}

function SettingsSection() {
  const [master, setMaster] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (next.length < 6) {
      setMessage({ ok: false, text: 'New passcode must be at least 6 characters' })
      return
    }
    if (next !== confirm) {
      setMessage({ ok: false, text: 'Passcodes do not match' })
      return
    }
    setSaving(true)
    const result = await setAdminPassword(master, next)
    setSaving(false)
    if (result.ok) {
      setMessage({ ok: true, text: 'Admin passcode updated' })
      setMaster('')
      setNext('')
      setConfirm('')
    } else {
      setMessage({ ok: false, text: result.error ?? 'Failed to update passcode' })
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-background p-6">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4" />
        Change admin passcode
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Requires the master password to change.
      </p>
      <form onSubmit={submit} className="grid max-w-md gap-3">
        <input
          type="password"
          value={master}
          onChange={(e) => setMaster(e.target.value)}
          placeholder="Master password"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New admin passcode"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new passcode"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
        {message && (
          <p
            className={cn(
              'text-xs',
              message.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
            )}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !master || !next || !confirm}
          className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update passcode'}
        </button>
      </form>
    </section>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1',
  )
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await listAll()
    setPhotos(data)
    setLoading(false)
  }

  useEffect(() => {
    if (authed) void load()
  }, [authed])

  const onLogin = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setAuthed(true)
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
    setPhotos([])
  }

  const pendingCount = photos.filter((p) => p.status === 'pending').length

  const visible = useMemo(() => {
    const filtered = photos.filter(
      (p) => filter === 'all' || p.status === filter,
    )
    if (!query.trim()) return filtered
    const q = query.trim().toLowerCase()
    return filtered.filter(
      (p) =>
        p.alt.toLowerCase().includes(q) ||
        p.url.toLowerCase().includes(q),
    )
  }, [photos, filter, query])

  const approvedCount = photos.filter((p) => p.status === 'approved').length

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= visible.length || to >= visible.length)
      return
    const moved = visible[from]
    if (!moved) return
    const next = [...visible]
    next.splice(from, 1)
    next.splice(to, 0, moved)

    const approvedIds = new Set(photos.filter((p) => p.status === 'approved').map((p) => p.id))
    const newOrder = [
      ...next.filter((p) => approvedIds.has(p.id)),
      ...photos.filter((p) => !approvedIds.has(p.id)),
    ]
    const updated = newOrder.map((p, i) => ({ ...p, sort_order: i }))
    setPhotos(updated)
    void updateOrder(newOrder.map((p) => p.id))
  }

  const onApprove = async (id: string) => {
    const ok = await approvePhoto(id)
    if (ok) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p)),
      )
    }
  }

  const onDelete = async (id: string, url: string) => {
    const ok = await deletePhoto(id, url)
    if (ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      setConfirmingDelete(null)
    }
  }

  if (!authed) return <LoginScreen onLogin={onLogin} />

  const isApprovedView = filter === 'approved'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Marquees
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            {(['pending', 'approved', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-xs">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by alt or filename…"
            className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
          />
        </div>

        {isApprovedView && approvedCount > 1 && (
          <p className="mb-3 text-xs text-muted-foreground">
            Drag cards or use the arrows to reorder — changes save automatically.
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-24 text-center text-sm text-muted-foreground">
            {filter === 'pending'
              ? 'No pending uploads. Photos people upload appear here for review.'
              : 'No photos yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((photo, i) => (
              <div
                key={photo.id}
                draggable={isApprovedView}
                onDragStart={(e) => {
                  if (!isApprovedView) return
                  setDragIndex(i)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (!isApprovedView || dragIndex === null) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setOverIndex(i)
                }}
                onDrop={(e) => {
                  if (!isApprovedView) return
                  e.preventDefault()
                }}
                onDragEnd={() => {
                  if (dragIndex !== null && overIndex !== null) {
                    reorder(dragIndex, overIndex)
                  }
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                className={cn(
                  'group overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-all',
                  isApprovedView && 'cursor-grab active:cursor-grabbing',
                  overIndex === i && dragIndex !== null && dragIndex !== i &&
                    'ring-2 ring-primary',
                )}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-2 top-2">
                    <StatusBadge status={photo.status} />
                  </div>
                  {isApprovedView && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{photo.alt}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(photo.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {photo.status === 'pending' && (
                      <button
                        onClick={() => onApprove(photo.id)}
                        className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                    )}
                    {isApprovedView && (
                      <>
                        <button
                          onClick={() => reorder(i, i - 1)}
                          disabled={i === 0}
                          aria-label="Move up"
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => reorder(i, i + 1)}
                          disabled={i === visible.length - 1}
                          aria-label="Move down"
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {confirmingDelete === photo.id ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">Delete?</span>
                        <button
                          onClick={() => onDelete(photo.id, photo.url)}
                          className="rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive hover:bg-destructive/20"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingDelete(photo.id)}
                        aria-label="Delete photo"
                        className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <SettingsSection />
        </div>
      </main>
    </div>
  )
}
