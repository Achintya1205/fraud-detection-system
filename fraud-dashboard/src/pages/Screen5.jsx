import { useState } from "react"
import axios from "axios"

const API = "https://achintya05-fraud-detection-api.hf.space"

function Screen5() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]     = useState(null)
  const [fileName, setFileName] = useState("")

const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []
    const header = lines[0].split(",").map(h => h.trim().toLowerCase())
    const col = header.indexOf("review")
    if (col === -1) return null

    if (header.length === 1) {
      return lines.slice(1).map(l => l.trim().replace(/^"|"$/g, "")).filter(Boolean)
    }

    return lines.slice(1).map(line => {
      const parts = line.match(/(".*?"|[^,]+)/g) || []
      const raw = (parts[col] || "").trim().replace(/^"|"$/g, "")
      return raw
    }).filter(Boolean)
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    setRows([])

    const text = await file.text()
    const reviews = parseCsv(text)
    if (!reviews || reviews.length === 0) {
      setError('CSV must have a "review" column with at least one row.')
      return
    }
    if (reviews.length > 25) {
      setError(`Found ${reviews.length} rows — scanning first 25 to keep this demo fast.`)
    }
    const batch = reviews.slice(0, 25)

    setLoading(true)
    setProgress(0)
    const scored = []
    for (let i = 0; i < batch.length; i++) {
      try {
        const res = await axios.post(`${API}/predict/`, { text: batch[i] })
        scored.push({ text: batch[i], ...res.data })
      } catch {
        scored.push({ text: batch[i], error: true })
      }
      setProgress(i + 1)
      setRows([...scored])
    }
    setLoading(false)
  }

  const tier = (c) => c >= 0.65 ? "high" : c >= 0.40 ? "med" : "low"
  const fraudCount = rows.filter(r => r.fraud).length

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <p className="text-[11px] tracking-[.18em] uppercase text-[#33d9c4] font-mono mb-2">Screen 05
      </p>
      <h1 className="font-display text-2xl font-semibold mb-2">Batch Review Scan</h1>
      <p className="text-[#93a3b5] mb-6 text-sm max-w-2xl">
        Upload a CSV with a <span className="font-mono text-[#e7edf3]">review</span> column to score multiple reviews at once — closer to how this would run against a real product catalog.
      </p>

      <div className="panel panel-pad mb-6">
        <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-[#2b3849] rounded-xl py-8 cursor-pointer hover:border-[#33d9c4]/40 transition">
          <span className="text-sm text-[#e7edf3] font-medium">
            {fileName || "Click to upload a CSV file"}
          </span>
          <span className="text-xs text-[#5f7186]">Must contain a "review" column · max 25 rows scanned</span>
          <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl border border-[#f0a545]/30 bg-[#f0a545]/10 text-[#ffc27a] text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4">
          <div className="track-bar h-2">
            <div className="track-fill bg-[#33d9c4] h-full" style={{ width: `${(progress / Math.min(rows.length || 1, 25)) * 100}%` }} />
          </div>
          <p className="text-xs text-[#5f7186] mt-1.5 font-mono">Scanning {progress} / {Math.min(rows.length, 25) || "…"}</p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="stat-card">
              <div className="stat-value">{rows.length}</div>
              <div className="stat-label">Scanned</div>
            </div>
            <div className="stat-card">
              <div className="stat-value risk-high">{fraudCount}</div>
              <div className="stat-label">Flagged Fraud</div>
            </div>
            <div className="stat-card">
              <div className="stat-value risk-low">{rows.length - fraudCount}</div>
              <div className="stat-label">Looks Legit</div>
            </div>
          </div>

          <div className="panel panel-pad">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Review</th>
                  <th className="pb-2 w-24">Score</th>
                  <th className="pb-2 w-40">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 text-[#93a3b5] max-w-md truncate" title={r.text}>{r.text}</td>
                    {r.error ? (
                      <td colSpan={2} className="py-2.5 text-[#ff9a97]">Failed to score</td>
                    ) : (
                      <>
                        <td className={`py-2.5 font-mono risk-${tier(r.confidence)}`}>{(r.confidence * 100).toFixed(1)}%</td>
                        <td className="py-2.5">
                          <span className={`chip chip-${tier(r.confidence)}`}>{r.fraud ? "Fraud" : "Legit"}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Screen5