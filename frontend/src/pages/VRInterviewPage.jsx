import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../libs/store'
import { api } from '../libs/api'
import { Loader, AlertCircle, CheckCircle2, Briefcase } from 'lucide-react'

const VRInterviewPage = () => {
  const navigate = useNavigate()
  const startSession = useStore((s) => s.startSession)
  
  const [scenarioType, setScenarioType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [selectedInterviewers, setSelectedInterviewers] = useState(new Set())

  const scenarioOptions = [
    { id: 'startup-pitch', label: 'Startup Pitch', description: 'Present your idea to investors' },
    { id: 'tech-interview', label: 'Tech Interview', description: 'Technical coding & architecture questions' },
    { id: 'management-gd', label: 'Management GD', description: 'Group discussion on business strategy' },
    { id: 'hr-interview', label: 'HR Round', description: 'Behavioral and situational questions' },
    { id: 'case-study', label: 'Case Study', description: 'Solve business case problems' },
  ]

  const generateInterviewPanel = async () => {
    if (!scenarioType.trim()) {
      setError('Please select a scenario type')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const data = await api.generateInterviewPanel({ scenario: scenarioType })
      setResult(data)
      
      const allIds = new Set([
        ...(data.interviewers || []).map(i => i.id),
      ])
      setSelectedInterviewers(allIds)
    } catch (err) {
      setError(err.message || 'Failed to generate panel')
    } finally {
      setLoading(false)
    }
  }

  const toggleInterviewerSelection = (id) => {
    const newSelected = new Set(selectedInterviewers)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedInterviewers(newSelected)
  }

  const startInterviewSession = async () => {
    if (selectedInterviewers.size < 1) {
      setError('Select at least 1 interviewer')
      return
    }

    try {
      const selectedAgents = (result.interviewers || []).filter(i => selectedInterviewers.has(i.id))

      await startSession({
        topic: scenarioType,
        agents: selectedAgents,
        sourceType: 'feature',
        sourceFeature: 'vr-interview',
        sourceLabel: 'VR Interview / GD',
      })

      navigate('/debate')
    } catch (err) {
      setError('Failed to start interview: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Briefcase className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-bold tracking-tight text-white">VR Interview & GD</h1>
          </div>
          <p className="text-base text-white/60">
            Practice interviews and group discussions with expert interviewers and panelists.
          </p>
        </div>

        {/* Scenario Selection */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6">
          <label className="block">
            <span className="mb-4 block text-sm font-medium text-white/80">Select Interview Type</span>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {scenarioOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setScenarioType(option.id)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    scenarioType === option.id
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <p className="font-medium text-white">{option.label}</p>
                  <p className="text-xs text-white/50 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </label>

          {/* Generate Button */}
          <button
            onClick={generateInterviewPanel}
            disabled={loading || !scenarioType}
            className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/20 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Building Interview Panel...
              </span>
            ) : (
              'Generate Interview Panel'
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
            {result.interviewers && result.interviewers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Interview Panel ({result.interviewers.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.interviewers.map((interviewer) => (
                    <button
                      key={interviewer.id}
                      onClick={() => toggleInterviewerSelection(interviewer.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
                        selectedInterviewers.has(interviewer.id)
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{interviewer.name}</p>
                        <p className="text-xs text-white/50">{interviewer.role}</p>
                        <p className="mt-1 text-xs text-white/60">{interviewer.expertise}</p>
                      </div>
                      {selectedInterviewers.has(interviewer.id) && (
                        <CheckCircle2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Interview Button */}
            <button
              onClick={startInterviewSession}
              disabled={selectedInterviewers.size < 1}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-700 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/20 disabled:cursor-not-allowed"
            >
              Start Interview Session ({selectedInterviewers.size} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VRInterviewPage
