import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  UserCheck,
  AlertTriangle,
  Loader2,
  X,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { useClinicalStore, type ActiveClinicalPatient } from '@/store/clinical'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from '@/lib/i18n'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { cn, formatIC, isValidMyKad, parseMyKadDemographics } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { useToast } from '@/components/ui/use-toast'

export function WorkstationModuleHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  badge?: string
  actions?: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  const theme = getHospitalTheme(user?.hospitalId)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={cn(
            'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm shrink-0',
            theme.buttonGradient
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
            <Badge className={cn('text-[11px] border', theme.badgeClass)}>
              {badge || theme.shortName}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  )
}

export function PatientRequiredGate({ moduleTitle }: { moduleTitle: string }) {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto mb-3">
        <UserCheck className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-slate-900">{t.patientRequiredTitle}</h2>
      <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1.5 leading-relaxed">
        {t.patientRequiredDesc}
      </p>
      <p className="text-[11px] font-semibold text-blue-700 mt-3">
        Workstation Module: {moduleTitle}
      </p>
    </div>
  )
}

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
  const [inputError, setInputError] = useState('')
  const [privacyRevokedNotice, setPrivacyRevokedNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const verifySeqRef = useRef(0)

  // Live backend consent & allergy re-verification whenever a cached patient is bound
  useEffect(() => {
    const boundIc = activePatient?.icNumber
    if (!boundIc || !user || user.role !== 'doctor') return
    if (!isValidMyKad(boundIc)) {
      clearActivePatient()
      return
    }

    const controller = new AbortController()
    const seq = ++verifySeqRef.current
    centralApi.getPatient(boundIc, controller.signal).then((res) => {
      if (res.aborted || controller.signal.aborted || seq !== verifySeqRef.current) return
      if (res.accessDenied) {
        clearActivePatient()
        setPrivacyRevokedNotice(
          `${boundIc}: ${res.error || t.privacyRestrictedDesc}`
        )
        toast({
          title: t.privacyRestrictedTitle,
          description: res.error || t.privacyRestrictedDesc,
          variant: 'destructive',
        })
      } else if (res.success && res.data?.patient) {
        const p = res.data.patient
        const refreshedAllergies = Array.isArray(p.allergies) ? (p.allergies as string[]) : []
        const refreshedConditions = Array.isArray(p.chronicConditions)
          ? (p.chronicConditions as string[])
          : []
        const nextBlood = String(p.bloodType || '')
        const nextName = String(p.fullName || activePatient?.fullName || 'Patient')

        if (
          activePatient &&
          activePatient.icNumber === boundIc &&
          (activePatient.fullName !== nextName ||
            activePatient.bloodType !== nextBlood ||
            activePatient.allergiesUnverified ||
            JSON.stringify(activePatient.allergies) !== JSON.stringify(refreshedAllergies) ||
            JSON.stringify(activePatient.chronicConditions) !== JSON.stringify(refreshedConditions))
        ) {
          setActivePatient({
            ...activePatient,
            fullName: nextName,
            dateOfBirth: String(p.dateOfBirth || activePatient.dateOfBirth || ''),
            gender: String(p.gender || activePatient.gender || ''),
            bloodType: nextBlood,
            allergies: refreshedAllergies,
            allergiesUnverified: false,
            chronicConditions: refreshedConditions,
            phone: p.phone ? String(p.phone) : activePatient.phone,
            scopedHospitalId: user.hospitalId,
            scopedDoctorId: user.doctorId,
          })
        }
      }
    })
    return () => {
      controller.abort()
    }
  }, [activePatient?.icNumber, user?.hospitalId, user?.role])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const formatted = formatIC(icInput.trim())
    if (!formatted) return

    if (!isValidMyKad(formatted)) {
      setInputError(t.invalidMyKadFormat)
      toast({
        title: 'Invalid MyKad IC',
        description: t.invalidMyKadFormat,
        variant: 'destructive',
      })
      return
    }

    setInputError('')
    setPrivacyRevokedNotice('')
    const seq = ++verifySeqRef.current
    setLoading(true)

    try {
      const res = await centralApi.getPatient(formatted)
      if (seq !== verifySeqRef.current) return

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
        clearActivePatient()
        setPrivacyRevokedNotice(`${formatted}: ${res.error || t.privacyRestrictedDesc}`)
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
          title: t.loadFailedTitle,
          description: res.error || t.networkError,
          variant: 'destructive',
        })
      }
    } finally {
      if (seq === verifySeqRef.current) {
        setLoading(false)
      }
    }
  }

  const isAllergiesUnverified = Boolean(
    activePatient &&
      (activePatient.allergiesUnverified || activePatient.fullName.startsWith('Walk-in Patient ('))
  )

  return (
    <div className="space-y-2.5">
      {privacyRevokedNotice && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 flex items-center justify-between gap-3 text-xs text-red-900"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
            <div>
              <strong className="font-bold">{t.privacyRestrictedTitle}: </strong>
              <span>{privacyRevokedNotice}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPrivacyRevokedNotice('')}
            className="p-1 rounded-lg text-red-700 hover:bg-red-100"
            aria-label="Dismiss privacy alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                  {activePatient.gender && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {activePatient.gender}
                    </Badge>
                  )}
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
                onClick={() => {
                  verifySeqRef.current += 1
                  clearActivePatient()
                }}
                className="text-slate-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                <span>{t.switchPatient}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <form onSubmit={handleLookup} className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 shrink-0">
                <Search className="w-4 h-4 text-blue-600" />
                <span>{t.activeConsultationPatient}:</span>
              </div>
              <Input
                value={icInput}
                onChange={(e) => {
                  setIcInput(e.target.value)
                  if (inputError) setInputError('')
                }}
                placeholder={t.quickSearchPlaceholder}
                aria-invalid={Boolean(inputError)}
                className="h-10 font-mono text-sm flex-1 min-w-[240px] tabular-nums"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !icInput.trim()}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                <span>{t.bindPatient}</span>
              </Button>
            </form>
            {inputError && (
              <p role="alert" className="text-xs font-medium text-red-600 pl-6">
                {inputError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
