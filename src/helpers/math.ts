export const roundOneDecimal = (value: number) => Math.round(value * 10) / 10

/** Arithmetic mean; NaN for an empty list. */
export function mean(values: number[]) {
	let sum = 0
	for (const value of values) sum += value
	return sum / values.length
}
