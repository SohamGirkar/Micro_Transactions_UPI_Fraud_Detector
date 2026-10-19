import { Gauge, RiskBadge } from './ui'
import { Step } from '../simulation/useSimulation'

export default function RiskGauge({ step }: { step?: Step }) {
  if (!step) return (<div className="flex flex-col items-center justify-center h-[200px] text-center text-zinc-500 text-sm">
    <div className="h-[110px] w-[110px] rounded-full border-[10px] border-white/[0.06] mb-3" />Awaiting first transaction</div>)
  const r = step.result
  return (<div className="flex flex-col items-center gap-3">
    <Gauge value={r.fraud_probability} risk={r.risk_level} />
    <div className="flex items-center gap-3"><RiskBadge risk={r.risk_level} />
      <span className="text-sm font-semibold" style={{ color: r.prediction === 'FRAUDULENT' ? '#ef4444' : '#22c55e' }}>{r.prediction}</span></div>
    <p className="sr-only" role="status" aria-live="polite">Fraud probability {r.fraud_probability.toFixed(2)} percent, {r.risk_level}, prediction {r.prediction}.</p>
  </div>)
}
