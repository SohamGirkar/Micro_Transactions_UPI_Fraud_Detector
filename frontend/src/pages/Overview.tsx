import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { useApi, inr, num } from '../api'
import { Card, Title, Kpi, Loading, PageHeader } from '../components/ui'
import TransactionTable from '../components/TransactionTable'

export const tip = { contentStyle: { background: '#111216', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 12 }, cursor: { fill: 'rgba(255,255,255,.04)' } }

const Mini = ({ title, data, k = 'count' }: { title: string; data: any[]; k?: string }) => (
  <Card><Title>{title}</Title><div className="h-32"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
    <YAxis hide /><Tooltip {...tip} /><Bar dataKey={k} fill="#6366f1" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>)
const Split = ({ title, pct, a, b }: { title: string; pct: number; a: string; b: string }) => (
  <Card><Title>{title}</Title>{[[a, 100 - pct, '#52525b'], [b, pct, '#6366f1']].map(([l, v, c]: any) => (
    <div key={l} className="mb-3 text-xs"><div className="flex justify-between text-zinc-400 mb-1"><span>{l}</span><span className="font-mono">{v.toFixed(1)}%</span></div>
      <div className="h-2 rounded bg-white/5"><div className="h-2 rounded transition-all duration-700" style={{ width: v + '%', background: c }} /></div></div>))}</Card>)

export default function Overview() {
  const { data: o, error } = useApi<any>('/api/overview'); if (!o) return <Loading error={error} />
  const s = o.signals
  return (<div>
    <PageHeader title="UPI Fraud Intelligence" sub="Real-time behavioral analysis and explainable fraud detection" />
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
      <Kpi label="Total transactions" value={num(o.total)} sub="from transactions.csv" />
      <Kpi label="Fraudulent" value={num(o.fraud)} accent="#ef4444" sub={`${num(o.legitimate)} legitimate`} delay={50} />
      <Kpi label="Fraud rate" value={o.fraud_rate + '%'} accent="#f97316" sub="fraud ÷ total" delay={100} />
      <Kpi label="Avg amount" value={inr(o.avg_amount)} sub="per transaction" delay={150} />
      <Kpi label="High risk" value={num(o.high_risk)} accent="#ef4444" sub={`${num(o.medium_risk)} medium · model ≥70%`} delay={200} />
    </div>
    <div className="grid lg:grid-cols-3 gap-3 mb-6">
      <Card className="lg:col-span-1"><Title>Legitimate vs fraudulent</Title>
        <div className="relative h-56"><ResponsiveContainer><PieChart><Pie data={[{ n: 'Legitimate', v: o.legitimate }, { n: 'Fraudulent', v: o.fraud }]} dataKey="v" nameKey="n" innerRadius="68%" outerRadius="90%" stroke="none" paddingAngle={2}>
          <Cell fill="#22c55e" /><Cell fill="#ef4444" /></Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><div className="text-3xl font-mono font-semibold">{o.fraud_rate}%</div><div className="text-[11px] text-zinc-500">fraud rate</div></div></div>
        <div className="flex justify-center gap-5 text-xs text-zinc-400 mt-2"><span><i className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />Legitimate {num(o.legitimate)}</span><span><i className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />Fraud {num(o.fraud)}</span></div></Card>
      <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3">
        <Split title="New device usage" pct={s.new_device_pct} a="Known device" b="New device" />
        <Split title="Location change" pct={s.location_changed_pct} a="Same location" b="Location changed" />
        <Mini title="Transactions per hour" data={s.transactions_last_hour} /><Mini title="Failed attempts" data={s.failed_attempts} />
      </div></div>
    <div className="grid md:grid-cols-3 gap-3 mb-6"><Mini title="Account age" data={s.account_age} /><Mini title="Time since previous transaction" data={s.time_since_last} /><Mini title="Transaction amount" data={s.amount} /></div>
    <h2 className="text-sm font-semibold text-zinc-200 mb-3">Transactions</h2><TransactionTable />
  </div>)
}
