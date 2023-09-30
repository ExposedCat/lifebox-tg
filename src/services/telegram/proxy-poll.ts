import type { Api } from 'grammy'

export async function proxyPoll(args: {
	fromChatId: number
	messageId: number
	toChatId: number
	api: Api
}) {
	const { fromChatId, messageId, toChatId, api } = args
	try {
		const { message_id: newMessageId } = await api.copyMessage(
			toChatId,
			fromChatId,
			messageId
		)
		return {
			messageId: newMessageId,
			error: null
		}
	} catch (error) {
		console.error('Cannot proxy poll', error)
		return {
			messageId: null,
			error: `${error}`
		}
	}
}
