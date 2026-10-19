import { Check } from 'lucide-react'
import { Stage } from '../simulation/scenarios'
import { Step } from '../simulation/useSimulation'
import { riskColor } from '../api'

/** Stage stepper. Completed stages are tinted by the risk level the API actually returned for that stage. */
export default function SimulationTimeline({ stages, steps, running }: { stages: Stage[]; steps: Step[]; running: boolean }) {
  const cur = steps.length - 1
  return (<ol className="flex items-start overflow-x-auto pb-1" aria-label="Attack timeline">
    {stages.map((s, i) => { const done = i <= cur; const isCur = i === cur || (running && i === cur + 1 && false)
      const col = done ? riskColor(steps[i].result.risk_level) : '#3f3f46'
      return (<li key={i} className="flex-1 min-w-[96px] flex flex-col items-center text-center relative" aria-current={isCur ? 'step' : undefined}>
        {i > 0 && <span className="absolute top-3.5 right-1/2 w-full h-px" style={{ background: i <= cur ? col + '88' : 'rgba(255,255,255,.1)' }} />}
        <span className={`relative z-10 h-7 w-7 rounded-full border flex items-center justify-center text-xs font-mono transition-all ${isCur ? 'scale-110' : ''}`}
          style={{ borderColor: col, color: col, background: done ? col + '1f' : '#0a0b0e', boxShadow: isCur ? `0 0 0 3px ${col}33` : undefined }}>
          {done && !isCur ? <Check size={13} /> : i + 1}</span>
        <span className={`mt-2 text-[10px] leading-tight tracking-wide px-1 ${done ? 'text-zinc-200' : 'text-zinc-600'} ${isCur ? 'font-semibold' : ''}`}>{s.short}</span></li>) })}
  </ol>)
}
