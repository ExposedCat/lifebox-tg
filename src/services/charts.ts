import fs from 'fs/promises'
import fetch from 'node-fetch'
import ChartJsImage from 'chartjs-to-image'

function makeLabel(date: Date) {
	const formatter = new Intl.DateTimeFormat('uk', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	})
	return formatter.format(date)
}

async function downloadImage(url: string, filename: string) {
	const response = await fetch(url)
	const buffer = await response.arrayBuffer()
	await fs.writeFile(filename, new DataView(buffer))
}

type Point = { date: Date; value: number }

async function generateChart(first: Point[], second: Point[]) {
	const chart = new ChartJsImage()
	chart.setConfig({
		type: 'line',
		data: {
			labels: first.map(it => makeLabel(it.date)),
			datasets: [
				{
					label: '生活品質 (User)',
					data: first.map(it => it.value),
					borderColor: '#ff6384'
				},
				{
					label: '平均的 (Global average)',
					data: second.map(it => it.value),
					borderColor: '#ffcd56'
				}
			]
		},
		options: {
			responsive: true,
			layout: {
				padding: 20
			},
			scales: {
				y: {
					suggestedMin: -2,
					suggestedMax: 2
				}
			}
		}
	})
	chart.setWidth(720)
	chart.setHeight(360)

	chart.setChartJsVersion('4.1.1')

	const path = `/tmp/chart-${Date.now()}.png`
	const url = chart.getUrl()
	await downloadImage(url, path)
	return path
}

export { generateChart }
export type { Point }
