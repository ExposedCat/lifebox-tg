export declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TOKEN: string
			DB_CONNECTION_STRING: string
			POLL_TIME: string
			POLL_LANG: string
		}
	}
}
