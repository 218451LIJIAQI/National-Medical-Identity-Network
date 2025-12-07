import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { hospitalApi, centralApi } from '@/lib/api'
import { ArrowLeft, Save, Loader2, FileText, Calendar, Stethoscope, User, AlertTriangle, Heart, Thermometer, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function NewRecord() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const [saving, setSaving] = useState(false)
  const [loadingPatient, setLoadingPatient] = useState(true)
  const [patientExists, setPatientExists] = useState(false)
  const [patientInfo, setPatientInfo] = useState<{
    fullName: string
    dateOfBirth: string
    gender: string
    bloodType: string
    allergies: string[]
    chronicConditions: string[]
  } | null>(null)
  
  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'outpatient',
    chiefComplaint: '',
    diagnosis: '',
    symptoms: '',
    notes: '',
    patientName: '',
    // Vital Signs
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
  })

  // Load patient info on mount
  useEffect(() => {
    async function loadPatient() {
      if (!icNumber) return
      try {
        const response = await centralApi.getPatient(icNumber)
        if (response.success && response.data?.patient) {
          const p = response.data.patient as any
          setPatientExists(true)
          setPatientInfo({
            fullName: p.fullName,
            dateOfBirth: p.dateOfBirth,
            gender: p.gender,
            bloodType: p.bloodType || '',
            allergies: p.allergies || [],
            chronicConditions: p.chronicConditions || [],
          })
          setFormData(prev => ({ ...prev, patientName: p.fullName }))
        } else {
          setPatientExists(false)
        }
      } catch {
        setPatientExists(false)
      } finally {
        setLoadingPatient(false)
      }
    }
    loadPatient()
  }, [icNumber])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.diagnosis.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a diagnosis',
        variant: 'destructive',
      })
      return
    }

    if (!user?.hospitalId || !user?.doctorId) {
      toast({
        title: 'Error',
        description: 'Hospital ID or Doctor ID not found. Please re-login.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // Build vital signs object if any values provided
      const vitalSigns: Record<string, unknown> = {}
      if (formData.bloodPressureSystolic) vitalSigns.bloodPressureSystolic = Number(formData.bloodPressureSystolic)
      if (formData.bloodPressureDiastolic) vitalSigns.bloodPressureDiastolic = Number(formData.bloodPressureDiastolic)
      if (formData.heartRate) vitalSigns.heartRate = Number(formData.heartRate)
      if (formData.temperature) vitalSigns.temperature = Number(formData.temperature)
      if (formData.weight) vitalSigns.weight = Number(formData.weight)
      if (formData.height) vitalSigns.height = Number(formData.height)

      const response = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: icNumber || '',
        doctorId: user.doctorId,
        visitDate: formData.visitDate,
        visitType: formData.visitType,
        chiefComplaint: formData.chiefComplaint,
        diagnosis: formData.diagnosis.split(',').map(d => d.trim()).filter(Boolean),
        symptoms: formData.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        notes: formData.notes,
        vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
        patientName: formData.patientName || undefined,
      } as any)

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Medical record saved successfully',
        })
        navigate(`/doctor/patient/${encodeURIComponent(icNumber || '')}`)
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to save record',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while saving',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white shadow-2xl shadow-emerald-500/25"
      >
        <motion.div 
          className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-teal-300/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        
        <div className="relative z-10 flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="bg-white/20 hover:bg-white/30 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <FileText className="w-7 h-7" />
            </motion.div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">
                <Stethoscope className="w-3 h-3 mr-1" /> New Record
              </Badge>
              <h1 className="text-3xl font-bold drop-shadow-lg">New Medical Record</h1>
              <p className="text-emerald-100">Patient IC: <span className="font-mono font-semibold">{icNumber}</span></p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Patient Info Card */}
      {loadingPatient ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading patient info...</span>
          </CardContent>
        </Card>
      ) : patientInfo ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 ${theme.bgLight} rounded-xl`}>
                  <User className={`w-6 h-6 ${theme.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{patientInfo.fullName}</h3>
                  <p className="text-gray-500 text-sm">
                    {patientInfo.gender} • {patientInfo.bloodType || 'Blood type unknown'} • DOB: {patientInfo.dateOfBirth}
                  </p>
                  {patientInfo.allergies.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700 text-sm font-medium">Allergies: {patientInfo.allergies.join(', ')}</span>
                    </div>
                  )}
                  {patientInfo.chronicConditions.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {patientInfo.chronicConditions.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">New Patient</p>
                <p className="text-sm text-amber-600">This patient will be registered automatically when you save the record.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <motion.div 
            className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`}
            style={{ backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className={`p-2 ${theme.bgLight} rounded-lg`}>
                <Calendar className={`w-5 h-5 ${theme.iconColor}`} />
              </div>
              Visit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Visit Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitDate">Visit Date</Label>
                <Input 
                  id="visitDate"
                  type="date" 
                  value={formData.visitDate}
                  onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitType">Visit Type</Label>
                <select 
                  id="visitType"
                  title="Visit Type"
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm text-sm font-medium text-gray-900 transition-all duration-300 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none cursor-pointer"
                  value={formData.visitType}
                  onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                >
                  <option value="outpatient">🏥 Outpatient</option>
                  <option value="inpatient">🛏️ Inpatient</option>
                  <option value="emergency">🚨 Emergency</option>
                </select>
              </div>
            </div>

            {/* Patient Name (for new patients) */}
            {!patientExists && (
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Full Name *</Label>
                <Input 
                  id="patientName"
                  placeholder="Enter patient's full name" 
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  required={!patientExists}
                />
              </div>
            )}

            {/* Vital Signs */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                Vital Signs
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bp" className="text-xs text-gray-500 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Blood Pressure
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="bp"
                      placeholder="120" 
                      value={formData.bloodPressureSystolic}
                      onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                      className="w-16 text-center"
                    />
                    <span>/</span>
                    <Input 
                      placeholder="80" 
                      value={formData.bloodPressureDiastolic}
                      onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                      className="w-16 text-center"
                    />
                    <span className="text-xs text-gray-400">mmHg</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hr" className="text-xs text-gray-500">Heart Rate</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="hr"
                      placeholder="72" 
                      value={formData.heartRate}
                      onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                      className="w-20"
                    />
                    <span className="text-xs text-gray-400">bpm</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="temp" className="text-xs text-gray-500 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Temperature
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="temp"
                      placeholder="36.5" 
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      className="w-20"
                    />
                    <span className="text-xs text-gray-400">°C</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="weight" className="text-xs text-gray-500">Weight</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="weight"
                      placeholder="70" 
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-20"
                    />
                    <span className="text-xs text-gray-400">kg</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="height" className="text-xs text-gray-500">Height</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      id="height"
                      placeholder="170" 
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-20"
                    />
                    <span className="text-xs text-gray-400">cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <textarea 
                id="chiefComplaint"
                className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm text-sm font-medium text-gray-900 transition-all duration-300 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none resize-none placeholder:text-gray-400" 
                rows={2} 
                placeholder="Patient's main reason for visit..."
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              />
            </div>

            {/* Symptoms */}
            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms</Label>
              <Input 
                id="symptoms"
                placeholder="e.g., Headache, Fever, Fatigue (comma-separated)" 
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              />
            </div>

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis * (comma-separated for multiple)</Label>
              <Input 
                id="diagnosis"
                placeholder="e.g., Essential Hypertension, Type 2 Diabetes" 
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                required
              />
            </div>

            {/* Clinical Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <textarea 
                id="notes"
                className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm text-sm font-medium text-gray-900 transition-all duration-300 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none resize-none placeholder:text-gray-400" 
                rows={4} 
                placeholder="Detailed clinical notes, examination findings, treatment plan..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Submit Buttons - Premium Design */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)} 
                  disabled={saving}
                  className="h-12 px-6 rounded-xl border-2 font-semibold"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className={`h-12 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-xl ${theme.shadowColor}/40 hover:shadow-2xl font-semibold transition-all`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving Record...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save Medical Record
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
