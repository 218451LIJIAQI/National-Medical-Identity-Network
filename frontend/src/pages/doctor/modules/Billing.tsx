import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Receipt,
  CheckCircle2,
  Printer,
  Plus,
  Trash2,
  Shield,
  CreditCard,
  Loader2,
} from 'lucide-react'
import {
  ClinicalPatientBanner,
  WorkstationModuleHeader,
  PatientRequiredGate,
} from '@/components/ClinicalPatientBanner'
import { DataErrorBanner, EmptyStatePanel, StatusBadge } from '@/components/ui/modal-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, type PatientBillingAccountDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, formatDateTime, formatMYR, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Billing() {
  const user = useAuthStore((s) => s.user)
  const { activePatient, clearActivePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  const loadSeqRef = useRef(0)
  const [account, setAccount] = useState<PatientBillingAccountDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<'counter' | 'online' | 'waived'>('counter')
  const [newChargeCategory, setNewChargeCategory] = useState('Clinical Procedure')
  const [newChargeDesc, setNewChargeDesc] = useState('')
  const [newChargeAmount, setNewChargeAmount] = useState('')

  // Strictly reset & load patient-isolated billing account whenever activePatient changes
  const fetchBilling = useCallback(
    (ic: string, signal?: AbortSignal) => {
      const seq = ++loadSeqRef.current
      setLoading(true)
      setLoadError('')
      hospitalApi
        .getBillingAccount(hospitalId, ic, signal)
        .then((res) => {
          if (res.aborted || seq !== loadSeqRef.current) return
          if (res.accessDenied) {
            clearActivePatient()
            toast({
              title: t.privacyRestrictedTitle,
              description: res.error || t.privacyRestrictedDesc,
              variant: 'destructive',
            })
            return
          }
          if (res.success && res.data) {
            setAccount(res.data)
          } else {
            setLoadError(res.error || t.networkError)
          }
        })
        .finally(() => {
          if (seq === loadSeqRef.current) setLoading(false)
        })
    },
    [hospitalId, clearActivePatient, toast, t.privacyRestrictedTitle, t.privacyRestrictedDesc, t.networkError]
  )

  useEffect(() => {
    const ic = activePatient?.icNumber
    setAccount(null)
    setLoadError('')
    if (!ic) return
    const controller = new AbortController()
    fetchBilling(ic, controller.signal)
    return () => controller.abort()
  }, [activePatient?.icNumber, fetchBilling])

  const computedRows = (account?.items || []).map((item) => {
    const effectiveSubsidyPct =
      selectedPayment === 'waived'
        ? 100
        : account?.subsidyStatus === 'not-eligible'
          ? 0
          : account?.subsidyStatus === 'pending'
            ? Math.min(50, item.subsidyPercent)
            : item.subsidyPercent
    const subsidyAmount = (item.originalPrice * effectiveSubsidyPct) / 100
    const finalPrice = Math.max(0, item.originalPrice - subsidyAmount)
    return { ...item, effectiveSubsidyPct, subsidyAmount, finalPrice }
  })

  const totalOriginal = computedRows.reduce((s, r) => s + r.originalPrice, 0)
  const totalSubsidy = computedRows.reduce((s, r) => s + r.subsidyAmount, 0)
  const totalFinal = computedRows.reduce((s, r) => s + r.finalPrice, 0)

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient) return
    const amt = parseFloat(newChargeAmount)
    if (!newChargeDesc.trim() || Number.isNaN(amt) || amt <= 0) return

    setProcessing(true)
    try {
      const res = await hospitalApi.addBillingItem(hospitalId, activePatient.icNumber, {
        category: newChargeCategory,
        description: newChargeDesc.trim(),
        originalPrice: amt,
      })
      if (res.success && res.data) {
        setAccount(res.data)
        setNewChargeDesc('')
        setNewChargeAmount('')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!activePatient) return
    const res = await hospitalApi.removeBillingItem(hospitalId, activePatient.icNumber, itemId)
    if (res.success && res.data) {
      setAccount(res.data)
    }
  }

  const handleSubsidyChange = async (tier: PatientBillingAccountDto['subsidyStatus']) => {
    if (!activePatient) return
    const res = await hospitalApi.updateBillingSubsidy(hospitalId, activePatient.icNumber, tier)
    if (res.success && res.data) {
      setAccount(res.data)
    }
  }

  const handleSettle = async () => {
    if (!activePatient) return
    setProcessing(true)
    try {
      const res = await hospitalApi.settleBillingAccount(hospitalId, activePatient.icNumber, selectedPayment)
      if (res.success && res.data) {
        setAccount(res.data)
        toast({
          title: 'Official Receipt Issued',
          description: `${res.data.receipt?.receiptNo} settled (${formatMYR(res.data.receipt?.netAmount || 0)}).`,
          variant: 'success',
        })
      }
    } finally {
      setProcessing(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!activePatient || !account) return
    const rowsHtml = computedRows
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.description)}</td>
          <td>${escapeHtml(r.category)}</td>
          <td>${escapeHtml(formatMYR(r.originalPrice))}</td>
          <td>-${escapeHtml(formatMYR(r.subsidyAmount))} (${r.effectiveSubsidyPct.toFixed(0)}%)</td>
          <td><strong>${escapeHtml(formatMYR(r.finalPrice))}</strong></td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Official MOH Receipt - ${activePatient.fullName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Ministry of Health Malaysia • Akta Fi 1951 Subsidised Statement</p></div>
        <div><strong>${escapeHtml(account.receipt?.receiptNo || 'PROVISIONAL STATEMENT')}</strong></div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(activePatient.fullName)} (${escapeHtml(activePatient.icNumber)})<br/>
        <strong>Subsidy Tier:</strong> ${escapeHtml(account.subsidyStatus.toUpperCase())} |
        <strong>Status:</strong> ${escapeHtml(account.receipt ? `PAID (${formatDateTime(account.receipt.paidAt)})` : 'UNSETTLED')}
      </div>
      <table>
        <thead><tr><th>Description</th><th>Category</th><th>Gross Fee</th><th>MOH Subsidy</th><th>Net Payable</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="footer">Net Citizen Co-Payment: <strong>${escapeHtml(formatMYR(totalFinal))}</strong></div>`
    )
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={Receipt}
        title={t.billing}
        subtitle="MOH Akta Fi 1951 citizen subsidy calculation, itemized charges & official receipting"
        actions={
          activePatient && account ? (
            <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
              <Printer className="w-4 h-4 mr-1.5" />
              {t.printSummary}
            </Button>
          ) : undefined
        }
      />

      {!activePatient ? (
        <PatientRequiredGate moduleTitle={t.billing} />
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : loadError || !account ? (
        <DataErrorBanner
          message={loadError || t.networkError}
          onRetry={() => fetchBilling(activePatient.icNumber)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5">
            {account.receipt && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">
                      Settled Receipt <span className="font-mono tabular-nums">{account.receipt.receiptNo}</span>
                    </p>
                    <p className="tabular-nums">
                      Paid {formatMYR(account.receipt.netAmount)} via {account.receipt.paymentMethod.toUpperCase()} • {formatDateTime(account.receipt.paidAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge tone="success" label="Official Receipt Issued" />
              </div>
            )}

            {/* Itemized Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900">Itemized Clinical & Pharmacy Charges</h2>
                <div className="flex items-center gap-1.5">
                  {(['eligible', 'pending', 'not-eligible'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleSubsidyChange(tier)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors',
                        account.subsidyStatus === tier
                          ? `${theme.iconBg} text-white`
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {tier === 'eligible' ? 'Citizen Subsidised' : tier === 'pending' ? '50% Provisional' : 'Full Rate'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold">Item Description</th>
                      <th className="py-3 px-4 text-left font-bold">Category</th>
                      <th className="py-3 px-4 text-right font-bold">Gross</th>
                      <th className="py-3 px-4 text-right font-bold">MOH Subsidy</th>
                      <th className="py-3 px-4 text-right font-bold">Net Payable</th>
                      <th className="py-3 px-3 text-right font-bold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {computedRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4">
                          <EmptyStatePanel
                            title="No Billable Items on Statement"
                            description="Add a procedure, diagnostic investigation, or pharmacy item below."
                          />
                        </td>
                      </tr>
                    ) : (
                      computedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.description}</td>
                        <td className="py-3 px-4 text-slate-600">{row.category}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{formatMYR(row.originalPrice)}</td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                          -{formatMYR(row.subsidyAmount)} ({row.effectiveSubsidyPct.toFixed(0)}%)
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{formatMYR(row.finalPrice)}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(row.id)}
                            aria-label={`Remove ${row.description}`}
                            className="p-1 text-slate-400 hover:text-red-700 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleAddCharge} className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 flex-wrap">
                <select
                  value={newChargeCategory}
                  onChange={(e) => setNewChargeCategory(e.target.value)}
                  className="h-9 px-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                >
                  <option value="Clinical Procedure">Procedure</option>
                  <option value="Diagnostic Investigation">Investigation</option>
                  <option value="Pharmacy Dispensing">Medication</option>
                  <option value="Ward & Bed">Ward Charge</option>
                </select>
                <Input
                  value={newChargeDesc}
                  onChange={(e) => setNewChargeDesc(e.target.value)}
                  placeholder="Add procedure or consumable description…"
                  className="h-9 text-xs flex-1 min-w-[180px] bg-white"
                />
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newChargeAmount}
                  onChange={(e) => setNewChargeAmount(e.target.value)}
                  placeholder="Gross RM"
                  className="h-9 w-28 text-xs tabular-nums bg-white"
                />
                <Button type="submit" size="sm" variant="outline" disabled={processing || !newChargeDesc.trim()}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Item
                </Button>
              </form>
            </div>
          </div>

          {/* Summary & Settlement */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 tabular-nums">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                <Shield className="w-4 h-4 shrink-0" />
                <span>KKM Malaysian Citizen Subsidy Active</span>
              </div>

              <div className="space-y-2 text-xs border-b border-slate-100 pb-3">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Unsubsidised Total</span>
                  <span className="font-semibold">{formatMYR(totalOriginal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>MOH Government Subsidy</span>
                  <span>-{formatMYR(totalSubsidy)}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900">Net Citizen Payable</span>
                <span className="text-2xl font-extrabold text-slate-900">{formatMYR(totalFinal)}</span>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700">Settlement Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['counter', 'Counter'],
                      ['online', 'FPX / QR'],
                      ['waived', 'B40 Waive'],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedPayment(mode)}
                      className={cn(
                        'py-2 px-2 rounded-xl text-xs font-bold border transition-colors',
                        selectedPayment === mode
                          ? `${theme.iconBg} text-white border-transparent`
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSettle}
                disabled={processing || computedRows.length === 0}
                className={cn('w-full h-11 text-white font-bold bg-gradient-to-r', theme.buttonGradient)}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-1.5" />
                )}
                {account.receipt ? 'Re-Issue Official Receipt' : 'Settle & Issue Receipt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
