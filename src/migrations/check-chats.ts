import { Bot, Database } from '../types/index.js'

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
    try {
      const chat = await bot.api.getChat(group.groupId)
      console.debug(`🟢 Group ${group.groupId}`)
      if (chat.type === 'supergroup' || chat.type === 'group') {
        console.debug(`  \\__ '${chat.title}' [${chat.invite_link}]`)
      }
    } catch (error) {
      console.warn(`🔴 Group ${group.groupId}: ${error}`)
    }
  }
}

console.info(`Starting app…`)
const { bot, database } = await startApp()
console.info(`Running migration…`)
await migrate(database.groups, bot)
console.info(`Disconnecting…`)
console.info(`Done`)
process.exit(0)
