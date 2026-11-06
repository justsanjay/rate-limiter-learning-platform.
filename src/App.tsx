import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'
import { BrowserRouter, Route as RouterRoute, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ComparisonLab, CodingPlayground, FinalAssessment, ModuleQuiz, ProductionNote, ScenarioCards, SlidingWindowLesson, TokenBucketLesson } from './components/LearningInteractions'
import { SlidingWindowSimulator, TokenBucketSimulator } from './components/RateLimitSimulators'
import { glossary, modules } from './learning'

type Route = { kind: 'module'; id: number } | { kind: 'progress' } | { kind: 'notFound' }
type LearningProgress = {
  completedModules: number[]
  currentModule: number
  quizScores: Record<number, number>
  challenges: string[]
  finalScore: number | null
  bestScore: number | null
  finalAttempts: number
  assessmentBreakdown: Record<number, { correct: number; total: number }>
  recommendedModule: number | null
}
const PROGRESS_KEY = 'rate-limit-learning-progress-v1'
const initialProgress: LearningProgress = { completedModules: [], currentModule: 1, quizScores: {}, challenges: [], finalScore: null, bestScore: null, finalAttempts: 0, assessmentBreakdown: {}, recommendedModule: null }
const RequestFloodDemo = lazy(() => import('./components/RequestFloodDemo').then((module) => ({ default: module.RequestFloodDemo })))
const appBasename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

function routeFromPath(path: string): Route {
  if (path === '/progress') return { kind: 'progress' }
  const match = path.match(/^\/module\/(\d+)\/?$/)
  if (match) {
    const id = Number(match[1])
    return modules.some((item) => item.id === id) ? { kind: 'module', id } : { kind: 'notFound' }
  }
  if (path === '/playground') return { kind: 'module', id: 8 }
  if (path === '/assessment') return { kind: 'module', id: 9 }
  if (path === '/' || path === '/index.html') return { kind: 'module', id: 1 }
  return { kind: 'notFound' }
}

function readProgress(): LearningProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null') as Partial<LearningProgress> | null
    if (!saved || typeof saved !== 'object') return initialProgress
    return {
      ...initialProgress,
      ...saved,
      completedModules: Array.isArray(saved.completedModules) ? saved.completedModules.filter((id) => Number.isInteger(id) && id >= 1 && id <= 9) : [],
      quizScores: saved.quizScores && typeof saved.quizScores === 'object' ? saved.quizScores : {},
      challenges: Array.isArray(saved.challenges) ? saved.challenges : [],
      assessmentBreakdown: saved.assessmentBreakdown && typeof saved.assessmentBreakdown === 'object' ? saved.assessmentBreakdown : {},
      currentModule: Number.isInteger(saved.currentModule) && saved.currentModule! >= 1 && saved.currentModule! <= 9 ? saved.currentModule! : 1,
    }
  } catch { return initialProgress }
}

function useCourseRoute() {
  const location = useLocation()
  const route = routeFromPath(location.pathname)
  const routerNavigate = useNavigate()
  const navigate = (path: string) => {
    routerNavigate(path)
    window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return { route, navigate }
}

export default function App() {
  return <BrowserRouter basename={appBasename}><Routes><RouterRoute path="/" element={<CourseApp />} /><RouterRoute path="/module/:id" element={<CourseApp />} /><RouterRoute path="/progress" element={<CourseApp />} /><RouterRoute path="/playground" element={<CourseApp />} /><RouterRoute path="/assessment" element={<CourseApp />} /><RouterRoute path="*" element={<CourseApp />} /></Routes></BrowserRouter>
}

function CourseApp() {
  const { route, navigate } = useCourseRoute()
  const [progress, setProgress] = useState<LearningProgress>(readProgress)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useEffect(() => { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)) }, [progress])
  useEffect(() => {
    if (route.kind === 'module') setProgress((value) => value.currentModule === route.id ? value : { ...value, currentModule: route.id })
  }, [route])
  const percentComplete = Math.round(progress.completedModules.length / modules.length * 100)

  const recordChallenge = (key: string, passed: boolean) => setProgress((value) => ({ ...value, challenges: passed ? Array.from(new Set([...value.challenges, key])) : value.challenges.filter((item) => item !== key) }))
  const recordFinalScore = (score: number, breakdown: Record<number, { correct: number; total: number }>, recommendedModule: number | null) => setProgress((value) => ({ ...value, finalScore: score, bestScore: Math.max(score, value.bestScore ?? 0), finalAttempts: value.finalAttempts + 1, quizScores: { ...value.quizScores, 9: score }, assessmentBreakdown: breakdown, recommendedModule }))
  const markComplete = (id: number) => setProgress((value) => ({ ...value, completedModules: value.completedModules.includes(id) ? value.completedModules : [...value.completedModules, id].sort((a, b) => a - b) }))
  const onNavigate = (path: string) => { navigate(path); setMobileNavOpen(false) }

  return <div className="app-layout">
    {mobileNavOpen && <button className="mobile-nav-scrim" aria-label="Close course navigation" onClick={() => setMobileNavOpen(false)} />}
    <Sidebar route={route} progress={progress} percent={percentComplete} onNavigate={onNavigate} mobileOpen={mobileNavOpen} />
    <main className="main-column">
      <header className="top-header"><button className="mobile-menu-button" aria-label="Toggle course navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((value) => !value)}><span /><span /><span /></button><div className="breadcrumbs"><span>Rate Limiter Learning Platform</span><span aria-hidden="true">/</span><strong>{route.kind === 'progress' ? 'Learning progress' : route.kind === 'module' ? modules[route.id - 1].title : 'Page not found'}</strong></div><div className="header-meta"><span>45 minute course</span><span className="header-progress"><i style={{ width: `${percentComplete}%` }} /></span><strong>{percentComplete}%</strong></div></header>
      <div className="main-content">
        {route.kind === 'module' && <ModulePage moduleId={route.id} progress={progress} onQuizAttempt={(id, score) => setProgress((value) => ({ ...value, quizScores: { ...value.quizScores, [id]: score } }))} onChallenge={recordChallenge} onFinalScore={recordFinalScore} onComplete={() => markComplete(route.id)} onNavigate={onNavigate} />}
        {route.kind === 'progress' && <ProgressPage progress={progress} percent={percentComplete} onNavigate={onNavigate} onReset={() => { localStorage.removeItem(PROGRESS_KEY); setProgress(initialProgress) }} />}
        {route.kind === 'notFound' && <NotFound onNavigate={() => onNavigate(`/module/${progress.currentModule || 1}`)} />}
      </div>
      <footer className="site-footer"><span>Rate Limiter Learning Platform</span><span>Learn by experimenting · Runs locally in your browser</span></footer>
    </main>
  </div>
}

function Sidebar({ route, progress, percent, onNavigate, mobileOpen }: { route: Route; progress: LearningProgress; percent: number; onNavigate: (path: string) => void; mobileOpen: boolean }) {
  return <aside className={`course-sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Course navigation"><button className="course-brand" onClick={() => onNavigate('/module/1')}><span className="brand-icon" aria-hidden="true"><i /><i /><i /><i /></span><span><strong>Rate Limit</strong><small>Learning platform</small></span></button><div className="course-overview"><div><span>COURSE PROGRESS</span><strong>{percent}%</strong></div><div className="progress-track"><i style={{ width: `${percent}%` }} /></div><small>{progress.completedModules.length} of 9 modules completed</small></div><nav className="module-navigation" aria-label="Course modules"><span className="nav-section-label">LEARNING PATH</span>{modules.map((item) => {
      const active = route.kind === 'module' && route.id === item.id
      const complete = progress.completedModules.includes(item.id)
      return <button key={item.id} className={`module-nav-item ${active ? 'module-nav-active' : ''} ${complete ? 'module-nav-complete' : ''}`} onClick={() => onNavigate(`/module/${item.id}`)} aria-current={active ? 'page' : undefined}><span className="module-nav-index">{complete ? <CheckMark /> : String(item.id).padStart(2, '0')}</span><span className="module-nav-copy"><strong>{item.title}</strong><small>{item.minutes} min</small></span>{complete && <span className="sr-only">Completed</span>}</button>
    })}</nav><div className="sidebar-bottom"><button className={`progress-nav ${route.kind === 'progress' ? 'progress-nav-active' : ''}`} onClick={() => onNavigate('/progress')}><ProgressIcon /><span>Learning progress</span></button><div className="sidebar-note"><span className="note-icon">i</span><p>Small experiments make the rate limit easier to understand.</p></div><small className="version-label">Offline-ready · no account required</small></div></aside>
}

function ModulePage({ moduleId, progress, onQuizAttempt, onChallenge, onFinalScore, onComplete, onNavigate }: { moduleId: number; progress: LearningProgress; onQuizAttempt: (id: number, score: number) => void; onChallenge: (key: string, passed: boolean) => void; onFinalScore: (score: number, breakdown: Record<number, { correct: number; total: number }>, recommendedModule: number | null) => void; onComplete: () => void; onNavigate: (path: string) => void }) {
  const module = modules[moduleId - 1]
  const completed = progress.completedModules.includes(moduleId)
  const quizAttempted = progress.quizScores[moduleId] !== undefined
  const moduleReady = moduleId <= 7 ? quizAttempted : moduleId === 8 ? progress.challenges.includes('C3') && progress.challenges.includes('C4') : progress.finalScore !== null
  const nextPath = moduleId < 9 ? `/module/${moduleId + 1}` : '/progress'
  const previousPath = moduleId > 1 ? `/module/${moduleId - 1}` : null
  return <article className="module-page">
    <div className="module-heading"><div><div className="module-kicker"><span>MODULE {String(module.id).padStart(2, '0')}</span><span className="kicker-dot" /><span>{module.minutes} MINUTES</span></div><h1>{module.title}</h1><p className="module-description">{module.short}</p></div><div className="module-step-indicator"><strong>{String(module.id).padStart(2, '0')}</strong><span>of 09</span></div></div>
    <div className="module-progress-line"><span>Course path</span><div><i style={{ width: `${module.id / 9 * 100}%` }} /></div><span>{module.id} / 9</span></div>
    <section className="objectives-card"><div><span className="section-mark">01</span><div><p className="eyebrow">LEARNING OBJECTIVES</p><h2>By the end, you can…</h2></div></div><ul>{module.objectives.map((objective) => <li key={objective}><CheckMark />{objective}</li>)}</ul></section>
    <section className="concept-section"><div className="section-title-row"><div><p className="eyebrow">THE KEY IDEAS</p><h2>Concepts</h2></div><Glossary /></div><div className="concept-grid">{module.concepts.map((concept, index) => <article className="concept-card" key={concept.heading}><span className="concept-number">{String(index + 1).padStart(2, '0')}</span><h3>{concept.heading}</h3><p>{concept.body}</p></article>)}</div></section>
    <section className="interactive-section"><div className="section-title-row"><div><p className="eyebrow">LEARN BY EXPERIMENTING</p><h2>{module.id === 1 ? 'Watch a service under load' : module.id === 2 ? 'Trace the algorithm' : module.id === 3 ? 'Tune the bucket' : module.id === 4 ? 'Move the window' : module.id === 5 ? 'Run custom traffic' : module.id === 6 ? 'Compare the decisions' : module.id === 7 ? 'Choose a policy' : module.id === 8 ? 'Try the code' : 'Your final assessment'}</h2></div><span className="activity-tag">INTERACTIVE</span></div>
      {module.id === 1 && <><Suspense fallback={<div className="empty-trace">Loading request demo…</div>}><RequestFloodDemo /></Suspense><ProductionNote /></>}
      {module.id === 2 && <TokenBucketLesson />}
      {module.id === 3 && <TokenBucketSimulator onChallengeComplete={(passed) => onChallenge('C1', passed)} />}
      {module.id === 4 && <SlidingWindowLesson />}
      {module.id === 5 && <SlidingWindowSimulator onChallengeComplete={(passed) => onChallenge('C2', passed)} />}
      {module.id === 6 && <ComparisonLab />}
      {module.id === 7 && <ScenarioCards />}
      {module.id === 8 && <CodingPlayground onChallenge={onChallenge} />}
      {module.id === 9 && <FinalAssessment challenges={progress.challenges} onComplete={onFinalScore} onNavigate={onNavigate} />}
    </section>
    {module.id <= 7 && <ModuleQuiz key={`quiz-${module.id}`} questions={module.questions} onAttempt={(score) => onQuizAttempt(module.id, score)} />}
    {module.id === 8 && <div className="completion-hint"><strong>Module check</strong><span>Run both C3 and C4 hidden checks to enable module completion.</span>{progress.challenges.includes('C3') && progress.challenges.includes('C4') && <span className="success-text">Both practical checks are complete.</span>}</div>}
    {module.id === 9 && <div className="completion-hint"><strong>Assessment status</strong><span>{progress.finalScore === null ? 'Submit the final assessment to record this module.' : `Latest score ${progress.finalScore}% · best score ${progress.bestScore ?? progress.finalScore}%`}</span></div>}
    <div className="module-completion"><div><p className="eyebrow">MODULE {completed ? 'COMPLETED' : 'CHECKPOINT'}</p><strong>{completed ? 'Progress saved in this browser.' : moduleReady ? 'Your checkpoint is ready.' : module.id <= 7 ? 'Attempt the knowledge check to continue.' : module.id === 8 ? 'Complete both practical checks to continue.' : 'Submit the assessment to continue.'}</strong></div><button className={`button ${completed ? 'button-complete' : 'button-primary'}`} disabled={!moduleReady || completed} onClick={onComplete}>{completed ? 'Completed' : 'Complete module'}</button></div>
    <nav className="module-pager" aria-label="Previous and next module">{previousPath ? <button className="pager-button pager-prev" onClick={() => onNavigate(previousPath)}><span>Previous</span><strong>{modules[moduleId - 2].title}</strong></button> : <span />}{moduleReady || completed ? <button className="pager-button pager-next" onClick={() => { if (!completed) onComplete(); onNavigate(nextPath) }}><span>{moduleId === 9 ? 'View progress' : 'Next module'}</span><strong>{moduleId < 9 ? modules[moduleId].title : 'Learning progress'} <ArrowIcon /></strong></button> : <button className="pager-button pager-next" disabled><span>Next module</span><strong>Complete the checkpoint first</strong></button>}</nav>
  </article>
}

function Glossary() {
  return <details className="glossary-popover"><summary aria-label="Open glossary">Glossary <span>+</span></summary><div className="glossary-panel"><strong>Key terms</strong>{Object.entries(glossary).map(([term, definition]) => <p key={term}><b>{term}</b> — {definition}</p>)}</div></details>
}

function ProgressPage({ progress, percent, onNavigate, onReset }: { progress: LearningProgress; percent: number; onNavigate: (path: string) => void; onReset: () => void }) {
  const completed = new Set(progress.completedModules)
  return <article className="progress-page"><div className="module-heading"><div><div className="module-kicker"><span>YOUR COURSE</span><span className="kicker-dot" /><span>SAVED LOCALLY</span></div><h1>Learning progress</h1><p className="module-description">Your progress stays in this browser and survives a refresh.</p></div><button className="button button-outline" onClick={() => { if (window.confirm('Reset all saved course progress and quiz scores?')) onReset() }}>Reset progress</button></div><section className="progress-summary"><div className="progress-ring" style={{ '--ring-angle': `${percent * 3.6}deg` } as CSSProperties} role="img" aria-label={`${percent}% course completion`}><span><strong>{percent}%</strong><small>complete</small></span></div><div><p className="eyebrow">OVERALL PROGRESS</p><h2>{progress.completedModules.length} of 9 modules complete</h2><p>Current module: <button className="inline-link" onClick={() => onNavigate(`/module/${progress.currentModule}`)}>{modules[(progress.currentModule || 1) - 1].title}</button></p><div className="progress-track wide-track"><i style={{ width: `${percent}%` }} /></div></div></section><section className="progress-list"><div className="section-title-row"><div><p className="eyebrow">MODULES AND CHECKS</p><h2>Course record</h2></div></div>{modules.map((module) => <button className="progress-row" key={module.id} onClick={() => onNavigate(`/module/${module.id}`)}><span className={`progress-status ${completed.has(module.id) ? 'progress-status-done' : ''}`}>{completed.has(module.id) ? <CheckMark /> : String(module.id).padStart(2, '0')}</span><span className="progress-row-title"><strong>{module.title}</strong><small>{module.minutes} minutes</small></span><span className="progress-row-score">{module.id === 9 ? progress.bestScore !== null ? `Best ${progress.bestScore}%` : 'Not attempted' : progress.quizScores[module.id] !== undefined ? `${progress.quizScores[module.id]} correct` : module.id === 8 ? `${progress.challenges.filter((key) => key === 'C3' || key === 'C4').length}/2 challenges` : 'Not attempted'}</span><ArrowIcon /></button>)}</section>{Object.keys(progress.assessmentBreakdown).length > 0 && <section className="assessment-breakdown"><p className="eyebrow">FINAL ASSESSMENT BREAKDOWN</p><h2>Review by module</h2><div className="breakdown-grid">{Object.entries(progress.assessmentBreakdown).sort(([a], [b]) => Number(a) - Number(b)).map(([id, result]) => <button key={id} onClick={() => onNavigate(`/module/${id}`)}><span>{modules[Number(id) - 1].title}</span><strong>{result.correct} / {result.total}</strong></button>)}</div>{progress.recommendedModule && <p className="review-recommendation">Recommended review: <button className="inline-link" onClick={() => onNavigate(`/module/${progress.recommendedModule}`)}>{modules[progress.recommendedModule - 1].title}</button></p>}</section>}<section className="assessment-history"><div><p className="eyebrow">FINAL ASSESSMENT</p><h2>{progress.finalAttempts} {progress.finalAttempts === 1 ? 'attempt' : 'attempts'}</h2><p>Latest score: {progress.finalScore === null ? 'Not attempted' : `${progress.finalScore}%`} · Best: {progress.bestScore === null ? 'Not attempted' : `${progress.bestScore}%`}</p></div><button className="button button-primary" onClick={() => onNavigate('/module/9')}>Open assessment</button></section></article>
}

function NotFound({ onNavigate }: { onNavigate: () => void }) { return <section className="not-found"><span className="eyebrow">404 · ROUTE NOT FOUND</span><h1>This module is not in the course.</h1><p>Use the course navigation to open one of the nine learning modules.</p><button className="button button-primary" onClick={onNavigate}>Return to your current module</button></section> }

function CheckMark() { return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.3 8.2 3 3 6.5-6.5" /></svg> }
function ProgressIcon() { return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 16V9m7 7V4m7 12v-5" /></svg> }
function ArrowIcon() { return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11m-4-4 4 4-4 4" /></svg> }

