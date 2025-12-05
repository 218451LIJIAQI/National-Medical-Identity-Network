import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, Eye, Clock, Building2, Lock, Unlock, Download, 
  AlertTriangle, CheckCircle
} from 'lucide-react'

interface HospitalAccess {
  id: string
  name: string
  city: string
  allowed: boolean
  lastAccess?: string
}

interface AccessLog {
  id: string
  doctor: string
  hospital: string
  time: string
  action: string
  status: 'success' | 'blocked'
}

export default function PatientPrivacy() {
  const { toast } = useToast()
  
  const [hospitals, setHospitals] = useState<HospitalAccess[]>([
    { id: 'hospital-kl', name: 'KL General Hospital', city: 'Kuala Lumpur', allowed: true, lastAccess: '2 hours ago' },
    { id: 'hospital-penang', name: 'Penang General Hospital', city: 'George Town', allowed: true, lastAccess: '3 days ago' },
    { id: 'hospital-jb', name: 'Sultanah Aminah Hospital', city: 'Johor Bahru', allowed: true, lastAccess: '1 week ago' },
    { id: 'hospital-sarawak', name: 'Sarawak General Hospital', city: 'Kuching', allowed: false },
    { id: 'hospital-sabah', name: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', allowed: false },
  ])

  const [sensitiveRecords, setSensitiveRecords] = useState({
    mentalHealth: true,
    reproductiveHealth: true,
    substanceAbuse: true,
    hivStatus: true,
  })

  const accessLogs: AccessLog[] = [
    { id: '1', doctor: 'Dr. Nurul Huda', hospital: 'KL General Hospital', time: '2 hours ago', action: 'Viewed medical history', status: 'success' },
    { id: '2', doctor: 'Dr. Ong Chee Keong', hospital: 'Penang General', time: '3 days ago', action: 'Viewed prescriptions', status: 'success' },
    { id: '3', doctor: 'Dr. Unknown', hospital: 'Sarawak General', time: '5 days ago', action: 'Attempted access', status: 'blocked' },
    { id: '4', doctor: 'Dr. Muhammad Hafiz', hospital: 'Sultanah Aminah', time: '1 week ago', action: 'Created new record', status: 'success' },
  ]

  const toggleHospitalAccess = (hospitalId: string) => {
    setHospitals(prev => prev.map(h => {
      if (h.id === hospitalId) {
        const newAllowed = !h.allowed
        toast({
          title: newAllowed ? 'Access Granted' : 'Access Revoked',
          description: `${h.name} ${newAllowed ? 'can now' : 'can no longer'} access your records`,
        })
        return { ...h, allowed: newAllowed }
      }
      return h
    }))
  }

  const toggleSensitiveRecord = (key: keyof typeof sensitiveRecords) => {
    setSensitiveRecords(prev => {
      const newValue = !prev[key]
      toast({
        title: newValue ? 'Protection Enabled' : 'Protection Disabled',
        description: `${key.replace(/([A-Z])/g, ' $1').trim()} records are now ${newValue ? 'protected' : 'visible'}`,
      })
      return { ...prev, [key]: newValue }
    })
  }

  const handleDownloadData = () => {
    toast({
      title: 'Download Started',
      description: 'Your medical records are being prepared for download',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Privacy & Security</h1>
          <p className="text-gray-500">Control access to your medical records</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleDownloadData}>
          <Download className="w-4 h-4" />
          Download My Data
        </Button>
      </div>

      {/* Security Status */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700">Data Protection</p>
                <p className="font-bold text-green-900">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Authorized Hospitals</p>
                <p className="font-bold">{hospitals.filter(h => h.allowed).length} of {hospitals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Total Access</p>
                <p className="font-bold">{accessLogs.filter(l => l.status === 'success').length} views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-red-700">Blocked Attempts</p>
                <p className="font-bold text-red-900">{accessLogs.filter(l => l.status === 'blocked').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hospital Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Hospital Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Control which hospitals can access your medical records. Blocked hospitals will not be able to view your data.
          </p>
          <div className="space-y-3">
            {hospitals.map((hospital) => (
              <div 
                key={hospital.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  hospital.allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${hospital.allowed ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {hospital.allowed ? (
                      <Unlock className="w-4 h-4 text-green-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{hospital.name}</p>
                    <p className="text-sm text-gray-500">{hospital.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {hospital.lastAccess && (
                    <span className="text-xs text-gray-500">Last access: {hospital.lastAccess}</span>
                  )}
                  <Button
                    variant={hospital.allowed ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleHospitalAccess(hospital.id)}
                  >
                    {hospital.allowed ? 'Revoke Access' : 'Grant Access'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sensitive Records Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sensitive Records Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Choose which types of sensitive records require additional consent before access.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: 'mentalHealth' as const, label: 'Mental Health Records', icon: '🧠' },
              { key: 'reproductiveHealth' as const, label: 'Reproductive Health', icon: '🩺' },
              { key: 'substanceAbuse' as const, label: 'Substance Abuse Treatment', icon: '💊' },
              { key: 'hivStatus' as const, label: 'HIV/AIDS Status', icon: '🔬' },
            ].map((item) => (
              <div 
                key={item.key}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                  sensitiveRecords[item.key] 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => toggleSensitiveRecord(item.key)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                <Badge variant={sensitiveRecords[item.key] ? "default" : "secondary"}>
                  {sensitiveRecords[item.key] ? 'Protected' : 'Visible'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Access Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Access Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accessLogs.map((log) => (
              <div 
                key={log.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  log.status === 'blocked' ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {log.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{log.doctor}</p>
                    <p className="text-xs text-gray-500">{log.hospital}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{log.action}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    {log.time}
                  </p>
                </div>
                <Badge variant={log.status === 'success' ? 'outline' : 'destructive'}>
                  {log.status === 'success' ? 'Allowed' : 'Blocked'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
