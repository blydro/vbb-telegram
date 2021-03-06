'use strict'

const so     = require('so')
const time   = require('parse-messy-time')
const search = require('vbb-stations-autocomplete')

const api = require('../lib/api')
const render = require('../lib/render')
const frequent = require('../lib/frequent')



const unknownStation = `\
I don't know about this station, please double-check for typos.
If you're sure it's my fault, please let my creator @derhuerst know.`

const textOnly = `Please enter text, other stuff is not supported yet.`

const promptWhen = (s) => `\
I found ${s.name}. *When?*
e.g. "now", "in 10 minutes" or "tomorrow 17:20"`
const whenButtons = [{text: 'now'}, {text: 'in 10 min'}, {text: 'in 1h'}]

const promptWhere = `\
*Which station?*
Enter a station name like "u mehringdamm" or "Kotti".`



const start = so(function* (ctx, tmp, freq, msg) {
	let stations = yield freq(3)
	if (stations.length === 0) yield ctx.message(promptWhere)
	else {
		stations = stations.map((text) => ({text}))
		yield ctx.keyboard(promptWhere, stations)
	}
})



const when = so(function* (ctx, tmp, freq, msg) {
	const when = time(msg.text)
	const station = yield tmp.get('station')

	ctx.typing()
	const deps = yield api.deps(station.id, when)
	yield ctx.keyboard(render.deps(station, deps), ctx.commands)
})



const where = so(function* (ctx, tmp, freq, msg) {
	ctx.typing()
	const [station] = search(msg.text, 1, true, false)
	if (!station) return ctx.message(unknownStation)

	yield tmp.set('station', station)
	yield freq.inc(station.id, station.name)

	const deps = yield api.deps(station.id, time("now"))
	yield ctx.keyboard(render.deps(station, deps), ctx.commands)

})



const departures = so(function* (ctx, newThread, keep, tmp, msg) {
	if (!msg.text) return ctx.message(textOnly)
	const freq = frequent(keep, 'freq')

	const state = yield tmp.get('state')
	if (state === 'when') {
		yield when(ctx, tmp, freq, msg)
		yield tmp.clear()
	} else if (state === 'where') {
		yield where(ctx, tmp, freq, msg)
		//yield tmp.set('state', 'when')
	} else {
		const arg = msg.text.match(/\/\w+\s+(.+)/i)
		if (arg && arg[1]) { // station passed directly (e.g. '/a spichernstr')
			yield where(ctx, tmp, freq, {text: arg[1]})
			//yield tmp.set('state', 'when')
		} else {
			yield start(ctx, tmp, freq, msg)
			yield tmp.set('state', 'where')
		}
	}
})

module.exports = departures
