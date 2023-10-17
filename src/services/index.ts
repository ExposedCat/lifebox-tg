export { createReplyWithTextFunc } from './telegram/context.js'
export { startSendPollJob } from './telegram/send-poll-job.js'
export { getMessageAction } from './telegram/get-message-action.js'

export { createGroupIfNotExists, fetchGroups } from './database/group.js'
export {
	createUserIfNotExists,
	updateUserCredits,
	updateUserDayRate,
	getUserProfile
} from './database/user.crud.js'
export { getTopSocialUsers, getTopLifeUsers } from './database/user.graph.js'
export { getProfiles } from './database/user.aggreagation.js'

export {
	getAverageCredits,
	getAverageLifeQuality
} from './database/statistics.js'

export { getActionByWords } from './credits/action-by-words.js'
export { getValueState } from './credits/get-value-state.js'
export { handleAction } from './credits/handle-action.js'
