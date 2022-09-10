export declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TOKEN: string
			DB_CONNECTION_STRING: string
			POLL_TIME: string
			POLL_LANG: string
			CREDITS_SMALL_PERCENT: string
			CREDITS_HIGH_PERCENT: string
			ELO_PROBABILITY_CONST: string
			ELO_MAX_REWARD: string
			FREE_CREDITS_CHANCE: string
			FREE_CREDITS_MIN: string
			FREE_CREDITS_MAX: string
			DECREASE_CREDITS_CHANCE: string
		}
	}
}
