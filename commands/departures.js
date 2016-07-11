'use strict'

const so     = require('so')
const time   = require('parse-messy-time')
const search = require('vbb-find-station')

const api = require('../lib/api')
const render = require('../lib/render')



const when = so(function* (ctx, msg) {
	const station = yield ctx.get('station')
	const when = time(msg.text)
	ctx.typing()
	const deps = yield api.deps(station.id, when)
	yield ctx.keyboard(render.deps(station, deps), ctx.keys)
})



const unknownStation = `\
I don't know about this station, please double-check for typos.
If you're sure it's my fault, please let my creator @derhuerst know.`

const where = so(function* (ctx, msg) {
	ctx.typing()
	const station = yield search(msg.text)
	if (!station) return ctx.message(unknownStation)
	yield ctx.set('station', station.__proto__)
	yield ctx.frequent.count(station.id, station.name)
})



const promptWhen = `\
*When?*
e.g. "now", "in 10 minutes" or "tomorrow 17:20"`
const promptWhere = `\
*Which station?*
Enter a station name like "u mehringdamm" or "Kotti".`

const departures = so(function* (ctx, msg) {
	if (!msg.text) return ctx.message(`\
Please enter text, other stuff is not supported yet.`)
	const state = yield ctx.get('state')

	if (state === 'when') {
		yield when(ctx, msg)
		yield ctx.done()
	} else if (state === 'where') {
		yield where(ctx, msg)
		yield ctx.set('state', 'when')
		yield ctx.message(promptWhen)
	} else {
		yield ctx.set('state', 'where')
		let freq = yield ctx.frequent.get(3)
		if (freq.length === 0)
			yield ctx.message(promptWhere)
		else {
			freq = freq.map((f) => ({text: f.text}))
			yield ctx.keyboard(promptWhere, freq)
		}
	}
})

module.exports = departures