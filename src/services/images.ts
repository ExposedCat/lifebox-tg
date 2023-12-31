import gm from 'gm'

async function drawLabels(args: {
	image: string
	output: string
	labels: {
		text: string
		x: number
		y: number
		anchor?: 'left' | 'right'
		fontSize?: number
	}[]
}) {
	const { image, output, labels } = args
	const canvas = gm(image).fill('#ffffff').stroke('#ffffff')

	for (const { text, x, y, anchor = 'left', fontSize } of labels) {
		canvas
			.font('./src/assets/font.ttf', fontSize ?? 58)
			.drawText(x, y, text, anchor === 'right' ? 'NorthEast' : 'NorthWest')
	}

	return new Promise((resolve, reject) =>
		canvas.write(output, error => (error ? reject(error) : resolve(true)))
	)
}

export { drawLabels }
