import { useCallback, useEffect, useRef, useState } from 'react'
import { api, Prediction } from '../api'
import { Scenario, Stage } from './scenarios'

export type Status = 'idle' | 'intro' | 'running' | 'error' | 'complete'
export interface Step { index: number; stage: Stage; result: Prediction; at: string }
export type Speed = 'slow' | 'normal' | 'fast'
export const SPEED_MS: Record<Speed, number> = { slow: 5000, normal: 3000, fast: 1500 }
export const TIMING = { introMs: 5000, tickMs: 100 }
export const ENGINE_ERROR = 'Unable to reach fraud detection engine.'

/** Sequential simulation engine. Each stage is scored by the existing POST /api/predict; nothing is computed client-side.
 *  Every run gets an id; any await that resumes after reset/restart sees a stale id and discards its result. */
export function useSimulation(scenario: Scenario, speed: Speed) {
  const [status, setStatus] = useState<Status>('idle')
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [demo, setDemo] = useState(false)
  const runId = useRef(0), active = useRef(false), paused = useRef(false)
  const abort = useRef<AbortController | null>(null), stepsRef = useRef<Step[]>([])
  const speedRef = useRef(speed), scenarioRef = useRef(scenario)
  speedRef.current = speed

  // Pausable, cancellable delay: elapsed time only accrues while not paused
  const wait = async (ms: () => number, id: number) => {
    let elapsed = 0
    while (elapsed < ms()) {
      if (runId.current !== id) return false
      await new Promise(r => setTimeout(r, TIMING.tickMs))
      if (!paused.current) elapsed += TIMING.tickMs
    }
    return runId.current === id
  }

  const run = useCallback(async (from: number, intro: boolean) => {
    const id = ++runId.current
    abort.current?.abort()
    active.current = true
    setError('')
    const stages = scenarioRef.current.stages
    if (intro) { setStatus('intro'); if (!(await wait(() => TIMING.introMs, id))) return }
    for (let i = from; i < stages.length; i++) {
      if (runId.current !== id) return
      setStatus('running')
      const ctl = new AbortController(); abort.current = ctl
      let result: Prediction
      try { result = await api<Prediction>('/api/predict', stages[i].input, ctl.signal) }
      catch { if (runId.current !== id) return; active.current = false; setError(ENGINE_ERROR); setStatus('error'); return }
      if (runId.current !== id) return
      stepsRef.current = [...stepsRef.current, { index: i, stage: stages[i], result, at: new Date().toLocaleTimeString('en-GB') }]
      setSteps(stepsRef.current)
      if (i === stages.length - 1) { active.current = false; setStatus('complete'); return }
      if (!(await wait(() => SPEED_MS[speedRef.current], id))) return
    }
  }, [])

  const clear = useCallback(() => {
    runId.current++; abort.current?.abort(); active.current = false; paused.current = false
    stepsRef.current = []; setSteps([]); setError(''); setIsPaused(false); setStatus('idle')
  }, [])

  const begin = (isDemo: boolean) => {
    if (active.current) return                       // never allow two simulations at once
    clear(); scenarioRef.current = scenario; setDemo(isDemo); run(0, isDemo)
  }
  const start = () => begin(false)
  const startDemo = () => begin(true)
  const restartDemo = () => { clear(); setTimeout(() => begin(true), 0) }
  const pause = () => { paused.current = true; setIsPaused(true) }
  const resume = () => { paused.current = false; setIsPaused(false) }
  const reset = () => { clear(); setDemo(false) }
  const retry = () => { if (status === 'error') run(stepsRef.current.length, false) }
  useEffect(() => () => { runId.current++; abort.current?.abort(); active.current = false }, [])

  return { status, steps, error, isPaused, demo, start, startDemo, restartDemo, pause, resume, reset, retry }
}
