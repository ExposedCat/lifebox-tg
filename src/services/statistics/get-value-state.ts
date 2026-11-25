import { APP_ENV } from '../../config.ts'
import { ValueState } from '../../types/index.ts'

export function getValueState(value: number, average: number) {
	if (value <= average * (APP_ENV.VALUE_SMALL_PERCENT / 100)) {
		return ValueState.Low
	}
	if (value >= average * (APP_ENV.VALUE_HIGH_PERCENT / 100)) {
		return ValueState.High
	}
	return ValueState.Normal
}
