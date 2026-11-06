/**
 * Token Bucket teaching model. Time is expressed in seconds on a virtual clock.
 * The same functions power lesson traces, simulators, comparisons and the playground.
 */
export function createTokenBucket({ capacity, initialTokens = capacity, refillRate, now = 0 }) {
  const cap = Number(capacity);
  const rate = Number(refillRate);
  const startTime = Number(now);
  if (!Number.isInteger(cap) || cap < 1) throw new Error('Capacity must be an integer of at least 1.');
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Refill rate must be greater than 0.');
  if (!Number.isFinite(startTime)) throw new Error('Start time must be finite virtual-clock time.');
  const starting = Number(initialTokens);
  if (!Number.isFinite(starting) || starting < 0) {
    throw new Error('Initial tokens must be zero or greater.');
  }
  return { capacity: cap, refillRate: rate, tokens: Math.min(starting, cap), lastRefillTime: startTime };
}

export function consumeToken(bucket, time, cost = 1) {
  const requestedAt = Number(time);
  if (!Number.isFinite(requestedAt)) throw new Error('Request time must be a finite virtual-clock value.');
  const safeTime = Math.max(requestedAt, bucket.lastRefillTime);
  const amount = Number(cost);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Request cost must be greater than 0.');
  const tokensBefore = bucket.tokens;
  const elapsed = Math.max(0, safeTime - bucket.lastRefillTime);
  const refill = elapsed * bucket.refillRate;
  const raw = bucket.tokens + refill;
  const overflow = Math.max(0, raw - bucket.capacity);
  bucket.tokens = Math.min(bucket.capacity, raw);
  bucket.lastRefillTime = safeTime;
  const tokensAfterRefill = bucket.tokens;
  const impossibleCost = amount > bucket.capacity;
  const accepted = !impossibleCost && bucket.tokens + Number.EPSILON >= amount;
  if (accepted) bucket.tokens = Math.max(0, bucket.tokens - amount);
  const retryAfter = accepted ? 0 : impossibleCost ? null : Math.max(0, (amount - bucket.tokens) / bucket.refillRate);
  return {
    time: safeTime,
    tokensBefore,
    refill,
    overflow,
    tokensAfterRefill,
    tokensAfter: bucket.tokens,
    accepted,
    result: accepted ? 'ACCEPT' : 'REJECT',
    retryAfter,
    reason: impossibleCost ? 'Request cost exceeds bucket capacity.' : null,
  };
}

export function runTokenBucketTrace(config, timestamps, cost = 1) {
  const bucket = createTokenBucket({
    capacity: config.capacity,
    initialTokens: config.initialTokens,
    refillRate: config.refillRate,
    now: timestamps.length ? Math.min(0, timestamps[0]) : 0,
  });
  return timestamps.map((time) => consumeToken(bucket, Number(time), cost));
}

export function simulateTokenBucket(config) {
  const frequency = Number(config.frequency);
  const duration = Number(config.duration);
  if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('Request frequency and duration must be greater than 0.');
  }
  const count = Math.ceil(frequency * duration - 1e-9);
  const timestamps = Array.from({ length: count }, (_, index) => index / frequency);
  return runTokenBucketTrace(config, timestamps, Number(config.cost) || 1);
}
