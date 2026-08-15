import { useState } from "react"
import axios from "axios"

const API = "https://achintya05-fraud-detection-api.hf.space"

function Screen1() {
  const [review, setReview]   = useState("")
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const analyse = async () => {
    if (!review.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const [pred, expl] = await Promise.all([
        axios.post(`${API}/predict/`, { text: review }),
        axios.post(`${API}/explain/`,  { text: review, confidence: 0 })
      ])
      const confidence = pred.data.confidence
      const explRes    = await axios.post(`${API}/explain/`, { text: review, confidence })
      setResult({ ...pred.data, flags: explRes.data.linguistic_flags, risk_level: explRes.data.risk_level })
    } catch {
      setError("API error — make sure FastAPI is running on port 8000")
    } finally {
      setLoading(false)
    }
  }

  const tier = (c) => c >= 0.65 ? "high" : c >= 0.40 ? "med" : "low"

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <p className="text-[11px] tracking-[.18em] uppercase text-[#33d9c4] font-mono mb-2">Screen 01</p>
      <h1 className="font-display text-2xl font-semibold mb-2">Review Fraud Analysis</h1>
      <p className="text-[#93a3b5] mb-6 text-sm">Paste any Amazon review to check whether it looks fraudulent.</p>

      <textarea
        rows={5}
        value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="e.g. Amazing product love it best ever perfect highly recommend..."
        className="input-field w-full p-3.5 text-sm resize-y"
      />

      <button
        onClick={analyse}
        disabled={loading}
        className="btn-primary mt-3 px-6 py-2.5 text-sm"
      >
        {loading ? "Analysing…" : "Analyse Review"}
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-xl border border-[#ef6f6c]/30 bg-[#ef6f6c]/10 text-[#ff9a97] text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-7 space-y-4">
          {/* Score + gauge */}
          <div className="panel panel-pad flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0 glow-ring">
              <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#202c3a" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={tier(result.confidence)==="high" ? "#ef6f6c" : tier(result.confidence)==="med" ? "#f0a545" : "#4ade9a"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${result.confidence * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className={`font-mono text-lg font-semibold risk-${tier(result.confidence)}`}>{(result.confidence*100).toFixed(0)}%</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#5f7186] mb-1">Fraud probability</p>
              <p className={`font-display text-xl font-semibold risk-${tier(result.confidence)}`}>
                {result.fraud ? "Fraud detected" : "Looks legitimate"}
              </p>
              <p className="text-sm text-[#93a3b5] mt-1">{result.verdict}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Confidence", value: `${(result.confidence * 100).toFixed(1)}%` },
              { label: "Word Count", value: result.word_count },
              { label: "Threshold",  value: result.threshold },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Suspicious words */}
          <div className="panel panel-pad">
            <h3 className="font-display font-semibold mb-3 text-sm text-[#e7edf3]">Suspicious Words</h3>
            {(() => {
              const suspicious = [
                'amazing', 'perfect', 'lovely' ,'love', 'best', 'awesome',
                'excellent', 'great', 'fantastic', 'wonderful', 'superb',
                'incredible', 'outstanding', 'brilliant', 'recommend', 'must',
                'buy', 'purchase', 'ever', 'life', 'happy'
              ]
              const words = review.split(' ')
              const found = [...new Set(words.filter(w => suspicious.includes(w.toLowerCase().replace(/[^a-z]/g, ''))))]

              return found.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {words.map((word, i) => {
                    const clean = word.toLowerCase().replace(/[^a-z]/g, '')
                    const isSuspicious = suspicious.includes(clean)
                    return (
                      <span key={i} className={`word-chip ${isSuspicious ? "word-flag" : "word-plain"}`}>
                        {word}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm risk-low">No suspicious words detected</p>
              )
            })()}
          </div>

          {/* Linguistic flags */}
          <div className="panel panel-pad">
            <h3 className="font-display font-semibold mb-2 text-sm text-[#e7edf3]">Linguistic Flags</h3>
            <ul className="space-y-1.5">
              {result.flags.map((f, i) => (
                <li key={i} className="text-sm text-[#93a3b5] flex gap-2">
                  <span className="text-[#33d9c4] mt-0.5">›</span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default Screen1