import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModalDialog, StatusBadge, type StatusTone } from '@/components/ui/modal-dialog'
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Pill,
  Syringe,
  Thermometer,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Clock,
  RefreshCw,
  FileText,
} from 'lucide-react'
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
  medicine: { icon: Pill, color: 'bg-blue-100 text-blue-800' },
  equipment: { icon: Stethoscope, color: 'bg-purple-100 text-purple-800' },
  consumable: { icon: Syringe, color: 'bg-emerald-100 text-emerald-800' },
  ppe: { icon: Thermometer, color: 'bg-orange-100 text-orange-800' },
}

type StockStatus = 'critical' | 'low' | 'overstocked' | 'normal'

function getStockStatus(item: InventoryItem): StockStatus {
  if (item.currentStock <= item.minStock * 0.5) return 'critical'
  if (item.currentStock <= item.minStock) return 'low'
  if (item.currentStock >= item.maxStock * 0.9) return 'overstocked'
  return 'normal'
}

const STOCK_STATUS_BADGE: Record<
  StockStatus,
  { tone: StatusTone; label: string; icon: typeof CheckCircle2 }
> = {
  critical: { tone: 'critical', label: 'Critical', icon: AlertTriangle },
  low: { tone: 'warning', label: 'Low Stock', icon: AlertCircle },
  overstocked: { tone: 'info', label: 'Overstocked', icon: Info },
  normal: { tone: 'success', label: 'Optimal', icon: CheckCircle2 },
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
          ? {
              ...i,
              currentStock: Math.min(i.maxStock, i.currentStock + addQty),
              lastRestocked: today,
            }
          : i
      )
    )
    toast({
      title: 'Stock Replenished',
      description: `Restocked +${addQty} ${item.unit} of ${item.name}.`,
      variant: 'success',
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
      currentStock: Math.max(0, Number(newItem.currentStock) || 100),
      minStock: Math.max(1, Number(newItem.minStock) || 50),
      maxStock: Math.max(10, Number(newItem.maxStock) || 1000),
      unit: newItem.unit.trim() || 'units',
      lastRestocked: new Date().toISOString().split('T')[0],
      supplier: newItem.supplier.trim(),
      pricePerUnit: Math.max(0.01, parseFloat(newItem.pricePerUnit) || 1),
    }
    setInventory((prev) => [created, ...prev])
    setShowAddModal(false)
    toast({
      title: 'Inventory Item Added',
      description: `${created.name} (${created.sku}) created.`,
      variant: 'success',
    })
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `hospital-inventory-${new Date().toISOString().split('T')[0]}.csv`,
      [
        'SKU',
        'Name',
        'Category',
        'Current Stock',
        'Min Stock',
        'Max Stock',
        'Unit',
        'Unit Price (RM)',
        'Supplier',
        'Status',
      ],
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
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-600 text-sm">
            Pharmacy formulary, medical consumables & equipment stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <FileText className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 tabular-nums">
        <Card className="bg-blue-50/80 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-700" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{inventory.length}</p>
              <p className="text-xs font-medium text-blue-700">Total SKUs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/80 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-amber-700" />
            <div>
              <p className="text-2xl font-bold text-amber-900">{lowStock}</p>
              <p className="text-xs font-medium text-amber-800">Below Min Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/80 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-700" />
            <div>
              <p className="text-2xl font-bold text-red-900">{critical}</p>
              <p className="text-xs font-medium text-red-700">Critical Shortage</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/80 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-emerald-700" />
            <div>
              <p className="text-2xl font-bold text-emerald-900">
                RM {Math.round(totalValue).toLocaleString()}
              </p>
              <p className="text-xs font-medium text-emerald-700">Total Valuation</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {lowStock > 0 && (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-950 text-sm">Low Stock Reorder Alert</h3>
                <p className="text-xs text-amber-900 tabular-nums">
                  {lowStock} SKU(s) are currently below minimum par level.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilterStatus(filterStatus === 'low_or_critical' ? 'all' : 'low_or_critical')
              }
              className="border-amber-400 text-amber-950 bg-white hover:bg-amber-100"
            >
              {filterStatus === 'low_or_critical' ? 'Show All Items' : 'Filter Low Stock'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
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
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              title="Filter by Status"
            >
              <option value="all">All Status</option>
              <option value="normal">Optimal</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
              <option value="low_or_critical">All Low & Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 tabular-nums">
        {filteredInventory.map((item) => {
          const status = getStockStatus(item)
          const badgeMeta = STOCK_STATUS_BADGE[status]
          const categoryInfo = categoryConfig[item.category]
          const CategoryIcon = categoryInfo.icon
          const stockPercentage = Math.min((item.currentStock / item.maxStock) * 100, 100)

          return (
            <Card
              key={item.id}
              className={`border-slate-200 hover:shadow-md transition-shadow ${
                status === 'critical'
                  ? 'border-red-300 bg-red-50/40'
                  : status === 'low'
                    ? 'border-amber-300 bg-amber-50/40'
                    : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${categoryInfo.color}`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-bold text-slate-900 truncate">
                        {item.name}
                      </CardTitle>
                      <p className="text-xs font-mono text-slate-500">{item.sku}</p>
                    </div>
                  </div>
                  <StatusBadge
                    tone={badgeMeta.tone}
                    icon={badgeMeta.icon}
                    label={badgeMeta.label}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="truncate mr-2">Supplier: {item.supplier}</span>
                  <span className="font-semibold shrink-0">
                    RM {item.pricePerUnit.toFixed(2)}/{item.unit}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>
                      Stock: <strong className="text-slate-900">{item.currentStock.toLocaleString()}</strong>{' '}
                      {item.unit}
                    </span>
                    <span className="text-slate-500">Max: {item.maxStock.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        status === 'critical'
                          ? 'bg-red-600'
                          : status === 'low'
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                      }`}
                      style={{ width: `${stockPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.lastRestocked}
                  </span>
                  {item.expiryDate && (
                    <span className="text-amber-800 font-medium">Exp: {item.expiryDate}</span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestock(item)}
                    className="flex-1 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Restock
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedItem(item)}
                    className="flex-1 text-xs"
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ModalDialog
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || 'SKU Details'}
        description={selectedItem ? `SKU: ${selectedItem.sku}` : undefined}
        maxWidthClassName="max-w-md"
        footer={
          selectedItem ? (
            <>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  handleRestock(selectedItem)
                  setSelectedItem(null)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Trigger Restock Order
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedItem && (
          <div className="space-y-2.5 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 tabular-nums">
            <p>
              <strong>Category:</strong> <span className="capitalize">{selectedItem.category}</span>
            </p>
            <p>
              <strong>Supplier:</strong> {selectedItem.supplier}
            </p>
            <p>
              <strong>Current Stock:</strong> {selectedItem.currentStock.toLocaleString()}{' '}
              {selectedItem.unit}
            </p>
            <p>
              <strong>Par Thresholds:</strong> Min {selectedItem.minStock} / Max{' '}
              {selectedItem.maxStock}
            </p>
            <p>
              <strong>Total Value:</strong> RM{' '}
              {(selectedItem.currentStock * selectedItem.pricePerUnit).toFixed(2)}
            </p>
            {selectedItem.expiryDate && (
              <p>
                <strong>Batch Expiry:</strong> {selectedItem.expiryDate}
              </p>
            )}
          </div>
        )}
      </ModalDialog>

      <ModalDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory SKU"
        description="Register a new pharmacy formulary item, consumable, or equipment SKU."
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="space-y-3 tabular-nums">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name *</label>
              <Input
                required
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SKU *</label>
                <Input
                  required
                  placeholder="MED-010"
                  className="font-mono"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      category: e.target.value as InventoryItem['category'],
                    })
                  }
                >
                  <option value="medicine">Medicine</option>
                  <option value="consumable">Consumable</option>
                  <option value="equipment">Equipment</option>
                  <option value="ppe">PPE</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current</label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.currentStock}
                  onChange={(e) => setNewItem({ ...newItem, currentStock: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min</label>
                <Input
                  type="number"
                  min={1}
                  value={newItem.minStock}
                  onChange={(e) => setNewItem({ ...newItem, minStock: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max</label>
                <Input
                  type="number"
                  min={1}
                  value={newItem.maxStock}
                  onChange={(e) => setNewItem({ ...newItem, maxStock: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
                <Input
                  placeholder="Supplier"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Price (RM)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newItem.pricePerUnit}
                  onChange={(e) => setNewItem({ ...newItem, pricePerUnit: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Create SKU
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
