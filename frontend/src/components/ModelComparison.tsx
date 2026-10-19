// NEW FILE. Model comparison section for the Model Performance page.
// Every number and result sentence comes from GET /api/model-comparison (saved by src/model_comparison.py).
import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, Cell as RCell, XAxis, YAxis, Tooltip, Legend, ReferenceLine, LineChart, Line, CartesianGrid } from 'recharts'
import { ShieldCheck, FlaskConical } from 'lucide-react'
import { useApi, num } from '../api'
import { Card, Title } from './ui'
import { tip } from '../pages/Overview'

interface Conf { tn: number; fp: number; fn: number; tp: number }
interface At { threshold: number; accuracy: number; precision: number; recall: number; f1: number; specificity: number | null; flagged_rate: number; confusion: Conf }
interface CvStat { mean: number; std: number }
interface Model {
  id: string; name: string; short: string; description: string; preprocessing: string; hyperparameters: Record<string, any>
  train_seconds: number; search_seconds: number | null; selected_by_validation: boolean
  validation: { thresholds: Record<string, number>; at: Record<string, At> }
  test: { ranking: { roc_auc: number; average_precision: number }; [view: string]: any; pr_curve: { recall: number; precision: number }[] }
}
interface Paired { f1_diff: { mean: number; ci95: [number, number] }; roc_auc_diff: { mean: number; ci95: [number, number] } }
interface Comparison {
  meta: { split: { train_rows: number; test_rows: number; test_fraud: number }; majority_class_accuracy: number; protocol: string[]
    threshold_rules: Record<string, string>; selection_rule: string; synthetic_data_note: string; cv_folds: number; positive_class: string
    dataset: { rows: number; fraud_percent: number } }
  models: Model[]
  selection: { winner_id: string; validation_f1_at_f1_opt: Record<string, number>; winner_test_f1_gap_to_best: number; winner_within_tie_tolerance_on_test: boolean
    tie_tolerance: number; 'paired_bootstrap_vs_original_at_0.50'?: { differences: Record<string, Paired> }; [k: string]: any }
  lr_ablation_cv: { step: string; cv: Record<string, CvStat> }[]
  class_weight_effect_cv: Record<string, { best_params: Record<string, any>; cv: Record<string, CvStat> }>
  generator_oracle_test: { roc_auc: number; average_precision: number }
  serving: { model_id: string; note: string; artifact_matches_evaluated: boolean }
}

const COLORS: Record<string, string> = { lr_original: '#818cf8', lr_tuned: '#38bdf8', rf_tuned: '#c084fc' }
// view key in the JSON -> threshold rule key in meta.threshold_rules / validation.thresholds
const VIEWS = [{ key: 'at_0.50', rule: '0.50', label: 'Common 0.50' }, { key: 'at_f1_opt', rule: 'f1_opt', label: 'Validation-selected (F1)' },
  { key: 'at_youden', rule: 'youden', label: 'Validation-selected (balanced)' }]
const pc = (v: number) => (v * 100).toFixed(2) + '%'
const f4 = (v: number) => v.toFixed(4)
const sgn = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(4)

// A difference is "measurable" only if its 95% bootstrap interval excludes zero.
const side = (ci: [number, number]) => (ci[0] > 0 ? 'better' : ci[1] < 0 ? 'worse' : null)
function verdict(p: Paired) {
  const fs = side(p.f1_diff.ci95), as = side(p.roc_auc_diff.ci95)
  if (!fs && !as) return 'no measurable difference'
  return [fs && `F1 measurably ${fs}`, as && `ROC-AUC measurably ${as}`].filter(Boolean).join(', ')
}

const Cell = ({ l, v, col }: { l: string; v: number; col: string }) => (
  <div className="rounded-lg p-3 text-center border" style={{ background: col + '14', borderColor: col + '40' }}>
    <div className="text-xl font-mono font-semibold" style={{ color: col }}>{num(v)}</div><div className="text-[10px] text-zinc-400 mt-0.5">{l}</div></div>)

export default function ModelComparison() {
  const { data, error } = useApi<Comparison>('/api/model-comparison')
  const [view, setView] = useState(0)
  if (!data) return (
    <Card className="mt-6 text-sm text-zinc-500">{error
      ? <span className="text-amber-400">{error.startsWith('404')
        ? <>Model comparison results have not been generated yet. Run <code className="font-mono text-zinc-300">python UPI_Fraud_Detector/MTF/src/model_comparison.py</code>, then refresh.</>
        : <>Could not load the model comparison ({error}).</>}</span>
      : 'Loading model comparison…'}</Card>)

  const { meta, models, selection: sel } = data; const v = VIEWS[view]
  const at = (m: Model): At => m.test[v.key]
  const winner = models.find(m => m.id === sel.winner_id)!
  const paired: Record<string, Paired> = sel['paired_bootstrap_vs_original_at_0.50']?.differences ?? {}
  const majority = meta.majority_class_accuracy
  const bars = models.map(m => ({ name: m.short, id: m.id, Accuracy: at(m).accuracy }))
  const prf = models.map(m => ({ name: m.short, Precision: at(m).precision, Recall: at(m).recall, 'F1 score': at(m).f1 }))
  const prev = meta.split.test_fraud / meta.split.test_rows
  const axisPc = { tick: { fill: '#71717a', fontSize: 11 }, axisLine: false, tickLine: false, tickFormatter: (x: number) => Math.round(x * 100) + '%' }
  const th = (m: Model) => at(m).threshold.toFixed(3).replace(/0$/, '')

  return (<div className="mt-10">
    <div className="mb-4 fade-up"><h2 className="text-xl font-semibold tracking-tight text-white">Model comparison</h2>
      <p className="text-sm text-zinc-500 mt-1">Same 7 features, same {meta.split.train_rows.toLocaleString()} / {meta.split.test_rows.toLocaleString()} train/test split, same {meta.cv_folds}-fold CV for tuning · fraud is the positive class · all results below are measured on the {num(meta.split.test_rows)} held-out transactions</p></div>

    <Card className="mb-4">
      <Title sub={meta.selection_rule}>Which model wins?</Title>
      <div className="grid md:grid-cols-3 gap-2 mb-3">{models.map(m => (
        <div key={m.id} className="rounded-lg border p-3" style={{ borderColor: m.id === winner.id ? COLORS[m.id] + '99' : 'rgba(255,255,255,.1)', background: m.id === winner.id ? COLORS[m.id] + '12' : 'transparent' }}>
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium" style={{ color: COLORS[m.id] }}>{m.name}</span>
            {m.id === winner.id && <span className="text-[10px] font-semibold tracking-wider text-indigo-300 border border-indigo-400/40 rounded px-1.5 py-0.5">SELECTED</span>}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Validation F1 (fraud): <span className="font-mono text-zinc-300">{f4(sel.validation_f1_at_f1_opt[m.id])}</span></div>
          <div className="text-[11px] text-zinc-500">Test F1 at same rule: <span className="font-mono text-zinc-300">{f4(sel.test_f1_at_f1_opt[m.id])}</span></div></div>))}</div>
      <p className="text-sm text-zinc-300 leading-relaxed">By the validation rule, <b style={{ color: COLORS[winner.id] }}>{winner.name}</b> is selected.{' '}
        {sel.winner_within_tie_tolerance_on_test
          ? <>On the held-out test set the models finish within {sel.tie_tolerance} F1 of each other for the selected model (gap {f4(sel.winner_test_f1_gap_to_best)}), so the test set does not contradict the choice.</>
          : <>On the held-out test set another model scores higher (selected model is {f4(sel.winner_test_f1_gap_to_best)} F1 behind), so the validation choice should be treated with caution.</>}</p>
      {Object.keys(paired).length > 0 && <ul className="mt-3 space-y-1 text-xs text-zinc-400">{models.filter(m => paired[m.id]).map(m => { const p = paired[m.id]
        return <li key={m.id}><span style={{ color: COLORS[m.id] }}>{m.short}</span> vs original LR at 0.50 (paired bootstrap, 95% CI): ΔF1 <span className="font-mono text-zinc-300">{sgn(p.f1_diff.mean)}</span> [{sgn(p.f1_diff.ci95[0])}, {sgn(p.f1_diff.ci95[1])}] · ΔROC-AUC <span className="font-mono text-zinc-300">{sgn(p.roc_auc_diff.mean)}</span> [{sgn(p.roc_auc_diff.ci95[0])}, {sgn(p.roc_auc_diff.ci95[1])}] → <b className="text-zinc-200">{verdict(p)}</b></li> })}</ul>}
    </Card>

    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500 mr-1">Decision threshold</span>
      {VIEWS.map((o, i) => <button key={o.key} onClick={() => setView(i)} className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${i === view ? 'bg-white/10 border-white/25 text-white' : 'border-white/10 text-zinc-500 hover:text-zinc-200'}`}>{o.label}</button>)}
    </div>
    <p className="text-xs text-zinc-500 mb-3">{meta.threshold_rules[v.rule]}. Thresholds are chosen on validation (out-of-fold) predictions from the training rows, never on test labels.</p>

    <Card className="mb-4 !p-0 overflow-x-auto"><table className="w-full text-xs min-w-[900px]"><thead><tr className="text-left text-zinc-500 border-b border-white/10">
      {['Model', 'Thr.', 'Accuracy', 'Precision', 'Recall', 'F1', 'Spec.', 'ROC-AUC', 'Avg. prec.', 'TN', 'FP', 'FN', 'TP', 'Flagged', 'Fit'].map(h => <th key={h} className="px-2.5 py-2.5 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody>{models.map(m => { const a = at(m); const c = a.confusion
        return <tr key={m.id} className="border-b border-white/5 last:border-0 font-mono text-zinc-300">
          <td className="px-2.5 py-2.5 font-sans min-w-[150px]" style={{ color: COLORS[m.id] }}>{m.name}{m.id === data.serving.model_id && <span className="block w-fit mt-1 text-[9px] text-zinc-500 border border-white/15 rounded px-1">API DEFAULT</span>}</td>
          <td className="px-2.5">{th(m)}</td><td className="px-2.5">{pc(a.accuracy)}</td><td className="px-2.5">{pc(a.precision)}</td><td className="px-2.5">{pc(a.recall)}</td><td className="px-2.5">{pc(a.f1)}</td>
          <td className="px-2.5">{a.specificity == null ? 'n/a' : pc(a.specificity)}</td><td className="px-2.5">{f4(m.test.ranking.roc_auc)}</td><td className="px-2.5">{f4(m.test.ranking.average_precision)}</td>
          <td className="px-2.5">{num(c.tn)}</td><td className="px-2.5">{num(c.fp)}</td><td className="px-2.5">{num(c.fn)}</td><td className="px-2.5">{num(c.tp)}</td>
          <td className="px-2.5">{pc(a.flagged_rate)}</td><td className="px-2.5">{m.train_seconds.toFixed(2)}s</td></tr> })}</tbody></table></Card>

    <div className="grid lg:grid-cols-2 gap-3 mb-4">
      <Card><Title sub={`Dashed line: always predicting “fraud” scores ${pc(majority)}`}>Accuracy</Title>
        <div className="h-60"><ResponsiveContainer><BarChart data={bars}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} /><XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 1]} {...axisPc} /><Tooltip {...tip} formatter={(x: any) => pc(Number(x))} />
          <ReferenceLine y={majority} stroke="#a1a1aa" strokeDasharray="4 4" /><Bar dataKey="Accuracy" radius={[4, 4, 0, 0]} animationDuration={700}>{bars.map(b => <RCell key={b.id} fill={COLORS[b.id]} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
      <Card><Title sub="Fraud class; same threshold view as the table">Precision, recall and F1</Title>
        <div className="h-60"><ResponsiveContainer><BarChart data={prf}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} /><XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 1]} {...axisPc} /><Tooltip {...tip} formatter={(x: any) => pc(Number(x))} /><Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Precision" fill="#6366f1" radius={[3, 3, 0, 0]} animationDuration={700} /><Bar dataKey="Recall" fill="#22d3ee" radius={[3, 3, 0, 0]} animationDuration={700} />
          <Bar dataKey="F1 score" fill="#a78bfa" radius={[3, 3, 0, 0]} animationDuration={700} /></BarChart></ResponsiveContainer></div></Card></div>

    <div className="grid lg:grid-cols-3 gap-3 mb-4">{models.map(m => { const a = at(m); const c = a.confusion
      return <Card key={m.id}><Title sub={`threshold ${th(m)} · specificity ${a.specificity == null ? 'n/a' : pc(a.specificity)} · flags ${pc(a.flagged_rate)} of transactions`}><span style={{ color: COLORS[m.id] }}>{m.name}</span></Title>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 items-center text-[10px] text-zinc-500"><span /><span className="text-center">Pred. Legit</span><span className="text-center">Pred. Fraud</span>
          <span>Actual Legit</span><Cell l="True Neg." v={c.tn} col="#22c55e" /><Cell l="False Pos." v={c.fp} col="#f59e0b" />
          <span>Actual Fraud</span><Cell l="False Neg." v={c.fn} col="#ef4444" /><Cell l="True Pos." v={c.tp} col="#22c55e" /></div></Card> })}</div>

    <Card className="mb-4"><Title sub={`No-skill baseline = fraud share of the test set (${pc(prev)}). Each point is a threshold; the trade-off is the same shape for all three models.`}>Precision–recall trade-off (test set)</Title>
      <div className="h-64"><ResponsiveContainer><LineChart margin={{ left: 0, right: 12 }}><CartesianGrid stroke="rgba(255,255,255,.05)" />
        <XAxis type="number" dataKey="recall" domain={[0, 1]} {...axisPc} label={{ value: 'Recall', position: 'insideBottom', offset: -2, fill: '#71717a', fontSize: 11 }} />
        <YAxis type="number" dataKey="precision" domain={[0.8, 1]} {...axisPc} /><Tooltip {...tip} formatter={(x: any) => pc(Number(x))} /><Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
        <ReferenceLine y={prev} stroke="#a1a1aa" strokeDasharray="4 4" />
        {models.map(m => <Line key={m.id} data={m.test.pr_curve} dataKey="precision" name={m.short} stroke={COLORS[m.id]} strokeWidth={2} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div></Card>

    <div className="grid lg:grid-cols-2 gap-3 mb-4">
      <Card><Title sub="5-fold CV on training rows only; mean ± std">What each Logistic Regression change contributed</Title>
        <table className="w-full text-xs"><thead><tr className="text-left text-zinc-500 border-b border-white/10"><th className="py-2 font-medium">Step</th><th className="font-medium">F1</th><th className="font-medium">Precision</th><th className="font-medium">Recall</th></tr></thead><tbody className="font-mono text-zinc-300">
          {data.lr_ablation_cv.map(r => <tr key={r.step} className="border-b border-white/5 last:border-0"><td className="py-2 pr-2 font-sans text-zinc-400">{r.step}</td><td>{f4(r.cv.f1.mean)}</td><td>{f4(r.cv.precision.mean)}</td><td>{f4(r.cv.recall.mean)}</td></tr>)}
          {Object.entries(data.class_weight_effect_cv).map(([k, r]) => <tr key={k} className="border-b border-white/5 last:border-0"><td className="py-2 pr-2 font-sans text-zinc-400">Best with class_weight = {k === 'null' || k === 'None' ? 'none' : k}</td><td>{f4(r.cv.f1.mean)}</td><td>{f4(r.cv.precision.mean)}</td><td>{f4(r.cv.recall.mean)}</td></tr>)}</tbody></table>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">Weighting classes “balanced” trades recall for precision; it was measured, not assumed to help.</p></Card>
      <Card><Title sub="Chosen by cross-validation on training rows">Selected hyper-parameters</Title>
        <div className="space-y-3 text-xs">{models.filter(m => m.id !== 'lr_original').map(m => <div key={m.id}><div style={{ color: COLORS[m.id] }} className="font-medium mb-1">{m.name}</div>
          <div className="font-mono text-zinc-400 flex flex-wrap gap-x-3 gap-y-0.5">{Object.entries(m.hyperparameters).map(([k, x]) => <span key={k}>{k}={String(x)}</span>)}</div>
          <div className="text-zinc-500 mt-1">{m.preprocessing}{m.search_seconds != null && ` · search took ${m.search_seconds.toFixed(0)}s`}</div></div>)}</div></Card></div>

    <Card className="border-amber-500/20 bg-amber-500/[0.04]"><div className="flex gap-3"><FlaskConical size={18} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
        <p><b className="text-amber-300">Synthetic data limitation.</b> {meta.synthetic_data_note}</p>
        <p>The data are {meta.dataset.fraud_percent}% fraud, so predicting “fraud” for everything already scores {pc(majority)} accuracy; accuracy alone cannot separate these models. The true generating probabilities themselves reach ROC-AUC {f4(data.generator_oracle_test.roc_auc)} on the test rows, which is the ceiling for any model on these labels.</p>
        <p className="flex items-center gap-1.5 text-zinc-500"><ShieldCheck size={13} className={data.serving.artifact_matches_evaluated ? 'text-green-500' : 'text-red-400'} />{data.serving.note} {data.serving.artifact_matches_evaluated ? 'The served file is the one evaluated here.' : 'Warning: the served model file differs from the one evaluated; re-run the comparison.'}</p></div></div></Card>
  </div>)
}
