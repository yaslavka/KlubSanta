'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { del, get, patch, post } from '@/components/admin/api'
import { CardTableSkeleton, EmptyState, ErrorState } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import { formatMoney } from '@/lib/site'
import type { Product } from '@/components/admin/types'

const KNOWN_ASSETS = [
  '/media/offer-keepsake.jpg',
  '/media/offer-call.jpg',
  '/media/offer-letter.jpg',
  '/media/offer-membership.jpg',
  '/media/offer-gifting.jpg',
  '/media/pillar-advent.jpg',
  '/media/pillar-keepsake.jpg',
  '/media/pillar-gift.jpg',
  '/media/hero-family.png',
  '/media/video-poster.jpg',
  '/media/about-santa.jpg',
]

interface ProductFormState {
  slug: string
  name: string
  tagline: string
  description: string
  points: string
  ribbon: string
  badge: string
  ctaLabel: string
  price: string
  currency: string
  image: string
  featured: boolean
  active: boolean
  sortOrder: string
}

const EMPTY_FORM: ProductFormState = {
  slug: '',
  name: '',
  tagline: '',
  description: '',
  points: '',
  ribbon: '',
  badge: '',
  ctaLabel: 'Reserve Ritual',
  price: '',
  currency: 'USD',
  image: '',
  featured: false,
  active: true,
  sortOrder: '0',
}

function toForm(p: Product): ProductFormState {
  return {
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    points: p.points,
    ribbon: p.ribbon ?? '',
    badge: p.badge ?? '',
    ctaLabel: p.ctaLabel,
    price: (p.priceCents / 100).toFixed(2),
    currency: p.currency,
    image: p.image ?? '',
    featured: p.featured,
    active: p.active,
    sortOrder: String(p.sortOrder),
  }
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<Product | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await get<{ products: Product[] }>('/api/admin/products')
      setProducts(res.products)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
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

  function openEdit(p: Product) {
    setEditing(p)
    setForm(toForm(p))
    setDialogOpen(true)
  }

  function set<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const priceNum = Number.parseFloat(form.price)
    if (form.name.trim().length < 2) {
      toast.error('Give the ritual a name (at least 2 characters).')
      return
    }
    if (!editing && !/^[a-z0-9-]{2,60}$/.test(form.slug.trim())) {
      toast.error('Slug must be lowercase letters, numbers and dashes (2–60 chars).')
      return
    }
    if (Number.isNaN(priceNum) || priceNum < 0 || priceNum > 10000) {
      toast.error('Price must be a number between 0 and 10,000.')
      return
    }
    const sortOrderNum = Number.parseInt(form.sortOrder, 10)
    if (Number.isNaN(sortOrderNum) || sortOrderNum < 0) {
      toast.error('Sort order must be a non-negative number.')
      return
    }

    const payload = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      points: form.points,
      ribbon: form.ribbon.trim() || null,
      badge: form.badge.trim() || null,
      ctaLabel: form.ctaLabel.trim() || 'Reserve Ritual',
      priceCents: Math.round(priceNum * 100),
      currency: form.currency.trim().toUpperCase(),
      image: form.image.trim() || null,
      featured: form.featured,
      active: form.active,
      sortOrder: sortOrderNum,
    }

    setSaving(true)
    try {
      if (editing) {
        // slug is immutable on edit — the API rejects changes to it implicitly by omitting it
        await patch<{ product: Product }>(`/api/admin/products/${editing.id}`, payload)
        toast.success(`Ritual "${payload.name}" updated — live on the landing page instantly.`)
      } else {
        await post<{ product: Product }>('/api/admin/products', { ...payload, slug: form.slug.trim() })
        toast.success(`Ritual "${payload.name}" created.`)
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save ritual')
    } finally {
      setSaving(false)
    }
  }

  async function toggleField(p: Product, field: 'featured' | 'active', value: boolean) {
    setTogglingId(p.id)
    try {
      await patch<{ product: Product }>(`/api/admin/products/${p.id}`, { [field]: value })
      setProducts((prev) =>
        prev ? prev.map((row) => (row.id === p.id ? { ...row, [field]: value } : row)) : prev
      )
      toast.success(
        field === 'active'
          ? `"${p.name}" is now ${value ? 'live on the landing page' : 'hidden from the landing page'}.`
          : `"${p.name}" ${value ? 'featured' : 'unfeatured'}.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ritual')
    } finally {
      setTogglingId(null)
    }
  }

  async function submitDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const res = await del<{ ok: boolean; deactivated?: boolean; message?: string }>(
        `/api/admin/products/${deleting.id}`
      )
      if (res.deactivated) {
        toast.warning(res.message || 'Product was deactivated to keep ledger history intact.')
      } else {
        toast.success('Ritual deleted.')
      }
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ritual')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Rituals"
        subtitle="The product catalog families can reserve — pricing, imagery and availability."
      />

      <Alert className="mb-4 border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
        <Star className="size-4 text-[#7D0A16]" />
        <AlertTitle className="font-serif text-[#7D0A16]">Live catalog</AlertTitle>
        <AlertDescription className="text-[#3A0008]/80">
          The landing page renders ACTIVE products from this table — price/name/image changes go
          live instantly.
        </AlertDescription>
      </Alert>

      <Card className="border-[#D0A56A]/40 bg-white">
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#7D0A16]/70">
              {products ? `${products.length} ritual${products.length === 1 ? '' : 's'}` : ''}
            </p>
            <Button
              onClick={openCreate}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
            >
              <Plus className="size-4" /> New ritual
            </Button>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !products ? (
            <CardTableSkeleton cols={7} />
          ) : products && products.length === 0 ? (
            <EmptyState
              title="No rituals yet"
              hint="Create your first ritual so families can start reserving."
            />
          ) : products ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#D0A56A]/30">
                    <TableHead className="text-[#7D0A16]/70">Image</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Name</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Slug</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Price</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Featured</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Active</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Order</TableHead>
                    <TableHead className="text-right text-[#7D0A16]/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                      <TableCell>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="size-12 rounded-md border border-[#D0A56A]/40 object-cover"
                          />
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-md border border-dashed border-[#D0A56A]/50 text-xs text-[#D0A56A]">
                            none
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="block font-medium text-[#3A0008]">{p.name}</span>
                        {p.ribbon ? (
                          <span className="text-xs font-medium text-[#7D0A16]">{p.ribbon}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#3A0008]/70">{p.slug}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-medium text-[#3A0008]">
                        {formatMoney(p.priceCents, p.currency)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.featured}
                          disabled={togglingId === p.id}
                          onCheckedChange={(v) => void toggleField(p, 'featured', v)}
                          aria-label={`Toggle featured for ${p.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.active}
                          disabled={togglingId === p.id}
                          onCheckedChange={(v) => void toggleField(p, 'active', v)}
                          aria-label={`Toggle active for ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-[#3A0008]/80">{p.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(p)}
                            className="min-h-9 border-[#D0A56A]/50 bg-white px-3 text-[#7D0A16] hover:bg-[#D0A56A]/10"
                          >
                            <Pencil className="size-4" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleting(p)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#D0A56A]/40 bg-[#FAF6F0] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3A0008]">
              {editing ? `Edit ritual — ${editing.name}` : 'New ritual'}
            </DialogTitle>
            <DialogDescription className="text-[#7D0A16]/70">
              {editing
                ? 'Changes go live on the landing page as soon as you save.'
                : 'Define a new ritual for families to reserve.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-slug" className="text-[#3A0008]">
                Slug
              </Label>
              <Input
                id="p-slug"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase())}
                disabled={editing !== null}
                placeholder="santa-video-call"
                className="min-h-11 border-[#D0A56A]/40 bg-white disabled:opacity-60"
              />
              <p className="text-xs text-[#7D0A16]/60">
                {editing ? 'Slug cannot change after creation.' : 'Lowercase letters, numbers, dashes.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-name" className="text-[#3A0008]">
                Name
              </Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="A Call from Santa"
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-tagline" className="text-[#3A0008]">
                Tagline
              </Label>
              <Input
                id="p-tagline"
                value={form.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="A live moment of wonder, in your language"
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-description" className="text-[#3A0008]">
                Description
              </Label>
              <Textarea
                id="p-description"
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What the family receives…"
                className="border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-points" className="text-[#3A0008]">
                Highlights (one per line)
              </Label>
              <Textarea
                id="p-points"
                rows={4}
                value={form.points}
                onChange={(e) => set('points', e.target.value)}
                placeholder={'Personalized in 8 languages\nSigned keepsake video\nParent-approved script'}
                className="border-[#D0A56A]/40 bg-white"
              />
              <p className="text-xs text-[#7D0A16]/60">
                Each line becomes a bullet point on the landing page card.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-ribbon" className="text-[#3A0008]">
                Ribbon (optional)
              </Label>
              <Input
                id="p-ribbon"
                value={form.ribbon}
                onChange={(e) => set('ribbon', e.target.value)}
                placeholder="Most Cherished"
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-badge" className="text-[#3A0008]">
                Corner badge (optional)
              </Label>
              <Input
                id="p-badge"
                value={form.badge}
                onChange={(e) => set('badge', e.target.value)}
                placeholder="8 Languages"
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-cta" className="text-[#3A0008]">
                CTA label
              </Label>
              <Input
                id="p-cta"
                value={form.ctaLabel}
                onChange={(e) => set('ctaLabel', e.target.value)}
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-price" className="text-[#3A0008]">
                  Price
                </Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="49.00"
                  className="min-h-11 border-[#D0A56A]/40 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-currency" className="text-[#3A0008]">
                  Currency
                </Label>
                <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                  <SelectTrigger id="p-currency" className="min-h-11 border-[#D0A56A]/40 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-image" className="text-[#3A0008]">
                Image path
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="p-image"
                  value={form.image}
                  onChange={(e) => set('image', e.target.value)}
                  placeholder="/media/offer-call.jpg"
                  className="min-h-11 border-[#D0A56A]/40 bg-white"
                />
                <Select
                  value=""
                  onValueChange={(v) => {
                    set('image', v)
                  }}
                >
                  <SelectTrigger
                    aria-label="Quick pick a known asset"
                    className="min-h-11 w-full border-[#D0A56A]/40 bg-white sm:w-52"
                  >
                    <SelectValue placeholder="Quick pick…" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_ASSETS.map((asset) => (
                      <SelectItem key={asset} value={asset}>
                        {asset.replace('/media/', '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.image ? (
                <img
                  src={form.image}
                  alt="Preview"
                  className="mt-1 h-20 w-32 rounded-md border border-[#D0A56A]/40 object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-sort" className="text-[#3A0008]">
                Sort order
              </Label>
              <Input
                id="p-sort"
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
                className="min-h-11 border-[#D0A56A]/40 bg-white"
              />
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-sm text-[#3A0008]">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => set('featured', v)}
                  aria-label="Featured"
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-[#3A0008]">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => set('active', v)}
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
              {editing ? 'Save changes' : 'Create ritual'}
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
              Delete ritual “{deleting?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7D0A16]/80">
              If any reservations reference this ritual it cannot be removed — it will be
              deactivated instead so the ledger history stays intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]">
              Keep ritual
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
