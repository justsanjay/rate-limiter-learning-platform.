import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as tokenBucket from '../src/algorithms/tokenBucket.js'
import * as slidingWindow from '../src/algorithms/slidingWindow.js'

test('Token Bucket worked trace matches the blueprint example', () => {
  const rows = tokenBucket.runTokenBucketTrace(
    { capacity: 5, initialTokens: 5, refillRate: 1 },
    [0, 0, 0, 0, 0, 0, 3, 3, 3, 3],
  )
  assert.deepEqual(rows.map((row) => row.accepted), [true, true, true, true, true, false, true, true, true, false])
  assert.equal(rows[5].retryAfter, 1)
  assert.equal(rows.at(-1).retryAfter, 1)
})

test('Token Bucket clamps time, clamps initial overflow and handles impossible cost', () => {
  const bucket = tokenBucket.createTokenBucket({ capacity: 1, initialTokens: 4, refillRate: 0.5 })
  assert.equal(bucket.tokens, 1)
  assert.equal(tokenBucket.consumeToken(bucket, 0).accepted, true)
  const earlier = tokenBucket.consumeToken(bucket, -3)
  assert.equal(earlier.time, 0)
  assert.equal(earlier.retryAfter, 2)
  const impossible = tokenBucket.consumeToken(bucket, 1, 2)
  assert.equal(impossible.accepted, false)
  assert.equal(impossible.retryAfter, null)
  assert.match(impossible.reason, /exceeds bucket capacity/)
  assert.throws(() => tokenBucket.createTokenBucket({ capacity: 1.5, initialTokens: 1, refillRate: 1 }), /integer/)
  assert.throws(() => tokenBucket.consumeToken(bucket, Number.NaN), /finite virtual-clock/)
})

test('Sliding Window uses the half-open boundary and does not log rejections', () => {
  const rows = slidingWindow.runSlidingWindowTrace({ limit: 3, windowSec: 10 }, [1, 2, 3, 5, 11])
  assert.deepEqual(rows.map((row) => row.accepted), [true, true, true, false, true])
  assert.equal(rows[3].retryAfter, 6)
  assert.deepEqual(rows[3].log, [1, 2, 3])
  assert.deepEqual(rows[4].log, [2, 3, 11])
})

test('custom sliding timestamps sort and validate before running', () => {
  assert.deepEqual(slidingWindow.parseTimestamps('3, 1; 2').timestamps, [1, 2, 3])
  assert.equal(slidingWindow.parseTimestamps('3, 1; 2').reordered, true)
  assert.throws(() => slidingWindow.parseTimestamps('1, nope'), /finite numbers/)
  assert.throws(() => slidingWindow.runSlidingWindowTrace({ limit: 2, windowSec: 10 }, [2, 1]), /sorted in ascending order/)
})

test('window inspection and fixed-window boundary example use the shared implementation', () => {
  assert.equal(slidingWindow.countInWindow([1, 2, 3, 4], 4, 3), 3)
  assert.equal(slidingWindow.countInWindow([1, 2, 3, 4], 3, 2), 2)
  const timestamps = [9.9, 9.9, 9.9, 10.1, 10.1, 10.1]
  const fixed = slidingWindow.runFixedWindowTrace(3, 10, timestamps)
  const sliding = slidingWindow.runSlidingWindowTrace({ limit: 3, windowSec: 10 }, timestamps)
  assert.equal(fixed.filter((row) => row.accepted).length, 6)
  assert.equal(sliding.filter((row) => row.accepted).length, 3)
  assert.equal(sliding.filter((row) => !row.accepted).length, 3)
  const challenge = slidingWindow.runSlidingWindowTrace({ limit: 2, windowSec: 3.5 }, [1, 2, 3, 4, 5, 6])
  assert.equal(challenge.filter((row) => row.accepted).length, 4)
})

test('guided challenges C1, C3 and C4 cover acceptance and algorithm edge cases', () => {
  const c1 = tokenBucket.simulateTokenBucket({ capacity: 5, initialTokens: 5, refillRate: 5, frequency: 5, duration: 20 })
  assert.equal(c1.length, 100)
  assert.ok(c1.filter((row) => row.accepted).length / c1.length >= 0.9)

  const bucketCases = []
  let bucket = tokenBucket.createTokenBucket({ capacity: 5, initialTokens: 0, refillRate: 0.5 })
  bucketCases.push(tokenBucket.consumeToken(bucket, 0).retryAfter === 2)
  bucket = tokenBucket.createTokenBucket({ capacity: 4, initialTokens: 4, refillRate: 1 })
  for (let index = 0; index < 4; index += 1) tokenBucket.consumeToken(bucket, 0)
  bucketCases.push(tokenBucket.consumeToken(bucket, 0).retryAfter === 1)
  bucket = tokenBucket.createTokenBucket({ capacity: 2, initialTokens: 2, refillRate: 1 })
  bucketCases.push(tokenBucket.consumeToken(bucket, 0, 3).retryAfter === null)
  assert.deepEqual(bucketCases, [true, true, true])

  const boundary = slidingWindow.runSlidingWindowTrace({ limit: 3, windowSec: 10 }, [1, 2, 3, 5, 11])
  const exactEdge = slidingWindow.runSlidingWindowTrace({ limit: 1, windowSec: 10 }, [0, 10])
  const duplicate = slidingWindow.runSlidingWindowTrace({ limit: 2, windowSec: 10 }, [1, 1, 2])
  assert.deepEqual(boundary.map((row) => row.accepted), [true, true, true, false, true])
  assert.equal(exactEdge.every((row) => row.accepted), true)
  assert.equal(duplicate[2].accepted, false)
  assert.equal(duplicate[2].log.length, 2)
})

test('the source shown by the playground is the exact algorithm source used at runtime', async () => {
  const tokenSource = await readFile(new URL('../src/algorithms/tokenBucket.js', import.meta.url), 'utf8')
  const windowSource = await readFile(new URL('../src/algorithms/slidingWindow.js', import.meta.url), 'utf8')
  const tokenModule = await import(`data:text/javascript;base64,${Buffer.from(tokenSource).toString('base64')}`)
  const windowModule = await import(`data:text/javascript;base64,${Buffer.from(windowSource).toString('base64')}`)
  assert.equal(tokenSource.includes('Date.now'), false)
  assert.equal(windowSource.includes('Date.now'), false)
  assert.deepEqual(
    tokenModule.simulateTokenBucket({ capacity: 5, initialTokens: 5, refillRate: 1, frequency: 2, duration: 3 }),
    tokenBucket.simulateTokenBucket({ capacity: 5, initialTokens: 5, refillRate: 1, frequency: 2, duration: 3 }),
  )
  assert.deepEqual(
    windowModule.simulateSlidingWindow({ limit: 3, windowSec: 5, timestampsText: '0, 1, 2, 5, 6' }),
    slidingWindow.simulateSlidingWindow({ limit: 3, windowSec: 5, timestampsText: '0, 1, 2, 5, 6' }),
  )
  const playground = await readFile(new URL('../src/components/LearningInteractions.tsx', import.meta.url), 'utf8')
  assert.match(playground, /tokenBucket\.js\?raw/)
  assert.match(playground, /slidingWindow\.js\?raw/)
})
