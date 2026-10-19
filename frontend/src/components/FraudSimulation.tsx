import { useEffect, useState } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { Card, Title } from './ui'
import SimulationControls from './SimulationControls'
import SimulationTimeline from './SimulationTimeline'
import RiskGauge from './RiskGauge'
import RiskTimeline from './RiskTimeline'
import BehaviorSignals from './BehaviorSignals'
import SimulationTransactionFeed from './SimulationTransactionFeed'
import SimulationShap from './SimulationShap'
import FraudAlert from './FraudAlert'
import SimulationSummary from './SimulationSummary'
import { SCENARIOS } from '../simulation/scenarios'
import { Speed, useSimulation } from '../simulation/useSimulation'

export default function FraudSimulation({ autoDemo = false }: { autoDemo?: boolean }) {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id); const [speed, setSpeed] = useState<Speed>('normal')
  const scenario = SCENARIOS.find(s => s.id === scenarioId)!
  const sim = useSimulation(scenario, speed)
  const { steps, status } = sim
  useEffect(() => { if (autoDemo) sim.startDemo() }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const cur = steps[steps.length - 1], prev = steps[steps.length - 2]
  const next = scenario.stages[steps.length]
  const top = cur?.result.shap_explanations[0]

  // Live caption: stage text, plus (in demo mode) narration built from the real API response
  let caption = 'Choose a scenario and press START SIMULATION, or run DEMO MODE for a guided walkthrough.'
  if (status === 'intro') caption = `${scenario.name}: ${scenario.blurb} Every step below is scored live by the Logistic Regression model, and SHAP explains each score.`
  else if (cur) caption = `Stage ${cur.index + 1} of ${scenario.stages.length} — ${cur.stage.label}. ${cur.stage.description}` +
    (sim.demo && top ? ` The model returned ${cur.result.fraud_probability.toFixed(2)}% (${cur.result.risk_level}); the biggest driver was “${top.label}” (${top.shap > 0 ? '+' : ''}${top.shap.toFixed(2)}).` : '')
  else if (status === 'running') caption = 'Sending the first transaction to the fraud detection engine…'

  return (<div className="space-y-4">
    <Card><SimulationControls scenarios={SCENARIOS} scenarioId={scenarioId} speed={speed} onSpeed={setSpeed} status={status} isPaused={sim.isPaused} demo={sim.demo} hasSteps={steps.length > 0}
      onScenario={id => { sim.reset(); setScenarioId(id) }} onStart={sim.start} onPause={sim.pause} onResume={sim.resume} onReset={sim.reset}
      onDemo={sim.demo && status !== 'complete' ? sim.restartDemo : sim.startDemo} />
      <div className="mt-4 flex items-start gap-3 text-sm">
        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${status === 'error' ? 'bg-red-500' : status === 'running' || status === 'intro' ? (sim.isPaused ? 'bg-amber-500' : 'bg-green-500') : 'bg-zinc-600'}`} />
        <p role="status" aria-live="polite" className="text-zinc-300 leading-relaxed">{sim.isPaused && (status === 'running' || status === 'intro') && <b className="text-amber-400">PAUSED · </b>}{caption}</p></div>
      {status === 'error' && <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        <WifiOff size={15} />{sim.error}<span className="text-xs text-red-300/70">Model engine offline — no results are generated without it.</span>
        <button onClick={sim.retry} className="ml-auto inline-flex items-center gap-1.5 rounded border border-red-400/40 px-3 py-1 text-xs font-semibold hover:bg-red-500/10"><RefreshCw size={12} />Retry</button></div>}</Card>

    <Card><Title sub={next && status === 'running' ? `Next: ${next.label}` : undefined}>Attack timeline</Title><SimulationTimeline stages={scenario.stages} steps={steps} running={status === 'running'} /></Card>
    <FraudAlert step={cur} />

    <div className="grid lg:grid-cols-3 gap-4">
      <Card><Title>Live risk score</Title><RiskGauge step={cur} /></Card>
      <Card className="lg:col-span-2"><Title sub="Actual fraud_probability returned for each stage">Risk timeline</Title><RiskTimeline steps={steps} total={scenario.stages.length} /></Card></div>

    <div className="grid lg:grid-cols-2 gap-4">
      <Card><Title sub="Highlighted values changed from the previous step">Transaction behavior</Title><BehaviorSignals cur={cur?.stage.input} prev={prev?.stage.input} /></Card>
      <Card><Title sub="Top contributions from the SHAP explainer, for the latest transaction">Why did the risk change?</Title><SimulationShap step={cur} /></Card></div>

    <Card><Title>Live transaction stream</Title><SimulationTransactionFeed steps={steps} /></Card>
    {status === 'complete' && <SimulationSummary steps={steps} onRunAgain={sim.start} onReset={sim.reset} />}
  </div>)
}
