import type { Database } from '../../types/index.js'
import { getUserRates } from '../database/statistics.js'
import { fetchUserRatesGraph } from '../database/user.graph.js'

function getLongestSequences(rates: { value: number }[]) {
	if (rates.length <= 1) {
		return {
			maxPositiveLength: rates.length,
			maxNegativeLength: rates.length,
			maxStraightLength: rates.length
		}
	}
	let maxPositiveLength = 0
	let maxStraightLength = 0
	let maxNegativeLength = 0

	let positiveLength = 0
	let straightLength = 0
	let negativeLength = 0

	let lastValue = rates[0].value

	for (const rate of rates.slice(1)) {
		positiveLength = rate.value > lastValue ? positiveLength + 1 : 1
		straightLength = rate.value === lastValue ? straightLength + 1 : 1
		negativeLength = rate.value < lastValue ? negativeLength + 1 : 1

		maxPositiveLength = Math.max(maxPositiveLength, positiveLength)
		maxStraightLength = Math.max(maxStraightLength, straightLength)
		maxNegativeLength = Math.max(maxNegativeLength, negativeLength)

		lastValue = rate.value
	}

	return { maxPositiveLength, maxNegativeLength, maxStraightLength }
}

function getMonth(
	parameter: 'worst' | 'happiest',
	months: { date: Date; average: number }[]
) {
	let lowestAverage: number = parameter === 'worst' ? 3 : -3
	let lowestDate: Date = new Date()
	for (const month of months) {
		if (
			(parameter === 'worst' && month.average <= lowestAverage) ||
			(parameter === 'happiest' && month.average >= lowestAverage)
		) {
			lowestDate = month.date
			lowestAverage = month.average
		}
	}
	return {
		name: lowestDate.toLocaleString('default', { month: 'long' }),
		value: lowestAverage
	}
}

async function getUserRecap(
	database: Database['users'],
	userId: number,
	year: number
) {
	const commonMonths = await getUserRates(database, null, new Date(year, 0, 1))
	const commonRates = commonMonths.flatMap(month => month.rates)
	const commonAverage =
		commonRates.reduce((sum, { value }) => sum + value, 0) / commonRates.length

	const months = await getUserRates(database, userId, new Date(year, 0, 1))
	const rates = months.flatMap(month => month.rates)
	const userAverage =
		rates.reduce((sum, { value }) => sum + value, 0) / rates.length

	const {
		userDatasets: [{ points: lifeQuality }]
	} = await fetchUserRatesGraph({
		database,
		userIds: [userId],
		mode: 'halfYear'
	})

	return {
		days: rates.length,
		average: userAverage,
		happierBy: ((userAverage - commonAverage) / commonAverage) * 100,
		worstMonth: getMonth('worst', months),
		happiestMonth: getMonth('happiest', months),
		...getLongestSequences(lifeQuality)
	}
}

export { getUserRecap }
