import { useState } from 'react'
import { LayoutDashboard, ScanSearch, LineChart, Gauge, Brain, ShieldCheck } from 'lucide-react'
import Overview from './pages/Overview'; import Analyzer from './pages/Analyzer'; import Analytics from './pages/Analytics'; import Performance from './pages/Performance'; import Explain from './pages/Explain'

const nav = [['Overview', LayoutDashboard, Overview], ['Transaction Analyzer', ScanSearch, Analyzer], ['Fraud Analytics', LineChart, Analytics], ['Model Performance', Gauge, Performance], ['Explainability', Brain, Explain]] as const
export default function App() {
  const [i, setI] = useState(0); const Page = nav[i][2]
  return (<div className="flex min-h-screen">
    <aside className="w-56 shrink-0 border-r border-white/10 bg-black/30 flex flex-col p-4 sticky top-0 h-screen">
      <div className="flex items-center gap-2 mb-8 px-2"><ShieldCheck size={18} className="text-indigo-400" /><span className="text-xs font-semibold tracking-[0.18em]">UPI FRAUD SENTINEL</span></div>
      <nav className="space-y-1 flex-1">{nav.map(([l, Icon], k) => <button key={l} onClick={() => setI(k)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${k === i ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}><Icon size={15} />{l}</button>)}</nav>
      <div className="text-[11px] text-zinc-500 space-y-1 border-t border-white/10 pt-3 font-mono"><div>Model: Logistic Regression</div><div>Version: V2</div><div>XAI: SHAP</div><div className="flex items-center gap-1.5">Status: <i className="w-1.5 h-1.5 rounded-full bg-green-500" />Online</div></div></aside>
    <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1400px]" key={i}><Page /></main></div>)
}
