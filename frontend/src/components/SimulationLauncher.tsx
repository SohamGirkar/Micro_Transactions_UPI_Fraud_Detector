import { Activity, Clapperboard, ArrowRight } from 'lucide-react'
import { Card } from './ui'
import { SCENARIOS } from '../simulation/scenarios'

export default function SimulationLauncher({ onOpen }: { onOpen: (demo: boolean) => void }) {
  const n = SCENARIOS[0].stages.length
  return (<Card className="mb-6 border-indigo-400/25 bg-gradient-to-r from-indigo-500/[0.07] to-transparent">
    <div className="flex flex-wrap items-center gap-5">
      <div className="h-10 w-10 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center"><Activity size={20} /></div>
      <div className="flex-1 min-w-[260px]"><h2 className="text-base font-semibold text-white">Live Fraud Simulation</h2>
        <p className="text-sm text-zinc-400 mt-0.5">Watch a normal UPI pattern turn into an attack. Each step is scored by the real model and explained with SHAP.</p>
        <div className="flex gap-1.5 mt-3" aria-hidden="true">{Array.from({ length: n }, (_, i) => <span key={i} className="h-1 w-8 rounded bg-white/15" />)}</div></div>
      <div className="flex gap-2">
        <button onClick={() => onOpen(false)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold transition-colors">Open simulation<ArrowRight size={15} /></button>
        <button onClick={() => onOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-indigo-400/40 text-indigo-300 hover:bg-indigo-500/10 text-sm font-semibold transition-colors"><Clapperboard size={15} />Run demo</button></div></div></Card>)
}
