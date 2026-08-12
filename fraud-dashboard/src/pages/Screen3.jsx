import { useState, useEffect } from "react"
import axios from "axios"
const API = "http://localhost:8000"

function Screen3() {
  const [rings, setRings]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    axios.get(`${API}/graph/rings`)
      .then(res => setRings(res.data.rings))
      .catch(() => setError("API error — make sure FastAPI is running"))
      .finally(() => setLoading(false))
  }, [])

  const risk = (score) => {
    if (score > 0.10) return { label: "High",   tier: "high" }
    if (score > 0.05) return { label: "Medium", tier: "med" }
    return               { label: "Low",    tier: "low" }
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <p className="text-[11px] tracking-[.18em] uppercase text-[#33d9c4] font-mono mb-2">Screen 03</p>
      <h1 className="font-display text-2xl font-semibold mb-2">Fraud Ring Network</h1>
      <p className="text-[#93a3b5] mb-6 text-sm max-w-2xl">
        Reviewers connected by shared product reviews. Small, tight-knit clusters with high fraud rates are the ones worth investigating.
      </p>

      <div className="panel panel-pad mb-6">
        <h2 className="font-display font-semibold text-sm mb-3">Interactive Graph — drag nodes to explore</h2>
        <iframe
          src="/fraud_rings.html"
          width="100%"
          height="500px"
          className="rounded-xl border border-[#232f3d]"
          title="Fraud Ring Graph"
        />
      </div>

      <div className="panel panel-pad">
        <h2 className="font-display font-semibold text-sm mb-4">Fraud Ring Statistics</h2>

        {loading && <p className="text-[#5f7186] text-sm">Loading…</p>}
        {error   && <p className="text-[#ff9a97] text-sm">{error}</p>}

        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-2 font-mono">Community</th>
                <th className="pb-2">Size</th>
                <th className="pb-2">Fraud Rate</th>
                <th className="pb-2">Total Reviews</th>
                <th className="pb-2">Products</th>
                <th className="pb-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rings.map(ring => {
                const r = risk(ring.avg_fraud_score)
                return (
                  <tr key={ring.community_id}>
                    <td className="py-2.5 font-mono text-[#93a3b5]">{ring.community_id}</td>
                    <td className="py-2.5">{ring.size}</td>
                    <td className="py-2.5 font-mono">{(ring.avg_fraud_score * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono">{ring.total_reviews.toLocaleString()}</td>
                    <td className="py-2.5">{ring.products_targeted}</td>
                    <td className="py-2.5">
                      <span className={`chip chip-${r.tier}`}>{r.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Screen3