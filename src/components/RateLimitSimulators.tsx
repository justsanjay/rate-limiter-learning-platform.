import { useEffect, useState } from 'react'
import { runSlidingWindowTrace, simulateSlidingWindow, type SlidingWindowStep } from '../algorithms/slidingWindow'
import { simulateTokenBucket, type TokenBucketStep } from '../algorithms/tokenBucket'
import { parseTimestamps } from '../algorithms/slidingWindow'

type TokenConfig = { capacity: number; initialTokens: number; refillRate: number; frequency: number; duration: number }
type WindowConfig = { limit: number; windowSec: number; frequency: number; duration: number; timestampsText: string }
type Trace = TokenBucketStep[] | SlidingWindowStep[]

const tokenPresets: { label: string; config: TokenConfig }[] = [
  { label: 'Burst absorber', config: { capacity: 10, initialTokens: 10, refillRate: 1, frequency: 5, duration: 10 } },
  { label: 'Starved bucket', config: { capacity: 5, initialTokens: 0, refillRate: 0.5, frequency: 2, duration: 10 } },
  { label: 'Perfectly matched', config: { capacity: 5, initialTokens: 5, refillRate: 2, frequency: 2, duration: 10 } },
]
const windowPresets: { label: string; config: WindowConfig }[] = [
  { label: 'Steady traffic', config: { limit: 5, windowSec: 10, frequency: 1, duration: 20, timestampsText: '' } },
  { label: 'Burst', config: { limit: 5, windowSec: 10, frequency: 1, duration: 10, timestampsText: '0, 0.1, 0.2, 0.3, 0.4, 0.5, 11' } },
  { label: 'Boundary test', config: { limit: 3, windowSec: 10, frequency: 1, duration: 10, timestampsText: '9.9, 9.95, 10, 10.05, 10.1, 10.15' } },
]

function Field({ label, hint, value, onChange, min, max, step = 1, disabled = false }: { label: string; hint: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; disabled?: boolean }) {
  return <label className="control-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /><small>{hint}</small></label>
}

function BucketVisual({ tokens, capacity }: { tokens: number; capacity: number }) {
  const percent = Math.max(0, Math.min(100, (tokens / capacity) * 100))
  return <div className="bucket-visual" role="img" aria-label={`Token bucket contains ${tokens.toFixed(2)} of ${capacity} tokens`}>
    <div className="bucket-gauge"><div className="bucket-fill" style={{ height: `${percent}%` }} /><span className="bucket-mark mark-top" /><span className="bucket-mark mark-mid" /><span className="bucket-mark mark-low" /></div>
    <div className="bucket-caption"><strong>{tokens.toFixed(2)}</strong><span>of {capacity} tokens</span></div>
  </div>
}

function TraceTable({ rows, shown, algorithm }: { rows: Trace; shown: number; algorithm: 'token' | 'window' }) {
  if (!rows.length) return <div className="empty-trace"><span className="empty-trace-mark" />Run the simulator to build a request trace.</div>
  const visible = rows.slice(0, Math.max(shown, 0))
  return <div className="trace-table-wrap"><table className="trace-table"><thead><tr><th>Time</th>{algorithm === 'token' ? <><th>Refill</th><th>Overflow</th><th>Tokens</th></> : <><th>Evicted</th><th>In window</th><th>Remaining</th></>}<th>Result</th>{algorithm === 'token' && <th>Retry-After</th>}</tr></thead><tbody>
    {visible.slice(-60).map((row, index) => <tr key={`${row.time}-${index}`}><td>{row.time.toFixed(2)} s</td>{algorithm === 'token' ? <><td>{(row as TokenBucketStep).refill.toFixed(2)}</td><td>{(row as TokenBucketStep).overflow.toFixed(2)}</td><td>{(row as TokenBucketStep).tokensAfter.toFixed(2)}</td></> : <><td>{(row as SlidingWindowStep).evicted}</td><td>{(row as SlidingWindowStep).count}</td><td>{(row as SlidingWindowStep).remaining}</td></>}<td><span className={`result-pill ${(row as TokenBucketStep).accepted ? 'result-accept' : 'result-reject'}`}>{row.result}</span></td>{algorithm === 'token' && <td>{(row as TokenBucketStep).retryAfter === null ? 'Never' : `${((row as TokenBucketStep).retryAfter as number).toFixed(2)} s`}</td>}</tr>)}
  </tbody></table>{visible.length > 60 && <p className="trace-note">Showing the latest 60 of {visible.length} visible events.</p>}</div>
}

export function TokenBucketSimulator({ onChallengeComplete }: { onChallengeComplete?: (complete: boolean) => void }) {
  const [config, setConfig] = useState<TokenConfig>(tokenPresets[0].config)
  const [trace, setTrace] = useState<TokenBucketStep[]>([])
  const [cursor, setCursor] = useState(0)
  const [status, setStatus] = useState<'ready' | 'running' | 'paused' | 'done'>('ready')
  const [speed, setSpeed] = useState(260)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [challengePassed, setChallengePassed] = useState(false)
  const current = trace[Math.max(0, cursor - 1)]
  const accepted = trace.slice(0, cursor).filter((row) => row.accepted).length
  const rejected = cursor - accepted

  useEffect(() => {
    if (status !== 'running') return
    if (cursor >= trace.length) { setStatus('done'); return }
    const timer = window.setInterval(() => setCursor((value) => Math.min(trace.length, value + 1)), speed)
    return () => window.clearInterval(timer)
  }, [status, speed, trace.length, cursor])

  const set = (key: keyof TokenConfig, value: number) => { setConfig((previous) => key === 'capacity' ? ({ ...previous, capacity: value, initialTokens: Math.min(previous.initialTokens, value) }) : key === 'initialTokens' ? ({ ...previous, initialTokens: Math.min(value, previous.capacity) }) : ({ ...previous, [key]: value })); setError(''); setDirty(true); setChallengePassed(false); onChallengeComplete?.(false); setStatus(status === 'running' ? 'paused' : status) }
  const run = () => {
    try {
      const next = simulateTokenBucket(config)
      setTrace(next); setCursor(0); setStatus('running'); setError(''); setDirty(false); setChallengePassed(false); onChallengeComplete?.(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review the simulator values.') }
  }
  const step = () => {
    if (!trace.length || status === 'ready' || status === 'done' || dirty) {
      try { const next = simulateTokenBucket(config); setTrace(next); setCursor(Math.min(1, next.length)); setStatus(next.length <= 1 ? 'done' : 'paused'); setError('') }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Review the simulator values.') }
      setDirty(false)
      return
    }
    const next = Math.min(trace.length, cursor + 1); setCursor(next); setStatus(next === trace.length ? 'done' : 'paused')
  }
  const reset = () => { setStatus('ready'); setTrace([]); setCursor(0); setError(''); setDirty(false); setChallengePassed(false); onChallengeComplete?.(false) }
  const loadPreset = (index: number) => { setConfig(tokenPresets[index].config); setTrace([]); setCursor(0); setStatus('ready'); setError(''); setDirty(false); setChallengePassed(false); onChallengeComplete?.(false) }
  const checkChallenge = () => { const passed = trace.length === 100 && accepted / 100 >= 0.9; setChallengePassed(passed); onChallengeComplete?.(passed) }
  const displayedTokens = current ? current.tokensAfter : config.initialTokens
  return <section className="simulator-card" aria-label="Token Bucket simulator">
    <div className="simulator-top"><div><p className="eyebrow">INTERACTIVE SIMULATOR</p><h3>Token Bucket</h3><p>Virtual time, lazy refill, request cost 1.</p></div><div className="preset-select"><label htmlFor="token-preset">Guided experiment</label><select id="token-preset" onChange={(event) => loadPreset(Number(event.target.value))} defaultValue="0">{tokenPresets.map((item, index) => <option value={index} key={item.label}>{item.label}</option>)}</select></div></div>
    <div className="simulator-controls-grid"><Field label="Capacity" hint="Maximum burst tokens" min={1} max={100} value={config.capacity} onChange={(value) => set('capacity', value)} /><Field label="Initial tokens" hint="Starting bucket level" min={0} max={100} value={config.initialTokens} onChange={(value) => set('initialTokens', value)} /><Field label="Refill rate / s" hint="Tokens added per second" min={0.01} max={100} step={0.1} value={config.refillRate} onChange={(value) => set('refillRate', value)} /><Field label="Requests / s" hint="Constant arrival rate" min={0.1} max={50} step={0.1} value={config.frequency} onChange={(value) => set('frequency', value)} /><Field label="Duration / s" hint="Virtual run length" min={0.1} max={120} step={0.1} value={config.duration} onChange={(value) => set('duration', value)} /></div>
    <div className="simulator-action-row"><div className="transport-controls"><button className="button button-primary" onClick={run} aria-label="Start simulator">Start</button><button className="button button-outline" onClick={() => dirty ? run() : setStatus(status === 'running' ? 'paused' : 'running')} disabled={!trace.length || status === 'done' && !dirty}>{dirty ? 'Recalculate' : status === 'running' ? 'Pause' : 'Resume'}</button><button className="button button-outline" onClick={step} aria-label="Advance one request">Step</button><button className="button button-outline" onClick={reset}>Reset</button></div><label className="speed-control">Step speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label="Simulation speed"><option value="650">Slow</option><option value="260">Normal</option><option value="80">Fast</option></select></label></div>
    {dirty && <p className="inline-note" role="status">Settings changed. Recalculate or step to use the new values.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="simulator-display"><BucketVisual tokens={displayedTokens} capacity={Math.max(1, config.capacity)} /><div className="simulator-metrics"><Metric label="Token count" value={`${displayedTokens.toFixed(2)} / ${config.capacity}`} /><Metric label="Accepted" value={String(accepted)} /><Metric label="Rejected" value={String(rejected)} /><Metric label="Requests shown" value={`${cursor} / ${trace.length}`} /><Metric label="Refill activity" value={current ? `+${current.refill.toFixed(2)} tokens` : 'Waiting'} /><Metric label="Current decision" value={current?.result || 'Ready'} /></div></div>
    <TraceTable rows={trace} shown={cursor} algorithm="token" />
    {onChallengeComplete && <div className="challenge-strip"><div><strong>Challenge C1</strong><p>Configure the bucket so at least 90% of requests pass at 5 requests/s for 20 seconds.</p>{challengePassed && <span className="success-text" role="status">Challenge complete — {accepted}/100 requests accepted.</span>}</div><button className="button button-outline" onClick={checkChallenge} disabled={!trace.length || status === 'running' || dirty}>Check result</button></div>}
  </section>
}

export function SlidingWindowSimulator({ onChallengeComplete }: { onChallengeComplete?: (complete: boolean) => void }) {
  const [config, setConfig] = useState<WindowConfig>(windowPresets[0].config)
  const [trace, setTrace] = useState<SlidingWindowStep[]>([])
  const [cursor, setCursor] = useState(0)
  const [status, setStatus] = useState<'ready' | 'running' | 'paused' | 'done'>('ready')
  const [speed, setSpeed] = useState(260)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [challengeLimit, setChallengeLimit] = useState(2)
  const [challengeWindow, setChallengeWindow] = useState(3.5)
  const [challengePassed, setChallengePassed] = useState(false)
  const [notice, setNotice] = useState('')
  const current = trace[Math.max(0, cursor - 1)]
  const accepted = trace.slice(0, cursor).filter((row) => row.accepted).length
  const rejected = cursor - accepted

  useEffect(() => {
    if (status !== 'running') return
    if (cursor >= trace.length) { setStatus('done'); return }
    const timer = window.setInterval(() => setCursor((value) => Math.min(trace.length, value + 1)), speed)
    return () => window.clearInterval(timer)
  }, [status, speed, trace.length, cursor])

  const set = (key: keyof WindowConfig, value: number | string) => { setConfig((previous) => ({ ...previous, [key]: value })); setError(''); setDirty(true); setChallengePassed(false); onChallengeComplete?.(false); setStatus(status === 'running' ? 'paused' : status) }
  const calculate = (nextConfig = config) => {
    try {
      if (nextConfig.timestampsText.trim()) {
        const parsed = parseTimestamps(nextConfig.timestampsText)
        if (parsed.reordered) setNotice('Custom timestamps were sorted into ascending order before the run.')
        else setNotice('Custom timestamps are already in ascending order.')
      } else setNotice('Generated request times use the configured constant frequency.')
      return simulateSlidingWindow(nextConfig)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review the simulator values.'); return null }
  }
  const run = () => { const next = calculate(); if (next) { setTrace(next); setCursor(0); setStatus('running'); setError(''); setDirty(false); setChallengePassed(false); onChallengeComplete?.(false) } }
  const step = () => {
    if (!trace.length || status === 'ready' || status === 'done' || dirty) {
      const next = calculate(); if (next) { setTrace(next); setCursor(Math.min(1, next.length)); setStatus(next.length <= 1 ? 'done' : 'paused'); setDirty(false) }
      return
    }
    const next = Math.min(trace.length, cursor + 1); setCursor(next); setStatus(next === trace.length ? 'done' : 'paused')
  }
  const reset = () => { setStatus('ready'); setTrace([]); setCursor(0); setError(''); setNotice(''); setDirty(false); setChallengePassed(false); onChallengeComplete?.(false) }
  const loadPreset = (index: number) => { setConfig(windowPresets[index].config); setTrace([]); setCursor(0); setStatus('ready'); setError(''); setNotice(''); setDirty(false); setChallengePassed(false); onChallengeComplete?.(false) }
  const checkChallenge = () => { try { const result = runSlidingWindowTrace({ limit: challengeLimit, windowSec: challengeWindow }, [1, 2, 3, 4, 5, 6]); const passed = result.filter((row) => row.accepted).length === 4; setChallengePassed(passed); onChallengeComplete?.(passed) } catch { setChallengePassed(false); onChallengeComplete?.(false) } }
  const timelineEnd = Math.max(config.windowSec, current?.time || 0, ...trace.map((row) => row.time), 1)
  return <section className="simulator-card" aria-label="Sliding Window simulator">
    <div className="simulator-top"><div><p className="eyebrow">INTERACTIVE SIMULATOR</p><h3>Sliding Window Log</h3><p>Active interval (t − W, t]. Rejected requests are not stored.</p></div><div className="preset-select"><label htmlFor="window-preset">Guided experiment</label><select id="window-preset" onChange={(event) => loadPreset(Number(event.target.value))} defaultValue="0">{windowPresets.map((item, index) => <option value={index} key={item.label}>{item.label}</option>)}</select></div></div>
    <div className="simulator-controls-grid window-controls"><Field label="Maximum requests" hint="Accepted requests per window" min={1} max={100} value={config.limit} onChange={(value) => set('limit', value)} /><Field label="Window length / s" hint="Moving window duration" min={0.01} max={3600} step={0.1} value={config.windowSec} onChange={(value) => set('windowSec', value)} /><Field label="Requests / s" hint="Used if custom times are empty" min={0.1} max={50} step={0.1} value={config.frequency} onChange={(value) => set('frequency', value)} /><Field label="Duration / s" hint="Generated traffic duration" min={0.1} max={3600} step={0.1} value={config.duration} onChange={(value) => set('duration', value)} /></div>
    <label className="timestamps-field"><span>Custom timestamps <small>Optional · seconds, separated by spaces, commas or semicolons</small></span><textarea rows={2} value={config.timestampsText} onChange={(event) => set('timestampsText', event.target.value)} placeholder="0, 0.1, 0.2, 10.1" aria-label="Custom timestamps in seconds" /></label>
    <div className="simulator-action-row"><div className="transport-controls"><button className="button button-primary" onClick={run}>Start</button><button className="button button-outline" onClick={() => dirty ? run() : setStatus(status === 'running' ? 'paused' : 'running')} disabled={!trace.length || status === 'done' && !dirty}>{dirty ? 'Recalculate' : status === 'running' ? 'Pause' : 'Resume'}</button><button className="button button-outline" onClick={step}>Step</button><button className="button button-outline" onClick={reset}>Reset</button></div><label className="speed-control">Step speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label="Simulation speed"><option value="650">Slow</option><option value="260">Normal</option><option value="80">Fast</option></select></label></div>
    {dirty && <p className="inline-note" role="status">Settings changed. Recalculate or step to use the new values.</p>}
    {notice && <p className="inline-note" role="status">{notice}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    <div className="window-live-panel"><div className="window-stat-row"><Metric label="Current count" value={`${current?.count || 0} / ${config.limit}`} /><Metric label="Remaining capacity" value={String(current?.remaining ?? config.limit)} /><Metric label="Accepted" value={String(accepted)} /><Metric label="Rejected" value={String(rejected)} /><Metric label="Current time" value={`${(current?.time || 0).toFixed(2)} s`} /></div><Timeline rows={trace.slice(0, cursor)} start={Math.max(0, (current?.time || 0) - config.windowSec)} end={Math.max(timelineEnd, (current?.time || 0) + 0.01)} now={current?.time || 0} /></div>
    <TraceTable rows={trace} shown={cursor} algorithm="window" />
    {onChallengeComplete && <div className="challenge-strip"><div><strong>Challenge C2</strong><p>Choose a limit and window so exactly 4 of 1, 2, 3, 4, 5, 6 seconds are accepted.</p><div className="challenge-inputs"><label>Limit <input type="number" min={1} max={10} value={challengeLimit} onChange={(event) => { setChallengeLimit(Number(event.target.value)); setChallengePassed(false); onChallengeComplete(false) }} /></label><label>Window in seconds <input type="number" min={0.1} max={20} step={0.1} value={challengeWindow} onChange={(event) => { setChallengeWindow(Number(event.target.value)); setChallengePassed(false); onChallengeComplete(false) }} /></label></div>{challengePassed && <span className="success-text" role="status">Challenge complete — exactly four requests passed.</span>}</div><button className="button button-outline" onClick={checkChallenge}>Check configuration</button></div>}
  </section>
}

function Timeline({ rows, start, end, now }: { rows: SlidingWindowStep[]; start: number; end: number; now: number }) {
  const width = Math.max(end - start, 0.01)
  const left = Math.max(0, Math.min(100, ((now - start) / width) * 100))
  const windowWidth = Math.min(100, (Math.max(0, now - start) / width) * 100)
  return <div className="sim-timeline" aria-label="Sliding window timeline"><div className="timeline-window" style={{ left: `${left - windowWidth}%`, width: `${windowWidth}%` }} /><span className="timeline-now" style={{ left: `${left}%` }}><i />now</span>{rows.map((row, index) => <span key={`${row.time}-${index}`} title={`${row.time.toFixed(2)} seconds — ${row.result}`} className={`timeline-mark ${row.accepted ? 'mark-accepted' : 'mark-rejected'}`} style={{ left: `${Math.max(0, Math.min(100, ((row.time - start) / width) * 100))}%` }} />)}<div className="timeline-axis"><span>{start.toFixed(1)} s</span><span>{end.toFixed(1)} s</span></div></div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div> }

