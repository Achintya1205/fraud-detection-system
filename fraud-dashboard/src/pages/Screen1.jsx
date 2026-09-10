import { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "https://achintya05-fraud-detection-api.hf.space"

function Screen1() {
  const [review, setReview]     = useState("")
  const [reviewerId, setReviewerId] = useState("")
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const analyse = async () => {
    if (!review.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const predRes = await axios.post(`${API}/predict/`, {
        text: review,
        reviewer_id: reviewerId.trim() || null
      })

      const explRes = await axios.post(`${API}/explain/`, {
        text: review,
        confidence: predRes.data.confidence,
        reviewer_id: reviewerId.trim() || null,
        roberta_score: predRes.data.roberta_score,
        lightgbm_score: predRes.data.lightgbm_score
      })

      setResult({
        ...predRes.data,
        linguistic_flags: explRes.data.linguistic_flags,
        behavioral_flags: explRes.data.behavioral_flags,
        fusion_breakdown: explRes.data.fusion_breakdown,
        risk_level: explRes.data.risk_level
      })
    } catch {
      setError("API error — make sure FastAPI is running")
    } finally {
      setLoading(false)
    }
  }

  const tier = (c) => c >= 0.65 ? "high" : c >= (result?.threshold ?? 0.40) ? "med" : "low"

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <p className="text-[11px] tracking-[.18em] uppercase text-[#33d9c4] font-mono mb-2">Screen 01</p>
      <h1 className="font-display text-2xl font-semibold mb-2">Review Fraud Analysis</h1>
      <p className="text-[#93a3b5] mb-6 text-sm">Paste a review to check whether it looks fraudulent.</p>

      <textarea
        rows={5}
        value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="e.g. Amazing product love it best ever perfect highly recommend..."
        className="input-field w-full p-3.5 text-sm resize-y"
      />

      <input
        value={reviewerId}
        onChange={e => setReviewerId(e.target.value)}
        placeholder="Reviewer ID (optional — enables the full ensemble score)"
        className="input-field w-full p-3 text-sm font-mono mt-3"
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

          <div className="flex items-center gap-2">
            <span className={`chip ${result.method === "ensemble" ? "chip-low" : "chip-med"}`}>
              {result.method === "ensemble" ? "Ensemble (RoBERTa + LightGBM)" : "Text-only fallback"}
            </span>
            {result.method !== "ensemble" && (
              <span className="text-xs text-[#5f7186]">add a reviewer ID above for the full ensemble score</span>
            )}
          </div>

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

          {/* Component scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="stat-value">{(result.roberta_score * 100).toFixed(1)}%</div>
              <div className="stat-label">RoBERTa (text)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{result.lightgbm_score !== null ? `${(result.lightgbm_score * 100).toFixed(1)}%` : "—"}</div>
              <div className="stat-label">LightGBM (behavior)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{result.threshold.toFixed(3)}</div>
              <div className="stat-label">Threshold used</div>
            </div>
          </div>

          {/* Fusion breakdown */}
          {result.fusion_breakdown && (
            <div className="panel panel-pad">
              <h3 className="font-display font-semibold mb-3 text-sm text-[#e7edf3]">How the two signals combined</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[#93a3b5]">Text signal</span>
                <div className="track-bar h-2 flex-1">
                  <div className="track-fill bg-[#33d9c4] h-full" style={{ width: `${result.fusion_breakdown.roberta_contribution_pct}%` }} />
                </div>
                <span className="font-mono w-12 text-right">{result.fusion_breakdown.roberta_contribution_pct}%</span>
              </div>
              <div className="flex items-center gap-3 text-sm mt-2">
                <span className="text-[#93a3b5]">Behavior signal</span>
                <div className="track-bar h-2 flex-1">
                  <div className="track-fill bg-[#f0a545] h-full" style={{ width: `${result.fusion_breakdown.lightgbm_contribution_pct}%` }} />
                </div>
                <span className="font-mono w-12 text-right">{result.fusion_breakdown.lightgbm_contribution_pct}%</span>
              </div>
            </div>
          )}

          {/* Linguistic flags */}
          <div className="panel panel-pad">
            <h3 className="font-display font-semibold mb-2 text-sm text-[#e7edf3]">Text Flags</h3>
            <ul className="space-y-1.5">
              {result.linguistic_flags.map((f, i) => (
                <li key={i} className="text-sm text-[#93a3b5] flex gap-2">
                  <span className="text-[#33d9c4] mt-0.5">›</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Behavioral flags */}
          <div className="panel panel-pad">
            <h3 className="font-display font-semibold mb-2 text-sm text-[#e7edf3]">Behavioral / Network Flags</h3>
            <ul className="space-y-1.5">
              {result.behavioral_flags.map((f, i) => (
                <li key={i} className="text-sm text-[#93a3b5] flex gap-2">
                  <span className="text-[#f0a545] mt-0.5">›</span>{f}
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