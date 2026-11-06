export type SlidingWindowConfig = { limit: number; windowSec: number; frequency?: number; duration?: number; timestampsText?: string }
export type SlidingWindowState = { limit: number; windowSec: number; log: number[]; head: number; lastTime: number }
export type SlidingWindowStep = { time: number; boundary: number; evicted: number; countBefore: number; count: number; remaining: number; accepted: boolean; result: 'ACCEPT' | 'REJECT'; retryAfter: number; log: number[] }
export function createSlidingWindow(config: SlidingWindowConfig): SlidingWindowState
export function consumeSlidingWindow(window: SlidingWindowState, time: number): SlidingWindowStep
export function parseTimestamps(text: string): { timestamps: number[]; reordered: boolean }
export function countInWindow(timestamps: number[], time: number, windowSec: number): number
export function runFixedWindowTrace(limit: number, windowSec: number, timestamps: number[]): { time: number; windowIndex: number; countBefore: number; count: number; accepted: boolean; result: 'ACCEPT' | 'REJECT' }[]
export function runSlidingWindowTrace(config: SlidingWindowConfig, timestamps: number[]): SlidingWindowStep[]
export function simulateSlidingWindow(config: SlidingWindowConfig): SlidingWindowStep[]
