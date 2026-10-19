import { Step } from '../simulation/useSimulation'
import { ShapBars } from './ui'

/** Renders shap_explanations exactly as returned by the API (already sorted by |SHAP|). */
export default function SimulationShap({ step }: { step?: Step }) {
  if (!step) return <p className="text-sm text-zinc-500">SHAP contributions appear after the first prediction.</p>
  return (<div><ShapBars items={step.result.shap_explanations} />
    <p className="text-[11px] text-zinc-600 mt-3">Positive values pushed this prediction toward fraud; negative values pulled it toward legitimate (log-odds vs. dataset baseline).</p></div>)
}
