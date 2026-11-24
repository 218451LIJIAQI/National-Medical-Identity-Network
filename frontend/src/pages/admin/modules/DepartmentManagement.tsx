import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Edit2, Phone, MapPin, Clock, Search, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, type HospitalDepartmentDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { WorkstationModuleHeader } from '@/components/ClinicalPatientBanner'
import { DataErrorBanner, EmptyStatePanel, ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

export default function DepartmentManagement() {
  const user = useAuthStore((s) => s.user)
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const [departments, setDepartments] = useState<HospitalDepartmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingDept, setEditingDept] = useState<HospitalDepartmentDto | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [draft, setDraft] = useState({
    name: '',
    nameMY: '',
    head: '',
    headTitle: 'Head of Department',
    doctorCount: 8,
    nurseCount: 18,
    location: 'Block B, Level 2',
    extension: '2200',
    operatingHours: '08:00 - 17:00',
    status: 'active' as HospitalDepartmentDto['status'],
    specialtiesInput: '',
  })

  const loadDepartments = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    const res = await hospitalApi.getDepartments(hospitalId, signal)
    if (res.aborted) return
    if (res.success && res.data) {
      setDepartments(res.data)
    } else {
      setLoadError(res.error || t.networkError)
    }
    setLoading(false)
  }, [hospitalId, t.networkError])

  useEffect(() => {
    const controller = new AbortController()
    void loadDepartments(controller.signal)
    return () => controller.abort()
  }, [loadDepartments])

  const filtered = departments.filter((d) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      d.name.toLowerCase().includes(q) ||
      d.nameMY.toLowerCase().includes(q) ||
      d.head.toLowerCase().includes(q) ||
      d.specialties.some((s) => s.toLowerCase().includes(q))
    )
  })

  const openEdit = (dept: HospitalDepartmentDto) => {
    setEditingDept(dept)
    setDraft({
      name: dept.name,
      nameMY: dept.nameMY,
      head: dept.head,
      headTitle: dept.headTitle,
      doctorCount: dept.doctorCount,
      nurseCount: dept.nurseCount,
      location: dept.location,
      extension: dept.extension,
      operatingHours: dept.operatingHours,
      status: dept.status,
      specialtiesInput: dept.specialties.join(', '),
    })
  }

  const openCreate = () => {
    setEditingDept(null)
    setDraft({
      name: '',
      nameMY: '',
      head: '',
      headTitle: 'Consultant & Head of Department',
      doctorCount: 6,
      nurseCount: 14,
      location: 'Main Block, Level 3',
      extension: '2300',
      operatingHours: '08:00 - 17:00',
      status: 'active',
      specialtiesInput: '',
    })
    setShowCreate(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        nameMY: draft.nameMY.trim() || draft.name.trim(),
        head: draft.head.trim() || 'Consultant Specialist',
        headTitle: draft.headTitle.trim(),
        doctorCount: draft.doctorCount,
        nurseCount: draft.nurseCount,
        staffCount: draft.doctorCount + draft.nurseCount,
        location: draft.location.trim(),
        extension: draft.extension.trim(),
        operatingHours: draft.operatingHours.trim(),
        status: draft.status,
        specialties: draft.specialtiesInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
      const res = editingDept
        ? await hospitalApi.updateDepartment(hospitalId, editingDept.id, payload)
        : await hospitalApi.createDepartment(hospitalId, payload)

      if (res.success && res.data) {
        if (editingDept) {
          setDepartments((prev) => prev.map((d) => (d.id === editingDept.id ? res.data! : d)))
        } else {
          setDepartments((prev) => [...prev, res.data!])
        }
        setEditingDept(null)
        setShowCreate(false)
        toast({
          title: editingDept ? 'Department Updated' : 'Department Registered',
          description: `${res.data.name} saved at ${theme.shortName}.`,
          variant: 'success',
        })
      } else {
        toast({ title: 'Save Failed', description: res.error || 'Could not save department', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <WorkstationModuleHeader
        icon={Building2}
        title={t.departments}
        subtitle="Clinical directorates, specialist leadership, operating hours & internal extensions"
        actions={
          <Button
            size="sm"
            onClick={openCreate}
            className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Department
          </Button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs font-semibold text-slate-600 tabular-nums">
          {filtered.length} clinical directorates active at {theme.name}
        </p>
        <div className="relative w-72 max-w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department, head, specialty…"
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {loadError && <DataErrorBanner message={loadError} onRetry={() => void loadDepartments()} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyStatePanel
          icon={Building2}
          hasActiveFilters={Boolean(searchQuery.trim())}
          onClearFilters={() => setSearchQuery('')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((dept) => (
            <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-[11px] font-bold text-slate-500">{dept.id}</span>
                  <h2 className="text-base font-bold text-slate-900">
                    {language === 'ms' ? dept.nameMY : dept.name}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong>{dept.head}</strong> • {dept.headTitle}
                  </p>
                </div>
                <StatusBadge
                  tone={dept.status === 'active' ? 'success' : dept.status === 'limited' ? 'warning' : 'blocked'}
                  label={dept.status.toUpperCase()}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
                <div className="p-2 rounded-xl bg-blue-50">
                  <p className="font-extrabold text-blue-950">{dept.doctorCount}</p>
                  <p className="text-[11px] text-blue-700">Doctors</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50">
                  <p className="font-extrabold text-emerald-950">{dept.nurseCount}</p>
                  <p className="text-[11px] text-emerald-700">Nurses</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50">
                  <p className="font-extrabold text-slate-900">Ext. {dept.extension}</p>
                  <p className="text-[11px] text-slate-500">PABX</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{dept.location}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{dept.operatingHours}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Internal Ext: {dept.extension}</span>
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                <div className="flex flex-wrap gap-1">
                  {dept.specialties.slice(0, 4).map((sp) => (
                    <span key={sp} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {sp}
                    </span>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(dept)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalDialog
        open={Boolean(editingDept) || showCreate}
        onClose={() => {
          setEditingDept(null)
          setShowCreate(false)
        }}
        title={editingDept ? `Edit Directorate — ${editingDept.name}` : 'Register Clinical Department'}
        description={theme.name}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Department Name *</label>
              <Input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Head of Department</label>
              <Input
                value={draft.head}
                onChange={(e) => setDraft({ ...draft, head: e.target.value })}
                placeholder="Dr. ..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 tabular-nums">
            <div>
              <label className="text-xs font-bold text-slate-700">Doctors</label>
              <Input
                type="number"
                min={0}
                value={draft.doctorCount}
                onChange={(e) => setDraft({ ...draft, doctorCount: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Nurses</label>
              <Input
                type="number"
                min={0}
                value={draft.nurseCount}
                onChange={(e) => setDraft({ ...draft, nurseCount: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Status</label>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as HospitalDepartmentDto['status'] })}
                className="w-full h-10 px-2.5 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="active">Active</option>
                <option value="limited">Limited</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Location</label>
              <Input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">PABX Extension</label>
              <Input
                value={draft.extension}
                onChange={(e) => setDraft({ ...draft, extension: e.target.value })}
                className="tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Sub-Specialties (comma-separated)</label>
            <Input
              value={draft.specialtiesInput}
              onChange={(e) => setDraft({ ...draft, specialtiesInput: e.target.value })}
              placeholder="e.g., Interventional Cardiology, Heart Failure"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingDept(null)
                setShowCreate(false)
              }}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Save Department
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
