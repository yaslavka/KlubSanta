'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { del, get, patch, post } from '@/components/admin/api'
import { EmptyState, ErrorState, TableRowsSkeleton } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import type { Faq } from '@/components/admin/types'

interface FaqFormState {
  question: string
  answer: string
  sortOrder: string
  active: boolean
}

const EMPTY_FORM: FaqFormState = { question: '', answer: '', sortOrder: '0', active: true }

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<Faq[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Faq | null>(null)
  const [form, setForm] = useState<FaqFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<Faq | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await get<{ faqs: Faq[] }>('/api/admin/faqs')
      setFaqs(res.faqs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(f: Faq) {
    setEditing(f)
    setForm({
      question: f.question,
      answer: f.answer,
      sortOrder: String(f.sortOrder),
      active: f.active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (form.question.trim().length < 5) {
      toast.error('The question needs at least 5 characters.')
      return
    }
    if (form.answer.trim().length < 5) {
      toast.error('The answer needs at least 5 characters.')
      return
    }
    const sortOrderNum = Number.parseInt(form.sortOrder, 10)
    if (Number.isNaN(sortOrderNum) || sortOrderNum < 0) {
      toast.error('Sort order must be a non-negative number.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await patch<{ faq: Faq }>(`/api/admin/faqs/${editing.id}`, {
          question: form.question.trim(),
          answer: form.answer.trim(),
          sortOrder: sortOrderNum,
          active: form.active,
        })
        toast.success('Sacred Question updated.')
      } else {
        await post<{ faq: Faq }>('/api/admin/faqs', {
          question: form.question.trim(),
          answer: form.answer.trim(),
          sortOrder: sortOrderNum,
          active: form.active,
        })
        toast.success('Sacred Question added.')
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(f: Faq, value: boolean) {
    try {
      await patch<{ faq: Faq }>(`/api/admin/faqs/${f.id}`, { active: value })
      setFaqs((prev) =>
        prev ? prev.map((row) => (row.id === f.id ? { ...row, active: value } : row)) : prev
      )
      toast.success(`Question ${value ? 'shown on' : 'hidden from'} the landing page.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update question')
    }
  }

  async function submitDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await del<{ ok: boolean }>(`/api/admin/faqs/${deleting.id}`)
      toast.success('Question deleted.')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete question')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Sacred Questions"
        subtitle="The FAQ accordion families read before trusting Santa with their details."
      />

      <Alert className="mb-4 border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
        <AlertTitle className="font-serif text-[#7D0A16]">Landing page content</AlertTitle>
        <AlertDescription className="text-[#3A0008]/80">
          These are the &quot;Sacred Questions&quot; on the landing page — only ACTIVE questions are
          shown, ordered by sort order.
        </AlertDescription>
      </Alert>

      <Card className="border-[#D0A56A]/40 bg-white">
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#7D0A16]/70">
              {faqs ? `${faqs.length} question${faqs.length === 1 ? '' : 's'}` : ''}
            </p>
            <Button
              onClick={openCreate}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
            >
              <Plus className="size-4" /> New question
            </Button>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !faqs ? (
            <TableRowsSkeleton cols={4} />
          ) : faqs && faqs.length === 0 ? (
            <EmptyState
              title="No questions yet"
              hint="Add the first Sacred Question to reassure visiting families."
            />
          ) : faqs ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#D0A56A]/30">
                    <TableHead className="text-[#7D0A16]/70">Question</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Answer</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Active</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Order</TableHead>
                    <TableHead className="text-right text-[#7D0A16]/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((f) => (
                    <TableRow key={f.id} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                      <TableCell className="max-w-[280px] font-medium text-[#3A0008]">
                        <span className="line-clamp-2">{f.question}</span>
                      </TableCell>
                      <TableCell className="max-w-[320px] text-sm text-[#3A0008]/70">
                        <span className="line-clamp-2">{f.answer}</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={f.active}
                          onCheckedChange={(v) => void toggleActive(f, v)}
                          aria-label={`Toggle active for ${f.question}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-[#3A0008]/80">{f.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(f)}
                            className="min-h-9 border-[#D0A56A]/50 bg-white px-3 text-[#7D0A16] hover:bg-[#D0A56A]/10"
                          >
                            <Pencil className="size-4" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleting(f)}
                            className="min-h-9 border-red-300 bg-white px-3 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#D0A56A]/40 bg-[#FAF6F0] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3A0008]">
              {editing ? 'Edit Sacred Question' : 'New Sacred Question'}
            </DialogTitle>
            <DialogDescription className="text-[#7D0A16]/70">
              Keep answers warm, honest and reassuring — parents read these before booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-question" className="text-[#3A0008]">
                Question
              </Label>
              <Input
                id="faq-question"
                value={form.question}
                onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                placeholder="Is my child's data safe with Santa?"
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer" className="text-[#3A0008]">
                Answer
              </Label>
              <Textarea
                id="faq-answer"
                rows={5}
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                placeholder="Absolutely — Santa only uses what you approve…"
                className="border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="flex items-end gap-6">
              <div className="w-32 space-y-2">
                <Label htmlFor="faq-order" className="text-[#3A0008]">
                  Sort order
                </Label>
                <Input
                  id="faq-order"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                  className="min-h-11 border-[#D0A56A]/40 bg-white"
                />
              </div>
              <label className="flex items-center gap-2 pb-3 text-sm text-[#3A0008]">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))}
                  aria-label="Active"
                />
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? 'Save changes' : 'Add question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent className="border-[#D0A56A]/40 bg-[#FAF6F0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#3A0008]">
              Delete this question?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7D0A16]/80">
              “{deleting?.question}” will be permanently removed from the landing page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]">
              Keep question
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void submitDelete()
              }}
              disabled={deleteBusy}
              className="min-h-11 bg-red-700 text-white hover:bg-red-800"
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
