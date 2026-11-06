import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import tokenBucketSource from '../algorithms/tokenBucket.js?raw'
import slidingWindowSource from '../algorithms/slidingWindow.js?raw'
import { countInWindow, runFixedWindowTrace, runSlidingWindowTrace } from '../algorithms/slidingWindow'
import { runTokenBucketTrace } from '../algorithms/tokenBucket'
import { assessmentQuestions, modules, type Question } from '../learning'
import type { SlidingWindowStep } from '../algorithms/slidingWindow'
import type { TokenBucketStep } from '../algorithms/tokenBucket'

export function TokenBucketLesson() {
  const steps = [
    'Capacity is the largest number of tokens the bucket can hold.',
    'Tokens arrive at a steady refill rate. For example, two tokens per second.',
    'Each request spends a token. If enough tokens are ready, the request is accepted.',
    'With no token available, the request is rejected and gets a Retry-After value.',
    'A full bucket cannot store more. New refill overflows and is discarded.',
    'A full bucket permits a burst up to capacity; after that, refill rate controls throughput.',
  ]
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [prediction, setPrediction] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const trace = useMemo(() => runTokenBucketTrace({ capacity: 4, initialTokens: 4, refillRate: 1 }, [0, 0, 0, 0, 0, 2]), [])
  const row = trace[Math.min(index, trace.length - 1)]
  const stepForward = () => setIndex((value) => Math.min(5, value + 1))
  const reset = () => { setIndex(0); setPlaying(false) }
  const togglePlay = () => { setPlaying((value) => !value); if (index === 5) setIndex(0) }
  useEffect(() => {
    if (!playing) return undefined
    if (reducedMotion) { setIndex(5); setPlaying(false); return undefined }
    if (index >= 5) { setPlaying(false); return undefined }
    const timer = window.setTimeout(() => setIndex((value) => Math.min(5, value + 1)), 1400)
    return () => window.clearTimeout(timer)
  }, [playing, reducedMotion, index])
  const expected = trace.filter((item) => item.accepted).length
  return <div className="lesson-demo-grid">
    <section className="demo-card lesson-stepper"><div className="demo-card-heading"><div><p className="eyebrow">STEP THROUGH THE BUCKET</p><h3>Tokens in motion</h3><p>{steps[index]}</p></div><span className="step-count">{index + 1} / 6</span></div>
      <div className={`lesson-bucket-stage ${reducedMotion ? 'no-motion' : ''}`}><svg className="lesson-bucket-svg" viewBox="0 0 220 156" role="img" aria-label={`Token Bucket at step ${index + 1}: ${row?.tokensAfterRefill.toFixed(2)} of 4 tokens before the request`}><defs><clipPath id="lessonBucketClip"><path d="M60 47h87l-9 91H69z" /></clipPath></defs><path d="M46 28h36m-24 0v16m-12-16v-8h36v8" fill="none" stroke="#6e8799" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle className="svg-drip svg-drip-a" cx="64" cy="39" r="4" fill="#548eb7" /><circle className="svg-drip svg-drip-b" cx="72" cy="49" r="4" fill="#548eb7" /><path d="M60 47h87l-9 91H69z" fill="#fff" stroke="#637c90" strokeWidth="3" strokeLinejoin="round" /><rect x="67" y={138 - Math.min(76, (row?.tokensAfterRefill || 0) / 4 * 76)} width="73" height={Math.min(76, (row?.tokensAfterRefill || 0) / 4 * 76)} fill="#b4d1e6" clipPath="url(#lessonBucketClip)" className="svg-water" /><g stroke="#6d8396" strokeWidth="1.5"><path d="M127 67h12M127 91h12M127 115h12" /></g><text x="103" y="151" textAnchor="middle" fill="#4f6578" fontSize="9">capacity 4</text><circle className="svg-request" cx="181" cy="91" r="17" fill={row?.accepted ? '#edf7f0' : '#fff1f0'} stroke={row?.accepted ? '#6c9e7e' : '#bd716d'} strokeWidth="1.5" /><text x="181" y="94" textAnchor="middle" fill={row?.accepted ? '#28734d' : '#a13f42'} fontSize="7" fontWeight="700">{row?.accepted ? 'PASS' : '429'}</text></svg><div className={`request-orb ${row?.accepted ? 'request-accepted' : 'request-rejected'}`}>{row?.accepted ? 'Request accepted' : 'Request rejected'}</div></div>
      <div className="trace-table-wrap small-trace"><table className="trace-table"><thead><tr><th>Time</th><th>Tokens before</th><th>Event</th><th>Tokens after</th><th>Result</th></tr></thead><tbody>{trace.slice(0, index + 1).map((item, idx) => <tr key={idx}><td>{item.time} s</td><td>{item.tokensBefore.toFixed(2)}</td><td>{idx === 5 ? '+2 refill' : 'Request'}</td><td>{item.tokensAfter.toFixed(2)}</td><td><span className={`result-pill ${item.accepted ? 'result-accept' : 'result-reject'}`}>{item.result}</span></td></tr>)}</tbody></table></div>
      <div className="lesson-controls"><button className="button button-outline" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>Back</button><button className="button button-outline" onClick={stepForward} disabled={index === 5}>Next</button><button className="button button-outline" onClick={togglePlay}>{playing ? 'Pause auto-play' : 'Auto-play'}</button><button className="button button-outline" onClick={reset}>Reset</button><label className="reduced-motion-toggle"><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} />Reduce motion</label></div>
    </section>
    <section className="demo-card prediction-card"><p className="eyebrow">PREDICT THEN REVEAL</p><h3>Can the burst fit?</h3><p>Capacity 4, refill 1 token/s, starts full. Five requests arrive at t = 0, then one arrives at t = 2.</p><label className="control-field"><span>How many requests do you predict will be accepted?</span><input type="number" min="0" max="6" value={prediction} onChange={(event) => setPrediction(event.target.value)} aria-label="Predicted accepted request count" /><small>Type your prediction before revealing the real trace.</small></label><button className="button button-primary" onClick={() => setRevealed(true)} disabled={prediction === ''}>Reveal result</button>{revealed && <div className={`prediction-result ${Number(prediction) === expected ? 'prediction-correct' : 'prediction-incorrect'}`} role="status"><strong>{expected} requests accepted.</strong><span>{Number(prediction) === expected ? 'Your prediction matches the real Token Bucket trace.' : `Your prediction was ${prediction}. The real trace shows ${trace.filter((item) => item.accepted).length} accepted requests.`}</span></div>}</section>
  </div>
}

export function SlidingWindowLesson() {
  const steps = [
    'A window looks back over the last W seconds from the current time.',
    'Every accepted request leaves a timestamp mark in the log.',
    'If fewer than L marks remain, the next request is accepted.',
    'As time moves, marks at or before t − W fall off the left edge.',
    'When the log is full, reject and wait for the oldest accepted mark to leave.',
    'A fixed window can reset at a boundary. A sliding window keeps one moving interval.',
  ]
  const [index, setIndex] = useState(0)
  const [marks, setMarks] = useState<number[]>([4, 8, 11, 16, 19])
  const [now, setNow] = useState(20)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const windowLength = 10
  const activeCount = countInWindow(marks, now, windowLength)
  const timestamps = [9.9, 9.9, 9.9, 10.1, 10.1, 10.1]
  const trace = useMemo(() => runSlidingWindowTrace({ limit: 3, windowSec: 10 }, timestamps), [])
  const fixedTrace = useMemo(() => runFixedWindowTrace(3, 10, timestamps), [])
  const shownSliding = trace.slice(0, index + 1)
  const shownFixed = fixedTrace.slice(0, index + 1)
  const visibleMarks = marks.slice(0, 8)
  const placeMark = (event: MouseEvent<HTMLDivElement>) => {
    if (marks.length >= 8) return
    const box = event.currentTarget.getBoundingClientRect()
    const newTime = Number((((event.clientX - box.left) / box.width) * 30).toFixed(1))
    setMarks((items) => [...items, newTime].sort((a, b) => a - b)); setChecked(false)
  }
  const answerCount = activeCount
  return <div className="lesson-demo-grid">
    <section className="demo-card lesson-stepper"><div className="demo-card-heading"><div><p className="eyebrow">STEP THROUGH THE WINDOW</p><h3>Move the time window</h3><p>{steps[index]}</p></div><span className="step-count">{index + 1} / 6</span></div>
      <TimelineLesson marks={shownSliding.map((item) => item.time)} outcomes={shownSliding.map((item) => item.accepted)} now={trace[index].time} windowLength={10} />
      <div className="fixed-sliding-compare"><div><strong>Fixed window · limit 3 / 10 s</strong><span>Accepted {shownFixed.filter((item) => item.accepted).length} · rejected {shownFixed.filter((item) => !item.accepted).length}</span></div><div><strong>Sliding log · limit 3 / 10 s</strong><span>Accepted {shownSliding.filter((item) => item.accepted).length} · rejected {shownSliding.filter((item) => !item.accepted).length}</span></div></div>
      <div className="lesson-controls"><button className="button button-outline" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>Back</button><button className="button button-outline" onClick={() => setIndex((value) => Math.min(5, value + 1))} disabled={index === 5}>Next</button><button className="button button-outline" onClick={() => setIndex(0)}>Reset</button></div>
    </section>
    <section className="demo-card drag-window"><p className="eyebrow">INTERACTIVE ACTIVITY</p><h3>Place request marks</h3><p>Select the timeline to add up to eight accepted requests. Move the scrubber to see which marks are still in the last ten seconds.</p><div className="activity-timeline" onClick={placeMark} role="application" aria-label="Click to add request marks to a zero to thirty second timeline" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' && marks.length < 8) { setMarks((items) => [...items, now].sort((a, b) => a - b)); setChecked(false) } }}><TimelineLesson marks={visibleMarks} now={now} windowLength={windowLength} max={30} /></div><label className="control-field"><span>Current time <strong>{now.toFixed(1)} s</strong></span><input type="range" min="0" max="30" step="0.5" value={now} onChange={(event) => { setNow(Number(event.target.value)); setChecked(false) }} aria-label="Move current time" /><small>Window contains {answerCount} of {marks.length} marks.</small></label><div className="activity-answer"><label>How many requests are inside now?<input type="number" min="0" max="8" value={answer} onChange={(event) => { setAnswer(event.target.value); setChecked(false) }} aria-label="Your predicted request count" /></label><button className="button button-primary" onClick={() => setChecked(true)} disabled={answer === ''}>Check count</button><button className="button button-outline" onClick={() => { setMarks([]); setChecked(false) }}>Clear marks</button></div>{checked && <p className={`answer-feedback ${Number(answer) === answerCount ? 'success-text' : 'danger-text'}`} role="status">{Number(answer) === answerCount ? 'Correct. ' : `Not quite. `}The active window contains {answerCount} marks.</p>}</section>
  </div>
}

function TimelineLesson({ marks, now, windowLength, max = 30, outcomes }: { marks: number[]; now: number; windowLength: number; max?: number; outcomes?: boolean[] }) {
  const left = Math.max(0, now - windowLength)
  const activeLeft = (left / max) * 100
  const activeWidth = ((now - left) / max) * 100
  return <div className="timeline-lesson" aria-label={`Timeline. Current time ${now} seconds.`}><div className="timeline-highlight" style={{ left: `${activeLeft}%`, width: `${activeWidth}%` }} /><span className="timeline-cursor" style={{ left: `${(now / max) * 100}%` }}>now</span>{marks.map((mark, index) => <span key={`${mark}-${index}`} title={`${mark} seconds${outcomes ? ` — ${outcomes[index] ? 'accepted' : 'rejected'}` : ''}`} className={`lesson-mark ${outcomes ? outcomes[index] ? 'lesson-mark-accepted' : 'lesson-mark-rejected' : mark > left && mark <= now ? 'lesson-mark-in' : 'lesson-mark-out'}`} style={{ left: `${(mark / max) * 100}%` }} />)}<div className="timeline-lesson-axis"><span>0 s</span><span>{Math.round(max / 2)} s</span><span>{max} s</span></div></div>
}

const comparisonPresets = [
  { label: 'Steady', timestamps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { label: 'Burst after silence', timestamps: [0, 0, 0, 0, 0, 10, 10, 10, 10, 10] },
  { label: 'Constant overload', timestamps: Array.from({ length: 20 }, (_, index) => index * 0.5) },
  { label: 'Edge-of-window burst', timestamps: [9.9, 9.9, 9.9, 10.1, 10.1, 10.1] },
]

export function ComparisonLab() {
  const [preset, setPreset] = useState(1)
  const traffic = comparisonPresets[preset].timestamps
  const token = runTokenBucketTrace({ capacity: 5, initialTokens: 5, refillRate: 1 }, traffic)
  const window = runSlidingWindowTrace({ limit: 3, windowSec: 10 }, traffic)
  const tokenAccepted = token.filter((row) => row.accepted).length
  const windowAccepted = window.filter((row) => row.accepted).length
  const difference = tokenAccepted - windowAccepted
  const tokenRefillAccepts = token.filter((row) => row.accepted && row.refill > 0).length
  const verdict = difference > 0
    ? `Token Bucket accepted ${difference} more ${difference === 1 ? 'request' : 'requests'} because ${tokenRefillAccepts ? 'tokens refilled between arrivals, alongside the bucket’s bounded burst.' : 'its capacity of 5 allows a larger burst than the sliding window limit of 3.'}`
    : difference < 0
      ? `Sliding Window accepted ${Math.abs(difference)} more ${Math.abs(difference) === 1 ? 'request' : 'requests'} because earlier accepted timestamps expired from its 10 second window, creating room at these arrivals.`
      : 'Both algorithms accepted the same number on this trace, though their internal state and rejection reasons differ.'
  return <section className="demo-card comparison-lab"><div className="demo-card-heading"><div><p className="eyebrow">SAME REQUESTS, TWO RULES</p><h3>Comparison lab</h3><p>Both algorithms receive the exact same timestamp list.</p></div><label className="preset-select"><span>Traffic preset</span><select value={preset} onChange={(event) => setPreset(Number(event.target.value))}>{comparisonPresets.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}</select></label></div>
    <div className="traffic-sequence"><span>Shared arrivals</span><code>{traffic.map((time) => time.toFixed(1)).join(' · ')} s</code></div><div className="comparison-columns"><ComparisonColumn title="Token Bucket" summary="Capacity 5 · refill 1 token/s" accepted={tokenAccepted} rejected={token.length - tokenAccepted} results={token.map((item) => item.accepted)} /><ComparisonColumn title="Sliding Window Log" summary="Limit 3 · window 10 s" accepted={windowAccepted} rejected={window.length - windowAccepted} results={window.map((item) => item.accepted)} /></div><div className="verdict-panel"><strong>What changed?</strong><p>{verdict}</p></div><details className="comparison-table"><summary>Compare algorithm characteristics</summary><table><thead><tr><th>Aspect</th><th>Token Bucket</th><th>Sliding Window Log</th></tr></thead><tbody><tr><td>Core idea</td><td>Spend tokens refilled steadily</td><td>Count accepted requests in the last W seconds</td></tr><tr><td>Burst behavior</td><td>Allows bursts up to capacity</td><td>At most L requests in any window</td></tr><tr><td>Memory</td><td>Constant: two numbers</td><td>Up to L timestamps</td></tr><tr><td>Time</td><td>O(1) per request</td><td>Amortised O(1); worst case O(L)</td></tr><tr><td>Best fit</td><td>APIs that tolerate short bursts</td><td>Strict limits such as login and payment</td></tr><tr><td>Main risk</td><td>A burst can stress the backend</td><td>Memory grows with a very high limit</td></tr></tbody></table></details>
  </section>
}

function ComparisonColumn({ title, summary, accepted, rejected, results }: { title: string; summary: string; accepted: number; rejected: number; results: boolean[] }) {
  return <div className="comparison-column"><div><strong>{title}</strong><span>{summary}</span></div><div className="comparison-totals"><b>{accepted}<small> accepted</small></b><b>{rejected}<small> rejected</small></b></div><div className="request-pips" aria-label={`${accepted} accepted and ${rejected} rejected requests`}>{results.map((pass, index) => <span key={index} className={pass ? 'pip-accepted' : 'pip-rejected'} title={`Request ${index + 1}: ${pass ? 'accepted' : 'rejected'}`}>{pass ? 'A' : 'R'}</span>)}</div></div>
}

const scenarios = [
  { title: 'Login authentication', why: 'Slow password guessing and credential stuffing.', limit: '5 attempts per 15 minutes per account and IP', recommended: 'Sliding Window', reason: 'A strict cap across every moving 15-minute period.', config: { limit: 5, windowSec: 900 }, pattern: [0, 2, 4, 7, 12, 15, 18, 25, 30, 45, 60, 75] },
  { title: 'Payment APIs', why: 'Reduce duplicate charges, card testing and fraud bursts.', limit: '10 charge creations per minute per merchant', recommended: 'Sliding Window', reason: 'A strict count helps constrain sensitive operations; use idempotency keys too.', config: { limit: 10, windowSec: 60 }, pattern: Array.from({ length: 14 }, (_, index) => index * 3) },
  { title: 'E-commerce', why: 'Reduce inventory scraping and bot checkout bursts.', limit: '60 browsing calls/min; tighter checkout policy', recommended: 'Token Bucket + Sliding Window', reason: 'Allow browsing bursts and apply a strict checkout cap.', config: { capacity: 8, initialTokens: 8, refillRate: 1 }, pattern: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2] },
  { title: 'Social media API', why: 'Share feed capacity fairly among app tokens.', limit: '300 calls per 15 minutes per app token', recommended: 'Token Bucket', reason: 'Small bursts improve responsiveness while refill controls the average.', config: { capacity: 8, initialTokens: 8, refillRate: 0.8 }, pattern: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4] },
  { title: 'Banking', why: 'Protect accounts and reduce enumeration and OTP abuse.', limit: '3 balance bursts/min; 5 OTP attempts/hour', recommended: 'Sliding Window', reason: 'Sensitive authentication and balance routes benefit from a strict cap.', config: { limit: 3, windowSec: 60 }, pattern: [0, 2, 8, 15, 20, 25, 30, 45, 60] },
  { title: 'Public REST API', why: 'Share capacity and manage free and paid plan costs.', limit: 'Free: 60/min; paid: 600/min', recommended: 'Token Bucket', reason: 'Short client bursts pass while long-run throughput stays controlled.', config: { capacity: 8, initialTokens: 8, refillRate: 0.6 }, pattern: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 6, 8] },
]

export function ScenarioCards() {
  const [factor, setFactor] = useState(1)
  return <div className="scenario-section"><div className="illustrative-note"><strong>Illustrative teaching values.</strong> These are examples, not any company's published limits. <label>Traffic what-if <select value={factor} onChange={(event) => setFactor(Number(event.target.value))} aria-label="Scenario traffic multiplier"><option value={1}>Baseline</option><option value={2}>Double the traffic</option><option value={3}>Triple the traffic</option></select></label></div><div className="scenario-grid">{scenarios.map((item) => {
    const timestamps = Array.from({ length: item.pattern.length * factor }, (_, index) => item.pattern[index % item.pattern.length] + Math.floor(index / item.pattern.length) * 0.1)
    const tokenKind = 'capacity' in item.config
    const rows = tokenKind ? runTokenBucketTrace(item.config as { capacity: number; initialTokens: number; refillRate: number }, timestamps) : runSlidingWindowTrace(item.config as { limit: number; windowSec: number }, timestamps)
    const accepted = rows.filter((row) => row.accepted).length
    return <article className="scenario-card" key={item.title}><div className="scenario-card-head"><span className="scenario-index">{String(scenarios.indexOf(item) + 1).padStart(2, '0')}</span><span className="scenario-algorithm">{item.recommended}</span></div><h3>{item.title}</h3><p>{item.why}</p><dl><div><dt>Example limit</dt><dd>{item.limit}</dd></div><div><dt>Why this algorithm</dt><dd>{item.reason}</dd></div></dl><div className="scenario-whatif" aria-live="polite"><strong>{factor === 1 ? 'Baseline traffic' : `Traffic at ${factor}×`}</strong><span>{accepted} accepted · {rows.length - accepted} rejected</span></div></article>
  })}</div><ProductionNote /></div>
}

export function ProductionNote() { return <aside className="production-note"><div><span className="note-icon">i</span><div><strong>Teaching model and production systems</strong><p>This code runs in one browser tab with a virtual clock. Real systems keep shared state in Redis or an equivalent store, make updates atomic, use a store clock, and key limits by user, IP, API key or route. Teams also decide whether to fail open or fail closed if the store is unavailable. Responses commonly include Retry-After and rate-limit headers.</p></div></div></aside> }

export function ModuleQuiz({ questions, onAttempt }: { questions: Question[]; onAttempt: (score: number) => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const score = questions.filter((question) => answers[question.id] === question.answer).length
  if (!questions.length) return null
  const submit = () => {
    if (Object.keys(answers).length !== questions.length) { setError('Answer each question before checking your knowledge.'); return }
    setError(''); setSubmitted(true); onAttempt(score)
  }
  return <section className="knowledge-check" aria-labelledby="knowledge-heading"><p className="eyebrow">KNOWLEDGE CHECK</p><h3 id="knowledge-heading">Check your understanding</h3>{questions.map((question, index) => <fieldset className="question-card" key={question.id}><legend><span>Q{index + 1}</span>{question.prompt}</legend><div className="answer-options">{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} value={optionIndex} checked={answers[question.id] === optionIndex} onChange={() => { setAnswers((value) => ({ ...value, [question.id]: optionIndex })); setSubmitted(false) }} /><span>{option}</span></label>)}</div>{submitted && <p className={`question-feedback ${answers[question.id] === question.answer ? 'success-text' : 'danger-text'}`} role="status"><strong>{answers[question.id] === question.answer ? 'Correct. ' : 'Review this. '}</strong>{question.explanation}</p>}</fieldset>)}{error && <p className="inline-error" role="alert">{error}</p>}<button className="button button-primary" onClick={submit}>Check answers</button>{submitted && <p className="quiz-score" role="status">You answered {score} of {questions.length} correctly. Read the explanations, then complete the module when you are ready.</p>}</section>
}

type PlaygroundResult = { result?: unknown; logs?: string[]; error?: string }
function executeInWorker(source: string, algorithm: 'token' | 'window', scenario: number, challenge = false): Promise<PlaygroundResult> {
  return new Promise((resolve) => {
    const call = challenge
      ? algorithm === 'token' ? "const cases=[];let b=createTokenBucket({capacity:5,initialTokens:0,refillRate:0.5});cases.push(consumeToken(b,0).retryAfter===2);b=createTokenBucket({capacity:4,initialTokens:4,refillRate:1});for(let i=0;i<4;i++)consumeToken(b,0);cases.push(consumeToken(b,0).retryAfter===1);b=createTokenBucket({capacity:2,initialTokens:2,refillRate:1});cases.push(consumeToken(b,0,3).retryAfter===null);return cases;"
        : "const a=runSlidingWindowTrace({limit:3,windowSec:10},[1,2,3,5,11]);const b=runSlidingWindowTrace({limit:1,windowSec:10},[0,10]);const c=runSlidingWindowTrace({limit:2,windowSec:10},[1,1,2]);return [a.map(x=>x.accepted).join(',')==='true,true,true,false,true',b.every(x=>x.accepted),c[2].accepted===false,c[2].log.length===2];"
      : algorithm === 'token'
        ? `const scenarios=[{capacity:5,initialTokens:5,refillRate:1,frequency:2,duration:3},{capacity:10,initialTokens:0,refillRate:2,frequency:1,duration:5},{capacity:3,initialTokens:3,refillRate:0.5,frequency:4,duration:2}];return simulateTokenBucket(scenarios[${scenario}]);`
        : `const scenarios=[{limit:3,windowSec:5,timestampsText:'0, 1, 2, 5, 6'},{limit:2,windowSec:10,timestampsText:'0, 0.1, 0.2, 11'},{limit:3,windowSec:10,timestampsText:'9.9, 9.95, 10, 10.05'}];return simulateSlidingWindow(scenarios[${scenario}]);`
    const workerSource = `${source}\nconst __logs=[];console.log=(...args)=>__logs.push(args.map(String).join(' '));self.onmessage=()=>{try{const result=(()=>{${call}})();self.postMessage({result,logs:__logs})}catch(error){self.postMessage({error:String(error&&error.message||error),logs:__logs})}};`
    let worker: Worker | null = null
    let url = ''
    let settled = false
    const finish = (value: PlaygroundResult) => { if (settled) return; settled = true; if (worker) worker.terminate(); if (url) URL.revokeObjectURL(url); resolve(value) }
    try {
      url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))
      worker = new Worker(url, { type: 'module' })
      const timeout = window.setTimeout(() => finish({ error: 'The worker stopped after its 1.5 second time limit.' }), 1500)
      worker.onmessage = (event: MessageEvent<PlaygroundResult>) => { window.clearTimeout(timeout); finish(event.data) }
      worker.onerror = (event) => { window.clearTimeout(timeout); finish({ error: event.message || 'The code could not run in the worker.' }) }
      worker.postMessage({})
    } catch (cause) { finish({ error: cause instanceof Error ? cause.message : 'A worker could not be started.' }) }
  })
}

function summarize(value: unknown, algorithm: 'token' | 'window') {
  if (!Array.isArray(value) || value.every((item) => typeof item === 'boolean')) return value
  return value.map((row) => {
    const item = row as TokenBucketStep & SlidingWindowStep
    return algorithm === 'token' ? { time: item.time, result: item.result, tokens: Number(item.tokensAfter.toFixed(2)), retryAfter: item.retryAfter === null ? null : Number(item.retryAfter.toFixed(2)) } : { time: item.time, result: item.result, count: item.count, remaining: item.remaining, retryAfter: Number(item.retryAfter.toFixed(2)) }
  })
}

export function CodingPlayground({ onChallenge }: { onChallenge: (key: string, passed: boolean) => void }) {
  const [algorithm, setAlgorithm] = useState<'token' | 'window'>('token')
  const [source, setSource] = useState(tokenBucketSource)
  const [scenario, setScenario] = useState(0)
  const [result, setResult] = useState<PlaygroundResult | null>(null)
  const [expected, setExpected] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [challengeResult, setChallengeResult] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('')
  const switchAlgorithm = (next: 'token' | 'window') => { setAlgorithm(next); setSource(next === 'token' ? tokenBucketSource : slidingWindowSource); setScenario(0); setResult(null); setExpected(null); setMessage('') }
  const run = async (challenge = false, targetAlgorithm: 'token' | 'window' = algorithm) => {
    setBusy(true); setResult(null); setMessage('')
    const canonical = targetAlgorithm === 'token' ? tokenBucketSource : slidingWindowSource
    const activeSource = targetAlgorithm === algorithm ? source : canonical
    const activeScenario = targetAlgorithm === algorithm ? scenario : 0
    setAlgorithm(targetAlgorithm)
    if (targetAlgorithm !== algorithm) { setSource(canonical); setScenario(0) }
    const baseline = await executeInWorker(canonical, targetAlgorithm, activeScenario, challenge)
    const actual = activeSource === canonical ? baseline : await executeInWorker(activeSource, targetAlgorithm, activeScenario, challenge)
    if (challenge) {
      const passed = !actual.error && Array.isArray(actual.result) && actual.result.length > 0 && actual.result.every(Boolean)
      const key = targetAlgorithm === 'token' ? 'C3' : 'C4'
      setChallengeResult((value) => ({ ...value, [key]: passed })); onChallenge(key, passed); setResult(actual); setExpected(baseline.result); setMessage(passed ? `${key} hidden checks passed.` : `${key} hidden checks did not pass. Review the output and try again.`)
    } else {
      setResult(actual); setExpected(summarize(baseline.result, targetAlgorithm))
      if (!actual.error) {
        const matches = JSON.stringify(summarize(actual.result, targetAlgorithm)) === JSON.stringify(summarize(baseline.result, targetAlgorithm))
        setMessage(matches ? 'Match — this code produced the expected reference trace.' : 'Mismatch — compare the actual output with the reference output.')
      }
    }
    setBusy(false)
  }
  const loadScenario = (value: number) => { setScenario(value); setResult(null); setExpected(null); setMessage('Scenario loaded. Run the code to see its output.') }
  const actualDisplay = result?.error ? result.error : summarize(result?.result, algorithm)
  return <section className="playground-card"><div className="playground-heading"><div><p className="eyebrow">SANDBOXED JAVASCRIPT</p><h3>Run the reference code</h3><p>Runs in a Web Worker with a 1.5 second time limit. The expected panel uses the reference algorithm.</p></div><label className="preset-select"><span>Load scenario</span><select value={scenario} onChange={(event) => loadScenario(Number(event.target.value))}><option value={0}>Baseline trace</option><option value={1}>Quiet start and refill</option><option value={2}>Boundary and stress case</option></select></label></div>
    <div className="playground-tabs" role="tablist" aria-label="Algorithm source"><button role="tab" aria-selected={algorithm === 'token'} className={algorithm === 'token' ? 'active' : ''} onClick={() => switchAlgorithm('token')}>Token Bucket</button><button role="tab" aria-selected={algorithm === 'window'} className={algorithm === 'window' ? 'active' : ''} onClick={() => switchAlgorithm('window')}>Sliding Window</button></div>
    <div className="playground-workspace"><div className="code-column"><label className="code-label" htmlFor="code-source">Editable source</label><textarea id="code-source" className="code-editor" spellCheck={false} value={source} onChange={(event) => { setSource(event.target.value); setResult(null); setMessage('Code changed. Run it to verify the new output.') }} aria-label={`${algorithm === 'token' ? 'Token Bucket' : 'Sliding Window'} JavaScript source`} /><div className="code-actions"><button className="button button-primary" onClick={() => void run()} disabled={busy}>{busy ? 'Running…' : 'Run code'}</button><button className="button button-outline" onClick={() => { setSource(algorithm === 'token' ? tokenBucketSource : slidingWindowSource); setResult(null); setMessage('Reference code restored.') }}>Reset code</button><span>Source is the same file used by the simulators.</span></div></div><aside className="explanation-panel"><strong>What this code does</strong><ol>{algorithm === 'token' ? <><li>Creates a bucket with capacity, starting tokens and refill rate.</li><li>Refills lazily from elapsed virtual time, then caps at capacity.</li><li>Accepts when enough tokens remain; otherwise computes Retry-After.</li><li>Returns one trace row per request with refill and overflow details.</li></> : <><li>Creates an ordered log for accepted request timestamps.</li><li>Evicts every timestamp at or before the exclusive left boundary.</li><li>Accepts below the limit; rejected requests stay out of the log.</li><li>Computes the exact wait until the oldest mark expires.</li></>}</ol><div className="production-inline"><strong>Teaching model</strong><p>Single browser tab and virtual clock. Production limiters need atomic shared state and coordinated clocks.</p></div></aside></div>
    <div className="output-columns"><OutputPanel title="Expected output" value={expected} empty="Run a scenario to see the reference output." /><OutputPanel title="Actual output" value={actualDisplay} empty="Run the editable code to see its output." result={result} /></div>{message && <p className={`playground-message ${message.startsWith('Match') || message.includes('passed') ? 'success-text' : message.startsWith('Mismatch') || message.includes('did not pass') ? 'danger-text' : ''}`} role="status">{message}</p>}
    <div className="code-challenges"><article><div><span className="challenge-tag">CHALLENGE C3</span><h4>Return a correct Retry-After</h4><p>Check fractional refill, a partially filled bucket, and a request cost above capacity against hidden edge cases.</p>{challengeResult.C3 && <span className="success-text">Hidden checks passed.</span>}</div><button className="button button-outline" onClick={() => void run(true, 'token')} disabled={busy}>Run C3 checks</button></article><article><div><span className="challenge-tag">CHALLENGE C4</span><h4>Evict the correct timestamps</h4><p>Check the half-open boundary, duplicate timestamps, and rejected requests against hidden cases.</p>{challengeResult.C4 && <span className="success-text">Hidden checks passed.</span>}</div><button className="button button-outline" onClick={() => void run(true, 'window')} disabled={busy}>Run C4 checks</button></article></div>
    <details className="code-notes"><summary>Production notes and simplified sliding-window counter</summary><p>Production limiters commonly add X-RateLimit-Limit and X-RateLimit-Remaining headers, use a shared store such as Redis, coordinate clocks, and decide fail-open or fail-closed behavior. A sliding-window counter can estimate the total with <code>previousCount × (1 − elapsed / W) + currentCount</code>; it uses two counts but assumes even traffic in the previous interval.</p></details>
  </section>
}

function OutputPanel({ title, value, empty, result }: { title: string; value: unknown; empty: string; result?: PlaygroundResult | null }) {
  return <section className="output-panel"><div><strong>{title}</strong>{result && result.error && title === 'Actual output' && <span className="mismatch-badge">Error</span>}</div><pre>{value == null ? empty : typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>{result?.logs?.length ? <div className="worker-logs"><strong>Console</strong>{result.logs.map((line, index) => <code key={index}>{line}</code>)}</div> : null}</section>
}

export function FinalAssessment({ challenges, onComplete, onNavigate }: { challenges: string[]; onComplete: (score: number, breakdown: Record<number, { correct: number; total: number }>, recommendedModule: number | null) => void; onNavigate: (path: string) => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [reviewModule, setReviewModule] = useState<number | null>(null)
  const quizScore = assessmentQuestions.filter((question) => answers[question.id] === question.answer).length
  const practicalScore = ['C3', 'C4'].filter((key) => challenges.includes(key)).length
  const total = quizScore + practicalScore
  const percent = Math.round(total / 13 * 100)
  const submit = () => {
    if (Object.keys(answers).length !== assessmentQuestions.length) { setError('Answer every question before submitting the assessment.'); return }
    const moduleForQuestion: Record<string, number> = { a1: 2, a2: 2, a3: 1, a4: 4, a5: 5, a6: 4, a7: 6, a8: 7, a9: 2, a10: 5, a11: 7 }
    const breakdown: Record<number, { correct: number; total: number }> = {}
    assessmentQuestions.forEach((question) => {
      const moduleId = moduleForQuestion[question.id]
      const current = breakdown[moduleId] || { correct: 0, total: 0 }
      current.total += 1
      if (answers[question.id] === question.answer) current.correct += 1
      breakdown[moduleId] = current
    })
    if (challenges.includes('C3')) breakdown[3] = { correct: 1, total: 1 }
    else breakdown[3] = { correct: 0, total: 1 }
    if (challenges.includes('C4')) breakdown[8] = { correct: 1, total: 1 }
    else breakdown[8] = { correct: 0, total: 1 }
    const recommendedModule = Number(Object.keys(breakdown).sort((a, b) => {
      const aResult = breakdown[Number(a)]; const bResult = breakdown[Number(b)]
      return aResult.correct / aResult.total - bResult.correct / bResult.total || Number(a) - Number(b)
    })[0])
    setError(''); setSubmitted(true); setReviewModule(recommendedModule); onComplete(percent, breakdown, recommendedModule)
  }
  return <section className="assessment-card"><div className="assessment-intro"><p className="eyebrow">FINAL ASSESSMENT · 13 POINTS</p><h3>Show what you can do</h3><p>Six multiple choice questions, three true/false questions, two scenarios and the C3/C4 practical challenges. Passing mark: 70%. Retakes are allowed; your best score is saved.</p></div><div className="assessment-challenge-status"><span className={challenges.includes('C3') ? 'challenge-complete' : ''}>C3 · Retry-After {challenges.includes('C3') ? 'complete' : 'not complete'}</span><span className={challenges.includes('C4') ? 'challenge-complete' : ''}>C4 · Window eviction {challenges.includes('C4') ? 'complete' : 'not complete'}</span><button className="text-link" onClick={() => onNavigate('/module/8')}>Open coding playground</button></div>{assessmentQuestions.map((question, index) => <AssessmentQuestion key={question.id} question={question} index={index} selected={answers[question.id]} submitted={submitted} onSelect={(value) => { setAnswers((previous) => ({ ...previous, [question.id]: value })); setSubmitted(false) }} />)}{error && <p className="inline-error" role="alert">{error}</p>}<button className="button button-primary" onClick={submit}>Submit assessment</button>{submitted && <div className={`assessment-results ${percent >= 70 ? 'assessment-pass' : 'assessment-fail'}`} role="status"><div><span>Your score</span><strong>{percent}%</strong><small>{total} of 13 points · {percent >= 70 ? 'Passed' : 'Below 70% — review and retake'}</small></div><p>{percent >= 70 ? 'Good work. Your best score has been saved.' : 'Review the recommended module and retake when ready.'}<br />Recommended review: {reviewModule ? modules[reviewModule - 1].title : 'Review a lesson'}<br /><button className="text-link" onClick={() => onNavigate(`/module/${reviewModule || 1}`)}>Open recommended module</button></p></div>}</section>
}

function AssessmentQuestion({ question, index, selected, submitted, onSelect }: { question: Question; index: number; selected?: number; submitted: boolean; onSelect: (value: number) => void }) {
  const label = question.kind === 'scenario' ? 'Scenario' : question.kind === 'trueFalse' ? 'True or false' : 'Multiple choice'
  return <fieldset className="assessment-question"><legend><span>{String(index + 1).padStart(2, '0')}</span><small>{label}</small>{question.prompt}</legend><div className="answer-options">{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} checked={selected === optionIndex} onChange={() => onSelect(optionIndex)} /><span>{option}</span></label>)}</div>{submitted && <p className={`question-feedback ${selected === question.answer ? 'success-text' : 'danger-text'}`} role="status"><strong>{selected === question.answer ? 'Correct. ' : 'Review this. '}</strong>{question.explanation}</p>}</fieldset>
}
