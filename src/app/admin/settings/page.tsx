'use client'

import { useCallback, useEffect, useState } from 'react'
import { Database, Loader2, Plus, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { get, put } from '@/components/admin/api'
import { EmptyState, ErrorState, TableRowsSkeleton } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import { formatDateTime } from '@/components/admin/format'
import type { SettingRow } from '@/components/admin/types'

const INTEGRATION_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'HEYGEN_API_KEY',
  'HEYGEN_SANTA_AVATAR_ID',
  'HEYGEN_SANTA_VOICE_ID',
  'HEYGEN_WEBHOOK_SECRET',
  'APP_URL',
  'SESSION_SECRET',
]

export default function AdminSettingsPage() {
  const [rows, setRows] = useState<SettingRow[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [saveAllBusy, setSaveAllBusy] = useState(false)

  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await get<{ settings: SettingRow[] }>('/api/admin/settings')
      setRows(res.settings)
      setDrafts(Object.fromEntries(res.settings.map((r) => [r.key, r.value])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveKeys(keys: string[]) {
    if (keys.length === 0) {
      toast.info('Nothing to save yet.')
      return
    }
    const payload: Record<string, string> = {}
    for (const key of keys) {
      payload[key] = drafts[key] ?? ''
    }
    const single = keys.length === 1
    if (single) setSavingKey(keys[0])
    else setSaveAllBusy(true)
    try {
      const res = await put<{ settings: SettingRow[] }>('/api/admin/settings', { settings: payload })
      setRows(res.settings)
      setDrafts(Object.fromEntries(res.settings.map((r) => [r.key, r.value])))
      toast.success(
        single ? `Setting "${keys[0]}" saved.` : `${keys.length} settings saved.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSavingKey(null)
      setSaveAllBusy(false)
    }
  }

  async function handleAdd() {
    const key = newKey.trim()
    if (!key) {
      toast.error('Enter a setting key.')
      return
    }
    if (rows?.some((r) => r.key === key)) {
      toast.error('That key already exists — edit it in the table instead.')
      return
    }
    setAddBusy(true)
    try {
      const res = await put<{ settings: SettingRow[] }>('/api/admin/settings', {
        settings: { [key]: newValue },
      })
      setRows(res.settings)
      setDrafts(Object.fromEntries(res.settings.map((r) => [r.key, r.value])))
      setNewKey('')
      setNewValue('')
      toast.success(`Setting "${key}" created.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add setting')
    } finally {
      setAddBusy(false)
    }
  }

  const dirtyKeys = rows
    ? rows.filter((r) => (drafts[r.key] ?? '') !== r.value).map((r) => r.key)
    : []

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Site-level key/value settings — integration secrets live in the deployment environment."
      />

      <div className="mb-6 space-y-4">
        <Alert className="border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
          <Settings2 className="size-4 text-[#7D0A16]" />
          <AlertTitle className="font-serif text-[#7D0A16]">Integration environment keys</AlertTitle>
          <AlertDescription className="text-[#3A0008]/80">
            {INTEGRATION_KEYS.join(' · ')}
            <br />
            These are configured in the deployment environment — not stored in this table.
          </AlertDescription>
        </Alert>
        <Alert className="border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
          <Database className="size-4 text-[#7D0A16]" />
          <AlertTitle className="font-serif text-[#7D0A16]">Moving to Supabase Postgres</AlertTitle>
          <AlertDescription className="text-[#3A0008]/80">
            To move to Supabase Postgres: set provider=&apos;postgresql&apos; in
            prisma/schema.prisma, point DATABASE_URL to Supabase, run db:push. Schema is already
            portable.
          </AlertDescription>
        </Alert>
      </div>

      <Card className="border-[#D0A56A]/40 bg-white">
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#7D0A16]/70">
              {rows
                ? `${rows.length} setting${rows.length === 1 ? '' : 's'}${dirtyKeys.length > 0 ? ` · ${dirtyKeys.length} unsaved` : ''}`
                : ''}
            </p>
            <Button
              onClick={() => void saveKeys(dirtyKeys)}
              disabled={saveAllBusy || dirtyKeys.length === 0}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810] disabled:opacity-50"
            >
              {saveAllBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save all changes
            </Button>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !rows ? (
            <TableRowsSkeleton cols={3} />
          ) : rows && rows.length === 0 ? (
            <EmptyState
              title="No settings stored yet"
              hint="Add a key below — for example support_email or christmas_deadline_note."
            />
          ) : rows ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#D0A56A]/30">
                    <TableHead className="w-56 text-[#7D0A16]/70">Key</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Value</TableHead>
                    <TableHead className="w-44 text-[#7D0A16]/70">Updated</TableHead>
                    <TableHead className="w-28 text-right text-[#7D0A16]/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const dirty = (drafts[r.key] ?? '') !== r.value
                    return (
                      <TableRow key={r.key} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                        <TableCell className="align-middle">
                          <Label className="font-mono text-xs font-semibold text-[#7D0A16]">
                            {r.key}
                          </Label>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={drafts[r.key] ?? ''}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [r.key]: e.target.value }))
                            }
                            className="min-h-11 border-[#D0A56A]/40 bg-white"
                            aria-label={`Value for ${r.key}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-[#3A0008]/60">
                          {formatDateTime(r.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!dirty || savingKey === r.key}
                            onClick={() => void saveKeys([r.key])}
                            className="min-h-9 border-[#D0A56A]/50 bg-white px-3 text-[#7D0A16] hover:bg-[#D0A56A]/10 disabled:opacity-40"
                          >
                            {savingKey === r.key ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Save className="size-4" />
                            )}
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <Separator className="my-6 bg-[#D0A56A]/30" />

          {/* Add setting */}
          <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="new-setting-key" className="text-[#3A0008]">
                New key
              </Label>
              <Input
                id="new-setting-key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="support_email"
                className="min-h-11 border-[#D0A56A]/40 bg-white font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-setting-value" className="text-[#3A0008]">
                Value
              </Label>
              <Input
                id="new-setting-value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="santa@klubsanta.com"
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <Button
              onClick={() => void handleAdd()}
              disabled={addBusy}
              className="min-h-11 border border-[#7D0A16]/30 bg-[#7D0A16]/10 text-[#7D0A16] hover:bg-[#7D0A16]/20"
            >
              {addBusy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add setting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
