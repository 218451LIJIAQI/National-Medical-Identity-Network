import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDoctorDashboardData } from './useDoctorDashboardData'
import { Leaf, Search, Plus, Users, Globe, Activity, HeartHandshake } from 'lucide-react'

export default function PenangDashboard() {
  const { doctorName, specialization, theme, networkStats, localStats, recentActivity } =
    useDoctorDashboardData('hospital-penang')

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-7 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-white/20 text-white border-white/30 gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              {theme.name}
            </Badge>
            <h1 className="text-3xl font-bold">Good day, {doctorName}</h1>
            <p className="text-emerald-100 text-sm">{specialization} &middot; {theme.city}, {theme.state}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/doctor/search">
              <Button className="bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl gap-2">
                <Search className="w-4 h-4" />
                Find Patient Records
              </Button>
            </Link>
            <Link to="/doctor/new-record">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/15 rounded-2xl gap-2">
                <Plus className="w-4 h-4" />
                New Consultation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'PMC Registered Patients', value: localStats.totalPatients, icon: Users, wrap: 'bg-emerald-100 text-emerald-700' },
          { label: 'PMC Clinical Records', value: localStats.totalRecords, icon: HeartHandshake, wrap: 'bg-teal-100 text-teal-700' },
          { label: 'National Citizens Indexed', value: networkStats.totalPatients, icon: Globe, wrap: 'bg-cyan-100 text-cyan-700' },
          { label: "Today's Network Queries", value: networkStats.todayQueries, icon: Activity, wrap: 'bg-blue-100 text-blue-700' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="border-emerald-100 rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.wrap}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-emerald-100 rounded-2xl lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Patient Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No recent record queries.</p>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{act.patient} <span className="font-mono text-xs text-gray-400">({act.ic})</span></p>
                      <p className="text-xs text-gray-600">{act.action}</p>
                    </div>
                    <span className="text-xs text-emerald-700 font-medium">{act.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-100 rounded-2xl">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">PMC Specialist Clinics</h2>
            {theme.specialties.map((spec) => (
              <div key={spec} className="px-4 py-3 rounded-xl bg-teal-50/70 border border-teal-100 text-sm font-medium text-teal-900">
                {spec}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
