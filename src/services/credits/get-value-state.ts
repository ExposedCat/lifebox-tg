import { ValueState } from '../../types/index.js'

function getValueState(credits: number, averageCredits: number) {
	let state = ValueState.Normal
	const lowPercent = Number(process.env.VALUE_SMALL_PERCENT) / 100
	const lowLimit = averageCredits * lowPercent
	if (credits <= lowLimit) {
		state = ValueState.Low
	} else {
		const highPercent = Number(process.env.VALUE_HIGH_PERCENT) / 100
		const highLimit = averageCredits * highPercent
		if (credits >= highLimit) {
			state = ValueState.High
		}
	}
	return state
}

export { getValueState }
