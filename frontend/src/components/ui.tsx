import { useEffect, useState, ReactNode } from 'react'
import { Zap, Smartphone, MapPin, ShieldAlert, Clock, IndianRupee, CalendarDays, ArrowUp, ArrowDown } from 'lucide-react'
import { Contribution, Prediction, riskColor } from '../api'

export const Card = ({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => (
  <div style={{ animationDelay: `${delay}ms` }} className={`fade-up rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5 ${className}`}>{children}</div>)
export const Title = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div className="mb-4"><h3 className="text-sm font-semibold text-zinc-200">{children}</h3>{sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}</div>)
export const Loading = ({ error }: { error?: string }) => (
  <div className="text-sm text-zinc-500 p-6">{error ? <span className="text-red-400">Could not reach the API ({error}). Is the backend running on :8000?</span> : 'Loading…'}</div>)
export const PageHeader = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-6 fade-up"><h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1><p className="text-sm text-zinc-500 mt-1">{sub}</p></div>)

export const RiskBadge = ({ risk }: { risk: string }) => {
  const c = riskColor(risk)
  return <span style={{ color: c, borderColor: c + '55', background: c + '14' }} className="text-[10px] font-semibold tracking-wider border rounded px-2 py-0.5 whitespace-nowrap">{risk}</span>
}
export const Kpi = ({ label, value, sub, accent, delay = 0 }: { label: string; value: string; sub?: string; accent?: string; delay?: number }) => (
  <Card delay={delay} className="!p-4 hover:border-white/20 transition-colors">
    <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
    <div className="text-2xl font-semibold mt-1.5 font-mono" style={{ color: accent ?? '#fff' }}>{value}</div>
    {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
  </Card>)

export function Gauge({ value, risk, size = 200 }: { value: number; risk: string; size?: number }) {
  const [v, setV] = useState(0); const r = size * 0.42; const c = 2 * Math.PI * r
  useEffect(() => { const t = setTimeout(() => setV(value), 50); return () => clearTimeout(t) }, [value])
  const col = riskColor(risk)
  return (<div className="relative shrink-0" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={12} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={12} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="text-[10px] tracking-widest text-zinc-500">FRAUD PROBABILITY</div>
      <div className="text-4xl font-semibold font-mono mt-1" style={{ color: col }}>{value.toFixed(2)}%</div>
    </div></div>)
}

export function ShapBars({ items }: { items: Contribution[] }) {
  const [on, setOn] = useState(false); useEffect(() => { setOn(false); const t = setTimeout(() => setOn(true), 50); return () => clearTimeout(t) }, [items])
  const max = Math.max(...items.map(i => Math.abs(i.shap)), 1e-9)
  return (<div className="space-y-2.5">
    {items.map(i => { const w = on ? (Math.abs(i.shap) / max) * 50 : 0; const up = i.shap > 0; const col = up ? '#ef4444' : '#22c55e'
      return (<div key={i.feature} className="grid grid-cols-[170px_1fr_64px] items-center gap-3 text-xs">
        <span className="text-zinc-400 truncate">{i.label}</span>
        <div className="relative h-5 rounded bg-white/[0.03]"><div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute top-0.5 bottom-0.5 rounded-sm" style={{ background: col, width: `${w}%`, [up ? 'left' : 'right']: '50%', transition: 'width .8s cubic-bezier(.2,.8,.2,1)' }} /></div>
        <span className="font-mono text-right" style={{ color: col }}>{up ? '+' : ''}{i.shap.toFixed(3)}</span></div>) })}
    <div className="flex justify-center gap-6 pt-2 text-[11px] text-zinc-500">
      <span className="flex items-center gap-1"><ArrowDown size={12} className="text-green-500" />Reduced fraud risk</span>
      <span className="flex items-center gap-1"><ArrowUp size={12} className="text-red-500" />Increased fraud risk</span></div></div>)
}

const ICONS: Record<string, any> = { transactions_last_hour: Zap, new_device: Smartphone, location_changed: MapPin, failed_attempts: ShieldAlert, time_since_last_transaction: Clock, amount: IndianRupee, account_age_days: CalendarDays }
export function HumanExplanations({ items }: { items: Contribution[] }) {
  return (<div className="grid md:grid-cols-2 gap-3">{items.slice(0, 6).map(i => { const Icon = ICONS[i.feature]; const up = i.direction === 'increase'; const col = up ? '#ef4444' : '#22c55e'
    return (<div key={i.feature} className="flex gap-3 rounded-lg border border-white/10 p-3 bg-white/[0.02]">
      <div className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center" style={{ background: col + '18', color: col }}><Icon size={16} /></div>
      <div><div className="flex items-center gap-2 text-sm font-medium text-zinc-100">{i.title}
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{i.severity} impact</span></div>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{i.text}</p></div></div>) })}</div>)
}

export function Explanation({ r }: { r: Prediction }) {
  return (<div className="space-y-4">
    <Card className="flex flex-col sm:flex-row items-center gap-8">
      <Gauge value={r.fraud_probability} risk={r.risk_level} />
      <div className="space-y-3"><RiskBadge risk={r.risk_level} />
        <div><div className="text-[10px] tracking-widest text-zinc-500">PREDICTION</div>
          <div className="text-2xl font-semibold" style={{ color: r.prediction === 'FRAUDULENT' ? '#ef4444' : '#22c55e' }}>{r.prediction}</div></div></div></Card>
    <Card delay={100}><Title sub="SHAP contribution of each feature, in log-odds relative to the dataset baseline">Why was this transaction flagged?</Title><ShapBars items={r.shap_explanations} /></Card>
    <Card delay={200}><Title>In plain language</Title><HumanExplanations items={r.shap_explanations} /></Card></div>)
}
