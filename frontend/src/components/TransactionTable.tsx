import { useEffect, useState } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import { api, inr, num, Prediction } from '../api'
import { Card, RiskBadge, Loading, Explanation } from './ui'

const cols: [string, string][] = [['id', '#'], ['amount', 'Amount'], ['transactions_last_hour', 'Txns/hr'], ['account_age_days', 'Acct age'], ['new_device', 'New device'],
  ['location_changed', 'Loc. changed'], ['failed_attempts', 'Failed'], ['time_since_last_transaction', 'Since prev'], ['prob', 'Fraud prob.'], ['risk', 'Risk'], ['prediction', 'Prediction']]
const sel = 'bg-zinc-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-white/30'

export default function TransactionTable() {
  const [f, setF] = useState({ q: '', risk: '', label: '', new_device: '', location_changed: '', min_amount: '', max_amount: '' })
  const [page, setPage] = useState(1); const [sort, setSort] = useState('prob'); const [order, setOrder] = useState('desc')
  const [d, setD] = useState<any>(null); const [err, setErr] = useState(''); const [open, setOpen] = useState<number | null>(null); const [detail, setDetail] = useState<Prediction | null>(null)
  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), page_size: '10', sort, order })
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v))
    api('/api/transactions?' + p).then(setD).catch(e => setErr(e.message))
  }, [f, page, sort, order])
  useEffect(() => { setDetail(null); if (open) api(`/api/transactions/${open}/explain`).then(setDetail) }, [open])
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setPage(1) }
  const pages = d ? Math.max(1, Math.ceil(d.total / d.page_size)) : 1
  return (<Card className="!p-0 overflow-hidden">
    <div className="p-4 flex flex-wrap items-center gap-2 border-b border-white/10">
      <div className="relative"><Search size={13} className="absolute left-2 top-2 text-zinc-500" />
        <input placeholder="Txn #" value={f.q} onChange={e => set('q', e.target.value)} className={sel + ' pl-7 w-24'} /></div>
      <select className={sel} value={f.risk} onChange={e => set('risk', e.target.value)}><option value="">All risk</option><option>HIGH RISK</option><option>MEDIUM RISK</option><option>LOW RISK</option></select>
      <select className={sel} value={f.label} onChange={e => set('label', e.target.value)}><option value="">Fraud + legit</option><option value="fraud">Fraud</option><option value="legit">Legitimate</option></select>
      <select className={sel} value={f.new_device} onChange={e => set('new_device', e.target.value)}><option value="">Any device</option><option value="1">New device</option><option value="0">Known device</option></select>
      <select className={sel} value={f.location_changed} onChange={e => set('location_changed', e.target.value)}><option value="">Any location</option><option value="1">Changed</option><option value="0">Same</option></select>
      <input placeholder="Min ₹" value={f.min_amount} onChange={e => set('min_amount', e.target.value)} className={sel + ' w-20'} />
      <input placeholder="Max ₹" value={f.max_amount} onChange={e => set('max_amount', e.target.value)} className={sel + ' w-20'} />
      {d && <span className="ml-auto text-xs text-zinc-500">{num(d.total)} results</span>}</div>
    {!d ? <Loading error={err} /> : <div className="overflow-x-auto"><table className="w-full text-xs">
      <thead><tr className="text-zinc-500 text-left">{cols.map(([k, l]) => <th key={k} onClick={() => { k === sort ? setOrder(order === 'asc' ? 'desc' : 'asc') : (setSort(k), setOrder('desc')) }}
        className="px-3 py-2.5 font-medium cursor-pointer whitespace-nowrap hover:text-zinc-300"><span className="inline-flex items-center gap-1">{l}{sort === k && (order === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}</span></th>)}</tr></thead>
      <tbody>{d.rows.map((r: any) => <tr key={r.id} onClick={() => setOpen(r.id)} className="border-t border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors">
        <td className="px-3 py-2.5 font-mono text-zinc-400">{r.id}</td><td className="px-3 font-mono">{inr(r.amount)}</td><td className="px-3 font-mono">{r.transactions_last_hour}</td>
        <td className="px-3 font-mono">{r.account_age_days}d</td><td className="px-3">{r.new_device ? 'Yes' : 'No'}</td><td className="px-3">{r.location_changed ? 'Yes' : 'No'}</td>
        <td className="px-3 font-mono">{r.failed_attempts}</td><td className="px-3 font-mono">{num(r.time_since_last_transaction)}s</td><td className="px-3 font-mono">{r.prob.toFixed(2)}%</td>
        <td className="px-3"><RiskBadge risk={r.risk} /></td><td className={'px-3 ' + (r.prediction === 'FRAUDULENT' ? 'text-red-400' : 'text-green-400')}>{r.prediction}</td></tr>)}</tbody></table></div>}
    <div className="p-3 flex items-center justify-between border-t border-white/10 text-xs text-zinc-500">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/5">Previous</button>
      <span>Page {page} of {num(pages)}</span>
      <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/5">Next</button></div>
    {open && <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setOpen(null)}>
      <div className="w-full max-w-2xl h-full overflow-y-auto bg-[#0d0e12] border-l border-white/10 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4"><h2 className="font-semibold text-white">Transaction #{open}</h2><button onClick={() => setOpen(null)}><X size={18} className="text-zinc-400" /></button></div>
        {detail ? <Explanation r={detail} /> : <Loading />}</div></div>}
  </Card>)
}
