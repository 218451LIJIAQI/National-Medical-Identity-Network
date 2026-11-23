import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Bed,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  Minus,
  Download,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

const wardTypeConfig = {
  general: { color: 'bg-blue-100 text-blue-700', label: 'Wad Am' },
  icu: { color: 'bg-red-100 text-red-700', label: 'ICU/CCU' },
  maternity: { color: 'bg-pink-100 text-pink-700', label: 'Bersalin' },
  pediatric: { color: 'bg-purple-100 text-purple-700', label: 'Pediatrik' },
  isolation: { color: 'bg-yellow-100 text-yellow-700', label: 'Isolasi' },
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
      toast({ title: 'Capacity Expanded', description: 'Added 2 beds to selected ward.' })
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
      totalBeds: Math.max(1, Number(newWard.totalBeds) || 20),
      occupied: 0,
      reserved: 0,
      maintenance: 0,
      type: newWard.type,
    }
    setWards((prev) => [...prev, created])
    setShowAddModal(false)
    setNewWard({ name: '', nameMY: '', totalBeds: '20', type: 'general' })
    toast({ title: 'Ward Added', description: `${created.name} (${created.totalBeds} beds) registered.` })
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
          <h1 className="text-2xl font-bold text-gray-900">Bed Management</h1>
          <p className="text-gray-500 text-sm">Real-time ward census, admissions & bed capacity allocation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => toast({ title: 'Census Synced', description: 'Ward occupancy synchronized.' })}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Sync
          </Button>
          <Button onClick={addBedToSelectedOrOpenModal} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Bed className="w-4 h-4" />
            {selectedWard ? '+2 Beds to Selected Ward' : 'Add Ward / Beds'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-50 border-slate-200"><CardContent className="p-4 flex items-center gap-3"><Bed className="w-6 h-6 text-slate-600" /><div><p className="text-2xl font-bold text-slate-800">{totalStats.totalBeds}</p><p className="text-xs text-slate-500">Total Beds</p></div></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-4 flex items-center gap-3"><User className="w-6 h-6 text-red-600" /><div><p className="text-2xl font-bold text-red-700">{totalStats.occupied}</p><p className="text-xs text-red-600">Occupied</p></div></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="w-6 h-6 text-green-600" /><div><p className="text-2xl font-bold text-green-700">{availableTotal}</p><p className="text-xs text-green-600">Available</p></div></CardContent></Card>
        <Card className="bg-yellow-50 border-yellow-200"><CardContent className="p-4 flex items-center gap-3"><Clock className="w-6 h-6 text-yellow-600" /><div><p className="text-2xl font-bold text-yellow-700">{totalStats.reserved}</p><p className="text-xs text-yellow-600">Reserved</p></div></CardContent></Card>
        <Card className="bg-orange-50 border-orange-200"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="w-6 h-6 text-orange-600" /><div><p className="text-2xl font-bold text-orange-700">{totalStats.maintenance}</p><p className="text-xs text-orange-600">Maintenance</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Hospital Occupancy Rate</h3>
              <p className="text-xs text-gray-500">Click any ward card below to admit or discharge beds</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">{occupancyRate}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3.5">
            <div
              className={`h-3.5 rounded-full transition-all ${
                occupancyRate > 90 ? 'bg-red-500' : occupancyRate > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {wards.map((ward) => {
          const available = ward.totalBeds - ward.occupied - ward.reserved - ward.maintenance
          const occupancy = Math.round((ward.occupied / ward.totalBeds) * 100)
          const typeConfig = wardTypeConfig[ward.type]
          const isSelected = selectedWard === ward.id

          return (
            <Card
              key={ward.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
              }`}
              onClick={() => setSelectedWard(isSelected ? null : ward.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">{ward.name}</CardTitle>
                  <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                </div>
                <p className="text-xs text-gray-500">{ward.nameMY}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: ward.totalBeds }).map((_, i) => {
                    let status = 'available'
                    if (i < ward.occupied) status = 'occupied'
                    else if (i < ward.occupied + ward.reserved) status = 'reserved'
                    else if (i < ward.occupied + ward.reserved + ward.maintenance) status = 'maintenance'
                    return (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-sm ${
                          status === 'occupied'
                            ? 'bg-red-400'
                            : status === 'reserved'
                              ? 'bg-yellow-400'
                              : status === 'maintenance'
                                ? 'bg-orange-400'
                                : 'bg-green-400'
                        }`}
                      />
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
                  <span>Occupied: <strong>{ward.occupied}</strong></span>
                  <span>Available: <strong className="text-green-700">{available}</strong></span>
                  <span>Reserved: {ward.reserved}</span>
                  <span>Maint: {ward.maintenance}</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Occupancy</span>
                    <span className="font-bold">{occupancy}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        occupancy > 90 ? 'bg-red-500' : occupancy > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
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

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateWard}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Add New Ward</h3>
                <button type="button" onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-3">
                <Input
                  required
                  placeholder="Ward Name (e.g., Ward 6C) *"
                  value={newWard.name}
                  onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
                />
                <Input
                  placeholder="Malay Label (e.g., Wad 6C)"
                  value={newWard.nameMY}
                  onChange={(e) => setNewWard({ ...newWard, nameMY: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="Total Beds"
                    value={newWard.totalBeds}
                    onChange={(e) => setNewWard({ ...newWard, totalBeds: e.target.value })}
                  />
                  <select
                    className="h-10 px-3 border rounded-md text-sm bg-white"
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Create Ward
                </Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
