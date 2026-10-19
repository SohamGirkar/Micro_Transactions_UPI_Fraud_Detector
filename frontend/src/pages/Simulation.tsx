import { PageHeader } from '../components/ui'
import FraudSimulation from '../components/FraudSimulation'

export default function Simulation({ autoDemo }: { autoDemo: boolean }) {
  return (<div><PageHeader title="Live Fraud Simulation" sub="Watch a normal UPI pattern turn suspicious. Every stage is scored by the real model through /api/predict." />
    <FraudSimulation autoDemo={autoDemo} /></div>)
}
