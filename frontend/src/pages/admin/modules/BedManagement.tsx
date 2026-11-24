import { useState, useEffect, useCallback } from 'react'
import { Bed, Plus, Edit2, Download, RefreshCw, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, type HospitalWardDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, downloadCsvFile } from '@/lib/utils'
import { WorkstationModuleHeader } from '@/components/ClinicalPatientBanner'
import { DataErrorBanner, EmptyStatePanel, ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

const WARD_TYPES: Array<{ value: HospitalWardDto['type']; label: string }> = [
  { value: 'general', label: 'General Medical / Surgical' },
  { value: 'icu', label: 'Intensive Care (ICU / CCU)' },
  { value: 'maternity', label: 'Maternity & Obstetrics' },
  { value: 'pediatric', label: 'Paediatric Ward' },
  { value: 'isolation', label: 'Negative-Pressure Isolation' },
]

export default function BedManagement() {
  const user = useAuthStore((s) => s.user)
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const [wards, setWards] = useState<HospitalWardDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [editingWard, setEditingWard] = useState<HospitalWardDto | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [draft, setDraft] = useState({
    name: '',
    nameMY: '',
    type: 'general' as HospitalWardDto['type'],
    totalBeds: 24,
    occupied: 12,
    reserved: 2,
    maintenance: 0,
  })

  const loadWards = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    const res = await hospitalApi.getWards(hospitalId, signal)
    if (res.aborted) return
    if (res.success && res.data) {
      setWards(res.data)
    } else {
      setLoadError(res.error || t.networkError)
    }
    setLoading(false)
  }, [hospitalId, t.networkError])

  useEffect(() => {
    const controller = new AbortController()
    void loadWards(controller.signal)
    return () => controller.abort()
  }, [loadWards])

  const filteredWards =
    filterType === 'all' ? wards : wards.filter((w) => w.type === filterType)

  const totals = wards.reduce(
    (acc, w) => {
      const avail = Math.max(0, w.totalBeds - w.occupied - w.reserved - w.maintenance)
      acc.total += w.totalBeds
      acc.occupied += w.occupied
      acc.reserved += w.reserved
      acc.maintenance += w.maintenance
      acc.available += avail
      return acc
    },
    { total: 0, occupied: 0, reserved: 0, maintenance: 0, available: 0 }
  )

  const occupancyPct = totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : 0

  const openEdit = (ward: HospitalWardDto) => {
    setEditingWard(ward)
    setDraft({
      name: ward.name,
      nameMY: ward.nameMY,
      type: ward.type,
      totalBeds: ward.totalBeds,
      occupied: ward.occupied,
      reserved: ward.reserved,
      maintenance: ward.maintenance,
    })
  }

  const openCreate = () => {
    setEditingWard(null)
    setDraft({
      name: '',
      nameMY: '',
      type: 'general',
      totalBeds: 24,
      occupied: 0,
      reserved: 0,
      maintenance: 0,
    })
    setShowCreate(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (draft.occupied + draft.reserved + draft.maintenance > draft.totalBeds) {
      toast({
        title: 'Capacity Exceeded',
        description: 'Occupied + Reserved + Maintenance beds cannot exceed Total Ward Capacity.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const res = editingWard
        ? await hospitalApi.updateWard(hospitalId, editingWard.id, draft)
        : await hospitalApi.createWard(hospitalId, draft)
      if (res.success && res.data) {
        if (editingWard) {
          setWards((prev) => prev.map((w) => (w.id === editingWard.id ? res.data! : w)))
        } else {
          setWards((prev) => [...prev, res.data!])
        }
        setEditingWard(null)
        setShowCreate(false)
        toast({
          title: editingWard ? 'Ward Capacity Updated' : 'New Ward Commissioned',
          description: `${res.data.name} saved at ${theme.shortName}.`,
          variant: 'success',
        })
      } else {
        toast({ title: 'Save Failed', description: res.error || 'Could not save ward', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `bed-census-${hospitalId}.csv`,
      ['Ward ID', 'Ward Name', 'Category', 'Total Beds', 'Occupied', 'Reserved', 'Maintenance', 'Available'],
      filteredWards.map((w) => [
        w.id,
        w.name,
        w.type,
        w.totalBeds,
        w.occupied,
        w.reserved,
        w.maintenance,
        Math.max(0, w.totalBeds - w.occupied - w.reserved - w.maintenance),
      ])
    )
  }

  return (
    <div className="space-y-6">
      <WorkstationModuleHeader
        icon={Bed}
        title={t.bedManagement}
        subtitle="Real-time inpatient bed census, ICU surge allocation & isolation ward readiness"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void loadWards()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t.refreshData}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-1.5" />
              {t.exportCsv}
            </Button>
            <Button
              size="sm"
              onClick={openCreate}
              className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Ward
            </Button>
          </>
        }
      />

      {/* Census KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 tabular-nums">
        {[
          { label: 'Total Licensed Beds', value: totals.total, sub: `${wards.length} active wards` },
          { label: 'Occupied Beds', value: totals.occupied, sub: `${occupancyPct}% BOR` },
          { label: 'Available Ready', value: totals.available, sub: 'Immediate admission' },
          { label: 'Reserved / OT Post-Op', value: totals.reserved, sub: 'Booked transfers' },
          { label: 'Terminal Cleaning / Maint.', value: totals.maintenance, sub: 'Temporarily closed' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-600">{kpi.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpi.value}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 flex-wrap bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
            filterType === 'all' ? `${theme.iconBg} text-white` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          )}
        >
          All Wards ({wards.length})
        </button>
        {WARD_TYPES.map((wt) => (
          <button
            key={wt.value}
            type="button"
            onClick={() => setFilterType(wt.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
              filterType === wt.value ? `${theme.iconBg} text-white` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {wt.label}
          </button>
        ))}
      </div>

      {/* Ward Grid */}
      {loadError && <DataErrorBanner message={loadError} onRetry={() => void loadWards()} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : filteredWards.length === 0 ? (
        <EmptyStatePanel
          icon={Bed}
          hasActiveFilters={filterType !== 'all'}
          onClearFilters={() => setFilterType('all')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWards.map((ward) => {
            const available = Math.max(0, ward.totalBeds - ward.occupied - ward.reserved - ward.maintenance)
            const utilPct = ward.totalBeds > 0 ? Math.round((ward.occupied / ward.totalBeds) * 100) : 0
            const highStrain = utilPct >= 85
            return (
              <div key={ward.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 tabular-nums">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-600">{ward.id}</span>
                    <h2 className="text-base font-bold text-slate-900">
                      {language === 'ms' ? ward.nameMY : ward.name}
                    </h2>
                  </div>
                  <StatusBadge
                    tone={highStrain ? 'critical' : 'success'}
                    icon={highStrain ? AlertTriangle : CheckCircle2}
                    label={`${utilPct}% Occupied`}
                  />
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all', highStrain ? 'bg-red-600' : 'bg-emerald-600')}
                    style={{ width: `${Math.min(100, utilPct)}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="font-extrabold text-slate-900">{ward.totalBeds}</p>
                    <p className="text-[10px] text-slate-600">Total</p>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50">
                    <p className="font-extrabold text-blue-900">{ward.occupied}</p>
                    <p className="text-[10px] text-blue-700">In-Use</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50">
                    <p className="font-extrabold text-emerald-900">{available}</p>
                    <p className="text-[10px] text-emerald-700">Free</p>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50">
                    <p className="font-extrabold text-amber-900">{ward.reserved + ward.maintenance}</p>
                    <p className="text-[10px] text-amber-800">Hold</p>
                  </div>
                </div>

                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => openEdit(ward)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    Adjust Allocation
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ModalDialog
        open={Boolean(editingWard) || showCreate}
        onClose={() => {
          setEditingWard(null)
          setShowCreate(false)
        }}
        title={editingWard ? `Adjust Census — ${editingWard.name}` : 'Commission New Inpatient Ward'}
        description={theme.name}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ward-name-en" className="text-xs font-bold text-slate-700">
                Ward Name (EN) *
              </label>
              <Input
                id="ward-name-en"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g., Surgical Ward 6B"
              />
            </div>
            <div>
              <label htmlFor="ward-name-bm" className="text-xs font-bold text-slate-700">
                Nama Wad (BM)
              </label>
              <Input
                id="ward-name-bm"
                value={draft.nameMY}
                onChange={(e) => setDraft({ ...draft, nameMY: e.target.value })}
                placeholder="cth., Wad Pembedahan 6B"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ward-type" className="text-xs font-bold text-slate-700">
              Ward Classification
            </label>
            <select
              id="ward-type"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as HospitalWardDto['type'] })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm mt-1"
            >
              {WARD_TYPES.map((wt) => (
                <option key={wt.value} value={wt.value}>
                  {wt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tabular-nums">
            <div>
              <label htmlFor="ward-total-beds" className="text-xs font-bold text-slate-700">
                Total Beds
              </label>
              <Input
                id="ward-total-beds"
                type="number"
                min={1}
                value={draft.totalBeds}
                onChange={(e) => setDraft({ ...draft, totalBeds: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div>
              <label htmlFor="ward-occupied-beds" className="text-xs font-bold text-slate-700">
                Occupied
              </label>
              <Input
                id="ward-occupied-beds"
                type="number"
                min={0}
                value={draft.occupied}
                onChange={(e) => setDraft({ ...draft, occupied: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label htmlFor="ward-reserved-beds" className="text-xs font-bold text-slate-700">
                Reserved
              </label>
              <Input
                id="ward-reserved-beds"
                type="number"
                min={0}
                value={draft.reserved}
                onChange={(e) => setDraft({ ...draft, reserved: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label htmlFor="ward-maintenance-beds" className="text-xs font-bold text-slate-700">
                Maintenance
              </label>
              <Input
                id="ward-maintenance-beds"
                type="number"
                min={0}
                value={draft.maintenance}
                onChange={(e) => setDraft({ ...draft, maintenance: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingWard(null)
                setShowCreate(false)
              }}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Save Allocation
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
