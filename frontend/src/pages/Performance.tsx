import { ArrowRight } from 'lucide-react'
import { useApi, num } from '../api'
import { Card, Title, Kpi, Loading, PageHeader } from '../components/ui'

const steps = ['Dataset', 'Feature extraction', 'Logistic Regression', 'Fraud probability', 'Risk classification', 'SHAP', 'Human explanation']
export default function Performance() {
  const { data: m, error } = useApi<any>('/api/model-performance'); if (!m) return <Loading error={error} />
  const c = m.confusion; const pc = (v: number) => (v * 100).toFixed(2) + '%'
  const cell = (l: string, v: number, col: string) => <div className="rounded-lg p-5 text-center border" style={{ background: col + '14', borderColor: col + '40' }}><div className="text-3xl font-mono font-semibold" style={{ color: col }}>{num(v)}</div><div className="text-[11px] text-zinc-400 mt-1">{l}</div></div>
  return (<div><PageHeader title="Model Performance" sub={`${m.model} · ${num(m.dataset_size)} transactions · ${m.split} train/test split (${num(m.test_size)} held-out)`} />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"><Kpi label="Accuracy" value={pc(m.accuracy)} /><Kpi label="Precision" value={pc(m.precision)} delay={50} /><Kpi label="Recall" value={pc(m.recall)} delay={100} /><Kpi label="F1 score" value={pc(m.f1)} delay={150} /></div>
    <div className="grid lg:grid-cols-2 gap-3 mb-4"><Card><Title sub="Evaluated on the held-out 20% test set with the saved model">Confusion matrix</Title>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center text-[11px] text-zinc-500"><span /><span className="text-center">Predicted Legitimate</span><span className="text-center">Predicted Fraud</span>
        <span>Actual Legitimate</span>{cell('True Negative', c.tn, '#22c55e')}{cell('False Positive', c.fp, '#f59e0b')}
        <span>Actual Fraud</span>{cell('False Negative', c.fn, '#ef4444')}{cell('True Positive', c.tp, '#22c55e')}</div></Card>
      <Card><Title>Model pipeline</Title><div className="flex flex-col gap-1.5">{steps.map((s, i) => <div key={s}><div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 flex items-center justify-between">{s}<span className="text-[10px] text-zinc-600 font-mono">0{i + 1}</span></div>
        {i < steps.length - 1 && <ArrowRight size={14} className="rotate-90 mx-auto text-zinc-600 my-0.5" />}</div>)}</div></Card></div></div>)
}
