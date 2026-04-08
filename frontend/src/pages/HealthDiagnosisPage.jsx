import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../libs/store'
import { api } from '../libs/api'
import { Loader, AlertCircle, CheckCircle2, Stethoscope } from 'lucide-react'

const HealthDiagnosisPage = () => {
  const navigate = useNavigate()
  const startSession = useStore((s) => s.startSession)
  
  const [medicalCase, setMedicalCase] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [selectedDoctors, setSelectedDoctors] = useState(new Set())

  const caseExamples = [
    'Persistent chest pain & shortness of breath',
    'Neurological symptoms - headaches & dizziness',
    'Gastrointestinal issues & weight loss',
    'Respiratory infection with high fever',
    'Mental health - anxiety & sleep disorders',
  ]

  const generateMedicalPanel = async () => {
    if (!medicalCase.trim()) {
      setError('Please describe the medical case')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const data = await api.generateMedicalPanel({ case: medicalCase })
      setResult(data)
      
      const allIds = new Set([
        ...(data.doctors || []).map(d => d.id),
        ...(data.specialists || []).map(s => s.id),
      ])
      setSelectedDoctors(allIds)
    } catch (err) {
      setError(err.message || 'Failed to generate panel')
    } finally {
      setLoading(false)
    }
  }

  const toggleDoctorSelection = (id) => {
    const newSelected = new Set(selectedDoctors)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedDoctors(newSelected)
  }

  const startDiagnosisSession = async () => {
    if (selectedDoctors.size < 2) {
      setError('Select at least 2 doctors for discussion')
      return
    }

    try {
      const selectedAgents = [
        ...(result.doctors || []).filter(d => selectedDoctors.has(d.id)),
        ...(result.specialists || []).filter(s => selectedDoctors.has(s.id)),
      ]

      await startSession({
        topic: medicalCase,
        agents: selectedAgents,
        sourceType: 'feature',
        sourceFeature: 'health-diagnosis',
        sourceLabel: 'Health Diagnosis',
      })

      navigate('/debate')
    } catch (err) {
      setError('Failed to start session: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Stethoscope className="h-8 w-8 text-green-400" />
            <h1 className="text-4xl font-bold tracking-tight text-white">Health Diagnosis</h1>
          </div>
          <p className="text-base text-white/60">
            Consult with multiple doctors and specialists for collaborative diagnosis discussions.
          </p>
        </div>

        {/* Case Input Section */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Patient Case / Symptoms</span>
            <textarea
              value={medicalCase}
              onChange={(e) => setMedicalCase(e.target.value)}
              placeholder="Describe the patient's medical history, symptoms, and relevant details..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-colors hover:border-white/20 focus:border-white/40 focus:outline-none resize-none"
              rows={5}
            />
          </label>

          {/* Quick Examples */}
          <div className="space-y-2">
            <p className="text-xs text-white/50 uppercase tracking-wider">Quick Examples:</p>
            <div className="flex flex-wrap gap-2">
              {caseExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => setMedicalCase(example)}
                  className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateMedicalPanel}
            disabled={loading || !medicalCase.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/20 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Assembling Medical Panel...
              </span>
            ) : (
              'Generate Medical Panel'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {result.doctors && result.doctors.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  General Practitioners ({result.doctors.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.doctors.map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => toggleDoctorSelection(doctor.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
                        selectedDoctors.has(doctor.id)
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{doctor.name}</p>
                        <p className="text-xs text-white/50">{doctor.role}</p>
                        <p className="mt-1 text-xs text-white/60">{doctor.expertise}</p>
                      </div>
                      {selectedDoctors.has(doctor.id) && (
                        <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result.specialists && result.specialists.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Specialists ({result.specialists.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.specialists.map((specialist) => (
                    <button
                      key={specialist.id}
                      onClick={() => toggleDoctorSelection(specialist.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
                        selectedDoctors.has(specialist.id)
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{specialist.name}</p>
                        <p className="text-xs text-white/50">{specialist.role}</p>
                        <p className="mt-1 text-xs text-white/60">{specialist.expertise}</p>
                      </div>
                      {selectedDoctors.has(specialist.id) && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Consultation Button */}
            <button
              onClick={startDiagnosisSession}
              disabled={selectedDoctors.size < 2}
              className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/20 disabled:cursor-not-allowed"
            >
              Start Consultation ({selectedDoctors.size} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthDiagnosisPage
