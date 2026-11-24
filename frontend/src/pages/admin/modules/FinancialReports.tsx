import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Download, Printer, RefreshCw, TrendingUp, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, type HospitalFinanceSummaryDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { downloadCsvFile, escapeHtml, formatMYR, printHtmlDocument } from '@/lib/utils'
import { WorkstationModuleHeader } from '@/components/ClinicalPatientBanner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function FinancialReports() {
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const [summary, setSummary] = useState<HospitalFinanceSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)

  const loadFinance = useCallback(async () => {
    setLoading(true)
    const res = await hospitalApi.getFinanceSummary(hospitalId)
    if (res.success && res.data) {
      setSummary(res.data)
    }
    setLoading(false)
  }, [hospitalId])

  useEffect(() => {
    void loadFinance()
  }, [loadFinance])

  const totalAllocation = (summary?.monthlySeries || []).reduce((s, m) => s + m.mohAllocation, 0)
  const totalPatientCollection = (summary?.monthlySeries || []).reduce((s, m) => s + m.patientCollection, 0)
  const totalOperatingExpense = (summary?.monthlySeries || []).reduce((s, m) => s + m.operatingExpense, 0)
  const totalSubsidyAbsorbed = (summary?.monthlySeries || []).reduce((s, m) => s + m.subsidyAbsorbed, 0)

  const handleExportCsv = () => {
    if (!summary) return
    downloadCsvFile(
      `financial-ledger-${hospitalId}.csv`,
      ['Month', 'KKM Operating Vote (MYR)', 'Patient Co-Payment (MYR)', 'Operating Expenditure (MYR)', 'Citizen Subsidy Absorbed (MYR)'],
      summary.monthlySeries.map((m) => [
        m.month,
        m.mohAllocation,
        m.patientCollection,
        m.operatingExpense,
        m.subsidyAbsorbed,
      ])
    )
  }

  const handlePrint = () => {
    if (!summary) return
    const rowsHtml = summary.monthlySeries
      .map(
        (m) => `<tr>
          <td>${escapeHtml(m.month)}</td>
          <td>${escapeHtml(formatMYR(m.mohAllocation))}</td>
          <td>${escapeHtml(formatMYR(m.patientCollection))}</td>
          <td>${escapeHtml(formatMYR(m.operatingExpense))}</td>
          <td>${escapeHtml(formatMYR(m.subsidyAbsorbed))}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Financial Report - ${summary.hospitalName}`,
      `<div class="header">
        <div><h1>${escapeHtml(summary.hospitalName)}</h1><p>${escapeHtml(summary.fiscalYear)} — KKM Operating Vote & Citizen Subsidy Ledger</p></div>
        <div>${escapeHtml(new Date().toLocaleDateString('en-MY'))}</div>
      </div>
      <div class="meta">
        <strong>6-Month Operating Allocation:</strong> ${escapeHtml(formatMYR(totalAllocation))} |
        <strong>Patient Co-Payment Collected:</strong> ${escapeHtml(formatMYR(totalPatientCollection))}<br/>
        <strong>Store Inventory Valuation:</strong> ${escapeHtml(formatMYR(summary.inventoryValuation))} |
        <strong>Live Settled Receipts:</strong> ${summary.settledReceiptsCount}
      </div>
      <table>
        <thead><tr><th>Month</th><th>MOH Vote B42</th><th>Co-Payments</th><th>Operating Expense</th><th>Subsidy Absorbed</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`
    )
  }

  return (
    <div className="space-y-6">
      <WorkstationModuleHeader
        icon={DollarSign}
        title={t.financialReports}
        subtitle="KKM Operating Vote B42 allocation, citizen subsidy absorption & live billing/inventory reconciliation"
        badge={summary?.fiscalYear || theme.shortName}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadFinance}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t.refreshData}
            </Button>
            <Button variant="outline" size="sm" disabled={!summary} onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-1.5" />
              {t.exportCsv}
            </Button>
            <Button variant="outline" size="sm" disabled={!summary} onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" />
              {t.printSummary}
            </Button>
          </>
        }
      />

      {loading || !summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 tabular-nums">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">6-Month MOH Vote B42</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatMYR(totalAllocation)}</p>
              <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Federal Treasury Disbursed
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Citizen Subsidy Absorbed</p>
              <p className="text-2xl font-extrabold text-emerald-800 mt-1">{formatMYR(totalSubsidyAbsorbed)}</p>
              <p className="text-xs text-slate-600 mt-1">Akta Fi 1951 public care shield</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Patient Co-Payments Collected</p>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">{formatMYR(totalPatientCollection)}</p>
              <p className="text-xs text-slate-600 mt-1">
                Includes {summary.settledReceiptsCount} live session receipt(s) ({formatMYR(summary.liveSettledRevenue)})
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Live Store Inventory Valuation</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatMYR(summary.inventoryValuation)}</p>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Synced with Central Store
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Monthly Ledger Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Monthly Operating Vote & Revenue Ledger</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold">Period</th>
                      <th className="py-3 px-4 text-right font-bold">MOH Allocation</th>
                      <th className="py-3 px-4 text-right font-bold">Co-Payments</th>
                      <th className="py-3 px-4 text-right font-bold">Expenditure</th>
                      <th className="py-3 px-4 text-right font-bold">Subsidy Absorbed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.monthlySeries.map((row) => (
                      <tr key={row.month} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.month} 2026</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatMYR(row.mohAllocation)}</td>
                        <td className="py-3 px-4 text-right text-blue-800 font-semibold">{formatMYR(row.patientCollection)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{formatMYR(row.operatingExpense)}</td>
                        <td className="py-3 px-4 text-right text-emerald-800 font-semibold">{formatMYR(row.subsidyAbsorbed)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-extrabold text-slate-900">
                    <tr>
                      <td className="py-3 px-4">6-Month Total</td>
                      <td className="py-3 px-4 text-right">{formatMYR(totalAllocation)}</td>
                      <td className="py-3 px-4 text-right text-blue-900">{formatMYR(totalPatientCollection)}</td>
                      <td className="py-3 px-4 text-right">{formatMYR(totalOperatingExpense)}</td>
                      <td className="py-3 px-4 text-right text-emerald-900">{formatMYR(totalSubsidyAbsorbed)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Expenditure Breakdown */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 tabular-nums">
              <h2 className="text-sm font-bold text-slate-900">Monthly Operating Expenditure Breakdown</h2>
              <div className="space-y-3.5">
                {summary.expenseBreakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-slate-800">{item.category}</span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatMYR(item.amount)} ({item.sharePercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={theme.iconBg}
                        style={{ width: `${item.sharePercent}%`, height: '100%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
