import type { CustomContext, CustomContextMethods } from '../../types/index.js'

function createReplyWithTextFunc(
	ctx: CustomContext
): CustomContextMethods['text'] {
	return (resourceKey, templateData, extra = {}) => {
		const text = ctx.i18n.t(resourceKey, templateData)
		return ctx.reply(text, {
			parse_mode: 'HTML',
			link_preview_options: { is_disabled: true },
			...extra
		})
	}
}

export { createReplyWithTextFunc }
