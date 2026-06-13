import { useState } from "react"
import axios from "axios"

const API = "http://127.0.0.1:8000"

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

  const scoreColor = (c) => c >= 0.65 ? "text-red-600" : c >= 0.40 ? "text-yellow-600" : "text-green-600"
  const barColor   = (c) => c >= 0.65 ? "bg-red-500"  : c >= 0.40 ? "bg-yellow-500"  : "bg-green-500"
  const bgColor    = (c) => c >= 0.65 ? "bg-red-50 border-red-200" : c >= 0.40 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">📝 Review Fraud Analysis</h1>
      <p className="text-gray-500 mb-6">Paste any Amazon review to check if it's fraudulent</p>

      
      <textarea
        rows={5}
        value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="e.g. Amazing product love it best ever perfect highly recommend..."
        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={analyse}
        disabled={loading}
        className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Analysing..." : "Analyse Review"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {/* Score bar */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Fraud Probability</span>
              <span className={`font-bold ${scoreColor(result.confidence)}`}>
                {(result.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(result.confidence)}`}
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Verdict */}
          <div className={`border rounded-lg p-4 ${bgColor(result.confidence)}`}>
            <p className="font-bold text-lg">
              {result.fraud ? "🚨 FRAUD DETECTED" : "✅ LOOKS LEGITIMATE"}
            </p>
            <p className="text-sm mt-1 text-gray-700">{result.verdict}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Confidence", value: `${(result.confidence * 100).toFixed(1)}%` },
              { label: "Word Count", value: result.word_count },
              { label: "Threshold",  value: result.threshold },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Suspicious words highlighted */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm">🔴 Suspicious Words</h3>
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
              <div className="flex flex-wrap gap-2">
                {words.map((word, i) => {
                const clean = word.toLowerCase().replace(/[^a-z]/g, '')
                const isSuspicious = suspicious.includes(clean)
            return (
              <span
                key={i}
                className={`px-2 py-1 rounded text-sm ${
                  isSuspicious
                    ? "bg-red-100 text-red-700 font-semibold border border-red-300"
                    : "text-gray-700"
                }`}
              >
              {word}
            </span>
          )
        })}
      </div>
    ) : (
      <p className="text-sm text-green-600">✅ No suspicious words detected</p>
    )
  })()}
</div>

        {/* Linguistic flags */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-sm">🔎 Linguistic Flags</h3>
          <ul className="space-y-1">
            {result.flags.map((f, i) => (
              <li key={i} className="text-sm text-gray-700">{f}</li>
            ))}
          </ul>
        </div>
      </div>
      )}
    </div>
  )
}

export default Screen1