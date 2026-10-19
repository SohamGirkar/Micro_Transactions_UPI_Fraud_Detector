import { ShieldAlert } from 'lucide-react'
import { Step } from '../simulation/useSimulation'

/** Rendered only when the API itself classified the latest transaction as HIGH RISK (>= 70%, thresholds from the backend). */
export default function FraudAlert({ step }: { step?: Step }) {
  if (!step || step.result.risk_level !== 'HIGH RISK') return <div role="alert" aria-live="assertive" />
  const signals = step.result.shap_explanations.filter(e => e.shap > 0).slice(0, 4)
  return (<div role="alert" aria-live="assertive" className="fade-up rounded-xl border border-red-500/40 bg-red-500/[0.07] p-4 flex gap-4 items-start">
    <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={22} />
    <div className="flex-1"><div className="text-sm font-semibold text-red-300 tracking-wide">SUSPICIOUS ACTIVITY DETECTED</div>
      <div className="text-xs text-zinc-300 mt-1">Risk level: <b>{step.result.risk_level}</b> · Fraud probability: <b className="font-mono">{step.result.fraud_probability.toFixed(2)}%</b></div>
      <div className="mt-2 text-xs text-zinc-400">Key signals (from SHAP):</div>
      <ul className="mt-1 text-xs text-zinc-200 grid sm:grid-cols-2 gap-x-6">{signals.map(s => <li key={s.feature}>• {s.title} <span className="font-mono text-red-400">+{s.shap.toFixed(2)}</span></li>)}</ul></div></div>)
}
