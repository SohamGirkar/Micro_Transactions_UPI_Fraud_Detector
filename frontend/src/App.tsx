import { useState } from 'react'
import { LayoutDashboard, ScanSearch, LineChart, Gauge, Brain, ShieldCheck, Activity } from 'lucide-react'
import Overview from './pages/Overview'; import Simulation from './pages/Simulation'; import Analyzer from './pages/Analyzer'; import Analytics from './pages/Analytics'; import Performance from './pages/Performance'; import Explain from './pages/Explain'

const nav = [['overview', 'Overview', LayoutDashboard], ['simulation', 'Live Simulation', Activity], ['analyzer', 'Transaction Analyzer', ScanSearch],
  ['analytics', 'Fraud Analytics', LineChart], ['performance', 'Model Performance', Gauge], ['explain', 'Explainability', Brain]] as const
type Id = typeof nav[number][0]

export default function App() {
  const [page, setPage] = useState<Id>('overview'); const [autoDemo, setAutoDemo] = useState(false)
  const go = (id: Id, demo = false) => { setAutoDemo(demo); setPage(id) }
  return (<div className="flex min-h-screen">
    <aside className="w-56 shrink-0 border-r border-white/10 bg-black/30 flex flex-col p-4 sticky top-0 h-screen">
      <div className="flex items-center gap-2 mb-8 px-2"><ShieldCheck size={18} className="text-indigo-400" /><span className="text-xs font-semibold tracking-[0.18em]">UPI FRAUD SENTINEL</span></div>
      <nav className="space-y-1 flex-1">{nav.map(([id, l, Icon]) => <button key={id} onClick={() => go(id)} aria-current={id === page ? 'page' : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${id === page ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}><Icon size={15} />{l}</button>)}</nav>
      <div className="text-[11px] text-zinc-500 space-y-1 border-t border-white/10 pt-3 font-mono"><div>Model: Logistic Regression</div><div>Version: V2</div><div>XAI: SHAP</div><div className="flex items-center gap-1.5">Status: <i className="w-1.5 h-1.5 rounded-full bg-green-500" />Online</div></div></aside>
    <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1400px]" key={page}>
      {page === 'overview' && <Overview onOpenSimulation={demo => go('simulation', demo)} />}
      {page === 'simulation' && <Simulation autoDemo={autoDemo} />}
      {page === 'analyzer' && <Analyzer />}{page === 'analytics' && <Analytics />}{page === 'performance' && <Performance />}{page === 'explain' && <Explain />}
    </main></div>)
}
