import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, Calendar, Clock, Printer, Send, 
  User, Building2, CheckCircle2, AlertTriangle,
  Eye
} from 'lucide-react'

interface MCData {
  patientName: string
  icNumber: string
  diagnosis: string
  daysOff: number
  startDate: string
  endDate: string
  remarks: string
  fitForLight: boolean
  followUp: boolean
  followUpDate?: string
}

interface MedicalCertificateProps {
  patientName?: string
  patientIC?: string
  diagnosis?: string
  doctorName?: string
  hospitalName?: string
  onSubmit?: (data: MCData) => void
}

export default function MedicalCertificate({
  patientName = 'Ahmad bin Abdullah',
  patientIC = '880515-14-5678',
  diagnosis = 'Upper Respiratory Tract Infection (URTI)',
  doctorName = 'Dr. Lee Wei Ming',
  hospitalName = 'Hospital Kuala Lumpur',
  onSubmit
}: MedicalCertificateProps) {
  const [formData, setFormData] = useState<MCData>({
    patientName,
    icNumber: patientIC,
    diagnosis,
    daysOff: 2,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    remarks: '',
    fitForLight: false,
    followUp: false,
  })
  const [showPreview, setShowPreview] = useState(false)
  const [mcNumber] = useState(`MC/${new Date().getFullYear()}/${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`)

  const updateField = (field: keyof MCData, value: string | number | boolean) => {
    setFormData({ ...formData, [field]: value })
    if (field === 'daysOff' && typeof value === 'number') {
      const start = new Date(formData.startDate)
      const end = new Date(start.getTime() + (value - 1) * 86400000)
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        endDate: end.toISOString().split('T')[0] 
      }))
    }
    if (field === 'startDate' && typeof value === 'string') {
      const start = new Date(value)
      const end = new Date(start.getTime() + (formData.daysOff - 1) * 86400000)
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        endDate: end.toISOString().split('T')[0] 
      }))
    }
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(formData)
    }
  }

  const formatMalaysianDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ms-MY', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sijil Cuti Sakit (MC)</h2>
          <p className="text-gray-500">Medical Certificate • Sijil Perubatan</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            whileHover={{ scale: 1.02 }}
          >
            <Eye className="w-5 h-5" />
            {showPreview ? 'Edit' : 'Preview'}
          </motion.button>
          <motion.button
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            whileHover={{ scale: 1.02 }}
          >
            <Printer className="w-5 h-5" />
            Cetak
          </motion.button>
          <motion.button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Send className="w-5 h-5" />
            Jana MC
          </motion.button>
        </div>
      </div>

      {showPreview ? (
        /* MC Preview */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border-2 border-gray-200 shadow-xl overflow-hidden max-w-2xl mx-auto"
        >
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{hospitalName}</h3>
                  <p className="text-blue-100">Kementerian Kesihatan Malaysia</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">No. MC:</p>
                <p className="font-mono font-bold">{mcNumber}</p>
              </div>
            </div>
          </div>

                    <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6 border-b-2 border-gray-200 pb-4">
              SIJIL CUTI SAKIT<br />
              <span className="text-base font-normal text-gray-500">MEDICAL CERTIFICATE</span>
            </h2>

            <div className="space-y-4 text-gray-700">
              <p>
                Ini adalah untuk mengesahkan bahawa<br />
                <span className="text-sm text-gray-500">This is to certify that</span>
              </p>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xl font-bold text-gray-800">{formData.patientName}</p>
                <p className="text-gray-600">No. K/P: {formData.icNumber}</p>
              </div>

              <p>
                telah diperiksa dan didapati tidak sihat untuk bekerja selama<br />
                <span className="text-sm text-gray-500">has been examined and found unfit for work for</span>
              </p>

              <div className="flex items-center justify-center gap-4 py-4">
                <span className="text-4xl font-bold text-blue-600">{formData.daysOff}</span>
                <span className="text-xl text-gray-600">HARI / DAYS</span>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Dari / From:</p>
                  <p className="font-semibold text-gray-800">{formatMalaysianDate(formData.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hingga / Until:</p>
                  <p className="font-semibold text-gray-800">{formatMalaysianDate(formData.endDate)}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Diagnosis:</p>
                <p className="font-medium text-gray-800">{formData.diagnosis}</p>
              </div>

              {formData.fitForLight && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <p className="text-amber-800">Sesuai untuk kerja ringan sahaja / Fit for light duties only</p>
                </div>
              )}

              {formData.remarks && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Catatan / Remarks:</p>
                  <p className="text-gray-800">{formData.remarks}</p>
                </div>
              )}
            </div>

                        <div className="mt-8 pt-6 border-t-2 border-gray-200">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-500">Tarikh / Date:</p>
                  <p className="font-medium text-gray-800">{formatMalaysianDate(new Date().toISOString())}</p>
                </div>
                <div className="text-right">
                  <div className="w-40 border-b-2 border-gray-400 mb-2"></div>
                  <p className="font-semibold text-gray-800">{doctorName}</p>
                  <p className="text-sm text-gray-500">Pegawai Perubatan</p>
                  <p className="text-xs text-gray-400">MMC No: 12345</p>
                </div>
              </div>
            </div>
          </div>

                    <div className="bg-gray-50 p-4 text-center border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Sijil ini dijana secara elektronik dan sah tanpa tandatangan<br />
              This certificate is electronically generated and valid without signature
            </p>
          </div>
        </motion.div>
      ) : (
        /* Edit Form */
        <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Maklumat Pesakit
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nama Penuh</label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">No. Kad Pengenalan</label>
                <input
                  type="text"
                  value={formData.icNumber}
                  onChange={(e) => updateField('icNumber', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Diagnosis</label>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => updateField('diagnosis', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Upper Respiratory Tract Infection"
                />
              </div>
            </div>
          </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Butiran Cuti Sakit
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Bilangan Hari</label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 5, 7].map(days => (
                    <button
                      key={days}
                      onClick={() => updateField('daysOff', days)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formData.daysOff === days
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {days}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={formData.daysOff}
                    onChange={(e) => updateField('daysOff', parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="14"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tarikh Mula</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tarikh Tamat</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Catatan Tambahan</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => updateField('remarks', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  placeholder="Arahan tambahan jika ada..."
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.fitForLight}
                    onChange={(e) => updateField('fitForLight', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Sesuai untuk kerja ringan sahaja</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.followUp}
                    onChange={(e) => updateField('followUp', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Perlu susulan (Follow-up required)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

            <div className="grid grid-cols-3 gap-4">
        <motion.div 
          className="p-4 bg-blue-50 rounded-xl border border-blue-100"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">12</p>
              <p className="text-sm text-blue-600">MC hari ini</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="p-4 bg-emerald-50 rounded-xl border border-emerald-100"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold text-emerald-700">98%</p>
              <p className="text-sm text-emerald-600">Kadar pengesahan</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="p-4 bg-amber-50 rounded-xl border border-amber-100"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700">2.3</p>
              <p className="text-sm text-amber-600">Purata hari MC</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
