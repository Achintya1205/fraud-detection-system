import { useState } from "react"
import axios from "axios"

function App() {
  const [review, setReview] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const analyseReview = async () => {
    if (!review.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post("http://127.0.0.1:8000/predict/", {
        text: review
      })
      setResult(response.data)
    } catch (err) {
      setError("API error — make sure FastAPI is running on port 8000")
    } finally {
      setLoading(false)
    }
  }

  const getColor = (confidence) => {
    if (confidence >= 0.65) return "#dc3545"
    if (confidence >= 0.40) return "#ffc107"
    return "#28a745"
  }

  return (
    <div style={{ maxWidth: "700px", margin: "60px auto", fontFamily: "sans-serif", padding: "0 20px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
        🔍 Review Fraud Detector
      </h1>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        Paste any Amazon review to check if it's fraudulent
      </p>

      <textarea
        rows={5}
        value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="e.g. Amazing product love it best ever perfect..."
        style={{
          width: "100%", padding: "12px", fontSize: "14px",
          border: "1px solid #ddd", borderRadius: "8px",
          resize: "vertical", boxSizing: "border-box"
        }}
      />

      <button
        onClick={analyseReview}
        disabled={loading}
        style={{
          marginTop: "12px", padding: "10px 24px",
          backgroundColor: "#0066cc", color: "white",
          border: "none", borderRadius: "6px",
          fontSize: "14px", cursor: "pointer"
        }}
      >
        {loading ? "Analysing..." : "Analyse Review"}
      </button>

      {error && (
        <div style={{ marginTop: "20px", padding: "12px", backgroundColor: "#f8d7da", borderRadius: "6px", color: "#dc3545" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "24px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>Result</h2>

          {/* Fraud score bar */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", color: "#666" }}>Fraud Probability</span>
              <span style={{ fontWeight: "bold", color: getColor(result.confidence) }}>
                {(result.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ height: "10px", backgroundColor: "#eee", borderRadius: "5px" }}>
              <div style={{
                height: "100%", borderRadius: "5px",
                width: `${result.confidence * 100}%`,
                backgroundColor: getColor(result.confidence),
                transition: "width 0.5s"
              }} />
            </div>
          </div>

          {/* Verdict */}
          <div style={{
            padding: "12px", borderRadius: "6px", marginBottom: "12px",
            backgroundColor: result.fraud ? "#f8d7da" : "#d4edda",
            color: result.fraud ? "#dc3545" : "#28a745"
          }}>
            <strong>{result.fraud ? "🚨 FRAUD DETECTED" : "✅ LOOKS LEGITIMATE"}</strong>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{result.verdict}</p>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>{(result.confidence * 100).toFixed(1)}%</div>
              <div style={{ fontSize: "12px", color: "#666" }}>Confidence</div>
            </div>
            <div style={{ flex: 1, padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>{result.word_count}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>Word Count</div>
            </div>
            <div style={{ flex: 1, padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>{result.threshold}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>Threshold</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App