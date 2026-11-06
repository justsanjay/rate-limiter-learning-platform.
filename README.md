# Rate Limiter Learning Platform

A local-first, nine-module course for learning Token Bucket and Sliding Window rate limiting. The course combines short concept lessons with deterministic simulators, algorithm comparisons, scenario labs, a sandboxed JavaScript playground, and a saved final assessment.

## Run locally

Requirements: Node.js 20+ and npm. pnpm is optional.

```sh
npm install
npm run dev
```

If you already use pnpm, you can instead run `pnpm install --frozen-lockfile` followed by `pnpm dev`.

Open the local URL printed by Vite. No API, account, database, model download, CDN asset, or runtime network request is required. Course progress is saved in this browser's LocalStorage.

## Verify

```sh
npm test
npm run build
```

The tests check the worked traces, boundary behavior, input validation, deterministic virtual time, and that the playground loads the same algorithm source files used by the simulators.

## Course map

1. Introduction to Rate Limiting — API requests, overload, HTTP 429 and Retry-After; a 20-second request-flood demonstration.
2. Token Bucket Concept — animated step-through, worked trace and predict-then-reveal activity.
3. Token Bucket Simulator — capacity, initial tokens, refill rate, frequency, duration, guided presets and challenge C1.
4. Sliding Window Concept — moving timeline, fixed-window boundary example, and a click-to-place activity.
5. Sliding Window Simulator — limit, window, custom timestamps, guided presets and challenge C2.
6. Algorithm Comparison Lab — both algorithms receive identical traffic, with a computed verdict and comparison table.
7. Real-World Applications — six scenario cards and live what-if controls.
8. Coding Playground — editable reference source, Web Worker execution with a timeout, expected output, and practical checks C3 and C4.
9. Knowledge Assessment — 11 questions plus two practical checks, instant explanations, a 70% passing mark, review recommendation, and saved best score.

The sidebar links to all modules and the saved progress view. Use **Reset progress** to clear completed modules, quiz scores, practical checks and assessment history.

## Algorithms and data

The implementation lives in `src/algorithms/tokenBucket.js` and `src/algorithms/slidingWindow.js`. Simulators and comparisons import these modules directly. The playground imports the same files as raw text and runs them in a Web Worker. Virtual timestamps are deterministic and algorithm logic never reads the wall clock.

The sliding window is `(t − W, t]`: a timestamp exactly `t − W` is evicted. Custom timestamps are validated, sorted, and reported when reordered. Out-of-order algorithm inputs are rejected.

## Blueprint source note

The provided 13-page PDF refers to a dependency list in Section 8, detailed scenarios in Section 12, and questions in Appendix A, but those sections are not present in the supplied copy. The app uses the named React Router and Recharts libraries from the explicit feature descriptions; the missing quiz and playground details are filled with questions and cases derived from the algorithm rules and examples that are present. The lesson content and acceptance criteria included in the supplied pages are implemented in the course.

## Production note

This is a single-tab teaching model. Production limiters need shared state such as Redis, atomic updates, coordinated clocks, per-client or per-route keys, response headers, and a fail-open or fail-closed policy. No production backend is included.

## Deploy to GitHub Pages

This project is stored in the `rate limiter` subfolder of `justsanjay/rate-limiter-learning-platform`. Add the workflow at the repository root from `.github/workflows/pages.yml`, then select **Settings → Pages → GitHub Actions**. The workflow builds this subfolder and publishes `dist`; it also supplies a fallback so module routes work when opened directly. After a successful Actions run, the site URL is `https://justsanjay.github.io/rate-limiter-learning-platform/`.

GitHub Pages publishes a public website. Do not include secrets or private data in the repository or site.
