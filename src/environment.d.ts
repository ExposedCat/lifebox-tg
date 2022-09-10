export declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TOKEN: string
			DB_CONNECTION_STRING: string
			POLL_TIME: string
			POLL_LANG: string
			CREDITS_SMALL_PERCENT: string
			CREDITS_HIGH_PERCENT: string
		}
	}
}
