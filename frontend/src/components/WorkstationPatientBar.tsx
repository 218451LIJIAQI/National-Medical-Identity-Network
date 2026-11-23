import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { centralApi } from '@/lib/api'
import { formatIC, parseMyKadDemographics } from '@/lib/utils'
import { useSessionState } from '@/lib/workstation-storage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Search, AlertTriangle, Loader2, ExternalLink, Info } from 'lucide-react'

export interface ActiveWorkstationPatient {
  icNumber: string
  fullName: string
  gender: string
  bloodType: string
  age: number | null
  allergies: string[]
  chronicConditions: string[]
  activeMedications: string[]
  accessDenied?: boolean
}

const DEFAULT_PATIENT: ActiveWorkstationPatient = {
  icNumber: '880101-14-5678',
  fullName: 'Ahmad bin Abdullah',
  gender: 'male',
  bloodType: 'O+',
  age: parseMyKadDemographics('880101-14-5678').age,
  allergies: ['Penicillin', 'Shellfish'],
  chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
  activeMedications: ['Amlodipine 5mg'],
}

export function useWorkstationPatient(initialName?: string, initialIC?: string) {
  const [searchParams] = useSearchParams()
  const urlIc = searchParams.get('ic')
  const [patient, setPatient] = useSessionState<ActiveWorkstationPatient>('active-patient', () => ({
    ...DEFAULT_PATIENT,
    ...(initialName ? { fullName: initialName } : {}),
    ...(initialIC ? { icNumber: formatIC(initialIC) } : {}),
  }))
  const [loading, setLoading] = useState(false)
  const [lookupNotice, setLookupNotice] = useState<string>('')

  const lookupPatient = async (rawIc: string) => {
    const cleanIc = formatIC(rawIc)
    if (!cleanIc) return
    setLoading(true)
    setLookupNotice('')
    try {
      const [profileRes, queryRes] = await Promise.all([
        centralApi.getPatient(cleanIc),
        centralApi.queryPatient(cleanIc),
      ])

      if (profileRes.accessDenied || queryRes.data?.accessDenied) {
        setPatient({
          icNumber: cleanIc,
          fullName: `Restricted (${cleanIc})`,
          gender: '-',
          bloodType: '-',
          age: null,
          allergies: [],
          chronicConditions: [],
          activeMedications: [],
          accessDenied: true,
        })
        setLookupNotice('Patient has blocked cross-hospital record access for your hospital.')
        return
      }

      if (profileRes.success && profileRes.data?.patient) {
        const p = profileRes.data.patient
        const meds = new Set<string>()
        queryRes.data?.hospitals.forEach((h) => {
          h.records?.forEach((r) => {
            r.prescriptions?.forEach((rx) => {
              if (rx.isActive) meds.add(`${rx.medicationName} ${rx.dosage}`.trim())
            })
          })
        })
        const inferred = parseMyKadDemographics(cleanIc)
        setPatient({
          icNumber: cleanIc,
          fullName: p.fullName || `Patient ${cleanIc}`,
          gender: p.gender || inferred.gender,
          bloodType: p.bloodType || '',
          age: inferred.age,
          allergies: p.allergies || [],
          chronicConditions: p.chronicConditions || [],
          activeMedications: Array.from(meds),
          accessDenied: false,
        })
      } else {
        const inferred = parseMyKadDemographics(cleanIc)
        setPatient({
          icNumber: cleanIc,
          fullName: `Walk-in Patient (${cleanIc})`,
          gender: inferred.gender,
          bloodType: '',
          age: inferred.age,
          allergies: [],
          chronicConditions: [],
          activeMedications: [],
          accessDenied: false,
        })
        setLookupNotice('No prior national index entry found; using walk-in patient context.')
      }
    } catch {
      setLookupNotice('Could not reach central index; retaining current workstation context.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (urlIc && formatIC(urlIc) !== patient.icNumber) {
      lookupPatient(urlIc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIc])

  return { patient, setPatient, lookupPatient, loading, lookupNotice }
}

export function WorkstationPatientBar({
  patient,
  onLookup,
  loading,
  notice,
  accentClass = 'from-blue-50 to-indigo-50 border-blue-200',
  localToolNote = 'Hospital Workstation Tool (session-persisted workflow)',
}: {
  patient: ActiveWorkstationPatient
  onLookup: (ic: string) => void
  loading?: boolean
  notice?: string
  accentClass?: string
  localToolNote?: string
}) {
  const [icInput, setIcInput] = useState(patient.icNumber)

  useEffect(() => {
    setIcInput(patient.icNumber)
  }, [patient.icNumber])

  return (
    <div className={`p-4 bg-gradient-to-r ${accentClass} rounded-xl border space-y-3`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center shadow-sm">
            <User className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-base">{patient.fullName}</p>
              <code className="text-xs font-mono bg-white/90 px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                {patient.icNumber}
              </code>
              {patient.bloodType && patient.bloodType !== '-' && (
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  {patient.bloodType}
                </Badge>
              )}
              {patient.age !== null && (
                <Badge variant="outline" className="text-xs bg-white/80">
                  {patient.age} yrs • {patient.gender}
                </Badge>
              )}
            </div>
            {patient.allergies.length > 0 && (
              <p className="text-xs text-red-700 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                Allergies: {patient.allergies.join(', ')}
              </p>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onLookup(icInput)
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={icInput}
            onChange={(e) => setIcInput(e.target.value)}
            placeholder="Switch Patient IC (e.g. 880101-14-5678)"
            className="h-9 w-56 text-xs bg-white"
          />
          <Button type="submit" size="sm" variant="outline" disabled={loading} className="bg-white h-9">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5 mr-1" />}
            Load IC
          </Button>
          <Link to={`/doctor/patient/${encodeURIComponent(patient.icNumber)}`}>
            <Button type="button" size="sm" variant="ghost" className="h-9 text-xs gap-1" title="View Federated Timeline">
              <ExternalLink className="w-3.5 h-3.5" />
              Timeline
            </Button>
          </Link>
        </form>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-black/5">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          {localToolNote}
        </span>
        {notice && <span className="text-amber-700 font-medium">{notice}</span>}
      </div>
    </div>
  )
}
