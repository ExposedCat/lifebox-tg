import { APP_ENV } from '../config.ts'
import { startApi } from './api.ts'
import { startBot } from './bot.ts'
import { connectToDb } from './database.ts'

export async function startApp() {
	let database: Awaited<ReturnType<typeof connectToDb>>
	try {
		database = await connectToDb(APP_ENV.SQLITE_PATH)
	} catch (error) {
		console.error('Error occurred while preparing the database:', error)
		process.exit(2)
	}

	let api: ReturnType<typeof startApi>
	try {
		api = startApi(database, APP_ENV.API_PORT)
	} catch (error) {
		console.error('Error occurred while starting the API:', error)
		process.exit(3)
	}

	let bot: Awaited<ReturnType<typeof startBot>>
	try {
		bot = await startBot(database)
	} catch (error) {
		console.error('Error occurred while starting the bot:', error)
		process.exit(3)
	}

	let stopping = false
	const shutdown = async (signal: string) => {
		if (stopping) return
		stopping = true
		console.info(`${signal} received, shutting down`)
		bot.pollJob?.cancel()
		await Promise.allSettled([bot.bot.stop(), api.stop()])
		await database.destroy()
		process.exit(0)
	}
	process.once('SIGINT', shutdown)
	process.once('SIGTERM', shutdown)

	console.info('App started')
}
