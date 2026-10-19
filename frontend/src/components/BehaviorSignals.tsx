import { TxnInput } from '../simulation/scenarios'
import { inr, num } from '../api'

const dur = (s: number) => s < 120 ? `${num(s)} sec` : s < 7200 ? `${Math.round(s / 60)} min` : s < 172800 ? `${(s / 3600).toFixed(1)} hr` : `${Math.round(s / 86400)} days`
const ROWS: [keyof TxnInput, string, (v: number) => string][] = [
  ['amount', 'Amount', inr], ['transactions_last_hour', 'Transactions / hour', num], ['account_age_days', 'Account age', v => `${num(v)} days`],
  ['new_device', 'New device', v => v ? 'YES' : 'NO'], ['location_changed', 'Location changed', v => v ? 'YES' : 'NO'],
  ['failed_attempts', 'Failed attempts', num], ['time_since_last_transaction', 'Time since previous', dur]]

export default function BehaviorSignals({ cur, prev }: { cur?: TxnInput; prev?: TxnInput }) {
  if (!cur) return <p className="text-sm text-zinc-500">Signals appear once the first transaction is analyzed.</p>
  return (<dl className="divide-y divide-white/5">{ROWS.map(([k, label, f]) => {
    const changed = prev !== undefined && prev[k] !== cur[k]
    const flag = (k === 'new_device' || k === 'location_changed') && cur[k] === 1
    return (<div key={`${k}-${cur[k]}`} className={`flex items-center justify-between py-2 px-2 -mx-2 rounded ${changed ? 'flash' : ''}`}>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="font-mono text-sm flex items-center gap-2">
        {changed && <span className="text-zinc-500 line-through decoration-zinc-600">{f(prev![k])}</span>}
        {changed && <span className="text-zinc-500" aria-label="changed to">→</span>}
        <span className={flag ? 'text-amber-400' : 'text-zinc-100'}>{f(cur[k])}</span>
        {changed && <span className="sr-only">(changed)</span>}</dd></div>) })}</dl>)
}
