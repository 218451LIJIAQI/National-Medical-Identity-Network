import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useSessionState, exportToCsv } from '@/lib/workstation-storage'
import { useToast } from '@/components/ui/use-toast'
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Pill,
  Syringe,
  ShieldAlert,
  Download,
  RefreshCw,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface InventoryItem {
  id: string
  name: string
  category: 'medication' | 'consumable' | 'equipment' | 'ppe'
  sku: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  expiryDate?: string
  location: string
  lastRestocked: string
}

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 'INV001', name: 'Paracetamol 500mg Tablet', category: 'medication', sku: 'MED-001', currentStock: 15000, minStock: 5000, maxStock: 30000, unit: 'tablets', expiryDate: '2026-06-30', location: 'Pharmacy Store A', lastRestocked: '2025-01-05' },
  { id: 'INV002', name: 'Amoxicillin 500mg Capsule', category: 'medication', sku: 'MED-002', currentStock: 2800, minStock: 3000, maxStock: 15000, unit: 'capsules', expiryDate: '2025-12-31', location: 'Pharmacy Store A', lastRestocked: '2024-12-20' },
  { id: 'INV003', name: 'Metformin 500mg Tablet', category: 'medication', sku: 'MED-003', currentStock: 8500, minStock: 4000, maxStock: 20000, unit: 'tablets', expiryDate: '2026-03-15', location: 'Pharmacy Store B', lastRestocked: '2025-01-02' },
  { id: 'INV004', name: 'Surgical Gloves (Size M)', category: 'ppe', sku: 'PPE-001', currentStock: 450, minStock: 1000, maxStock: 5000, unit: 'boxes', location: 'Central Store', lastRestocked: '2024-12-15' },
  { id: 'INV005', name: 'N95 Respirator Mask', category: 'ppe', sku: 'PPE-002', currentStock: 1200, minStock: 500, maxStock: 3000, unit: 'pieces', location: 'Central Store', lastRestocked: '2025-01-03' },
  { id: 'INV006', name: 'Disposable Syringe 5ml', category: 'consumable', sku: 'CON-001', currentStock: 8000, minStock: 3000, maxStock: 15000, unit: 'pieces', location: 'Ward Supply', lastRestocked: '2025-01-04' },
  { id: 'INV007', name: 'IV Cannula 20G', category: 'consumable', sku: 'CON-002', currentStock: 350, minStock: 500, maxStock: 2500, unit: 'pieces', location: 'ED Store', lastRestocked: '2024-12-18' },
  { id: 'INV008', name: 'Insulin Glargine 100U/ml', category: 'medication', sku: 'MED-004', currentStock: 120, minStock: 200, maxStock: 600, unit: 'vials', expiryDate: '2025-08-31', location: 'Cold Storage', lastRestocked: '2024-12-28' },
]

function computeStatus(item: InventoryItem): 'adequate' | 'low' | 'critical' {
  if (item.currentStock <= item.minStock * 0.65) return 'critical'
  if (item.currentStock <= item.minStock) return 'low'
  return 'adequate'
}

const categoryConfig = {
  medication: { label: 'Medication', color: 'bg-blue-100 text-blue-700', icon: Pill },
  consumable: { label: 'Consumable', color: 'bg-purple-100 text-purple-700', icon: Syringe },
  equipment: { label: 'Equipment', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  ppe: { label: 'PPE', color: 'bg-emerald-100 text-emerald-700', icon: ShieldAlert },
}

const statusConfig = {
  adequate: { label: 'Adequate', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  low: { label: 'Low Stock', color: 'bg-amber-100 text-amber-700', icon: TrendingDown },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
}

export default function InventoryManagement() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)
  const hospitalKey = user?.hospitalId || 'hospital-kl'

  const [inventory, setInventory] = useSessionState<InventoryItem[]>(
    `admin-inventory:${hospitalKey}`,
    DEFAULT_INVENTORY
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null)
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null)
  const [restockQty, setRestockQty] = useState('500')

  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<InventoryItem['category']>('medication')
  const [newSku, setNewSku] = useState('')
  const [newStock, setNewStock] = useState('1000')
  const [newMin, setNewMin] = useState('300')
  const [newMax, setNewMax] = useState('3000')
  const [newUnit, setNewUnit] = useState('tablets')
  const [newLocation, setNewLocation] = useState('Pharmacy Store A')
  const [newExpiry, setNewExpiry] = useState('')

  const itemsWithStatus = inventory.map((item) => ({
    ...item,
    status: computeStatus(item),
  }))

  const filteredInventory = itemsWithStatus.filter((item) => {
    const q = searchTerm.trim().toLowerCase()
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)
    const matchCategory = filterCategory === 'all' || item.category === filterCategory
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'alerts' ? item.status === 'low' || item.status === 'critical' : item.status === filterStatus)
    return matchSearch && matchCategory && matchStatus
  })

  const stats = {
    total: itemsWithStatus.length,
    adequate: itemsWithStatus.filter((i) => i.status === 'adequate').length,
    low: itemsWithStatus.filter((i) => i.status === 'low').length,
    critical: itemsWithStatus.filter((i) => i.status === 'critical').length,
  }

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockItem) return
    const qty = Math.max(1, Number.parseInt(restockQty, 10) || 0)
    const today = new Date().toISOString().slice(0, 10)
    setInventory((prev) =>
      prev.map((item) =>
        item.id === restockItem.id
          ? { ...item, currentStock: item.currentStock + qty, lastRestocked: today }
          : item
      )
    )
    toast({
      title: 'Inventory Restocked',
      description: `Added +${qty.toLocaleString()} ${restockItem.unit} to ${restockItem.name}.`,
    })
    setRestockItem(null)
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newSku.trim()) return
    const created: InventoryItem = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      category: newCategory,
      sku: newSku.trim().toUpperCase(),
      currentStock: Math.max(0, Number.parseInt(newStock, 10) || 0),
      minStock: Math.max(1, Number.parseInt(newMin, 10) || 100),
      maxStock: Math.max(10, Number.parseInt(newMax, 10) || 1000),
      unit: newUnit.trim() || 'units',
      location: newLocation.trim() || 'Central Store',
      expiryDate: newExpiry || undefined,
      lastRestocked: new Date().toISOString().slice(0, 10),
    }
    setInventory((prev) => [created, ...prev])
    setAddModalOpen(false)
    setNewName('')
    setNewSku('')
    toast({ title: 'Inventory Item Added', description: `${created.name} (${created.sku}) registered.` })
  }

  const handleExportReport = () => {
    exportToCsv(
      `${theme.shortName.toLowerCase()}-inventory-report.csv`,
      ['SKU', 'Item Name', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit', 'Status', 'Location', 'Expiry Date', 'Last Restocked'],
      filteredInventory.map((i) => [
        i.sku,
        i.name,
        categoryConfig[i.category].label,
        i.currentStock,
        i.minStock,
        i.maxStock,
        i.unit,
        statusConfig[i.status].label,
        i.location,
        i.expiryDate || '-',
        i.lastRestocked,
      ])
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: theme.primaryColor }}>
              <Package className="h-6 w-6" />
            </div>
            Medical Inventory
          </h1>
          <p className="text-gray-500 mt-1">{theme.name} — Stock levels, restocking & expiry tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV Report
          </Button>
          <Button onClick={() => setAddModalOpen(true)} className="gap-2" style={{ backgroundColor: theme.primaryColor }}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: stats.total, icon: Package, bgClass: 'bg-blue-100', iconClass: 'text-blue-600', isAlert: false },
          { label: 'Adequate Stock', value: stats.adequate, icon: CheckCircle2, bgClass: 'bg-emerald-100', iconClass: 'text-emerald-600', isAlert: false },
          { label: 'Low Stock', value: stats.low, icon: TrendingDown, bgClass: 'bg-amber-100', iconClass: 'text-amber-600', isAlert: false },
          { label: 'Critical Alert', value: stats.critical, icon: AlertTriangle, bgClass: 'bg-red-100', iconClass: 'text-red-600', isAlert: stats.critical > 0 },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={stat.isAlert ? 'border-red-200 bg-red-50/30' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgClass}`}>
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

      {(stats.critical > 0 || stats.low > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Stock Replenishment Attention</p>
                <p className="text-sm text-red-700">
                  {stats.critical} critical and {stats.low} low-stock items require replenishment.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setFilterStatus(filterStatus === 'alerts' ? 'all' : 'alerts')}
            >
              {filterStatus === 'alerts' ? 'Show All Items' : 'View Low & Critical'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by item name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'medication', 'consumable', 'ppe', 'equipment'].map((cat) => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory(cat)}
                  className="capitalize"
                >
                  {cat === 'all' ? 'All Categories' : cat === 'ppe' ? 'PPE' : cat}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {['all', 'adequate', 'low', 'critical'].map((st) => (
                <Button
                  key={st}
                  variant={filterStatus === st ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus(st)}
                  className="capitalize text-xs"
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({filteredInventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredInventory.map((item, index) => {
              const catInfo = categoryConfig[item.category]
              const statInfo = statusConfig[item.status]
              const stockPercent = Math.min(100, Math.round((item.currentStock / Math.max(1, item.maxStock)) * 100))

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.25) }}
                  className={`p-4 rounded-xl border transition-all ${
                    item.status === 'critical'
                      ? 'border-red-200 bg-red-50/30'
                      : item.status === 'low'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${catInfo.color.split(' ')[0]}`}>
                        <catInfo.icon className={`h-5 w-5 ${catInfo.color.split(' ')[1]}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.sku}
                          </Badge>
                          <Badge className={statInfo.color}>
                            <statInfo.icon className="h-3 w-3 mr-1" />
                            {statInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Location: {item.location}
                          {item.expiryDate && ` • Exp: ${item.expiryDate}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="w-40">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-bold text-gray-900">{item.currentStock.toLocaleString()}</span>
                          <span className="text-gray-400">/ {item.maxStock.toLocaleString()} {item.unit}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.status === 'critical'
                                ? 'bg-red-500'
                                : item.status === 'low'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={item.status === 'adequate' ? 'outline' : 'default'}
                          onClick={() => {
                            setRestockItem(item)
                            setRestockQty(String(Math.max(100, item.maxStock - item.currentStock)))
                          }}
                          className="gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Restock
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDetailItem(item)}>
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {restockItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRestockItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Restock Inventory</h2>
              <button onClick={() => setRestockItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <p className="text-sm text-gray-600">
                <strong>{restockItem.name}</strong> ({restockItem.sku}) — Current stock:{' '}
                <strong>{restockItem.currentStock.toLocaleString()} {restockItem.unit}</strong>
              </p>
              <div>
                <Label>Quantity to Add ({restockItem.unit})</Label>
                <Input type="number" min={1} value={restockQty} onChange={(e) => setRestockQty(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setRestockItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: theme.primaryColor }}>
                  Confirm Restock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">{detailItem.name}</h2>
              <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">SKU Code</span>
                <span className="font-mono font-semibold">{detailItem.sku}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Category</span>
                <span className="font-semibold capitalize">{detailItem.category}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Current / Min / Max</span>
                <span className="font-semibold">
                  {detailItem.currentStock} / {detailItem.minStock} / {detailItem.maxStock}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Storage Location</span>
                <span className="font-semibold">{detailItem.location}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Last Restocked</span>
                <span className="font-semibold">{detailItem.lastRestocked}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Expiry Date</span>
                <span className="font-semibold">{detailItem.expiryDate || 'N/A'}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setDetailItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {addModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAddModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Inventory Item</h2>
              <button onClick={() => setAddModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Item Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="e.g. Omeprazole 20mg" />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} required placeholder="MED-010" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Category</Label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as InventoryItem['category'])}
                    className="w-full h-10 px-2 border rounded-md text-sm bg-white"
                  >
                    <option value="medication">Medication</option>
                    <option value="consumable">Consumable</option>
                    <option value="ppe">PPE</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} required />
                </div>
                <div>
                  <Label>Expiry (Optional)</Label>
                  <Input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Initial Stock</Label>
                  <Input type="number" min={0} value={newStock} onChange={(e) => setNewStock(e.target.value)} required />
                </div>
                <div>
                  <Label>Min Threshold</Label>
                  <Input type="number" min={1} value={newMin} onChange={(e) => setNewMin(e.target.value)} required />
                </div>
                <div>
                  <Label>Max Capacity</Label>
                  <Input type="number" min={1} value={newMax} onChange={(e) => setNewMax(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Storage Location</Label>
                <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: theme.primaryColor }}>
                  Save Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
