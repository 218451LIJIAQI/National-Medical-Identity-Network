import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { ArrowLeft, Save, Loader2, FileText, Calendar, Stethoscope } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

export default function NewRecord() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'outpatient',
    chiefComplaint: '',
    diagnosis: '',
    notes: '',
  })

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
      const response = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: icNumber,
        doctorId: user.doctorId,
        visitDate: formData.visitDate,
        visitType: formData.visitType,
        chiefComplaint: formData.chiefComplaint,
        diagnosis: [formData.diagnosis],
        notes: formData.notes,
      })

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
          <motion.div 
            className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
            style={{ backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              Visit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full p-2 border rounded-md"
                  value={formData.visitType}
                  onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                >
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <textarea 
                id="chiefComplaint"
                className="w-full p-2 border rounded-md" 
                rows={3} 
                placeholder="Patient's main reason for visit..."
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis *</Label>
              <Input 
                id="diagnosis"
                placeholder="Primary diagnosis" 
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <textarea 
                id="notes"
                className="w-full p-2 border rounded-md" 
                rows={5} 
                placeholder="Detailed clinical notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Record
                  </>
                )}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
