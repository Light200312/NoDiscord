import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../libs/store'
import { Loader, AlertCircle, CheckCircle2 } from 'lucide-react'

const HistoryDebatePage = () => {
  const navigate = useNavigate()
  const startSession = useStore((s) => s.startSession)
  
  const [historicalTopic, setHistoricalTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [selectedDebaters, setSelectedDebaters] = useState(new Set())

  const exampleTopics = [
    'The French Revolution',
    'Rise and Fall of the Roman Empire',
    'Industrial Revolution Impact',
    'American Civil War Causes',
    'The Renaissance',
  ]

  const generateHistoricalDebate = async () => {
    if (!historicalTopic.trim()) {
      setError('Please enter a historical topic')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(
        `${typeof window !== 'undefined' && window.BACKEND_URL ? window.BACKEND_URL : 'http://localhost:3001'}/api/debate/history`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: historicalTopic }),
        }
      )

      if (!response.ok) throw new Error('Failed to generate historical debate')
      
      const data = await response.json()
      setResult(data)
      
      // Auto-select all generated debaters
      const allIds = new Set([
        ...(data.historians || []).map(h => h.id),
        ...(data.historicalFigures || []).map(f => f.id),
      ])
      setSelectedDebaters(allIds)
    } catch (err) {
      setError(err.message || 'Failed to generate debate')
    } finally {
      setLoading(false)
    }
  }

  const toggleDebaterSelection = (id) => {
    const newSelected = new Set(selectedDebaters)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedDebaters(newSelected)
  }

  const startHistoricalDebate = async () => {
    if (selectedDebaters.size < 2) {
      setError('Select at least 2 debaters')
      return
    }

    try {
      const selectedAgents = [
        ...(result.historians || []).filter(h => selectedDebaters.has(h.id)),
        ...(result.historicalFigures || []).filter(f => selectedDebaters.has(f.id)),
      ]

      // Start debate session with selected agents
      await startSession({
        topic: historicalTopic,
        agents: selectedAgents,
        sourceType: 'feature',
        sourceFeature: 'history-debate',
        sourceLabel: 'Travel to the Past',
      })

      navigate('/debate')
    } catch (err) {
      setError('Failed to start debate: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">Walk Into the Past</h1>
          <p className="text-base text-white/60">
            Choose a historical event and assemble historians and key figures to debate its significance.
          </p>
        </div>

        {/* Topic Input Section */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Historical Topic</span>
            <input
              type="text"
              value={historicalTopic}
              onChange={(e) => setHistoricalTopic(e.target.value)}
              placeholder="e.g., French Revolution, Fall of Rome, Industrial Revolution..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-colors hover:border-white/20 focus:border-white/40 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && generateHistoricalDebate()}
            />
          </label>

          {/* Quick Examples */}
          <div className="space-y-2">
            <p className="text-xs text-white/50 uppercase tracking-wider">Quick Examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setHistoricalTopic(topic)}
                  className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateHistoricalDebate}
            disabled={loading || !historicalTopic.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-amber-500/20 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Generating Debate...
              </span>
            ) : (
              'Generate Historical Debate'
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
            {/* Historians */}
            {result.historians && result.historians.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Pre-Built Historians ({result.historians.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.historians.map((historian) => (
                    <button
                      key={historian.id}
                      onClick={() => toggleDebaterSelection(historian.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
                        selectedDebaters.has(historian.id)
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{historian.name}</p>
                        <p className="text-xs text-white/50">{historian.role}</p>
                        <p className="mt-1 text-xs text-white/60">{historian.expertise}</p>
                      </div>
                      {selectedDebaters.has(historian.id) && (
                        <CheckCircle2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Figures */}
            {result.historicalFigures && result.historicalFigures.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Historical Figures ({result.historicalFigures.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.historicalFigures.map((figure) => (
                    <button
                      key={figure.id}
                      onClick={() => toggleDebaterSelection(figure.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
                        selectedDebaters.has(figure.id)
                          ? 'border-orange-500/50 bg-orange-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">{figure.name}</p>
                        <p className="text-xs text-white/50">{figure.era}</p>
                        <p className="mt-1 text-xs text-white/60">{figure.role}</p>
                      </div>
                      {selectedDebaters.has(figure.id) && (
                        <CheckCircle2 className="h-5 w-5 text-orange-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Debate Button */}
            <button
              onClick={startHistoricalDebate}
              disabled={selectedDebaters.size < 2}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed"
            >
              Start Debate ({selectedDebaters.size} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryDebatePage
