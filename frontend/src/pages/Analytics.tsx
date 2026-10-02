import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, Legend } from 'recharts'
import { useApi } from '../api'
import { Card, Title, Loading, PageHeader } from '../components/ui'
import { tip } from './Overview'

const ax = { tick: { fill: '#71717a', fontSize: 11 }, axisLine: false, tickLine: false } as const
const Rate = ({ title, sub, data }: { title: string; sub?: string; data: any[] }) => (
  <Card><Title sub={sub ?? 'Actual fraud rate (%) vs model’s average predicted probability (%)'}>{title}</Title><div className="h-60"><ResponsiveContainer><BarChart data={data}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
    <XAxis dataKey="label" {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
    <Bar dataKey="fraud_rate" name="Fraud rate" fill="#ef4444" radius={[3, 3, 0, 0]} /><Bar dataKey="avg_prob" name="Avg predicted" fill="#6366f1" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>)

export default function Analytics() {
  const { data: a, error } = useApi<any>('/api/analytics'); if (!a) return <Loading error={error} />
  const sc = (f: number) => a.scatter.filter((p: any) => p.fraud === f)
  return (<div><PageHeader title="Fraud Analytics" sub="How behavioral signals relate to fraud in the dataset and in the model’s predictions" />
    <div className="grid lg:grid-cols-2 gap-3">
      <Card><Title sub="Distribution of model-predicted fraud probability, split by actual label">Fraud probability distribution</Title><div className="h-60"><ResponsiveContainer><BarChart data={a.histogram}>
        <XAxis dataKey="bin" {...ax} interval={3} /><YAxis {...ax} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="legitimate" stackId="a" fill="#22c55e" name="Legitimate" /><Bar dataKey="fraud" stackId="a" fill="#ef4444" name="Fraud" /></BarChart></ResponsiveContainer></div></Card>
      <Card><Title sub="600 sampled transactions">Transaction amount vs fraud probability</Title><div className="h-60"><ResponsiveContainer><ScatterChart>
        <CartesianGrid stroke="rgba(255,255,255,.05)" /><XAxis dataKey="amount" type="number" name="Amount" scale="log" domain={['auto', 'auto']} {...ax} /><YAxis dataKey="prob" type="number" name="Probability %" {...ax} />
        <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Scatter name="Legitimate" data={sc(0)} fill="#22c55e" fillOpacity={0.5} /><Scatter name="Fraud" data={sc(1)} fill="#ef4444" fillOpacity={0.6} /></ScatterChart></ResponsiveContainer></div></Card>
      <Rate title="Transaction frequency vs fraud" data={a.by_transactions} /><Rate title="Account age vs fraud" data={a.by_account_age} />
      <Rate title="Failed attempts vs fraud" data={a.by_failed_attempts} /><div className="grid grid-cols-2 gap-3"><Rate title="Device" sub="Known vs new" data={a.by_device} /><Rate title="Location" sub="Same vs changed" data={a.by_location} /></div>
    </div></div>)
}
