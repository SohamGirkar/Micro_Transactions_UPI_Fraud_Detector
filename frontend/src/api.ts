import { useEffect, useState } from 'react'
export interface Contribution { feature: string; label: string; value: number; shap: number; direction: 'increase' | 'decrease'; severity: 'high' | 'medium' | 'low'; title: string; text: string }
export interface Prediction { fraud_probability: number; risk_level: string; prediction: string; shap_explanations: Contribution[] }
export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}
export function useApi<T = any>(url: string) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState('')
  useEffect(() => { api<T>(url).then(setData).catch(e => setError(e.message)) }, [url])
  return { data, error }
}
export const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const num = (n: number) => n.toLocaleString('en-IN')
export const riskColor = (r: string) => r.startsWith('HIGH') ? '#ef4444' : r.startsWith('MED') ? '#f59e0b' : '#22c55e'
