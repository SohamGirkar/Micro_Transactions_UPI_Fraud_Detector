import { useState } from 'react'
import { Step } from '../simulation/useSimulation'
import { Card, Explanation } from './ui'

export default function SimulationSummary({ steps, onRunAgain, onReset }: { steps: Step[]; onRunAgain: () => void; onReset: () => void }) {
  const [full, setFull] = useState(false)
  const first = steps[0].result, last = steps[steps.length - 1].result
  const delta = last.fraud_probability - first.fraud_probability
  const signals = last.shap_explanations.filter(e => e.shap > 0).slice(0, 4)
  const item = (l: string, v: string, c?: string) => <div><div className="text-[10px] tracking-widest text-zinc-500 uppercase">{l}</div><div className="font-mono text-lg mt-0.5" style={{ color: c }}>{v}</div></div>
  const b = 'px-4 py-2 rounded-md text-sm font-semibold border border-white/15 hover:bg-white/5 transition-colors'
  return (<Card className="border-indigo-400/30">
    <div role="status" aria-live="polite" className="text-sm font-semibold tracking-wide text-white mb-4">SIMULATION COMPLETE</div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
      {item('Transactions analyzed', String(steps.length))}{item('Initial risk', first.fraud_probability.toFixed(2) + '%')}{item('Final risk', last.fraud_probability.toFixed(2) + '%')}
      {item('Risk change', (delta >= 0 ? '+' : '') + delta.toFixed(2) + ' pts', delta > 0 ? '#ef4444' : delta < 0 ? '#22c55e' : undefined)}
      {item('Final prediction', last.prediction, last.prediction === 'FRAUDULENT' ? '#ef4444' : '#22c55e')}</div>
    <div className="text-xs text-zinc-400 mb-1">Top detected signals (final transaction, from SHAP)</div>
    <ul className="text-sm text-zinc-200 mb-4 grid sm:grid-cols-2 gap-x-6">{signals.length ? signals.map(s => <li key={s.feature}>• {s.title} <span className="font-mono text-red-400">+{s.shap.toFixed(2)}</span></li>) : <li className="text-zinc-500">No feature increased the final risk.</li>}</ul>
    <p className="text-sm text-zinc-300 border-l-2 border-indigo-400/60 pl-3 mb-4">The model did not just say “fraud” — it showed which behavioral signals caused the risk to move.</p>
    <div className="flex flex-wrap gap-2"><button className={b} onClick={onRunAgain}>RUN AGAIN</button><button className={b} onClick={onReset}>RESET</button>
      <button className={b} aria-expanded={full} onClick={() => setFull(!full)}>{full ? 'HIDE FULL EXPLANATION' : 'VIEW FULL EXPLANATION'}</button></div>
    {full && <div className="mt-4"><Explanation r={last} /></div>}
  </Card>)
}
