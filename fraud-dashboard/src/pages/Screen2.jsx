import { useState } from "react"
import axios from "axios"

const API = "http://localhost:8000"

function Screen2() {
  const [reviewerId, setReviewerId] = useState("")
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const analyse = async () => {
    if (!reviewerId.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await axios.get(`${API}/reviewer/${reviewerId.trim()}`)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.status === 404 ? "Reviewer not found in dataset" : "API error — make sure FastAPI is running")
    } finally {
      setLoading(false)
    }
  }

  const tier = (v) => v.includes("HIGH") ? "high" : v.includes("MEDIUM") ? "med" : v.includes("LOW") ? "low" : "med"
  const scoreTier = result?.fraud_score >= 0.65 ? "high" : result?.fraud_score >= 0.40 ? "med" : "low"

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <p className="text-[11px] tracking-[.18em] uppercase text-[#33d9c4] font-mono mb-2">Screen 02</p>
      <h1 className="font-display text-2xl font-semibold mb-2">Reviewer Profile Analysis</h1>
      <p className="text-[#93a3b5] mb-6 text-sm">Enter a reviewer ID to see their full fraud profile.</p>

      <div className="flex gap-3 mb-7">
        <input
          value={reviewerId}
          onChange={e => setReviewerId(e.target.value)}
          placeholder="e.g. A102RLS4FQLC88"
          className="input-field flex-1 px-4 py-2.5 text-sm font-mono"
        />
        <button onClick={analyse} disabled={loading} className="btn-primary px-6 py-2.5 text-sm">
          {loading ? "Loading…" : "Analyse"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-[#ef6f6c]/30 bg-[#ef6f6c]/10 text-[#ff9a97] text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="panel panel-pad flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">{result.name}</h2>
              <p className="text-xs text-[#5f7186] font-mono mt-0.5">{result.reviewer_id}</p>
            </div>
            <div className={`chip chip-${scoreTier}`}>{result.fraud_score} fraud score</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Reviews",   value: result.total_reviews },
              { label: "Avg Rating",      value: `${result.avg_rating} / 5.0` },
              { label: "Fraud Score",     value: result.fraud_score, tier: scoreTier },
              { label: "Fraud Flag Rate", value: `${(result.fraud_flag_rate * 100).toFixed(0)}%` },
            ].map(m => (
              <div key={m.label} className="stat-card">
                <div className={`stat-value ${m.tier ? `risk-${m.tier}` : ""}`}>{m.value}</div>
                <div className="stat-label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="panel panel-pad">
              <h3 className="font-display font-semibold text-sm mb-3">Network Profile</h3>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Connected Reviewers", value: result.graph_degree },
                  { label: "Community ID",         value: result.community_id },
                  { label: "Ring Size",            value: result.ring_size },
                  { label: "Ring Fraud Rate",      value: `${(result.ring_fraud_rate * 100).toFixed(1)}%` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-[#5f7186]">{r.label}</span>
                    <span className="font-mono font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel panel-pad">
              <h3 className="font-display font-semibold text-sm mb-3">Behavioral Stats</h3>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Unique Products", value: result.unique_products },
                  { label: "7-Day Velocity",  value: result.velocity },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-[#5f7186]">{r.label}</span>
                    <span className="font-mono font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`panel panel-pad border ${`border-risk-${tier(result.verdict)}`} ${`panel-risk-${tier(result.verdict)}`}`}>
            <p className={`font-semibold text-sm risk-${tier(result.verdict)}`}>{result.verdict}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Screen2