import { Step } from '../simulation/useSimulation'
import { inr } from '../api'
import { RiskBadge } from './ui'

const describe = (s: Step) => { const i = s.stage.input
  return (i.new_device ? 'New device' : 'Known device') + (i.location_changed ? ' + location change' : '') }

/** Newest first. The risk badge is the API's risk_level for that transaction. */
export default function SimulationTransactionFeed({ steps }: { steps: Step[] }) {
  if (!steps.length) return <p className="text-sm text-zinc-500">No transactions yet.</p>
  return (<ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">{[...steps].reverse().map(s => (
    <li key={s.index} className="fade-up grid grid-cols-[72px_80px_1fr_auto_auto] items-center gap-3 py-2.5 text-xs">
      <span className="font-mono text-zinc-500">{s.at}</span><span className="font-mono text-zinc-100">{inr(s.stage.input.amount)}</span>
      <span className="text-zinc-400 truncate">{describe(s)} · <span className="text-zinc-500">{s.stage.label.toLowerCase()}</span></span>
      <span className="font-mono text-zinc-300">{s.result.fraud_probability.toFixed(2)}%</span><RiskBadge risk={s.result.risk_level} /></li>))}</ul>)
}
