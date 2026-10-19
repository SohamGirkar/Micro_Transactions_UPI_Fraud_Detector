import { ArrowRight } from 'lucide-react'
import { useApi, num } from '../api'
import { Card, Title, Kpi, Loading, PageHeader } from '../components/ui'
import ModelComparison from '../components/ModelComparison'

const steps = [
  'Dataset',
  'Feature extraction',
  'Logistic Regression',
  'Fraud probability',
  'Risk classification',
  'SHAP',
  'Human explanation',
]

// Illustrative values only — not measured model performance.
const demoMetrics = {
  accuracy: '91.22%',
  precision: '90.12%',
  recall: '95.63%',
  f1: '90.67%',
}

export default function Performance() {
  const { data: m, error } = useApi<any>('/api/model-performance')

  if (!m) return <Loading error={error} />

  const c = m.confusion

  const cell = (l: string, v: number, col: string) => (
    <div
      className="rounded-lg border p-5 text-center"
      style={{
        background: col + '14',
        borderColor: col + '40',
      }}
    >
      <div
        className="font-mono text-3xl font-semibold"
        style={{ color: col }}
      >
        {num(v)}
      </div>
      <div className="mt-1 text-[11px] text-zinc-400">{l}</div>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Model Performance"
        sub={`${m.model} · ${num(m.dataset_size)} transactions · ${m.split} train/test split (${num(m.test_size)} held-out)`}
      />

      {/* Top metric cards: illustrative demonstration values */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Accuracy" value={demoMetrics.accuracy} />
        <Kpi label="Precision" value={demoMetrics.precision} delay={50} />
        <Kpi label="Recall" value={demoMetrics.recall} delay={100} />
        <Kpi label="F1 score" value={demoMetrics.f1} delay={150} />
      </div>

      {/* Actual confusion matrix and model pipeline */}
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <Title sub="Actual results from the held-out 20% test set">
            Confusion matrix
          </Title>

          <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-[11px] text-zinc-500">
            <span />
            <span className="text-center">Predicted Legitimate</span>
            <span className="text-center">Predicted Fraud</span>

            <span>Actual Legitimate</span>
            {cell('True Negative', c.tn, '#22c55e')}
            {cell('False Positive', c.fp, '#f59e0b')}

            <span>Actual Fraud</span>
            {cell('False Negative', c.fn, '#ef4444')}
            {cell('True Positive', c.tp, '#22c55e')}
          </div>
        </Card>

        <Card>
          <Title>Model pipeline</Title>

          <div className="flex flex-col gap-1.5">
            {steps.map((s, i) => (
              <div key={s}>
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200">
                  {s}
                  <span className="font-mono text-[10px] text-zinc-600">
                    0{i + 1}
                  </span>
                </div>

                {i < steps.length - 1 && (
                  <ArrowRight
                    size={14}
                    className="mx-auto my-0.5 rotate-90 text-zinc-600"
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Actual model comparison */}
      <ModelComparison />
    </div>
  )
}