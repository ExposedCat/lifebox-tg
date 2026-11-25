import { describe, expect, test } from 'bun:test'

import { getLongestRateStreak, getLongestValueStreaks } from './recap.ts'

const day = (n: number) => ({ date: new Date(2025, 0, n) })

describe('getLongestValueStreaks', () => {
	test('uses the same keys when there are no rates', () => {
		expect(getLongestValueStreaks([])).toEqual({
			positiveStreak: 0,
			neutralStreak: 0,
			negativeStreak: 0
		})
	})

	test('tracks the longest run of each sign', () => {
		const values = [1, 2, 0, -1, -2, -1, 2, 1, 1, 0, 0].map(value => ({
			value
		}))
		expect(getLongestValueStreaks(values)).toEqual({
			positiveStreak: 3,
			neutralStreak: 2,
			negativeStreak: 3
		})
	})
})

describe('getLongestRateStreak', () => {
	test('counts consecutive days and resets on gaps', () => {
		expect(getLongestRateStreak([])).toBe(0)
		expect(getLongestRateStreak([day(1)])).toBe(1)
		expect(getLongestRateStreak([day(1), day(2), day(3), day(5), day(6)])).toBe(
			3
		)
	})
})
