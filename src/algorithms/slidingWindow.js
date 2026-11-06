/**
 * Sliding Window Log teaching model. The active interval is half-open: (t - W, t].
 * Rejected requests are never added to the timestamp log.
 */
export function createSlidingWindow({ limit, windowSec }) {
  const max = Number(limit);
  const width = Number(windowSec);
  if (!Number.isInteger(max) || max < 1 || !Number.isFinite(width) || width <= 0) {
    throw new Error('Limit must be an integer of at least 1 and window length must be greater than 0.');
  }
  return { limit: max, windowSec: width, log: [], head: 0, lastTime: -Infinity };
}

export function consumeSlidingWindow(window, time) {
  const now = Number(time);
  if (!Number.isFinite(now)) throw new Error('Request timestamps must be finite numbers.');
  if (now < window.lastTime) throw new Error('Timestamps must be sorted in ascending order.');
  const boundary = now - window.windowSec;
  const before = window.log.length - window.head;
  while (window.head < window.log.length && window.log[window.head] <= boundary) window.head += 1;
  const evicted = before - (window.log.length - window.head);
  const countBefore = window.log.length - window.head;
  const accepted = countBefore < window.limit;
  let retryAfter = 0;
  if (accepted) window.log.push(now);
  else retryAfter = Math.max(0, window.log[window.head] + window.windowSec - now);
  if (window.head > 128 && window.head * 2 > window.log.length) {
    window.log.splice(0, window.head);
    window.head = 0;
  }
  window.lastTime = now;
  return {
    time: now,
    boundary,
    evicted,
    countBefore,
    count: window.log.length - window.head,
    remaining: window.limit - (window.log.length - window.head),
    accepted,
    result: accepted ? 'ACCEPT' : 'REJECT',
    retryAfter,
    log: window.log.slice(window.head),
  };
}

export function parseTimestamps(text) {
  const values = String(text).split(/[\s,;]+/).map((part) => part.trim()).filter(Boolean).map(Number);
  if (!values.length) throw new Error('Enter at least one timestamp in seconds.');
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Timestamps must be non-negative finite numbers.');
  const sorted = [...values].sort((a, b) => a - b);
  return { timestamps: sorted, reordered: values.some((value, index) => value !== sorted[index]) };
}

export function countInWindow(timestamps, time, windowSec) {
  const now = Number(time);
  const width = Number(windowSec);
  if (!Number.isFinite(now) || !Number.isFinite(width) || width <= 0) {
    throw new Error('Current time and window length must be finite, with a positive window.');
  }
  return timestamps.filter((timestamp) => timestamp > now - width && timestamp <= now).length;
}

export function runFixedWindowTrace(limit, windowSec, timestamps) {
  const max = Number(limit);
  const width = Number(windowSec);
  if (!Number.isInteger(max) || max < 1 || !Number.isFinite(width) || width <= 0) {
    throw new Error('Limit must be an integer of at least 1 and window length must be greater than 0.');
  }
  const counts = new Map();
  return timestamps.map((time) => {
    const now = Number(time);
    if (!Number.isFinite(now)) throw new Error('Request timestamps must be finite numbers.');
    const windowIndex = Math.floor(now / width);
    const countBefore = counts.get(windowIndex) || 0;
    const accepted = countBefore < max;
    if (accepted) counts.set(windowIndex, countBefore + 1);
    return { time: now, windowIndex, countBefore, count: countBefore + (accepted ? 1 : 0), accepted, result: accepted ? 'ACCEPT' : 'REJECT' };
  });
}

export function runSlidingWindowTrace(config, timestamps) {
  const window = createSlidingWindow({ limit: config.limit, windowSec: config.windowSec });
  return timestamps.map((time) => consumeSlidingWindow(window, Number(time)));
}

export function simulateSlidingWindow(config) {
  if (config.timestampsText?.trim()) {
    return runSlidingWindowTrace(config, parseTimestamps(config.timestampsText).timestamps);
  }
  const frequency = Number(config.frequency);
  const duration = Number(config.duration);
  if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('Request frequency and duration must be greater than 0.');
  }
  const count = Math.ceil(frequency * duration - 1e-9);
  return runSlidingWindowTrace(config, Array.from({ length: count }, (_, index) => index / frequency));
}
