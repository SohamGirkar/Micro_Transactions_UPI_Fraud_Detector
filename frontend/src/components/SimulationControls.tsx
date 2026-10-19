import { Play, Pause, RotateCcw, Clapperboard } from 'lucide-react'
import { Scenario } from '../simulation/scenarios'
import { Speed, Status } from '../simulation/useSimulation'

interface Props {
  scenarios: Scenario[]; scenarioId: string; onScenario: (id: string) => void
  speed: Speed; onSpeed: (s: Speed) => void; status: Status; isPaused: boolean; demo: boolean; hasSteps: boolean
  onStart: () => void; onPause: () => void; onResume: () => void; onReset: () => void; onDemo: () => void
}
const btn = 'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-35 disabled:cursor-not-allowed'

export default function SimulationControls(p: Props) {
  const live = p.status === 'intro' || p.status === 'running'
  const canChange = p.status === 'idle' || p.status === 'complete'
  return (<div className="flex flex-wrap items-end gap-4">
    <label className="block min-w-[230px]"><span className="text-xs text-zinc-400 mb-1.5 block">Scenario</span>
      <select value={p.scenarioId} disabled={!canChange} onChange={e => p.onScenario(e.target.value)}
        className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-400/60 disabled:opacity-50">
        {p.scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <div className="flex flex-wrap gap-2">
      <button className={`${btn} bg-indigo-500 hover:bg-indigo-400`} disabled={!canChange} onClick={p.onStart}><Play size={15} />START SIMULATION</button>
      {p.isPaused
        ? <button className={`${btn} border border-white/15 hover:bg-white/5`} disabled={!live} onClick={p.onResume}><Play size={15} />RESUME</button>
        : <button className={`${btn} border border-white/15 hover:bg-white/5`} disabled={!live} onClick={p.onPause}><Pause size={15} />PAUSE</button>}
      <button className={`${btn} border border-white/15 hover:bg-white/5`} disabled={p.status === 'idle' && !p.hasSteps} onClick={p.onReset}><RotateCcw size={15} />RESET</button>
      <button className={`${btn} border border-indigo-400/40 text-indigo-300 hover:bg-indigo-500/10`} disabled={live && !p.demo} onClick={p.onDemo}>
        <Clapperboard size={15} />{p.demo && p.status !== 'complete' ? 'RESTART DEMO' : 'DEMO MODE'}</button></div>
    <div role="group" aria-label="Simulation speed"><span className="text-xs text-zinc-400 mb-1.5 block">Speed</span>
      <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
        {(['slow', 'normal', 'fast'] as Speed[]).map(s => <button key={s} aria-pressed={p.speed === s} onClick={() => p.onSpeed(s)}
          className={`px-3 py-2 text-xs capitalize transition-colors ${p.speed === s ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}>{s}</button>)}</div></div>
  </div>)
}
