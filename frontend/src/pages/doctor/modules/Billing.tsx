import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Receipt, CreditCard, BadgeCheck, Gift,
  Building2, User, FileText, CheckCircle2, AlertCircle,
  Calculator, Percent, Shield, Heart, Printer
} from 'lucide-react'

interface BillingItem {
  id: string
  category: string
  description: string
  originalPrice: number
  subsidyPercent: number
  subsidyAmount: number
  finalPrice: number
}

interface SubsidyInfo {
  type: string
  program: string
  eligibility: string
  coverage: string
  status: 'active' | 'pending' | 'expired'
}
const mockBillingItems: BillingItem[] = [
  { id: '1', category: 'Konsultasi', description: 'Konsultasi Pakar - Perubatan Am', originalPrice: 30.00, subsidyPercent: 100, subsidyAmount: 30.00, finalPrice: 0 },
  { id: '2', category: 'Makmal', description: 'Full Blood Count (FBC)', originalPrice: 15.00, subsidyPercent: 100, subsidyAmount: 15.00, finalPrice: 0 },
  { id: '3', category: 'Makmal', description: 'Renal Function Test (RFT)', originalPrice: 25.00, subsidyPercent: 100, subsidyAmount: 25.00, finalPrice: 0 },
  { id: '4', category: 'Radiologi', description: 'Chest X-Ray (CXR)', originalPrice: 30.00, subsidyPercent: 100, subsidyAmount: 30.00, finalPrice: 0 },
  { id: '5', category: 'Ubat', description: 'Ubat (7 hari)', originalPrice: 45.00, subsidyPercent: 95, subsidyAmount: 42.75, finalPrice: 2.25 },
  { id: '6', category: 'Prosedur', description: 'Wound Dressing', originalPrice: 20.00, subsidyPercent: 100, subsidyAmount: 20.00, finalPrice: 0 },
]
const subsidyPrograms: SubsidyInfo[] = [
  { type: 'KKM', program: 'Subsidi Kerajaan Malaysia', eligibility: 'Warganegara Malaysia', coverage: 'Perkhidmatan kesihatan awam', status: 'active' },
  { type: 'MySalam', program: 'Skim Perlindungan MySalam', eligibility: 'B40 - Pendapatan < RM4,000', coverage: 'Penyakit kritikal', status: 'active' },
  { type: 'PeKa B40', program: 'Skim Peduli Kesihatan B40', eligibility: 'B40 - 40 tahun ke atas', coverage: 'Saringan kesihatan percuma', status: 'active' },
  { type: 'SOCSO', program: 'PERKESO - Caruman Pekerja', eligibility: 'Pekerja berdaftar', coverage: 'Kemalangan kerja, OKU', status: 'pending' },
]

interface BillingProps {
  patientName?: string
  patientIC?: string
  subsidyStatus?: 'eligible' | 'not-eligible' | 'pending'
}

export default function Billing({ 
  patientName = 'Ahmad bin Abdullah',
  patientIC = '880515-14-5678',
  subsidyStatus = 'eligible'
}: BillingProps) {
  const [billingItems] = useState<BillingItem[]>(mockBillingItems)
  const [selectedPayment, setSelectedPayment] = useState<'counter' | 'online' | 'waived'>('counter')

  const totalOriginal = billingItems.reduce((sum, item) => sum + item.originalPrice, 0)
  const totalSubsidy = billingItems.reduce((sum, item) => sum + item.subsidyAmount, 0)
  const totalFinal = billingItems.reduce((sum, item) => sum + item.finalPrice, 0)
  const subsidyPercent = Math.round((totalSubsidy / totalOriginal) * 100)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Konsultasi': return User
      case 'Makmal': return FileText
      case 'Radiologi': return FileText
      case 'Ubat': return Heart
      case 'Prosedur': return FileText
      default: return Receipt
    }
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bil & Pembayaran</h2>
          <p className="text-gray-500">Billing & Subsidies • Maklumat Caj & Subsidi</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            whileHover={{ scale: 1.02 }}
          >
            <Printer className="w-5 h-5" />
            Cetak Resit
          </motion.button>
          <motion.button
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CreditCard className="w-5 h-5" />
            Proses Pembayaran
          </motion.button>
        </div>
      </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">{patientName}</p>
              <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{patientIC}</code>
            </div>
          </div>
        </div>

                <div className={`p-5 rounded-xl border-2 ${
          subsidyStatus === 'eligible' ? 'bg-emerald-50 border-emerald-200' :
          subsidyStatus === 'pending' ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {subsidyStatus === 'eligible' ? (
                <BadgeCheck className="w-8 h-8 text-emerald-600" />
              ) : subsidyStatus === 'pending' ? (
                <AlertCircle className="w-8 h-8 text-amber-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <p className={`font-bold ${
                  subsidyStatus === 'eligible' ? 'text-emerald-800' :
                  subsidyStatus === 'pending' ? 'text-amber-800' : 'text-red-800'
                }`}>
                  {subsidyStatus === 'eligible' ? 'LAYAK SUBSIDI' :
                   subsidyStatus === 'pending' ? 'PENGESAHAN DIPERLUKAN' : 'TIDAK LAYAK'}
                </p>
                <p className={`text-sm ${
                  subsidyStatus === 'eligible' ? 'text-emerald-600' :
                  subsidyStatus === 'pending' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {subsidyStatus === 'eligible' ? 'Warganegara Malaysia - Subsidi Penuh' :
                   subsidyStatus === 'pending' ? 'Sila kemukakan dokumen tambahan' : 'Bukan warganegara'}
                </p>
              </div>
            </div>
            <Shield className={`w-12 h-12 ${
              subsidyStatus === 'eligible' ? 'text-emerald-200' :
              subsidyStatus === 'pending' ? 'text-amber-200' : 'text-red-200'
            }`} />
          </div>
        </div>
      </div>

            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Program Subsidi Kerajaan Malaysia</h3>
            <p className="text-blue-100">Perlindungan kesihatan untuk rakyat Malaysia</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          {subsidyPrograms.map((program, idx) => (
            <motion.div
              key={idx}
              className="p-3 bg-white/10 backdrop-blur-sm rounded-lg"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-bold">{program.type}</span>
                <span className={`w-2 h-2 rounded-full ${
                  program.status === 'active' ? 'bg-emerald-400' :
                  program.status === 'pending' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
              </div>
              <p className="text-sm font-medium">{program.program}</p>
              <p className="text-xs text-blue-200 mt-1">{program.eligibility}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Senarai Caj
            </h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {billingItems.map((item) => {
              const Icon = getCategoryIcon(item.category)
              return (
                <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.description}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-sm text-gray-400 line-through">RM {item.originalPrice.toFixed(2)}</p>
                        <p className="text-xs text-emerald-600">-{item.subsidyPercent}% subsidi</p>
                      </div>
                      <div className="w-24">
                        <p className={`text-lg font-bold ${item.finalPrice === 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
                          {item.finalPrice === 0 ? 'PERCUMA' : `RM ${item.finalPrice.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Jumlah Asal</span>
                <span>RM {totalOriginal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Subsidi Kerajaan ({subsidyPercent}%)
                </span>
                <span>- RM {totalSubsidy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
                <span>JUMLAH BAYAR</span>
                <span className={totalFinal === 0 ? 'text-emerald-600' : ''}>
                  {totalFinal === 0 ? 'PERCUMA' : `RM ${totalFinal.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

                <div className="space-y-4">
                    <motion.div 
            className="p-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Gift className="w-8 h-8" />
              <span className="font-bold">Penjimatan Anda</span>
            </div>
            <p className="text-4xl font-bold">RM {totalSubsidy.toFixed(2)}</p>
            <p className="text-emerald-100 text-sm mt-1">Subsidi oleh Kerajaan Malaysia</p>
            <div className="mt-4 p-3 bg-white/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm">Terima kasih kerana menggunakan perkhidmatan kesihatan awam</span>
              </div>
            </div>
          </motion.div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Kaedah Pembayaran</h3>
            <div className="space-y-3">
              {[
                { id: 'counter', label: 'Kaunter Bayaran', desc: 'Tunai / Kad', icon: Building2 },
                { id: 'online', label: 'FPX Online', desc: 'Maybank, CIMB, dll', icon: CreditCard },
                { id: 'waived', label: 'Dikecualikan', desc: 'B40 / OKU / Warga Emas', icon: BadgeCheck },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id as typeof selectedPayment)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedPayment === method.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedPayment === method.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <method.icon className={`w-5 h-5 ${
                      selectedPayment === method.id ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.desc}</p>
                  </div>
                  {selectedPayment === method.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Maklumat Subsidi</p>
                <p className="text-xs text-blue-600 mt-1">
                  Subsidi kesihatan disediakan oleh Kementerian Kesihatan Malaysia (KKM) untuk semua warganegara. 
                  Kadar caj adalah tertakluk kepada <strong>Akta Fi 1951</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
        <div className="flex items-center gap-4">
          <Calculator className="w-10 h-10 text-amber-600" />
          <div>
            <h3 className="font-bold text-amber-800">Jadual Caj Hospital Kerajaan Malaysia</h3>
            <p className="text-sm text-amber-700 mt-1">
              Warganegara Malaysia: Kelas 3 (Percuma untuk kebanyakan perkhidmatan) | 
              Bukan Warganegara: Kadar penuh mengikut jadual fi KKM
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
