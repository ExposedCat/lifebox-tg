import { loadEnv, validateEnv } from '../helpers/index.js'
import { startApi } from './api.js'
import { connectToDb, startBot } from './index.js'

async function startApp() {
	try {
		loadEnv()
		validateEnv()
	} catch (error) {
		console.error('Error occurred while loading environment:', error)
		process.exit(1)
	}

	let database
	try {
		const connection = await connectToDb()
		database = connection.database
	} catch (error) {
		console.error('Error occurred while connecting to the database:', error)
		process.exit(2)
	}

	let api
	try {
		api = startApi(database)
	} catch (error) {
		console.error('Error occurred while starting the API:', error)
		process.exit(3)
	}

	let bot
	try {
		bot = startBot(database)
	} catch (error) {
		console.error('Error occurred while starting the bot:', error)
		process.exit(3)
	}

	console.info('App started')
	return { api, bot, database }
}

export { startApp }
