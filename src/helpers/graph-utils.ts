import fs from 'fs/promises'

async function downloadImage(url: string, filename: string) {
	const response = await fetch(url)
	const buffer = await response.arrayBuffer()
	await fs.writeFile(filename, new DataView(buffer))
}

const COLORS = [
	'#ff6384',
	'#9966ff',
	'#36a2eb',
	'#4bc0c0',
	'#ff9f40',
	'#c9cbcf'
]

const randomColor = () =>
	`#${Math.floor(Math.random() * 16777215).toString(16)}`

export { downloadImage, COLORS, randomColor }
