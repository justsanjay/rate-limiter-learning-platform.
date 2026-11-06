import { useEffect, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { runTokenBucketTrace } from "../algorithms/tokenBucket"

export function RequestFloodDemo() {
  const [requestsPerSecond, setRequestsPerSecond] = useState(24)
  const [limited, setLimited] = useState(true)
  const [ran, setRan] = useState(false)
  const [running, setRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(20)
  const allResults = useMemo(() => {
    const arrivals = Array.from({ length: requestsPerSecond * 20 }, (_, index) => Math.floor(index / requestsPerSecond))
    const tokenRows = runTokenBucketTrace({ capacity: 10, initialTokens: 10, refillRate: 10 }, arrivals)
    return Array.from({ length: 20 }, (_, second) => {
      const group = tokenRows.slice(second * requestsPerSecond, (second + 1) * requestsPerSecond)
      const limitedAccepted = group.filter((row) => row.accepted).length
      const load = limited ? limitedAccepted / 12 * 100 : requestsPerSecond / 12 * 100
      const processed = limited ? limitedAccepted : Math.min(12, requestsPerSecond)
      const rejected = limited ? group.length - limitedAccepted : Math.max(0, requestsPerSecond - processed)
      return { second, load, processed, rejected, status: !limited && requestsPerSecond > 10 ? '503' : limited && rejected ? '429' : '200' }
    })
  }, [limited, requestsPerSecond])
  const chart = allResults.slice(0, Math.max(1, elapsedSeconds))
  const peak = Math.max(...chart.map((point) => point.load))
  const latest = chart.at(-1)!
  useEffect(() => {
    if (!running) return
    if (elapsedSeconds >= 20) { setRunning(false); return }
    const timer = window.setTimeout(() => setElapsedSeconds((value) => Math.min(20, value + 1)), 300)
    return () => window.clearTimeout(timer)
  }, [running, elapsedSeconds])
  return <section className="demo-card flood-demo" aria-labelledby="flood-heading">
    <div className="demo-card-heading"><div><p className="eyebrow">LIVE DEMONSTRATION</p><h3 id="flood-heading">Request flood</h3><p>See how a 12 requests/s server handles twenty seconds of traffic.</p></div><span className="live-tag"><span />Virtual clock</span></div>
    <div className="flood-controls"><label className="control-field flood-slider"><span>Requests per second <strong>{requestsPerSecond}</strong></span><input type="range" min="1" max="100" value={requestsPerSecond} onChange={(event) => { setRequestsPerSecond(Number(event.target.value)); setRan(false); setRunning(false); setElapsedSeconds(20) }} aria-label="Requests per second" /><small>Drag to change incoming traffic from 1 to 100 requests per second.</small></label><label className="toggle-control"><input type="checkbox" checked={limited} onChange={(event) => { setLimited(event.target.checked); setRan(false); setRunning(false); setElapsedSeconds(20) }} /><span className="toggle-track" aria-hidden="true" /><span>Rate limiter on</span></label><button className="button button-primary" onClick={() => { setRan(true); setElapsedSeconds(0); setRunning(true) }}>{running ? `Running ${elapsedSeconds}/20 s` : ran ? 'Replay 20 seconds' : 'Run 20 seconds'}</button></div>
    <div className="pipeline-panel"><div className="pipeline-heading"><strong>Request path</strong><span>{limited ? 'Limiter active' : 'Limiter bypassed'}</span></div><svg viewBox="0 0 600 102" role="img" aria-label={`Client sends ${requestsPerSecond} requests per second through ${limited ? 'the rate limiter' : 'without a rate limiter'}, to a server that processes up to 12 requests per second`}><defs><marker id="pipelineArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7z" fill="#8498a9" /></marker></defs><rect x="14" y="28" width="110" height="46" rx="6" fill="#f4f7f9" stroke="#cfd9e1" /><text x="69" y="47" textAnchor="middle" fill="#344d61" fontSize="11" fontWeight="650">Client</text><text x="69" y="62" textAnchor="middle" fill="#5e7080" fontSize="8">{requestsPerSecond} req/s</text><path d="M124 51h76" stroke="#8498a9" strokeWidth="1.5" markerEnd="url(#pipelineArrow)" /><rect x="205" y="28" width="155" height="46" rx="6" fill={limited ? '#edf4fb' : '#f6f7f8'} stroke={limited ? '#adc5d9' : '#cfd9e1'} /><text x="282" y="47" textAnchor="middle" fill="#344d61" fontSize="11" fontWeight="650">Rate Limiter</text><text x="282" y="62" textAnchor="middle" fill="#5e7080" fontSize="8">{limited ? 'Token Bucket · 10 req/s' : 'Bypassed'}</text><path d="M360 51h76" stroke="#8498a9" strokeWidth="1.5" markerEnd="url(#pipelineArrow)" /><rect x="442" y="28" width="143" height="46" rx="6" fill={peak > 100 ? '#fff1f0' : '#edf7f0'} stroke={peak > 100 ? '#e4c0be' : '#c5ddcd'} /><text x="513" y="47" textAnchor="middle" fill="#344d61" fontSize="11" fontWeight="650">Server</text><text x="513" y="62" textAnchor="middle" fill="#5e7080" fontSize="8">{latest.processed} processed · {latest.status}</text>{Array.from({ length: Math.min(4, Math.ceil(latest.processed / 3)) }, (_, index) => <circle key={`pass-${index}`} cx={153 + index * 13} cy="20" r="3.2" fill="#4d8b65" />)}{latest.rejected > 0 && Array.from({ length: 3 }, (_, index) => <circle key={`reject-${index}`} cx={391 + index * 13} cy="83" r="3.2" fill="#b34f4d" />)}</svg><div className="pipeline-legend"><span><i className="packet-accepted" />Accepted: {latest.processed} per second</span><span><i className="packet-rejected" />Rejected: {latest.rejected} per second{latest.rejected > 0 ? ` (${latest.status === '503' ? 'server overload' : 'rate limited'})` : ''}</span></div></div>
    <div className="flood-results">
      <div className="load-panel"><div className="load-caption"><span>Server load</span><strong className={peak > 100 ? 'danger-text' : ''}>{peak}% peak</strong></div><div className="load-meter" role="meter" aria-label="Server load" aria-valuemin={0} aria-valuemax={150} aria-valuenow={Math.min(peak, 150)}><div className={`load-meter-fill ${peak > 100 ? 'load-over' : ''}`} style={{ width: `${Math.min(peak, 150) / 1.5}%` }} /></div><div className={`server-state ${peak > 100 ? 'server-overloaded' : 'server-healthy'}`}>{peak > 100 ? 'Overloaded — excess requests return 503' : limited ? 'Healthy — excess requests return 429' : 'Within server capacity'}</div><p className="load-detail">{latest.processed} processed and {latest.rejected} rejected per second in the latest interval.</p></div>
      <div className="chart-panel"><div className="chart-caption"><span>Load over 20 virtual seconds</span><span className="chart-legend"><i />Server load</span></div><div className="chart-recharts" role="img" aria-label="Line chart showing server load over 20 virtual seconds"><ResponsiveContainer width="100%" height={146}><LineChart data={chart} margin={{ top: 8, right: 8, bottom: 1, left: -18 }}><CartesianGrid stroke="#e8edf0" vertical={false} /><XAxis dataKey="second" type="number" domain={[0, 19]} tickCount={5} tickFormatter={(value: number) => `${value}s`} tick={{ fill: '#5d6f7f', fontSize: 9 }} axisLine={{ stroke: '#cbd5dc' }} tickLine={false} /><YAxis domain={[0, 150]} tickCount={4} tickFormatter={(value: number) => `${value}%`} tick={{ fill: '#5d6f7f', fontSize: 9 }} axisLine={false} tickLine={false} /><ReferenceLine y={100} stroke="#b47774" strokeDasharray="4 4" /><Tooltip labelFormatter={(value) => `Second ${value}`} formatter={(value) => [`${value}%`, 'Server load']} contentStyle={{ border: '1px solid #dce4e9', borderRadius: 5, fontSize: 10 }} /><Line type="monotone" dataKey="load" stroke={peak > 100 ? '#ae4b4b' : '#3c77a8'} strokeWidth={2.2} dot={{ r: 2.5, fill: '#fff' }} activeDot={{ r: 4 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>
    </div>
    <div className="flood-explainer" aria-live="polite">{ran ? `Virtual time ${elapsedSeconds} of 20 seconds. The real Token Bucket is applying the selected traffic pattern. ` : 'Select the traffic level and run the experiment. '}The limiter allows 10 requests/s to a 12 requests/s server, so overload stays below capacity; without it, requests above 12 receive 503.</div>
  </section>
}

