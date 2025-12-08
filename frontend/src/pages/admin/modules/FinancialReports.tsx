import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, TrendingDown,
  FileText, Download, Calendar, Building2, Users,
  CreditCard, Wallet, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { motion } from 'framer-motion'

interface RevenueData {
  category: string
  categoryMY: string
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

interface ExpenseData {
  category: string
  categoryMY: string
  amount: number
  percentage: number
}

const revenueData: RevenueData[] = [
  { category: 'Outpatient Services', categoryMY: 'Perkhidmatan Pesakit Luar', amount: 450000, percentage: 35, trend: 'up' },
  { category: 'Inpatient Services', categoryMY: 'Perkhidmatan Pesakit Dalam', amount: 380000, percentage: 30, trend: 'up' },
  { category: 'Laboratory & Diagnostics', categoryMY: 'Makmal & Diagnostik', amount: 180000, percentage: 14, trend: 'stable' },
  { category: 'Pharmacy Sales', categoryMY: 'Jualan Farmasi', amount: 150000, percentage: 12, trend: 'up' },
  { category: 'Government Subsidy (KKM)', categoryMY: 'Subsidi Kerajaan (KKM)', amount: 120000, percentage: 9, trend: 'stable' },
]

const expenseData: ExpenseData[] = [
  { category: 'Staff Salaries', categoryMY: 'Gaji Kakitangan', amount: 520000, percentage: 45 },
  { category: 'Medical Supplies', categoryMY: 'Bekalan Perubatan', amount: 230000, percentage: 20 },
  { category: 'Equipment Maintenance', categoryMY: 'Penyelenggaraan Peralatan', amount: 115000, percentage: 10 },
  { category: 'Utilities', categoryMY: 'Utiliti', amount: 92000, percentage: 8 },
  { category: 'Administrative', categoryMY: 'Pentadbiran', amount: 69000, percentage: 6 },
  { category: 'Training & Development', categoryMY: 'Latihan & Pembangunan', amount: 46000, percentage: 4 },
  { category: 'Others', categoryMY: 'Lain-lain', amount: 80500, percentage: 7 },
]

const subsidyPrograms = [
  { name: 'MySalam', amount: 45000, beneficiaries: 320, color: 'bg-blue-500' },
  { name: 'PeKa B40', amount: 38000, beneficiaries: 180, color: 'bg-green-500' },
  { name: 'SOCSO/PERKESO', amount: 25000, beneficiaries: 95, color: 'bg-purple-500' },
  { name: 'Bantuan Sara Hidup', amount: 12000, beneficiaries: 45, color: 'bg-orange-500' },
]

export default function FinancialReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  const totalRevenue = revenueData.reduce((acc, r) => acc + r.amount, 0)
  const totalExpense = expenseData.reduce((acc, e) => acc + e.amount, 0)
  const netIncome = totalRevenue - totalExpense
  const profitMargin = ((netIncome / totalRevenue) * 100).toFixed(1)

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-500">Laporan Kewangan Hospital</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
            title="Select Period"
          >
            <option value="week">This Week / Minggu Ini</option>
            <option value="month">This Month / Bulan Ini</option>
            <option value="quarter">This Quarter / Suku Tahun</option>
            <option value="year">This Year / Tahun Ini</option>
          </select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Jumlah Pendapatan</p>
                <p className="text-sm text-green-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700 mt-1">RM {totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <ArrowUpRight className="w-4 h-4" />
              <span>+12.5% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Jumlah Perbelanjaan</p>
                <p className="text-sm text-red-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-700 mt-1">RM {totalExpense.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-500 rounded-xl">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
              <ArrowDownRight className="w-4 h-4" />
              <span>-3.2% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Pendapatan Bersih</p>
                <p className="text-sm text-blue-500">Net Income</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">RM {netIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
              <ArrowUpRight className="w-4 h-4" />
              <span>Margin: {profitMargin}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Subsidi Diterima</p>
                <p className="text-sm text-purple-500">Subsidies Received</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">RM {subsidyPrograms.reduce((a, s) => a + s.amount, 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-purple-600">
              <Users className="w-4 h-4" />
              <span>{subsidyPrograms.reduce((a, s) => a + s.beneficiaries, 0)} beneficiaries</span>
            </div>
          </CardContent>
        </Card>
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="w-5 h-5" />
              Revenue Breakdown / Pecahan Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueData.map((item, index) => (
                <motion.div
                  key={item.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.category}</p>
                      <p className="text-xs text-gray-500">{item.categoryMY}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">RM {item.amount.toLocaleString()}</p>
                      <div className="flex items-center gap-1 text-xs">
                        {item.trend === 'up' ? (
                          <ArrowUpRight className="w-3 h-3 text-green-500" />
                        ) : item.trend === 'down' ? (
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                        ) : null}
                        <span className={item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-gray-500'}>
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

                <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <TrendingDown className="w-5 h-5" />
              Expense Breakdown / Pecahan Perbelanjaan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenseData.map((item, index) => (
                <motion.div
                  key={item.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.category}</p>
                      <p className="text-xs text-gray-500">{item.categoryMY}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">RM {item.amount.toLocaleString()}</p>
                      <span className="text-xs text-gray-500">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-red-400 to-rose-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

            <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Government Subsidy Programs / Program Subsidi Kerajaan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {subsidyPrograms.map((program, index) => (
              <motion.div
                key={program.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full ${program.color}`} />
                      <h4 className="font-bold">{program.name}</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Amount</span>
                        <span className="font-bold">RM {program.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Beneficiaries</span>
                        <Badge variant="outline">{program.beneficiaries} patients</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

            <div className="flex gap-4">
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Generate Full Report
        </Button>
        <Button variant="outline" className="gap-2">
          <Calendar className="w-4 h-4" />
          Schedule Report
        </Button>
        <Button variant="outline" className="gap-2">
          <CreditCard className="w-4 h-4" />
          Payment Records
        </Button>
      </div>
    </div>
  )
}
