import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import {
  Bed,
  User,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Minus,
  Download,
} from 'lucide-react'
import { downloadCsvFile } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface Ward {
  id: string
  name: string
  nameMY: string
  totalBeds: number
  occupied: number
  reserved: number
  maintenance: number
  type: 'general' | 'icu' | 'maternity' | 'pediatric' | 'isolation'
}

const initialWards: Ward[] = [
  { id: '1', name: 'General Ward A', nameMY: 'Wad Am A', totalBeds: 30, occupied: 24, reserved: 3, maintenance: 1, type: 'general' },
  { id: '2', name: 'General Ward B', nameMY: 'Wad Am B', totalBeds: 30, occupied: 28, reserved: 1, maintenance: 0, type: 'general' },
  { id: '3', name: 'ICU', nameMY: 'Unit Rawatan Rapi', totalBeds: 10, occupied: 8, reserved: 1, maintenance: 0, type: 'icu' },
  { id: '4', name: 'Maternity Ward', nameMY: 'Wad Bersalin', totalBeds: 20, occupied: 15, reserved: 2, maintenance: 1, type: 'maternity' },
  { id: '5', name: 'Pediatric Ward', nameMY: 'Wad Pediatrik', totalBeds: 25, occupied: 18, reserved: 4, maintenance: 0, type: 'pediatric' },
  { id: '6', name: 'Isolation Ward', nameMY: 'Wad Isolasi', totalBeds: 15, occupied: 5, reserved: 0, maintenance: 2, type: 'isolation' },
  { id: '7', name: 'CCU', nameMY: 'Unit Jantung', totalBeds: 8, occupied: 6, reserved: 1, maintenance: 0, type: 'icu' },
  { id: '8', name: 'Surgical Ward', nameMY: 'Wad Pembedahan', totalBeds: 25, occupied: 20, reserved: 2, maintenance: 1, type: 'general' },
]

const wardTypeConfig: Record<Ward['type'], { color: string; label: string }> = {
  general: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'General' },
  icu: { color: 'bg-red-100 text-red-800 border-red-200', label: 'ICU / CCU' },
  maternity: { color: 'bg-pink-100 text-pink-800 border-pink-200', label: 'Maternity' },
  pediatric: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Pediatric' },
  isolation: { color: 'bg-amber-100 text-amber-900 border-amber-200', label: 'Isolation' },
}

export default function BedManagement() {
  const { toast } = useToast()
  const [wards, setWards] = useState<Ward[]>(initialWards)
  const [selectedWard, setSelectedWard] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWard, setNewWard] = useState({
    name: '',
    nameMY: '',
    totalBeds: '20',
    type: 'general' as Ward['type'],
  })

  const totalStats = wards.reduce(
    (acc, ward) => ({
      totalBeds: acc.totalBeds + ward.totalBeds,
      occupied: acc.occupied + ward.occupied,
      reserved: acc.reserved + ward.reserved,
      maintenance: acc.maintenance + ward.maintenance,
    }),
    { totalBeds: 0, occupied: 0, reserved: 0, maintenance: 0 }
  )

  const availableTotal =
    totalStats.totalBeds - totalStats.occupied - totalStats.reserved - totalStats.maintenance
  const occupancyRate =
    totalStats.totalBeds > 0 ? Math.round((totalStats.occupied / totalStats.totalBeds) * 100) : 0

  const adjustWardOccupancy = (wardId: string, delta: number) => {
    setWards((prev) =>
      prev.map((w) => {
        if (w.id !== wardId) return w
        const maxOccupiable = w.totalBeds - w.reserved - w.maintenance
        const nextOccupied = Math.max(0, Math.min(maxOccupiable, w.occupied + delta))
        return { ...w, occupied: nextOccupied }
      })
    )
  }

  const addBedToSelectedOrOpenModal = () => {
    if (selectedWard) {
      setWards((prev) =>
        prev.map((w) => (w.id === selectedWard ? { ...w, totalBeds: w.totalBeds + 2 } : w))
      )
      toast({
        title: 'Capacity Expanded',
        description: 'Added 2 beds to selected ward.',
        variant: 'success',
      })
    } else {
      setShowAddModal(true)
    }
  }

  const handleCreateWard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWard.name.trim()) return
    const created: Ward = {
      id: `ward-${Date.now()}`,
      name: newWard.name.trim(),
      nameMY: newWard.nameMY.trim() || newWard.name.trim(),
      totalBeds: Math.min(100, Math.max(1, Number(newWard.totalBeds) || 20)),
      occupied: 0,
      reserved: 0,
      maintenance: 0,
      type: newWard.type,
    }
    setWards((prev) => [...prev, created])
    setShowAddModal(false)
    setNewWard({ name: '', nameMY: '', totalBeds: '20', type: 'general' })
    toast({
      title: 'Ward Added',
      description: `${created.name} (${created.totalBeds} beds) registered.`,
      variant: 'success',
    })
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      'hospital-bed-capacity.csv',
      ['Ward', 'Type', 'Total Beds', 'Occupied', 'Available', 'Reserved', 'Maintenance'],
      wards.map((w) => [
        w.name,
        w.type,
        w.totalBeds,
        w.occupied,
        w.totalBeds - w.occupied - w.reserved - w.maintenance,
        w.reserved,
        w.maintenance,
      ])
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bed Management</h1>
          <p className="text-slate-600 text-sm">
            Real-time ward census, admissions & bed capacity allocation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({ title: 'Census Synced', description: 'Ward occupancy synchronized.' })
            }
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Sync
          </Button>
          <Button
            onClick={addBedToSelectedOrOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Bed className="w-4 h-4" />
            {selectedWard ? '+2 Beds to Selected Ward' : 'Add Ward / Beds'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 tabular-nums">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Bed className="w-6 h-6 text-slate-700" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalStats.totalBeds}</p>
              <p className="text-xs font-medium text-slate-600">Total Beds</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/80 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <User className="w-6 h-6 text-red-700" />
            <div>
              <p className="text-2xl font-bold text-red-900">{totalStats.occupied}</p>
              <p className="text-xs font-medium text-red-700">Occupied</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/80 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            <div>
              <p className="text-2xl font-bold text-emerald-900">{availableTotal}</p>
              <p className="text-xs font-medium text-emerald-700">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/80 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-700" />
            <div>
              <p className="text-2xl font-bold text-amber-900">{totalStats.reserved}</p>
              <p className="text-xs font-medium text-amber-800">Reserved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/80 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-700" />
            <div>
              <p className="text-2xl font-bold text-orange-900">{totalStats.maintenance}</p>
              <p className="text-xs font-medium text-orange-800">Maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Hospital Occupancy Rate</h3>
              <p className="text-xs text-slate-500">
                Select any ward card below to expand capacity or admit/discharge beds
              </p>
            </div>
            <div className="flex items-center gap-3 tabular-nums">
              <StatusBadge
                tone={occupancyRate > 90 ? 'critical' : occupancyRate > 75 ? 'warning' : 'success'}
                icon={occupancyRate > 90 ? AlertTriangle : occupancyRate > 75 ? AlertCircle : CheckCircle2}
                label={occupancyRate > 90 ? 'Critical Surge' : occupancyRate > 75 ? 'High Load' : 'Optimal'}
              />
              <p className="text-3xl font-bold text-blue-700">{occupancyRate}%</p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
            <div
              className={`h-3.5 rounded-full transition-all ${
                occupancyRate > 90
                  ? 'bg-red-600'
                  : occupancyRate > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <div className="flex items-center gap-5 mt-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Occupied (Solid)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-amber-100 inline-block" />{' '}
              Reserved (Ring)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-orange-600 bg-orange-100 inline-block" />{' '}
              Maintenance (Dashed)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border border-emerald-500 bg-emerald-50 inline-block" />{' '}
              Available (Open)
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4 tabular-nums">
        {wards.map((ward) => {
          const available = ward.totalBeds - ward.occupied - ward.reserved - ward.maintenance
          const occupancy = Math.round((ward.occupied / ward.totalBeds) * 100)
          const typeConfig = wardTypeConfig[ward.type]
          const isSelected = selectedWard === ward.id

          return (
            <Card
              key={ward.id}
              className={`cursor-pointer border-slate-200 transition-shadow hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-600 shadow-md' : ''
              }`}
              onClick={() => setSelectedWard(isSelected ? null : ward.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-slate-900">{ward.name}</CardTitle>
                  <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                </div>
                <p className="text-xs text-slate-500">{ward.nameMY}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-10 gap-1" aria-label={`${ward.name} bed map`}>
                  {Array.from({ length: ward.totalBeds }).map((_, i) => {
                    let statusLabel = 'Available'
                    let cellClass = 'rounded-sm border border-emerald-500 bg-emerald-50'
                    if (i < ward.occupied) {
                      statusLabel = 'Occupied'
                      cellClass = 'rounded-sm bg-red-500'
                    } else if (i < ward.occupied + ward.reserved) {
                      statusLabel = 'Reserved'
                      cellClass = 'rounded-full border-2 border-amber-500 bg-amber-100'
                    } else if (i < ward.occupied + ward.reserved + ward.maintenance) {
                      statusLabel = 'Maintenance'
                      cellClass = 'rounded-sm border border-dashed border-orange-600 bg-orange-100'
                    }
                    return (
                      <div
                        key={i}
                        title={`Bed ${i + 1}: ${statusLabel}`}
                        className={`w-2.5 h-2.5 ${cellClass}`}
                      />
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                  <span>
                    Occupied: <strong className="text-slate-900">{ward.occupied}</strong>
                  </span>
                  <span>
                    Available: <strong className="text-emerald-700">{available}</strong>
                  </span>
                  <span>Reserved: {ward.reserved}</span>
                  <span>Maint: {ward.maintenance}</span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-500">Occupancy</span>
                    <span className="font-bold text-slate-900">{occupancy}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        occupancy > 90
                          ? 'bg-red-600'
                          : occupancy > 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                      }`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={ward.occupied <= 0}
                    onClick={() => adjustWardOccupancy(ward.id, -1)}
                    className="flex-1 h-8 text-xs"
                  >
                    <Minus className="w-3 h-3 mr-1" /> Discharge
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={available <= 0}
                    onClick={() => adjustWardOccupancy(ward.id, 1)}
                    className="flex-1 h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Admit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ModalDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Ward"
        description="Register an inpatient ward unit and initialize bed capacity."
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleCreateWard} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ward Name *</label>
              <Input
                required
                placeholder="e.g., Ward 6C"
                value={newWard.name}
                onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Malay Label (Optional)
              </label>
              <Input
                placeholder="e.g., Wad 6C"
                value={newWard.nameMY}
                onChange={(e) => setNewWard({ ...newWard, nameMY: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Beds
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newWard.totalBeds}
                  onChange={(e) => setNewWard({ ...newWard, totalBeds: e.target.value })}
                  className="tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ward Type</label>
                <select
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                  value={newWard.type}
                  onChange={(e) => setNewWard({ ...newWard, type: e.target.value as Ward['type'] })}
                >
                  <option value="general">General Ward</option>
                  <option value="icu">ICU / CCU</option>
                  <option value="maternity">Maternity</option>
                  <option value="pediatric">Pediatric</option>
                  <option value="isolation">Isolation</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Create Ward
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
