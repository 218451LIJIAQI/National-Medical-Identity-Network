import { useState } from 'react'
import {
  Receipt,
  CreditCard,
  BadgeCheck,
  Gift,
  Building2,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calculator,
  Percent,
  Shield,
  Heart,
  Printer,
  Plus,
} from 'lucide-react'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { useClinicalStore } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { escapeHtml, printHtmlDocument } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface BillingItem {
  id: string
  category: string
  description: string
  originalPrice: number
  subsidyPercent: number
}

const initialBillingItems: BillingItem[] = [
  { id: '1', category: 'Consultation', description: 'Specialist Consultation - Outpatient', originalPrice: 30.0, subsidyPercent: 100 },
  { id: '2', category: 'Laboratory', description: 'Full Blood Count (FBC)', originalPrice: 15.0, subsidyPercent: 100 },
  { id: '3', category: 'Laboratory', description: 'Renal Function Test (RFT)', originalPrice: 25.0, subsidyPercent: 100 },
  { id: '4', category: 'Radiology', description: 'Chest X-Ray (CXR)', originalPrice: 30.0, subsidyPercent: 100 },
  { id: '5', category: 'Medication', description: 'Dispensed Formulary Medications', originalPrice: 45.0, subsidyPercent: 95 },
]

const subsidyPrograms = [
  { type: 'MOH', program: 'Malaysian Government Subsidy', eligibility: 'MyKad Citizen', status: 'active' as const },
  { type: 'MySalam', program: 'MySalam Protection Scheme', eligibility: 'Eligible Citizen', status: 'active' as const },
  { type: 'PeKa B40', program: 'PeKa B40 Health Screening', eligibility: '40+ Citizen Tier', status: 'active' as const },
  { type: 'SOCSO', program: 'PERKESO Employment Coverage', eligibility: 'Registered Contributor', status: 'pending' as const },
]

interface BillingProps {
  patientName?: string
  patientIC?: string
  subsidyStatus?: 'eligible' | 'not-eligible' | 'pending'
}

export default function Billing({
  patientName,
  patientIC,
  subsidyStatus = 'eligible',
}: BillingProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const resolvedName = activePatient?.fullName || patientName || 'Walk-in Citizen Patient'
  const resolvedIc = activePatient?.icNumber || patientIC || '880101-14-5678'

  const [billingItems, setBillingItems] = useState<BillingItem[]>(initialBillingItems)
  const [selectedPayment, setSelectedPayment] = useState<'counter' | 'online' | 'waived'>('counter')
  const [paymentReceipt, setPaymentReceipt] = useState<{
    receiptNo: string
    paidAt: string
    amount: number
  } | null>(null)
  const [newChargeDesc, setNewChargeDesc] = useState('')
  const [newChargeAmount, setNewChargeAmount] = useState('')

  const computedRows = billingItems.map((item) => {
    const effectiveSubsidyPct =
      subsidyStatus === 'not-eligible' ? 0 : selectedPayment === 'waived' ? 100 : item.subsidyPercent
    const subsidyAmount = (item.originalPrice * effectiveSubsidyPct) / 100
    const finalPrice = Math.max(0, item.originalPrice - subsidyAmount)
    return { ...item, effectiveSubsidyPct, subsidyAmount, finalPrice }
  })

  const totalOriginal = computedRows.reduce((sum, item) => sum + item.originalPrice, 0)
  const totalSubsidy = computedRows.reduce((sum, item) => sum + item.subsidyAmount, 0)
  const totalFinal = computedRows.reduce((sum, item) => sum + item.finalPrice, 0)
  const subsidyPercent = totalOriginal > 0 ? Math.round((totalSubsidy / totalOriginal) * 100) : 0

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newChargeAmount)
    if (!newChargeDesc.trim() || Number.isNaN(amt) || amt <= 0) return
    setBillingItems((prev) => [
      ...prev,
      {
        id: `chg-${Date.now()}`,
        category: 'Procedure',
        description: newChargeDesc.trim(),
        originalPrice: amt,
        subsidyPercent: 90,
      },
    ])
    setNewChargeDesc('')
    setNewChargeAmount('')
    setPaymentReceipt(null)
  }

  const handleProcessPayment = () => {
    const receiptNo = `RCP-${Date.now().toString().slice(-6)}`
    const paidAt = new Date().toLocaleString('en-MY')
    setPaymentReceipt({ receiptNo, paidAt, amount: totalFinal })
    toast({
      title: 'Billing Settled',
      description: `Receipt ${receiptNo} issued (${totalFinal === 0 ? 'WAIVED / FREE' : `RM ${totalFinal.toFixed(2)}`}).`,
      variant: 'success',
    })
  }

  const handlePrintReceipt = () => {
    const rowsHtml = computedRows
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.description)}</td>
          <td>${escapeHtml(r.category)}</td>
          <td>RM ${r.originalPrice.toFixed(2)}</td>
          <td>-RM ${r.subsidyAmount.toFixed(2)} (${r.effectiveSubsidyPct}%)</td>
          <td><strong>RM ${r.finalPrice.toFixed(2)}</strong></td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Official Receipt - ${resolvedName}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Official MOH Billing Statement &amp; Subsidy Receipt</p></div>
        <div><strong>${escapeHtml(paymentReceipt ? paymentReceipt.receiptNo : 'STATEMENT')}</strong></div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${escapeHtml(resolvedName)} (${escapeHtml(resolvedIc)})<br/>
        <strong>Payment Mode:</strong> ${escapeHtml(selectedPayment.toUpperCase())} | <strong>Status:</strong> ${escapeHtml(paymentReceipt ? `PAID (${paymentReceipt.paidAt})` : 'PENDING')}
      </div>
      <table>
        <thead><tr><th>Item</th><th>Category</th><th>Gross</th><th>MOH Subsidy</th><th>Net Payable</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <h3>Net Total Payable: RM ${totalFinal.toFixed(2)}</h3>`
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Consultation':
        return User
      case 'Medication':
        return Heart
      default:
        return FileText
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Billing & Citizen Subsidies</h2>
          <p className="text-slate-600 text-sm">Fees Act 1951 automated MyKad subsidy calculation</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintReceipt}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={Boolean(paymentReceipt)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <CreditCard className="w-4 h-4" />
            {paymentReceipt ? `Settled (${paymentReceipt.receiptNo})` : 'Settle & Issue Receipt'}
          </button>
        </div>
      </div>

      {paymentReceipt && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-sm text-emerald-900 tabular-nums">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Official Receipt <code className="font-mono">{paymentReceipt.receiptNo}</code> settled on{' '}
            {paymentReceipt.paidAt}
          </span>
          <span className="font-bold">Paid: RM {paymentReceipt.amount.toFixed(2)}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{resolvedName}</p>
            <code className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono tabular-nums">
              {resolvedIc}
            </code>
          </div>
        </div>

        <div className="p-5 rounded-xl border-2 bg-emerald-50 border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subsidyStatus === 'eligible' ? (
              <BadgeCheck className="w-8 h-8 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-8 h-8 text-amber-700 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-emerald-950">MYKAD CITIZEN SUBSIDY</p>
                <StatusBadge
                  tone={subsidyStatus === 'eligible' ? 'success' : 'warning'}
                  label={subsidyStatus === 'eligible' ? 'Eligible' : subsidyStatus}
                />
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Ministry of Health Malaysia Public Healthcare Tariff
              </p>
            </div>
          </div>
          <Shield className="w-10 h-10 text-emerald-200 shrink-0" />
        </div>
      </div>

      <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-6 h-6" />
          <h3 className="font-bold">Connected National Protection Schemes</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {subsidyPrograms.map((program) => (
            <div key={program.type} className="p-3 bg-white/10 rounded-lg border border-white/15">
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-bold">
                  {program.type}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    program.status === 'active'
                      ? 'bg-emerald-400/25 text-emerald-100 border border-emerald-300/40'
                      : 'bg-amber-400/25 text-amber-100 border border-amber-300/40'
                  }`}
                >
                  {program.status === 'active' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {program.status === 'active' ? 'Active' : 'Pending'}
                </span>
              </div>
              <p className="text-sm font-semibold">{program.program}</p>
              <p className="text-xs text-blue-100 mt-0.5">{program.eligibility}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Itemized Charges
            </h3>
          </div>

          <form onSubmit={handleAddCharge} className="p-3 border-b border-slate-100 flex gap-2 bg-slate-50/60">
            <Input
              maxLength={160}
              placeholder="Add billable procedure or consumable..."
              value={newChargeDesc}
              onChange={(e) => setNewChargeDesc(e.target.value)}
              className="h-9 text-sm bg-white"
            />
            <Input
              type="number"
              step="0.5"
              min="0.5"
              placeholder="RM"
              value={newChargeAmount}
              onChange={(e) => setNewChargeAmount(e.target.value)}
              className="h-9 w-28 text-sm bg-white tabular-nums"
            />
            <Button type="submit" size="sm" variant="outline" className="h-9 shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </form>

          <div className="divide-y divide-slate-100 tabular-nums">
            {computedRows.map((item) => {
              const Icon = getCategoryIcon(item.category)
              return (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{item.description}</p>
                      <p className="text-xs text-slate-500">{item.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-slate-500 line-through">
                        RM {item.originalPrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-700 font-medium">
                        -{item.effectiveSubsidyPct}% subsidy
                      </p>
                    </div>
                    <div className="w-24">
                      <p
                        className={`text-base font-bold ${
                          item.finalPrice === 0 ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {item.finalPrice === 0 ? 'FREE' : `RM ${item.finalPrice.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-sm tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Gross Hospital Tariff</span>
              <span>RM {totalOriginal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-medium">
              <span className="flex items-center gap-1.5">
                <Percent className="w-4 h-4" /> Government Subsidy ({subsidyPercent}%)
              </span>
              <span>- RM {totalSubsidy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>NET PAYABLE</span>
              <span className={totalFinal === 0 ? 'text-emerald-700' : ''}>
                {totalFinal === 0 ? 'FREE (RM 0.00)' : `RM ${totalFinal.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl text-white tabular-nums">
            <p className="text-sm font-semibold text-emerald-100">Citizen Subsidy Savings</p>
            <p className="text-3xl font-bold mt-1">RM {totalSubsidy.toFixed(2)}</p>
            <p className="text-xs text-emerald-100 mt-1">Covered by Ministry of Health Malaysia</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm">Settlement Mode</h3>
            <div className="space-y-2.5">
              {[
                { id: 'counter', label: 'Revenue Counter', desc: 'Cash / MyDebit / Card', icon: Building2 },
                { id: 'online', label: 'FPX / DuitNow QR', desc: 'Instant e-Payment', icon: CreditCard },
                { id: 'waived', label: 'Statutory Fee Waiver', desc: 'Senior / OKU / B40 Exemption', icon: BadgeCheck },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setSelectedPayment(method.id as typeof selectedPayment)
                    setPaymentReceipt(null)
                  }}
                  className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                    selectedPayment === method.id
                      ? 'border-blue-600 bg-blue-50/70'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <method.icon className="w-5 h-5 text-blue-700 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{method.label}</p>
                    <p className="text-xs text-slate-500">{method.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <Calculator className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>Computed under Fees (Medical) Order, Ministry of Health Malaysia.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
