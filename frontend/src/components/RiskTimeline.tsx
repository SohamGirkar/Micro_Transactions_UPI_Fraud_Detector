import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { Step } from '../simulation/useSimulation'
import { riskColor } from '../api'

const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const EventLabel = (text: string) => ({ viewBox }: any) => (
  <text x={viewBox.x + 5} y={viewBox.y + 6} fill="#a1a1aa" fontSize={9} letterSpacing={0.5} transform={`rotate(90 ${viewBox.x + 5} ${viewBox.y + 6})`}>{text}</text>)

/** One point per completed API call; y values are the API's fraud_probability, unmodified. */
export default function RiskTimeline({ steps, total }: { steps: Step[]; total: number }) {
  const data = steps.map(s => ({ step: s.index + 1, prob: s.result.fraud_probability, risk: s.result.risk_level }))
  return (<div className="h-72"><ResponsiveContainer><LineChart data={data} margin={{ top: 10, right: 16, bottom: 4, left: -8 }}>
    <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
    <XAxis dataKey="step" type="number" domain={[1, Math.max(total, 2)]} ticks={Array.from({ length: total }, (_, i) => i + 1)} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false}
      label={{ value: 'Simulation step', position: 'insideBottom', offset: -2, fill: '#52525b', fontSize: 10 }} />
    <YAxis domain={[0, 100]} unit="%" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'MEDIUM ≥ 40%', fill: '#f59e0b', fontSize: 9, position: 'insideBottomRight' }} />
    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'HIGH ≥ 70%', fill: '#ef4444', fontSize: 9, position: 'insideBottomRight' }} />
    {steps.filter(s => s.stage.event).map(s => <ReferenceLine key={s.index} x={s.index + 1} stroke="rgba(255,255,255,.25)" strokeDasharray="2 3" label={EventLabel(s.stage.event!)} />)}
    <Tooltip contentStyle={{ background: '#111216', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Fraud probability']} labelFormatter={l => `Step ${l}`} />
    <Line dataKey="prob" stroke="#818cf8" strokeWidth={2} isAnimationActive={!reduce} animationDuration={500}
      dot={(p: any) => <circle key={p.index} cx={p.cx} cy={p.cy} r={5} fill={riskColor(p.payload.risk)} stroke="#0a0b0e" strokeWidth={2} />} />
  </LineChart></ResponsiveContainer></div>)
}
