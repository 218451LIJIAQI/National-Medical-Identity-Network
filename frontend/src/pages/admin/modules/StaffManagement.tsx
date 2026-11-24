import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Search, Edit2, UserX, Download, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, type StaffRosterMemberDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, downloadCsvFile, formatIC, isValidMyKad } from '@/lib/utils'
import { WorkstationModuleHeader } from '@/components/ClinicalPatientBanner'
import { DataErrorBanner, EmptyStatePanel, ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

const ROLES: Array<StaffRosterMemberDto['role']> = [
  'doctor',
  'nurse',
  'pharmacist',
  'technician',
  'admin',
]

export default function StaffManagement() {
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation()
  const { toast } = useToast()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const [staff, setStaff] = useState<StaffRosterMemberDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingMember, setEditingMember] = useState<StaffRosterMemberDto | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [draft, setDraft] = useState({
    name: '',
    icNumber: '',
    role: 'doctor' as StaffRosterMemberDto['role'],
    department: 'Internal Medicine',
    specialization: 'Internal Medicine',
    licenseNumber: 'MMC-48100',
    email: '',
    phone: '+60 3-2615 5555',
    status: 'active' as StaffRosterMemberDto['status'],
    joinDate: new Date().toISOString().split('T')[0],
  })

  const loadStaff = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    const res = await hospitalApi.getStaff(hospitalId, signal)
    if (res.aborted) return
    if (res.success && res.data) {
      setStaff(res.data)
    } else {
      setLoadError(res.error || t.networkError)
    }
    setLoading(false)
  }, [hospitalId, t.networkError])

  useEffect(() => {
    const controller = new AbortController()
    void loadStaff(controller.signal)
    return () => controller.abort()
  }, [loadStaff])

  const filtered = staff.filter((s) => {
    const matchesRole = roleFilter === 'all' || s.role === roleFilter
    const q = searchQuery.trim().toLowerCase()
    if (!q) return matchesRole
    return (
      matchesRole &&
      (s.name.toLowerCase().includes(q) ||
        s.icNumber.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        (s.licenseNumber || '').toLowerCase().includes(q))
    )
  })

  const openEdit = (member: StaffRosterMemberDto) => {
    setEditingMember(member)
    setDraft({
      name: member.name,
      icNumber: member.icNumber,
      role: member.role,
      department: member.department,
      specialization: member.specialization || member.department,
      licenseNumber: member.licenseNumber || '',
      email: member.email,
      phone: member.phone,
      status: member.status,
      joinDate: member.joinDate,
    })
  }

  const openCreate = () => {
    setEditingMember(null)
    setDraft({
      name: '',
      icNumber: '',
      role: 'doctor',
      department: 'Internal Medicine',
      specialization: 'Internal Medicine',
      licenseNumber: 'MMC-49200',
      email: '',
      phone: '+60 12-345 6789',
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
    })
    setShowCreate(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const formattedIc = formatIC(draft.icNumber.trim())
    if (!draft.name.trim() || !isValidMyKad(formattedIc)) {
      toast({
        title: 'Invalid Staff Credentials',
        description: t.invalidMyKadFormat,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = { ...draft, icNumber: formattedIc }
      const res = editingMember
        ? await hospitalApi.updateStaff(hospitalId, editingMember.id, payload)
        : await hospitalApi.createStaff(hospitalId, payload)
      if (res.success && res.data) {
        await loadStaff()
        setEditingMember(null)
        setShowCreate(false)
        toast({
          title: editingMember ? 'Staff Credential Updated' : 'Staff Member Onboarded',
          description: `${res.data.name} (${res.data.status}) saved in ${theme.shortName} roster.`,
          variant: 'success',
        })
      } else {
        toast({ title: 'Save Failed', description: res.error || 'Could not update staff', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (member: StaffRosterMemberDto) => {
    const res = await hospitalApi.deleteStaff(hospitalId, member.id)
    if (res.success) {
      await loadStaff()
      toast({
        title: member.role === 'doctor' ? 'Clinician License Suspended' : 'Staff Removed',
        description:
          member.role === 'doctor'
            ? `${member.name}'s clinical portal access at ${theme.shortName} has been immediately revoked.`
            : `${member.name} removed from active roster.`,
      })
    } else {
      toast({
        title: 'Action Failed',
        description: res.error || 'Unable to update staff status.',
        variant: 'destructive',
      })
    }
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `staff-roster-${hospitalId}.csv`,
      ['Staff ID', 'Full Name', 'MyKad IC', 'Role', 'Department', 'MMC License', 'Status', 'Email'],
      filtered.map((s) => [
        s.id,
        s.name,
        s.icNumber,
        s.role,
        s.department,
        s.licenseNumber || '—',
        s.status,
        s.email,
      ])
    )
  }

  return (
    <div className="space-y-6">
      <WorkstationModuleHeader
        icon={Users}
        title={t.staffManagement}
        subtitle="Unified MMC clinician licensing & allied health roster — deactivating a doctor revokes active clinical access immediately"
        actions={
          <>
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
              Onboard Staff
            </Button>
          </>
        }
      />

      {/* Role Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-colors',
            roleFilter === 'all' ? `${theme.bgLight} ${theme.borderColor}` : 'bg-white border-slate-200'
          )}
        >
          <p className="text-xs font-semibold text-slate-600">Total Roster</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{staff.length}</p>
        </button>
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={cn(
              'p-3.5 rounded-2xl border text-left capitalize transition-colors',
              roleFilter === r ? `${theme.bgLight} ${theme.borderColor}` : 'bg-white border-slate-200'
            )}
          >
            <p className="text-xs font-semibold text-slate-600">{r}s</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">
              {staff.filter((s) => s.role === r).length}
            </p>
          </button>
        ))}
      </div>

      {loadError && <DataErrorBanner message={loadError} onRetry={() => void loadStaff()} />}

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-bold text-slate-700 tabular-nums">
            Showing {filtered.length} of {staff.length} staff members
          </p>
          <div className="relative w-72 max-w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="staff-search-input"
              aria-label="Search hospital staff roster"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, MyKad IC, MMC…"
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyStatePanel
              icon={Users}
              hasActiveFilters={Boolean(searchQuery.trim() || roleFilter !== 'all')}
              onClearFilters={() => {
                setSearchQuery('')
                setRoleFilter('all')
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Staff Name & License</th>
                  <th className="py-3 px-4 text-left font-bold">MyKad IC</th>
                  <th className="py-3 px-4 text-left font-bold">Role</th>
                  <th className="py-3 px-4 text-left font-bold">Department</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                      <p className="text-slate-600">
                        {m.licenseNumber ? `${m.licenseNumber} • ` : ''}
                        {m.email}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums">{m.icNumber}</td>
                    <td className="py-3.5 px-4 capitalize font-semibold text-slate-700">{m.role}</td>
                    <td className="py-3.5 px-4 text-slate-700">{m.department}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        tone={m.status === 'active' ? 'success' : m.status === 'on_leave' ? 'warning' : 'blocked'}
                        label={m.status.replace('_', ' ').toUpperCase()}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        {m.status !== 'inactive' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(m)}
                            className="text-red-700 hover:bg-red-50"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            {m.role === 'doctor' ? 'Suspend' : 'Remove'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalDialog
        open={Boolean(editingMember) || showCreate}
        onClose={() => {
          setEditingMember(null)
          setShowCreate(false)
        }}
        title={editingMember ? `Update Staff — ${editingMember.name}` : 'Onboard Hospital Staff Member'}
        description={theme.name}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="staff-full-name" className="text-xs font-bold text-slate-700">
                Full Name *
              </label>
              <Input
                id="staff-full-name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Dr. / SN ..."
              />
            </div>
            <div>
              <label htmlFor="staff-ic" className="text-xs font-bold text-slate-700">
                MyKad IC Number *
              </label>
              <Input
                id="staff-ic"
                required
                value={draft.icNumber}
                onChange={(e) => setDraft({ ...draft, icNumber: e.target.value })}
                placeholder="850505-14-5123"
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="staff-role" className="text-xs font-bold text-slate-700">
                Role
              </label>
              <select
                id="staff-role"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as StaffRosterMemberDto['role'] })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm capitalize"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="staff-dept" className="text-xs font-bold text-slate-700">
                Department
              </label>
              <Input
                id="staff-dept"
                value={draft.department}
                onChange={(e) => setDraft({ ...draft, department: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="staff-status" className="text-xs font-bold text-slate-700">
                Status
              </label>
              <select
                id="staff-status"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as StaffRosterMemberDto['status'] })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {draft.role === 'doctor' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="staff-license" className="text-xs font-bold text-slate-700">
                  MMC License No
                </label>
                <Input
                  id="staff-license"
                  value={draft.licenseNumber}
                  onChange={(e) => setDraft({ ...draft, licenseNumber: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div>
                <label htmlFor="staff-spec" className="text-xs font-bold text-slate-700">
                  Clinical Specialization
                </label>
                <Input
                  id="staff-spec"
                  value={draft.specialization}
                  onChange={(e) => setDraft({ ...draft, specialization: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="staff-email" className="text-xs font-bold text-slate-700">
                Hospital Email
              </label>
              <Input
                id="staff-email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="staff-phone" className="text-xs font-bold text-slate-700">
                Contact Phone
              </label>
              <Input
                id="staff-phone"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingMember(null)
                setShowCreate(false)
              }}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Save Roster Entry
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
