import { mean } from '../../helpers/math.ts'
import type { Database } from '../../types/index.ts'
import {
	getAverageRateInRange,
	getRatesInRange,
	groupRatesByMonth
} from '../database/statistics.ts'

const DAY_MS = 24 * 60 * 60 * 1000

export function getLongestRateStreak(dataPoints: { date: Date }[]) {
	if (dataPoints.length === 0) return 0

	let maxLength = 1
	let currentLength = 1
	for (let i = 1; i < dataPoints.length; i++) {
		const diffTime =
			dataPoints[i].date.getTime() - dataPoints[i - 1].date.getTime()
		currentLength = diffTime <= DAY_MS ? currentLength + 1 : 1
		maxLength = Math.max(maxLength, currentLength)
	}
	return maxLength
}

export function getLongestValueStreaks(dataPoints: { value: number }[]) {
	const longest = { positiveStreak: 0, neutralStreak: 0, negativeStreak: 0 }
	let current = 0
	let previousSign = 0
	for (const { value } of dataPoints) {
		const sign = Math.sign(value)
		current = current > 0 && sign === previousSign ? current + 1 : 1
		previousSign = sign
		const key =
			sign > 0
				? 'positiveStreak'
				: sign < 0
					? 'negativeStreak'
					: 'neutralStreak'
		longest[key] = Math.max(longest[key], current)
	}
	return longest
}

function getMonth(
	parameter: 'worst' | 'happiest',
	months: { date: Date; average: number }[]
) {
	let average: number = parameter === 'worst' ? 3 : -3
	let lowestDate: Date = new Date()
	for (const month of months) {
		if (
			(parameter === 'worst' && month.average <= average) ||
			(parameter === 'happiest' && month.average >= average)
		) {
			lowestDate = month.date
			average = month.average
		}
	}
	return {
		index: lowestDate.getMonth(),
		value: average
	}
}

// Years start at 01:00 local time, matching how the recap was always counted.
const yearStart = (year: number) => new Date(year, 0, 1, 1)
const yearEnd = (year: number) => new Date(year + 1, 0, 1)

export async function getUserRecap(
	database: Database,
	userId: number,
	year: number
) {
	const [commonAverage, rates, userAveragePrev] = await Promise.all([
		getAverageRateInRange(database, null, yearStart(year), yearEnd(year)),
		getRatesInRange(database, userId, yearStart(year), yearEnd(year)),
		getAverageRateInRange(
			database,
			userId,
			yearStart(year - 1),
			yearEnd(year - 1)
		)
	])
	const rawMonths = groupRatesByMonth(rates)
	const rawDays = rates.map(({ date, value }) => ({ date, value }))
	const userAverage = mean(rates.map(rate => rate.value))

	return {
		days: rates.length,
		average: userAverage,
		commonAverage,
		happierBy: (userAverage - commonAverage) * 100,
		averagePrev: userAveragePrev,
		happierPrevBy: (userAverage - userAveragePrev) * 100,
		rawMonths,
		rawDays,
		rateStreak: getLongestRateStreak(rawDays),
		...getLongestValueStreaks(rawDays),
		worstMonth: getMonth('worst', rawMonths),
		happiestMonth: getMonth('happiest', rawMonths)
	}
}
