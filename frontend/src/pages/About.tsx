import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Shield, Zap, Globe, Users, Building2, Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/30 py-12 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      <motion.div 
        className="container mx-auto max-w-4xl relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <Link to="/">
          <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" className="mb-8 rounded-xl hover:bg-white/50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </motion.div>
        </Link>

        <div className="space-y-10">
          {/* Hero Section */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div 
              className="flex items-center justify-center gap-4 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            >
              <motion.div 
                className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30"
                whileHover={{ scale: 1.1, rotate: 5 }}
                animate={{ 
                  boxShadow: [
                    '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                    '0 10px 40px -10px rgba(6, 182, 212, 0.5)',
                    '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Building2 className="w-9 h-9 text-white drop-shadow-lg" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </motion.div>
              </motion.div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-700 bg-clip-text text-transparent">
                MedLink MY
              </h1>
            </motion.div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              A National Medical Identity Network that uses IC numbers as universal patient identifiers
              for seamless cross-hospital medical record access.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Badge variant="success" className="px-4 py-1.5">Federated Architecture</Badge>
              <Badge variant="info" className="px-4 py-1.5">Privacy-First</Badge>
              <Badge className="border-purple-200/50 bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 px-4 py-1.5">Real-time Access</Badge>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-xl shadow-red-500/5 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span> The Problem
                </h2>
                <p className="text-gray-600 mb-4">
                  Malaysian citizens often receive treatment at multiple hospitals throughout their lives.
                  Currently, each hospital maintains isolated medical records, leading to:
                </p>
                <ul className="space-y-3 text-gray-600">
                  {[
                    'Incomplete patient history during consultations',
                    'Repeated medical tests and procedures',
                    'Risk of dangerous drug interactions',
                    'Emergency delays when records aren\'t available',
                    'Inefficient healthcare resource utilization'
                  ].map((item, i) => (
                    <motion.li 
                      key={i}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                    >
                      <span className="w-2 h-2 bg-red-400 rounded-full" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-xl shadow-emerald-500/5 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">✨</span> Our Solution
                </h2>
                <p className="text-gray-600 mb-6">
                  MedLink MY creates a federated network that connects hospital databases while maintaining
                  data sovereignty. Using the patient's IC number as a universal key:
                </p>
                <div className="grid md:grid-cols-2 gap-5">
                  {[
                    { icon: Shield, color: 'blue', title: 'Data Sovereignty', desc: 'Each hospital maintains full control over their data' },
                    { icon: Zap, color: 'cyan', title: 'Instant Access', desc: 'Retrieve records from all hospitals in seconds' },
                    { icon: Globe, color: 'emerald', title: 'Nationwide Coverage', desc: 'Connected hospitals across Malaysia' },
                    { icon: Users, color: 'violet', title: 'Patient-Centric', desc: 'Patients control access to their records' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      className={`flex items-start gap-4 p-4 rounded-xl bg-${item.color}-50 border border-${item.color}-100`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                    >
                      <div className={`p-2 bg-${item.color}-100 rounded-lg`}>
                        <item.icon className={`h-5 w-5 text-${item.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border-0 shadow-xl shadow-purple-500/5 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="text-2xl">🏗️</span> Technical Architecture
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: 'Central Hub', desc: 'Maintains a patient index mapping IC numbers to hospital IDs. Does NOT store any medical data.', color: 'blue' },
                    { title: 'Hospital Nodes', desc: 'Each hospital runs their own database and API. They respond to queries with patient consent.', color: 'emerald' },
                    { title: 'Read-Only Access', desc: 'Cross-hospital access is strictly read-only. Only the originating hospital can modify records.', color: 'amber' },
                    { title: 'Audit Trail', desc: 'Every access is logged with timestamps, accessor identity, and purpose for transparency.', color: 'purple' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      className="p-4 rounded-xl bg-gray-50 border border-gray-100"
                      initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                    >
                      <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-0 shadow-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
              <CardContent className="p-10 text-center relative">
                <motion.div
                  className="absolute -top-20 -right-20 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -bottom-20 -left-20 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl"
                  animate={{ scale: [1.2, 1, 1.2] }}
                  transition={{ duration: 6, repeat: Infinity }}
                />
                <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2 text-gray-900">
                  <span className="text-3xl">🏆</span> Built for GoDamLah 2.0
                </h2>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                  This prototype was created for the Identity Hackathon,
                  demonstrating how Malaysia's IC system can revolutionize healthcare.
                </p>
              <Link to="/login">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25">
                    Try the Demo
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </Link>
            </CardContent>
          </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
