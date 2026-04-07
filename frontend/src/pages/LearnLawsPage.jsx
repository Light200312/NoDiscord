import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../libs/store'
import { Loader, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react'

const LearnLawsPage = () => {
  const navigate = useNavigate()
  const startSession = useStore((s) => s.startSession)
  
  const [lawTopic, setLawTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [selectedExperts, setSelectedExperts] = useState(new Set())

  const exampleTopics = [
    'Constitutional Rights',
    'Indian Penal Code Basics',
    'Property Laws',
    'Family Law & Marriage',
    'Consumer Protection Act',
  ]

  const generateLawPanel = async () => {
    if (!lawTopic.trim()) {
      setError('Please enter a legal topic')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(
        `${typeof window !== 'undefined' && window.BACKEND_URL ? window.BACKEND_URL : 'http://localhost:3001'}/api/features/learn-laws`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: lawTopic }),
        }
      )

      if (!response.ok) throw new Error('Failed to generate legal panel')
      
      const data = await response.json()
      setResult(data)
      
      const allIds = new Set([
        ...(data.judges || []).map(j => j.id),
        ...(data.advocates || []).map(a => a.id),
      ])
      setSelectedExperts(allIds)
    } catch (err) {
      setError(err.message || 'Failed to generate panel')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpertSelection = (id) => {
    const newSelected = new Set(selectedExperts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedExperts(newSelected)
  }

  const startLawSession = async () => {
    if (selectedExperts.size < 2) {
      setError('Select at least 2 experts')
      return
    }

    try {
      const selectedAgents = [
        ...(result.judges || []).filter(j => selectedExperts.has(j.id)),
        ...(result.advocates || []).filter(a => selectedExperts.has(a.id)),
      ]

      await startSession({
        topic: lawTopic,
        agents: selectedAgents,
        sourceType: 'feature',
        sourceFeature: 'learn-laws',
        sourceLabel: 'Learn Indian Laws',
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
            <BookOpen className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold tracking-tight text-white">Learn Indian Laws</h1>
          </div>
          <p className="text-base text-white/60">
            Explore constitutional concepts, legal principles, and case law through expert discussion.
          </p>
        </div>

        {/* Topic Input Section */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Legal Topic</span>
            <input
              type="text"
              value={lawTopic}
              onChange={(e) => setLawTopic(e.target.value)}
              placeholder="e.g., Constitutional Rights, IPC Section 420, Property Transfer..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-colors hover:border-white/20 focus:border-white/40 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && generateLawPanel()}
            />
          </label>

          {/* Quick Examples */}
          <div className="space-y-2">
            <p className="text-xs text-white/50 uppercase tracking-wider">Common Topics:</p>
            <div className="flex flex-wrap gap-2">
              {exampleTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setLawTopic(topic)}
                  className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateLawPanel}
            disabled={loading || !lawTopic.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Assembling Legal Panel...
              </span>
            ) : (
              'Generate Legal Panel'
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
            {result.judges && result.judges.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Judges & Legal Experts ({result.judges.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.judges.map((judge) => (
                    <button
                      key={judge.id}
                      onClick={() => toggleExpertSelection(judge.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
                        selectedExperts.has(judge.id)
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{judge.name}</p>
                        <p className="text-xs text-white/50">{judge.role}</p>
                        <p className="mt-1 text-xs text-white/60">{judge.expertise}</p>
                      </div>
                      {selectedExperts.has(judge.id) && (
                        <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result.advocates && result.advocates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  Advocates & Scholars ({result.advocates.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.advocates.map((advocate) => (
                    <button
                      key={advocate.id}
                      onClick={() => toggleExpertSelection(advocate.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
                        selectedExperts.has(advocate.id)
                          ? 'border-cyan-500/50 bg-cyan-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{advocate.name}</p>
                        <p className="text-xs text-white/50">{advocate.role}</p>
                        <p className="mt-1 text-xs text-white/60">{advocate.expertise}</p>
                      </div>
                      {selectedExperts.has(advocate.id) && (
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Session Button */}
            <button
              onClick={startLawSession}
              disabled={selectedExperts.size < 2}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-700 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed"
            >
              Start Learning Session ({selectedExperts.size} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LearnLawsPage
