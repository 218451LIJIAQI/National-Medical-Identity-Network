import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { triggerPrintDocument, useSessionState } from '@/lib/workstation-storage'
import { WorkstationPatientBar, useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import {
  Receipt, CreditCard, BadgeCheck, Gift, Building2, User,
  FileText, CheckCircle2, AlertCircle, Calculator, Percent,
  Shield, Heart, Printer, Plus, Trash2
} from 'lucide-react'

interface BillingItem {
  id: string
  category: string
  description: string
  originalPrice: number
  subsidyPercent: number
}

interface SubsidyInfo {
  type: string
  program: string
  eligibility: string
  coverage: string
  status: 'active' | 'pending' | 'expired'
}

const INITIAL_BILLING_ITEMS: BillingItem[] = [
  { id: '1', category: 'Consultation', description: 'Specialist Consultation - General Medicine', originalPrice: 30.0, subsidyPercent: 100 },
  { id: '2', category: 'Laboratory', description: 'Full Blood Count (FBC)', originalPrice: 15.0, subsidyPercent: 100 },
  { id: '3', category: 'Laboratory', description: 'Renal Function Test (RFT)', originalPrice: 25.0, subsidyPercent: 100 },
  { id: '4', category: 'Radiology', description: 'Chest X-Ray (CXR)', originalPrice: 30.0, subsidyPercent: 100 },
  { id: '5', category: 'Medication', description: 'Dispensed Outpatient Medication (7 days)', originalPrice: 45.0, subsidyPercent: 95 },
  { id: '6', category: 'Procedure', description: 'Standard Outpatient Dressing', originalPrice: 20.0, subsidyPercent: 100 },
]

const subsidyPrograms: SubsidyInfo[] = [
  { type: 'MOH', program: 'Malaysian Government Subsidy', eligibility: 'Malaysian Citizen (MyKad)', coverage: 'Public healthcare services', status: 'active' },
  { type: 'MySalam', program: 'MySalam Protection Scheme', eligibility: 'B40 / Eligible Citizens', coverage: 'Critical illness & hospitalization', status: 'active' },
  { type: 'PeKa B40', program: 'PeKa B40 Health Scheme', eligibility: '40 years and above', coverage: 'Health screening & medical devices', status: 'active' },
  { type: 'SOCSO', program: 'PERKESO / SOCSO', eligibility: 'Registered employees', coverage: 'Occupational injury & rehabilitation', status: 'pending' },
]

interface BillingProps {
  patientName?: string
  patientIC?: string
  subsidyStatus?: 'eligible' | 'not-eligible' | 'pending'
}

export default function Billing({
  patientName,
  patientIC,
  subsidyStatus: initialSubsidyStatus = 'eligible',
}: BillingProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)
  const { patient, lookupPatient, loading, lookupNotice } = useWorkstationPatient(patientName, patientIC)

  const [subsidyStatus, setSubsidyStatus] = useState<'eligible' | 'not-eligible' | 'pending'>(initialSubsidyStatus)
  const [billingItems, setBillingItems] = useSessionState<BillingItem[]>(
    `billing-items:${patient.icNumber}`,
    INITIAL_BILLING_ITEMS
  )
  const [selectedPayment, setSelectedPayment] = useState<'counter' | 'online' | 'waived'>('counter')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState('Medication')
  const [newPrice, setNewPrice] = useState('25')
  const [receipts, setReceipts] = useSessionState<
    Array<{ receiptNo: string; ic: string; patientName: string; amountPaid: number; method: string; time: string }>
  >(`billing-receipts:${user?.hospitalId || 'default'}`, [])

  const computedItems = billingItems.map((item) => {
    const effectiveSubsidyPct =
      selectedPayment === 'waived'
        ? 100
        : subsidyStatus === 'eligible'
          ? item.subsidyPercent
          : subsidyStatus === 'pending'
            ? Math.min(50, item.subsidyPercent)
            : 0
    const subsidyAmount = Number(((item.originalPrice * effectiveSubsidyPct) / 100).toFixed(2))
    const finalPrice = Math.max(0, Number((item.originalPrice - subsidyAmount).toFixed(2)))
    return { ...item, effectiveSubsidyPct, subsidyAmount, finalPrice }
  })

  const totalOriginal = computedItems.reduce((sum, item) => sum + item.originalPrice, 0)
  const totalSubsidy = computedItems.reduce((sum, item) => sum + item.subsidyAmount, 0)
  const totalFinal = computedItems.reduce((sum, item) => sum + item.finalPrice, 0)
  const subsidyPercent = totalOriginal > 0 ? Math.round((totalSubsidy / totalOriginal) * 100) : 0

  const addChargeItem = (e: React.FormEvent) => {
    e.preventDefault()
    const price = Math.max(0, Number.parseFloat(newPrice) || 0)
    if (!newDesc.trim() || price <= 0) return
    setBillingItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        category: newCategory,
        description: newDesc.trim(),
        originalPrice: price,
        subsidyPercent: newCategory === 'Medication' ? 95 : 100,
      },
    ])
    setNewDesc('')
    setNewPrice('25')
  }

  const removeChargeItem = (id: string) => {
    setBillingItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handlePrintReceipt = (receiptNo = `INV-${Date.now().toString().slice(-6)}`) => {
    const rows = computedItems
      .map(
        (i) =>
          `<tr><td>${i.category}</td><td>${i.description}</td><td>RM ${i.originalPrice.toFixed(2)}</td><td>${i.effectiveSubsidyPct}%</td><td>RM ${i.finalPrice.toFixed(2)}</td></tr>`
      )
      .join('')
    triggerPrintDocument(
      `Receipt ${receiptNo}`,
      `<h1>${theme.name} — Official Billing Statement</h1>
       <div class="meta">Receipt: <strong>${receiptNo}</strong> • Patient: <strong>${patient.fullName}</strong> (${patient.icNumber}) • Payment: ${selectedPayment.toUpperCase()}</div>
       <table><thead><tr><th>Category</th><th>Description</th><th>Gross Fee</th><th>Subsidy</th><th>Net Payable</th></tr></thead>
       <tbody>${rows}</tbody></table>
       <h2>Summary</h2>
       <p>Gross Total: RM ${totalOriginal.toFixed(2)} • MOH Subsidy: -RM ${totalSubsidy.toFixed(2)} (${subsidyPercent}%) • <strong>Net Payable: RM ${totalFinal.toFixed(2)}</strong></p>`
    )
  }

  const handleProcessPayment = () => {
    const receiptNo = `RCP-${Date.now().toString().slice(-6)}`
    setReceipts((prev) => [
      {
        receiptNo,
        ic: patient.icNumber,
        patientName: patient.fullName,
        amountPaid: totalFinal,
        method: selectedPayment,
        time: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 9),
    ])
    toast({
      title: `Payment Settled (${receiptNo})`,
      description: `Collected RM ${totalFinal.toFixed(2)} via ${selectedPayment.toUpperCase()} for ${patient.fullName}`,
    })
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Billing & MOH Subsidy</h2>
          <p className="text-gray-500 text-sm">Fees Act 1951 Schedule & Citizen Subsidy Calculator (session-persisted)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handlePrintReceipt()}
            disabled={computedItems.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            Print Receipt
          </button>
          <button
            onClick={handleProcessPayment}
            disabled={computedItems.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            <CreditCard className="w-5 h-5" />
            Settle Bill (RM {totalFinal.toFixed(2)})
          </button>
        </div>
      </div>

      <WorkstationPatientBar
        patient={patient}
        onLookup={lookupPatient}
        loading={loading}
        notice={lookupNotice}
        accentClass="from-emerald-50 to-green-50 border-emerald-200"
      />

      <div className="p-4 rounded-xl border-2 bg-white border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {subsidyStatus === 'eligible' ? (
            <BadgeCheck className="w-8 h-8 text-emerald-600" />
          ) : (
            <AlertCircle className="w-8 h-8 text-amber-600" />
          )}
          <div>
            <p className="font-bold text-gray-900">
              Subsidy Tier: {subsidyStatus === 'eligible' ? 'Citizen Full Subsidy' : subsidyStatus === 'pending' ? 'Partial / Pending Verification' : 'Non-Citizen Standard Tariff'}
            </p>
            <p className="text-xs text-gray-500">Switch tier on the right to preview tariff differences</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['eligible', 'pending', 'not-eligible'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSubsidyStatus(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                subsidyStatus === tier ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tier.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold">Malaysian Government Healthcare Schemes</h3>
            <p className="text-blue-100 text-xs">Automatic MyKad eligibility cross-check</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {subsidyPrograms.map((program) => (
            <div key={program.type} className="p-3 bg-white/10 backdrop-blur-sm rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-bold">{program.type}</span>
                <span className={`w-2 h-2 rounded-full ${program.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <p className="text-sm font-medium">{program.program}</p>
              <p className="text-xs text-blue-200 mt-1">{program.eligibility}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Itemized Charges ({computedItems.length})
            </h3>

            <form onSubmit={addChargeItem} className="flex flex-wrap items-center gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-2.5 py-1.5 border rounded-lg text-xs bg-white"
              >
                {['Consultation', 'Laboratory', 'Radiology', 'Medication', 'Procedure'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Charge description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="px-2.5 py-1.5 border rounded-lg text-xs w-40"
              />
              <input
                type="number"
                min={1}
                step="0.5"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="px-2.5 py-1.5 border rounded-lg text-xs w-20"
              />
              <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </form>
          </div>

          <div className="divide-y divide-gray-100">
            {computedItems.map((item) => {
              const Icon = getCategoryIcon(item.category)
              return (
                <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.description}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400 line-through">RM {item.originalPrice.toFixed(2)}</p>
                      <p className="text-xs text-emerald-600">-{item.effectiveSubsidyPct}% subsidy</p>
                    </div>
                    <div className="w-24">
                      <p className={`text-base font-bold ${item.finalPrice === 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {item.finalPrice === 0 ? 'FREE' : `RM ${item.finalPrice.toFixed(2)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChargeItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Gross Total</span>
              <span>RM {totalOriginal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span className="flex items-center gap-1.5">
                <Percent className="w-4 h-4" />
                Government Subsidy ({subsidyPercent}%)
              </span>
              <span>- RM {totalSubsidy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>TOTAL PAYABLE</span>
              <span className={totalFinal === 0 ? 'text-emerald-600' : ''}>
                {totalFinal === 0 ? 'FREE (RM 0.00)' : `RM ${totalFinal.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-7 h-7" />
              <span className="font-bold">Citizen Subsidy Applied</span>
            </div>
            <p className="text-3xl font-bold">RM {totalSubsidy.toFixed(2)}</p>
            <p className="text-emerald-100 text-xs mt-1">Covered by Ministry of Health Malaysia</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Payment Method</h3>
            <div className="space-y-2.5">
              {[
                { id: 'counter', label: 'Payment Counter', desc: 'Cash / MyDebit / Credit Card', icon: Building2 },
                { id: 'online', label: 'FPX / DuitNow QR', desc: 'Instant bank transfer', icon: CreditCard },
                { id: 'waived', label: '100% Fee Waiver', desc: 'Senior Citizen / OKU / B40 Welfare', icon: BadgeCheck },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPayment(method.id as typeof selectedPayment)}
                  className={`w-full p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    selectedPayment === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedPayment === method.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <method.icon className={`w-4 h-4 ${selectedPayment === method.id ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800 text-sm">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.desc}</p>
                  </div>
                  {selectedPayment === method.id && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Charges follow the <strong>Fees (Medical) Order / Fees Act 1951</strong>. Senior citizens and OKU cardholders qualify for full outpatient exemption.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center gap-4">
        <Calculator className="w-8 h-8 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          Settled receipts this session: <strong>{receipts.length}</strong>
          {receipts[0] && ` • Latest: ${receipts[0].receiptNo} (${receipts[0].patientName} — RM ${receipts[0].amountPaid.toFixed(2)})`}
        </p>
      </div>
    </div>
  )
}
