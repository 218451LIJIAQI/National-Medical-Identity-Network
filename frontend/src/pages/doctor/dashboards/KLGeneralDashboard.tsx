import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import LiveClock from '@/components/LiveClock'
import { useDoctorDashboardData } from './useDoctorDashboardData'
import {
  Search, FileText, Activity, Users, Globe, Clock, Building2, Plus, ArrowRight,
} from 'lucide-react'

export default function KLGeneralDashboard() {
  const { doctorName, specialization, theme, networkStats, localStats, recentActivity } =
    useDoctorDashboardData('hospital-kl')

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <Badge className="bg-white/20 text-white border-white/30">
            {theme.name} &middot; Clinical Command
          </Badge>
          <div className="flex items-center gap-2 text-xs bg-white/15 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <LiveClock showDate />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {doctorName}</h1>
            <p className="text-blue-100 mt-1">{specialization} &middot; {theme.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/doctor/search">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 rounded-xl gap-2">
                <Search className="w-4 h-4" />
                National Search
              </Button>
            </Link>
            <Link to="/doctor/new-record">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/15 rounded-xl gap-2">
                <Plus className="w-4 h-4" />
                New Record
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'KLGH Patients', value: localStats.totalPatients, sub: `${localStats.totalRecords} local encounters`, icon: Users, wrap: 'bg-blue-100 text-blue-600' },
          { label: 'National Index', value: networkStats.totalPatients, sub: `${networkStats.activeHospitals} connected hospitals`, icon: Globe, wrap: 'bg-indigo-100 text-indigo-600' },
          { label: "Today's Queries", value: networkStats.todayQueries, sub: `${networkStats.avgResponseTime}ms hub latency`, icon: Activity, wrap: 'bg-sky-100 text-sky-600' },
          { label: 'Specialties Active', value: theme.departments, sub: `${theme.bedCount} inpatient beds`, icon: Building2, wrap: 'bg-emerald-100 text-emerald-600' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="border-slate-200/80">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.wrap}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-slate-200/80 lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Clinician Activity</h2>
              <Link to="/doctor/search" className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
                Query Patient <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No recent queries yet. Search a patient IC to view cross-hospital records.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{act.patient} <span className="font-mono text-xs text-gray-400">({act.ic})</span></p>
                      <p className="text-xs text-gray-600">{act.action}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{act.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Centers of Excellence</h2>
            <div className="space-y-2">
              {theme.specialties.map((spec) => (
                <div key={spec} className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-sm font-medium text-blue-900 flex items-center justify-between">
                  <span>{spec}</span>
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
