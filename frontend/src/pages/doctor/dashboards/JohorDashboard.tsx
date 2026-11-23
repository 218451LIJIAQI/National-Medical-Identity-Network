import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDoctorDashboardData } from './useDoctorDashboardData'
import { Zap, Search, Plus, Users, FileText, Globe, Activity } from 'lucide-react'

export default function JohorDashboard() {
  const { doctorName, specialization, theme, networkStats, localStats, recentActivity } =
    useDoctorDashboardData('hospital-jb')

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-7 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge className="bg-white/20 text-white border-white/30 mb-2 gap-1">
              <Zap className="w-3.5 h-3.5" />
              Southern Specialist Hub
            </Badge>
            <h1 className="text-3xl font-bold">{doctorName}</h1>
            <p className="text-amber-100 text-sm mt-1">{specialization} &middot; {theme.name}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/doctor/search">
              <Button className="bg-white text-amber-800 hover:bg-amber-50 rounded-xl gap-2">
                <Search className="w-4 h-4" />
                National Lookup
              </Button>
            </Link>
            <Link to="/doctor/new-record">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/15 rounded-xl gap-2">
                <Plus className="w-4 h-4" />
                Add Record
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'JSH Patients', value: localStats.totalPatients, icon: Users, wrap: 'bg-amber-100 text-amber-700' },
          { label: 'JSH Encounters', value: localStats.totalRecords, icon: FileText, wrap: 'bg-orange-100 text-orange-700' },
          { label: 'National Index', value: networkStats.totalPatients, icon: Globe, wrap: 'bg-yellow-100 text-yellow-800' },
          { label: 'Hub Latency', value: `${networkStats.avgResponseTime}ms`, icon: Activity, wrap: 'bg-emerald-100 text-emerald-700' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-amber-100">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.wrap}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-600">{card.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-amber-100 lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Consultation Queries</h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No recent clinician activity.</p>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{act.patient} <span className="font-mono text-xs text-gray-400">({act.ic})</span></p>
                      <p className="text-xs text-gray-600">{act.action}</p>
                    </div>
                    <span className="text-xs text-amber-700">{act.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-100">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Surgical &amp; Specialist Units</h2>
            {theme.specialties.map((spec) => (
              <div key={spec} className="p-3 rounded-xl bg-orange-50/70 border border-orange-100 text-sm font-medium text-orange-900">
                {spec}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
