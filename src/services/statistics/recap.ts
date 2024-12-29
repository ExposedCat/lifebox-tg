import type { Database } from '../../types/index.js'
import {
	getUserDailyRates,
	getUserMonthlyRates
} from '../database/statistics.js'
import { fetchUserRatesGraph } from '../database/user.graph.js'

function getLongestRateStreak(dataPoints: { date: Date }[]) {
	if (dataPoints.length === 0) return 0

	let maxLength = 1
	let currentLength = 1

	for (let i = 1; i < dataPoints.length; i++) {
		const diffTime =
			dataPoints[i].date.getTime() - dataPoints[i - 1].date.getTime()
		if (diffTime <= 24 * 60 * 60 * 1000) {
			currentLength++
			if (currentLength > maxLength) {
				maxLength = currentLength
			}
		} else {
			currentLength = 1
		}
	}

	return maxLength
}

function getLongestValueStreaks(dataPoints: { value: number }[]) {
	if (dataPoints.length === 0) return { positive: 0, neutral: 0, negative: 0 }

	let currentPositive = dataPoints[0].value > 0 ? 1 : 0
	let currentNeutral = dataPoints[0].value === 0 ? 1 : 0
	let currentNegative = dataPoints[0].value < 0 ? 1 : 0

	let positiveStreak = currentPositive
	let neutralStreak = currentNeutral
	let negativeStreak = currentNegative

	for (const { value } of dataPoints.slice(1)) {
		if (value > 0) {
			currentPositive += 1
			positiveStreak = Math.max(positiveStreak, currentPositive)
			currentNeutral = 0
			currentNegative = 0
		} else if (value === 0) {
			currentNeutral += 1
			neutralStreak = Math.max(neutralStreak, currentNeutral)
			currentPositive = 0
			currentNegative = 0
		} else {
			currentNegative += 1
			negativeStreak = Math.max(negativeStreak, currentNegative)
			currentPositive = 0
			currentNeutral = 0
		}
	}

	return { positiveStreak, neutralStreak, negativeStreak }
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

async function getUserRecap(
	database: Database['users'],
	userId: number,
	year: number
) {
	const commonMonths = await getUserMonthlyRates(
		database,
		null,
		new Date(year, 0, 1, 1),
		new Date(year + 1, 0, 1)
	)
	const commonRates = commonMonths.flatMap(month => month.rates)
	const commonAverage =
		commonRates.reduce((sum, { value }) => sum + value, 0) / commonRates.length

	const rawMonths = await getUserMonthlyRates(
		database,
		userId,
		new Date(year, 0, 1, 1),
		new Date(year + 1, 0, 1)
	)
	const rates = rawMonths.flatMap(month => month.rates)
	const userAverage =
		rates.reduce((sum, { value }) => sum + value, 0) / rates.length

	const rawMonthsPrev = await getUserMonthlyRates(
		database,
		userId,
		new Date(year - 1, 0, 1, 1),
		new Date(year - 1 + 1, 0, 1)
	)
	const userAveragePrev =
		rawMonthsPrev
			.flatMap(month => month.rates)
			.reduce((sum, { value }) => sum + value, 0) / rates.length

	const rawDays = await getUserDailyRates(
		database,
		userId,
		new Date(year, 0, 1, 1),
		new Date(year + 1, 0, 1)
	)
	const rateStreak = getLongestRateStreak(rawDays)
	const valueStreaks = getLongestValueStreaks(rawDays)

	return {
		days: rates.length,
		average: userAverage,
		commonAverage,
		happierBy: (userAverage - commonAverage) * 100,
		averagePrev: userAveragePrev,
		happierPrevBy: (userAverage - userAveragePrev) * 100,
		rawMonths,
		rawDays,
		rateStreak,
		...valueStreaks,
		worstMonth: getMonth('worst', rawMonths),
		happiestMonth: getMonth('happiest', rawMonths)
	}
}

export { getUserRecap }
