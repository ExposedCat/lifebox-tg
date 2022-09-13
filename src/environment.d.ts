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
			RATING_LIMIT: string
			UNNAMED: string
			INITIAL_CREDITS: string
			BAD_WORDS_DECREASE_MIN: string
			BAD_WORDS_DECREASE_MAX: string
		}
	}
}
