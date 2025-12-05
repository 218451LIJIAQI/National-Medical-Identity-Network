import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Shield, Zap, Globe, Users, Building2 } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold">MedLink MY</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A National Medical Identity Network that uses IC numbers as universal patient identifiers
              for seamless cross-hospital medical record access.
            </p>
          </div>

          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">The Problem</h2>
              <p className="text-gray-600 mb-4">
                Malaysian citizens often receive treatment at multiple hospitals throughout their lives.
                Currently, each hospital maintains isolated medical records, leading to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Incomplete patient history during consultations</li>
                <li>Repeated medical tests and procedures</li>
                <li>Risk of dangerous drug interactions</li>
                <li>Emergency delays when records aren't available</li>
                <li>Inefficient healthcare resource utilization</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Our Solution</h2>
              <p className="text-gray-600 mb-4">
                MedLink MY creates a federated network that connects hospital databases while maintaining
                data sovereignty. Using the patient's IC number as a universal key:
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Data Sovereignty</h3>
                    <p className="text-sm text-gray-600">Each hospital maintains full control over their data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-6 w-6 text-cyan-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Instant Access</h3>
                    <p className="text-sm text-gray-600">Retrieve records from all hospitals in seconds</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Nationwide Coverage</h3>
                    <p className="text-sm text-gray-600">Connected hospitals across Malaysia</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-6 w-6 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Patient-Centric</h3>
                    <p className="text-sm text-gray-600">Patients control access to their records</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Technical Architecture</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  <strong>Central Hub:</strong> Maintains a patient index mapping IC numbers to hospital IDs.
                  Does NOT store any medical data.
                </p>
                <p>
                  <strong>Hospital Nodes:</strong> Each hospital runs their own database and API.
                  They respond to queries from the central hub with patient consent.
                </p>
                <p>
                  <strong>Read-Only Access:</strong> Cross-hospital access is strictly read-only.
                  Only the originating hospital can modify their records.
                </p>
                <p>
                  <strong>Audit Trail:</strong> Every access is logged with timestamps,
                  accessor identity, and purpose for complete transparency.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Built for GoDamLah 2.0</h2>
              <p className="text-gray-300 mb-6">
                This prototype was created for the Identity Hackathon,
                demonstrating how Malaysia's IC system can revolutionize healthcare.
              </p>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Try the Demo
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
