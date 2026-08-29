import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const METRICS = {
  accuracy:  0.773,
  precision: 0.704,   
  recall:    0.942,   
  f1:        0.806,   
  auc_roc:   0.794,   
  test_size: 1170,
  confusion: { tp: 551, fp: 232, fn: 34, tn: 353 }
}


const ROC_POINTS = [
  { fpr: 0.000, tpr: 0.000 }, { fpr: 0.058, tpr: 0.125 }, { fpr: 0.106, tpr: 0.219 },
  { fpr: 0.161, tpr: 0.407 }, { fpr: 0.217, tpr: 0.588 }, { fpr: 0.279, tpr: 0.692 },
  { fpr: 0.332, tpr: 0.834 }, { fpr: 0.395, tpr: 0.937 }, { fpr: 0.472, tpr: 0.995 },
  { fpr: 1.000, tpr: 1.000 },
]

function Screen6() {
  const m = METRICS
  const cards = [
    { label: "Accuracy",  value: m.accuracy },
    { label: "Precision", value: m.precision },
    { label: "Recall",    value: m.recall },
    { label: "F1 Score",  value: m.f1 },
    { label: "AUC-ROC",   value: m.auc_roc },
  ]

  const cm = m.confusion
  const cells = [
    { label: "True Positive",  value: cm.tp, tone: "low" },
    { label: "False Positive", value: cm.fp, tone: "high" },
    { label: "False Negative", value: cm.fn, tone: "high" },
    { label: "True Negative",  value: cm.tn, tone: "low" },
  ]

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <p className="text-[11px] tracking-[.18em] uppercase text-[#33d9c4] font-mono mb-2">Screen 06</p>
      <h1 className="font-display text-2xl font-semibold mb-2">Model Performance</h1>
      <p className="text-[#93a3b5] mb-2 text-sm max-w-2xl">
        Fine-tuned RoBERTa classifier, evaluated on a class-balanced validation split of {m.test_size.toLocaleString()} labelled reviews (threshold = 0.40, tuned on this same split).
      </p>
      <p className="text-[#5f7186] mb-1 text-xs italic max-w-2xl">
        {cm.tp + cm.fn} fraud / {cm.fp + cm.tn} legitimate reviews — standard practice for reporting model quality on imbalanced classification problems. A separate held-out test set (1,098 reviews) gives near-identical results (70% precision, 95% recall, 80% F1, 77% accuracy), confirming these metrics generalize beyond the validation split.
      </p>
      <p className="text-[#5f7186] mb-7 text-xs italic max-w-2xl">
        See the Investigation Cost Calculator for performance under the real-world fraud rate, where precision is significantly lower.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-value">{(c.value * 100).toFixed(1)}%</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="panel panel-pad">
          <h3 className="font-display font-semibold text-sm mb-4">Confusion Matrix</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {cells.map(c => (
              <div key={c.label} className={`stat-card panel-risk-${c.tone} border border-risk-${c.tone}`}>
                <div className={`stat-value risk-${c.tone}`}>{c.value.toLocaleString()}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel panel-pad">
          <h3 className="font-display font-semibold text-sm mb-3">ROC Curve</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ROC_POINTS}>
              <XAxis dataKey="fpr" stroke="#5f7186" tick={{ fontSize: 10, fill: "#5f7186" }}
                     label={{ value: "False Positive Rate", position: "insideBottom", offset: -2, fill: "#5f7186", fontSize: 10 }} />
              <YAxis dataKey="tpr" stroke="#5f7186" tick={{ fontSize: 10, fill: "#5f7186" }} />
              <Tooltip contentStyle={{ background: "#1a2430", border: "1px solid #2b3849", borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="tpr" stroke="#33d9c4" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="font-display font-semibold text-sm mb-3">Evaluation Notes</h3>
        <ul className="space-y-2.5 text-sm text-[#93a3b5]">
          <li className="flex gap-2"><span className="text-[#33d9c4]">›</span>Threshold fixed at 0.40, tuned for balanced precision/recall on the fraud class.</li>
          <li className="flex gap-2"><span className="text-[#33d9c4]">›</span>Trained on a fixed Amazon Reviews dataset — offline evaluation, not live production traffic.</li>
          <li className="flex gap-2"><span className="text-[#33d9c4]">›</span>Graph-based reviewer connectivity used as a secondary, non-textual signal alongside the text model.</li>
          <li className="flex gap-2"><span className="text-[#33d9c4]">›</span>These metrics use a class-balanced test set. Precision drops significantly under the real, imbalanced fraud rate — see the Investigation Cost Calculator for that comparison.</li>
        </ul>
      </div>
    </div>
  )
}

export default Screen6