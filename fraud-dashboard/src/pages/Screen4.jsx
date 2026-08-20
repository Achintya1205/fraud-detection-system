import { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceDot } from "recharts"

const API = "https://achintya05-fraud-detection-api.hf.space"

function Screen4() {
  const [threshold,          setThreshold]          = useState(0.40)
  const [dailyVolume,        setDailyVolume]        = useState(1000)
  const [investigationCost,  setInvestigationCost]  = useState(50)
  const [fraudRate,          setFraudRate]          = useState(5)
  const [result,             setResult]             = useState(null)
  const [prCurve,            setPrCurve]            = useState([])

  useEffect(() => {
    axios.get(`${API}/graph/pr-curve`)
      .then(res => setPrCurve(res.data.points.map(p => ({
        threshold: p.threshold,
        recall: p.recall,
        precision: p.precision
      }))))
      .catch(() => {})
  }, [])

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
    <div className="max-w-4xl mx-auto py-12 px-4">
      <p className="text-[11px] tracking-[.18em] uppercase text-[#33d9c4] font-mono mb-2">Screen 04</p>
      <h1 className="font-display text-2xl font-semibold mb-2">Investigation Cost Calculator</h1>
      <p className="text-[#93a3b5] mb-6 text-sm">Adjust the threshold and business parameters to estimate real-world investigation costs.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: `Detection Threshold`, sub: threshold,          value: threshold,         set: setThreshold,         min: 0.10, max: 0.90, step: 0.05 },
          { label: `Daily Review Volume`, sub: dailyVolume,        value: dailyVolume,       set: setDailyVolume,       min: 100,  max: 10000, step: 100 },
          { label: `Investigation Cost`,  sub: `₹${investigationCost}`, value: investigationCost, set: setInvestigationCost, min: 10,   max: 500,   step: 10 },
          { label: `Estimated Fraud Rate`,sub: `${fraudRate}%`,    value: fraudRate,         set: setFraudRate,         min: 1,    max: 20,    step: 1 },
        ].map(s => (
          <div key={s.label} className="panel panel-tight">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-xs font-medium text-[#93a3b5]">{s.label}</label>
              <span className="font-mono text-sm text-[#33d9c4]">{s.sub}</span>
            </div>
            <input
              type="range" min={s.min} max={s.max} step={s.step}
              value={s.value}
              onChange={e => s.set(parseFloat(e.target.value))}
              className="w-full accent-[#33d9c4]"
            />
          </div>
        ))}
      </div>

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Precision",            value: result.precision },
            { label: "Recall",               value: result.recall },
            { label: "Daily Investigations", value: result.flagged_per_day },
            { label: "Monthly Cost",         value: `₹${result.cost_per_month.toLocaleString()}` },
          ].map(m => (
            <div key={m.label} className="stat-card">
              <div className="stat-value">{m.value}</div>
              <div className="stat-label">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="panel panel-pad">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display font-semibold text-sm">Precision–Recall Curve</h3>
            <span className="text-[11px] text-[#5f7186] font-mono">● marker = current threshold</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prCurve}>
              <XAxis dataKey="recall" stroke="#5f7186" domain={[0, 1]} label={{ value: "Recall", position: "insideBottom", offset: -2, fill:"#5f7186" }} tick={{ fontSize: 11, fill:"#5f7186" }} />
              <YAxis dataKey="precision" stroke="#5f7186" domain={[0, 1]} label={{ value: "Precision", angle: -90, position: "insideLeft", fill:"#5f7186" }} tick={{ fontSize: 11, fill:"#5f7186" }} />
              <Tooltip contentStyle={{ background: "#1a2430", border: "1px solid #2b3849", borderRadius: 10, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="precision" stroke="#33d9c4" dot={false} strokeWidth={2} />
              {result && (
                <ReferenceDot
                  x={result.recall}
                  y={result.precision}
                  r={6} fill="#f0a545" stroke="#10161d" strokeWidth={2}
                  ifOverflow="extendDomain"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {result && (
          <div className="panel panel-pad">
            <h3 className="font-display font-semibold text-sm mb-3">Daily Breakdown</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "True Fraud Caught",  value: result.true_pos_per_day,  cls: "risk-low" },
                { label: "False Alarms",       value: result.false_pos_per_day, cls: "risk-med" },
                { label: "Missed Fraud",       value: result.missed_fraud,      cls: "risk-high" },
                { label: "Daily Cost",         value: `₹${result.cost_per_day.toLocaleString()}`, cls: "text-[#33d9c4]" },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-[#5f7186]">{r.label}</span>
                  <span className={`font-mono font-semibold ${r.cls}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="panel panel-pad border border-[#33d9c4]/25 text-sm text-[#93a3b5]">
          <span className="text-[#33d9c4] font-semibold">Insight — </span>{result.insight}
        </div>
      )}
    </div>
  )
}

export default Screen4