import type { CustomContext, CustomContextMethods } from '../../types/index.js'

function createReplyWithTextFunc(
	ctx: CustomContext
): CustomContextMethods['text'] {
	return (resourceKey, templateData, extra = {}) => {
		extra.parse_mode = 'HTML'
		extra.link_preview_options = {
      is_disabled: true
    }
		const text = ctx.i18n.t(resourceKey, templateData)
		return ctx.reply(text, extra)
	}
}

export { createReplyWithTextFunc }
