import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useSessionState, exportToCsv, triggerPrintDocument } from '@/lib/workstation-storage'
import {
  DollarSign,
  TrendingUp,
  Download,
  FileText,
  CreditCard,
  Shield,
  Users,
  ArrowUpRight,
  Printer,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'

type ReportPeriod = 'week' | 'month' | 'quarter' | 'year'

const PERIOD_MULTIPLIER: Record<ReportPeriod, { factor: number; label: string; growth: string }> = {
  week: { factor: 0.25, label: 'This Week', growth: '+6.2%' },
  month: { factor: 1, label: 'This Month', growth: '+12.5%' },
  quarter: { factor: 2.95, label: 'This Quarter', growth: '+14.8%' },
  year: { factor: 11.6, label: 'This Fiscal Year', growth: '+18.1%' },
}

const BASE_MONTHLY = {
  revenue: 2450000,
  govSubsidy: 1960000,
  patientPay: 490000,
  pendingClaims: 185000,
  transactions: 4520,
}

const BASE_DEPT_REVENUE = [
  { name: 'Outpatient Clinics', baseRevenue: 580000, subsidyRate: 85, basePatients: 1850 },
  { name: 'Inpatient Wards', baseRevenue: 920000, subsidyRate: 80, basePatients: 420 },
  { name: 'Emergency Services', baseRevenue: 380000, subsidyRate: 90, basePatients: 890 },
  { name: 'Surgery & Procedures', baseRevenue: 420000, subsidyRate: 75, basePatients: 180 },
  { name: 'Diagnostics (Lab/Imaging)', baseRevenue: 150000, subsidyRate: 82, basePatients: 1180 },
]

export default function FinancialReports() {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const hospitalKey = user?.hospitalId || 'default'

  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month')
  const [receiptsModalOpen, setReceiptsModalOpen] = useState(false)
  const [sessionReceipts] = useSessionState<
    Array<{ receiptNo: string; ic: string; patientName: string; amountPaid: number; method: string; time: string }>
  >(`billing-receipts:${hospitalKey}`, [])

  const { factor, label: periodLabel, growth } = PERIOD_MULTIPLIER[selectedPeriod]
  const sessionPaidTotal = sessionReceipts.reduce((acc, r) => acc + (r.amountPaid || 0), 0)

  const totalRevenue = Math.round(BASE_MONTHLY.revenue * factor + sessionPaidTotal)
  const govSubsidy = Math.round(BASE_MONTHLY.govSubsidy * factor)
  const patientPayments = Math.round(BASE_MONTHLY.patientPay * factor + sessionPaidTotal)
  const pendingClaims = Math.round(BASE_MONTHLY.pendingClaims * (selectedPeriod === 'week' ? 0.45 : 1))
  const totalTransactions = Math.round(BASE_MONTHLY.transactions * factor) + sessionReceipts.length

  const departmentRows = BASE_DEPT_REVENUE.map((d) => ({
    name: d.name,
    revenue: Math.round(d.baseRevenue * factor),
    subsidyRate: d.subsidyRate,
    patients: Math.round(d.basePatients * factor),
  }))

  const formatCurrency = (amount: number) => `RM ${(amount / 1000).toFixed(0)}K`
  const formatFullCurrency = (amount: number) => `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const handleExportCsv = () => {
    exportToCsv(
      `${theme.shortName.toLowerCase()}-financial-report-${selectedPeriod}.csv`,
      ['Department', 'Period', 'Patient Volume', 'Subsidy Rate (%)', 'Gross Value (RM)'],
      departmentRows.map((d) => [d.name, periodLabel, d.patients, d.subsidyRate, d.revenue])
    )
  }

  const handlePrintPdf = () => {
    const rowsHtml = departmentRows
      .map(
        (d) =>
          `<tr><td>${d.name}</td><td>${d.patients.toLocaleString()}</td><td>${d.subsidyRate}%</td><td>RM ${d.revenue.toLocaleString()}</td></tr>`
      )
      .join('')
    triggerPrintDocument(
      `${theme.name} — Financial Summary (${periodLabel})`,
      `<h1>${theme.name} — Financial Summary (${periodLabel})</h1>
       <div class="meta">MOH Healthcare Subsidy & Revenue Report</div>
       <h2>Executive Totals</h2>
       <table>
         <tr><th>Metric</th><th>Amount</th></tr>
         <tr><td>Total Healthcare Value</td><td>${formatFullCurrency(totalRevenue)}</td></tr>
         <tr><td>MOH Government Subsidy</td><td>${formatFullCurrency(govSubsidy)}</td></tr>
         <tr><td>Patient Co-Payments (incl. ${sessionReceipts.length} workstation receipts)</td><td>${formatFullCurrency(patientPayments)}</td></tr>
         <tr><td>Pending Subsidy Claims</td><td>${formatFullCurrency(pendingClaims)}</td></tr>
       </table>
       <h2>Departmental Breakdown</h2>
       <table>
         <thead><tr><th>Department</th><th>Patients Served</th><th>MOH Subsidy</th><th>Total Value</th></tr></thead>
         <tbody>${rowsHtml}</tbody>
       </table>`
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: theme.primaryColor }}>
              <DollarSign className="h-6 w-6" />
            </div>
            Financial Reports
          </h1>
          <p className="text-gray-500 mt-1">
            {theme.name} — Revenue & MOH subsidy analytics ({periodLabel})
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border p-1 bg-gray-50">
            {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="capitalize text-xs"
              >
                {period}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handlePrintPdf} className="gap-2" style={{ backgroundColor: theme.primaryColor }}>
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-emerald-100 text-sm">Total Value ({periodLabel})</p>
                <Badge className="bg-white/20 text-white text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {growth}
                </Badge>
              </div>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-emerald-100 mt-1">{totalTransactions.toLocaleString()} billed encounters</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm">Gov. Subsidy</p>
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(govSubsidy)}</p>
              <p className="text-xs text-blue-600 mt-1">80% covered by MOH</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm">Patient Co-Pay</p>
                <CreditCard className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(patientPayments)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {sessionReceipts.length > 0
                  ? `Includes ${sessionReceipts.length} live workstation receipt(s)`
                  : '20% nominal co-payment'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm">Pending Claims</p>
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(pendingClaims)}</p>
              <p className="text-xs text-amber-600 mt-1">Awaiting MOH treasury batch</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900">Malaysian Government Healthcare Subsidy</h3>
                <p className="text-sm text-blue-700">
                  Malaysian MyKad citizens receive 80–95% healthcare subsidy under MOH public hospital tariff schedules
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-900">RM 1</p>
                <p className="text-xs text-blue-600">Outpatient Registration</p>
              </div>
              <div className="h-8 w-px bg-blue-200" />
              <div>
                <p className="text-2xl font-bold text-blue-900">RM 5</p>
                <p className="text-xs text-blue-600">Specialist Clinic</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue by Department ({periodLabel})
          </CardTitle>
          <CardDescription>Breakdown of clinical service value and subsidy coverage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentRows.map((dept, index) => {
              const maxRevenue = Math.max(...departmentRows.map((d) => d.revenue), 1)
              const widthPercent = Math.round((dept.revenue / maxRevenue) * 100)

              return (
                <motion.div
                  key={dept.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="p-4 rounded-xl border bg-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {dept.patients.toLocaleString()} patients
                        </span>
                        <span>•</span>
                        <span className="text-blue-600">{dept.subsidyRate}% subsidized</span>
                      </p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(dept.revenue)}</p>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${widthPercent}%`, backgroundColor: theme.primaryColor }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={handlePrintPdf} className="gap-2">
            <Printer className="h-4 w-4" />
            Generate Printable Full Report
          </Button>
          <Button variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Download CSV Ledger
          </Button>
          <Button variant="outline" onClick={() => setReceiptsModalOpen(true)} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Session Payment Receipts ({sessionReceipts.length})
          </Button>
        </CardContent>
      </Card>

      {receiptsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReceiptsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Workstation Payment Receipts</h2>
              <button onClick={() => setReceiptsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            {sessionReceipts.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No receipts settled in this browser session yet. Receipts generated in the Doctor Billing module appear here automatically.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sessionReceipts.map((r) => (
                  <div key={r.receiptNo} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {r.receiptNo} — {r.patientName}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        IC: {r.ic} • {r.method.toUpperCase()} • {r.time}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">RM {r.amountPaid.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setReceiptsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
