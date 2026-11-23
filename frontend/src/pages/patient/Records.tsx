import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { centralApi, type MedicalRecordDto } from '@/lib/api'
import { resolveHospitalTheme } from '@/lib/hospital-themes'
import { formatDate, formatDoctorName } from '@/lib/utils'
import {
  Building2, Calendar, FileText, Loader2, Stethoscope, Pill, FlaskConical, ChevronDown, ChevronUp,
} from 'lucide-react'

interface EnrichedPatientRecord extends MedicalRecordDto {
  resolvedHospitalId: string
  resolvedHospitalName: string
}

export default function PatientRecords() {
  const { user } = useAuthStore()
  const [records, setRecords] = useState<EnrichedPatientRecord[]>([])
  const [selectedHospital, setSelectedHospital] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRecords() {
      if (!user?.icNumber) return
      setLoading(true)
      try {
        const response = await centralApi.queryPatient(user.icNumber)
        if (response.success && response.data) {
          const list: EnrichedPatientRecord[] = []
          for (const hospital of response.data.hospitals) {
            for (const record of hospital.records || []) {
              list.push({
                ...record,
                resolvedHospitalId: hospital.hospitalId,
                resolvedHospitalName: hospital.hospitalName,
              })
            }
          }
          list.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
          setRecords(list)
        }
      } finally {
        setLoading(false)
      }
    }
    void loadRecords()
  }, [user?.icNumber])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your longitudinal medical history...</p>
        </div>
      </div>
    )
  }

  const hospitalOptions = Array.from(
    new Map(records.map((r) => [r.resolvedHospitalId, r.resolvedHospitalName])).entries()
  )

  const filteredRecords =
    selectedHospital === 'all'
      ? records
      : records.filter((r) => r.resolvedHospitalId === selectedHospital)

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-7 text-white shadow-xl">
        <Badge className="bg-white/20 text-white border-white/30 mb-3">
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          Unified Longitudinal Timeline
        </Badge>
        <h1 className="text-3xl font-bold">My Medical History</h1>
        <p className="text-blue-100 mt-1">
          {records.length} clinical visit(s) across {hospitalOptions.length} connected hospital(s)
        </p>
      </div>

      {hospitalOptions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedHospital('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              selectedHospital === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Hospitals ({records.length})
          </button>
          {hospitalOptions.map(([hospId, hospName]) => {
            const count = records.filter((r) => r.resolvedHospitalId === hospId).length
            return (
              <button
                key={hospId}
                type="button"
                onClick={() => setSelectedHospital(hospId)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  selectedHospital === hospId
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {hospName} ({count})
              </button>
            )
          })}
        </div>
      )}

      {filteredRecords.length === 0 ? (
        <Card className="border-slate-200/80">
          <CardContent className="p-12 text-center text-gray-500">
            No medical records found for the selected filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => {
            const theme = resolveHospitalTheme(record.resolvedHospitalId || record.resolvedHospitalName)
            const isExpanded = expandedId === record.id
            return (
              <Card key={record.id} className="border-slate-200/80 overflow-hidden">
                <div className="h-1" style={{ backgroundColor: theme.primaryColor }} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={theme.badgeClass}>
                          <Building2 className="w-3 h-3 mr-1" />
                          {record.resolvedHospitalName}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {record.visitType}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 pt-1">
                        {record.chiefComplaint || record.diagnosis[0] || 'Clinical Consultation'}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(record.visitDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5" />
                          {formatDoctorName(record.doctorName)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg bg-blue-50"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {record.diagnosis.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {record.diagnosis.map((diag) => (
                        <Badge key={diag} variant="secondary" className="text-xs">
                          {diag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 text-sm">
                      {record.notes && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Clinical Notes</p>
                          <p className="text-gray-700">{record.notes}</p>
                        </div>
                      )}

                      {record.prescriptions && record.prescriptions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                            <Pill className="w-3.5 h-3.5" />
                            Prescriptions
                          </p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {record.prescriptions.map((rx, idx) => (
                              <div key={`${rx.medicationName}-${idx}`} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                                <p className="font-semibold text-gray-900">{rx.medicationName} ({rx.dosage})</p>
                                <p className="text-xs text-gray-600">{rx.frequency} &middot; {rx.duration}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.labReports && record.labReports.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                            <FlaskConical className="w-3.5 h-3.5" />
                            Laboratory Results
                          </p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {record.labReports.map((lab, idx) => (
                              <div key={`${lab.testName}-${idx}`} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-900">{lab.testName}</p>
                                  <p className="text-xs text-gray-500">Ref: {lab.referenceRange}</p>
                                </div>
                                <Badge variant={lab.isAbnormal ? 'destructive' : 'secondary'}>
                                  {lab.result} {lab.unit}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
