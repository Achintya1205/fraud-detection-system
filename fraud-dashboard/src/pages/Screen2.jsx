import { useState } from "react"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const API = "https://Achintya05-fraud-detection-api.hf.space"

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

  const verdictColor = (v) => {
    if (v.includes("HIGH"))   return "bg-red-50 border-red-200 text-red-700"
    if (v.includes("MEDIUM")) return "bg-yellow-50 border-yellow-200 text-yellow-700"
    if (v.includes("LOW"))    return "bg-green-50 border-green-200 text-green-700"
    return "bg-blue-50 border-blue-200 text-blue-700"
  }

  const ratingData = result ? [1,2,3,4,5].map(r => ({ rating: `${r}⭐`, count: 0 })) : []
  const scoreColor = result?.fraud_score >= 0.65 ? "#dc2626" : result?.fraud_score >= 0.40 ? "#d97706" : "#16a34a"

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">👤 Reviewer Profile Analysis</h1>
      <p className="text-gray-500 mb-6">Enter a reviewer ID to see their full fraud profile</p>

      <div className="flex gap-3 mb-6">
        <input
          value={reviewerId}
          onChange={e => setReviewerId(e.target.value)}
          placeholder="e.g. A102RLS4FQLC88"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={analyse}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Analyse"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-bold">{result.name}</h2>
            <p className="text-xs text-gray-400">{result.reviewer_id}</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Reviews",    value: result.total_reviews },
              { label: "Avg Rating",       value: `${result.avg_rating} / 5.0` },
              { label: "Fraud Score",      value: result.fraud_score, color: scoreColor },
              { label: "Fraud Flag Rate",  value: `${(result.fraud_flag_rate * 100).toFixed(0)}%` },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-xl font-bold" style={{ color: m.color || "inherit" }}>{m.value}</div>
                <div className="text-xs text-gray-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Network + velocity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">🕸️ Network Profile</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Connected Reviewers", value: result.graph_degree },
                  { label: "Community ID",         value: result.community_id },
                  { label: "Ring Size",            value: result.ring_size },
                  { label: "Ring Fraud Rate",      value: `${(result.ring_fraud_rate * 100).toFixed(1)}%` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">📊 Behavioral Stats</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Unique Products", value: result.unique_products },
                  { label: "7-Day Velocity",  value: result.velocity },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div className={`border rounded-lg p-4 ${verdictColor(result.verdict)}`}>
            <p className="font-bold">{result.verdict}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Screen2