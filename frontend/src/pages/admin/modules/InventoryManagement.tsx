import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Search, AlertTriangle, CheckCircle2, Download, Trash2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, type InventorySkuDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, downloadCsvFile, formatMYR } from '@/lib/utils'
import { WorkstationModuleHeader } from '@/components/ClinicalPatientBanner'
import { DataErrorBanner, EmptyStatePanel, ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

export default function InventoryManagement() {
  const user = useAuthStore((s) => s.user)
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const [items, setItems] = useState<InventorySkuDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [restockItem, setRestockItem] = useState<InventorySkuDto | null>(null)
  const [restockQty, setRestockQty] = useState('500')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [draft, setDraft] = useState({
    name: '',
    nameMY: '',
    sku: '',
    category: 'medicine' as InventorySkuDto['category'],
    currentStock: 1000,
    minStock: 250,
    maxStock: 5000,
    unit: 'tablets',
    supplier: 'Pharmaniaga Logistics Sdn Bhd',
    pricePerUnit: 0.25,
    expiryDate: '2028-12-31',
  })

  const loadInventory = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    const res = await hospitalApi.getInventory(hospitalId, signal)
    if (res.aborted) return
    if (res.success && res.data) {
      setItems(res.data)
    } else {
      setLoadError(res.error || t.networkError)
    }
    setLoading(false)
  }, [hospitalId, t.networkError])

  useEffect(() => {
    const controller = new AbortController()
    void loadInventory(controller.signal)
    return () => controller.abort()
  }, [loadInventory])

  const filtered = items.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
    if (lowStockOnly && item.currentStock >= item.minStock) return false
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.supplier.toLowerCase().includes(q)
    )
  })

  const lowStockCount = items.filter((i) => i.currentStock < i.minStock).length
  const totalValuation = items.reduce((s, i) => s + i.currentStock * i.pricePerUnit, 0)

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockItem) return
    const delta = Math.trunc(Number(restockQty) || 0)
    if (delta <= 0) return

    setSaving(true)
    try {
      const res = await hospitalApi.updateInventoryItem(hospitalId, restockItem.id, {
        currentStock: restockItem.currentStock + delta,
      })
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === restockItem.id ? res.data! : i)))
        setRestockItem(null)
        toast({
          title: 'Stock Replenished',
          description: `Added ${delta} ${res.data.unit} to ${res.data.name}.`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Restock Failed',
          description: res.error || 'Could not update SKU stock.',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim() || !draft.sku.trim()) return
    setSaving(true)
    try {
      const res = await hospitalApi.createInventoryItem(hospitalId, {
        ...draft,
        nameMY: draft.nameMY.trim() || draft.name.trim(),
        lastRestocked: new Date().toISOString().split('T')[0],
      })
      if (res.success && res.data) {
        setItems((prev) => [res.data!, ...prev])
        setShowCreate(false)
        toast({
          title: 'SKU Registered',
          description: `${res.data.sku} added to ${theme.shortName} central store.`,
          variant: 'success',
        })
      } else {
        toast({ title: 'Save Failed', description: res.error || 'Could not add SKU', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await hospitalApi.deleteInventoryItem(hospitalId, id)
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast({ title: 'SKU Removed', description: 'Inventory item removed from active catalog.' })
    } else {
      toast({
        title: 'Delete Failed',
        description: res.error || 'Could not remove inventory SKU.',
        variant: 'destructive',
      })
    }
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `inventory-${hospitalId}.csv`,
      ['SKU', 'Item Name', 'Category', 'Stock', 'Min Threshold', 'Unit', 'Unit Price (MYR)', 'Supplier', 'Expiry'],
      filtered.map((i) => [
        i.sku,
        i.name,
        i.category,
        i.currentStock,
        i.minStock,
        i.unit,
        i.pricePerUnit.toFixed(2),
        i.supplier,
        i.expiryDate || '—',
      ])
    )
  }

  return (
    <div className="space-y-6">
      <WorkstationModuleHeader
        icon={Package}
        title={t.inventory}
        subtitle="KKM central pharmacy store, biomedical equipment, consumables & reorder threshold alerts"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-1.5" />
              {t.exportCsv}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Register SKU
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-600">Tracked Store SKUs</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-600">Below Reorder Threshold</p>
          <p className={cn('text-2xl font-extrabold mt-1', lowStockCount > 0 ? 'text-red-700' : 'text-emerald-700')}>
            {lowStockCount} SKU(s)
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-600">On-Hand Store Valuation</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatMYR(totalValuation)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'medicine', 'consumable', 'ppe', 'equipment'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors',
                categoryFilter === cat ? `${theme.iconBg} text-white` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={lowStockOnly}
            onClick={() => setLowStockOnly((v) => !v)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors',
              lowStockOnly
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
            )}
          >
            Low Stock Only ({lowStockCount})
          </button>
        </div>

        <div className="relative w-64 max-w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            id="inv-search-input"
            aria-label="Search inventory SKUs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, drug, supplier…"
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {loadError && <DataErrorBanner message={loadError} onRetry={() => void loadInventory()} />}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyStatePanel
              icon={Package}
              hasActiveFilters={Boolean(searchQuery.trim() || categoryFilter !== 'all' || lowStockOnly)}
              onClearFilters={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setLowStockOnly(false)
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">SKU</th>
                  <th className="py-3 px-4 text-left font-bold">Item & Supplier</th>
                  <th className="py-3 px-4 text-left font-bold">Category</th>
                  <th className="py-3 px-4 text-right font-bold">On-Hand / Min</th>
                  <th className="py-3 px-4 text-right font-bold">Unit Cost</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isLow = item.currentStock < item.minStock
                  return (
                    <tr key={item.id} className={isLow ? 'bg-red-50/40' : 'hover:bg-slate-50/70'}>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{item.sku}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-sm text-slate-900">
                          {language === 'ms' ? item.nameMY : item.name}
                        </p>
                        <p className="text-slate-600">
                          {item.supplier}
                          {item.expiryDate ? ` • Exp: ${item.expiryDate}` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-slate-600">{item.category}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={cn('font-bold', isLow ? 'text-red-700' : 'text-slate-900')}>
                          {item.currentStock.toLocaleString()}
                        </span>{' '}
                        <span className="text-slate-600">/ {item.minStock.toLocaleString()} {item.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">{formatMYR(item.pricePerUnit)}</td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <StatusBadge tone="critical" icon={AlertTriangle} label="Reorder Needed" />
                        ) : (
                          <StatusBadge tone="success" icon={CheckCircle2} label="Adequate" />
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRestockItem(item)
                              setRestockQty(String(Math.max(100, item.minStock)))
                            }}
                          >
                            + Restock
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            aria-label={`Delete ${item.sku}`}
                            className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalDialog
        open={Boolean(restockItem)}
        onClose={() => setRestockItem(null)}
        title={`Replenish Stock — ${restockItem?.name || ''}`}
        description={`Current on-hand: ${restockItem?.currentStock.toLocaleString()} ${restockItem?.unit || ''}`}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleRestock} className="space-y-4">
          <div>
            <label htmlFor="inv-restock-qty" className="text-xs font-bold text-slate-700">
              Quantity Received ({restockItem?.unit}) *
            </label>
            <Input
              id="inv-restock-qty"
              type="number"
              min={1}
              required
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="mt-1 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRestockItem(null)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Confirm Receipt
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Register New Hospital Store SKU"
        description={theme.name}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-sku-name" className="text-xs font-bold text-slate-700">
                Item Name *
              </label>
              <Input
                id="inv-sku-name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g., Ceftriaxone 1g Vial"
              />
            </div>
            <div>
              <label htmlFor="inv-sku-code" className="text-xs font-bold text-slate-700">
                SKU Code *
              </label>
              <Input
                id="inv-sku-code"
                required
                value={draft.sku}
                onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                placeholder="e.g., KL-MED-088"
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tabular-nums">
            <div>
              <label htmlFor="inv-sku-cat" className="text-xs font-bold text-slate-700">
                Category
              </label>
              <select
                id="inv-sku-cat"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as InventorySkuDto['category'] })}
                className="w-full h-10 px-2.5 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="medicine">Medicine</option>
                <option value="consumable">Consumable</option>
                <option value="ppe">PPE</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            <div>
              <label htmlFor="inv-sku-stock" className="text-xs font-bold text-slate-700">
                Initial Stock
              </label>
              <Input
                id="inv-sku-stock"
                type="number"
                min={0}
                value={draft.currentStock}
                onChange={(e) => setDraft({ ...draft, currentStock: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label htmlFor="inv-sku-min" className="text-xs font-bold text-slate-700">
                Min Threshold
              </label>
              <Input
                id="inv-sku-min"
                type="number"
                min={0}
                value={draft.minStock}
                onChange={(e) => setDraft({ ...draft, minStock: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label htmlFor="inv-sku-price" className="text-xs font-bold text-slate-700">
                Unit Price (RM)
              </label>
              <Input
                id="inv-sku-price"
                type="number"
                step="0.01"
                min={0}
                value={draft.pricePerUnit}
                onChange={(e) => setDraft({ ...draft, pricePerUnit: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-sku-unit" className="text-xs font-bold text-slate-700">
                Dispensing Unit
              </label>
              <Input id="inv-sku-unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
            </div>
            <div>
              <label htmlFor="inv-sku-supplier" className="text-xs font-bold text-slate-700">
                Contract Supplier
              </label>
              <Input id="inv-sku-supplier" value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Register SKU
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
