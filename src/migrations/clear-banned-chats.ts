import type { Bot, Database } from '../types/index.js'
import { startApp } from '../config/index.js'
import { loadEnv } from '../helpers/index.js'

loadEnv()

async function migrate(database: Database['groups'], bot: Bot) {
	const groups = database.find()
	while (await groups.hasNext()) {
		const group = await groups.next()
		if (group === null) {
			break
		}
		const prefix = group.isChannel ? 'Channel' : 'Chat'
		try {
			const chat = await bot.api.getChat(group.groupId)
			await bot.api.sendChatAction(group.groupId, 'choose_sticker')
			console.debug(`🟢 ${prefix} ${group.groupId}`)
			if (chat.type === 'supergroup' || chat.type === 'group') {
				console.debug(`		\\__ '${chat.title}' [${chat.invite_link}]`)
			}
		} catch (error) {
			console.warn(`🔴 ${prefix} ${group.groupId}`)
			console.warn(`		\\__ ${error}`)
			console.warn('		     Deleting...')
			await database.deleteOne({ groupId: group.groupId })
			console.warn('		     Done')
		}
	}
}

console.info('Starting app…')
const { bot, database } = await startApp()
console.info('Running migration…')
await migrate(database.groups, bot)
console.info('Disconnecting…')
console.info('Done')
process.exit(0)
