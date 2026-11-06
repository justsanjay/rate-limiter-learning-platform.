export type Question = {
  id: string
  prompt: string
  options: string[]
  answer: number
  explanation: string
  kind?: 'multiple' | 'trueFalse' | 'scenario'
}

export type Module = {
  id: number
  title: string
  minutes: number
  short: string
  objectives: string[]
  concepts: { heading: string; body: string }[]
  questions: Question[]
}

const q = (id: string, prompt: string, options: string[], answer: number, explanation: string, kind: Question['kind'] = 'multiple'): Question => ({ id, prompt, options, answer, explanation, kind })

export const modules: Module[] = [
  {
    id: 1, title: 'Introduction to Rate Limiting', minutes: 5, short: 'Protect availability, fairness and cost.',
    objectives: ['Define an API and an API request.', 'Explain why a service limits request rates.', 'Recognise HTTP 429 and Retry-After.'],
    concepts: [
      { heading: 'An API is a menu for software', body: 'An API is a set of agreed rules that lets one program ask another for data or an action. A request might ask for a profile or start a payment.' },
      { heading: 'Requests use real resources', body: 'Each request can consume CPU, memory, database time and money. A noisy client can increase latency, trigger errors and make honest users suffer.' },
      { heading: 'A limit shares capacity', body: 'Rate limiting caps how often a client can call an API. It supports availability, fairness, security, cost control and downstream stability.' },
      { heading: 'HTTP 429 Too Many Requests', body: 'A limited request is rejected with status 429. A Retry-After value such as 6 tells a well-behaved client to wait six seconds before retrying.' },
      { heading: 'Real API examples', body: 'An OTP endpoint may allow a few tries per hour, a social API may cap calls per 15 minutes, and a payment API may restrict charge creation.' },
    ],
    questions: [
      q('q1', 'What is an API request?', ['One message sent to an API', 'A database table', 'A server restart'], 0, 'A request is one call to an API, such as asking for data or an action.'),
      q('q2', 'Which HTTP status commonly signals that a client exceeded its rate limit?', ['200', '404', '429'], 2, 'HTTP 429 means Too Many Requests. Retry-After can tell the client when to try again.'),
      q('q3', 'Why does rate limiting help a service?', ['It removes the need for a server', 'It protects availability and shares capacity fairly', 'It guarantees every request succeeds'], 1, 'A limiter keeps one noisy client from taking all available capacity and can reduce abuse and runaway cost.'),
    ],
  },
  {
    id: 2, title: 'Token Bucket Concept', minutes: 5, short: 'A bucket refills steadily and spends tokens.',
    objectives: ['Name capacity, refill rate and tokens.', 'Trace acceptance, rejection and overflow.', 'Explain why the bucket allows bursts.'],
    concepts: [
      { heading: 'A bounded supply', body: 'Capacity is the largest number of tokens the bucket can hold. It also sets the largest burst that can pass after a quiet period.' },
      { heading: 'Tokens refill lazily', body: 'At each request, elapsed virtual time adds elapsed × refillRate tokens. The count is capped at capacity, so excess tokens overflow and are discarded.' },
      { heading: 'Requests spend tokens', body: 'A request is accepted when the bucket has enough tokens for its cost. Otherwise it is rejected with Retry-After equal to the missing tokens divided by the refill rate.' },
      { heading: 'Trade-offs', body: 'Token Bucket is O(1) time with constant memory and permits controlled bursts. A burst can still stress a backend, and distributed updates must be atomic.' },
    ],
    questions: [
      q('q4', 'What does bucket capacity control?', ['The maximum burst size', 'The number of API routes', 'The length of the log'], 0, 'A full bucket holds at most capacity tokens, so that many one-token requests can pass together.'),
      q('q5', 'What happens to tokens added while the bucket is full?', ['They are saved without limit', 'They overflow and are discarded', 'They become rejected requests'], 1, 'The token count is capped at capacity; additional tokens are discarded.'),
      q('q6', 'The bucket has 0.5 tokens and refill rate 0.5 tokens/s. How long until one token is available?', ['0.5 s', '1 s', '2 s'], 1, 'The missing 0.5 token divided by 0.5 tokens per second gives a one-second wait.'),
    ],
  },
  {
    id: 3, title: 'Token Bucket Simulator', minutes: 5, short: 'Tune bursts and sustained throughput.',
    objectives: ['Change capacity, initial tokens and refill rate.', 'Read accepted and rejected totals.', 'Tune a bucket for sustained traffic.'],
    concepts: [
      { heading: 'Change one knob at a time', body: 'Capacity controls the initial burst. Refill rate controls the long-run average. Initial tokens set how full the bucket is at virtual time zero.' },
      { heading: 'Interpret the trace', body: 'Every request records time, refill, overflow, token count and decision. A rejected request is not queued; it returns a calculated Retry-After value.' },
      { heading: 'Guided experiments', body: 'Compare a full burst absorber, a starved bucket and a perfectly matched refill rate. Use Reset to restore a preset, then Start or Step to inspect the deterministic trace.' },
    ],
    questions: [
      q('q7', 'Which parameter determines long-run token supply?', ['Capacity', 'Refill rate', 'Request cost label'], 1, 'The refill rate sets the sustained average number of one-token requests per second.'),
      q('q8', 'What happens to a request that is rejected?', ['It is added to a queue automatically', 'It consumes a partial token', 'It is not accepted and can retry after the computed wait'], 2, 'This teaching limiter does not queue. It calculates when enough tokens should be available again.'),
    ],
  },
  {
    id: 4, title: 'Sliding Window Concept', minutes: 5, short: 'Count accepted requests in the last W seconds.',
    objectives: ['Define the active time window.', 'Explain timestamp eviction and Retry-After.', 'Spot the fixed-window boundary problem.'],
    concepts: [
      { heading: 'A moving interval', body: 'At time t, this platform counts requests in the half-open interval (t − W, t]. A timestamp exactly t − W has left the window.' },
      { heading: 'Store accepted timestamps', body: 'Before each decision, evict timestamps at or before the left boundary. Accept if the remaining log is below the limit; rejected requests are never stored.' },
      { heading: 'Wait for the oldest mark', body: 'When the log is full, the oldest accepted request determines Retry-After: oldest timestamp + window length − now.' },
      { heading: 'Fixed windows have edges', body: 'A fixed counter can allow a full limit just before a boundary and another right after. A sliding log sees both sets inside one moving interval.' },
      { heading: 'Trade-offs', body: 'A sliding log precisely enforces a cap and gives an exact Retry-After. It stores up to L timestamps, uses more memory at high limits, and does not allow extra bursts beyond L.' },
    ],
    questions: [
      q('q9', 'Which interval does the platform use at time t?', ['[t − W, t]', '(t − W, t]', '[t, t + W)'], 1, 'The left edge is exclusive: a request exactly W seconds old has already left.'),
      q('q10', 'What does the sliding log store?', ['All requests, including every rejection', 'Accepted request timestamps', 'Only a running average'], 1, 'Accepted timestamps are retained until they leave the active window. Rejected requests are not stored.'),
      q('q11', 'Why can a fixed window allow a boundary burst?', ['It counts across every boundary', 'Its counter resets at a fixed edge', 'It has no time setting'], 1, 'A reset can separate two bursts that are only moments apart into different fixed intervals.'),
    ],
  },
  {
    id: 5, title: 'Sliding Window Simulator', minutes: 5, short: 'Inspect exact timestamp eviction.',
    objectives: ['Configure a limit and window length.', 'Interpret count, remaining capacity and Retry-After.', 'Validate and run custom timestamps.'],
    concepts: [
      { heading: 'An exact request log', body: 'The simulator keeps accepted timestamps in order, removes entries that are no longer in (t − W, t], then checks the limit.' },
      { heading: 'Reading the counters', body: 'Current count is the number of accepted marks in the active window. Remaining capacity is limit minus that count after the decision.' },
      { heading: 'Custom traffic', body: 'Enter timestamps separated by spaces, commas or semicolons. Unsorted entries are sorted before simulation and the page tells you when it did so.' },
    ],
    questions: [
      q('q12', 'A request arrives at t = 11 with W = 10. Is an accepted request at t = 1 still counted?', ['Yes, because the interval includes its left edge', 'No, because t − W is excluded', 'Only if it was rejected'], 1, 'The active interval is (1, 11]; timestamp 1 is exactly on the excluded left edge.'),
      q('q13', 'What determines Retry-After when the log is full?', ['The newest timestamp', 'The oldest accepted timestamp leaving the window', 'The configured request frequency'], 1, 'The oldest request is the next one to expire, so it determines the exact wait.'),
    ],
  },
  {
    id: 6, title: 'Algorithm Comparison Lab', minutes: 5, short: 'Run identical traffic through both algorithms.',
    objectives: ['Compare memory and time costs.', 'Observe burst behavior on identical timestamps.', 'Choose an algorithm for a workload.'],
    concepts: [
      { heading: 'Same arrivals, different rules', body: 'The comparison lab sends one timestamp list to both algorithms. Token Bucket tracks fractional tokens; Sliding Window Log counts accepted timestamps in a moving interval.' },
      { heading: 'Compare the trade-offs', body: 'Token Bucket uses constant state and permits bursts up to capacity. Sliding Window Log enforces a strict count in every window but stores up to the limit in timestamps.' },
      { heading: 'Choose for the workload', body: 'A public API may want smooth throughput with brief bursts. Login and payment operations often prefer a strict cap over a recent interval.' },
    ],
    questions: [
      q('q14', 'Which algorithm uses constant memory per client?', ['Token Bucket', 'Sliding Window Log', 'Both store every timestamp'], 0, 'Token Bucket stores a token count and a last-refill time.'),
      q('q15', 'Which algorithm strictly caps accepted requests in every moving window?', ['Token Bucket', 'Sliding Window Log', 'Neither'], 1, 'The sliding log counts accepted requests in (t − W, t] and enforces the configured limit.'),
    ],
  },
  {
    id: 7, title: 'Real-World Applications', minutes: 3, short: 'Match a policy to its risk and traffic.',
    objectives: ['Match a limiter to login, payments and API traffic.', 'Explain an illustrative limit.', 'Describe production storage and clock caveats.'],
    concepts: [
      { heading: 'Limits reflect the operation', body: 'Login and OTP attempts benefit from a strict recent cap. Browsing APIs can allow small bursts. Payment APIs also need idempotency keys to prevent duplicate effects.' },
      { heading: 'Production is distributed', body: 'Real systems share state in Redis or an equivalent store, use atomic updates, key by user or IP or API key, and use the store clock. Teams choose fail-open or fail-closed behavior if the store is down.' },
      { heading: 'These values are examples', body: 'All limits on this page are illustrative teaching values, not limits published by any company.' },
    ],
    questions: [q('q16', 'Which production detail is essential when many servers share limiter state?', ['Atomic shared-state updates and a consistent clock', 'A separate browser timer on each server', 'Storing only the last request in localStorage'], 0, 'Distributed limiters need coordinated atomic updates and consistent time to avoid race conditions.')],
  },
  {
    id: 8, title: 'Coding Playground', minutes: 6, short: 'Inspect and run the same JavaScript algorithms.',
    objectives: ['Read the two reference implementations.', 'Change code and run it in a Worker.', 'Verify Retry-After and eviction edge cases.'],
    concepts: [
      { heading: 'The teaching model', body: 'Both algorithms run in one browser tab with a perfect virtual clock. Production systems use shared state, atomic updates and coordinated clocks.' },
      { heading: 'Try edits safely', body: 'The editor runs in a Web Worker with a time limit. It reports console output and algorithm results without blocking the page.' },
      { heading: 'Use practical challenges', body: 'Challenge C3 checks calculated Retry-After values. Challenge C4 checks exact-boundary eviction, duplicate timestamps and rejected requests.' },
    ],
    questions: [],
  },
  {
    id: 9, title: 'Knowledge Assessment', minutes: 6, short: 'Check what you can explain and implement.',
    objectives: ['Apply the two algorithms to new traffic.', 'Explain decisions and edge cases.', 'Review weaker topics and retake the assessment.'],
    concepts: [
      { heading: 'A practical final check', body: 'The assessment includes multiple choice, true/false, scenario decisions, and both coding challenges. Each answer gives feedback and an explanation.' },
      { heading: 'Passing and review', body: 'A score of 70 percent passes. The best score is saved, retakes are allowed, and your results recommend a module to revisit.' },
    ],
    questions: [],
  },
]

export const assessmentQuestions: Question[] = [
  q('a1', 'With capacity 5 and 5 initial tokens, how many simultaneous one-token requests pass before refill?', ['0', '5', 'Unlimited'], 1, 'Each request spends one token, so the five available tokens allow five requests.', 'multiple'),
  q('a2', 'A bucket is full. What happens to additional refill?', ['It is discarded as overflow', 'It is saved for later', 'It is converted to capacity'], 0, 'The token count is capped at capacity; extra tokens overflow.', 'multiple'),
  q('a3', 'Which status code signals too many requests?', ['301', '429', '503'], 1, '429 is the standard Too Many Requests status.', 'multiple'),
  q('a4', 'The sliding window is (t − W, t]. Is t − W included?', ['True', 'False'], 1, 'False. The left boundary is exclusive, so a timestamp exactly t − W is evicted.', 'trueFalse'),
  q('a5', 'Are rejected sliding-window requests appended to the log?', ['True', 'False'], 1, 'False. Rejections are not stored, so abusive clients do not extend their own block.', 'trueFalse'),
  q('a6', 'Can a fixed-window counter allow two bursts close together across its reset boundary?', ['True', 'False'], 0, 'True. Each burst can fit in a different fixed interval even when the two are moments apart.', 'trueFalse'),
  q('a7', 'A public read API should allow short bursts but keep a smooth long-run rate. Which is a good fit?', ['Token Bucket', 'Sliding Window Log', 'No limiter'], 0, 'Token Bucket permits a bounded burst and controls the long-run average through refill rate.', 'scenario'),
  q('a8', 'A login endpoint needs a strict cap on attempts in the last 15 minutes. Which is the closer fit?', ['Token Bucket only', 'Sliding Window Log', 'A fixed daily counter'], 1, 'A sliding log enforces an exact maximum over any moving 15-minute interval.', 'scenario'),
  q('a9', 'A token bucket has 0.25 tokens, refill rate 0.5 tokens/s, and a one-token request. Retry-After?', ['0.5 s', '1.5 s', '2 s'], 1, 'The deficit is 0.75 tokens; 0.75 / 0.5 = 1.5 seconds.', 'multiple'),
  q('a10', 'Limit 3, window 10 s, accepted timestamps 1, 2, 3. At t = 11.5, how many remain before the next decision?', ['1', '2', '3'], 1, 'At t = 11.5 the left edge is 1.5. Timestamp 1 leaves; 2 and 3 remain.', 'multiple'),
  q('a11', 'When servers share a limiter, which update rule prevents concurrent requests from over-accepting?', ['Atomic shared-state updates', 'Independent per-server browser clocks', 'A localStorage counter in each tab'], 0, 'Atomic updates make a shared read-refill-write decision indivisible, preventing concurrent requests from both spending the same capacity.', 'multiple'),
]

export const glossary: Record<string, string> = {
  API: 'Application Programming Interface: agreed rules that let programs request data or actions.',
  'API request': 'One call made to an API at a point in time.',
  'HTTP 429': 'The Too Many Requests response status for a request blocked by a rate limit.',
  'Retry-After': 'A response value that tells a client how many seconds to wait before retrying.',
  capacity: 'The maximum number of tokens a Token Bucket can hold.',
  'refill rate': 'How many tokens a Token Bucket gains per second.',
  'sliding window': 'The recent interval (t − W, t] used to count requests.',
  overflow: 'Tokens discarded because a bucket is already at capacity.',
  idempotency: 'A key or rule that prevents repeated delivery from creating duplicate effects.',
}
