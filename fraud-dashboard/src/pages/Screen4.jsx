import { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts"

const API = "http://127.0.0.1:8000"

function Screen4() {
  const [threshold,          setThreshold]          = useState(0.40)
  const [dailyVolume,        setDailyVolume]        = useState(1000)
  const [investigationCost,  setInvestigationCost]  = useState(50)
  const [fraudRate,          setFraudRate]          = useState(5)
  const [result,             setResult]             = useState(null)
  const [prCurve,            setPrCurve]            = useState([])

  // Generate PR curve data
  useEffect(() => {
    const points = []
    for (let t = 0.05; t <= 0.95; t += 0.05) {
      const precision = Math.min(0.50 + 0.45 * Math.pow(t, 0.6), 1)
      const recall    = Math.max(1.0  - 0.95 * Math.pow(t, 1.2), 0)
      points.push({ threshold: parseFloat(t.toFixed(2)), precision: parseFloat(precision.toFixed(3)), recall: parseFloat(recall.toFixed(3)) })
    }
    setPrCurve(points)
  }, [])

  // Fetch cost analysis when sliders change
  useEffect(() => {
    axios.get(`${API}/graph/cost-analysis`, {
      params: {
        threshold,
        daily_volume     : dailyVolume,
        fraud_rate       : fraudRate / 100,
        investigation_cost: investigationCost
      }
    }).then(res => setResult(res.data))
      .catch(() => {})
  }, [threshold, dailyVolume, investigationCost, fraudRate])

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">💰 Fraud Investigation Cost Calculator</h1>
      <p className="text-gray-500 mb-6">Adjust parameters to estimate real-world investigation costs</p>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {[
          { label: `Detection Threshold: ${threshold}`,          value: threshold,         set: setThreshold,         min: 0.10, max: 0.90, step: 0.05 },
          { label: `Daily Review Volume: ${dailyVolume}`,        value: dailyVolume,       set: setDailyVolume,       min: 100,  max: 10000, step: 100 },
          { label: `Investigation Cost: ₹${investigationCost}`,  value: investigationCost, set: setInvestigationCost, min: 10,   max: 500,   step: 10 },
          { label: `Estimated Fraud Rate: ${fraudRate}%`,        value: fraudRate,         set: setFraudRate,         min: 1,    max: 20,    step: 1 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">{s.label}</label>
            <input
              type="range" min={s.min} max={s.max} step={s.step}
              value={s.value}
              onChange={e => s.set(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        ))}
      </div>

      {/* Metrics */}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Precision",            value: result.precision },
            { label: "Recall",               value: result.recall },
            { label: "Daily Investigations", value: result.flagged_per_day },
            { label: "Monthly Cost",         value: `₹${result.cost_per_month.toLocaleString()}` },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{m.value}</div>
              <div className="text-xs text-gray-500 mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* PR Curve */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Precision-Recall Curve</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prCurve}>
              <XAxis dataKey="recall"    label={{ value: "Recall",    position: "insideBottom", offset: -2 }} tick={{ fontSize: 11 }} />
              <YAxis dataKey="precision" label={{ value: "Precision", angle: -90, position: "insideLeft" }}  tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="precision" stroke="#2563eb" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost breakdown */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Daily Breakdown</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "✅ True Fraud Caught",  value: result.true_pos_per_day,  color: "text-green-600" },
                { label: "⚠️ False Alarms",       value: result.false_pos_per_day, color: "text-yellow-600" },
                { label: "❌ Missed Fraud",        value: result.missed_fraud,      color: "text-red-600" },
                { label: "💰 Daily Cost",          value: `₹${result.cost_per_day.toLocaleString()}`, color: "text-blue-600" },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-gray-600">{r.label}</span>
                  <span className={`font-bold ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insight */}
      {result && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          💡 {result.insight}
        </div>
      )}
    </div>
  )
}

export default Screen4