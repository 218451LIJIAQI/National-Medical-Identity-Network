import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bed, User, AlertTriangle, CheckCircle, Clock,
  RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'

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

const mockWards: Ward[] = [
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
  const [selectedWard, setSelectedWard] = useState<string | null>(null)

  const totalStats = mockWards.reduce((acc, ward) => ({
    totalBeds: acc.totalBeds + ward.totalBeds,
    occupied: acc.occupied + ward.occupied,
    reserved: acc.reserved + ward.reserved,
    maintenance: acc.maintenance + ward.maintenance,
  }), { totalBeds: 0, occupied: 0, reserved: 0, maintenance: 0 })

  const available = totalStats.totalBeds - totalStats.occupied - totalStats.reserved - totalStats.maintenance
  const occupancyRate = Math.round((totalStats.occupied / totalStats.totalBeds) * 100)

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bed Management</h1>
          <p className="text-gray-500">Pengurusan Katil Hospital</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Bed className="w-4 h-4" />
            Add Bed / Tambah Katil
          </Button>
        </div>
      </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500 rounded-lg">
                <Bed className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-700">{totalStats.totalBeds}</p>
                <p className="text-xs text-slate-600">Jumlah Katil</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{totalStats.occupied}</p>
                <p className="text-xs text-red-600">Diduduki</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{available}</p>
                <p className="text-xs text-green-600">Kosong</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{totalStats.reserved}</p>
                <p className="text-xs text-yellow-600">Ditempah</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{totalStats.maintenance}</p>
                <p className="text-xs text-orange-600">Penyelenggaraan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

            <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Hospital Occupancy Rate</h3>
              <p className="text-sm text-gray-500">Kadar Penghunian Hospital</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{occupancyRate}%</p>
              <p className="text-sm text-gray-500">Overall</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className={`h-4 rounded-full transition-all ${
                occupancyRate > 90 ? 'bg-red-500' : 
                occupancyRate > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span className="text-yellow-600">75% (Warning)</span>
            <span className="text-red-600">90% (Critical)</span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockWards.map((ward, index) => {
          const available = ward.totalBeds - ward.occupied - ward.reserved - ward.maintenance
          const occupancy = Math.round((ward.occupied / ward.totalBeds) * 100)
          const typeConfig = wardTypeConfig[ward.type]
          
          return (
            <motion.div
              key={ward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedWard === ward.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedWard(selectedWard === ward.id ? null : ward.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{ward.name}</CardTitle>
                    <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{ward.nameMY}</p>
                </CardHeader>
                <CardContent>
                                    <div className="grid grid-cols-10 gap-1 mb-3">
                    {Array.from({ length: ward.totalBeds }).map((_, i) => {
                      let status = 'available'
                      if (i < ward.occupied) status = 'occupied'
                      else if (i < ward.occupied + ward.reserved) status = 'reserved'
                      else if (i < ward.occupied + ward.reserved + ward.maintenance) status = 'maintenance'
                      
                      return (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-sm ${
                            status === 'occupied' ? 'bg-red-400' :
                            status === 'reserved' ? 'bg-yellow-400' :
                            status === 'maintenance' ? 'bg-orange-400' :
                            'bg-green-400'
                          }`}
                        />
                      )
                    })}
                  </div>
                  
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                      <span>Diduduki: {ward.occupied}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span>Kosong: {available}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                      <span>Tempahan: {ward.reserved}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-400 rounded-full" />
                      <span>Rosak: {ward.maintenance}</span>
                    </div>
                  </div>

                                    <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Occupancy</span>
                      <span className={
                        occupancy > 90 ? 'text-red-600 font-bold' :
                        occupancy > 75 ? 'text-yellow-600' : 'text-green-600'
                      }>{occupancy}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          occupancy > 90 ? 'bg-red-500' :
                          occupancy > 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

            <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">Petunjuk / Legend</h4>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 rounded" />
              <span className="text-sm">Diduduki / Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded" />
              <span className="text-sm">Kosong / Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded" />
              <span className="text-sm">Ditempah / Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-400 rounded" />
              <span className="text-sm">Penyelenggaraan / Maintenance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
