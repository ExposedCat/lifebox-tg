export declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TOKEN: string
			DB_CONNECTION_STRING: string
			POLL_TIME: string
			POLL_LANG: string
			VALUE_SMALL_PERCENT: string
			VALUE_HIGH_PERCENT: string
			ELO_PROBABILITY_CONST: string
			ELO_MAX_REWARD: string
			RATING_LIMIT: string
			UNNAMED: string
			INITIAL_CREDITS: string
			REACTIONS_PROVIDER_ID: string
			RATE_TIMEOUT_MS: string
			ADMIN_ID: string
		}
	}
}
