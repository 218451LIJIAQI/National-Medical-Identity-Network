import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Calendar,
  Building2,
  Users,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  CheckCircle2,
} from 'lucide-react'
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useToast } from '@/components/ui/use-toast'

interface RevenueData {
  category: string
  categoryMY: string
  baseAmount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

interface ExpenseData {
  category: string
  categoryMY: string
  baseAmount: number
  percentage: number
}

const baseRevenueData: RevenueData[] = [
  { category: 'Outpatient Services', categoryMY: 'Perkhidmatan Pesakit Luar', baseAmount: 450000, percentage: 35, trend: 'up' },
  { category: 'Inpatient Services', categoryMY: 'Perkhidmatan Pesakit Dalam', baseAmount: 380000, percentage: 30, trend: 'up' },
  { category: 'Laboratory & Diagnostics', categoryMY: 'Makmal & Diagnostik', baseAmount: 180000, percentage: 14, trend: 'stable' },
  { category: 'Pharmacy Sales', categoryMY: 'Jualan Farmasi', baseAmount: 150000, percentage: 12, trend: 'up' },
  { category: 'Government Subsidy (KKM)', categoryMY: 'Subsidi Kerajaan (KKM)', baseAmount: 120000, percentage: 9, trend: 'stable' },
]

const baseExpenseData: ExpenseData[] = [
  { category: 'Staff Salaries', categoryMY: 'Gaji Kakitangan', baseAmount: 520000, percentage: 45 },
  { category: 'Medical Supplies', categoryMY: 'Bekalan Perubatan', baseAmount: 230000, percentage: 20 },
  { category: 'Equipment Maintenance', categoryMY: 'Penyelenggaraan Peralatan', baseAmount: 115000, percentage: 10 },
  { category: 'Utilities', categoryMY: 'Utiliti', baseAmount: 92000, percentage: 8 },
  { category: 'Administrative', categoryMY: 'Pentadbiran', baseAmount: 69000, percentage: 6 },
  { category: 'Training & Development', categoryMY: 'Latihan & Pembangunan', baseAmount: 46000, percentage: 4 },
  { category: 'Others', categoryMY: 'Lain-lain', baseAmount: 80500, percentage: 7 },
]

const baseSubsidyPrograms = [
  { name: 'MySalam', baseAmount: 45000, baseBeneficiaries: 320, color: 'bg-blue-600' },
  { name: 'PeKa B40', baseAmount: 38000, baseBeneficiaries: 180, color: 'bg-emerald-600' },
  { name: 'SOCSO/PERKESO', baseAmount: 25000, baseBeneficiaries: 95, color: 'bg-purple-600' },
  { name: 'Bantuan Sara Hidup', baseAmount: 12000, baseBeneficiaries: 45, color: 'bg-amber-600' },
]

const PERIOD_MULTIPLIER: Record<string, { factor: number; label: string }> = {
  week: { factor: 0.25, label: 'Weekly' },
  month: { factor: 1, label: 'Monthly' },
  quarter: { factor: 3, label: 'Quarterly' },
  year: { factor: 12, label: 'Annual' },
}

export default function FinancialReports() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [showPaymentsTable, setShowPaymentsTable] = useState(false)
  const [scheduledDigest, setScheduledDigest] = useState(false)

  const multiplier = PERIOD_MULTIPLIER[selectedPeriod].factor
  const periodLabel = PERIOD_MULTIPLIER[selectedPeriod].label

  const revenueData = baseRevenueData.map((r) => ({
    ...r,
    amount: Math.round(r.baseAmount * multiplier),
  }))
  const expenseData = baseExpenseData.map((e) => ({
    ...e,
    amount: Math.round(e.baseAmount * multiplier),
  }))
  const subsidyPrograms = baseSubsidyPrograms.map((s) => ({
    ...s,
    amount: Math.round(s.baseAmount * multiplier),
    beneficiaries: Math.max(1, Math.round(s.baseBeneficiaries * multiplier)),
  }))

  const totalRevenue = revenueData.reduce((acc, r) => acc + r.amount, 0)
  const totalExpense = expenseData.reduce((acc, e) => acc + e.amount, 0)
  const netIncome = totalRevenue - totalExpense
  const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0'
  const totalSubsidies = subsidyPrograms.reduce((a, s) => a + s.amount, 0)

  const handlePrintPdf = () => {
    const revRows = revenueData
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.category)}</td><td>RM ${escapeHtml(r.amount.toLocaleString())}</td><td>${escapeHtml(r.percentage)}%</td></tr>`
      )
      .join('')
    const expRows = expenseData
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.category)}</td><td>RM ${escapeHtml(e.amount.toLocaleString())}</td><td>${escapeHtml(e.percentage)}%</td></tr>`
      )
      .join('')
    printHtmlDocument(
      `${periodLabel} Financial Report - ${theme.name}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>${escapeHtml(periodLabel)} Financial Statement &amp; MOH Subsidy Ledger</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>Total Revenue:</strong> RM ${escapeHtml(totalRevenue.toLocaleString())} |
        <strong>Total Expenses:</strong> RM ${escapeHtml(totalExpense.toLocaleString())} |
        <strong>Net Surplus:</strong> RM ${escapeHtml(netIncome.toLocaleString())} (${escapeHtml(profitMargin)}%)
      </div>
      <h3>Revenue Breakdown</h3>
      <table><thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead><tbody>${revRows}</tbody></table>
      <h3>Expense Breakdown</h3>
      <table><thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead><tbody>${expRows}</tbody></table>`
    )
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `financial-ledger-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`,
      ['Type', 'Category', 'Period', 'Amount (RM)', 'Share (%)'],
      [
        ...revenueData.map((r) => ['Revenue', r.category, periodLabel, r.amount, r.percentage]),
        ...expenseData.map((e) => ['Expense', e.category, periodLabel, e.amount, e.percentage]),
      ]
    )
  }

  return (
    <div className="space-y-6 tabular-nums">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Reports ({periodLabel})</h1>
          <p className="text-slate-600 text-sm">
            Hospital revenue, expenditure & MOH citizen subsidy reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium"
            title="Select Period"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" onClick={handlePrintPdf} className="gap-2">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </Button>
          <Button
            onClick={handleExportCsv}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {scheduledDigest && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>
            Automated {periodLabel.toLowerCase()} financial digest scheduled for hospital treasury
            review.
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-emerald-50/80 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-800">
                  Total Revenue ({periodLabel})
                </p>
                <p className="text-2xl font-bold text-emerald-950 mt-1">
                  RM {totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-800 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> +12.5% YoY
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/80 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-800">Total Expenses ({periodLabel})</p>
                <p className="text-2xl font-bold text-red-950 mt-1">
                  RM {totalExpense.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-red-600 rounded-xl text-white">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-red-800 font-medium">
              <ArrowDownRight className="w-3.5 h-3.5" /> -3.2% cost variance
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/80 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-800">Net Operating Surplus</p>
                <p className="text-2xl font-bold text-blue-950 mt-1">
                  RM {netIncome.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-blue-600 rounded-xl text-white">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-blue-800 font-medium mt-2">
              Operating Margin: {profitMargin}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/80 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-800">MOH Subsidies Disbursed</p>
                <p className="text-2xl font-bold text-purple-950 mt-1">
                  RM {totalSubsidies.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-purple-600 rounded-xl text-white">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-purple-800 font-medium mt-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />{' '}
              {subsidyPrograms.reduce((a, s) => a + s.beneficiaries, 0)} citizens covered
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-emerald-900">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {revenueData.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.category}</p>
                    <p className="text-xs text-slate-500">{item.categoryMY}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">RM {item.amount.toLocaleString()}</p>
                    <span className="text-xs text-emerald-700 font-medium">{item.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-600"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-red-900">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenseData.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.category}</p>
                    <p className="text-xs text-slate-500">{item.categoryMY}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">RM {item.amount.toLocaleString()}</p>
                    <span className="text-xs text-slate-600 font-medium">{item.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-rose-600"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-700" />
            Government Subsidy Reimbursements ({periodLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          {subsidyPrograms.map((program) => (
            <div
              key={program.name}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${program.color}`} />
                <h4 className="font-bold text-sm text-slate-900">{program.name}</h4>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Reimbursed</span>
                <span className="font-bold text-slate-900">
                  RM {program.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-600">Beneficiaries</span>
                <Badge variant="outline">{program.beneficiaries}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleExportCsv} className="gap-2">
          <FileText className="w-4 h-4" /> Export Full Ledger CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setScheduledDigest(true)
            toast({
              title: 'Report Scheduled',
              description: `${periodLabel} treasury summary enabled.`,
              variant: 'success',
            })
          }}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" /> Schedule Treasury Digest
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowPaymentsTable(!showPaymentsTable)}
          className="gap-2"
        >
          <CreditCard className="w-4 h-4" /> {showPaymentsTable ? 'Hide' : 'View'} Recent
          Reimbursements
        </Button>
      </div>

      {showPaymentsTable && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Recent MOH Reimbursement Transfers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left">Voucher Ref</th>
                  <th className="p-3 text-left">Scheme</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subsidyPrograms.map((s, idx) => (
                  <tr key={s.name}>
                    <td className="p-3 font-mono text-xs text-slate-700">MOH-TR-{202500 + idx}</td>
                    <td className="p-3 font-medium text-slate-900">{s.name}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      RM {s.amount.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <StatusBadge tone="success" icon={CheckCircle2} label="Settled" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
