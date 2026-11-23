import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Pill,
  Syringe,
  Thermometer,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Clock,
  RefreshCw,
  FileText,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { downloadCsvFile } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

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

const initialInventory: InventoryItem[] = [
  { id: '1', name: 'Paracetamol 500mg', nameMY: 'Parasetamol 500mg', category: 'medicine', sku: 'MED-001', currentStock: 5000, minStock: 1000, maxStock: 10000, unit: 'tablets', lastRestocked: '2025-01-15', expiryDate: '2027-06-30', supplier: 'Pharmaniaga Berhad', pricePerUnit: 0.05 },
  { id: '2', name: 'Amoxicillin 250mg', nameMY: 'Amoksisilin 250mg', category: 'medicine', sku: 'MED-002', currentStock: 800, minStock: 500, maxStock: 3000, unit: 'capsules', lastRestocked: '2025-01-10', expiryDate: '2026-12-31', supplier: 'Duopharma Biotech', pricePerUnit: 0.15 },
  { id: '3', name: 'Surgical Gloves (M)', nameMY: 'Sarung Tangan Pembedahan (M)', category: 'consumable', sku: 'CON-001', currentStock: 200, minStock: 500, maxStock: 2000, unit: 'boxes', lastRestocked: '2025-01-05', supplier: 'Top Glove Corporation', pricePerUnit: 25.0 },
  { id: '4', name: 'N95 Respirator Mask', nameMY: 'Topeng N95', category: 'ppe', sku: 'PPE-001', currentStock: 1500, minStock: 1000, maxStock: 5000, unit: 'pieces', lastRestocked: '2025-01-12', supplier: 'Hartalega Holdings', pricePerUnit: 3.5 },
  { id: '5', name: 'IV Drip Set', nameMY: 'Set Titisan IV', category: 'consumable', sku: 'CON-002', currentStock: 350, minStock: 200, maxStock: 1000, unit: 'sets', lastRestocked: '2025-01-08', supplier: 'B. Braun Medical', pricePerUnit: 8.0 },
  { id: '6', name: 'Insulin Syringe', nameMY: 'Picagari Insulin', category: 'consumable', sku: 'CON-003', currentStock: 100, minStock: 300, maxStock: 1500, unit: 'boxes', lastRestocked: '2024-12-20', supplier: 'BD Medical', pricePerUnit: 45.0 },
  { id: '7', name: 'Digital BP Monitor', nameMY: 'Monitor Tekanan Darah', category: 'equipment', sku: 'EQP-001', currentStock: 15, minStock: 10, maxStock: 30, unit: 'units', lastRestocked: '2025-01-01', supplier: 'Omron Healthcare', pricePerUnit: 350.0 },
  { id: '8', name: 'Metformin 500mg', nameMY: 'Metformin 500mg', category: 'medicine', sku: 'MED-003', currentStock: 3500, minStock: 2000, maxStock: 8000, unit: 'tablets', lastRestocked: '2025-01-14', expiryDate: '2027-03-31', supplier: 'CCM Duopharma', pricePerUnit: 0.08 },
]

const categoryConfig = {
  medicine: { icon: Pill, color: 'bg-blue-100 text-blue-700' },
  equipment: { icon: Stethoscope, color: 'bg-purple-100 text-purple-700' },
  consumable: { icon: Syringe, color: 'bg-green-100 text-green-700' },
  ppe: { icon: Thermometer, color: 'bg-orange-100 text-orange-700' },
}

function getStockStatus(item: InventoryItem) {
  if (item.currentStock <= item.minStock * 0.5) return 'critical'
  if (item.currentStock <= item.minStock) return 'low'
  if (item.currentStock >= item.maxStock * 0.9) return 'overstocked'
  return 'normal'
}

export default function InventoryManagement() {
  const { toast } = useToast()
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'medicine' as InventoryItem['category'],
    currentStock: '500',
    minStock: '100',
    maxStock: '2000',
    unit: 'units',
    supplier: 'Pharmaniaga Berhad',
    pricePerUnit: '1.00',
  })

  const filteredInventory = inventory.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = filterCategory === 'all' || item.category === filterCategory
    const status = getStockStatus(item)
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'low_or_critical'
        ? status === 'low' || status === 'critical'
        : status === filterStatus)
    return matchSearch && matchCategory && matchStatus
  })

  let lowStock = 0
  let critical = 0
  let totalValue = 0
  for (const item of inventory) {
    const status = getStockStatus(item)
    if (status === 'critical') {
      critical++
      lowStock++
    } else if (status === 'low') {
      lowStock++
    }
    totalValue += item.currentStock * item.pricePerUnit
  }

  const handleRestock = (item: InventoryItem) => {
    const addQty = Math.max(item.minStock, Math.round((item.maxStock - item.currentStock) / 2))
    const today = new Date().toISOString().split('T')[0]
    setInventory((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, currentStock: Math.min(i.maxStock, i.currentStock + addQty), lastRestocked: today }
          : i
      )
    )
    toast({
      title: 'Stock Replenished',
      description: `Restocked +${addQty} ${item.unit} of ${item.name}.`,
    })
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.name.trim() || !newItem.sku.trim()) return
    const created: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newItem.name.trim(),
      nameMY: newItem.name.trim(),
      category: newItem.category,
      sku: newItem.sku.trim().toUpperCase(),
      currentStock: Number(newItem.currentStock) || 100,
      minStock: Number(newItem.minStock) || 50,
      maxStock: Number(newItem.maxStock) || 1000,
      unit: newItem.unit.trim() || 'units',
      lastRestocked: new Date().toISOString().split('T')[0],
      supplier: newItem.supplier.trim(),
      pricePerUnit: parseFloat(newItem.pricePerUnit) || 1,
    }
    setInventory((prev) => [created, ...prev])
    setShowAddModal(false)
    toast({ title: 'Inventory Item Added', description: `${created.name} (${created.sku}) created.` })
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `hospital-inventory-${new Date().toISOString().split('T')[0]}.csv`,
      ['SKU', 'Name', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit', 'Unit Price (RM)', 'Supplier', 'Status'],
      filteredInventory.map((i) => [
        i.sku,
        i.name,
        i.category,
        i.currentStock,
        i.minStock,
        i.maxStock,
        i.unit,
        i.pricePerUnit.toFixed(2),
        i.supplier,
        getStockStatus(i),
      ])
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 text-sm">Pharmacy formulary, medical consumables & equipment stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <FileText className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 flex items-center gap-3"><Package className="w-6 h-6 text-blue-600" /><div><p className="text-2xl font-bold text-blue-700">{inventory.length}</p><p className="text-xs text-blue-600">Total SKUs</p></div></CardContent></Card>
        <Card className="bg-yellow-50 border-yellow-200"><CardContent className="p-4 flex items-center gap-3"><TrendingDown className="w-6 h-6 text-yellow-600" /><div><p className="text-2xl font-bold text-yellow-700">{lowStock}</p><p className="text-xs text-yellow-600">Below Min Stock</p></div></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="w-6 h-6 text-red-600" /><div><p className="text-2xl font-bold text-red-700">{critical}</p><p className="text-xs text-red-600">Critical Shortage</p></div></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="w-6 h-6 text-green-600" /><div><p className="text-2xl font-bold text-green-700">RM {Math.round(totalValue).toLocaleString()}</p><p className="text-xs text-green-600">Total Valuation</p></div></CardContent></Card>
      </div>

      {lowStock > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 text-sm">Low Stock Reorder Alert</h3>
                <p className="text-xs text-yellow-800">{lowStock} SKU(s) are currently below minimum par level.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterStatus(filterStatus === 'low_or_critical' ? 'all' : 'low_or_critical')}
              className="border-yellow-400 text-yellow-800"
            >
              {filterStatus === 'low_or_critical' ? 'Show All Items' : 'Filter Low Stock'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by item name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              title="Filter by Category"
            >
              <option value="all">All Categories</option>
              <option value="medicine">Medicine</option>
              <option value="equipment">Equipment</option>
              <option value="consumable">Consumable</option>
              <option value="ppe">PPE</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              title="Filter by Status"
            >
              <option value="all">All Status</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
              <option value="critical">Critical</option>
              <option value="low_or_critical">All Low & Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item) => {
          const status = getStockStatus(item)
          const categoryInfo = categoryConfig[item.category]
          const CategoryIcon = categoryInfo.icon
          const stockPercentage = Math.min((item.currentStock / item.maxStock) * 100, 100)

          return (
            <Card
              key={item.id}
              className={`hover:shadow-md transition-shadow ${
                status === 'critical'
                  ? 'border-red-300 bg-red-50/40'
                  : status === 'low'
                    ? 'border-yellow-300 bg-yellow-50/40'
                    : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">{item.name}</CardTitle>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      status === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : status === 'low'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-700'
                    }
                  >
                    {status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Supplier: {item.supplier}</span>
                  <span className="font-semibold">RM {item.pricePerUnit.toFixed(2)}/{item.unit}</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Stock: <strong>{item.currentStock.toLocaleString()}</strong> {item.unit}</span>
                    <span className="text-gray-400">Max: {item.maxStock.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === 'critical' ? 'bg-red-500' : status === 'low' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${stockPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.lastRestocked}</span>
                  {item.expiryDate && <span className="text-orange-700">Exp: {item.expiryDate}</span>}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => handleRestock(item)} className="flex-1 text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" /> Restock
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedItem(item)} className="flex-1 text-xs">
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Item Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedItem.name}</h3>
                  <p className="text-xs font-mono text-gray-500">{selectedItem.sku}</p>
                </div>
                <button type="button" onClick={() => setSelectedItem(null)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-700 bg-slate-50 p-4 rounded-xl">
                <p><strong>Category:</strong> <span className="capitalize">{selectedItem.category}</span></p>
                <p><strong>Supplier:</strong> {selectedItem.supplier}</p>
                <p><strong>Current Stock:</strong> {selectedItem.currentStock.toLocaleString()} {selectedItem.unit}</p>
                <p><strong>Par Thresholds:</strong> Min {selectedItem.minStock} / Max {selectedItem.maxStock}</p>
                <p><strong>Total Value:</strong> RM {(selectedItem.currentStock * selectedItem.pricePerUnit).toFixed(2)}</p>
                {selectedItem.expiryDate && <p><strong>Batch Expiry:</strong> {selectedItem.expiryDate}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedItem(null)}>Close</Button>
                <Button
                  onClick={() => {
                    handleRestock(selectedItem)
                    setSelectedItem(null)
                  }}
                  className="bg-blue-600 text-white"
                >
                  Trigger Restock Order
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Item Modal */}
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
              onSubmit={handleAddItem}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Add Inventory SKU</h3>
                <button type="button" onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-3">
                <Input required placeholder="Item Name *" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input required placeholder="SKU (e.g. MED-010) *" value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
                  <select
                    className="h-10 px-3 border rounded-md text-sm bg-white"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as InventoryItem['category'] })}
                  >
                    <option value="medicine">Medicine</option>
                    <option value="consumable">Consumable</option>
                    <option value="equipment">Equipment</option>
                    <option value="ppe">PPE</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" placeholder="Current" value={newItem.currentStock} onChange={(e) => setNewItem({ ...newItem, currentStock: e.target.value })} />
                  <Input type="number" placeholder="Min" value={newItem.minStock} onChange={(e) => setNewItem({ ...newItem, minStock: e.target.value })} />
                  <Input type="number" placeholder="Max" value={newItem.maxStock} onChange={(e) => setNewItem({ ...newItem, maxStock: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Supplier" value={newItem.supplier} onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="Unit Price (RM)" value={newItem.pricePerUnit} onChange={(e) => setNewItem({ ...newItem, pricePerUnit: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 text-white">Create SKU</Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
