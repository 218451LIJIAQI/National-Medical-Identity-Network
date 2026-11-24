import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserCheck, AlertTriangle, Loader2, X, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useClinicalStore, type ActiveClinicalPatient } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from '@/lib/i18n'
import { centralApi } from '@/lib/api'
import { formatIC, parseMyKadDemographics } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'

export function ClinicalPatientBanner({
  onPatientLoaded,
}: {
  onPatientLoaded?: (patient: ActiveClinicalPatient) => void
}) {
  const { activePatient, setActivePatient, clearActivePatient } = useClinicalStore()
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation()
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
          allergiesUnverified: false,
          chronicConditions: Array.isArray(p.chronicConditions) ? (p.chronicConditions as string[]) : [],
          phone: p.phone ? String(p.phone) : undefined,
          scopedHospitalId: user?.hospitalId,
          scopedDoctorId: user?.doctorId,
        }
        setActivePatient(loaded)
        onPatientLoaded?.(loaded)
        setIcInput('')
        toast({
          title: 'Active Patient Linked',
          description: `${loaded.fullName} (${loaded.icNumber}) bound to clinical workstation.`,
          variant: 'success',
        })
      } else if (res.accessDenied) {
        toast({
          title: t.privacyRestrictedTitle,
          description: res.error || t.privacyRestrictedDesc,
          variant: 'destructive',
        })
      } else if (res.notFound || res.status === 404) {
        const inferred = parseMyKadDemographics(formatted)
        const provisional: ActiveClinicalPatient = {
          icNumber: formatted,
          fullName: `Walk-in Patient (${formatted})`,
          dateOfBirth: inferred?.dateOfBirth || '',
          gender: inferred?.gender || '',
          bloodType: 'Unknown',
          allergies: [],
          allergiesUnverified: true,
          chronicConditions: [],
          scopedHospitalId: user?.hospitalId,
          scopedDoctorId: user?.doctorId,
        }
        setActivePatient(provisional)
        onPatientLoaded?.(provisional)
        setIcInput('')
        toast({
          title: 'Walk-in Patient Initialized',
          description: 'No federated record found. Please verify drug allergies directly with the patient.',
        })
      } else {
        toast({
          title: 'Unable to Verify Patient Profile',
          description: res.error || t.networkError,
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const isAllergiesUnverified = Boolean(
    activePatient &&
      (activePatient.allergiesUnverified || activePatient.fullName.startsWith('Walk-in Patient ('))
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      {activePatient ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900">{activePatient.fullName}</span>
                <Badge variant="outline" className="font-mono text-xs tabular-nums">
                  {activePatient.icNumber}
                </Badge>
                {activePatient.bloodType && activePatient.bloodType !== 'Unknown' && (
                  <Badge className="bg-red-50 text-red-800 border-red-200 text-xs font-bold">
                    Blood: {activePatient.bloodType}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-slate-700">
                {activePatient.allergies.length > 0 ? (
                  <StatusBadge
                    tone="critical"
                    icon={AlertTriangle}
                    label={`Allergies: ${activePatient.allergies.join(', ')}`}
                  />
                ) : isAllergiesUnverified ? (
                  <StatusBadge
                    tone="warning"
                    icon={AlertTriangle}
                    label={t.walkInAllergyWarning}
                  />
                ) : (
                  <StatusBadge
                    tone="success"
                    icon={CheckCircle2}
                    label={t.nkdaVerified}
                  />
                )}
                {activePatient.chronicConditions.length > 0 && (
                  <span className="font-medium text-slate-600">
                    • Chronic: {activePatient.chronicConditions.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/doctor/patient/${encodeURIComponent(activePatient.icNumber)}`}>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearActivePatient}
              className="text-slate-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              <span>{t.switchPatient}</span>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLookup} className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 shrink-0">
            <Search className="w-4 h-4 text-blue-600" />
            <span>{t.activeConsultationPatient}:</span>
          </div>
          <Input
            value={icInput}
            onChange={(e) => setIcInput(e.target.value)}
            placeholder={t.quickSearchPlaceholder}
            className="h-10 font-mono text-sm flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || !icInput.trim()}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            <span>{t.bindPatient}</span>
          </Button>
        </form>
      )}
    </div>
  )
}
