import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserCheck, AlertTriangle, Loader2, X, ExternalLink } from 'lucide-react'
import { useClinicalStore, type ActiveClinicalPatient } from '@/store/clinical'
import { centralApi } from '@/lib/api'
import { formatIC, parseMyKadDemographics } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

export function ClinicalPatientBanner({
  onPatientLoaded,
}: {
  onPatientLoaded?: (patient: ActiveClinicalPatient) => void
}) {
  const { activePatient, setActivePatient, clearActivePatient } = useClinicalStore()
  const { toast } = useToast()
  const [icInput, setIcInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const formatted = formatIC(icInput.trim())
    if (!formatted) return

    setLoading(true)
    try {
      const res = await centralApi.getPatient(formatted)
      if (res.success && res.data?.patient) {
        const p = res.data.patient
        const loaded: ActiveClinicalPatient = {
          icNumber: formatted,
          fullName: String(p.fullName || 'Patient'),
          dateOfBirth: String(p.dateOfBirth || ''),
          gender: String(p.gender || ''),
          bloodType: String(p.bloodType || ''),
          allergies: Array.isArray(p.allergies) ? (p.allergies as string[]) : [],
          chronicConditions: Array.isArray(p.chronicConditions) ? (p.chronicConditions as string[]) : [],
          phone: p.phone ? String(p.phone) : undefined,
        }
        setActivePatient(loaded)
        onPatientLoaded?.(loaded)
        setIcInput('')
        toast({
          title: 'Active Patient Loaded',
          description: `${loaded.fullName} (${loaded.icNumber}) linked to clinical session`,
        })
      } else if (res.accessDenied) {
        toast({
          title: 'Privacy Policy Restricted',
          description: res.error || 'Patient has restricted access from your hospital.',
          variant: 'destructive',
        })
      } else {
        const inferred = parseMyKadDemographics(formatted)
        const provisional: ActiveClinicalPatient = {
          icNumber: formatted,
          fullName: `Walk-in Patient (${formatted})`,
          dateOfBirth: inferred?.dateOfBirth || '',
          gender: inferred?.gender || '',
          bloodType: 'Unknown',
          allergies: [],
          chronicConditions: [],
        }
        setActivePatient(provisional)
        onPatientLoaded?.(provisional)
        setIcInput('')
        toast({
          title: 'Unindexed Patient Selected',
          description: 'No existing federated record found; initialized walk-in clinical session.',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      {activePatient ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900">{activePatient.fullName}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {activePatient.icNumber}
                </Badge>
                {activePatient.bloodType && activePatient.bloodType !== 'Unknown' && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                    Blood: {activePatient.bloodType}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-slate-500">
                {activePatient.allergies.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Allergies: {activePatient.allergies.join(', ')}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">No Known Drug Allergies (NKDA)</span>
                )}
                {activePatient.chronicConditions.length > 0 && (
                  <span>• Conditions: {activePatient.chronicConditions.join(', ')}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/doctor/patient/${encodeURIComponent(activePatient.icNumber)}`}>
              <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Timeline
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearActivePatient}
              className="rounded-xl text-xs text-slate-500 hover:text-red-600"
            >
              <X className="w-4 h-4 mr-1" />
              Switch Patient
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 shrink-0">
            <Search className="w-4 h-4 text-blue-600" />
            <span>Active Consultation Patient:</span>
          </div>
          <Input
            value={icInput}
            onChange={(e) => setIcInput(e.target.value)}
            placeholder="Enter MyKad IC (e.g. 880101-14-5678) to bind patient..."
            className="h-10 font-mono text-sm flex-1"
          />
          <Button type="submit" size="sm" disabled={loading || !icInput.trim()} className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Bind Patient
          </Button>
        </form>
      )}
    </div>
  )
}
