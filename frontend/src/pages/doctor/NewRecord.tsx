import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { hospitalApi } from '@/lib/api'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

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

    if (!user?.hospitalId) {
      toast({
        title: 'Error',
        description: 'Hospital ID not found',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const response = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: icNumber,
        doctorId: user.id,
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Medical Record</h1>
          <p className="text-gray-500">Patient: {icNumber}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
    </div>
  )
}
