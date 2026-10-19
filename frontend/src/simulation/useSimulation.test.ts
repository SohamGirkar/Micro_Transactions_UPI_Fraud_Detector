// Integration test: runs the real hook against the real FastAPI backend (default http://127.0.0.1:8000).
// Start the backend first, then: npm test
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSimulation, SPEED_MS, TIMING, ENGINE_ERROR } from './useSimulation'
import { SCENARIOS } from './scenarios'

const realFetch = globalThis.fetch
let base = process.env.API_BASE ?? 'http://127.0.0.1:8000'
let predictCalls: any[] = []
beforeEach(() => {
  predictCalls = []; base = process.env.API_BASE ?? 'http://127.0.0.1:8000'
  SPEED_MS.fast = 150; SPEED_MS.normal = 150; TIMING.tickMs = 10; TIMING.introMs = 200
  globalThis.fetch = ((u: any, o?: any) => {
    if (String(u).startsWith('/api/predict')) predictCalls.push(JSON.parse(o.body))
    return realFetch(String(u).startsWith('/') ? base + u : u, o)
  }) as any
})
const micro = SCENARIOS[0]
const direct = async (input: any) => (await realFetch((process.env.API_BASE ?? 'http://127.0.0.1:8000') + '/api/predict',
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })).json()

describe('useSimulation against the real model', () => {
  it('runs all stages sequentially; every result equals a direct /api/predict call', async () => {
    const { result } = renderHook(() => useSimulation(micro, 'fast'))
    act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 15000 })
    expect(predictCalls).toHaveLength(7)
    expect(predictCalls.map(c => c)).toEqual(micro.stages.map(s => s.input))
    for (const s of result.current.steps) {
      const d = await direct(s.stage.input)
      expect(s.result.fraud_probability).toBe(d.fraud_probability)
      expect(s.result.risk_level).toBe(d.risk_level)
      expect(s.result.shap_explanations).toEqual(d.shap_explanations)
    }
  }, 30000)

  it('ignores a second start while running (no concurrent simulations)', async () => {
    const { result } = renderHook(() => useSimulation(micro, 'fast'))
    act(() => { result.current.start(); result.current.start(); result.current.startDemo() })
    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 15000 })
    expect(predictCalls).toHaveLength(7)
  }, 30000)

  it('pause holds progress and resume continues', async () => {
    const { result } = renderHook(() => useSimulation(micro, 'fast'))
    act(() => result.current.start())
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThanOrEqual(2))
    act(() => result.current.pause())
    await new Promise(r => setTimeout(r, 400))            // let any in-flight request land
    const frozen = result.current.steps.length
    await new Promise(r => setTimeout(r, 800))
    expect(result.current.steps.length).toBe(frozen)
    expect(result.current.status).not.toBe('complete')
    act(() => result.current.resume())
    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 15000 })
    expect(result.current.steps).toHaveLength(7)
  }, 30000)

  it('reset clears everything and no stale results appear afterwards', async () => {
    const { result } = renderHook(() => useSimulation(micro, 'fast'))
    act(() => result.current.start())
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThanOrEqual(2))
    act(() => result.current.reset())
    expect(result.current.steps).toHaveLength(0); expect(result.current.status).toBe('idle')
    const callsAtReset = predictCalls.length
    await new Promise(r => setTimeout(r, 1500))
    expect(result.current.steps).toHaveLength(0); expect(result.current.status).toBe('idle')
    expect(predictCalls.length).toBe(callsAtReset)
  }, 30000)

  it('shows an error without fabricating results when the engine is offline, then retry recovers', async () => {
    base = 'http://127.0.0.1:9'                           // nothing listens here
    const { result } = renderHook(() => useSimulation(micro, 'fast'))
    act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 10000 })
    expect(result.current.error).toBe(ENGINE_ERROR); expect(result.current.steps).toHaveLength(0)
    base = process.env.API_BASE ?? 'http://127.0.0.1:8000'
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 15000 })
    expect(result.current.steps).toHaveLength(7)
  }, 40000)

  it('demo mode shows an intro phase, then runs to completion', async () => {
    const { result } = renderHook(() => useSimulation(micro, 'fast'))
    act(() => result.current.startDemo())
    expect(result.current.status).toBe('intro'); expect(result.current.demo).toBe(true)
    await waitFor(() => expect(result.current.status).toBe('running'), { timeout: 5000 })
    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 15000 })
    expect(result.current.steps).toHaveLength(7)
  }, 40000)

  it('every scenario completes through the real API', async () => {
    for (const sc of SCENARIOS) {
      const { result } = renderHook(() => useSimulation(sc, 'fast'))
      act(() => result.current.start())
      await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 15000 })
      expect(result.current.steps).toHaveLength(sc.stages.length)
      console.log(sc.name.padEnd(26), result.current.steps.map(s => `${s.result.fraud_probability.toFixed(1)}%${s.result.risk_level[0]}`).join('  '))
    }
  }, 90000)
})
