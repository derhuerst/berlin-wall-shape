'use strict'

const {parseLinearRingOrLineString} = require('parse-gml-polygon')
const {findIn, attrOf} = require('query-fis-broker-wfs/lib/helpers')
const getFeatures = require('query-fis-broker-wfs/get-features')
const simplify = require('@turf/simplify')

const endpoint = 'http://fbinter.stadt-berlin.de/fb/wfs/geometry/senstadt/re_hinterl4326/'
const layer = 'fis:re_hinterl4326'

const parseResult = (r) => {
	const id = attrOf(r, 'gml:id')

	const geometry = findIn(r, 'fis:spatial_geometry')
	if (!geometry) {
		if (process.env.NODE_ENV === 'dev') console.error(geometry)
		throw new Error('missing fis:spatial_geometry node')
	}

	const lineStrings = []
	for (let c of geometry.children) {
		try {
			const lineString = parseLinearRingOrLineString(c, (x, y) => [x, y])
			lineStrings.push(lineString)
		} catch (err) {
			console.error(id + ' ' + err.message)
		}
	}

	return {
		type: 'MultiLineString',
		coordinates: lineStrings
	}
}

let lineStrings = []

getFeatures(endpoint, layer)
.on('data', (res) => {
	const multiLineString = parseResult(res)
	lineStrings = lineStrings.concat(multiLineString.coordinates)
})
.on('error', console.error)
.once('end', () => {
	const multiLineString = {
		type: 'MultiLineString',
		coordinates: lineStrings
	}
	simplify(multiLineString, {tolerance: .00001, highQuality: true, mutate: true})

	process.stdout.write(JSON.stringify(multiLineString) + '\n')
})
