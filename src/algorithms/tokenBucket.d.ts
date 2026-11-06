export type TokenBucketConfig = { capacity: number; initialTokens?: number; refillRate: number; now?: number; frequency?: number; duration?: number; cost?: number }
export type TokenBucketStep = { time: number; tokensBefore: number; refill: number; overflow: number; tokensAfterRefill: number; tokensAfter: number; accepted: boolean; result: 'ACCEPT' | 'REJECT'; retryAfter: number | null; reason: string | null }
export type TokenBucketState = { capacity: number; refillRate: number; tokens: number; lastRefillTime: number }
export function createTokenBucket(config: TokenBucketConfig): TokenBucketState
export function consumeToken(bucket: TokenBucketState, time: number, cost?: number): TokenBucketStep
export function runTokenBucketTrace(config: TokenBucketConfig, timestamps: number[], cost?: number): TokenBucketStep[]
export function simulateTokenBucket(config: TokenBucketConfig): TokenBucketStep[]
