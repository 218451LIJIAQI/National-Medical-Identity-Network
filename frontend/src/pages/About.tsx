import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Shield, Zap, Globe, Users, Building2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const SOLUTION_PILLARS = [
  {
    icon: Shield,
    title: 'Data Sovereignty',
    desc: 'Each hospital retains ownership of its clinical database; cross-hospital queries are strictly read-only.',
    cardClass: 'bg-blue-50 border-blue-100',
    iconWrapClass: 'bg-blue-100',
    iconClass: 'text-blue-600',
  },
  {
    icon: Zap,
    title: 'Instant Federated Retrieval',
    desc: 'Parallel queries across indexed hospital nodes assemble a unified longitudinal timeline in seconds.',
    cardClass: 'bg-cyan-50 border-cyan-100',
    iconWrapClass: 'bg-cyan-100',
    iconClass: 'text-cyan-600',
  },
  {
    icon: Globe,
    title: 'Nationwide Coverage',
    desc: 'Connects Peninsular and East Malaysia referral centres through a single MyKad identity index.',
    cardClass: 'bg-emerald-50 border-emerald-100',
    iconWrapClass: 'bg-emerald-100',
    iconClass: 'text-emerald-600',
  },
  {
    icon: Users,
    title: 'Patient Consent Control',
    desc: 'Patients grant or revoke hospital-level read permissions at any time with full audit visibility.',
    cardClass: 'bg-violet-50 border-violet-100',
    iconWrapClass: 'bg-violet-100',
    iconClass: 'text-violet-600',
  },
]

const ARCHITECTURE_LAYERS = [
  {
    title: 'Central Index Hub',
    desc: 'Maps MyKad IC numbers to participating hospital IDs, manages consent rules, and records immutable audit logs without storing clinical notes.',
  },
  {
    title: 'Autonomous Hospital Nodes',
    desc: 'Each hospital operates an isolated clinical database for patients, encounters, prescriptions, and laboratory reports.',
  },
  {
    title: 'Read-Only Cross-Hospital View',
    desc: 'Visiting clinicians view external records in read-only mode; only the originating hospital creates local clinical entries.',
  },
  {
    title: 'Break-Glass Emergency Protocol',
    desc: 'Rate-limited, audited emergency lookup surfaces life-critical blood type, allergies, chronic conditions, and active medications.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 py-12 px-4">
      <motion.div
        className="container mx-auto max-w-4xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Link to="/">
          <Button variant="ghost" className="mb-8 rounded-xl hover:bg-white/70">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3.5 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-700 bg-clip-text text-transparent">
                MedLink MY
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              A federated National Medical Identity Network using the Malaysian MyKad IC number as a universal key
              for consent-governed, cross-hospital medical record continuity.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <Badge variant="success" className="px-3.5 py-1">Federated Architecture</Badge>
              <Badge variant="info" className="px-3.5 py-1">Patient Data Sovereignty</Badge>
              <Badge className="bg-violet-50 text-violet-700 border-violet-200 px-3.5 py-1">Full Audit Trail</Badge>
            </div>
          </div>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Healthcare Fragmentation Challenge</h2>
              <p className="text-gray-600 mb-4">
                Citizens frequently receive care across multiple public and specialist hospitals over their lifetime.
                Isolated hospital silos create concrete clinical risks:
              </p>
              <ul className="space-y-2.5 text-gray-700">
                {[
                  'Incomplete allergy and medication history during consultations',
                  'Duplicate laboratory and imaging investigations across institutions',
                  'Preventable adverse drug interactions across separate prescriptions',
                  'Delayed triage in emergency trauma when prior records are unreachable',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Federated Solution</h2>
              <p className="text-gray-600 mb-6">
                MedLink MY connects regional hospital databases without centralizing clinical records into a single point of failure:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {SOLUTION_PILLARS.map((pillar) => {
                  const Icon = pillar.icon
                  return (
                    <div
                      key={pillar.title}
                      className={`flex items-start gap-4 p-4 rounded-xl border ${pillar.cardClass}`}
                    >
                      <div className={`p-2.5 rounded-lg shrink-0 ${pillar.iconWrapClass}`}>
                        <Icon className={`h-5 w-5 ${pillar.iconClass}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{pillar.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{pillar.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-5">Technical Architecture</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {ARCHITECTURE_LAYERS.map((layer) => (
                  <div key={layer.title} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <h3 className="font-bold text-gray-900 mb-1.5">{layer.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{layer.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 border-0 shadow-xl text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Explore the Live Network Prototype</h2>
              <p className="text-blue-100 mb-6 max-w-lg mx-auto">
                Sign in with pre-configured patient, clinician, hospital administrator, or MOH central hub accounts.
              </p>
              <Link to="/login">
                <Button size="lg" className="gap-2 bg-white text-blue-700 hover:bg-blue-50">
                  Launch Portal
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
