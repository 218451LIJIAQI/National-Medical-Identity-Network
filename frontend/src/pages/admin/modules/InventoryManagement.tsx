// ============================================================================
// Inventory Management Module - Hospital Admin
// Pengurusan Inventori Hospital
// ============================================================================

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Package, Search, Plus, AlertTriangle, CheckCircle,
  Pill, Syringe, Thermometer, Stethoscope, TrendingDown,
  TrendingUp, Clock, RefreshCw, FileText
} from 'lucide-react'
import { motion } from 'framer-motion'

interface InventoryItem {
  id: string
  name: string
  nameMY: string
  category: 'medicine' | 'equipment' | 'consumable' | 'ppe'
  sku: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  lastRestocked: string
  expiryDate?: string
  supplier: string
  pricePerUnit: number
}

const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Paracetamol 500mg', nameMY: 'Parasetamol 500mg', category: 'medicine', sku: 'MED-001', currentStock: 5000, minStock: 1000, maxStock: 10000, unit: 'tablets', lastRestocked: '2024-01-15', expiryDate: '2025-06-30', supplier: 'Pharmaniaga Berhad', pricePerUnit: 0.05 },
  { id: '2', name: 'Amoxicillin 250mg', nameMY: 'Amoksisilin 250mg', category: 'medicine', sku: 'MED-002', currentStock: 800, minStock: 500, maxStock: 3000, unit: 'capsules', lastRestocked: '2024-01-10', expiryDate: '2024-12-31', supplier: 'Duopharma Biotech', pricePerUnit: 0.15 },
  { id: '3', name: 'Surgical Gloves (M)', nameMY: 'Sarung Tangan Pembedahan (M)', category: 'consumable', sku: 'CON-001', currentStock: 200, minStock: 500, maxStock: 2000, unit: 'boxes', lastRestocked: '2024-01-05', supplier: 'Top Glove Corporation', pricePerUnit: 25.00 },
  { id: '4', name: 'N95 Mask', nameMY: 'Topeng N95', category: 'ppe', sku: 'PPE-001', currentStock: 1500, minStock: 1000, maxStock: 5000, unit: 'pieces', lastRestocked: '2024-01-12', supplier: 'Hartalega Holdings', pricePerUnit: 3.50 },
  { id: '5', name: 'IV Drip Set', nameMY: 'Set Titisan IV', category: 'consumable', sku: 'CON-002', currentStock: 350, minStock: 200, maxStock: 1000, unit: 'sets', lastRestocked: '2024-01-08', supplier: 'B. Braun Medical', pricePerUnit: 8.00 },
  { id: '6', name: 'Insulin Syringe', nameMY: 'Picagari Insulin', category: 'consumable', sku: 'CON-003', currentStock: 100, minStock: 300, maxStock: 1500, unit: 'boxes', lastRestocked: '2023-12-20', supplier: 'BD Medical', pricePerUnit: 45.00 },
  { id: '7', name: 'Blood Pressure Monitor', nameMY: 'Monitor Tekanan Darah', category: 'equipment', sku: 'EQP-001', currentStock: 15, minStock: 10, maxStock: 30, unit: 'units', lastRestocked: '2024-01-01', supplier: 'Omron Healthcare', pricePerUnit: 350.00 },
  { id: '8', name: 'Metformin 500mg', nameMY: 'Metformin 500mg', category: 'medicine', sku: 'MED-003', currentStock: 3500, minStock: 2000, maxStock: 8000, unit: 'tablets', lastRestocked: '2024-01-14', expiryDate: '2025-03-31', supplier: 'CCM Duopharma', pricePerUnit: 0.08 },
  { id: '9', name: 'Disposable Syringe 5ml', nameMY: 'Picagari Pakai Buang 5ml', category: 'consumable', sku: 'CON-004', currentStock: 2000, minStock: 1500, maxStock: 5000, unit: 'pieces', lastRestocked: '2024-01-11', supplier: 'Terumo Corporation', pricePerUnit: 0.50 },
  { id: '10', name: 'Hand Sanitizer 500ml', nameMY: 'Pensanitasi Tangan 500ml', category: 'ppe', sku: 'PPE-002', currentStock: 50, minStock: 100, maxStock: 500, unit: 'bottles', lastRestocked: '2023-12-28', supplier: 'Dettol Malaysia', pricePerUnit: 15.00 },
]

const categoryConfig = {
  medicine: { label: 'Medicine', labelMY: 'Ubat', icon: Pill, color: 'bg-blue-100 text-blue-700' },
  equipment: { label: 'Equipment', labelMY: 'Peralatan', icon: Stethoscope, color: 'bg-purple-100 text-purple-700' },
  consumable: { label: 'Consumable', labelMY: 'Bekalan', icon: Syringe, color: 'bg-green-100 text-green-700' },
  ppe: { label: 'PPE', labelMY: 'PPE', icon: Thermometer, color: 'bg-orange-100 text-orange-700' },
}

export default function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock <= item.minStock * 0.5) return 'critical'
    if (item.currentStock <= item.minStock) return 'low'
    if (item.currentStock >= item.maxStock * 0.9) return 'overstocked'
    return 'normal'
  }

  const filteredInventory = mockInventory.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = filterCategory === 'all' || item.category === filterCategory
    const matchStatus = filterStatus === 'all' || getStockStatus(item) === filterStatus
    return matchSearch && matchCategory && matchStatus
  })

  const stats = {
    total: mockInventory.length,
    lowStock: mockInventory.filter(i => getStockStatus(i) === 'low' || getStockStatus(i) === 'critical').length,
    critical: mockInventory.filter(i => getStockStatus(i) === 'critical').length,
    totalValue: mockInventory.reduce((acc, i) => acc + (i.currentStock * i.pricePerUnit), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Pengurusan Inventori Hospital</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" />
            Add Item / Tambah Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                <p className="text-xs text-blue-600">Jumlah Item</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{stats.lowStock}</p>
                <p className="text-xs text-yellow-600">Stok Rendah</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
                <p className="text-xs text-red-600">Kritikal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">RM {stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-green-600">Nilai Inventori</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {stats.lowStock > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Amaran Stok Rendah / Low Stock Warning</h3>
                <p className="text-sm text-yellow-700">{stats.lowStock} item(s) below minimum stock level. Please reorder soon.</p>
              </div>
              <Button variant="outline" className="ml-auto border-yellow-400 text-yellow-700 hover:bg-yellow-100">
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
                title="Filter by Category"
              >
                <option value="all">All Categories / Semua Kategori</option>
                <option value="medicine">Ubat / Medicine</option>
                <option value="equipment">Peralatan / Equipment</option>
                <option value="consumable">Bekalan / Consumable</option>
                <option value="ppe">PPE</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
                title="Filter by Status"
              >
                <option value="all">All Status / Semua Status</option>
                <option value="normal">Normal</option>
                <option value="low">Stok Rendah</option>
                <option value="critical">Kritikal</option>
                <option value="overstocked">Berlebihan</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item, index) => {
          const status = getStockStatus(item)
          const categoryInfo = categoryConfig[item.category]
          const CategoryIcon = categoryInfo.icon
          const stockPercentage = Math.min((item.currentStock / item.maxStock) * 100, 100)
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`hover:shadow-lg transition-shadow ${
                status === 'critical' ? 'border-red-300 bg-red-50/50' :
                status === 'low' ? 'border-yellow-300 bg-yellow-50/50' : ''
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                        <p className="text-xs text-gray-500">{item.nameMY}</p>
                      </div>
                    </div>
                    <Badge className={
                      status === 'critical' ? 'bg-red-100 text-red-700' :
                      status === 'low' ? 'bg-yellow-100 text-yellow-700' :
                      status === 'overstocked' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }>
                      {status === 'critical' ? 'KRITIKAL' :
                       status === 'low' ? 'RENDAH' :
                       status === 'overstocked' ? 'BERLEBIHAN' : 'OK'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">SKU: {item.sku}</span>
                      <span className="font-medium">RM {item.pricePerUnit.toFixed(2)}/{item.unit}</span>
                    </div>
                    
                    {/* Stock Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Current: {item.currentStock.toLocaleString()} {item.unit}</span>
                        <span className="text-gray-400">Max: {item.maxStock.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            status === 'critical' ? 'bg-red-500' :
                            status === 'low' ? 'bg-yellow-500' :
                            status === 'overstocked' ? 'bg-purple-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1 text-gray-400">
                        <span>Min: {item.minStock.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Restocked: {item.lastRestocked}
                      </div>
                      {item.expiryDate && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="w-3 h-3" />
                          Exp: {item.expiryDate}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Restock
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
