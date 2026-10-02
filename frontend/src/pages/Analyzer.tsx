import { useState } from 'react'
import { Loader2, ScanSearch } from 'lucide-react'
import { api, Prediction } from '../api'
import { Card, PageHeader, Explanation } from '../components/ui'

const inp = 'w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-400/60 font-mono'
const Field = ({ label, children }: any) => <label className="block"><span className="text-xs text-zinc-400 mb-1.5 block">{label}</span>{children}</label>
const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => (
  <button type="button" onClick={() => set(!on)} className="flex items-center justify-between w-full border border-white/10 rounded-md px-3 py-2 bg-zinc-900 text-sm">
    <span className="text-zinc-300">{label}</span><span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${on ? 'bg-amber-500' : 'bg-zinc-700'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} /></span></button>)

export default function Analyzer() {
  const [f, setF] = useState({ amount: 100, transactions_last_hour: 3, account_age_days: 400, new_device: false, location_changed: false, failed_attempts: 0, time_since_last_transaction: 600 })
  const [res, setRes] = useState<Prediction | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const n = (k: string) => (e: any) => setF({ ...f, [k]: Number(e.target.value) })
  const run = async () => { setBusy(true); setErr(''); try { setRes(await api('/api/predict', { ...f, new_device: +f.new_device, location_changed: +f.location_changed })) } catch (e: any) { setErr(e.message) } setBusy(false) }
  return (<div>
    <PageHeader title="Analyze a Transaction" sub="Evaluate behavioral signals and understand why the model considers a transaction risky." />
    <Card className="mb-4"><div className="grid md:grid-cols-3 gap-4">
      <Field label="Transaction amount (₹)"><div className="relative"><span className="absolute left-3 top-2 text-zinc-500 text-sm">₹</span><input type="number" min={0} className={inp + ' pl-7'} value={f.amount} onChange={n('amount')} /></div></Field>
      <Field label={`Transactions in last hour: ${f.transactions_last_hour}`}><input type="range" min={0} max={15} className="w-full accent-indigo-500" value={f.transactions_last_hour} onChange={n('transactions_last_hour')} /></Field>
      <Field label={`Failed attempts: ${f.failed_attempts}`}><input type="range" min={0} max={8} className="w-full accent-indigo-500" value={f.failed_attempts} onChange={n('failed_attempts')} /></Field>
      <Field label="Account age (days)"><input type="number" min={0} className={inp} value={f.account_age_days} onChange={n('account_age_days')} /></Field>
      <Field label="Time since previous transaction (seconds)"><input type="number" min={0} className={inp} value={f.time_since_last_transaction} onChange={n('time_since_last_transaction')} /></Field>
      <div className="space-y-2 pt-5"><Toggle label="New device" on={f.new_device} set={v => setF({ ...f, new_device: v })} /><Toggle label="Location changed" on={f.location_changed} set={v => setF({ ...f, location_changed: v })} /></div></div>
      <button onClick={run} disabled={busy} className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-indigo-500 hover:bg-indigo-400 transition-colors text-sm font-semibold tracking-wide">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />}ANALYZE TRANSACTION</button>
      {err && <p className="text-sm text-red-400 mt-3">Request failed: {err}. Is the backend running?</p>}</Card>
    {res && <Explanation r={res} />}
  </div>)
}
