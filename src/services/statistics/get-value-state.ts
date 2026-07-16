import { ValueState } from '../../types/index.js'

function getValueState(value: number, average: number) {
	let state = ValueState.Normal
	const lowPercent = Number(process.env.VALUE_SMALL_PERCENT) / 100
	const lowLimit = average * lowPercent
	if (value <= lowLimit) {
		state = ValueState.Low
	} else {
		const highPercent = Number(process.env.VALUE_HIGH_PERCENT) / 100
		const highLimit = average * highPercent
		if (value >= highLimit) {
			state = ValueState.High
		}
	}
	return state
}

export { getValueState }
