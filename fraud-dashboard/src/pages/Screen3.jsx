import { useState, useEffect } from "react"
import axios from "axios"
const API = "https://Achintya05-fraud-detection-api.hf.space"

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

  const riskLabel = (score) => {
    if (score > 0.10) return { label: "🚨 High",   cls: "bg-red-100 text-red-700" }
    if (score > 0.05) return { label: "⚠️ Medium", cls: "bg-yellow-100 text-yellow-700" }
    return               { label: "✅ Low",    cls: "bg-green-100 text-green-700" }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">🕸️ Fraud Ring Network</h1>
      <p className="text-gray-500 mb-6">
        Reviewers connected by shared product reviews. Small tight clusters with high fraud rates are suspicious.
      </p>

      {/* PyVis interactive graph */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-sm mb-3">Interactive Graph — drag nodes to explore</h2>
        <iframe
          src="/fraud_rings.html"
          width="100%"
          height="500px"
          className="rounded border border-gray-100"
          title="Fraud Ring Graph"
        />
      </div>

      {/* Ring table */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-4">📊 Fraud Ring Statistics</h2>

        {loading && <p className="text-gray-500 text-sm">Loading...</p>}
        {error   && <p className="text-red-500 text-sm">{error}</p>}

        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2">Community ID</th>
                <th className="pb-2">Size</th>
                <th className="pb-2">Fraud Rate</th>
                <th className="pb-2">Total Reviews</th>
                <th className="pb-2">Products</th>
                <th className="pb-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rings.map(ring => {
                const risk = riskLabel(ring.avg_fraud_score)
                return (
                  <tr key={ring.community_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-mono">{ring.community_id}</td>
                    <td className="py-2">{ring.size}</td>
                    <td className="py-2">{(ring.avg_fraud_score * 100).toFixed(1)}%</td>
                    <td className="py-2">{ring.total_reviews.toLocaleString()}</td>
                    <td className="py-2">{ring.products_targeted}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${risk.cls}`}>
                        {risk.label}
                      </span>
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