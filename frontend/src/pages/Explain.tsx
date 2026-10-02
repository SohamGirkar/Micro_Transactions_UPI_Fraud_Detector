import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { useApi } from '../api'
import { Card, Title, Loading, PageHeader } from '../components/ui'
import { tip } from './Overview'

export default function Explain() {
  const { data, error } = useApi<any>('/api/explainability'); if (!data) return <Loading error={error} />
  return (<div><PageHeader title="Model Explainability" sub="What factors influence the model’s fraud prediction?" />
    <Card className="mb-4"><Title sub={`Global feature importance — ${data.method}`}>Ranked feature importance</Title><div className="h-80"><ResponsiveContainer><BarChart data={data.features} layout="vertical" margin={{ left: 80 }}>
      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="label" type="category" width={190} tick={{ fill: '#d4d4d8', fontSize: 12 }} axisLine={false} tickLine={false} />
      <Tooltip {...tip} /><Bar dataKey="importance" name="Mean |SHAP|" radius={[0, 4, 4, 0]} animationDuration={900}>{data.features.map((_: any, i: number) => <Cell key={i} fill={i < 3 ? '#818cf8' : '#52525b'} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
    <Card><p className="text-sm text-zinc-400 leading-relaxed">SHAP values show how each feature influenced an individual prediction relative to the model’s baseline. Positive values push the transaction toward fraud; negative values pull it toward legitimate. Averaging their absolute size across many transactions gives the global ranking above.</p></Card></div>)
}
