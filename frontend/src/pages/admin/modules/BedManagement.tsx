import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useSessionState, exportToCsv } from '@/lib/workstation-storage'
import { useToast } from '@/components/ui/use-toast'
import {
  Bed,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Plus,
  Minus,
  Building2,
  Download,
  RotateCcw,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface WardSummary {
  id: string
  name: string
  floor: string
  totalBeds: number
  occupied: number
  available: number
  reserved: number
  maintenance: number
  specialty: string
}

const DEFAULT_WARDS: WardSummary[] = [
  { id: 'W1', name: 'Ward 1A - General Medicine', floor: 'Level 1', totalBeds: 40, occupied: 35, available: 3, reserved: 1, maintenance: 1, specialty: 'Internal Medicine' },
  { id: 'W2', name: 'Ward 2A - Cardiology', floor: 'Level 2', totalBeds: 30, occupied: 26, available: 2, reserved: 2, maintenance: 0, specialty: 'Cardiology' },
  { id: 'W3', name: 'Ward 2B - Surgery', floor: 'Level 2', totalBeds: 35, occupied: 28, available: 5, reserved: 1, maintenance: 1, specialty: 'General Surgery' },
  { id: 'W4', name: 'Ward 3A - Pediatrics', floor: 'Level 3', totalBeds: 25, occupied: 18, available: 6, reserved: 1, maintenance: 0, specialty: 'Pediatrics' },
  { id: 'W5', name: 'Ward 3B - Maternity', floor: 'Level 3', totalBeds: 30, occupied: 22, available: 6, reserved: 2, maintenance: 0, specialty: 'O&G' },
  { id: 'W6', name: 'ICU - Intensive Care', floor: 'Level 4', totalBeds: 20, occupied: 18, available: 1, reserved: 1, maintenance: 0, specialty: 'Critical Care' },
  { id: 'W7', name: 'HDU - High Dependency', floor: 'Level 4', totalBeds: 15, occupied: 12, available: 2, reserved: 1, maintenance: 0, specialty: 'Critical Care' },
  { id: 'W8', name: 'Emergency Observation', floor: 'Ground', totalBeds: 25, occupied: 20, available: 4, reserved: 0, maintenance: 1, specialty: 'Emergency' },
]

export default function BedManagement() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)
  const hospitalKey = user?.hospitalId || 'hospital-kl'

  const [wards, setWards] = useSessionState<WardSummary[]>(`admin-wards:${hospitalKey}`, DEFAULT_WARDS)
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newWardName, setNewWardName] = useState('')
  const [newWardFloor, setNewWardFloor] = useState('Level 5')
  const [newWardSpecialty, setNewWardSpecialty] = useState('General Medicine')
  const [newWardBeds, setNewWardBeds] = useState('20')

  const adjustWard = (
    wardId: string,
    action: 'admit' | 'discharge' | 'reserve' | 'maintenance_toggle' | 'add_bed'
  ) => {
    setWards((prev) =>
      prev.map((w) => {
        if (w.id !== wardId) return w
        if (action === 'admit' && w.available > 0) {
          return { ...w, occupied: w.occupied + 1, available: w.available - 1 }
        }
        if (action === 'discharge' && w.occupied > 0) {
          return { ...w, occupied: w.occupied - 1, available: w.available + 1 }
        }
        if (action === 'reserve' && w.available > 0) {
          return { ...w, reserved: w.reserved + 1, available: w.available - 1 }
        }
        if (action === 'maintenance_toggle') {
          if (w.maintenance > 0) {
            return { ...w, maintenance: w.maintenance - 1, available: w.available + 1 }
          }
          if (w.available > 0) {
            return { ...w, maintenance: w.maintenance + 1, available: w.available - 1 }
          }
        }
        if (action === 'add_bed') {
          return { ...w, totalBeds: w.totalBeds + 1, available: w.available + 1 }
        }
        return w
      })
    )
  }

  const handleCreateWard = (e: React.FormEvent) => {
    e.preventDefault()
    const beds = Math.max(1, Number.parseInt(newWardBeds, 10) || 10)
    if (!newWardName.trim()) return
    const created: WardSummary = {
      id: `W-${Date.now().toString().slice(-4)}`,
      name: newWardName.trim(),
      floor: newWardFloor.trim() || 'Level 1',
      totalBeds: beds,
      occupied: 0,
      available: beds,
      reserved: 0,
      maintenance: 0,
      specialty: newWardSpecialty.trim() || 'General',
    }
    setWards((prev) => [...prev, created])
    setSelectedWardId(created.id)
    setNewWardName('')
    setModalOpen(false)
    toast({ title: 'Ward Added', description: `${created.name} (${beds} beds) added to ward board.` })
  }

  const handleResetBaseline = () => {
    setWards(DEFAULT_WARDS)
    toast({ title: 'Baseline Restored', description: 'Ward bed allocations reset to default shift baseline.' })
  }

  const handleExportCsv = () => {
    exportToCsv(
      `${theme.shortName.toLowerCase()}-bed-occupancy.csv`,
      ['Ward', 'Floor', 'Specialty', 'Total Beds', 'Occupied', 'Available', 'Reserved', 'Maintenance', 'Occupancy %'],
      wards.map((w) => [
        w.name,
        w.floor,
        w.specialty,
        w.totalBeds,
        w.occupied,
        w.available,
        w.reserved,
        w.maintenance,
        Math.round((w.occupied / Math.max(1, w.totalBeds)) * 100),
      ])
    )
  }

  const totalStats = wards.reduce(
    (acc, w) => ({
      total: acc.total + w.totalBeds,
      occupied: acc.occupied + w.occupied,
      available: acc.available + w.available,
      reserved: acc.reserved + w.reserved,
      maintenance: acc.maintenance + w.maintenance,
    }),
    { total: 0, occupied: 0, available: 0, reserved: 0, maintenance: 0 }
  )

  const occupancyRate = totalStats.total > 0 ? Math.round((totalStats.occupied / totalStats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: theme.primaryColor }}>
              <Bed className="h-6 w-6" />
            </div>
            Bed Management
          </h1>
          <p className="text-gray-500 mt-1">
            {theme.name} — Interactive ward allocation board (persisted in current browser session)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleResetBaseline} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Baseline
          </Button>
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setModalOpen(true)} className="gap-2" style={{ backgroundColor: theme.primaryColor }}>
            <Plus className="h-4 w-4" />
            Add Ward / Beds
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="col-span-2 md:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Occupancy Rate</p>
            <p className="text-3xl font-bold mt-1">{occupancyRate}%</p>
            <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  occupancyRate > 85 ? 'bg-red-500' : occupancyRate > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {[
          { label: 'Total Beds', value: totalStats.total, icon: Bed, bgClass: 'bg-blue-100', iconClass: 'text-blue-600' },
          { label: 'Occupied', value: totalStats.occupied, icon: Clock, bgClass: 'bg-red-100', iconClass: 'text-red-600' },
          { label: 'Available', value: totalStats.available, icon: CheckCircle2, bgClass: 'bg-emerald-100', iconClass: 'text-emerald-600' },
          { label: 'Reserved / Maint.', value: totalStats.reserved + totalStats.maintenance, icon: Wrench, bgClass: 'bg-amber-100', iconClass: 'text-amber-600' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bgClass}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {occupancyRate > 80 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">High Occupancy Alert ({occupancyRate}%)</p>
              <p className="text-sm text-amber-700">
                Hospital bed occupancy is above 80%. Click any ward card below to admit, discharge, reserve, or expand bed capacity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Ward Overview
          </CardTitle>
          <CardDescription>Click a ward card to open quick admit / discharge / maintenance controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {wards.map((ward, index) => {
              const wardOccupancy = Math.round((ward.occupied / Math.max(1, ward.totalBeds)) * 100)
              const isCritical = wardOccupancy >= 90
              const isSelected = selectedWardId === ward.id

              return (
                <motion.div
                  key={ward.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                    isCritical ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white hover:border-gray-200'
                  } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedWardId(isSelected ? null : ward.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                      <p className="text-xs text-gray-500">
                        {ward.floor} • {ward.specialty}
                      </p>
                    </div>
                    <Badge
                      className={
                        isCritical
                          ? 'bg-red-100 text-red-700'
                          : wardOccupancy > 75
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }
                    >
                      {wardOccupancy}% Full
                    </Badge>
                  </div>

                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex mb-3">
                    <div className="bg-red-500 h-full" style={{ width: `${(ward.occupied / ward.totalBeds) * 100}%` }} title={`Occupied: ${ward.occupied}`} />
                    <div className="bg-amber-400 h-full" style={{ width: `${(ward.reserved / ward.totalBeds) * 100}%` }} title={`Reserved: ${ward.reserved}`} />
                    <div className="bg-gray-400 h-full" style={{ width: `${(ward.maintenance / ward.totalBeds) * 100}%` }} title={`Maintenance: ${ward.maintenance}`} />
                    <div className="bg-emerald-400 h-full" style={{ width: `${(ward.available / ward.totalBeds) * 100}%` }} title={`Available: ${ward.available}`} />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-red-50">
                      <p className="font-bold text-red-700">{ward.occupied}</p>
                      <p className="text-red-600">Occupied</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <p className="font-bold text-emerald-700">{ward.available}</p>
                      <p className="text-emerald-600">Available</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50">
                      <p className="font-bold text-amber-700">{ward.reserved}</p>
                      <p className="text-amber-600">Reserved</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <p className="font-bold text-gray-700">{ward.maintenance}</p>
                      <p className="text-gray-600">Maint.</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ward.available === 0}
                        onClick={() => adjustWard(ward.id, 'admit')}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" /> Admit Patient
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ward.occupied === 0}
                        onClick={() => adjustWard(ward.id, 'discharge')}
                        className="gap-1 text-xs"
                      >
                        <Minus className="h-3 w-3" /> Discharge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ward.available === 0}
                        onClick={() => adjustWard(ward.id, 'reserve')}
                        className="gap-1 text-xs"
                      >
                        Reserve Bed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => adjustWard(ward.id, 'maintenance_toggle')}
                        className="gap-1 text-xs"
                      >
                        <Wrench className="h-3 w-3" />
                        {ward.maintenance > 0 ? 'Finish Maint.' : 'Mark Maint.'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => adjustWard(ward.id, 'add_bed')}
                        className="gap-1 text-xs"
                      >
                        +1 Extra Bed
                      </Button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Add New Ward</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWard} className="space-y-3">
              <div>
                <Label>Ward Name</Label>
                <Input value={newWardName} onChange={(e) => setNewWardName(e.target.value)} required placeholder="e.g. Ward 5A - Isolation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Floor / Wing</Label>
                  <Input value={newWardFloor} onChange={(e) => setNewWardFloor(e.target.value)} required />
                </div>
                <div>
                  <Label>Total Beds</Label>
                  <Input type="number" min={1} max={200} value={newWardBeds} onChange={(e) => setNewWardBeds(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Specialty</Label>
                <Input value={newWardSpecialty} onChange={(e) => setNewWardSpecialty(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: theme.primaryColor }}>
                  Create Ward
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
